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
# Game: http://localhost:5173/game.html?scenario=san-jose-dc04
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

`src/shared/scenarios.ts` is the small selection catalog shared by both entry points. `src/shared/game-launch.ts` defines the handoff. Unknown scenario IDs show an unavailable state. Opening `game.html` without a selection defaults to the San José scenario for development.

When both parts are ready, the visible integration work is one start button calling this helper. The page transition reloads the renderer; each page owns its map lifecycle. A seamless single-canvas transition is a separate future decision.

## Next steps

1. **Repository separation:** independent entry points and shared launch contract (implemented).
2. **Real geographic pack:** bounded San José pack prepared; see `data/README.md` for reproduction and sharing.
3. **Map:** local aerial imagery, terrain, buildings and geographic overlays implemented.
4. **Placement:** move and rotate an illustrative two-block campus inside the playable boundary; building, tree and special flood-area intersections are shown.
5. **Learning loop:** compare development and restoration choices with documented environmental, social, and economic consequences.

The current game page is a working map proposal. Drag to pan, scroll to zoom, right-drag to orbit and tilt, and use the 2D/3D toggle or frame-site control to reset the view. Move the concept with its handle or click **Move campus** and select a location. Focus the handle and use arrow keys for precise movement. Consequence and restoration models are not implemented yet.
