# Golden Gate Park: heat for two nearby buildings

> **Timeline binding:** the original campus now has five visible chapters — Today → Foundations → Structure → Ready → Operating. Heat proposals remain inside Operating (stable ID M6), with their own replay phases. This changes neither the two-building calculation nor its UI-pending status. See [the runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

**Status: closed, reproducible educational data case. UI implementation is outside this delivery.**

This packet completes the numerical part of the [heat alternative](../change-catalog-golden-gate-polo/README.md) for **Anglers Lodge and Golden Gate Park Senior Center together**. The user selected the pair and authorised explicit teaching assumptions on 24 October 2026. Building identities are real; the campus, demand profiles, compatible heating interfaces and connections form an authored scenario. No measured building performance, surveyed pipe route or agreement to connect is claimed.

The original SF water and energy scenarios stay the comparison baseline. The separate [learning-validation plan](../../learning-validation-proposal.md) is still a proposed study; no participant study or UI integration is completed by this data work.

## Results and interpretation

For the modelled 2026 year, occupied-weekday space heating only:

| Recommended primary figure              |                     Result |
| --------------------------------------- | -------------------------: |
| Useful heat delivered to both buildings |  **51.5 MWh thermal/year** |
| Combined modelled heat demand covered   |                  **78.0%** |
| Additional recovery electricity         | **15.9 MWh electric/year** |

The assumed useful demand is **66 MWh thermal/year**. Original heaters still supply **14.5 MWh thermal/year**. The case demonstrates a partial benefit, not full replacement of heating or an electricity saving. See [full precision and monthly results](results.json) and [readable results](results.md).

| Fixed building                 |      Assumed demand | Calculated useful delivery | Coverage |
| ------------------------------ | ------------------: | -------------------------: | -------: |
| Anglers Lodge                  | 12 MWh thermal/year |     9.583 MWh thermal/year |    79.9% |
| Golden Gate Park Senior Center | 54 MWh thermal/year |    41.885 MWh thermal/year |    77.6% |

Recovered server-source heat is **44.944 MWh thermal/year**. Compressor electricity contributes **14.981 MWh/year** to hot-side output; delivery losses are **8.456 MWh thermal/year**. Pumps and controls require another **0.9396 MWh electric/year**. Those boundaries explain why delivered heat must not all be attributed to recovered server heat.

Only **0.0513%** of the inherited annual IT-heat reference is recovered. Most reference heat remains unrecovered. Nearby heating demand and a small selected recovery package, rather than the datacentre's total electrical budget, constrain the benefit.

## What is sourced and what is assumed

The [source register and selection rationale](sources.json) classify the evidence. SF Recreation and Parks confirms [Anglers Lodge](https://sfrecpark.org/facilities/facility/details/Anglers-Lodge-222) and [Senior Center](https://sfrecpark.org/facilities/facility/details/Golden-Gate-Park-Senior-Center-90). Their useful heating loads and current systems were not established by the public facility records reviewed. The values below therefore close an explicitly authored educational case, not a retrofit assessment of those buildings.

| Input                  | Selected teaching value and meaning                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Computing reference    | Inherited **10 MW average IT**, **87,600 MWh/year IT electricity**, **105,120 MWh/year facility electricity**; no additional utilisation multiplier.                                                                          |
| Available source       | **30 kW thermal** at a selected recovery interface, at most 0.3% of the IT heat reference; availability at this interface is an assumption, not a measured recovery fraction.                                                 |
| Recovery temperatures  | Primary cooling return **32 → 27°C**; separate heat-pump source circuit **30 → 25°C**. The two source-side exchanger approaches are 2 K.                                                                                      |
| Heating equipment      | **40 kW hot-side capacity**, **heating COP 4**, compressor-only boundary; delivery **55/45°C**. COP is a fixed teaching assumption at the stated conditions, not a verified product rating.                                   |
| Building interface     | Assumed compatible **45/35°C space-heating circuits** in both buildings, behind separate exchangers. This is an assumed compatible subsystem, not a claim about installed equipment.                                          |
| Demand                 | **12 / 54 MWh thermal/year**, useful occupied-space heat; no floor-area inference, hot-water demand or whole-building energy inventory.                                                                                       |
| Time                   | **2026 non-leap year**; 8 heating hours on each Monday–Friday, **2,088 h/year**; no holiday exclusions. This is a model schedule, not either facility's opening-hours record.                                                 |
| Seasonality            | Monthly demand shares **16, 14, 12, 9, 6, 3, 2, 2, 4, 7, 11, 14%**. Both demands are uniform within each month's weekday windows; zero outside. This is authored, not a weather-derived forecast.                             |
| Delivery losses        | Lodge **90%**, Senior Center **85%** end-to-end heat-delivery efficiency. These are explicit route/exchanger loss allowances, not calculated pipe-network efficiency.                                                         |
| Indicative geography   | Existing map points are about **337 m / 526 m straight-line** from the fixed model centre. Assumed one-way route lengths **400 / 650 m** are separate teaching inputs, not surveyed paths. Supply and return are both needed. |
| Branch capacities      | **15 / 50 kW hot-side** limits, before the common 40 kW ceiling; not an approved pipe size.                                                                                                                                   |
| Pump/control inventory | **0.15 kW common pump + 0.05 kW controls + 0.10 / 0.15 kW branch pumps**, all outside compressor COP. Charge active windows only; idle/start-up/standby requirements are assumed zero.                                        |
| Heat reference         | IT electricity is assumed to become heat within the source accounting boundary; 30 kW is a small available subset. Heat from all supporting equipment is not added to this reference.                                         |

The selected 5 K primary cooling drop and a reference water heat capacity of 4.186 kJ/(kg·K) imply **1.433 kg/s** of water-equivalent source-interface flow at the 30 kW ceiling. This is an accounting consistency check, not a selected real coolant flow or hydraulic design. Hydraulic pressure, pipe diameter, source-loop modifications, thermal start-up, part-load performance and actual cold-weather controls are unmodelled.

The existing indirect-evaporative cooling concept remains. The heat pump raises temperature rather than silently replacing servers with direct liquid cooling. [DOE/NREL section 7.1](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design_0.pdf) supports checking a nearby consumer, suitable temperatures and continued cooling when heat cannot be accepted. A [manufacturer's water-to-water product example](https://rheem.co.nz/products/commercial/commercial-heat-pump-water-heating/water-to-water-w2w-heat-pump/9540200s) supports the technology category only; it does not validate this package, COP or recipient interface.

## Calculation

Calculate each month using its actual count of 2026 weekdays. Demand and source availability are assumed simultaneous within the stated daily windows. No monthly or seasonal storage is modelled. With demand `D_i` in MWh thermal and operating hours `h`:

```text
request_i = min(D_i / efficiency_i, branch_capacity_kW_i × h / 1000)
source_available = 30 kW × h / 1000
hot_capacity = min(source_available / (1 - 1/COP), 40 kW × h / 1000)
share = min(1, hot_capacity / sum(request_i)); zero when sum(request_i) is zero
hot_i = share × request_i
delivered_i = efficiency_i × hot_i
backup_i = D_i - delivered_i
compressor_electricity = sum(hot_i) / COP
recovered_source_heat = sum(hot_i) - compressor_electricity
delivery_loss = sum(hot_i) - sum(delivered_i)
additional_electricity = compressor_electricity + active_pump_and_control_electricity
```

The rule shares one source/package budget proportionally between the two capacity-capped requests. It does not optimise priorities or duplicate available heat. A branch with no demand gets no heat or branch-pump charge. With no demand or no available source, recovery and all modelled auxiliary electricity are zero. Actual standby electricity remains outside the model.

Sum monthly energy, then calculate combined coverage as **total delivered heat / total modelled demand**. Do not add the two coverage percentages or average them without demand weights. Zero total demand gives **Not applicable**, not 100%.

The original arrangement has zero datacentre heat export and zero recovery electricity; the same **66 MWh useful recipient demand** is met by the recipients' original heaters. The alternative retains **14.532 MWh useful backup heat**. No existing boiler efficiency or energy source is selected, so displaced fuel, recipient electricity savings, whole-system net electricity and carbon savings remain null.

## Recommendation for later UI integration

The machine-readable [English handoff](ui-handoff.en.json) is a recommendation payload; no application code reads it yet.

At M6, keep one **Heat for neighbours** alternative for the fixed pair. Recommend three combined figures only: **51.5 MWh thermal/year**, **78.0% of modelled heating demand**, and **15.9 MWh additional electricity/year**. Show **“Calculated teaching scenario · assumed demand and connections”** beside the figures and retain the reference-year/time basis. Optional details can show the two building rows, unmet demand, heat-pump input and delivery losses.

Use one **Buildings need heat / Buildings need no heat** replay control. Its off state stops explanatory heat delivery to both buildings while computing and original cooling continue. Keep the annual card labelled **fixed reference-year calculation**; the replay does not recalculate the year or accrue counters. Changing the campus's schematic placement does not recompute this fixed case or alter the assumed routes.

Keep separate datacentre-cooling, delivery and building-heating circuits. The original cooling pathway and both backup heaters remain. A completed trench-repair animation must not imply permission, a surveyed route, full soil recovery or restoration of the playing field. Recycled-water and green-roof concepts continue to hide all numerical overlays. Returning to the original restores its baseline cards and removes heat-result overlays.

UI integration and visual acceptance remain **not implemented / not assessed** for this packet. The current app may still show its legacy pool; these data do not certify that scene.

## Reproduction, checks and files

```sh
python3 docs/research/heat-demo-golden-gate-polo/compute.py
python3 docs/research/heat-demo-golden-gate-polo/compute.py --check --self-test
```

Python 3.9+ standard library only; no network or live provider is needed. The frozen baseline travels with the packet. When the sibling energy results exist, they must match the frozen bytes. Outputs pin the input/source-register hashes and retain unrounded values; display rounding is specified separately.

The generator checks source/package/branch limits, energy conservation, demand caps, temperatures, units and the fixed pair. Self-tests include independent period arithmetic, 300 seeded invariant cases, unavailable source, zero/two/one-building demand and invalid inputs. A separate verification record is in [review.md](review.md); mathematical checks are not an engineering certification or learner-comprehension study.

| File                               | Purpose                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `scenario.json`                    | Selected numerical assumptions, units, provenance boundaries and fixed recipients      |
| `sources.json`                     | Public references, locators, selection rationale and limits                            |
| `raw/baseline-energy-results.json` | SHA-256-pinned inherited teaching baseline                                             |
| `compute.py`                       | Offline calculation, validation, generation and self-tests                             |
| `results.json`, `results.md`       | Full-precision monthly/annual results and readable summary                             |
| `ui-handoff.en.json`               | Recommended future labels, quantities, original comparison and replay/visibility rules |

This closes the data/content task. Real heating-system compatibility, useful demand, route/permissions and engineered equipment performance remain explicitly unverified site facts. The model's selected assumptions make the educational calculation complete without presenting those facts as established.
