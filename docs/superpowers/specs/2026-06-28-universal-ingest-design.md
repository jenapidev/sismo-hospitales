# Universal Ingest — Sheets, Excel, Docs, PDFs + subfolders

**Date:** 2026-06-28
**Status:** Design approved
**Part of:** Sismo · Hospitales (sync pipeline)

## Purpose

The Drive grew and reorganized: the sync only reads root-level PDFs/Docs and now
covers just 1 of ~20+ data files. Extend the 30-min sync to ingest **all non-image
sources** — Google Sheets, Excel (.xlsx), Google Docs, PDFs — across **subfolders**,
so the registry reflects everything available. Images (photos) are out of scope here
(OCR is a later phase).

## Goals

1. **Recurse subfolders** (not just the Drive root).
2. **Tabular parser** for Google Sheets (CSV export) and `.xlsx` (via `exceljs`): tolerant
   header detection + flexible column mapping, one person per row.
3. **Places**: every distinct hospital/centro/location becomes a searchable place. Known
   hospitals map to the 7 canonical slugs; unknown centros and shelters
   (e.g. "Parque del Oeste", "Playa Los Cocos") are auto-created as new places.
4. Keep PDFs/Docs on the existing text parser. Keep idempotency + cédula dedup.

## Non-goals

- Images / OCR (separate phase).
- De-duplicating the same cédula-less person across overlapping files (search-time
  cédula dedup only). Documented limitation.

## Observed structure (real samples)

- **Google Sheet** (e.g. *Hospital Lídice*): header `fuente, nombre, apellido, cedula,
  edad, INFO Adicional`; **no hospital column** → hospital from the sheet name. A junk
  first row (a shared-folder note) precedes the header.
- **Consolidated .xlsx** (*…Consolidado de personas de todos los archivos*): sheet
  *PACIENTES SISMO LA GUAIRA*, ~3.688 rows, header:
  `APELLIDO(S) | NOMBRE(S) | CÉDULA/ID | EDAD | ¿MENOR? | SEXO | HOSPITAL/CENTRO |
  ÁREA/ZONA | PISO/CAMA | PROCEDENCIA | DIAGNÓSTICO/SERVICIO | ESTADO/CONDICIÓN |
  FECHA REG. | HORA | FAMILIAR | FUENTE | COMENTARIOS`.

## Components

### `lib/drive.ts` (extend)
- `listFolderTree(rootId)`: recurse subfolders, returning files with a `folderName`
  (the containing folder, for place context).
- `kind` adds `gsheet` and `xlsx`.
- `downloadSheetCsv(id)`: `https://docs.google.com/spreadsheets/d/<id>/export?format=csv`.
- `downloadXlsxRows(id)`: download via `uc?export=download`, parse first worksheet with
  `exceljs` → `string[][]`.
- `csvToRows(text)`: minimal CSV parser → `string[][]` (handles quoted commas/newlines).

### `lib/parser/tabular.ts` (new, pure)
- `parseTabular(rows: string[][], sourceFile: string, fallbackPlace?: string): ParsedRecord[]`
- Detect the header row: the first row whose cells fuzzy-match ≥2 known headers.
- Column map (accent-folded, lowercased fuzzy contains):
  - name: combine `apellido(s)` + `nombre(s)`; else `apellidos y nombres` / `nombre` / `paciente`.
  - cedula: `cedula`, `cedula/id`, `ci`, `documento`, `id`.
  - age: `edad`. sex: `sexo`.
  - hospital: `hospital`, `hospital/centro`, `centro`.
  - status: `estado`, `condicion`. notes: `comentarios`, `diagnostico/servicio`,
    `info adicional`, `area`, `procedencia`.
- Per data row → `ParsedRecord`. Hospital from the hospital column; else `fallbackPlace`
  (sheet/file/folder name). `hospitalSlug = detectHospital(value)?.slug ?? slugify(value)`,
  `hospitalName = canonical name or the raw value`. `status` defaults `admitted`.
  `confidence`: 1.0 with cédula+name; −0.3 if no name; rows with no name are skipped.
- Reuses `normalizeCedula`.

### `lib/parser/hospitals.ts` (extend)
- `slugify(name): string` (accent-fold, lowercase, dashes) for unknown places.
- `detectHospital` unchanged; `SLUG_NAMES` still names the canonical 7.

### `scripts/sync-drive.ts` (rewire)
- Walk `listFolderTree`. For each file by kind: pdf/gdoc → `parseDocument`; gsheet →
  `csvToRows`→`parseTabular`; xlsx → `downloadXlsxRows`→`parseTabular`. `fallbackPlace`
  = folder/file name when the tabular has no hospital column.
- **Ensure places**: collect every distinct `(hospitalSlug, hospitalName)` from parsed
  records; upsert any missing into `hospitals` (the 7 canonical keep their seeded names).
- Build `hospitalIdBySlug`, then `upsertDriveRecords` per file (unchanged). Dedup unchanged.
- `source_file` = the Drive file name (unique per file); `rowRef = ${source_file}#${rowIndex}`.

## Idempotency
Unchanged: keyed on `(source_file, source_row_ref)`; re-runs change nothing; manual /
coordinator-verified rows never overwritten; `getExisting` paginated (the bug just fixed).

## Testing
- `parseTabular` unit tests against fixtures mirroring the two real layouts (Lídice-style
  sheet with junk first row + no hospital column; consolidated-style with HOSPITAL/CENTRO).
- `slugify` unit test.
- Live smoke: run the sync, confirm Sheets + the consolidated .xlsx load, places get
  created, and a second run is idempotent.

## Deploy delta
- New dep `exceljs` (already installed). No new migration (places reuse `hospitals`).
- No Drive API key needed (public scraping + CSV/xlsx export as today).
