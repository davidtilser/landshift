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

`src/game/community-hub.ts` manages one shared public timeline beside the map. The Community button opens that timeline, never a separate thread per person or plan change. `src/game/character-chat.ts` restores the original private modal and dialogue cards; Cesium speech-label/tail picks and the accessible map chat button open it. Public avatars and Message privately also open the same private popup. Free typing and live Gemini work in both views. `community-profiles.ts` defines each fictional character's motivation, goal, boundaries and flexibility.

`community-session.ts` owns one `publicThread` and independent private histories. The public thread begins with a proposal and four replies. Plan changes append short updates and relevant authored reactions; consecutive tiny placement nudges coalesce. Existing posts and reply relationships survive map changes. Public replies store parent IDs and display a linked reference to that post, with the original text on hover; generated exchanges form a connected reply chain. The timeline keeps the proposal and the latest 159 entries; private histories keep up to 40 entries, while model context is limited to 18 conversational messages. Private text is never copied into public history. Reset clears both views.

Submitting a custom private reply sets that person's `freeText` mode. The popup then shows the whole retained transcript and composer, removes prepared cards and their keyboard shortcuts, and keeps this mode when reopened or after plan changes. Other characters still start with choices; Reset clears the mode.

`community-autoplay.ts` starts the public exchange when Community opens and paces further rounds ten seconds apart. Each opening runs up to four rounds, then leaves space for the player's perspective. A successful player reply or a changed plan starts another paced exchange. Typing, selecting a reply target, opening a private popup, hiding the page, or closing Community pauses/stops automatic requests. The composer can interrupt an automatic request directly; no Observe or Join controls are needed. Failed calls do not retry automatically. Generation IDs prevent a canceled round from scheduling a stale continuation. Authored offline demo mode runs one exchange.

`community-mood.ts` supplies authored starting crowd percentages from the scenario's character concerns. Each public message includes `communityMood`: integer `angry`, `concerned`, `neutral`, `hopeful` shares and a short `reason`. Zod rejects negative, fractional, out-of-range values or totals other than 100. The previous simulated distribution is sent with public requests for continuity. `community-replies.ts` reveals returned messages 1.6 seconds apart and applies each message’s mood snapshot as it appears. Closing or typing cancels remaining unseen replies, retaining delivered posts and their mood. Private replies and failed requests leave it unchanged. Map changes reseed it from the new scenario reactions; reopening retains it. The UI labels the distribution Game simulation, never real polling or an approval score. Offline demo replies retain the authored distribution.

`src/game/dialogue-choices.ts` owns the private popup's authored three-choice branches and typed map targets. `Gameplay.exploreIdea()` opens controls without applying choices. `community-client.ts` sends only the active conversation history, optional public reply target and current plan to the same-origin API; its fallback uses `discussion.ts` and is labeled Demo. No HTML from a model is rendered. Opening the private popup pauses the public exchange; the next Community visit resumes the same timeline. Plan changes, pause, close and reset abort pending requests before appending updates. Stale replies cannot enter a different conversation; drafts survive cancellation.

### OpenRouter server

`server/community-api.ts` is mounted by a Vite plugin in development and preview. `server/community-engine.ts` uses the official OpenRouter TypeScript SDK; it never enters the browser build. Credentials come from server-only `OPENROUTER_API_KEY` in ignored `.env.local` or the process environment. `GET /api/community/status` returns only configuration presence and model name.

POST requests use the validated contract in `src/shared/community-contract.ts`. The server reloads GIS collections from the selected local pack, computes footprint intersections and game estimates, and supplies those facts plus the fictional profiles to the model. Browser-provided facts are not trusted. The model returns validated structured messages, never actions or agreement scores. Private replies have one allowed speaker; a public round has exactly three distinct speakers, including the designer and rotating perspectives. Each later speaker is prompted to respond to the preceding point.

Default model: `google/gemini-2.5-flash-lite` ($0.10/M input and $0.40/M output in the catalog checked October 24, 2026). Generation has a 650-token output cap, no reasoning effort and no automatic retries. Each public round is one request returning three messages; autoplay is bounded as described above. The local demo server allows two simultaneous requests, 30 requests/minute and 500 requests per server run; restart to reset the demo cap. Bodies, messages and histories are bounded. Cross-origin browser requests are rejected. Provider errors preserve the player's draft instead of presenting a fabricated live answer.

Live chat sends active-thread text and a compact plan context to OpenRouter and its model provider. “Private” means private from other characters/public threads in this game. The app has no persistent conversation storage. Preview needs the repository's prepared `public/data/` files and Node; a static-only host has no chat API. The optional local map and authored demo replies can still work without the provider.

Checkpoint `687efda` was pushed before this game-board redesign and includes the prior dashboard-style game plus the team's documentation updates.

### Rollback checkpoint

Commit `537167b` contains the complete MapLibre game before this renderer change. It also records the geographic pack manifest and preparation scripts. The ignored local data remains compatible with that version; the Cesium heightmap is an additional asset.
