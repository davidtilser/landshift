# Geographic data workspace

Local aerial and landscape views use prepared files only. The optional Cesium photorealistic view streams Google 3D Tiles through a configured Cesium ion account; that provider data is not included in this offline pack.

## Layout

- `data/raw/`: original downloads; ignored by Git.
- `data/processed/`: temporary processing outputs; ignored by Git.
- `public/data/`: prepared runtime packs; large generated files are ignored by Git.

The first San José pack is prepared locally: about 31 MiB across 906 runtime assets, including the Cesium elevation adapter. It includes a 4096 × 4096 aerial mosaic and 819 derived raster tiles, a local elevation pyramid, building geometry, city GIS layers and map glyphs. `data/manifests/san-jose-dc04.json` records sources, acquisition dates, checksums and limitations. A placeholder must never be presented as a measured real-world feature.

The default game now uses the **Golden Gate Park** pack: **37.1 MiB across 1,064 assets**. The complete official park geometry, including the Panhandle, fits within its rendering bounds. San José remains available with `game.html?scenario=san-jose-dc04`.

## Prepare, verify and share

```sh
npm install
npm run data:prepare  # Internet required only during preparation
npm run data:verify   # Checks hashes, file sizes, imagery and WGS84 geometry
# For an existing pack from the MapLibre version, run once:
npm run data:cesium   # Derives Cesium terrain locally; no downloads
npm run dev:game      # Runtime assets all come from localhost
```

For Golden Gate Park:

```sh
npm run data:prepare:golden-gate
npm run data:verify:golden-gate
npm run data:bundle:golden-gate
# A teammate can extract data/golden-gate-park.tar.gz into public/data/.
# Open /game.html?scenario=golden-gate-park (also the direct-game default).
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

`npm run build` copies the prepared pack into `dist/data/`. Its local aerial and landscape views can be served entirely offline over localhost. Photorealistic 3D requires an internet connection and a configured account token. Browsers still load files on demand from the local server; the data does not all need to be held in memory. The local views do not require external map requests. The page permits the specific Cesium/Google hosts needed for the optional streamed view.

For deployment, `npm run build:vercel` prepares missing packs for both geographic scenarios, generates Cesium heightmaps, verifies every pack, and then builds the frontend. Verified packs are cached under `node_modules/.cache/landshift-data/`. The first uncached build downloads public source data; the large runtime packs remain outside Git. See [Vercel deployment](../docs/vercel.md).

## Golden Gate Park: `golden-gate-park`

Rendering bounds: `[-122.516, 37.764, -122.438, 37.776]`. The inset placement bounds are `[-122.514, 37.7648, -122.439, 37.7753]`. The initial campus is centered on the **Heroes’ Grove WWI memorial boulder** at `[-122.46889, 37.77293]`, transcribed from page 1 of [NPS HALS CA-49-B](https://tile.loc.gov/storage-services/master/pnp/habshaer/ca/ca4300/ca4343/data/ca4343data.pdf). This is a hypothetical exercise, not an actual development application or a statement about any real community's position.

| Layer                                      | Source                                                                       | Prepared data                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Aerial imagery                             | USDA NAIP via Microsoft Planetary Computer                                   | May 18–19, 2022 acquisitions, 4096 × 1024 mosaic and 983 local tiles      |
| Terrain                                    | Mapzen Terrarium                                                             | 63 elevation tiles plus Cesium height grid                                |
| Buildings                                  | [DataSF building footprints](https://data.sf.gov/resource/ynuv-fyni.geojson) | 9,826 footprints; historical source heights retained                      |
| Streets                                    | [DataSF street centerlines](https://data.sf.gov/resource/3psu-pn9h.geojson)  | 845 active segments                                                       |
| Street trees                               | [SF Public Works inventory](https://data.sf.gov/resource/tkzw-k3nq.json)     | 7,545 points across the pack and surroundings                             |
| Park properties                            | [SF Recreation and Parks](https://data.sf.gov/resource/bz92-g22m.geojson)    | 9 properties, including complete Golden Gate Park geometry                |
| Water, paths, land cover, land use, places | OpenStreetMap through OpenFreeMap                                            | Pinned October 18, 2026 vector-tile snapshot                              |
| Flood zones                                | FEMA NFHL                                                                    | 5 records; only special flood-hazard polygons trigger that warning        |
| Memorial                                   | NPS / Library of Congress                                                    | One documented point, **not** a surveyed footprint or protection boundary |

Important gaps:

- The 60 cm source photography is resampled to a whole-area mosaic of approximately 1.7 m east–west resolution. It does not show current conditions.
- Street-tree records are **not a census of trees inside the park**. Few records in a forested spot do not mean few trees. Photorealistic trees come from the streamed mesh; local point symbols are illustrative.
- Building observations, imagery, street records and terrain have different dates. Footprint heights are historical approximations. Photorealistic meshes include existing trees and structures; the concept does not physically remove them.
- There is no parcel or zoning dataset in this pack; those controls are hidden. Park ownership polygons and the memorial point do not establish permitting rules, setbacks or a complete heritage boundary.
- The rectangular project footprint is authored for the exercise. Only the surrounding geography and documented memorial point are observations. Community dialogue and protest characters are fictional.
- Animated vehicles use a conservative selection of surrounding streets and crossings, excluding pedestrian park promenades. They do not represent live traffic or a verified access model.

Preparation caches original downloads and records source URLs, dates, attribution, limitations and SHA-256 hashes in `data/manifests/golden-gate-park.json`. Verification also checks that the full official park is covered and the NPS memorial point is present. Google photorealistic 3D remains an optional online layer; it is not bundled.

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
