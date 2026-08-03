# solar-dinosaur

A React + Vite website with three side-by-side Three.js scenes (energy, CO2, and saving) in a triptych layout, an interactive **2021–2026 timeline** with an energy-spark design, a **Look Ahead** mode that transitions to a full-width **Future** scene, and a **menu overlay** for additional content pages.

**Quick links for editors:**

| I want to… | Edit this file |
|------------|----------------|
| Change menu page text | **`src/components/ContentPage.jsx`** |
| Change menu link labels | **`src/components/SiteMenu.jsx`** |
| Change timeline years or default year | **`src/constants/timeline.js`** |
| Change timeline look (spark, tail, track) | **`src/components/Timeline.css`** |
| Change Look Ahead / Back / menu button style | **`src/index.css`** (`.chrome-cta`) |
| Change page background or global colors | **`src/index.css`** |
| Change Three.js scene visuals | **`src/scenes/{energy,co2,saving,future}Scene.js`** |
| Adjust triptych or Look Ahead camera framing (dev tool) | **`?triptychCamera=1`** or **Shift+C** — see [Camera framing](#triptych-camera-framing-dev-tool) |
| Adjust Fulton County backdrop (dev tool) | Open Look Ahead and press **Shift+M** — see [Fulton backdrop](#repositioning-the-fulton-county-backdrop) |
| Replace / regenerate year metrics | **`public/data/sources/*.xlsx`** then `npm run import-data` → **`public/data/runtime/solar-data.json`** |
| Map dataset fields → scene values | **`src/data/mapYearData.js`** |

This guide assumes you are starting on a machine with **no development tools installed** yet.

## What you need

| Tool | Why |
|------|-----|
| **Git** | To download the project from the repository |
| **Node.js** (includes **npm**) | To install packages and run the dev server |

You do **not** need to install React, Vite, or Three.js yourself. They are installed automatically when you run `npm install`.

**Recommended Node.js version:** 20 LTS or newer.

---

## 1. Install Git

Git lets you clone (download) the repository.

### Windows

1. Download the installer from [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer and accept the default options
3. Open **PowerShell** or **Command Prompt** and verify:

```bash
git --version
```

### macOS

1. Install Xcode Command Line Tools (if prompted when running `git` for the first time), **or** install Git from [https://git-scm.com/download/mac](https://git-scm.com/download/mac)
2. Open **Terminal** and verify:

```bash
git --version
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install git
git --version
```

---

## 2. Install Node.js

Node.js includes **npm** (Node Package Manager), which this project uses to install dependencies and run scripts.

### Windows

1. Download the **LTS** installer from [https://nodejs.org](https://nodejs.org)
2. Run the installer (keep **“Add to PATH”** enabled)
3. Close and reopen PowerShell, then verify:

```bash
node --version
npm --version
```

**If `node` or `npm` is not recognized** in Cursor’s terminal (or another IDE terminal) after installing Node.js, fully quit and reopen the app so it picks up the updated PATH. A new external PowerShell window may already work before the IDE does.

**If `node` works but `npm` fails** with an error like `npm.ps1 cannot be loaded because running scripts is disabled on this system`, PowerShell’s execution policy is blocking npm’s script. Fix it once in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Open a new terminal, then run `npm --version` again. As a one-off workaround without changing policy, you can call `npm.cmd` instead of `npm` (for example `npm.cmd install`).

### macOS

1. Download the **LTS** installer from [https://nodejs.org](https://nodejs.org), **or** install with Homebrew:

```bash
brew install node
```

2. Verify:

```bash
node --version
npm --version
```

### Linux (Debian/Ubuntu)

Using NodeSource for a current LTS release:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

---

## 3. Get the project

### Option A: Clone with Git (recommended)

```bash
git clone <repository-url>
cd solar-dinosaur
```

Replace `<repository-url>` with the actual URL of this repo (for example, a GitHub `https://` or `git@` URL).

### Option B: Download a ZIP

1. Download the repository as a ZIP from your Git host (e.g. GitHub **Code → Download ZIP**)
2. Extract the ZIP
3. Open a terminal in the extracted `solar-dinosaur` folder

---

## 4. Install project dependencies

From the project root (the folder that contains `package.json`):

```bash
npm install
```

This reads `package.json` and downloads everything the app needs (React, Vite, Three.js, etc.) into a local `node_modules` folder. You only need to run this once, or again after dependencies change.

---

## 5. Run the development server

```bash
npm run dev
```

You should see output similar to:

```text
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Open that URL in a browser (Chrome, Firefox, Edge, or Safari).

To stop the server, press `Ctrl+C` in the terminal.

---

## 6. Other useful commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Create an optimized production build in `dist/` |
| `npm run preview` | Serve the production build locally (run `build` first) |
| `npm run lint` | Check the code with ESLint |

---

## Appearance and theme

The site uses a **black background** (`#000`) with light text. This is set in **`src/index.css`** via `--bg: #000` and `background: #000` on `html` and `body`.

| Token | Purpose | Where to edit |
|-------|---------|---------------|
| `--bg` | Page background | **`src/index.css`** |
| `--text` / `--text-h` | Body and heading text | **`src/index.css`** |
| `--border` | Dividers (header, footer, timeline top border) | **`src/index.css`** |
| `--accent` | Purple accent (menu focus, etc.) | **`src/index.css`** |

Timeline colors (white track, yellow spark dot, energy tail) are scoped separately in **`src/components/Timeline.css`** — see [Timeline](#timeline).

The Three.js scenes use transparent canvases, so they sit on top of the black page background.

---

## Typography

The site uses **[Anybody](https://fonts.google.com/specimen/Anybody)** for all text (navigation, timeline, footer, and UI).

The font is loaded from Google Fonts in **`index.html`** and applied globally via CSS variables in **`src/index.css`**:

```css
--sans: 'Anybody', system-ui, sans-serif;
--heading: 'Anybody', system-ui, sans-serif;
--mono: 'Anybody', system-ui, sans-serif;
```

To change the font, update the Google Fonts `<link>` in **`index.html`** and the `--sans`, `--heading`, and `--mono` variables in **`src/index.css`**.

---

## Troubleshooting

### `node` or `npm` is not recognized

- Node.js is not installed, or the terminal was opened **before** installation finished
- Close all terminal windows, open a new one, and run `node --version` again
- On Windows, confirm Node.js was added to PATH during install

### `npm install` fails with permission errors

- Avoid using `sudo npm install` on macOS/Linux inside the project folder
- If needed, fix npm’s default directory: [https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### Port 5173 is already in use

- Another app (or another Vite dev server) is using that port
- Stop the other process, or run with a different port:

```bash
npm run dev -- --port 5174
```

### Blank page or errors after cloning

1. Make sure you are in the project root (where `package.json` lives)
2. Delete `node_modules` and reinstall:

```bash
rm -rf node_modules
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### The page scrolls oddly or scenes look wrong

- Use a modern browser with WebGL support
- Try a hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)

---

## File organization

The project is a standard Vite + React app. Here is what each important file and folder does:

```text
solar-dinosaur/
├── index.html              # HTML entry; loads Anybody from Google Fonts and src/main.jsx
├── package.json            # Project name, dependencies, and npm scripts
├── package-lock.json       # Locked dependency versions (created by npm install)
├── vite.config.js          # Vite build/dev server configuration
├── eslint.config.js        # Linting rules
│
├── public/                 # Static files served as-is (not processed by React)
│   ├── data/               # CSV files loaded when the timeline year changes
│   │   ├── energy.csv
│   │   ├── co2.csv
│   │   └── saving.csv
│   └── icons.svg
│
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx
    ├── App.css
    │
    ├── constants/
    │   └── timeline.js     # Year range, default year, yearProgress()
    │
    ├── data/               # CSV loading and mapping (timeline → scenes)
    │   ├── parseCsv.js     # CSV parser
    │   ├── loadYearData.js # fetch /data/{scene}.csv
    │   ├── mapYearData.js  # PLEASE WORK HERE — map CSV columns per scene
    │   └── index.js
    │
    ├── components/
    │   ├── ThreePanel.jsx  # Mounts scenes; loads CSV; calls applyYear({ year, data })
    │   ├── Timeline.jsx
    │   ├── Timeline.css
    │   ├── SiteMenu.jsx
    │   ├── SiteMenu.css
    │   ├── ContentPage.jsx
    │   └── ContentPage.css
    │
    ├── scenes/             # One file per Three.js scene
    │   ├── shared.js       # Renderer, camera, lights helpers
    │   ├── energyScene.js  # PLEASE WORK HERE — energy visualization + applyYear
    │   ├── co2Scene.js
    │   ├── savingScene.js
    │   ├── futureScene.js
    │   └── index.js        # sceneFactories registry
    │
    └── assets/
        ├── hero.png
        ├── react.svg
        └── vite.svg
```

### How the pieces connect

1. **`index.html`** loads the **Anybody** font and **`src/main.jsx`**, which renders **`App.jsx`**.
2. **`App.jsx`** holds **year**, **lookAheadActive**, **showFuture**, **menuOpen**, and **siteView** state. It lays out: header (**SiteMenu**) → main content (triptych/Future or **ContentPage**) → timeline chrome (timeline + Back button) → footer.
3. Clicking **solar-dinosaur** in the header opens the **SiteMenu** overlay. **Main site** shows the triptych + timeline; other links show **ContentPage** placeholders.
4. The **triptych** renders three **`ThreePanel`** components (`"energy"`, `"co2"`, `"saving"`), each receiving the current `year`.
5. **`ThreePanel`** creates the scene, loads **`public/data/runtime/solar-data.json`** for the selected year, maps it in **`mapYearData.js`**, and calls **`applyYear({ year, data, progress })`** in the matching scene file.
6. **`Timeline`** displays years **2021–2026** plus a **Look Ahead** button. Clicking a year updates all three triptych scenes. Clicking **Look Ahead** triggers the carousel transition to the **Future** scene.
7. **`App.css`** defines scene carousel animations (panels slide apart; Future slides in). **`Timeline.css`** handles the energy-themed timeline. Shared pill button styles live in **`index.css`** as **`.chrome-cta`** (used by Look Ahead and Back).

---

## Data visualization template (CSV + timeline)

This repo is structured as a **template for year-driven data visualization**. Each triptych panel has its own scene file and its own CSV.

### Data flow

```text
User clicks year on timeline
        ↓
App.jsx updates `year` prop on each ThreePanel
        ↓
ThreePanel fetches public/data/runtime/solar-data.json
        ↓
mapSceneYearData() in src/data/mapYearData.js
        ↓
applyYear({ year, data, progress }) in src/scenes/{variant}Scene.js
```

### Where to work (by role)

| Task | File | Look for |
|------|------|----------|
| **Replace dataset** | `public/data/sources/*.xlsx` + `npm run import-data` | Writes `public/data/runtime/solar-data.json` |
| **Map CSV → scene values** | `src/data/mapYearData.js` | `PLEASE WORK HERE FOR … DATA MAPPING` |
| **Build the 3D visualization** | `src/scenes/energyScene.js` (etc.) | `PLEASE WORK HERE FOR … — build your Three.js visualization` |
| **Update scene from data** | same scene file | `PLEASE WORK HERE FOR … — apply CSV data` inside `applyYear()` |
| **Animation** | same scene file | `PLEASE WORK HERE FOR … — per-frame animation` |

### CSV format

Normalized metrics live in **`public/data/runtime/solar-data.json`** (generated from workbooks in **`public/data/sources/`**). See **`public/data/README.md`** for the folder layout. Legacy per-scene CSVs remain under **`public/data/archive/`** for reference only.

```csv
year,generation_twh,capacity_gw
2021,32.1,12.4
2022,38.6,15.2
```

Column names can use `snake_case` or `camelCase`. Map them in **`mapYearData.js`** so each scene receives a clean `data` object.

### applyYear API

Every triptych scene receives the same shape when the year changes:

```js
applyYear({ year, data, progress })
```

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | Selected timeline year (e.g. 2024) |
| `data` | `object` | Output of `mapSceneYearData()` for this scene |
| `progress` | `number` | `0` at first year → `1` at last year (`yearProgress()`) |

The Future scene does not load CSV data by default.

---

## Site navigation and content pages

Click **solar-dinosaur** in the header to open a full-screen menu overlay. The menu links are defined in **`src/components/SiteMenu.jsx`**:

```js
const MENU_LINKS = [
  { id: 'main', label: 'Main site' },
  { id: 'artist-statement', label: 'Artist statement / Context of the project / Overview' },
  { id: 'research', label: 'Research Links / Data points / References' },
  { id: 'team', label: 'Team section' },
]
```

| Link | What it shows |
|------|----------------|
| **Main site** | Triptych scenes + timeline (resets year to 2021) |
| **Artist statement…** | Content page placeholder |
| **Research Links…** | Content page placeholder |
| **Team section** | Content page placeholder |

### Where to edit page content

All non-main page copy lives in **`src/components/ContentPage.jsx`** in the `CONTENT` object at the top of the file:

```js
const CONTENT = {
  'artist-statement': {
    title: 'Artist statement / Context of the project / Overview',
    body: [
      'First paragraph…',
      'Second paragraph…',
    ],
  },
  research: {
    title: 'Research Links / Data points / References',
    body: [
      'Add research links, datasets, and references for the project here.',
    ],
  },
  team: {
    title: 'Team section',
    body: [
      'Add team member names, roles, and bios here.',
    ],
  },
}
```

Each entry has:

- **`title`** — shown as the page heading (`<h1>`)
- **`body`** — array of strings; each string becomes one `<p>` paragraph

To edit a page, change the `title` and/or add, remove, or rewrite strings in `body`. The `id` keys (`artist-statement`, `research`, `team`) must match the `id` values in **`SiteMenu.jsx`** `MENU_LINKS`.

### Adding a new menu page

1. Add a link to **`MENU_LINKS`** in **`src/components/SiteMenu.jsx`** with a unique `id` and `label`
2. Add a matching entry to the `CONTENT` object in **`src/components/ContentPage.jsx`**
3. Optionally style the page in **`src/components/ContentPage.css`**

Menu overlay styling (large buttons, backdrop) is in **`src/components/SiteMenu.css`**. Menu buttons reuse the same pill style as Look Ahead via **`.chrome-cta`**.

### Navigation state

**`src/App.jsx`** tracks which view is active with `siteView` (`'main'`, `'artist-statement'`, `'research'`, or `'team'`). `handleNavigate()` switches views; choosing **Main site** also resets the timeline to **2021** and exits Look Ahead mode.

---

## Shared button style (Look Ahead, Back, menu)

**Look Ahead**, **Back**, and the menu overlay links share a pill button style defined as **`.chrome-cta`** in **`src/index.css`**:

- Squared corners (`border-radius: 10px`)
- `3.5px` border with a light gradient fill
- Hover brightening

**Look Ahead** adds **`timeline-cta`** in **`Timeline.css`** for absolute positioning on the timeline line.

**Back** appears in the timeline strip when the Future scene is open (left-aligned in **`.back-stage`** in **`App.css`**). It uses **`chrome-cta`** only — no `is-active` class, so it does not show the purple accent ring.

To change the shared button appearance, edit **`.chrome-cta`** in **`src/index.css`**. To change Look Ahead placement on the timeline, edit **`.timeline-cta`** in **`Timeline.css`**.

---

## Timeline

The site includes a full-width timeline between the main content and the footer.

- Clicking a **year** updates all **three triptych** Three.js scenes at once.
- Clicking **Look Ahead** transitions to the **Future** scene (see [Look Ahead and the Future scene](#look-ahead-and-the-future-scene) below).

### Default year

The site starts on **2021**. The default is set in **`src/constants/timeline.js`**:

```js
export const DEFAULT_YEAR = 2021
```

### Timeline layout and styling

The timeline spans the full page width and uses an **energy spark** visual theme on a black background:

| Element | Description |
|---------|-------------|
| **Track line** | Low-opacity white placeholder (`--timeline-track`, ~22% opacity) running from the center of **2021** to the center of **2026** |
| **Progress tail** | White-to-yellow gradient that fades in from transparent on the left and brightens toward the active year — reads as the energy trail behind the spark |
| **Year markers** | Hollow circles on the track; inactive markers use the same low-opacity white as the track |
| **Active year dot** | Yellow radial gradient with a multi-layer glow (energy spark effect) |
| **Look Ahead button** | Pill CTA after **2026**, centered on the timeline line via **`.timeline-cta`** |

The track line is positioned with CSS so it aligns exactly with the year dot centers (not the full width including the Look Ahead column). See **`--timeline-year-columns`** and **`--timeline-total-columns`** in **`Timeline.css`**.

### Timeline color variables

Edit these in **`.timeline-track`** inside **`src/components/Timeline.css`**:

| Variable | Purpose | Default |
|----------|---------|---------|
| `--timeline-track` | Inactive line and marker rings | `rgba(255, 255, 255, 0.22)` |
| `--timeline-spark` | Active dot base yellow | `#ffd54a` |
| `--timeline-spark-hot` | Active dot bright core | `#fff59d` |
| `--timeline-spark-glow` | Active dot outer glow | `rgba(255, 213, 74, 0.55)` |

The progress tail gradient and spark `box-shadow` are in **`.timeline-progress`** and **`.timeline-year.is-active .timeline-marker`** in the same file.

### Where the timeline code lives

| File | Purpose |
|------|---------|
| **`src/components/Timeline.jsx`** | Renders the timeline UI, year clicks, and Look Ahead button |
| **`src/components/Timeline.css`** | Track alignment, spark dot, progress tail, CTA positioning |
| **`src/constants/timeline.js`** | Year list (`2021`–`2026`), default year, and `yearProgress()` helper |

**`src/App.jsx`** owns timeline state and connects it to the scenes:

```jsx
const [year, setYear] = useState(DEFAULT_YEAR)
const [lookAheadActive, setLookAheadActive] = useState(false)
const [showFuture, setShowFuture] = useState(false)

const handleYearChange = (nextYear) => {
  setLookAheadActive(false)
  setYear(nextYear)
}

const handleLookAhead = () => {
  setLookAheadActive(true)
  setShowFuture(true)
  setYear(TIMELINE_YEARS[TIMELINE_YEARS.length - 1])
}

<Timeline
  year={year}
  onYearChange={handleYearChange}
  lookAheadActive={lookAheadActive}
  onLookAhead={handleLookAhead}
/>
```

### How the timeline affects the triptych scenes

Each triptych scene factory in **`src/scenes/index.js`** returns an `applyYear(year)` function. When you click a year:

1. **`Timeline`** calls `onYearChange(year)`
2. **`App.jsx`** sets `lookAheadActive` to `false` and updates `year`
3. Each triptych **`ThreePanel`** calls `applyYear(year)` on its scene (without remounting the canvas)

`yearProgress(year)` maps the selected year to a value from `0` (2021) to `1` (2026). Scenes use that value to interpolate sizes, colors, and animation speed.

| Scene | What changes from 2021 → 2026 |
|-------|-------------------------------|
| **Energy** | Core grows brighter and larger; corona and orbit expand; rotation speeds up |
| **CO2** | Knot grows and shifts from purple to red; ring expands; rotation speeds up |
| **Saving** | Figure grows and becomes greener; ground lightens; bobbing increases slightly |

### How to edit the timeline

**Change the year range** — edit `TIMELINE_YEARS` in **`src/constants/timeline.js`**:

```js
export const TIMELINE_YEARS = [2021, 2022, 2023, 2024, 2025, 2026]
```

If you change the range, update each triptych scene’s `applyYear()` in **`src/scenes/{energy,co2,saving}Scene.js`** and add matching rows to the CSV files. You may also need to adjust the track line width in **`Timeline.css`** (`--timeline-year-columns` / `--timeline-total-columns`).

**Change the default starting year** — edit `DEFAULT_YEAR` in the same constants file.

**Change timeline appearance** — edit **`src/components/Timeline.css`**:

- **Track / inactive markers:** `--timeline-track`
- **Spark dot colors and glow:** `--timeline-spark`, `--timeline-spark-hot`, `--timeline-spark-glow`, and `.timeline-year.is-active .timeline-marker`
- **Progress tail gradient:** `.timeline-progress`
- **Look Ahead position:** `.timeline-cta`

**Change shared button style (Look Ahead + Back + menu):** edit **`.chrome-cta`** in **`src/index.css`**.

**Change what happens when a year is selected** — edit `applyYear()` in **`src/scenes/{energy,co2,saving}Scene.js`** and column mapping in **`src/data/mapYearData.js`**.

---

## Look Ahead and the Future scene

Clicking the **Look Ahead -->** button on the timeline replaces the triptych with a single full-width **Future** Three.js scene, using a horizontal carousel-style transition.

### What happens when you click Look Ahead

1. **`lookAheadActive`** becomes `true` and **`showFuture`** becomes `true` in **`App.jsx`**
2. The year is set to **2026** (the last timeline year)
3. CSS class **`scene-carousel--future`** is applied to the carousel container
4. The three triptych panels animate apart:
   - **Energy** slides left off screen
   - **CO2** fades and scales down in the center
   - **Saving** slides right off screen
5. The **Future** scene slides in from the right and fills the main area

### Returning to the triptych

Click the **<-- Back** button in the timeline strip (left-aligned). That calls `handleGoBack()` in **`App.jsx`**, which:

1. Sets `lookAheadActive` to `false`
2. Resets the year to **2021**
3. Reverses the carousel animation back to the three-panel view

The Future scene stays mounted (hidden) so the reverse transition stays smooth.

You can also return via the menu: **Main site** runs the same reset logic.

Selecting a year on the timeline while still on the triptych updates scenes without entering Future mode. If you were in Future mode, use **Back** or **Main site** first.

### Where the carousel code lives

| File | Purpose |
|------|---------|
| **`src/App.jsx`** | `lookAheadActive`, `showFuture` state; carousel markup; **Back** button |
| **`src/App.css`** | `.scene-carousel`, `.scene-carousel--future`, panel slide transforms, `.future-stage`, `.chrome-carousel`, `.back-stage` |
| **`src/scenes/futureScene.js`** | `createFutureScene()` factory |
| **`src/components/ThreePanel.jsx`** | Mounts the `future` variant (no `year` prop required) |
| **`src/index.css`** | **`.chrome-cta`** shared button style for Look Ahead and Back |

Carousel markup in **`App.jsx`**:

```jsx
<div className={`scene-carousel${lookAheadActive ? ' scene-carousel--future' : ''}`}>
  <section className="triptych" aria-hidden={lookAheadActive}>
    {/* energy, co2, saving panels */}
  </section>

  {showFuture && (
    <section className="future-stage" aria-label="Future scene">
      <ThreePanel variant="future" label="Future scene" />
    </section>
  )}
</div>

<div className={`chrome-carousel${lookAheadActive ? ' chrome-carousel--future' : ''}`}>
  <div className="timeline-stage">
    <Timeline ... />
  </div>

  {showFuture && (
    <div className="back-stage">
      <button type="button" className="chrome-cta" onClick={handleGoBack}>
        <span className="chrome-cta-arrow">&lt;--</span>
        <span className="chrome-cta-label">Back</span>
      </button>
    </div>
  )}
</div>
```

### The Future scene

`createFutureScene()` in **`src/scenes/futureScene.js`** renders a distinct futuristic visualization:

- Cyan glowing icosahedron core
- Purple wireframe outer shell
- Orbiting light nodes
- Rotating accent ring

Unlike the triptych scenes, the Future scene does **not** respond to timeline years. It exposes a no-op `applyYear()` and is mounted without a `year` prop.

### How to edit Look Ahead behavior

| Goal | Where to edit |
|------|----------------|
| Change slide animation speed or direction | **`src/App.css`** — `.triptych-panel` transitions and `.scene-carousel--future` transforms |
| Change what the Future scene looks like | **`src/scenes/futureScene.js`** — `createFutureScene()` |
| Change when Future mounts or unmounts | **`src/App.jsx`** — `showFuture` / `lookAheadActive` logic |
| Change Look Ahead or Back button label or style | **`Timeline.jsx`** / **`App.jsx`** for labels; **`.chrome-cta`** in **`index.css`** for shared style; **`.timeline-cta`** in **`Timeline.css`** for Look Ahead position |
| Change Back button placement | **`App.css`** — `.back-stage` |

On viewports **1024px and below**, the carousel uses vertical slides (panels move up/down) instead of horizontal.

---

## Three.js scenes: where they live and how to edit them

### Where the scene code is

Each scene has its own file under **`src/scenes/`**:

| File | `variant` | View |
|------|-----------|------|
| **`energyScene.js`** | `"energy"` | Triptych (left) |
| **`co2Scene.js`** | `"co2"` | Triptych (center) |
| **`savingScene.js`** | `"saving"` | Triptych (right) |
| **`futureScene.js`** | `"future"` | Full-width (Look Ahead) |
| **`shared.js`** | — | Shared renderer, camera, lights |
| **`co2Camera.js`** | — | Shared triptych camera load/save + framing edit tool |
| **`index.js`** | — | `sceneFactories` registry |

They are registered in **`src/scenes/index.js`**:

```js
export const sceneFactories = {
  energy: createEnergyScene,
  co2: createCo2Scene,
  saving: createSavingScene,
  future: createFutureScene,
}
```

**`src/components/ThreePanel.jsx`** handles the canvas, CSV loading, resizing, render loop, cleanup, and calling `applyYear({ year, data, progress })` when the year changes.

**`src/App.jsx`** wires triptych panels via `variant` and `year`; the Future panel uses only `variant="future"`:

```jsx
<ThreePanel variant="energy" label="Energy scene" year={year} />
<ThreePanel variant="co2" label="CO2 scene" year={year} />
<ThreePanel variant="saving" label="Saving scene" year={year} />
<ThreePanel variant="future" label="Future scene" />
```

### How to edit an existing scene

1. Start the dev server: `npm run dev`
2. Open the scene file (e.g. **`src/scenes/energyScene.js`**)
3. Work in the sections marked **`PLEASE WORK HERE FOR …`**
4. Update **`public/data/sources/`** (then `npm run import-data`) and **`src/data/mapYearData.js`** if your data columns change
5. Save — Vite hot-reloads automatically

Each triptych scene follows the same pattern:

```js
export function createEnergyScene(initialYear) {
  const scene = new THREE.Scene()
  // ...

  // PLEASE WORK HERE — build visualization
  const mesh = new THREE.Mesh(...)
  scene.add(mesh)

  // PLEASE WORK HERE — apply CSV data on year change
  const applyYear = ({ year, data = {}, progress }) => {
    // use data.generationTwh, etc.
  }

  // PLEASE WORK HERE — per-frame animation
  const animate = () => { /* ... */ }

  return { scene, camera, renderer, animate, applyYear, objects: [mesh] }
}
```

Common edits:

- **Colors / shapes / motion:** scene file (`*Scene.js`)
- **Data per year:** `public/data/runtime/solar-data.json` + `mapYearData.js` + `applyYear()` in scene file
- **Timeline range:** **`src/constants/timeline.js`**

Any new mesh or group should be listed in the `objects` array so **`ThreePanel`** can dispose of it on unmount.

### How to add a new scene

1. Copy **`src/scenes/energyScene.js`** → **`src/scenes/moonScene.js`** (or similar)
2. Register it in **`src/scenes/index.js`** → `sceneFactories`
3. Add source data under **`public/data/sources/`** (or archive CSV under **`public/data/archive/`**) and a mapper in **`src/data/mapYearData.js`**
4. Add **`DATA_SCENES`** entry in **`src/data/loadYearData.js`** if it uses CSV
5. In **`src/App.jsx`**, add `<ThreePanel variant="moon" label="Moon scene" year={year} />`
6. Update styles in **`App.css`** if layout changes

For a scene without timeline/CSV, follow **`futureScene.js`** (no `year` argument, no-op `applyYear`).

### Triptych camera framing (dev tool)

The three main triptych scenes share one camera pose from **`public/data/runtime/co2-camera.json`** (via **`src/scenes/co2Camera.js`**). The Look Ahead scene has a separate committed pose in **`src/scenes/futureScene.js`**. Collaborators can nudge either framing in the browser without editing camera coordinates by hand.

**Edit mode is off by default** so visitors don’t accidentally pan the map. Turn it on with either:

| Method | How |
|--------|-----|
| Keyboard | **Shift+C** (toggles on/off; preference is remembered in `localStorage`) |
| URL | Open the app with **`?triptychCamera=1`** (e.g. `http://localhost:5173/?triptychCamera=1`). Use **`?triptychCamera=0`** to force it off |

When edit mode is on, a small HUD appears on the **energy** (left) panel and these keys work:

| Key | Action |
|-----|--------|
| **Arrow keys** | Pan on X / Z (hold **Shift** for a larger step) |
| **Q / E** | Raise / lower on Y |
| **+ / −** | Zoom in / out |
| **S** | Save the current pose (writes `localStorage` and logs JSON in the console) |
| **R** | Reset to auto top-down fit |
| **Shift+C** | Turn edit mode off |

**To persist a new framing in the repo:**

1. Enable edit mode and adjust until it looks right  
2. Press **S**  
3. Copy the JSON from the browser console  
4. Paste it into **`public/data/runtime/co2-camera.json`** and commit  

Until you update that file, a local **S** save still wins on refresh (so you can iterate). Clear site data for the app, or overwrite the JSON and remove the `solar-dinosaur.co2-camera` `localStorage` entry, if you need to fall back to the committed file only.

#### Repositioning the Look Ahead scene

1. Open **Look Ahead**.
2. Press **Shift+C** to enable camera editing.
3. Use the same controls listed above:
   - **Arrow keys** pan the scene.
   - **Q / E** raise or lower it.
   - **+ / −** zoom.
   - Hold **Shift** with a movement key for a larger step.
4. Press **S** to print the current camera JSON in the browser console.
5. Copy the `position`, `target`, and `up` values into `LOOK_AHEAD_CAMERA` near the top of **`src/scenes/futureScene.js`**:

```js
const LOOK_AHEAD_CAMERA = {
  position: [-0.6, -7.633570423560478, 0.48],
  target: [-0.6, 0, 0.48],
  up: [0, 0, -1],
}
```

Do **not** paste a Look Ahead-only pose into **`public/data/runtime/co2-camera.json`**. That file controls the three main triptych scenes. Note that pressing **S** also saves the temporary editor pose to the shared `solar-dinosaur.co2-camera` local-storage entry; remove that entry after copying the values if you do not want it to override the triptych camera during local testing.

#### Repositioning the Fulton County backdrop

Open Look Ahead and press **Shift+M** to toggle the backdrop editor. You can also open the app with **`?fultonBackdrop=1`**; use **`?fultonBackdrop=0`** to force the editor off.

| Key | Action |
|-----|--------|
| **I / J / K / L** | Move up / left / down / right (hold **Shift** for a larger step) |
| **U / O** | Make the backdrop smaller / larger |
| **[ / ]** | Reduce / increase opacity |
| **P** | Save to `localStorage` and print the values in the browser console |
| **0** | Reset the live values to the committed defaults |
| **Shift+M** | Turn edit mode off |

To persist the placement in the repository, press **P**, copy the printed values, and replace `DEFAULT_BACKDROP` near the top of **`src/components/lookAhead/FultonCountyBackdrop.jsx`**.

### Three.js reference

Scene code uses the [Three.js API](https://threejs.org/docs/). Useful docs:

- [Geometries](https://threejs.org/docs/#api/en/geometries/BoxGeometry)
- [Materials](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial)
- [Lights](https://threejs.org/docs/#api/en/lights/DirectionalLight)

---

## Tech stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/)


## Notes on Collaboration

For collaborating, we are using Github. Please do the following whenever you plan to commit push something to the repository. 

1. Fetch/pull from the origin of the repo. 
2. Compare differences and accept mergers. 
3. Do your commit and add a message for documentation
4. Push to the origin