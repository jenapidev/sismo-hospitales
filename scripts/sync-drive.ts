/**
 * Drive → Supabase sync. Runs every 30 min via GitHub Actions (and on demand).
 *
 * No Google API key required: the source folder is public and is scraped directly.
 * Ingests all non-image sources (PDF, Google Doc, Google Sheet, .xlsx) across subfolders.
 * Only Supabase service-role credentials are needed.
 */
import { createClient } from "@supabase/supabase-js";
import {
  listFolderTree,
  downloadText,
  downloadSheetCsv,
  downloadXlsxRows,
  downloadImageBytes,
  csvToRows,
  isSyncable,
} from "@/lib/drive";
import { parseDocument, type ParsedRecord } from "@/lib/parser";
import { parseTabular } from "@/lib/parser/tabular";
import { extractPeopleFromImage } from "@/lib/ocr";
import { createSupabaseRecordsRepo, upsertDriveRecords } from "@/lib/records";
import { applyDuplicateGroups } from "@/lib/dedup";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID || "1o36ifaRz45kAs5rKzci49aD0mP5JB_YI";

/** Create any places (hospitals/centros/shelters) seen in the data but not yet stored. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensurePlaces(admin: any, placeBySlug: Map<string, string>): Promise<Map<string, string>> {
  const { data: existing, error } = await admin.from("hospitals").select("id,slug");
  if (error) throw new Error(`read hospitals: ${error.message}`);
  const map = new Map<string, string>();
  for (const h of existing ?? []) map.set(h.slug, h.id);

  const missing = [...placeBySlug.entries()]
    .filter(([slug]) => !map.has(slug))
    .map(([slug, name]) => ({ slug, name }));
  if (missing.length) {
    const { data: created, error: insErr } = await admin
      .from("hospitals")
      .insert(missing)
      .select("id,slug");
    if (insErr) throw new Error(`create places: ${insErr.message}`);
    for (const h of created ?? []) map.set(h.slug, h.id);
  }
  return map;
}

async function main() {
  const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: run, error: runErr } = await admin
    .from("sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runErr) throw new Error(`open sync_run: ${runErr.message}`);
  const runId = run.id;
  const errors: string[] = [];

  try {
    const all = await listFolderTree(ROOT_FOLDER_ID);
    const syncable = all.filter(isSyncable);
    console.log(`Found ${all.length} files, ${syncable.length} syncable.`);

    // Parse each file into records. Use the Drive file ID as the source key
    // (file names are NOT unique across subfolders, e.g. "1.pdf", "hospital").
    const parsedFiles: { id: string; name: string; records: ParsedRecord[] }[] = [];
    for (const f of syncable) {
      try {
        const place = f.folderName || f.name;
        let records: ParsedRecord[] = [];
        if (f.kind === "pdf" || f.kind === "gdoc") {
          records = parseDocument(await downloadText(f), f.id);
        } else if (f.kind === "gsheet") {
          records = parseTabular(csvToRows(await downloadSheetCsv(f.id)), f.id, place);
        } else if (f.kind === "xlsx") {
          records = parseTabular(await downloadXlsxRows(f.id), f.id, place);
        }
        parsedFiles.push({ id: f.id, name: f.name, records });
        console.log(`  [${f.kind}] ${f.name}: ${records.length} filas`);
      } catch (e) {
        const msg = `${f.name}: ${(e as Error).message}`;
        console.warn("  warn", msg);
        errors.push(msg);
      }
    }

    // OCR pass (only if a Gemini key is set): read NEW images once, capped per run.
    const ocrProcessed: { drive_file_id: string; records_found: number; status: string }[] = [];
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const cap = Number(process.env.OCR_MAX_PER_RUN || 30);
      const images = all.filter((f) => f.kind === "image");
      const { data: done } = await admin.from("ocr_images").select("drive_file_id");
      const seen = new Set<string>((done ?? []).map((d: { drive_file_id: string }) => d.drive_file_id));
      const todo = images.filter((f) => !seen.has(f.id)).slice(0, cap);
      console.log(`OCR: ${images.length} imágenes, ${todo.length} nuevas (tope ${cap}).`);
      for (const img of todo) {
        try {
          const { buffer, mime } = await downloadImageBytes(img.id);
          const records = await extractPeopleFromImage(buffer, mime, {
            imageId: img.id,
            place: img.folderName || img.name,
            apiKey: geminiKey,
            model: process.env.GEMINI_MODEL,
          });
          parsedFiles.push({ id: img.id, name: img.name, records });
          ocrProcessed.push({
            drive_file_id: img.id,
            records_found: records.length,
            status: records.length ? "ok" : "no_list",
          });
          console.log(`  [ocr] ${img.name}: ${records.length} personas`);
        } catch (e) {
          // Don't mark as processed — retry next run.
          errors.push(`ocr ${img.name}: ${(e as Error).message}`);
          console.warn("  warn ocr", (e as Error).message);
        }
      }
    }

    // Ensure every place referenced exists.
    const placeBySlug = new Map<string, string>();
    for (const pf of parsedFiles)
      for (const r of pf.records)
        if (r.hospitalSlug) placeBySlug.set(r.hospitalSlug, r.hospitalName ?? r.hospitalSlug);
    const hospitalIdBySlug = await ensurePlaces(admin, placeBySlug);

    // Upsert per file (idempotent, human-wins).
    const repo = createSupabaseRecordsRepo(admin);
    let parsed = 0,
      inserted = 0,
      updated = 0,
      flaggedReview = 0,
      skipped = 0;
    for (const pf of parsedFiles) {
      parsed += pf.records.length;
      const res = await upsertDriveRecords(repo, hospitalIdBySlug, pf.records, pf.id);
      inserted += res.inserted;
      updated += res.updated;
      flaggedReview += res.flaggedReview;
      skipped += res.skipped;
    }

    // Remember which images were OCR'd so we never re-process them.
    if (ocrProcessed.length) {
      const { error: ocrErr } = await admin
        .from("ocr_images")
        .upsert(ocrProcessed, { onConflict: "drive_file_id" });
      if (ocrErr) errors.push(`ocr_images upsert: ${ocrErr.message}`);
    }

    const dup = await applyDuplicateGroups(admin);

    await admin
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        files_seen: syncable.length,
        records_parsed: parsed,
        inserted,
        updated,
        flagged_review: flaggedReview,
        errors: JSON.stringify(errors),
        status: errors.length ? "ok_with_warnings" : "ok",
      })
      .eq("id", runId);

    console.log(
      `Sync done: files=${syncable.length} ocrImages=${ocrProcessed.length} parsed=${parsed} ` +
        `inserted=${inserted} updated=${updated} review=${flaggedReview} skipped=${skipped} ` +
        `places=${hospitalIdBySlug.size} dupGroups=${dup.groups} warnings=${errors.length}`
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
