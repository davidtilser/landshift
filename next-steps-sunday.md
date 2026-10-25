# Sunday next steps: Polo Fields experience

Prepared on 25 October 2026 against commit `fa31216` (`feat: improve Polo demo onboarding, community and impact UI`).

This file records the verified current state and the recommended implementation backlog. Priorities describe the proposed order of work; they do not establish that any item below has been implemented.

The main remaining gap is the connection between a user's choice, its calculated consequences and the feedback shown in the experience. The next iteration should integrate the completed two-building heat case into the existing flow.

## Verified current state

| Area                          | What exists now                                                                                                                                                                             | Remaining boundary                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| UI and onboarding             | Campus-size selection, city-to-site flight, placement and confirmation, protest before construction, five chapters, short lessons, conversations, environmental layers and an impact modal. | Complete regression checks for the integrated heat experience.                                            |
| Size and units                | Selected size changes geometry and teaching quantities. Public-facing units use acres and US gallons.                                                                                       | Alternate-size quantities remain area-proportional teaching assumptions, not engineering assessments.     |
| Heat calculation              | A complete, reproducible teaching model for Anglers Lodge and Golden Gate Park Senior Center.                                                                                               | The application does not read its results and still depicts a fictional pool.                             |
| Recycled water and green roof | Independent qualitative concept previews.                                                                                                                                                   | Neither has a calculated proposal benefit; this matches their role in the current brief.                  |
| Combined decisions            | Users can switch between independent alternatives.                                                                                                                                          | A persistent combined design is a future product extension, outside the current independent-preview flow. |
| Community                     | Reactions vary with chapter, proposal and heat-recipient availability.                                                                                                                      | Support uses fixed authored bonuses rather than calculated environmental benefits or site size.           |
| Comparison                    | Original-plan and proposal views share the selected size, stage and location.                                                                                                               | There is no separate saved initial project for comparing a later resized or combined design.              |

The [selected-case brief](docs/research/change-catalog-golden-gate-polo/README.md) defines heat as the calculated showcase, water and green roof as qualitative concepts, and the three alternatives as independent previews. A generic multi-recipient network or combined-decision planner is not a prerequisite for completing that demo.

## Prioritized backlog

### 1. P0 — Align concept feedback with its evidence

**Current gap:** the retained model gives recycled water four Support points and a green roof three without a calculated benefit. The Support panel and impact modal have since been removed from every Polo chapter; the underlying model still needs evidence alignment before any future presentation.

**Work:** provide qualitative feedback for these concepts and align their numerical visibility with the selected-case brief. Remove the impression that a concept has earned support through a quantified environmental improvement.

**Acceptance:**

- Recycled-water and green-roof previews retain clear concept labels and qualitative trade-offs.
- Their views do not expose baseline, heat-result or other numerical overlays prohibited by the brief.
- No displayed support improvement implies a calculated benefit that does not exist.
- Returning to Original plan restores its appropriate baseline cards.

**Starting points:** [impact.ts](src/game/polo/impact.ts), [concept visibility rules](docs/research/change-catalog-golden-gate-polo/README.md#data-visibility-when-switching).

### 2. P0 — Integrate the completed heat results

**Current gap:** the checked heat data and English UI handoff exist, but the application does not consume them.

**Work:** connect the existing results to the main heat card, comparison and optional details. Keep the calculation's evidence label and reference period visible.

| Primary metric                           |         Display result |
| ---------------------------------------- | ---------------------: |
| Useful heat delivered                    |  51.5 MWh thermal/year |
| Combined modelled heating demand covered |                  78.0% |
| Additional recovery electricity          | 15.9 MWh electric/year |

The model assumes 66 MWh thermal/year of useful demand; approximately 14.5 MWh thermal/year remains supplied by the original heaters. These are calculated teaching results under declared assumptions, not measured building performance.

**Acceptance:**

- Main cards, comparison and details use the same checked results and display precision.
- Thermal and electrical energy remain explicitly distinguished.
- The interface explains remaining heating demand and the added electrical requirement.
- Assumed demand and hypothetical connections are identified beside the results.
- No net electricity, cooling-water, cost or carbon saving is inferred from the heat results.

**Dependency:** coordinate numerical visibility with item 1.

**Starting points:** [heat UI handoff](docs/research/heat-demo-golden-gate-polo/ui-handoff.en.json), [results](docs/research/heat-demo-golden-gate-polo/results.json), [heat packet](docs/research/heat-demo-golden-gate-polo/README.md), [impact.ts](src/game/polo/impact.ts).

### 3. P0 — Replace the pool with the agreed two-building scene

**Current gap:** the rendered heat concept still serves a fictional pool. The selected showcase serves Anglers Lodge and Golden Gate Park Senior Center together.

**Work:** show a common recovery package and two schematic supply/return branches. Keep datacentre cooling, delivery and building-heating circuits separate. Show additional electricity, retained cooling and recipient backup heating. Follow the existing proposal-transition contract for installation and operating beats.

**Acceptance:**

- Exactly the two agreed buildings are recipients; no building selector or route editor is introduced.
- Connections remain visibly hypothetical rather than surveyed utility routes.
- Separate circuits exchange heat without mixing their water.
- One Buildings need heat / Buildings need no heat control governs the pair.
- Turning demand off stops delivery to both buildings while computing and original cooling continue.
- The annual card remains a labelled fixed reference-year calculation; the replay toggle does not recalculate the year or accumulate energy counters.
- Returning to Original plan clears proposal equipment and heat-result overlays.
- Proposal beats remain inside Operating and do not add baseline construction milestones.

**Dependency:** item 2 supplies the results represented by the scene.

**Starting points:** [scene.ts](src/game/polo/scene.ts), [main.ts](src/game/polo/main.ts), [integration rules](docs/research/heat-demo-golden-gate-polo/README.md#recommendation-for-later-ui-integration), [SF-P1 acceptance rows](docs/research/change-catalog-golden-gate-polo/transition-checklist.en.md#p1-heat-for-neighbours).

### 4. P0 — Make explanations consistent and resolve size applicability

**Current gap:** lessons, map copy, authored dialogue and server context still describe the pool and an entirely unquantified heat concept. The server explicitly prohibits quantified results for all three proposals. The heat packet is a fixed reference case, while the application permits selecting different campus sizes.

**Work:** update every explanation channel to the same two-building teaching case. Define and clearly display how that fixed heat example relates to the selected campus size before presenting its figures alongside size-dependent baseline quantities. Do not automatically scale heat results by the campus-area ratio.

**Acceptance:**

- Map labels, result cards, lessons, authored replies and live-chat context agree on recipients, results, units and limitations.
- The live provider receives checked heat facts while recycled water and green roof remain unquantified.
- The relationship between selected campus size and the fixed reference heat case is explicit.
- Moving the schematic campus does not silently recalculate the fixed heat case or imply a surveyed route.
- Live and offline conversations do not claim unmodelled savings.

**Dependency:** items 2 and 3 establish the shared result and scene meaning.

**Starting points:** [education.ts](src/game/polo/education.ts), [dialogue.ts](src/game/polo/dialogue.ts), [context.ts](src/game/polo/context.ts), [community-engine.ts](server/community-engine.ts), [size.ts](src/game/polo/size.ts).

### 5. P1 — Connect community feedback to the concrete outcome

**Current gap:** reactions already vary with state, but Support uses fixed proposal bonuses. It does not represent delivered heat, added electricity or the selected land allocation.

**Work:** make community comments respond to the explained benefit, electrical requirement, limitations and loss of playing space. If numerical Support remains, make its authored rules transparent and distinct from the physical calculation. Support and Crowd emotions already have different meanings; merging them is not required.

**Acceptance:**

- Reactions acknowledge both a supported benefit and its requirements or remaining harm.
- Unavailable recipients do not produce feedback claiming current useful delivery.
- Opposition to building on the public field remains meaningful after an efficiency improvement.
- Support remains an authored game index; Crowd emotions remain a separate fictional emotional mix.
- Neither is presented as real polling, community consent or a measured social outcome.

**Dependency:** items 2–4 provide consistent facts for the reactions.

**Starting points:** [reactions.ts](src/game/polo/reactions.ts), [impact.ts](src/game/polo/impact.ts), [opinions.ts](src/game/polo/opinions.ts), [community integration](src/game/polo/community.ts).

### 6. P1 — Verify the complete journey and reconcile documentation

**Current gap:** automated checks pass, but the future integrated heat experience needs its own acceptance evidence. Documents contain outdated confirmation-flow descriptions and backlog entries superseded by later changes.

**Work:** test the full experience on desktop, mobile, keyboard and reduced motion. Reconcile documentation with the final behavior and record evidence against the existing acceptance IDs.

**Acceptance:**

- Cover introduction, placement, confirmation, protest, all five chapters, proposals, comparison, recipient replay and reset.
- Exercise return visits between chapters and repeated proposal switching.
- Check 2, 4 and 6 ha for consistent geometry, text, units and teaching quantities, with the heat-case applicability from item 4 explicit.
- Verify that heat figures, equipment and baseline overlays do not leak into unrelated concept views.
- Confirm replay and reset do not accumulate resources, vehicles, people or results.
- Record Pass / Fail / Blocked and evidence per affected acceptance row on the tested build.
- Update `docs/polo-demo.md`, `docs/ui-environment-experience.md` and affected QA records to describe current behavior and remaining work consistently.

**Dependency:** repeat affected checks as items 1–5 land; complete the integrated pass after items 1–4.

**Starting points:** [proposal acceptance checklist](docs/research/change-catalog-golden-gate-polo/transition-checklist.en.md), [Polo documentation](docs/polo-demo.md), [UI implementation overview](docs/ui-environment-experience.md), [design QA](design-qa.md).

### 7. P1 — Complete the demo entry and check learner understanding

**Current gap:** `/` still renders the Vite starter. A learning-validation plan exists, but no participant study has established comprehension or educational impact.

**Work:** provide a clear route from the root page into the Polo experience. After the integrated build is ready, run the existing moderated comprehension study.

**Acceptance:**

- Opening the root URL leads clearly to the playable Polo experience.
- The study records its exact build and operating mode.
- Findings distinguish independent understanding from prompted or facilitator-supplied answers.
- Assess whether participants can explain a consequence, a trade-off, an assumption and a useful planning question.
- Keep study findings separate from implementation QA and claims of behavior change.

**Dependency:** the entry can be completed independently; the study follows a suitable integrated build.

**Starting points:** [root entry](src/main.ts), [learning-validation proposal](docs/learning-validation-proposal.md).

## Subsequent extensions

These remain useful backlog candidates, but are not prerequisites for completing the selected heat showcase:

- A persistent design combining several measures, with a separately saved original project.
- Resizing the original project during play and separating land area from IT demand or computing capacity.
- Quantified recycled-water and green-roof models, followed by combination rules that prevent double-counting.
- Additional heat recipients beyond the agreed fixed pair.
- Verified local utility capacity, supply availability and impacts on surrounding water users.
- Additional locations, older-sandbox curriculum parity, groundwater modelling and side-by-side scene comparison.

## Recommended next iteration

Complete items **1–4**, including the relevant verification from item **6**.

The iteration is complete when a user can activate heat reuse, follow it to the two buildings, and understand a consistent calculated benefit alongside its added electrical requirement and remaining limitations. Community integration in item 5 builds on that shared result.

## Verification performed for this review

- `npm test`: 192 tests passed across 34 files.
- `npm run check`: lint, TypeScript and formatting passed.
- `npm run build`: passed; existing large-bundle and San José aerial-path warnings remain.
- `npm run data:verify:polo`: offline reproduction, provenance, seven research snapshots and five story chapters passed unchanged.
- `python3 docs/research/heat-demo-golden-gate-polo/compute.py --check --self-test`: passed, including independent period arithmetic, 300 invariant cases, unavailable source, one-building demand and zero-demand behavior.
- Desktop browser checks covered introduction, placement confirmation, protest before construction, Operating, proposal switching and impact feedback. These checks do not establish complete mobile, accessibility, live-provider or learner-study acceptance.

The review changed no product code. Its temporary local development server was stopped.
