# solar-dinosaur

**Fulton Brighter Futures** is an interactive website that visualizes solar panel adoption across Fulton County government buildings. Visitors move through a **2021–2026** timeline to see energy generated, CO₂ reduced, and money saved. Then they can open **Look Ahead** to imagine how incorporating more buildings in the area can contribute to Fulton's Solar Program. The experience includes three side-by-side Three.js scenes (energy, CO₂, and saving), a menu of content pages (overview, references, team, and more), and a local **Update Desk** for refreshing building data from Excel without writing code.

This README is a full setup and editing guide. It assumes you may be starting on a machine with **no development tools installed yet**. You do not need to be a programmer to follow most of these steps—especially Update Desk and basic content edits. When something feels unclear, the [Get help with Cursor or Claude](#get-help-with-cursor-or-claude) section points you to friendly AI assistants that can walk you through problems in plain language.

### Where to start

| If you want to… | Jump to |
|-----------------|---------|
| See how the project folders are organized | [File organization](#file-organization) |
| Install tools and open the site for the first time | [What you need](#what-you-need) through [Run the development server](#5-run-the-development-server) |
| Upload new Excel building data | [Update Desk](#update-building-data-update-desk) |
| Change page text, menu labels, or colors | [Editing content and appearance](#editing-content-and-appearance) |
| Fix a common error | [Troubleshooting](#troubleshooting) |
| Ask an AI assistant for help | [Get help with Cursor or Claude](#get-help-with-cursor-or-claude) |

---

## File organization

The project is a standard Vite + React app. Here is a simplified map of the folders you are most likely to touch:

```text
solar-dinosaur/
├── Start-Update-Desk.bat   # Windows shortcut to open Update Desk
├── index.html              # HTML entry; loads fonts and the React app
├── package.json            # Project name, dependencies, and npm scripts
├── DesignAssets/           # Logos, headshots, and design art
├── public/
│   └── data/
│       ├── runtime/        # JSON files the live site loads in the browser
│       ├── sources/        # Excel inputs for imports / Update Desk
│       ├── review/         # Supervisor confirmation files (not loaded by the app)
│       └── archive/        # Older sources and snapshots (keep these)
├── scripts/
│   └── update-desk/        # Local Update Desk app
└── src/
    ├── App.jsx             # Main layout, intro screen, and navigation
    ├── App.css             # Intro screen, carousel, and Back button layout
    ├── index.css           # Global colors and shared styles (including .chrome-cta)
    ├── components/         # Timeline, menu, content pages, Look Ahead UI
    ├── constants/          # Timeline years and story moments
    ├── data/               # Loading and mapping solar data for each year
    ├── scenes/             # Three.js visualizations
    └── assets/             # Favicon, icons, and related images
```

### How the pieces connect (short version)

1. **`index.html`** loads the font and **`src/main.jsx`**, which renders **`App.jsx`**.
2. **`App.jsx`** manages the intro screen, timeline year, Look Ahead mode, and the site menu. The main view shows three **`ThreePanel`** scenes; menu links open content pages. The timeline strip also holds the **Back** button when Look Ahead is open.
3. When the timeline year changes, each panel loads **`public/data/runtime/solar-data.json`**, maps that year in **`src/data/mapYearData.js`**, and updates the matching scene under **`src/scenes/`**.
4. Clicking **Look Ahead** on the timeline swaps the triptych for the full-width Future scene (carousel animation in **`App.css`**). **Update Desk** writes into `public/data/sources/` and rebuilds the runtime JSON so the site can show new Excel data without hand-editing those JSON files.

---

## What you need

| Tool | Why you need it |
|------|-----------------|
| **Git** | To download the project from the repository |
| **Node.js** (includes **npm**) | To install packages and run the website and Update Desk |

You do **not** need to install React, Vite, or Three.js yourself. Those are downloaded automatically when you run `npm install`.

**Recommended Node.js version:** 20 LTS or newer.

---

## 1. Install Git

Git lets you clone (download) the repository onto your computer.

### Windows

1. Download the installer from [https://git-scm.com/download/win](https://git-scm.com/download/win).
2. Run the installer and accept the default options.
3. Open **PowerShell** or **Command Prompt** and verify that Git is available:

```bash
git --version
```

### macOS

1. Install Xcode Command Line Tools if macOS prompts you the first time you run `git`, **or** install Git from [https://git-scm.com/download/mac](https://git-scm.com/download/mac).
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

1. Download the **LTS** installer from [https://nodejs.org](https://nodejs.org).
2. Run the installer and keep **“Add to PATH”** enabled.
3. Close and reopen PowerShell, then verify:

```bash
node --version
npm --version
```

**If `node` or `npm` is not recognized** in Cursor’s terminal (or another editor terminal) after installing Node.js, fully quit and reopen the app so it picks up the updated PATH. A new external PowerShell window may already work before the editor does.

**If `node` works but `npm` fails** with an error like `npm.ps1 cannot be loaded because running scripts is disabled on this system`, PowerShell’s execution policy is blocking npm’s script. Fix it by typing the following in PowerShell:

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
git clone https://github.com/ThaisAlvarenga/solar-dinosaur.git
cd solar-dinosaur
```

If you are using a fork or a different remote, replace the URL with that repository’s `https://` or `git@` clone link.

### Option B: Download a ZIP

1. Download the repository as a ZIP from your Git host (for example, GitHub **Code → Download ZIP**).
2. Extract the ZIP.
3. Open a terminal in the extracted `solar-dinosaur` folder.

I recommend you then open the project in VS Code, Cursor, or another text editor. Open the terminal from there (usually with **Ctrl+`** on Windows/Linux or **Cmd+J** / **Ctrl+J** depending on your setup) so commands run in the correct project folder.

---

## 4. Install project dependencies

In your terminal, make sure that you are in the project root (the folder that contains `package.json`). Then type:

```bash
npm install
```

This reads `package.json` and downloads everything the app needs (React, Vite, Three.js, and related tools) into a local `node_modules` folder. You only need to run this once on a machine, or again after dependencies change.

---

## 5. Run the development server

On your terminal, type:

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
| `npm run build` | Create an optimized production build in `dist/` (also refreshes data from Excel first) |
| `npm run preview` | Serve the production build locally (run `build` first) |
| `npm run lint` | Check the code with ESLint |
| `npm run import-data` | Rebuild `public/data/runtime/solar-data.json` from Excel sources |
| `npm run validate-data` | Check catalog / positions / metrics consistency |
| `npm run update-desk` | Open the local Update Desk (upload Excel → review → publish) |
| `npm run deploy` | Publish `dist/` to GitHub Pages |

The main commands you will need for making the website live are `npm run build` and `npm run deploy`. **Publish** here means building the site and putting it on GitHub Pages so others can visit it.

The other command you will use often is `npm run update-desk`. This opens a local website that provides a code-less, hopefully friendly way to update the project’s Excel-driven data.

On Windows, you can also start Update Desk by double-clicking **`Start-Update-Desk.bat`** in the project root. The first run will install dependencies for you if needed.

---

## Update building data (Update Desk)

Use Update Desk when someone on the team needs to refresh energy, savings, or address Excel files **without editing code**. Everything stays on this computer until you choose to publish to GitHub. There is no outside hosting involved beyond your normal GitHub workflow.

### First-time setup (once per computer)

1. Install **Git** and **Node.js LTS**, then clone the repo and run `npm install` (sections above).
2. Make sure you can sign in to GitHub (GitHub Desktop or Git Credential Manager is fine).
3. Create or edit a file named **`.env.update-desk`** in the project root (the same folder as `package.json`):

```text
UPDATE_DESK_PASSWORD=your-shared-password
```

Ask a teammate for the shared password if you do not already have it. Do **not** commit `.env.update-desk`—Git is already set up to ignore it.

If you start Update Desk before creating the file, it can generate one for you and print a password in the terminal. Save that password somewhere safe for the team.

### Day-to-day update

1. Double-click **`Start-Update-Desk.bat`** (Windows), or run `npm run update-desk` from the project folder.
2. Your browser should open to `http://127.0.0.1:4178/`. Unlock with the shared password.
3. **Upload** one or more `.xlsx` files. Filenames do not matter—the desk looks inside each workbook and detects what it contributes:
   - Sheets named by year → building kWh (energy) data
   - `Elec Rates` / `CS Rates` sheets → rates and savings
   - Address + building name columns → addresses used for map placement
4. Click **Process uploads**. Review the contribution cards, key **Elec / CS rates**, and **display names**. Edit names or rates in the Review step if something should read differently on the site.
5. If a building has **no map position**, enter its street address in Review and click **Place on map**.
6. Click **Apply**. Previous source files are archived under `public/data/archive/sources/<timestamp>/`, and the runtime JSON the website reads is rebuilt.
7. Click **Publish** when you are ready. That step commits the data changes, pushes to GitHub, builds the site, and deploys GitHub Pages.

If Process shows **Unknown** buildings or unresolved **No map position** warnings, stop and ask a developer before publishing. You can also try to resolve this using an AI agent.

Optional practice files live in the **`test-uploads/`** folder.

### Troubleshooting (Update Desk)

| Symptom | What to try |
|---------|-------------|
| Incorrect password | Open `.env.update-desk` and use the value after `UPDATE_DESK_PASSWORD=` |
| Unrecognized file | Energy workbooks need year sheets; rates need Elec Rates + CS Rates; addresses need address + name columns |
| Unknown building | You may need to add an alias in `src/data/buildingRegistry.js`. An alias is simply another name the code recognizes for the same building. |
| No map position | In Review, enter the building address and click **Place on map** |
| Publish / push fails | Sign in to GitHub, then click Publish again |
| `node` / `npm` not found | Install Node.js LTS, reopen the terminal, and run `npm install` |
| Desk will not start / port busy | Close whatever else is using port **4178**, then run `Start-Update-Desk.bat` again |

---

## Editing content and appearance

When you edit text in code files, keep the surrounding quotes, commas, and brackets intact so the file stays valid. Keep `npm run dev` running and refresh the browser to see your changes.

### Intro overlay

The first screen visitors see (logos, welcome copy, and the **Enter** button) lives in **`src/App.jsx`** inside the `intro-screen` block. Update the paragraph under `intro-screen__copy`, the Enter button label, or swap the logos and collage images imported at the top of that file (they come from **`DesignAssets/`**). Intro layout and animation styles are in **`src/App.css`** (search for `intro-screen`).

### Menu pages (Overview, References, Team, and similar)

Most visitor-facing page copy lives in **`src/components/ContentPage.jsx`**. Open that file, find the section you want to change (for example the overview paragraphs or a team member bio), and edit the text carefully.

Menu button labels (what people see when they open the site menu) live in **`src/components/SiteMenu.jsx`**. Page and menu styling are in **`src/components/ContentPage.css`** and **`src/components/SiteMenu.css`**. Reference-list content may also touch **`src/components/ReferencePage.jsx`**.

To **add a new menu page**:

1. Add a link to **`MENU_LINKS`** in **`src/components/SiteMenu.jsx`** with a unique `id` and `label`.
2. Add a matching entry to the content object in **`src/components/ContentPage.jsx`** (same `id`).
3. Optionally style the page in **`src/components/ContentPage.css`**.

Choosing **Main site** in the menu returns to the triptych and timeline (and exits Look Ahead if it was open).

### Timeline story moments

Year callouts along the timeline (the short dated stories for 2020, 2021, and so on) live in **`src/constants/timeline.js`** inside `TIMELINE_EVENTS_BY_YEAR`. Edit `dateLabel` and `copy` for each year you want to change.

The timeline UI itself is **`src/components/Timeline.jsx`**, with look and feel in **`src/components/Timeline.css`**. The list of years and the default starting year also live in **`timeline.js`**. Clicking a year updates all three triptych scenes together.

### Look Ahead page

Look Ahead is the full-width future view. Clicking **Look Ahead** on the timeline replaces the three-panel triptych with a single Future scene, using a carousel-style transition defined in **`App.css`**. Use **Back** (in the timeline strip) to return to the main triptych.

The main Look Ahead UI chrome (metric tabs such as Energy / CO₂ / Money, building composer, stats, and building list) lives under **`src/components/lookAhead/`**, especially **`FutureOverlay.jsx`**, **`FutureStats.jsx`**, **`BuildingComposer.jsx`**, and **`FutureBuildingLog.jsx`**.

Placeable building types (Office, Home, School, Shop) and their assumed system sizes are defined in **`src/data/futureBuildingTypes.js`**. Stickers for custom buildings are listed in **`src/data/futureStickers.js`**, with images under **`src/assets/sticker-icons/`**.

Building display names that appear on the map and in lists can also be adjusted in **`public/data/sources/building-display-names.json`** (Update Desk Review can edit these too). After changing that JSON by hand, run `npm run import-data` so the runtime data picks up the names.

### Shared buttons (Look Ahead, Back, menu)

**Look Ahead**, **Back**, and the menu overlay links share a pill button style defined as **`.chrome-cta`** in **`src/index.css`**. To change that shared look, edit `.chrome-cta` there.

- Look Ahead’s placement on the timeline line uses **`.timeline-cta`** in **`Timeline.css`**.
- Back button placement when Look Ahead is open uses **`.back-stage`** in **`App.css`**.

### Colors, fonts, and design assets

The site uses a black background with light text. Global colors and shared button styles are set in **`src/index.css`** (for example `--bg`, `--text`, and `--accent`). The Three.js canvases are transparent, so they sit on top of that page background.

The site uses the **[Anybody](https://fonts.google.com/specimen/Anybody)** font, loaded from Google Fonts in **`index.html`** and applied in **`src/index.css`**. To change the font, update the Google Fonts link in `index.html` and the related CSS variables. Logos, headshots, and other design art live under **`DesignAssets/`**.

| Goal | Where to look |
|------|----------------|
| Change intro welcome copy or Enter button | **`src/App.jsx`** (intro screen) |
| Change Overview / Team / References copy | **`src/components/ContentPage.jsx`** |
| Change menu link labels | **`src/components/SiteMenu.jsx`** |
| Add a new menu page | **`SiteMenu.jsx`** + **`ContentPage.jsx`** |
| Change timeline year stories or default year | **`src/constants/timeline.js`** |
| Change Look Ahead labels / metrics UI | **`src/components/lookAhead/`** |
| Change Look Ahead building types or sizes | **`src/data/futureBuildingTypes.js`** |
| Change building display names | **`public/data/sources/building-display-names.json`** (then import) |
| Change shared Look Ahead / Back / menu button style | **`src/index.css`** (`.chrome-cta`) |
| Change page background or global colors | **`src/index.css`** |
| Change timeline look | **`src/components/Timeline.css`** |
| Map Excel fields → scene values | **`src/data/mapYearData.js`** |
| Replace logos, headshots, or collage art | **`DesignAssets/`** |

### Building data without Update Desk (advanced)

If you prefer not to use Update Desk, place Excel (and related) files in **`public/data/sources/`** and run:

```bash
npm run import-data
```

That rebuilds **`public/data/runtime/solar-data.json`**. For most people, Update Desk is safer because it archives previous sources and can publish for you. Folder roles are described in more detail in **`public/data/README.md`**.

**Naming matters** when you drop files in by hand (Update Desk is more flexible about upload names, but the import script looks for specific live filenames):

| Role | Expected name in `public/data/sources/` | Notes |
|------|-----------------------------------------|--------|
| Building energy (kWh) | **`solar-data.xlsx`** | Required. Workbook should include year sheets (for example `2021`, `2022`) or monthly energy headers. |
| Rates & savings | **`Solar Monthly Savings ….xlsx`** | Prefer names like `Solar Monthly Savings 2026-7-24.xlsx`. The importer picks the newest dated match. Sheets should include **Elec Rates** and **CS Rates** (and usually **kWh**). |
| Legacy cost fallback | **`solar-cost.xlsx`** | Optional backup if a Savings workbook is missing. |
| Addresses | **`solar-building-addresses.xlsx`** | Needs building/name and address columns. Used to geocode and place markers on the map. |
| Display names | **`building-display-names.json`** | Maps stable building IDs to the names shown on the site. |
| Rate overrides | **`savings-rate-overrides.json`** | Optional; locks key Elec / CS rates used in summaries. |

After changing addresses, you may also need `npm run project-positions` (or use Update Desk **Place on map**) so **`runtime/building-positions.json`** stays in sync. Avoid leaving Excel lock files (`~$…xlsx`) in the folder.

### Three.js scenes

The glowing building maps are WebGL scenes built with Three.js. Each panel is a separate file under **`src/scenes/`**, registered in **`src/scenes/index.js`** and mounted by **`src/components/ThreePanel.jsx`**.

| Scene | File | What it shows |
|-------|------|----------------|
| Energy | **`energyScene.js`** | Left triptych panel — buildings sized / themed by energy produced |
| CO₂ | **`co2Scene.js`** | Center panel — same map driven by CO₂ saved |
| Saving | **`savingScene.js`** | Right panel — map driven by money saved |
| Look Ahead / Future | **`futureScene.js`** | Full-width map for placing imagined buildings |

When the timeline year changes, `ThreePanel` loads **`public/data/runtime/solar-data.json`**, maps that year in **`src/data/mapYearData.js`**, and calls `applyYear({ year, data, progress })` on the active scene. Shared helpers (renderer, lights, camera fit, picking) live in **`shared.js`**. Building orb visuals live in **`src/components/building/`**.

The three triptych scenes share one camera pose from **`public/data/runtime/co2-camera.json`** (via **`co2Camera.js`**). The Look Ahead scene keeps its own committed pose inside **`futureScene.js`**.

To change how a scene reacts to a year, edit `applyYear()` in that scene file and, if the data shape changed, **`mapYearData.js`**. Changing scene files usually means working with Three.js, so it is best handled by a developer or with careful AI assistance.

Useful Three.js docs: [Geometries](https://threejs.org/docs/#api/en/geometries/BoxGeometry), [Materials](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial), [Lights](https://threejs.org/docs/#api/en/lights/DirectionalLight).

#### Developer positioning tools

These tools help position the 3D camera and the Fulton County outline during design work. They are **turned off by default** so visitors (and kiosk demos) cannot accidentally enter edit mode. The code stays in the project. To turn a tool on or off, open the file listed below and change its switch from `false` to `true` (or back to `false`), then reload the site. Those switches are plain `true`/`false` values near the top of each file—for example `TRIPTYCH_CAMERA_EDIT_AVAILABLE = false`.

**1. Triptych / Look Ahead camera** (`src/scenes/co2Camera.js`)

- **Purpose:** Pan, raise/lower, and zoom the shared camera that frames the building maps; save a pose into local storage (and optionally into `public/data/runtime/co2-camera.json`).
- **Enable:** Set `TRIPTYCH_CAMERA_EDIT_AVAILABLE = true` near the top of `co2Camera.js`, then reload the site.
- **Use:** Press **Shift+C** to toggle edit mode (or open with `?triptychCamera=1`). While on: arrow keys pan, **Q/E** move up/down, **+/-** zoom, **S** save, **R** reset.
- **Disable:** Set `TRIPTYCH_CAMERA_EDIT_AVAILABLE = false` again (recommended for normal use).
- **Important:** Do **not** paste a Look Ahead-only pose into **`public/data/runtime/co2-camera.json`**. That file controls the three main triptych scenes. Look Ahead framing is edited while the Future view is open, then copied into **`futureScene.js`** instead.

**2. Fulton County backdrop** (`src/components/lookAhead/FultonCountyBackdrop.jsx`)

- **Purpose:** Nudge the county outline image behind Look Ahead (position, scale, opacity) and save those values.
- **Show / hide the outline itself:** `FULTON_COUNTY_OUTLINE_ENABLED` (currently `true`).
- **Enable editing:** Set `FULTON_BACKDROP_EDIT_AVAILABLE = true`, then reload and open Look Ahead.
- **Use:** Press **Shift+M** to toggle edit mode (or `?fultonBackdrop=1`). While on: **I/J/K/L** move, **U/O** resize, **[/]** opacity, **P** save, **0** reset.
- **Disable editing:** Set `FULTON_BACKDROP_EDIT_AVAILABLE = false` again.

**3. Clear Look Ahead buildings** (`src/App.jsx`)

- **Purpose:** Press **C** to wipe persisted user-placed Look Ahead buildings (useful while testing).
- **Enable / disable:** `LOOK_AHEAD_CLEAR_KEY_ENABLED` (currently `false`).

---

## Troubleshooting

### `node` or `npm` is not recognized

Node.js may not be installed, or the terminal was opened **before** installation finished. Close all terminal windows, open a new one, and run `node --version` again. On Windows, confirm Node.js was added to PATH during install. If you are inside Cursor or VS Code, fully quit and reopen the app after installing Node.

### `npm install` fails with permission errors

Avoid using `sudo npm install` on macOS/Linux inside the project folder. If you need to fix npm’s default directory, see [npm’s guide to EACCES permissions errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

### Port 5173 is already in use

Another app (or another Vite dev server) is using that port. Stop the other process, or run with a different port:

```bash
npm run dev -- --port 5174
```

### Blank page or errors after cloning

1. Make sure you are in the project root (where `package.json` lives).
2. Delete `node_modules` and reinstall.

On macOS / Linux:

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

Use a modern browser with WebGL support. Try a hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS).

### Something broke and you are not sure why

Write down what you clicked, what you expected to happen, and what happened instead. A screenshot and any red error text from the browser or terminal are especially helpful. Then use Cursor **Debug** mode or Claude in VS Code (next section) and paste that information into the chat.

---

## Get help with Cursor or Claude

You do not need to be a programmer to ask for help. Write in complete, everyday sentences—for example, “The Update Desk password works, but Publish fails when I click the button,” or “Please change the Overview paragraph to say the following…”

### Using Cursor (recommended for this project)

1. Open the **solar-dinosaur** folder in [Cursor](https://cursor.com).
2. Open the Agent panel with **Ctrl+I** (Windows/Linux) or **Cmd+I** (Mac).
3. Choose a mode that matches what you need:
   - **Agent** when you want the assistant to make changes for you
   - **Ask** when you only want an explanation
   - **Debug** when something is broken and you need help finding why

These official Cursor pages are written for people learning as they go:

- [Using Agent](https://cursor.com/help/ai-features/agent) — how to start a chat and switch modes
- [Debug mode](https://cursor.com/docs/agent/debug-mode) — a step-by-step way to troubleshoot with runtime clues
- [Debug mode overview](https://cursor.com/help/ai-features/debug-mode) — a shorter summary of the same idea

When you ask for help, paste the error message and say what you were doing when it appeared. The more specific you are, the better the answer will be.

### Using Claude in VS Code

If you prefer [Visual Studio Code](https://code.visualstudio.com/) (or use it alongside Cursor):

1. Install the official **Claude Code** extension published by Anthropic.
2. Sign in with your Claude account when prompted.
3. Open this project folder, then ask Claude to explain a file, suggest an edit, or help fix an error.

Anthropic’s guide walks through install and first use: [Use Claude Code in VS Code](https://code.claude.com/docs/en/vscode).

---

## Working together on GitHub

We collaborate through GitHub. Whenever you plan to commit and push changes to the repository, please:

1. **Fetch / pull** the latest changes from the origin of the repo so you are not working on an outdated copy.
2. Compare differences and resolve any merges if Git asks you to. You can use AI assistance.
3. Make your commit and write a short message that documents **why** you made the change.
4. **Push** to the origin.

When you use Update Desk **Publish** for data updates, that flow can handle commit, push, build, and deploy for you once you are signed in to GitHub.

---

## Tech stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/)
