# `public/data` layout

Files are grouped by role so it is clear what the app loads, what feeds the import pipeline, and what is review-only or archived.

```text
public/data/
  runtime/   # Fetched by the browser at runtime
  sources/   # Excel inputs for `npm run import-data` (+ display-name overrides)
  review/    # External / supervisor confirmation (not loaded by the app)
  archive/   # Superseded CSVs and archived source snapshots
```

## Pipeline

```text
sources/*.xlsx  →  npm run import-data  →  runtime/solar-data.json

sources/building-display-names.json
  → displayName fields on each building in solar-data.json

sources/solar-building-addresses.xlsx
  → building-coordinates.json (geocoded)
  → node scripts/project-building-positions.mjs
  → runtime/building-positions.json (+ -main)
```

`npm run build` runs `import-data` before Vite so the JSON stays in sync with the workbooks.

Non-technical updates should use the **Local Update Desk** (`npm run update-desk` or `Start-Update-Desk.bat`). Upload any-named Excel files; the desk detects energy vs rates vs addresses from contents, shows review summaries (editable display names + key Elec/CS rates), archives prior sources, then can commit / push / deploy.

| Folder | Purpose | Typical files |
|--------|---------|----------------|
| **runtime** | Display data the app fetches | `solar-data.json`, `building-positions.json`, `building-positions-main.json`, `co2-camera.json` |
| **sources** | Extraction inputs | `solar-data.xlsx`, `solar-cost.xlsx`, `Solar Monthly Savings *.xlsx`, `solar-building-addresses.xlsx`, `building-coordinates.json`, `building-display-names.json`, optional `savings-rate-overrides.json` |
| **review** | Name / alias confirmation with stakeholders | `building-names-supervisor-review.*` |
| **archive** | Legacy CSV prototypes under `archive/`, plus dated source snapshots under `archive/sources/<timestamp>/` created by Update Desk Apply | `energy.csv`, …, `archive/sources/2026-…/` |

Building markers are projected from geocoded addresses onto the Fulton placement mask (`u`/`v`), laid out **north-up** to match [`public/assets/map-reference.png`](../assets/map-reference.png) (Palmetto southwest / bottom, Milton north / top). Overlaps are gently separated at load time in `mapLayout.js`.
