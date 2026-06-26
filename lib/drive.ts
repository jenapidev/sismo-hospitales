import { createRequire } from "node:module";

// pdf-parse's index.js runs a debug block when imported as a module; import the
// inner lib file directly to avoid it.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (b: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
};

export type DriveKind = "pdf" | "gdoc" | "gsheet" | "folder" | "other";

export interface DriveFile {
  id: string;
  name: string;
  kind: DriveKind;
}

function classify(tooltip: string): DriveKind {
  if (/ PDF$/.test(tooltip)) return "pdf";
  if (/Google Docs$/.test(tooltip)) return "gdoc";
  if (/Google Sheets$/.test(tooltip)) return "gsheet";
  if (/older$/.test(tooltip)) return "folder";
  return "other";
}

function cleanName(tooltip: string): string {
  return tooltip
    .replace(/ (PDF|Google Docs|Google Sheets|Shared folder|Folder)$/, "")
    .trim();
}

/**
 * List the immediate children of a PUBLIC ("anyone with the link") Drive folder
 * by scraping the folder page. No API key required.
 */
export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, {
    headers: UA,
  });
  if (!res.ok) throw new Error(`listFolder ${folderId}: HTTP ${res.status}`);
  const html = await res.text();

  const re = /data-id="([\w-]{20,})"[^>]*?data-tooltip="((?:[^"\\]|\\.)*?)"/g;
  const seen = new Set<string>();
  const files: DriveFile[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const tooltip = m[2];
    files.push({ id, name: cleanName(tooltip), kind: classify(tooltip) });
  }
  return files;
}

/** Download a file's text content. PDFs are parsed; Google Docs exported as txt. */
export async function downloadText(file: DriveFile): Promise<string> {
  if (file.kind === "pdf") {
    const res = await fetch(
      `https://drive.google.com/uc?export=download&id=${file.id}`,
      { headers: UA, redirect: "follow" }
    );
    if (!res.ok) throw new Error(`download pdf ${file.name}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { text } = await pdfParse(buf);
    return text;
  }
  if (file.kind === "gdoc") {
    const res = await fetch(
      `https://docs.google.com/document/d/${file.id}/export?format=txt`,
      { headers: UA, redirect: "follow" }
    );
    if (!res.ok) throw new Error(`export gdoc ${file.name}: HTTP ${res.status}`);
    return res.text();
  }
  throw new Error(`unsupported kind for ${file.name}: ${file.kind}`);
}

/** Files we can extract text from for the registry sync. */
export function isSyncable(file: DriveFile): boolean {
  return file.kind === "pdf" || file.kind === "gdoc";
}
