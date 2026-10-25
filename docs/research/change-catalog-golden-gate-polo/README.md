# Golden Gate Park demo changes

The selected demo presents **three alternative proposals** for the fictional Polo Fields datacentre. **Heat for neighbours has a completed numerical teaching-data packet for the two fixed buildings. Recycled water and a green roof are visual concepts with no underlying calculations or result data.** This brief defines the selection, experience and visual direction. The [heat packet](../heat-demo-golden-gate-polo/README.md) supplies calculations and future UI recommendations; this delivery does not implement their display.

The user approved this presentation scope on 24 October 2026. The original water and energy baseline packets remain the project reference. The earlier four calculated changes are retained as historical research, separate from this selection.

## Selected cases and readiness

| Case ID                | Proposal                                     | Demo role                          | Numerical scope                                                                                  | Current readiness                                              |
| ---------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `heat_reuse_neighbors` | Use server heat in two nearby park buildings | Main showcase, selected by default | One bounded, evidence-informed heat case, with explicit assumptions and matched recipient demand | Calculated teaching data ready; UI integration not implemented |
| `recycled_water`       | Supply cooling with recycled water           | Concept preview                    | No volumes, savings, capacity calculations or quantitative comparison                            | Visual direction and explanatory copy defined here             |
| `green_roof`           | Add a planted roof                           | Concept preview                    | No runoff, temperature, energy, irrigation or biodiversity calculations                          | Visual direction and explanatory copy defined here             |

Keep these roles visible: **Detailed showcase** for heat, **Concept preview — no numerical assessment** for the other two. The heat data state is **Calculated teaching data — UI pending**. Recommended primary figures are **51.5 MWh thermal/year**, **78.0% of combined modelled demand**, and **15.9 MWh additional electricity/year**. The current application is not updated by this data task. Existing electrical figures must never masquerade as calculated heat-delivery results.

## What the user experiences

The active five-chapter timeline **Today → Foundations → Structure → Ready → Operating** explains the original project (stable runtime IDs M0, M1, M4, M5, M6). The original seven analytical snapshots remain research references; M2/M3 are not selectable story stops. Runtime Foundations is a new checkpoint, not the original stripping-only M1 result. See the [current runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases). At **M6 Operation**, the user enters a proposal view and can select one of the three case cards. This is one choice area inside the existing flow, not another construction milestone or a requirement to complete three tasks.

1. Open the proposal view on **Heat for neighbours**. Show the datacentre and both fixed recipients: Anglers Lodge and Golden Gate Park Senior Center.
2. Let the user preview the change and compare it with the original arrangement. For a later UI integration, use the checked heat handoff for its short data card beside the physical connection.
3. Selecting **Recycled water** replaces the heat scene with its source-and-delivery illustration. Selecting **Green roof** replaces it with the roof illustration.
4. Switching cases clears the previous proposal's overlays and result state. Preserve camera context where practical; use a short camera movement only when the new mechanism needs another view.
5. The user can replay, skip, return to the original plan or choose another case. Previews are independent and do not combine interventions or add savings.

Natural-language prompts may introduce a prepared case, such as “Could we use this heat nearby?” They are not a requirement to implement an unrestricted planner or language parser. The three visible cards must always provide a complete route through the demo.

### Data visibility when switching

Only the heat case has checked proposal-result numbers available for a later UI integration. The recycled-water and green-roof views show the animation, a short explanation, a conceptual trade-off and the concept label. Hide quantitative panels, charts, counters, numeric badges, project-stat overlays and comparison percentages in those views. Do not retain heat numbers, display zero savings, or reuse an old water result as a new concept result.

The original baseline's numerical cards remain available in its separate view. They are not carried into the two concept views. Their qualitative arrows, colour changes, water levels and vegetation are explanatory animation, not scaled data, measured temperature or a simulation output. Source details can remain optional text links.

The [land-and-space baseline layer](../land-space-demo-golden-gate-polo/README.md) adds surface allocation and recreational-use questions to the same five-chapter walkthrough. It reuses the original water surfaces and is not a fourth proposal. Its numerical overlay also stays hidden in the recycled-water and green-roof concept previews.

The shared [transition pack](../transitions-demo-golden-gate-polo/README.md) defines continuing stories across the topics. Its **P1–P3** patterns give each proposal an original state, intervention phases, active mechanism and limitation/reset replay inside M6. These phases do not add milestone IDs or place proposal equipment in the original construction history. The **Recipient unavailable** heat replay changes the heat pathway; returning to an earlier baseline milestone is a snapshot comparison, not physical reversal.

Use the [verifiable proposal transition tables](transition-checklist.en.md): **SF-P1** for heat, **SF-P2** for recycled water and **SF-P3** for the green roof. Rows specify phase triggers, observable results, pass criteria and evidence limits; shared switch/reset and numerical-visibility checks are linked there. All engine verification remains **Not run**. A passing content check does not establish implemented proposal behaviour or calculated heat results.

## Heat for neighbours

### Proposal and intended learning

“Could we use some of the servers' heat in Anglers Lodge and the Golden Gate Park Senior Center?”

The learner discovers a connection between computing, heat, a recipient's heating demand and new infrastructure. Reusing heat can benefit another building while also requiring equipment, electricity and a viable thermal connection. It does not make the servers stop using electricity.

**User-selected scope, 24 October 2026:** use heat for **Anglers Lodge and Golden Gate Park Senior Center together**, the two nearest buildings in the reviewed shortlist. This supersedes the fictional pool, open candidate search and one-building-first recommendation. Keep one fixed two-building proposal; do not add museums, other recipients, building selectors or routing controls.

The [completed heat packet](../heat-demo-golden-gate-polo/README.md) records the pair, declared route assumptions and shared-source calculation. Building identity is selected for the demo; useful heating demand, equipment compatibility, routes and consent remain unverified. Label real buildings separately from assumed demand and hypothetical connections.

**Implementation migration:** the running scene/discussion source still describes the former model pool. Its geometry, copy and heating-system illustration need a later update. This brief and the proposed transition contracts describe the new building-heating direction; they do not claim that UI migration is complete. The educational numerical model is complete under the packet's declared assumptions.

The existing campus uses an authored indirect-evaporative cooling concept. The completed teaching packet selects a 32/27°C primary recovery point and a separate 30/25°C heat-pump source circuit; these are declared assumptions about the fictional campus. Do not silently replace it with a high-temperature direct-liquid-cooled server design to obtain a better result.

### Physical connection and new construction

For the demo, propose **two schematic delivery branches, each with buried supply and return, from a common recovery package to Anglers Lodge and Golden Gate Park Senior Center**, together with heat-transfer equipment at both ends. This is an authored infrastructure proposal, not a surveyed route, an approved connection or evidence of an existing district-heating network at the Polo Fields.

The proposed heat path is:

1. Server heat enters the existing cooling system. Assess recovery from the warmed internal cooling-water return before heat is rejected outdoors; this recovery point requires engineering validation.
2. A heat exchanger transfers recoverable heat into a separate delivery circuit. If source temperature is insufficient for the recipient's heating requirement, a heat pump raises the temperature using additional electricity. The selected teaching case uses COP 4 and 55/45°C delivery to assumed 45/35°C building circuits; actual system compatibility remains unverified.
3. Circulation pumps move warmed delivery water through an insulated supply pipe to the recipient. A second insulated pipe returns cooler water to complete the circuit. The system transports heat in circulating water, not warm exhaust air.
4. A recipient-side heat exchanger at each building transfers heat into its own heating system. Keep the datacentre cooling circuit, delivery circuit and recipient building-heating circuit physically separate; heat crosses exchangers without mixing their water.

New equipment includes heat exchangers, circulation pumps, valves, controls and, if needed, a heat pump. Existing technical rooms may accommodate it if suitable space exists; a separate large building is not assumed. The heat packet selects teaching capacities, temperatures, assumed route lengths and loss allowances. These close the educational calculation; actual equipment sizing, routing and engineering performance remain unverified.

The original cooling system must remain able to reject heat when the recipient cannot accept it. The recipient retains its own heating provision for demand that recovery cannot cover. Heat delivery is limited by both the available source and a useful recipient demand; it cannot be assumed to run at full output continuously.

Installing the proposed buried connection involves excavation, pipe installation and surface restoration along a route that may extend beyond the campus. Show temporary disturbance to affected park paths or other surfaces only as a schematic possibility until a route is selected. Access, existing utilities, roots and restoration needs are route constraints to assess, not established site impacts. Do not assign trench dimensions, construction consumption or disruption quantities without supporting assumptions.

### Default scene and animation

The following are short animation beats within M6, not additional timeline steps:

| Beat                    | What the user sees                                                                                                                                                                                                                           | What it explains                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Original arrangement    | Servers receive electricity; their heat passes toward the existing cooling equipment. Both fixed park buildings have their own heating provision, with actual systems unverified and the modelled useful demand declared in the heat packet. | Both the datacentre cooling duty and recipient heating need exist before the proposal.                                                    |
| Proposed connection     | Reveal a common recovery interface, supply/return branches to the two fixed buildings and, if the selected design needs it, a heat pump. Use a split view or cutaway rather than a falsely surveyed street route.                            | Reuse requires a physical interface and possibly temperature upgrading.                                                                   |
| Connection installation | Briefly open a schematic trench, lay the two insulated pipes, then restore the surface. Keep route geometry visibly illustrative.                                                                                                            | The benefit requires new construction and temporary disturbance beyond installing equipment inside the datacentre.                        |
| Heat delivery           | Warm-coloured pulses pass through the exchanger and recipient loop; a cooler return comes back. The recipient's original heater still covers any remaining need.                                                                             | Heat delivered must match a useful demand. Separate loops exchange heat; datacentre coolant does not enter the recipient heating circuit. |
| Remaining duty          | Keep the unrecovered heat pathway and original cooling equipment visible. Add a separate electrical path to recovery equipment.                                                                                                              | Some heat can remain unused, and heat delivery can need extra electricity.                                                                |

Use colours with labels and directional symbols, not colour alone. Heat and electricity must be visually distinct. For a later quantified UI view, any scaled flow widths must come from the verified model; before that, use qualitative pulses.

After surface restoration, use an underground cutaway to keep both pipes visible: warmer supply toward the recipient and cooler return toward the datacentre. Show heat passing across each exchanger without water particles crossing between the separate circuits. The installation beat is a proposal preview inside M6, not a new baseline milestone or a claim that the original project already included this connection.

The base scene comparison is the required interaction. An optional **Buildings need no heat** replay treats both recipients as unavailable and routes heat back toward the original cooling system. Keep one control for the pair, without separate per-building switches. A winter/summer comparison is an optional later addition only if recipient-demand assumptions and model time steps support it; do not invent a seasonal heat curve for visual effect.

### The wow moment

The camera follows heat that previously left through cooling equipment, travels across the schematic connection and reveals it serving another building. The original recipient-heating source reduces its contribution only to the extent supported by the model. At the same moment, a separate electricity path reveals that transferring or upgrading heat has its own requirement.

The surprising lesson is **a benefit at the recipient can coexist with added electrical demand at the datacentre or heat-delivery system**. A second reveal shows that useful heat delivery can stop when no recipient demand is available, even though computing continues.

### Numbers and data worth showing

The existing energy packet provides reference inputs, not recovery results: **10 MW average IT electricity**, **87.6 GWh/year IT electricity** and **105.12 GWh/year facility electricity**. They describe the authored campus. Neither all facility electricity nor the complete IT electrical budget is automatically usable exported heat.

The completed heat packet defines these three primary figures for a later main result card:

| Planned metric                             | Unit                                                     | Why it matters                                                                | Evidence or assumption needed                                                                      |
| ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Useful heat actually delivered             | MWh thermal/year                                         | Makes the two-building benefit concrete                                       | Capturable heat, temperatures, equipment and transfer limits, losses, operation and matched demand |
| Combined two-building heat-demand coverage | % of the summed demand of both buildings and same period | Shows whether the proposal provides a small share or most of the defined need | A dated measured demand or an explicitly authored recipient profile                                |
| Additional electricity for heat delivery   | MWh electric/year                                        | Makes the cost of pumps and any heat pump visible                             | Selected equipment performance and operating schedule, without double-counting auxiliaries         |

Optional detail can distinguish recoverable heat at the source, heat delivered after losses, heat not used and the recipient's remaining heating requirement. Source/recipient temperatures, pipe length and heat-pump performance may be useful explanatory inputs once supported; the selected teaching values and their evidence boundaries are in the completed heat packet.

A monthly or similarly bounded demand match is preferable to assuming that maximum heat delivery continues for every hour of the year. Thermal MWh and electrical MWh must retain explicit labels. If a heat pump is used, its electrical input contributes to its hot-side heat output; do not attribute that whole output to recovered server heat.

Potential changes in datacentre cooling electricity and water need a compatible cooling-system calculation. The existing 1.25 L/kWh IT make-up reference is not a coefficient linking heat export to water savings. Do not assume that a given percentage of heat reuse causes the same percentage reduction in water. Until supported, the water implication remains qualitative or explicitly unquantified within the heat view.

### Wider implications and constraints

The model connects the datacentre to both fixed recipient buildings through a common recovery package and two schematic supply/return branches. Shared source capacity is allocated once; per-building demand and losses stay separate. Its visible trade-off is useful heat for the recipient alongside new equipment, excavation and additional electricity. A real route requires assessment and coordination with the recipient and relevant land or infrastructure operators. Keep route geometry schematic, maintain a way to reject remaining heat, and distinguish additional recovery electricity from any separately established cooling-electricity credit. These construction implications remain qualitative in this brief.

Avoid money, carbon, household-equivalent counts and claims of public consent in the first calculation. Those need their own receiver baseline, energy source, tariffs, emission factors or evidence. Providing heat does not cancel the project's use of park space.

Source basis: [DOE FEMP Best Practices Guide for Energy-Efficient Data Center Design, section 7.1, printed p.28 / PDF p.37](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design_0.pdf). Its conditions support the mechanism; they do not supply Polo-specific recovery quantities or a recipient.

## Recycled water

### Proposal and intended learning

“Could the cooling system use recycled water instead of drinking-water supply?”

This is a visual concept about **where water comes from**. The learner follows treatment, storage, pumping and delivery, and sees that changing a supply source does not necessarily remove the cooling system's water need or evaporation.

### Default scene and animation

| Beat                    | What the user sees                                                                                                        | What it explains                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Original supply concept | A labelled drinking-water-supply branch leads to the hypothetical campus. Keep the regional view schematic.               | Establishes the original authored source assumption.                        |
| Follow the alternative  | Pull back to a treatment-facility icon, a recycled-water storage/pump icon and a differently labelled distribution route. | An alternative supply needs a system outside the building.                  |
| Cooling connection      | Highlight the proposed recycled-water branch while keeping internal cooling, evaporation and blowdown pathways visible.   | A source substitution is distinct from eliminating water demand.            |
| Trade-off reveal        | Highlight treatment and pump icons with an electrical-connection symbol and an assessment marker.                         | Delivery requires treatment, energy, suitable quality and service capacity. |

Use steady, illustrative flow symbols without numerical widths. Nearby households remain neutral; do not show a full reservoir, a shortage ending or a new capacity allocation. The proposed campus connection is visibly marked **Conceptual connection**.

### The wow moment

The camera reverses the user's view of the system: a datacentre that seemed to draw from a tap becomes the endpoint of a treatment-and-delivery chain. The source route changes while the cooling mechanism remains visible. The improvement can concern water quality/source choice rather than a smaller total flow.

This links water, treatment energy, infrastructure and other system users. SFPUC's Westside project is real local context for supplying recycled water to Golden Gate Park irrigation; it is not evidence of an available industrial-cooling connection for this fictional campus.

### What the concept card says

**“A different water source could serve the same cooling need. Treatment, delivery and capacity still matter.”**

Show qualitative captions for **Water source**, **Treatment and pumping**, and **Infrastructure and other users**. Do not display water volumes, potable savings, percentages, power demand, treatment capacity, costs or a calculated comparison. No supporting scenario calculation or new demand inventory is required for this concept preview.

Actual connection, capacity allocation and water-quality compatibility are unassessed. The [SFPUC Westside project page](https://www.sfpuc.gov/construction-contracts/construction-projects/westside-enhanced-water-recycling-project), checked 24 October 2026, lists construction; the preview must not portray a confirmed operating datacentre service.

## Green roof

### Proposal and intended learning

“Could part of the roof become a planted roof?”

This is a visual concept linking **vegetation, rainfall, roof conditions and competing uses of space**. It explains a mechanism without claiming a calculated runoff reduction, measured cooling effect or biodiversity outcome.

### Default scene and animation

| Beat                       | What the user sees                                                                                            | What it explains                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Roof view                  | Orbit to the existing roof and identify cooling equipment and access areas.                                   | The roof is already a functional part of the campus.                                           |
| Proposed planting          | Reveal a schematic planted patch, then a cutaway of vegetation, substrate, drainage and waterproofing layers. | A green roof is a constructed system, not grass painted onto a roof.                           |
| Rain illustration          | Show rain entering the substrate, some temporary storage and an excess-water pathway.                         | Storage is finite and water pathways change.                                                   |
| Dry-condition illustration | Show substrate moisture fading, vegetation care and qualitative roof-surface shading.                         | Planting has maintenance and water needs; a visual colour change is not a temperature reading. |

Keep technical equipment and service paths visible. Do not imply that every roof surface can be planted or that the whole roof becomes publicly accessible. A roof-space overlay may identify competing uses in words, but it must not assign numerical areas or percentages in this concept view.

### The wow moment

The camera passes through the planted roof and follows a raindrop into its layers, then returns to the roof view to reveal how plants and equipment must share the same space. A later dry-condition illustration exposes the stored moisture as finite rather than a permanent water source.

This connects water, vegetation, structural/maintenance needs and the roof's thermal behaviour. It also makes interaction with other proposals understandable: retained rainfall may not reach a collection tank, and planting must be coordinated with solar equipment and cooling. No combined green-roof/solar or tank calculation is included.

### What the concept card says

**“A planted roof changes rain pathways and adds vegetation. It also needs suitable structure, space and care.”**

Show qualitative captions for **Rain pathways**, **Vegetation and roof conditions**, and **Space and maintenance**. Do not show runoff/energy savings, temperature drops, irrigation volumes, habitat scores, carbon offsets or a calculated before/after graph. Do not import generic green-roof percentages as Polo results.

The roof does not replace the lost public sports field, and a possible thermal benefit is not a demonstrated reduction in server electricity. Source basis: [EPA green-roof mechanisms and maintenance considerations](https://www.epa.gov/heatislands/using-green-roofs-reduce-heat-islands). These explain the visual concept, not site-specific performance.

## Shared visualization and state rules

- Keep the campus and camera context consistent. Only one proposal overlay is active at a time.
- Use the five active chapter IDs M0, M1, M4, M5 and M6. Keep original M0–M6 analytical snapshots as research references rather than seven visible stops. Proposed equipment/route hints at M4 and M5 are optional visual context; M6 is the main use-case selector and demonstration stage.
- Give each case a clear concept/detailed label. Keep actual readiness separate from the intended demo role.
- When entering either concept preview, remove all numerical result components and heat-specific state, including charts and hover values. Returning to heat may restore only its own verified results once available.
- Use complete target scene states for switches, replay and reset. Do not accumulate results or leave another case's pipes, plants, heat flows or counters behind.
- Keep arrows explanatory unless a verified heat output explicitly drives them. Do not invent exact flows, temperatures, routes or neighbourhood effects through animation.
- Keep existing water/energy baseline data separate from proposal results. No conceptual preview updates or recalculates the original packets.

## Completed heat data and next integration boundary

The [heat packet](../heat-demo-golden-gate-polo/README.md) closes the selected source, two recipient demand profiles, coincident windows, 40 kW shared package, COP 4, branch capacities, losses and auxiliaries. Its offline generator reproduces **51.468 MWh useful heat**, **77.982% combined modelled coverage** and **15.921 MWh additional electricity** for the 2026 model year. The selected temperatures, demand and delivery system remain authored teaching assumptions about a hypothetical connection to real buildings.

The [English UI handoff](../heat-demo-golden-gate-polo/ui-handoff.en.json) is a future display recommendation. UI code and rendered scenes are outside this task. Later integration must preserve the two-building scope, baseline comparison, evidence labels, pair-wide replay and independent concept states; technical visual acceptance remains Not run.

The recycled-water and green-roof cases remain visualization-only. No additional calculations are required for them by this heat-data task.

## Current brief and historical research

This README is the current three-case demo specification. The previous [four-change reference](legacy-four-change-reference.md), `catalog.en.json`, `scenario.json`, `compute.py`, `results.json`, `results.md`, `handoff.en.json`, examples and their review describe the earlier four calculated alternatives. They are preserved as historical research and must not be loaded as the current three-case selector or heat-result source.

Running the old generator still reproduces that historical packet. Its successful checks do not verify the separate heat-reuse model; use the heat packet's own checks. The original [water baseline](../water-demo-golden-gate-polo/README.md) and [energy baseline](../energy-demo-golden-gate-polo/README.md) remain unchanged.
