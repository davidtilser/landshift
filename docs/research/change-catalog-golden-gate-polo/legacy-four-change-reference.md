> Historical reference: the four calculated alternatives below were superseded for demo selection on 24 October 2026. Use [the current three-case demo brief](README.md) for the active presentation scope. These calculations and their handoff remain an earlier research packet.

# Four changes for the Golden Gate Park datacentre

English catalogue and reproducible data handoff for four alternative designs of the existing fictional **4 ha / 10 MW average IT** Polo Fields campus. Users propose an edit or a goal, preview its consequences across topics, and compare it with the same original design. Each alternative remains an educational scenario, with its engineering constraints visible.

Start with the table below, [the calculated comparisons](results.md), [the machine handoff](handoff.en.json) and [the input examples](interaction-examples.en.json). Existing water and energy packets are preserved.

## The four prepared changes

| User proposal                        | Prepared default                                                                                                         | Main calculated result                                                                                                                                     | Compromise or constraint                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add rooftop solar**                | Allocate 6,000 m² of the 12,000 m² roof to a solar zone, with authored spacing and module density.                       | **900 kWp DC**, approximately **1.453 GWh/year**, covering **1.38%** of baseline annual electricity. Grid import falls; campus electrical demand does not. | A 10% goal is not met. Actual roof fit, structural capacity, shade and interconnection are unassessed. Panel-cleaning water is unknown.            |
| **Enlarge the roof-rain tank**       | Increase storage from 200 to **400 m³**, starting empty.                                                                 | Capture **200 m³ more** in the same comparison rain. Managed drainage volume falls from **2,214.6 to 2,014.6 m³/event**.                                   | The nominal extra footprint is **100 m²** at an authored 2 m usable depth, within assumed hardstanding. No annual reuse or flood-protection claim. |
| **Keep a larger grass strip**        | Preserve **4,000 m²** more original turf instead of proposed non-roof hardstanding.                                      | Completed original turf rises from **0.8 to 1.2 ha**. Managed drainage falls by approximately **268.1 m³/event**.                                          | Annual irrigation rises by **1,200 m³** under the inherited allowance. Access/layout fit is unresolved; the campus still occupies 4 ha.            |
| **Improve cooling-water management** | Conditionally increase the evaporative circuit's concentration ratio from 4 to **6** through suitable control/treatment. | Make-up falls from **300 to 270 m³/average day**, saving **10,950 m³/year** of cooling supply and the same blowdown volume.                                | Evaporation stays unchanged. Water chemistry must allow the change; treatment electricity and ancillary process water are unknown.                 |

These are actions, not four separate environmental modules. Every action returns water, energy, land and wider-context information. A metric can be calculated, held unchanged within the stated model, or not established. A positive or negative delta is not an automatic good/bad score.

## Input and comparison flow

1. **Interpret the request.** Map a proposed action or goal to a catalogue item. The example phrases are intents, not a working language parser. An ambiguous request such as “make it sustainable” needs clarification.
2. **Show the specific edit.** State its parameter, unit, visible assumptions and affected milestones. Do not silently reinterpret “10% less energy” as a 10% reduction in server use.
3. **Preview one alternative.** Recompute the affected quantities and restore complete scene states from the same preconstruction baseline.
4. **Explain the comparison.** Show what improved, what changed elsewhere, what stayed fixed and what remains unknown. Keep the primary figures short and detailed evidence optional.
5. **Apply, revise or reset.** A preview is not an automatic design edit. The user may keep the original, choose the prepared alternative or ask another question.

The current data scope is **one change per preview**. Separate previews cannot be stacked by adding their savings: roof equipment, tank/hardstanding space and operating water/energy can interact. Multiple changes are a future combined-design model, not a fifth catalogue action.

Keep the same seven timeline IDs, M0–M6. Edits describe an alternative project designed from the outset; they are not costed retrofits to a completed campus. Returning to an earlier step never accumulates work, fuel, water or generation again.

## Solar and the ten percent request

The frozen [PVGIS response](raw/pvgis-polo-1kw.json) supplies a location-specific regional solar estimate: **1,614.92 kWh/year per 1 kWp**, using **PVGIS-ERA5 2005–2023**, crystalline silicon, 10° south-facing, a ventilated-rack mounting approximation, a 14% input system-loss allowance and terrain horizon. The result already includes modelled losses; do not deduct 14% a second time.

The live service selected ERA5. It rejected an explicit NSRDB request, so no NSRDB weather is claimed. The raw response metadata confirms that the reference peak power is **1 kW**, not 1 W. [JRC API documentation](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en)

The model reserves half the roof for solar and half for cooling, access and other needs. Within the solar zone, 75% is assumed module surface at 0.2 kWp/m². These are authored packing/nameplate assumptions, not a surveyed or product-specific roof design:

```text
6,000 m² solar zone × 0.75 module coverage × 0.2 kWp/m² = 900 kWp
900 kWp × 1,614.92 kWh/kWp/year = 1,453,428 kWh/year
```

Baseline facility demand remains **105.12 GWh/year**. Under an additional flat **12 MW** demand assumption and no storage/export, all prepared modelled PV output is treated as self-consumed. Grid import becomes approximately **103.667 GWh/year**. The inherited annual-average demand is not an observed hourly profile; neither the actual self-consumption profile nor peak connection savings are established.

A request to cover 10% means **10.512 GWh/year**. Under the same yield and packing assumptions, the required solar zone exceeds the entire 12,000 m² roof. The response therefore reports the achieved **1.38%**, explains the roof constraint and leaves the target unmet. It does not expand the array into the park or fabricate the requested saving.

ERA5 is a regional reanalysis reference. It does not resolve park-scale fog, nearby trees, rooftop equipment shade, structural capacity or actual roof availability. Existing modelled cooling/domestic/irrigation water stays fixed, but new panel-cleaning water is null; a complete revised water total is not claimed.

## Roof storage and diminishing benefit

Storage acts on roof runoff during the **same 86.4 mm recorded-depth replay**, selected soil assumptions and an empty start. The roof contributes approximately **965.7 m³/event**. Even the largest prepared tank, 2,000 m³, cannot capture more than this roof inflow. A full tank has no remaining storage.

The capacity range **200–2,000 m³** is a prepared teaching range. Added capacity divided by the assumed 2 m usable depth gives a nominal extra footprint, allocated inside an authored 1,000 m² expansion reserve within existing hardstanding. Actual access, foundation, height and engineering fit remain unresolved. Surface categories are unchanged by this schematic placement.

The replay does not release or reuse water. Annual operating water and electricity are held at their baseline model values; additional construction/material and maintenance effects are unquantified. Annual water savings require a new rainfall-storage-demand model. No lake/outfall route, peak-flow or flood result is supplied.

## More original turf with a real trade-off

The protected strip is taken out of the works before M1 and left intact through M2–M4. It replaces the same area of proposed final non-roof hardstanding. The completed layout at the default edit is **1.2 ha roof + 1.2 ha other hardstanding + 0.4 ha restored landscape + 1.2 ha retained turf = 4 ha**. IT demand and the reference cooling budget remain unchanged.

The inherited TR-55 calculation compares the alternative with the original under the same rainfall, HSG B and curve-number categories. M1 stripping-only runoff stays unquantified. More retained turf reduces the calculated event volume, while the inherited 300 mm/year delivered irrigation allowance adds **1,200 m³/year**. Actual irrigation-source shares are still unknown, so this is not a net-potable-withdrawal claim.

Incremental irrigation-pumping electricity is unquantified. Revised whole-campus electricity/grid import are therefore null for a changed grass layout; the IT electrical budget remains known. Original construction duration, fuel, dust-control water and material allowances are not automatically reduced by the preserved-area percentage.

The grass strip remains inside the same campus boundary. It does not restore public playing space, establish habitat quality or prove community agreement. Keeping the roof and IT service requires the smaller hardstanding layout to resolve delivery, emergency access, parking and utilities. The **0–4,000 m²** prepared range is not a proof that all larger redesigns are impossible.

## Cooling controls with conditional feasibility

The concentration ratio describes mineral concentration and make-up/blowdown balance; it is not a literal number of trips around the internal loop. The change concerns the evaporative outdoor circuit. Suitable treatment and conductivity/blowdown control are assumed to permit the higher ratio.

At the same annual evaporation of **82,125 m³**, with negligible drift/leaks:

```text
blowdown = evaporation / (concentration ratio − 1)
make-up = evaporation + blowdown
```

At ratio 6, annual blowdown is **16,425 m³**, make-up **98,550 m³** and evaporation remains **82,125 m³**. Existing modelled cooling/domestic/irrigation supply becomes **103,245 m³/year**. That sum excludes any unestimated ancillary treatment water. [DOE FEMP cooling tower management](https://www.energy.gov/cmei/femp/best-management-practice-10-cooling-tower-management)

The prepared ratio range is **4–6**, with feasibility at 6 not established. Treatment/control energy and ancillary water remain unknown; revised whole-campus electricity is null. The preview must not describe the change as a confirmed installation, reduced evaporation, energy saving or relief of household shortages.

## Handoff and response rules

| Response status                                         | Meaning for the user                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `conditional_educational_preview`                       | The selected model can calculate a bounded alternative; real engineering feasibility remains unassessed. |
| `clarification_required`                                | The request has not identified an actionable change.                                                     |
| `exceeds_geometric_bound`                               | The requested solar zone exceeds the entire roof of this design.                                         |
| `outside_prepared_range`                                | More evidence or a new prepared redesign is needed; this is not universal physical impossibility.        |
| `unsupported_change` / `combined_changes_not_supported` | The current catalogue cannot calculate that action or combination.                                       |
| `invalid_input` / `unsupported_goal`                    | Parameter, unit contract or goal is outside the supported request format.                                |

`handoff.en.json` contains four actions with input examples, bounds, constraints, primary metric IDs, source IDs and previews. Each preview has normalized `metrics` rows with `facet`, `baseline`, `alternative`, `delta`, `unit`, `time_basis` and `status`, plus complete seven-step `milestone_states`. Annual operating metrics are null before M6. Read these values rather than deriving results from animation duration or accumulating deltas.

`not_established` displays **Not established**. `unchanged_under_model_assumptions` means the selected accounting held that metric fixed; it does not prove absence of all lifecycle effects. Construction changes, costs, network headroom and social/ecological outcomes are not filled with invented coefficients. No universal project score or approval is generated.

## Files and reproduction

Authored inputs are `catalog.en.json`, `scenario.json`, `interaction-examples.en.json` and `sources.json`. `raw/` contains frozen baselines, the actual PVGIS response/request and primary method pages. `compute.py` generates `results.json`, `results.md` and `handoff.en.json`. [review.md](review.md) records checks and scope.

```sh
python3 docs/research/change-catalog-golden-gate-polo/compute.py
python3 docs/research/change-catalog-golden-gate-polo/compute.py --check --self-test
python3 docs/research/change-catalog-golden-gate-polo/compute.py --request '{"change_id":"roof_tank","parameters":{"tank_capacity_m3":400}}'
```

Generation and requests use Python 3.9+ standard library and need no network or sibling packets. Baseline snapshots and public responses are hash-checked. When siblings exist, the preservation manifest checks the **67 pre-existing water/energy files**. Requests calculate previews without writing or applying a design. No product implementation, LLM parser or new UI is included.
