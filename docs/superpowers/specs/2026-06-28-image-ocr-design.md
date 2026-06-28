# Image OCR — Gemini Flash (lowest cost)

**Date:** 2026-06-28
**Status:** Design approved
**Part of:** Sismo · Hospitales (sync pipeline)

## Purpose

The Drive has ~150 photos (WhatsApp images of patient/survivor lists, many handwritten).
Extract the people in them so they're searchable. Use Gemini **Flash** vision on the
**free tier**, OCR each image **once** (cached), and surface results as **unverified**
records for human confirmation.

## Goals

1. Read text from images with Gemini Flash → structured people (name, cédula, age, sex,
   status). Non-list photos yield nothing.
2. **Lowest cost:** OCR each image **once** (cache by Drive file id), only process **new**
   images, **cap per run**. Stays in the free tier (~$0).
3. Extracted people enter as **`needs_review`/unverified** records, visible in search with
   the badge; community/coordinators confirm. Place from the image's subfolder.

## Non-goals
- Perfect accuracy (photos/handwriting are noisy → everything is unverified).
- Re-OCR of unchanged images.

## Components

### Migration `0006_ocr_images.sql`
```sql
create table ocr_images (
  drive_file_id text primary key,
  processed_at timestamptz not null default now(),
  records_found int not null default 0,
  status text not null default 'ok'   -- ok | no_list | error
);
alter table ocr_images enable row level security; -- service-role only
```

### `lib/drive.ts` (extend)
- `classify` adds `image` (tooltip ends with "Image" / image extensions).
- `downloadImageBytes(id): Promise<{ buffer: Buffer; mime: string }>` via `uc?export=download`.
- `listImages(tree)` helper = files with `kind === "image"`.

### `lib/ocr.ts` (new)
- `parseOcrJson(text: string, imageId: string, place: string): ParsedRecord[]` — **pure**,
  tested. Safely `JSON.parse` the model output (array of `{nombre|apellidos_nombres,
  cedula, edad, sexo, estado}`); map each to a `ParsedRecord`: `fullName`, `cedula` via
  `normalizeCedula`, `age`, `sex`, status from `estado`, place resolved from `place`
  (`detectHospital` ?? `slugify`), `rowRef = ${imageId}#${i}`, `confidence = 0.4` (so the
  upsert flags `needs_review`). Rows with no name are dropped.
- `extractPeopleFromImage(buffer, mime, { imageId, place, apiKey, model })` — calls the
  Gemini REST API (`generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`)
  with the image inline + a Spanish prompt + `responseMimeType: application/json`,
  `temperature: 0`; returns `parseOcrJson(modelText, imageId, place)`. Model default
  `gemini-2.0-flash`, overridable via `GEMINI_MODEL`.

### `scripts/sync-drive.ts` (extend)
After the tabular/text ingest, an **OCR pass** (only if `GEMINI_API_KEY` is set):
1. From the tree, take `image` files **not** in `ocr_images`, **cap** at `OCR_MAX_PER_RUN`
   (default 30).
2. For each: `downloadImageBytes` → `extractPeopleFromImage` (place = `folderName`).
   Collect as a `parsedFiles` entry `{ id, name, records }`.
3. Feed image records through the existing **ensurePlaces + upsertDriveRecords** flow
   (source `drive`, idempotent, `needs_review` via low confidence).
4. After upsert, mark each processed image in `ocr_images` (`records_found`, status
   `ok`/`no_list`). On an OCR exception, **don't** mark it (retry next run) and log a warning.

### Config
- New env `GEMINI_API_KEY` (free Google AI Studio key) + optional `GEMINI_MODEL`,
  `OCR_MAX_PER_RUN`. Added to `.env.example` and the GitHub Actions secrets. If the key is
  absent, the OCR pass is skipped (the rest of the sync runs normally).

## Idempotency & cost
- `ocr_images` ensures each image is sent to Gemini **once**, ever. Re-runs skip processed
  images. The per-run cap bounds calls. Record upsert stays idempotent (file id + row).

## Testing
- Unit: `parseOcrJson` (valid JSON → records with cédula normalized + low confidence;
  malformed JSON → `[]`; non-list/empty → `[]`).
- Live (once the key exists): OCR 1–2 real images, confirm people land as unverified and a
  second run skips them (cache hit).

## Deploy delta
- Migration `0006_ocr_images.sql`. New secret `GEMINI_API_KEY` (Vercel not needed — OCR
  runs only in the GitHub Actions sync). No new npm deps (uses `fetch`).
