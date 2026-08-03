# `public/data` layout

Files are grouped by role so it is clear what the app loads, what feeds the import pipeline, and what is review-only or archived.

```text
public/data/
  runtime/   # Fetched by the browser at runtime
  sources/   # Excel inputs for `npm run import-data`
  review/    # External / supervisor confirmation (not loaded by the app)
  archive/   # Superseded CSVs kept for reference
```

## Pipeline

```text
sources/*.xlsx  →  npm run import-data  →  runtime/solar-data.json
```

`npm run build` runs `import-data` before Vite so the JSON stays in sync with the workbooks.

| Folder | Purpose | Typical files |
|--------|---------|----------------|
| **runtime** | Display data the app fetches | `solar-data.json`, `building-positions.json`, `building-positions-main.json`, `co2-camera.json` |
| **sources** | Extraction inputs | `solar-data.xlsx`, `solar-cost.xlsx`, `Solar Monthly Savings *.xlsx` |
| **review** | Name / alias confirmation with stakeholders | `building-names-supervisor-review.*` |
| **archive** | Legacy CSV prototypes (not used by import or the app) | `energy.csv`, `co2.csv`, `saving.csv`, `DataTest.csv`, `solar-data.csv` |

Browser URLs for runtime files are under `/data/runtime/…` (for example `/data/runtime/solar-data.json`).
