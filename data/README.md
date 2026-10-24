# Geographic data workspace

All external downloads happen during data preparation. The running demo uses local files only, including map styles, imagery, elevation, fonts, icons, and models.

## Layout

- `data/raw/`: original downloads; ignored by Git.
- `data/processed/`: temporary processing outputs; ignored by Git.
- `public/data/`: prepared runtime packs; large generated files are ignored by Git.

The first San José pack is prepared locally: about 31 MiB across 905 runtime assets. It includes a 4096 × 4096 aerial mosaic and 819 derived raster tiles, a local elevation pyramid, building geometry, city GIS layers and map glyphs. `data/manifests/san-jose-dc04.json` records sources, acquisition dates, checksums and limitations. A placeholder must never be presented as a measured real-world feature.

## Prepare, verify and share

```sh
npm install
npm run data:prepare  # Internet required only during preparation
npm run data:verify   # Checks hashes, file sizes, imagery and WGS84 geometry
npm run dev:game      # Runtime assets all come from localhost
```

Preparation requires Node 24+. Processing uses Sharp and public service exports; no Python, GIS desktop software, mapping account or API key is required. Completed raw downloads are cached, so an interrupted preparation can resume. The raw cache deliberately pins the selected snapshots; use a new pack version when updating the data rather than silently refreshing the baseline.

To give a teammate the identical prepared pack:

```sh
npm run data:bundle
# Copy data/san-jose-dc04.tar.gz to the other checkout, then:
mkdir -p public/data
tar -xzf data/san-jose-dc04.tar.gz -C public/data
npm run data:verify
```

`npm run build` copies the prepared pack into `dist/data/`. The resulting build can be served entirely offline over localhost. Browsers still load files on demand from the local server; the data does not all need to be held in memory. The game page enforces `connect-src 'self'` and the renderer rejects external map requests.

## First pack: `san-jose-dc04`

The rendering bounds are `[-121.949, 37.367, -121.917, 37.393]`. Placement is limited to `[-121.943, 37.372, -121.923, 37.387]`, leaving context around the playable area. Keep detailed data limited to that area; lower-resolution global context for onboarding is a separate pack.

Prepared inputs:

| Input                                         | Source                                                             | Runtime representation        |
| --------------------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| Aerial imagery                                | USDA NAIP, acquisition terms and dates verified                    | Local raster tiles or archive |
| Terrain                                       | Mapzen Terrain Tiles, source attribution retained                  | Local raster DEM tiles        |
| Buildings and roads                           | OpenStreetMap extract                                              | Vector tiles or GeoJSON       |
| Parcels, zoning, vegetation, parks and trails | City of San José GIS                                               | GeoJSON or vector tiles       |
| Project facts                                 | California Energy Commission project documents                     | Reviewed JSON                 |
| Consequence parameters                        | Documented scientific references and explicit scenario assumptions | Reviewed JSON                 |

City GIS: <https://geo.sanjoseca.gov/server/rest/services/OPN/OPN_OpenDataService/MapServer>

Project: <https://www.energy.ca.gov/powerplant/backup-generating-system/san-jose-data-center-04>

Each pack needs a manifest recording its ID, version, bounds, source URLs, acquisition and retrieval dates, licenses, attribution, resolution, checksums, and known gaps. Geographic observations, official project facts, and illustrative model assumptions must remain distinguishable.

## Known limits of this first pack

- NAIP imagery was acquired on May 19, 2022 at 0.6 m resolution; the full-area mosaic is resampled to 4096 pixels. It does not show current construction conditions.
- Building footprints are OSM-derived tile features. Features may be incomplete or split at tile boundaries. Rendered heights may be approximations, including upstream fallback heights.
- The 1,732 city street-tree records do not cover all trees on private land. Rendered point sizes are illustrative, not measured canopy extents.
- City land-cover data includes historical observations. `LASTUPDATE` is retained; imagery, geometry and project records have different dates.
- The city project polygon matches `CP23-008` and the two-building proposal, but its label mentions Trimble Road. Current parcel IDs differ from historical APNs in the CEC summary. The game displays the city's project outline without substituting guessed historical parcels.
- The flood toggle shows records marked `SFHATF = T` (special flood-hazard areas). It is not a flood-depth simulation. Lower-hazard zone records remain in the source pack but are not conflated with those areas.
- This map proposal checks building and street-tree intersections. It does not estimate energy, water use, restoration benefits, jobs, economic value, public health effects or planning approval.

Large packs stay outside Git history. Document the download/preparation command and a checksum before distributing the demo pack. Small manifests, preparation scripts, and reviewed model parameters belong in Git.

Before declaring the pack ready, verify complete tile coverage for the supported views, normalize units and coordinate systems, and run the demo with external network requests blocked. The browser may load assets from localhost; it must not need external providers.
