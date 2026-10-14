# Big Tree Scout

A phone web app for logging big juniper, pinyon and oak in the San Juan Basin country (Ignacio, Navajo Dam, Dulce) and scoring nearby ground by how much it looks like where those trees grow.

## Put it on a phone

1. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**. Pick this branch and the `/ (root)` folder, then Save.
2. After a minute or two the app is at `https://nicetrysid.github.io/Ghostpoop/treefinder/`.
3. Open that on the phone with signal. Then use **Share → Add to Home Screen** (iPhone, Safari) or **⋮ → Install app / Add to Home screen** (Android, Chrome).
4. Open it once more from the home screen while you still have signal so offline mode switches on. Then pan to where you're headed and use **Trees → Save this area for no-signal use**.

## What it does

- **Add**: logs a tree at your GPS position or at the map crosshair. Species is Juniper, Pinyon or Oak, plus a free-text type ("Utah juniper", "Big shaggy one-seed", anything). Every type you write in becomes a one-tap choice next time, and you can run the finder on one type alone. Trunk circumference, height and crown spread give a big-tree score using the American Forests formula (inches around + feet tall + ¼ crown feet).
- **Checked, none**: logs places you looked that had nothing big. The finder then ranks look-alike ground lower.
- **Tap the map** anywhere to see who manages the land, plus elevation, soil and rock type.
- **Layers**: USGS topo or satellite, BLM land ownership, shaded relief, geology.
- **Find**: reads the terrain at each of your trees, then scores a ~7-mile square around the crosshair. It shows a heat map and up to 12 ranked spots, each with distance, direction, land status and a Directions link.
- **Trees**: list, edit, delete, back up, send to someone, GPX for other GPS apps, CSV, import, and a data check that tests every source from the phone.

## What "Find" matches on

All of this is computed on the phone from 3DEP-derived elevation tiles at about 50 ft per pixel:

| Toggle | Measures |
|---|---|
| Elevation | height above sea level |
| Steepness | slope |
| Facing direction | north/south and east/west exposure |
| Ravine / draw | elevation compared with the surrounding ~500 ft and ~2,000 ft, so a draw or canyon bottom reads negative and a rise or rim reads positive |
| Watershed size | how much ground drains through the spot, plus a wetness index (catchment size against slope) |
| Distance from road | from OpenStreetMap roads, two-tracks included |

Each spot gets a score from how close it comes, on every factor that's on, to the most similar tree you've logged. Every factor is measured relative to how much it varies across the area being scored. Soil, rock and land ownership are looked up for each tree and spot but are **not** used in the heat map yet.

## Data sources

| What | Source |
|---|---|
| Base maps | USGS The National Map (topo, imagery, shaded relief) |
| Land ownership | BLM Surface Management Agency map service |
| Elevation | Terrarium elevation tiles on AWS Open Data (USGS 3DEP in the US) |
| Roads | OpenStreetMap through the Overpass API |
| Soil | NRCS Soil Data Access (SSURGO) |
| Geology | Macrostrat (which compiles state geologic maps) |

These were wired up without live testing because the build machine couldn't reach them. If something shows "unavailable", run **Trees → Run data check** on the phone, which shows which source failed.

## Privacy

Your trees are stored only on the phone that logged them. Back them up with **Save backup**. To share with someone, use **Send to someone** and they open the file with **Import**. The app code is public on GitHub, but your tree locations are not. Each lookup does send that one coordinate to the data service it asks (BLM, NRCS and so on).

## Files

`index.html` (layout), `app.js` (app), `analysis.js` (terrain math, also used by the worker), `worker.js` (background terrain processing), `sw.js` (offline cache), `manifest.webmanifest` and `icon.svg` (home-screen install).
