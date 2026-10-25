# Landshift

A hackathon project helping young people explore how land-use choices shape their communities and environment.

Built for the **Engaging Youth in Sustainable Land-Use Decisions** track, based on the supplied UNCCD challenge brief.

**Hackathon:** [Event on Luma](https://luma.com/59t8euck?tk=lriYwm)

## The challenge

Young people aged **15–24** need accessible, engaging ways to understand and participate in land-use and urban planning decisions. Environmental awareness does not always translate into understanding how everyday choices and local planning affect soil, water, ecosystems, and community well-being over time.

Landshift aims to close that gap through a game or interactive educational experience that connects meaningful choices to understandable consequences.

## Prototype goal

Demonstrate one clear learning loop:

1. Explore a small landscape and its community's needs.
2. Make a meaningful land-use choice within resource constraints.
3. See its environmental, social, and economic consequences over simulated time.
4. Compare alternatives and understand the tradeoffs.
5. Connect the lesson to practical behavior or participation in local planning.

The hackathon target is a focused, working interactive prototype: a youth city planner explores a real map, tries a plan, and learns through different community perspectives.

## Design principles

- **Make learning engaging:** approachable interaction and clear feedback for people without GIS or planning expertise.
- **Explain consequences:** use evidence-informed rules, document assumptions, and cite sources. Clearly distinguish illustrative outcomes from real-world predictions.
- **Show tradeoffs:** connect soil, water, vegetation, livelihoods, and community well-being rather than optimizing a single score.
- **Support participation:** help players discuss and propose sustainable choices in their own communities.
- **Assess learning:** consider changes in understanding, intended behavior, and willingness to participate. Gameplay activity alone is not evidence of behavior change; implementing monitoring is outside the prototype scope.
- **Keep it feasible:** scope an initial usable version to less than three months of further development, with manageable maintenance needs.
- **Serve the public:** the project must not be profit-driven.

## Data and modeling options

The challenge brief suggests the following resources; integrations have not been selected or implemented.

| Resource                            | Potential use                                       |
| ----------------------------------- | --------------------------------------------------- |
| ESA WorldCover                      | Land-cover baseline for a small starting landscape  |
| Trends.Earth                        | Historical land degradation and restoration context |
| Stanford NatCap Data Hub and InVEST | Ecosystem-service inputs or scenario modeling       |
| FAO Earth Map                       | Climate, vegetation, and water context              |

Observed data can describe the starting landscape or historical conditions. Showing the consequences of a player's actions requires a separate, documented rule or model. Dataset suitability, licensing, attribution, and model assumptions must be checked before integration.

The brief also lists eEARTH, the Climate–Conflict–Vulnerability Index, and UNEP–FAO Strata as optional context for a resource-sharing or Peace Forest Initiative scenario. These are outside the core prototype unless deliberately selected; they should not be treated as conflict-prediction tools.

Linking educational credits to real planning or restoration funding is an optional extension, not a requirement for the core experience.

## Project status

The app uses Vite + TypeScript and an interactive Cesium 3D map. The default scenario is a hypothetical data-center placement at Heroes’ Grove in Golden Gate Park; the original San José scenario remains available. Choose cooling, trees, restoration and community commitments, then explore the consequences. Bubble-based private chats and one shared community thread connect the map to four fictional perspectives. [Rules, sources and limitations](docs/game-model.md) distinguish real map observations from authored game estimates and AI dialogue.

Onboarding and the game have independent entry points in the same app. See [development and ownership](docs/development.md) for the repository split and onboarding-to-game handoff, and [geographic data preparation](data/README.md) for the local data pack plan.

### Getting started

Requires Node 24 or newer (see `.nvmrc`).

```sh
npm install
npm run dev
```

Open `/` for onboarding or `/game.html?scenario=golden-gate-park` for the game. `npm run dev:game` opens the game directly. Prepare or extract the local geographic pack first: see [data preparation and sharing](data/README.md). CesiumJS renders the game with a movable concept campus, local aerial/terrain fallback, and optional Google Photorealistic 3D Tiles streamed through Cesium ion. Use `?scenario=san-jose-dc04` for the original scenario.

The separate **Polo Fields guided demo** opens at `/game.html?scenario=golden-gate-polo`, with a link from Heroes’ Grove. First drag the campus onto the field, use Left/Right arrows to rotate, and confirm it. You can keep moving and rotating it during the story. Follow Today → site preparation → construction → opening → operation at that location, then compare **Heat for neighbours**, **Recycled water**, and **Green roof**. Walking people and their opinion bubbles stay active. All three proposals are interactive visual concepts, with no calculated proposal savings. The original-view baseline comes from Marian’s reproducible water/energy scripts; it uses its own 4 ha / 10 MW average IT case. Heroes’ Grove keeps its existing sandbox. See [the Polo demo implementation](docs/polo-demo.md).

For the photorealistic view, copy `.env.example` to `.env.local`, add a browser-safe, read-only `VITE_CESIUM_ION_TOKEN`, and restart the dev server. Enable Google Photorealistic 3D Tiles in your ion account. A token can also be entered in the game's connection dialog for the current tab session. Tokens are not committed. Existing local packs need `npm run data:cesium` once to prepare the local terrain adapter.

The MapLibre version is preserved in checkpoint commit `537167b` before the Cesium migration.

### Community conversations

Add `OPENROUTER_API_KEY=...` to the existing ignored `.env.local` (never use a `VITE_` prefix for this key). The default model is `google/gemini-2.5-flash-lite`, the cheapest live Gemini text-chat model in the checked OpenRouter catalog on October 24, 2026, at $0.10/M input and $0.40/M output tokens. An optional `OPENROUTER_MODEL` can select another Gemini model. See [OpenRouter's model catalog](https://openrouter.ai/api/v1/models) for current prices.

Click a **map speech bubble** for a private chat. It starts with large dialogue choices; after your first typed reply, that person's conversation becomes a normal chat transcript with no prepared answers. **Community** opens one shared public thread and starts the discussion automatically. Type in the input to join; typing pauses the automatic exchange. Reply targets a particular post. Map changes appear as updates in the same conversation. Each character has a motivation, goal and limits. The aim is to understand different perspectives; agreement is not a score.

Community mood shows the percentage of a simulated crowd feeling Worried, Angry, Okay or Hopeful, with a colored bar and one short reason. The four shares always total 100% and update as each public character reply appears. These are game simulation values, not real polling; private conversations do not change them.

The official `@openrouter/sdk` runs only in the Node server. Both `npm run dev` and `npm run preview` include `/api/community`; for preview, run `npm run build` first. A generic static host alone cannot provide live chat. Keep `public/data/` beside the app because the server recomputes geographic checks from the prepared pack. No deployment is configured.

Town-square reactions are authored from map choices and labeled **Scenario**. Live replies are labeled **AI character**. Without a key/server, clearly labeled demo replies remain available. Public and private histories are separate in tab memory; Reset design clears them. Live conversation content and a compact plan summary are sent through OpenRouter to the model provider. “Private” describes visibility inside the game, not offline processing.

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`.

### TypeScript and lint checks

Run `npm run check` before pushing. The same command runs on every push and pull request in `.github/workflows/lint.yml`, using Node from `.nvmrc`, cached npm downloads, and a clean install from the lockfile. It checks ESLint, TypeScript, and Prettier; lint warnings fail the check. Use `npm run lint:fix` and `npm run format` for automatic fixes.

- Keep TypeScript strict mode enabled. Indexed access can return `undefined`, optional properties must distinguish absence from explicit `undefined`, and every returning code path must be handled. Source files, tests, and `vite.config.ts` are type-checked.
- Type-aware ESLint rejects explicit `any`, unsafe assignments and casts, non-null assertions, floating or misused promises, and non-exhaustive union switches. Use `unknown` for external input and validate it before use.
- Declare function return types and public parameter types, use `import type` for type-only imports, and narrow nullable values with runtime guards. Let TypeScript infer local variables and inline callbacks where their types are already known.
- Prefer discriminated unions and exhaustive handling for states. Fix type errors at their source instead of bypassing them with assertions or disabling rules.

### Stack

| Concern         | Choice                                           |
| --------------- | ------------------------------------------------ |
| Build tool      | Vite                                             |
| 3D renderer     | CesiumJS (`@cesium/engine` and `@cesium/core`)   |
| UI              | Vanilla TypeScript; frameworks added when needed |
| Package manager | npm                                              |
| Runtime         | Node 24 LTS                                      |
| Lint and format | ESLint and Prettier                              |
| Tests           | Vitest                                           |
| Server          | Not decided; depends on the game loop            |
| Hosting         | Not decided; kept host-agnostic                  |

### First milestones

- Select one scenario and a clear learning objective.
- Define the player's choices, constraints, and consequence rules.
- Build the interactive choice → consequence → comparison loop.
- Document sources and assumptions, and prepare a short demo.

## Brief

Read the full [challenge brief from the Notion hackpack](docs/challenge-brief.md).

This README summarizes the team-provided track brief, **Engaging Youth in Sustainable Land-Use Decisions**. It describes the intended direction and constraints, not completed functionality.
