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

The hackathon target is a focused, working interactive prototype. Scenarios, gameplay, and technology are still to be selected.

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

The app is scaffolded as a Vite + TypeScript project. Scenarios and gameplay are still to be selected.

### Getting started

Requires Node 24 or newer (see `.nvmrc`).

```sh
npm install
npm run dev
```

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

This README summarizes the team-provided track brief, **Engaging Youth in Sustainable Land-Use Decisions**. It describes the intended direction and constraints, not completed functionality.
