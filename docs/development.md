# Working on onboarding and the game

Use one Vite app with two HTML entry points. This keeps one toolchain while allowing the two experiences to run independently. Each developer should use their own branch and checkout.

## Ownership

| Area                                                    | Owner                    | Files                                                                  |
| ------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Onboarding, globe, project selection                    | Onboarding developer     | `index.html`, `src/main.ts`, `src/style.css`, `src/assets/`            |
| Planning workspace, placement, consequences, comparison | Game developer           | `game.html`, `src/game/`                                               |
| Scenario selection and handoff types                    | Both, coordinate changes | `src/shared/`                                                          |
| Geographic preparation and runtime data packs           | Game developer           | `data/`, `public/data/`, future `scripts/data/`                        |
| Build configuration and dependencies                    | Both, coordinate changes | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` |

The existing onboarding entry point is intentionally left in place. It can move into `src/onboarding/` when the onboarding developer is ready. Keep game styles and assets independent; do not import onboarding CSS into the game.

## Run independently

```sh
npm install
npm run dev
# Onboarding: http://localhost:5173/
# Game: http://localhost:5173/game.html?scenario=golden-gate-park
# Original scenario: http://localhost:5173/game.html?scenario=san-jose-dc04
```

Alternatively, `npm run dev:game` opens the game directly. Vite may select a different port if 5173 is occupied; use the URL printed in the terminal.

`npm run build` produces both `dist/index.html` and `dist/game.html`. The game must work when opened directly, refreshed, or reached from onboarding.

## Onboarding → game contract

The URL carries a stable scenario ID. The game owns loading the corresponding local pack; onboarding does not pass a map instance, a rendered canvas, or large datasets.

```ts
import { createGameUrl } from './shared/game-launch.ts'
import { SAN_JOSE_SCENARIO_ID } from './shared/scenarios.ts'

// Call after the player selects a scenario and chooses to start.
window.location.assign(
  createGameUrl({ scenarioId: SAN_JOSE_SCENARIO_ID }, window.location.href)
    .href,
)
```

`src/shared/scenarios.ts` is the small selection catalog shared by both entry points. `src/shared/game-launch.ts` defines the handoff. Unknown scenario IDs show an unavailable state. Opening `game.html` without a selection defaults to Golden Gate Park for development. Use `GOLDEN_GATE_SCENARIO_ID` in the same launch helper to select it explicitly; the San José ID and pack remain supported.

When both parts are ready, the visible integration work is one start button calling this helper. The page transition reloads the renderer; each page owns its map lifecycle. A seamless single-canvas transition is a separate future decision.

## Next steps

1. **Repository separation:** independent entry points and shared launch contract (implemented).
2. **Real geographic packs:** San José and full Golden Gate Park packs prepared; see `data/README.md` for reproduction, sharing and source limitations.
3. **Map:** local aerial imagery, terrain, buildings and geographic overlays implemented.
4. **Placement:** move and rotate an illustrative two-block campus inside the playable boundary; building, tree and special flood-area intersections are shown.
5. **Learning loop:** cooling, trees, restoration and community choices; weather tests; 0/5/10-year views; fixed-reference comparison and optional reflection (implemented as an illustrative sandbox). See [game rules and assumptions](game-model.md).

The current game page uses CesiumJS. Drag to pan, scroll to zoom, right-drag to orbit and tilt, and use the 2D/3D toggle or frame-site control to reset the view. Camera presets fly between neighborhood, project and close-up views. Move the concept with its handle or click **Move campus**, preview a location with the pointer, and click to place. Invalid clicks keep placement active; Escape restores the position before the preview. Focus the handle and use arrow keys for precise movement. The consequence sandbox uses local GIS checks and explicit teaching rules; see `src/game/consequences.ts`, `src/game/gameplay.ts` and `src/game/landscape-graphics.ts`. It does not predict the real project’s outcomes.

## Cesium renderer

`src/game/map.ts` owns the Cesium scene, camera, local geometry and streamed tiles. `src/game/terrain.ts` adapts the prepared elevation grid. The native `CesiumWidget` is used with our own UI, avoiding the default Viewer widgets and their script-evaluation requirement. Cesium's engine and core packages are the renderer; the `cesium` package supplies version-matched static workers, decoders and assets.

The `predev`, `predev:game` and `prebuild` hooks copy those static resources into ignored `public/cesium/`. They are served locally and included in production builds. Do not edit copied vendor resources.

### Local and photorealistic views

- **Aerial / Landscape:** use the selected pack's local NAIP imagery, prepared heightmap, building footprints and city GIS layers. Golden Gate Park uses official DataSF buildings; San José uses OSM-derived footprints.
- **Photorealistic 3D:** streams Google 3D Tiles from Cesium ion asset `2275207`. The local globe imagery and OSM buildings are hidden to avoid duplicate surfaces. City inventory overlays and the proposed campus remain independent layers. Cesium's native provider credits remain visible.
- **No token or a failed connection:** the local scene remains available. The online dataset is not downloaded into the offline pack.

Configure `VITE_CESIUM_ION_TOKEN` in ignored `.env.local`, or use the connection dialog, which stores a supplied token in session storage only. Restart Vite after changing its environment configuration. Google Photorealistic 3D Tiles must be available to the account/token. A browser token is visible to the client; use read-only permissions and appropriate URL restrictions.

The source's network policy permits only the local origin and the explicit Cesium/Google provider hosts needed for streaming. It retains script restrictions; WebAssembly decoding is allowed for the tile codecs.

### Placement rendering

`src/game/campus-graphics.ts` keeps campus entities alive and uses nonconstant geometry properties so Cesium updates them synchronously during movement and rotation. Deleting and recreating static entities on every pointer event leaves a gap while their worker geometry is rebuilding.

`src/game/placement.ts` projects pointer rays onto a fixed tangent plane and preserves the initial grab offset. Dragging does not depth-pick the moving campus's own roofs, and release commits the last projected position. Camera inputs are restored on release, cancellation, or loss of pointer capture. Terrain height stays fixed during a drag and is sampled again when it ends.

### Game board and city life

`src/game/gameplay.ts` manages the large picture-card deck and the on-map future reveal. `src/game/choice-art.ts` draws its local SVG game pieces. `src/game/decision-effects.ts` owns the symbolic water/power gauges. `src/game/ambient-life.ts` animates bounded traffic on city road polylines and fictional pedestrians/gatherings around the campus. It stops animation when hidden or reduced motion is requested. `Gameplay.destroy()` clears future-reveal timers; `GameScene.destroy()` disposes the city-life loop.

`src/game/character-chat.ts` manages accessible character conversations and per-speaker tab memory. Cesium picks on the speech label/tail call `Gameplay.openDiscussion()`; a keyboard-accessible button opens the same dialog. `src/game/discussion.ts` provides the typed `DiscussionProvider` boundary and the current deterministic, local mock. Replace that adapter when integrating Gemma; keep credentials on a server and retain current-plan context on every turn. No inference dependency is installed for the mock. Reset aborts pending replies and clears conversations; final destruction also removes the dialog.

`src/game/dialogue-choices.ts` owns the authored three-choice branches and their typed map targets. Chosen lines pass an explicit topic to the mock; optional typed questions use topic matching. `Gameplay.exploreIdea()` opens the relevant controls without applying choices. Short responses and branch invariants are checked in `dialogue-choices.test.ts`. The main dialogue shows the latest line; transcript history and typing are collapsed by default.

Checkpoint `687efda` was pushed before this game-board redesign and includes the prior dashboard-style game plus the team's documentation updates.

### Rollback checkpoint

Commit `537167b` contains the complete MapLibre game before this renderer change. It also records the geographic pack manifest and preparation scripts. The ignored local data remains compatible with that version; the Cesium heightmap is an additional asset.
