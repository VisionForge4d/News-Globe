# News Globe 🌍

News Globe is an interactive 3D world browser for discovering country- and city-centered news sources.

Spin a globe, keep the center crosshair over a region, and the app finds the nearest curated “news station” with grouped links to local outlets and quick research pivots.

---

## What this project does

- Renders a real-time, interactive 3D globe in the browser with Three.js.
- Uses the camera’s forward ray (through the center crosshair) to find the exact point on the globe you are “looking at.”
- Converts that point into latitude/longitude.
- Finds the nearest station from a curated station dataset using Haversine distance.
- Shows grouped links (local media, national media, quick pivots like Google News/ReliefWeb).
- Lets you jump by search alias (e.g., `DRC`, `NZ`, `Aotearoa`) or pick a random station.
- Opens the first five links of the selected station in one click.

---

## Tech stack

- **Vite** for local development/build tooling
- **Three.js** for 3D rendering
- **OrbitControls** for smooth camera interaction
- Plain **HTML/CSS/JS modules** (no framework)

---

## Project structure

```text
.
├── app.js          # 3D scene setup, raycasting, nearest-station logic, UI wiring
├── stations.js     # Curated stations dataset (id, aliases, lat/lon, grouped links)
├── index.html      # App shell (viewport + right-side panel)
├── style.css       # Layout/theme styling
├── package.json    # Scripts and dependencies
└── README.md
```

---

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Run dev server

```bash
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`). Open it in your browser.

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

---

## How to use

1. **Drag to rotate** the globe.
2. Keep your target region under the **center crosshair**.
3. The side panel updates with:
   - nearest station name
   - approximate distance in km
   - computed latitude/longitude
   - grouped outbound links
4. Press **Open Top 5** to open the first five links from the selected station.
5. Use **Search station** and press Enter to jump by station name/alias.
6. Use **Random** to jump to a random station.

---

## Data model

Each station in `stations.js` follows this shape:

```js
{
  id: "CHE-BRN",
  name: "Switzerland — Bern",
  aliases: ["Switzerland", "CHE", "Schweiz", "Suisse", "Svizzera"],
  lat: 46.9480,
  lon: 7.4474,
  groups: [
    {
      title: "National / Public service",
      links: [
        { label: "SWI swissinfo", url: "https://www.swissinfo.ch/eng/" }
      ]
    }
  ]
}
```

### Field guide

- `id`: Unique station identifier.
- `name`: Human-readable station label shown in the UI.
- `aliases`: Extra search terms accepted by the search box.
- `lat` / `lon`: Geographic anchor used for nearest-neighbor lookup.
- `groups`: UI sections.
  - `title`: Group heading.
  - `links`: Outbound entries with `label` and `url`.

---

## Core implementation notes

### 1) Globe & scene

- Creates a sphere (`R = 1`) with a wireframe material.
- Adds ambient + directional lighting.
- Adds a separate group containing station markers and halos.

### 2) Coordinate conversion

- `latLonToVector3(lat, lon, radius)` maps geographic coordinates onto globe surface vectors.
- `vecToLatLon(v)` converts a hit-point vector back to latitude/longitude.

### 3) Station selection

- The app raycasts from camera position in camera-forward direction.
- On hit, it computes `lat/lon` and scans all stations.
- `haversineKm(...)` gives distance between hit-point and each station.
- `nearestStation(...)` returns the closest station + distance.

### 4) UI rendering

- `renderStation(...)` writes place/meta labels and grouped links.
- Links open in a new tab with `rel="noreferrer"`.

### 5) Search jump

- Search matches by substring on `name` or exact alias match.
- It computes a quaternion that rotates the globe so the target appears under center focus.

---

## Customizing News Globe

### Add a new station

Edit `stations.js` and append another object in `stations`.

Tips:
- Keep aliases short and practical (`ISO`, common local names, abbreviations).
- Include a mix of local and quick-pivot links.
- Validate URLs before committing.

### Change marker style

In `app.js`, adjust station marker geometry/material:

- dot size: `new THREE.SphereGeometry(0.02, ...)`
- halo size: `new THREE.SphereGeometry(0.035, ...)`
- colors/opacities in `MeshBasicMaterial`

### Tune camera behavior

In `app.js` under `OrbitControls` setup:

- `minDistance`
- `maxDistance`
- `enableDamping`
- `enablePan`

### Restyle layout/theme

Edit CSS variables and panel styles in `style.css`.

---

## Known limitations

- Station lookup is nearest-neighbor over a relatively small curated list (not exhaustive global coverage).
- `Open Top 5` may trigger popup blocking depending on browser settings.
- Search alias matching is exact for aliases (case-insensitive), not fuzzy.
- Globe material is currently wireframe-focused and intentionally minimal.

---

## Ideas for next improvements

- Add hover/select marker highlighting.
- Add fuzzy search + keyboard navigation.
- Animate camera movement when jumping to a station.
- Add clustering/regions and station filters.
- Persist last station/search in local storage.
- Add station validation scripts and automated link checks.

---

## Scripts reference

From `package.json`:

- `npm run dev` — start Vite dev server
- `npm run build` — produce production bundle
- `npm run preview` — locally preview production build

---

## License

Currently marked as **ISC** in `package.json`.

If you plan to publish/distribute, consider adding explicit attribution and a content curation policy for external links.


## Geolocation accuracy plan

### Current evaluation
- Station latitude/longitude values in `stations.js` are plausible city coordinates.
- Pin-to-globe projection (`latLonToVector3`) is consistent, but inverse cursor readback (`vecToLatLon`) previously mirrored longitude east/west, causing perceived mismatches between pins and real Earth geography.

### Implementation plan
1. **Fix coordinate inverse math**
   - Keep `latLonToVector3` as-is and compute longitude with `atan2(-z, x)` in `vecToLatLon` (implemented).
2. **Add data validation for stations**
   - Add a startup check that each station has `lat ∈ [-90, 90]` and `lon ∈ [-180, 180]`; warn in console for outliers.
3. **Add visual QA mode**
   - Optional debug toggle to render lat/lon grid lines and show selected station raw coordinates in-panel.
4. **Automate regression tests**
   - Add pure JS tests for round-trip conversions: `lat/lon -> vec -> lat/lon` within tolerance.
5. **Curate authoritative coordinates**
   - Move city coordinates to a dedicated JSON source with provenance notes, then lint on CI.

### Acceptance criteria
- Pin sits on expected city region (manual QA for every station).
- Round-trip conversion error <= 0.1° for test fixtures.
- Nearest-station readout no longer shows systematic east/west inversions.
