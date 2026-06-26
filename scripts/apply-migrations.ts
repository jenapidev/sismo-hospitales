/**
 * Apply supabase/migrations/*.sql to the project database, in filename order,
 * using the direct Postgres connection (SUPABASE_DB_PASSWORD).
 *
 * Usage: npx tsx scripts/apply-migrations.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const url = new URL(env("NEXT_PUBLIC_SUPABASE_URL"));
  const ref = url.hostname.split(".")[0]; // project ref
  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;

  const client = new Client({
    host,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: env("SUPABASE_DB_PASSWORD"),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log(`Connected to ${host}`);

  const dir = "supabase/migrations";
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    try {
      await client.query(sql);
      console.log(`✓ applied ${file}`);
    } catch (e) {
      console.error(`✗ ${file}: ${(e as Error).message}`);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
