# LandShift — Exploring the impacts of a new datacentre in San José

**Experience mechanism and user stories for team review**

LandShift is an interactive learning experience built around **San José Data Center 04**, a proposed development in San José, California. The player explores its land, resource, economic, and community implications through two core use cases:

1. **Understand the proposed datacentre and its impacts.**
2. **Change the proposal and compare the implications.**

Creating a plan at another location is a future nice-to-have, not a third core flow.

**Current prototype:** one site-preparation milestone, optional explanations, and an illustrative area alternative. Its parcel and layouts are authored; no environmental GIS layers are integrated. The vegetation baseline and concrete layout trade-off below remain to be defined.

## Data and modelling principles

- **Public data describe the place.** Use public geographic and environmental data for existing vegetation, surfaces, terrain, weather, waterways, and surrounding uses. Check date, resolution, and suitability for the decision; a regional layer may not resolve a narrow strip or individual trees.
- **Shared models explain consequences.** Reuse transparent rules across projects. Distinguish physical or accounting relationships from empirical benchmarks and teaching assumptions. For example, energy equals average power multiplied by time; an assumed utilization rate is a scenario input.
- **Project data supply essential parameters.** Add the intervention boundary, basic layout, capacity, technology, and material constraints or mitigation measures as needed for the selected milestone. Project-specific data can also be public. Use reliable project values in place of generic defaults when available.
- **Aim for a reusable majority.** Roughly two-thirds shared data, models, and assumptions to one-third project enrichment is a design intention, not a fixed quota, measured implementation ratio, or accuracy claim.
- **Calculate only supported effects.** Each milestone shows relevant consequences, not a required metric for every topic. Less preparation area does not automatically mean less electricity, cooling water, runoff, or land degradation. State missing evidence as an open question; use scenario ranges only with explicit assumptions.
- **Make provenance visible.** Distinguish observations, project estimates, our calculations, and teaching assumptions. State material conditions and uncertainty; a benchmark-based estimate is not measured project performance.
- **Keep comparisons fair.** Use the same baseline and external conditions. Show differences in delivered capacity, feasibility, and benefits alongside resource savings; do not combine incompatible technology assumptions into an unrealistically favourable alternative.

## Approved hackathon demo scope

**One project, one milestone, one decision:** Today → Site preparation. Understand the original proposal and test one prepared alternative on the same parcel.

> As a young resident, I want to understand what site preparation changes, compare one alternative, and explain which option I support, its compromise, and a question that needs further investigation.

### One decision, three perspectives

The proposed experiment compares the original preparation footprint with an alternative that leaves a defined strip outside the works. Before extending the prototype, define both what is preserved and what preserving it requires us to change.

| Perspective                   | Minimum for the functional demo                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment**               | Define the existing vegetation baseline and show the area removed or retained in each version. Use sourced cover or an explicitly authored teaching baseline. Unprepared land alone does not establish healthy soil, protected habitat, or reduced runoff or desertification risk.                                                                                           |
| **Economics and feasibility** | Define a space requirement and show what retaining the strip requires us to reduce or redesign. A sourced or labelled teaching constraint is acceptable. “The buildings might not fit” is an uncertainty, not a demonstrated trade-off. Add costs only with a supportable rule; do not invent a balancing surcharge. Land purchase price stays unchanged on the same parcel. |
| **People and community**      | Connect one documented local concern or labelled scenario perspective to the decision. Invite a preference, reason, accepted compromise, and question for a planner. This practices informed participation; it does not demonstrate community agreement or influence on planning.                                                                                            |

Show the consequence and compromise in the main result overview. Detailed investigations are optional and never gate progress. Editing stays separate from explanations; show results first, then offer a replay from the shared baseline.

Supporting the original, preferring the alternative, or withholding judgment are all valid. The learning check is whether the player can explain a choice, consequence, compromise, and useful next question; no mandatory quiz or monitoring system is required.

### Five-minute presentation

| Time      | What we show                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:40 | The place, datacentre context, teaching assumptions, and decision question.                                                 |
| 0:40–1:30 | Today → Site preparation, the original consequence, and at most one optional investigation.                                 |
| 1:30–2:40 | One separate edit and immediate comparison of the environmental consequence, concrete compromise, and affected perspective. |
| 2:40–3:30 | A short optional Why replay from the same baseline.                                                                         |
| 3:30–4:20 | The player's preference, reason, accepted compromise, and next question.                                                    |
| 4:20–5:00 | Learning takeaway, scope limitations, and buffer; optionally up to 10 seconds for the nice-to-have concept preview below.   |

Outside this demo: the full lifecycle, unrestricted planning, additional locations, employment projections, happiness scores, complete financial modelling, and water, flood, soil-carbon, or desertification simulations. Employment, water, roads, and electricity may provide sourced context without implying calculated responses to the chosen change. The presentation limit is five minutes; remaining development time and team capacity are not established.

This scope follows the [challenge brief](challenge-brief.md): a focused working learning loop with understandable consequences and social, environmental, and economic trade-offs. The [UNCCD working reference](research/unccd-land-planning-condensed.md) informs tool selection, context, and participation; it is not a mandatory feature checklist.

## The shared mechanism: follow the datacentre through time

In the broader experience, a map and timeline explain one consistent proposal. Only Today → Site preparation is in the functional hackathon demo:

**The place today → Site preparation → Construction → Opening → Operation**

Each milestone introduces one event, followed by optional investigations:

| Topic                              | Questions the player can investigate                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Water**                          | What water is needed, from which source? What changes to rainfall drainage need investigation?             |
| **Soil and land**                  | What vegetation is removed or retained? Where is soil disturbed or land eventually built or paved?         |
| **Costs and feasibility**          | What must be redesigned, reduced, or paid for, and by whom?                                                |
| **Employment**                     | Which temporary or permanent jobs are estimated, and on what evidence?                                     |
| **Roads and access**               | How do workers, deliveries, and equipment reach the site, and who is affected?                             |
| **Land degradation**               | Which soil, vegetation, and water pressures warrant investigation? What can be attributed to this project? |
| **Electricity and infrastructure** | What connections, capacity, and operating energy are needed?                                               |
| **People and community**           | Who experiences benefits or burdens, and what questions would they raise?                                  |

These are investigation topics, not a commitment to model each one. Quantification requires suitable evidence; soil disturbance or vegetation removal must not automatically be presented as desertification.

Each investigation follows:

**What changes → Why it happens → What it means → What remains uncertain**

Players choose their depth, can ask contextual questions, and can continue without opening an investigation. Milestones must not become a chain of compulsory tasks.

## Use case 1 — Understand the proposed datacentre

### User story

> As a young resident of the San José area, I want to understand how the proposed datacentre could change the place and affect my community, so that I can form an informed opinion.

### Player journey

1. Select the project on the map and inspect the existing landscape, surrounding uses, and nearby infrastructure.
2. Open the proposal to understand what would be built, what service it would provide, and what land and infrastructure it requires.
3. Start from the place today and follow the timeline, with a short introduction to what changes at each milestone.
4. Open none, one, several, or all investigations into land, water, economics, or other relevant topics without blocking progression.
5. Ask contextual questions, distinguish sourced information from assumptions, and continue at their own pace with unresolved questions visible.

At **site preparation**, inspect vegetation, disturbance, drainage questions, and access. **Construction** introduces works, deliveries, and temporary resource needs. **Opening** explains readiness and infrastructure dependencies. **Operation** introduces recurring water and electricity needs, permanent employment, and longer-term questions. These later milestones describe future scope; their timing and calculations require supporting inputs.

### Successful outcome

The player can explain a datacentre-related consequence, its cause, and an important uncertainty. They can complete this use case without changing the proposal. For example, they can describe what vegetation preparation removes, why that area is needed, and what evidence is still missing about drainage or an affected community perspective.

## Use case 2 — Change the datacentre proposal

### User story

> As a player, I want to change a meaningful part of the proposed San José datacentre and compare the implications, so that I can understand what my alternative improves, compromises, or leaves unresolved.

### Player journey

1. Leave the walkthrough and enter a separate editing step, preserving the original proposal.
2. Choose a supported change and save an alternative with the changed parameter clearly identified.
3. Run the comparison from the same baseline and external conditions as the original.
4. Immediately see the main differences, including benefits, compromises, any change in delivered service, and unknowns.
5. Optionally replay the milestones from the shared starting point to investigate where and why the proposals diverge.
6. Revise and repeat, keep the original, or withhold judgment pending more evidence.

Future experiments could concern footprint, retained land, cooling, scale, or construction approach, subject to evidence and supported calculations. The hackathon supports only the prepared site-preparation alternative.

For example, a smaller preparation footprint can retain more existing vegetation while reducing space for the facility and supporting works. The comparison must identify what needs to move, shrink, or be redesigned. Building fit, computing service, water, and employment implications each require their own evaluation.

### Feedback has two layers

| Layer                       | Player’s question           | What the experience provides                                                         |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| **Result overview**         | “What did my change cause?” | Original and alternative outcomes, differences, benefits, compromises, and unknowns. |
| **Explanation walkthrough** | “Why did that happen?”      | A replay from the same starting point, highlighting where the proposals diverge.     |

Switching proposals preserves the selected milestone, topic, and map view. Unchanged events can be passed quickly.

### Successful outcome

The player can connect a design decision to its consequences and explain whether they prefer the alternative.

### Design boundaries

- The original proposal remains preserved.
- Keeping the original is valid.
- Individual outcomes remain visible rather than being compressed into one universal “best project” score.

## Experience principles

- **Optional depth:** players choose which implications to investigate.
- **Stable walkthroughs:** parameters remain unchanged while a proposal is being explained.
- **Results before explanation:** experiments first show the differences, then offer the causal walkthrough.
- **Open conclusions:** retaining, changing, deferring, or requesting more evidence can all be reasoned outcomes.
- **Learning through reasoning:** success means understanding a consequence and its trade-offs.

## Nice-to-have — Alternative datacentre location (former use case 3)

A future extension could compare another site within the same region, after checking land, infrastructure, and community constraints. It is not a core flow or functional demo requirement. If useful, show a static preview for up to 10 seconds, labelled **“Concept preview — not functional.”** The preview must not suggest working site selection, simulations, generated comparisons, or validated candidate sites.

## Questions for the team’s review

1. Do the two core flows make the project and its trade-offs understandable?
2. Are results clear before optional explanations, with editing kept separate?
3. Which public baseline, project inputs, and concrete layout compromise can we support for the first milestone?

**The immediate goal remains to validate the mechanism on one milestone before expanding the datacentre lifecycle or planning freedom.**
