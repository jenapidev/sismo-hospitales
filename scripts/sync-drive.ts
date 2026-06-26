/**
 * Drive → Supabase sync. Runs every 30 min via GitHub Actions (and on demand).
 *
 * No Google API key required: the source folder is public and is scraped directly.
 * Only Supabase service-role credentials are needed.
 */
import { createClient } from "@supabase/supabase-js";
import { listFolder, downloadText, isSyncable } from "@/lib/drive";
import { createSupabaseRecordsRepo } from "@/lib/records";
import { syncParsedFiles, type SyncFile } from "@/lib/sync";
import { applyDuplicateGroups } from "@/lib/dedup";
import { SLUG_NAMES } from "@/lib/parser/hospitals";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const ROOT_FOLDER_ID =
  process.env.DRIVE_ROOT_FOLDER_ID || "1o36ifaRz45kAs5rKzci49aD0mP5JB_YI";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureHospitals(admin: any): Promise<Map<string, string>> {
  const { data: existing, error } = await admin.from("hospitals").select("id,slug");
  if (error) throw new Error(`read hospitals: ${error.message}`);
  const map = new Map<string, string>();
  for (const h of existing ?? []) map.set(h.slug, h.id);

  const missing = Object.entries(SLUG_NAMES)
    .filter(([slug]) => !map.has(slug))
    .map(([slug, name]) => ({ slug, name, location: "Caracas" }));
  if (missing.length) {
    const { data: created, error: insErr } = await admin
      .from("hospitals")
      .insert(missing)
      .select("id,slug");
    if (insErr) throw new Error(`create hospitals: ${insErr.message}`);
    for (const h of created ?? []) map.set(h.slug, h.id);
  }
  return map;
}

async function main() {
  const admin = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: run, error: runErr } = await admin
    .from("sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runErr) throw new Error(`open sync_run: ${runErr.message}`);
  const runId = run.id;
  const errors: string[] = [];

  try {
    const all = await listFolder(ROOT_FOLDER_ID);
    const syncable = all.filter(isSyncable);
    console.log(`Found ${all.length} items, ${syncable.length} syncable.`);

    const files: SyncFile[] = [];
    for (const f of syncable) {
      try {
        const text = await downloadText(f);
        files.push({ name: f.name, text });
        console.log(`  downloaded ${f.name} (${text.length} chars)`);
      } catch (e) {
        const msg = `download ${f.name}: ${(e as Error).message}`;
        console.warn(msg);
        errors.push(msg);
      }
    }

    const hospitalIdBySlug = await ensureHospitals(admin);
    const repo = createSupabaseRecordsRepo(admin);
    const res = await syncParsedFiles(repo, hospitalIdBySlug, files);
    const dup = await applyDuplicateGroups(admin);

    await admin
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        files_seen: syncable.length,
        records_parsed: res.parsed,
        inserted: res.inserted,
        updated: res.updated,
        flagged_review: res.flaggedReview,
        errors: JSON.stringify(errors),
        status: errors.length ? "ok_with_warnings" : "ok",
      })
      .eq("id", runId);

    console.log(
      `Sync done: parsed=${res.parsed} inserted=${res.inserted} updated=${res.updated} ` +
        `review=${res.flaggedReview} dupGroups=${dup.groups} warnings=${errors.length}`
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("Sync failed:", msg);
    await admin
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        errors: JSON.stringify([...errors, msg]),
        status: "error",
      })
      .eq("id", runId);
    process.exitCode = 1;
  }
}

main();
