# LandShift — Exploring the impacts of a new datacentre in San José

**Experience mechanism and user stories for team review**

LandShift is an interactive learning experience built around **San José Data Center 04**, a proposed new datacentre development in San José, California.

The player explores what could happen as the datacentre is built and begins operating: how the project changes the land, requires water and electricity, affects access and roads, and raises questions about employment, soil health, and longer-term land degradation.

The experience has three connected use cases:

1. **Understand the proposed datacentre and its impacts.**
2. **Change the proposal and compare the implications.**
3. **Create an alternative datacentre plan within the same region.**

The three use cases describe the broader product direction. The approved hackathon scope below limits what we implement and demonstrate. The current HTML prototype tests one site-preparation milestone, optional explanations, and one illustrative area alternative; the environmental baseline and concrete trade-off described below still need to be defined.

## Approved hackathon demo scope

**One project, one milestone, one decision:** Today → Site preparation for the San José datacentre scenario. **Option A** is the functional learning loop: understand the original proposal and test one prepared alternative. **Option B** is a static concept preview of proposing an alternative location within the same region.

> As a young resident, I want to understand what site preparation changes, compare one alternative, and explain which option I support, its compromise, and a question that needs further investigation.

### One decision, three perspectives

The proposed experiment compares the original preparation footprint with an alternative that leaves a defined strip outside the works. Before extending the prototype, define both what is preserved and what preserving it requires us to change.

| Perspective                   | Minimum for the functional demo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Environment**               | Show a defined existing vegetation-cover baseline and the area removed or retained by preparation in each version. Use sourced cover where available or an explicitly authored teaching baseline. Unprepared area alone does not establish healthy soil, protected habitat, reduced runoff, or lower desertification risk.                                                                                                                                                                                         |
| **Economics and feasibility** | Show one concrete consequence for layout, development scope, or cost. Define the project's space requirement and show what must be reduced or redesigned to retain the strip. A sourced or explicitly authored teaching constraint is acceptable. “The buildings might not fit” alone is an uncertainty, not a demonstrated trade-off. Add a cost or budget only if its rule is supportable; do not invent a surcharge to balance the options. Land purchase price does not change when the parcel stays the same. |
| **People and community**      | Connect one documented local concern or clearly labelled scenario perspective to this decision. Let the player express their own preference, reason, accepted compromise, and question for a developer or planner. This is practice for informed participation, not evidence of community agreement or actual influence on planning.                                                                                                                                                                               |

The main result overview must show the consequence and compromise without requiring any investigation to be opened. All detailed investigations remain optional: the player can open none, one, several, or all. Editing stays separate from explanations; an experiment shows its high-level result first, then offers an optional replay from the shared baseline.

The player may support the original, prefer the alternative, or withhold judgment pending evidence. Do not presume equal delivered service if the alternative reduces development scope. The learning check is whether the player can explain their choice, its consequence, its compromise, and a useful next question; it does not require a mandatory quiz or monitoring system.

### Option B: alternative-location concept preview

Show a single static UI mock for approximately **10 seconds** of the presentation. It illustrates the intended future sequence: propose another site within the region → investigate land, infrastructure, and community constraints → compare with the reference proposal.

Label the screen **“Concept preview — not functional.”** It contains no working site selection, placement, simulation, calculations, generated comparison results, or validated candidate-site claims. It demonstrates a possible future experience, not an implemented relocation capability. Use case 3 below remains the longer-term user story.

### Five-minute presentation

| Time      | What we show                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:40 | The place, datacentre context, teaching assumptions, and decision question.                                                 |
| 0:40–1:30 | Today → Site preparation, the original consequence, and at most one optional investigation.                                 |
| 1:30–2:40 | One separate edit and immediate comparison of the environmental consequence, concrete compromise, and affected perspective. |
| 2:40–3:30 | A short optional Why replay from the same baseline.                                                                         |
| 3:30–4:20 | The player's preference, reason, accepted compromise, and next question.                                                    |
| 4:20–4:30 | Option B: the static alternative-location concept preview.                                                                  |
| 4:30–5:00 | Learning takeaway, scope limitations, and buffer.                                                                           |

Do not implement the full lifecycle, an unrestricted new-plan editor, additional locations, employment projections, happiness scores, a complete financial model, or water, flood, soil-carbon, and desertification simulations for this demo. Employment, water, roads, and electricity can provide sourced context where relevant, without implying calculated responses to the chosen change. Five minutes is the presentation limit; remaining development time and team capacity have not been established.

This scope follows the [challenge brief](challenge-brief.md): a focused working learning loop with understandable consequences and social, environmental, and economic trade-offs. The [UNCCD working reference](research/unccd-land-planning-condensed.md) informs tool selection, context, and participation; it is not a mandatory feature checklist.

## The shared mechanism: follow the datacentre through time

In the broader product experience, the player explores the project on a map of its surrounding area. A timeline follows the proposed development through major milestones; the functional hackathon demo includes only Today → Site preparation:

**The place today → Site preparation → Construction → Opening → Operation**

At each milestone, the player sees a short introduction to the main event, followed by optional investigations into its implications.

| Topic                                         | Questions the player can investigate                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Water**                                     | What water does construction or operation require? Where would it come from? How might changes to the ground affect rainfall and drainage?                            |
| **Soil and land**                             | What existing land cover is removed or retained? Where is soil disturbed? Which surfaces eventually become built or paved?                                            |
| **Costs and feasibility**                     | What does a change cost or require us to redesign? What space, budget, or service constraint does it create, and who bears it?                                        |
| **Employment**                                | What kinds of work might construction and operation create? When do those opportunities occur, and what evidence supports the estimates?                              |
| **Roads and access**                          | How would workers, deliveries, and equipment reach the site? Which routes and nearby uses need consideration?                                                         |
| **Land degradation and desertification risk** | Which relevant pressures on soil, vegetation, and water should be investigated? What regional evidence exists, and what can reasonably be attributed to this project? |
| **Electricity and infrastructure**            | What connections and capacity would the datacentre need before it could operate?                                                                                      |
| **People and community**                      | Who might experience the benefits and burdens, and what questions would they want answered?                                                                           |

These are broader investigation topics, not a commitment to implement a model for each topic in the hackathon demo. Quantified impacts require appropriate evidence and models. In particular, soil disturbance or vegetation removal should not automatically be presented as desertification.

**Every investigation is optional.** The player can open none, one, several, or all before continuing. Five milestones with three investigations each must never become fifteen compulsory tasks.

Each investigation follows:

**What changes → Why it happens → What it means → What remains uncertain**

The player can ask contextual questions during the walkthrough. Editing happens separately, so each walkthrough explains one consistent proposal.

## Use case 1 — Understand the proposed datacentre

### User story

> As a young resident of the San José area, I want to understand how the proposed datacentre could change the place and affect my community, so that I can form an informed opinion.

### Player journey

1. Select the datacentre project and inspect the existing landscape and surrounding area.
2. Understand what is proposed, what the facility would provide, and what infrastructure it would require.
3. Follow the development through its milestones.
4. At each milestone, choose which implications to investigate.
5. Explore explanations and contextual questions at their own pace.

For example, at **site preparation**, the player sees the proposed preparation footprint. They can investigate soil disturbance, retained vegetation, drainage questions, or access arrangements.

At **construction**, investigations might address temporary work, deliveries, construction activity, and resource requirements.

At **operation**, the focus shifts toward ongoing water and electricity demand, permanent employment, infrastructure dependencies, and longer-term effects.

### Successful outcome

The player can explain a datacentre-related consequence, its cause, and an important uncertainty. They can complete this use case without changing the proposal.

## Use case 2 — Change the datacentre proposal

### User story

> As a player, I want to change a meaningful part of the proposed San José datacentre and compare the implications, so that I can understand what my alternative improves, compromises, or leaves unresolved.

### Player journey

1. Leave the walkthrough and enter a separate editing step.
2. Create an alternative using supported decisions.
3. Run the comparison.
4. Immediately see the main differences.
5. Optionally explore why those differences occur through the milestones.
6. Revise and repeat.

Supported experiments could concern the development footprint, retained land, cooling configuration, scale, or construction approach. The exact available decisions depend on the evidence and calculations we can support.

### Feedback has two layers

| Layer                       | Player’s question           | What the experience provides                                                         |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| **Result overview**         | “What did my change cause?” | Original and alternative outcomes, differences, benefits, compromises, and unknowns. |
| **Explanation walkthrough** | “Why did that happen?”      | A replay from the same starting point, highlighting where the proposals diverge.     |

For example, a smaller preparation footprint could leave more land outside the works while leaving less space for the facility and supporting infrastructure. Any implications for building fit, computing service, water, or employment require their own evaluation.

During comparison, switching proposals preserves the selected milestone, topic, and map view. Unchanged events can be passed quickly, and investigations remain optional.

### Successful outcome

The player can connect a design decision to its consequences and explain whether they prefer the alternative.

### Design boundaries

- The original proposal remains preserved.
- Comparable alternatives use the same conditions.
- Reducing development scale also reveals any reduction in delivered benefits.
- Keeping the original is valid.
- Individual outcomes remain visible rather than being compressed into one universal “best project” score.

## Use case 3 — Create an alternative datacentre plan

**Hackathon status:** Option B is represented only by the static 10-second concept preview described above. The journey and outcome below describe future functionality, not a working part of this demo.

### User story

> As a player, I want to propose a different datacentre plan within the San José region, so that I can investigate whether another location or arrangement could better address environmental and community needs.

The player starts a new proposal over the existing landscape. The datacentre remains the development being considered, and relocation stays within the defined region.

### Player journey

1. Understand the development objective, regional boundary, and constraints.
2. Start a new proposal.
3. Choose among supported candidate locations and planning decisions.
4. Evaluate the plan and inspect its main implications.
5. Explore its milestone-based explanation.
6. Compare it with the reference proposal or another saved alternative.
7. Revise and prepare a recommendation.

Potential decisions include location, footprint, scale, layout, and infrastructure approach. The exact decisions and eligible locations remain to be defined.

### Successful outcome

The player can present an alternative datacentre plan and explain its benefits, compromises, feasibility questions, and missing evidence.

### Design boundaries

- A new proposal retains the existing landscape as its baseline.
- Candidate sites are distinguished from locations with unknown suitability or availability.
- Comparisons reveal differences in the service and benefits provided.
- This use case reuses the same timeline, investigation, and comparison mechanism.

## Principles shared across all three use cases

- **Optional depth:** players choose which implications to investigate.
- **Stable walkthroughs:** parameters remain unchanged while a proposal is being explained.
- **Results before explanation:** experiments first show the differences, then offer the causal walkthrough.
- **Traceable consequences:** observations, project information, calculations, and assumptions remain distinguishable.
- **Visible uncertainty:** unsupported effects become explicit questions.
- **Open conclusions:** retaining, changing, relocating, deferring, or requesting more evidence can all be reasoned outcomes.
- **Learning through reasoning:** success means understanding a consequence and its trade-offs.

## Questions for the team’s review

1. Do these three use cases describe the datacentre experience we want?
2. Does the milestone structure make the project understandable without requiring every investigation?
3. Does separating explanations from editing make experimentation clearer?
4. Does the result-first, explanation-second sequence provide useful feedback?
5. Which impacts and planning decisions should the first usable version support?

**The immediate goal remains to validate the mechanism on one milestone before expanding the datacentre lifecycle or planning freedom.**
