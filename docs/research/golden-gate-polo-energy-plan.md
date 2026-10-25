# Golden Gate Park Polo Fields energy modelling plan

> **Historical modelling plan; presentation superseded.** The energy calculation packet has been completed. The current demo uses Today → Foundations → Structure → Ready → Operating. Seven-stage references below describe the original analytical programme, not current UI instructions. Follow [the current energy mapping](energy-demo-golden-gate-polo/README.md#current-demo-and-calculation-stages) and [completed methodology](energy-demo-golden-gate-polo/methodology.md).

The user approved this scope on 24 October 2026. The resulting [energy packet](energy-demo-golden-gate-polo/README.md) follows this plan; no numerical alternative cooling design is supplied where compatible evidence is unavailable.

This plan proposes an energy layer for the existing fictional Polo Fields datacentre. Its purpose is to explain energy use through the same seven steps as the water scenario, including the connection between cooling water and electricity and a simple connection to the wider power system. The next deliverable would be a separate English energy packet. Numerical parameter selection, packet generation and product implementation follow review of this plan.

## Existing scenario and proposed scope

Use the [SF water scenario](water-demo-golden-gate-polo/scenario.json) and [experience brief](water-demo-golden-gate-polo/README.md) as the shared project reference:

- The authored site is a **4 ha managed-turf subset**, with **1.2 ha of roof**, inside the Polo Fields setting. It is not a forest, the whole venue or a surveyed development parcel.
- **10 MW is average IT electrical demand**, independently authored for the water model. It is neither maximum IT capacity nor total facility demand. Do not apply another utilization factor to it.
- Operation covers the first complete **365-day year**, without a ramp-up. The existing water reference is **1.25 L of cooling make-up per kWh IT**, giving **300 m³ per average day**. This water factor is not PUE.
- The selected cooling concept has a closed internal loop and indirect evaporative outdoor heat rejection. It is a teaching assumption, not a validated SF engineering design.
- The original analytical sequence was Today → Site preparation → Construction → Opening → Operation, with three preparation stages, M1–M3; current UI chapter names and mapping are linked above. The authored programme has 10 stripping, 30 grading, 15 compaction, 160 construction and 10 commissioning workdays. Workdays do not establish equipment operating hours or calendar duration.

The core numerical target is the annual operating electricity budget. Earlier steps receive a bounded equipment-energy inventory where defensible assumptions can be made. A stage may explain a mechanism while its quantity remains unknown. The wider story explains the need to assess electrical service, without inventing local capacity or a required grid upgrade.

## Learning questions and metrics

| Question                                          | Proposed metric                                                                  | Why it belongs                                                                            | Input or boundary needed                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| What powers the computing equipment?              | IT electricity, MWh/year; average IT demand, MW                                  | Establishes the computing demand shared with the water budget.                            | Existing 10 MW average and 8,760 operating hours.                                                                           |
| What does the complete facility use?              | Total facility electricity, MWh/year; corresponding annual-average MW            | Shows why the utility supply exceeds the IT demand.                                       | A documented annual site-electricity PUE assumption consistent with the cooling concept and metering boundary.              |
| What supports the servers?                        | Non-IT overhead, MWh/year and share of total electricity                         | Explains cooling, power-conversion losses and other supporting systems.                   | Difference between facility and IT electricity. Cooling alone needs a separately supported breakdown.                       |
| How does preparation and construction use energy? | Electricity, kWh per stage; diesel, litres per stage                             | Makes the lifecycle visible without treating construction equipment as operating servers. | Selected equipment, operating hours, power or fuel rates, and consistent stage allocation.                                  |
| What changes at opening?                          | Selected commissioning electricity and generator-test fuel                       | Separates one-time tests from a full operating year.                                      | Test loads, duration and supply route; no annual operating demand applied to commissioning days automatically.              |
| How does cooling connect water and power?         | Paired annual electricity and cooling make-up under each supported configuration | Makes a trade-off understandable at the same computing service.                           | Matched technology assumptions and climate/boundary compatibility; a lower water factor alone cannot determine electricity. |
| What does this mean beyond the fence?             | Electrical-service assessment status; peak requirement only if supported         | Connects demand to shared infrastructure.                                                 | Actual or explicitly hypothetical service design. Annual-average MW is insufficient to size a connection.                   |

Keep existing park maintenance electricity/fuel **unknown** unless local evidence supports an inventory. Do not show the original field as consuming zero energy or call gross campus use the net increase over the park baseline. Water supply volume alone does not establish pumping energy.

## Calculation approach

For the simplified operating case, use a common electrical boundary and time period:

```text
IT electricity = average IT MW × 8,760 hours
Facility electricity = IT electricity × annual electrical PUE
Non-IT electricity = facility electricity − IT electricity
Average facility MW = facility electricity / 8,760 hours
Cooling make-up m³ = IT electricity MWh × cooling make-up L/kWh IT
```

The last equality includes the cancelling conversions of MWh to kWh and litres to m³. Preserve those conversions in code and metric metadata. The inherited IT assumption alone gives **87,600 MWh/year**; a final facility total awaits PUE selection. Annual PUE is an energy ratio. It cannot determine peak facility demand or hourly cooling behaviour. [EPA technical reference](https://www.energystar.gov/sites/default/files/tools/Data_Center_August_2018_EN_508.pdf)

For selected construction activities, calculate electricity as average equipment kW × active hours, and fuel as litres/hour × active hours. If starting with rated power, add an explicit duty/load assumption instead of presenting the rating as average demand. Define whether a fleet fuel rate includes idling. Grid electricity and diesel remain separate headline quantities; fuel energy conversion is optional detail using a cited lower heating value. Never count generator output and the same generator's fuel energy twice in an aggregate energy total.

PUE already includes the modelled non-IT electrical systems. Do not add a second cooling/pumping allowance on top of it. Do not use an EPA source-energy benchmarking ratio as the site-electricity parameter without reconciling the boundary. A roof-area or concrete-volume assumption does not determine operating demand or whole-construction energy.

## Milestones and visualization

| Step             | Default scene and energy explanation                                                                                   | Numerical treatment                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| M0 Today         | Existing turf and current uses. Explain that the park has maintenance needs and the campus does not yet exist.         | Existing energy baseline unknown unless supported; distinguish this from absent campus operation.                          |
| M1 Sod stripping | Animate the selected turf-removal equipment; show electricity or fuel powering that work.                              | Selected equipment inventory for the existing 10-workday allowance. No felling energy.                                     |
| M2 Grading       | Show earthmoving equipment and energy used during reshaping.                                                           | Inventory for 30 authored workdays; activity volumes and machine hours require explicit assumptions.                       |
| M3 Compaction    | Show roller passes on the same prepared area.                                                                          | Inventory for 15 authored workdays; no automatic increase in permanent IT demand.                                          |
| M4 Construction  | Show a schematic temporary power supply and selected lifting/building equipment.                                       | Inventory for 160 authored workdays. Upstream material manufacturing and transport remain outside this first budget.       |
| M5 Opening       | Reveal schematic electrical rooms, cooling equipment and selected testing.                                             | One-time commissioning budget across 10 authored workdays; electrical layouts and ratings remain schematic.                |
| M6 Operation     | Show incoming electricity splitting into IT and supporting systems, with the existing cooling-water pathway beside it. | Annual facility and IT electricity, non-IT overhead and annual-average demand. Optional daily equivalent clearly labelled. |

At M6, show at most three primary energy figures: average facility MW, annual facility MWh/GWh, and the IT/non-IT split. Keep the existing water card available so the relationship is visible. The split must be labelled **supporting systems**, unless a cooling-only breakdown has independent support.

Reuse Continue, Back, direct timeline selection, orbit/zoom/reset, animation replay/skip and optional evidence. Each step loads its complete state; revisiting it never adds fuel or electricity again. Short animation time is unrelated to real work duration. Do not show construction-stage kWh and operating-year MWh on an unlabeled common counter.

The wider story can use a simple schematic: **shared electricity system → site connection → IT and supporting systems**. Transformers, cables and substations communicate functions, not verified routes or necessary new works. Retail supply, network ownership, available headroom and reinforcement must be checked separately. California ISO distinguishes utility-governed load interconnection from its own transmission-planning role. [CAISO large loads](https://www.caiso.com/generation-transmission/load/large-loads)

## Cooling comparison and weather

Proposed sequence: close the fixed inherited cooling baseline first; then prepare **one optional comparison** with a clearly specified alternative heat-rejection system, if compatible evidence supports both energy and water parameters. Keep the same IT demand and computing-service assumption, operating period, site boundary and weather basis. Retain domestic water and irrigation separately from cooling make-up.

Changing a cooling configuration would require a new paired energy/water result. Preserve the original water packet; do not silently replace its 1.25 L/kWh reference. Existing prototype coefficients in `docs/game-model.md` describe a separate authored sandbox and are not technical defaults for this 10 MW Polo scenario.

Lower direct water use does not imply a universal fixed electricity penalty. Technology, temperatures, controls and economizer operation matter. LBNL provides mechanisms and comparative modelling; its national or simulated results need an explicit transfer rationale before serving as Polo inputs. [2024 report](https://bies.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report)

Use an annual budget for the first energy packet. Defer hourly thermal simulation. The existing rainfall observation and downtown precipitation normals cannot establish on-field hourly cooling performance. If a later heatwave replay is justified, obtain suitable temperature/humidity or wet-bulb inputs and a technology response model. A short stress event must not be annualized as if it lasted all year. Drought is shared context for water availability and operating choices, not an automatic multiplier on electricity.

## Evidence collection and parameter selection

1. Freeze the inherited SF scenario identity, quantities and stage schedule. Record file hashes and compare them again after preparation.
2. Establish one consistent site-electricity metering boundary and select an annual PUE assumption. Review current LBNL material and at least one comparable project engineering/environmental filing. Record climate, technology and design-versus-measurement differences. Use matched sensitivity cases only when justified; do not select PUE by matching a desired result.
3. Build the small construction inventory from the already selected stage durations and explicit equipment assumptions. Prefer manufacturer fuel/power specifications or public project inventories. Keep incomplete categories visible; never label a selected inventory the full lifecycle total. If numerical construction coverage cannot be supported, keep those stage cards qualitative.
4. Check official SF/utility sources for the local supply context, separating energy procurement from the physical network. Look for evidence relevant to serving a hypothetical 10 MW-average IT project, without transferring another site's substation capacity. Leave peak load, service voltage, capacity availability, lead time and upgrade requirements unknown where not established.
5. Test whether a compatible alternative cooling configuration can be supported. If not, deliver the fixed baseline and an explanation of the trade-off, without fabricated alternative savings.

Use source IDs, document dates and page/section locators. Classify each value as observed data, project design estimate, published method, transferred benchmark, authored assumption or derived result. Benchmarks should explain a selected assumption rather than disguise it as a site measurement. The 2025 LBNL update is a research lead to inspect during packet creation; its full text was not retrieved for this plan. [Update landing page](https://escholarship.org/uc/item/33m6w3x0)

## Boundaries for the first packet

Include direct operating electricity, selected on-site preparation/construction/commissioning energy, the inherited cooling-water link and qualitative grid context. Keep these distinct rather than reporting a complete lifecycle energy total.

Defer embodied energy in materials and servers, upstream fuel production, transport, electricity-generation water use, carbon accounting, tariffs, household-equivalent claims, solar/storage sizing, outage simulation and heat-reuse revenue. Standby generator capacity is not normal operating consumption. Procurement of renewable electricity does not establish dedicated physical supply or zero local network impact. No household shortage, blackout or new substation is inferred from the campus demand alone.

## Proposed packet and checks

After plan review, create a sibling `water-demo`-style packet at `docs/research/energy-demo-golden-gate-polo/`. Suggested files are `README.md`, `scenario.json`, `sources.json`, selected `raw/` evidence, `compute.py`, `results.json`, `results.md`, `milestone-copy.en.json`, `milestones.en.json`, `walkthrough.en.md` and `review.md`. Store an explicit reference to the inherited water version and shared inputs. Resolve any energy alternative's paired water values inside the new packet without rewriting the water baseline.

Before handoff, check:

- Reproducible offline generation, frozen-source hashes, source references, units and all seven milestone IDs.
- Facility = IT + non-IT electricity, PUE at least 1, consistent annual/daily conversions and nonnegative inventories.
- The 10 MW average is used once; its annual IT electricity and inherited cooling make-up reproduce the water scenario.
- Commissioning is separate from the full operating year; cumulative figures cover only explicitly quantified preopening categories. Any missing category prevents a complete-total claim.
- Unknown baseline and grid capacity remain null with explanatory text. No comparison converts them to zero.
- Any alternative preserves the declared service basis and uses a compatible pair of energy/water assumptions. Rainfall replay cannot change annual electricity.
- Boundary-case checks reject invalid PUE, negative hours/fuel, unit mistakes and incompatible scenario references; navigation/replay cannot accumulate consumption.
- English copy, scoped formatting, local links and unchanged existing scenario hashes. No application changes or deployment are needed for a data handoff.

The review question is whether to proceed with this scope: **fixed annual operating baseline, selected construction inventory where supportable, simple grid context, and at most one evidence-supported cooling comparison**. Exact PUE, equipment quantities and any alternative coefficients are selected during the subsequent research, with their assumptions visible in the finished packet.
