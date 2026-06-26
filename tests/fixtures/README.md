# Parser fixtures — real Drive file structure (anonymized)

These fixtures mirror the **structure** of the actual Google Drive files (captured
2026-06-26) but with **synthetic names and cédulas** — no real personal data. The raw
source files live in `/samples/` (gitignored) and must never be committed.

## Source files observed

| File | Type | Format |
|------|------|--------|
| `Listado 2`, `LISTAS DE PERSONAS EN MULTIPLES HOSPITALES` | Google Doc | master-registry |
| `1_5040023583598840087 (2).pdf` (44 pp) | PDF | master-registry |
| `Ingresos por sismo en Hospitales consolidado *.pdf` | PDF | consolidado |

## Format A — "master registry" (`master-registry.txt`)

Columns: `N° | HOSPITAL | APELLIDOS Y NOMBRES | EDAD`. **No cédula.**
When extracted from the PDF/Doc, columns are concatenated with **no delimiter**:

```
1Hospital Universitario de CaracasOROZCO YUSBELIS35
```

Parse strategy: strip leading row number → find a known **hospital-name substring** (it
sits between the number and the name) → the remainder is `NAME` + trailing `AGE` digits.

## Format B — "consolidado" (`consolidado.txt`)

Columns: `Num | Apellidos | CI | Edad | Sexo | Procedencia | Hospital | Fecha | Servicio`.
Also concatenated with no delimiters; many fields optional:

```
6ABREU JOSE1581005852MHospital Universitario de Caracas25/6/26 pm
2ABELLO MATILDE36Hospital Domingo Luciani (El Llanito)25/6/26 pm
3Abello Wilmari36fPetareHospital Domingo Luciani (El Llanito)25/6/26 1.50am
```

Parse strategy: anchor on a known hospital-name substring to split the row into
**pre-hospital** (num, name, CI, age, sex, procedencia) and **post-hospital** (date,
servicio). Within pre-hospital:
- leading digits → row number
- leading letters/spaces → name
- a digit run → CI and/or age (ambiguous; see below)
- a trailing single `M`/`F`/`m`/`f` → sex
- remaining letters → procedencia (place of origin, NOT a hospital)

### The CI/age ambiguity (drives `confidence` + `needs_review`)

CI and Edad are concatenated with no separator. The numeric blob after the name is split
heuristically:
- length 1–3 → **age only**, no CI (confidence 1.0)
- length 6–8 → **CI only**, no age (confidence 1.0)
- length 9–11 → CI = blob[:-2], age = blob[-2:] (confidence 0.7 — a guess)
- other → keep as age if ≤ 3 digits else CI; flag `needs_review` (confidence 0.5)

Rows with `confidence < 0.6` are flagged `needs_review` by the sync and never silently
dropped.

## Other findings baked into the design

- **Status:** there is no admitted/discharged column — every row is an earthquake
  admission, so drive records default to `status = 'admitted'`. The "Servicio"
  (TRIAJE, TRAUMASHOCK, Cirugía…) is stored in `notes`, not status.
- **Hospital set is open:** the consolidado references hospitals beyond the 6 folders
  (e.g. "Ricardo Baquero González"; "Domingo Luciani" maps to our `luciani`). The parser
  matches a configurable list of hospital-name patterns; the sync (Task 9) maps/creates
  hospital rows as needed.
- **Cédula form:** appears WITHOUT the `V` prefix, 6–8 digits → `normalizeCedula`
  defaults nationality to `V`.

## Duplicates embedded for the dedup tests (Task 8)

- `consolidado.txt`: synthetic cédula `12345678` appears at two hospitals (rows 1 & 4) →
  cédula-based cross-hospital duplicate.
- `master-registry.txt`: `PEREZ MARIA` age 35 appears at two hospitals → name+age
  duplicate (no cédula available).
