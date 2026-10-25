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

## Challenge brief data options

The challenge brief suggests the following resources. These particular integrations are not implemented; the current prototype uses the public geographic sources documented in [data preparation](data/README.md) and the [Polo Fields research baseline](docs/polo-demo.md).

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

The app uses Vite + TypeScript, a globe-based onboarding screen, and CesiumJS 3D maps. Onboarding’s playable **Datacenter build** scenario opens the **Polo Fields guided demo** in Golden Gate Park. The separate Heroes’ Grove placement sandbox and original San José scenario remain available through direct links.

The Polo demo follows a proposed campus from the existing public field through construction and operation. Players hear fictional community concerns, explore water, electricity, land and people, then compare a combined redesign using what they learned. Geographic observations, authored research assumptions, visual concepts and AI dialogue have different evidence limits. See [the Polo demo](docs/polo-demo.md) and [sandbox rules, sources and limitations](docs/game-model.md).

Onboarding and the game have independent entry points in the same app. See [development and ownership](docs/development.md) for the repository structure and [geographic data preparation](data/README.md) for asset sources, verification and sharing.

### Getting started

Requires **Node.js 24.x** (see `.nvmrc`) and npm. A fresh checkout needs the ignored geographic pack prepared or extracted before opening a game:

```sh
npm ci
npm run data:prepare:golden-gate
npm run dev
```

Data preparation downloads public geographic sources and generates the local terrain adapter. Existing prepared packs can be extracted instead; see [data preparation and sharing](data/README.md). Ordinary local dependency installation does not download geographic packs. The committed Polo research baseline requires no Python or live research downloads to run the app.

| Experience                        | Local path                             |
| --------------------------------- | -------------------------------------- |
| Onboarding and scenario selection | `/`                                    |
| Polo Fields guided demo           | `/game.html?scenario=golden-gate-polo` |
| Heroes’ Grove placement sandbox   | `/game.html?scenario=golden-gate-park` |
| Original San José sandbox         | `/game.html?scenario=san-jose-dc04`    |

`npm run dev:game` opens the direct-game default, Heroes’ Grove. For San José, first run `npm run data:prepare`. Both Golden Gate Park experiences use the same geographic pack.

The maps have local aerial imagery and terrain, with optional Google Photorealistic 3D Tiles streamed through Cesium ion. To enable photorealistic 3D, create `.env.local` from `.env.example` if it does not already exist, add a browser-safe, read-only `VITE_CESIUM_ION_TOKEN`, and restart the dev server. Enable Google Photorealistic 3D Tiles in the ion account. The sandbox also accepts a token through its connection dialog for the current tab. Never commit `.env.local`. For an older Golden Gate pack without the terrain adapter, run `npm run data:cesium -- golden-gate-park`; for San José, use `npm run data:cesium`.

### Polo Fields walkthrough

Choose a campus size, explore the location, drag the translucent campus onto the field, and rotate it using the arrow keys or rotation buttons. **Confirm location** locks its position and orientation and introduces a fictional community protest. Hear or skip the conversation, then explore **Today → Foundations → Structure → Commissioning → Operating**. Confirmation itself does not start construction; Reset is required to choose a new placement.

Every chapter has a step reader for General, Water, Electricity, and Land & people. The **Talk** card previews character reactions and opens a chooser for private conversations. Community opens the shared public discussion. Walking people and construction animations illustrate the selected stage.

At the end of Operating, **Use what you learned** lets players combine soil protection and planting, recycled water, waste-heat reuse and a green roof. Players can also add custom ideas, then use **Compare my plans** to switch between the original and improved plan at the same location. Custom ideas are listed as proposals that have not been mapped. Revised plans describe design differences and trade-offs; they do not calculate combined savings or restore the lost playing field.

The committed baseline comes from reproducible water and energy research scripts, with a default 4 ha (about 10 acres) site and 10 MW average IT demand. Selected campus sizes scale supported reference quantities using explicit teaching assumptions, not a new site assessment. Python 3 is needed only to regenerate or verify that research adapter with `npm run data:prepare:polo` or `npm run data:verify:polo`. See [the implementation and research limitations](docs/polo-demo.md).

### Deploying on Vercel

The complete app is configured for one Vercel project: static pages and assets plus Node.js Functions for community chat. Import the repository root, use Node.js 24.x, and set `OPENROUTER_API_KEY` for live dialogue. Add `VITE_CESIUM_ION_TOKEN` if the deployment should offer photorealistic 3D; `OPENROUTER_MODEL` is optional.

The configured build command is `npm run build:vercel`, with `dist` as the output directory. Vercel installation and build steps prepare, verify and cache missing geographic packs for both map areas. The first uncached build needs internet access to public data services. The API key stays server-side. Request limits renew per warm function instance; public deployments can configure deployment-wide limits in Vercel Firewall. See [Vercel deployment](docs/vercel.md) for full setup and verification.

For a local production preview, run `npm run build:vercel`, then `npm run preview`. Stop the preview server when finished.

### Community conversations

Add `OPENROUTER_API_KEY=...` to ignored `.env.local` for local live chat, or to the Vercel project's environment variables for deployment. Never use a `VITE_` prefix for this key. The default model is `google/gemini-2.5-flash-lite`; optional `OPENROUTER_MODEL` can select another supported Gemini model. See [OpenRouter's model catalog](https://openrouter.ai/api/v1/models) for current availability and prices.

In Polo Fields, use **Talk** to choose a character for a private chat; the sandboxes also offer map speech bubbles. Private chats start with prepared choices and support free typing. **Community** opens one shared public thread and starts the discussion automatically. Type in the input to join; typing pauses the automatic exchange. Reply targets a particular post. Plan changes appear as updates in the same conversation. Each character has a motivation, goal and limits. The aim is to understand different perspectives; agreement is not a score.

Community mood shows the percentage of a simulated crowd feeling Worried, Angry, Okay or Hopeful, with a colored bar and one short reason. The four shares always total 100% and update as each public character reply appears. These are game simulation values, not real polling; private conversations do not change them.

The official `@openrouter/sdk` runs only in the Node backend. Both `npm run dev` and `npm run preview` include the same-origin chat API used by Vercel Functions. Authored demo replies remain available without an OpenRouter key. Conversation source tooltips distinguish generated replies from prepared content; a conversation does not itself change the map or establish agreement.

Public and private histories are separate in tab memory; resetting clears them. Live conversation content and a compact plan summary are sent through OpenRouter to the model provider. “Private” describes visibility inside the game. The app has no persistent chat storage.

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`, and `npm run textures` (regenerates `public/textures/` from NASA originals cached in `.cache/textures/`).

### TypeScript and lint checks

Run `npm run check` before pushing. The same command runs on every push and pull request in `.github/workflows/lint.yml`, using Node from `.nvmrc`, cached npm downloads, and a clean install from the lockfile. It checks ESLint, TypeScript, and Prettier; lint warnings fail the check. Use `npm run lint:fix` and `npm run format` for automatic fixes.

- Keep TypeScript strict mode enabled. Indexed access can return `undefined`, optional properties must distinguish absence from explicit `undefined`, and every returning code path must be handled. Frontend code, server code, API entry points, tests, and `vite.config.ts` are type-checked.
- Type-aware ESLint rejects explicit `any`, unsafe assignments and casts, non-null assertions, floating or misused promises, and non-exhaustive union switches. Use `unknown` for external input and validate it before use.
- Declare function return types and public parameter types, use `import type` for type-only imports, and narrow nullable values with runtime guards. Let TypeScript infer local variables and inline callbacks where their types are already known.
- Prefer discriminated unions and exhaustive handling for states. Fix type errors at their source instead of bypassing them with assertions or disabling rules.
- `scripts/` is type-checked through `scripts/tsconfig.json` with Node types. Keep it to erasable syntax only, because Node runs these files by stripping types.

### Stack

| Concern          | Choice                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| Build tool       | Vite                                                                           |
| Onboarding globe | globe.gl and Three.js                                                          |
| Game maps        | CesiumJS                                                                       |
| UI               | Vanilla TypeScript                                                             |
| Package manager  | npm                                                                            |
| Runtime          | Node.js 24.x                                                                   |
| Lint and format  | ESLint and Prettier                                                            |
| Tests            | Vitest                                                                         |
| Backend          | Node.js chat handlers; Vite middleware locally, Vercel Functions in deployment |
| Hosting          | Vercel configuration included; local development and preview supported         |

### Prototype scope

The implemented walkthrough includes a selected site, construction stages, documented resource baselines, fictional community dialogue and a same-location redesign comparison. Improved-plan benefits remain qualitative. Actual engineering feasibility, utility capacity, permitting, combined environmental results and learning or behavior outcomes are not established by the prototype.

The earlier MapLibre implementation is preserved in checkpoint commit `537167b` before the Cesium migration.

## Brief

Read the full [challenge brief from the Notion hackpack](docs/challenge-brief.md).

The challenge and design-principle sections summarize the team-provided **Engaging Youth in Sustainable Land-Use Decisions** brief. The project-status and setup sections describe the current implementation; the wider challenge goals remain aspirations beyond the prototype.
