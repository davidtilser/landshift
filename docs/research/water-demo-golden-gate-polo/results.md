# Generated numerical results

> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

Reproduce with `python3 compute.py`; verify with `python3 compute.py --check`.

All results depend on the scenario assumptions. m³ = 1,000 litres. Each rainfall replay is independent; do not sum replays across stages.

| Step | Generated runoff, m³/event | Roof capture, m³/event | To managed drainage, m³/event | Site supply in step, m³ | Selected offsite mixing, m³ | Cumulative selected preopening supply, m³ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M0 Existing managed turf | 537.6 | 0.0 | 537.6 | 0 | 0 | 0 |
| M1 Sod stripping, before grading | Not quantified | Not quantified | Not quantified | 50 | 0 | 50 |
| M2 Grading | 1,742.4 | 0.0 | 1,742.4 | 1,050 | 0 | 1,100 |
| M3 Compaction | 1,742.4 | 0.0 | 1,742.4 | 525 | 0 | 1,625 |
| M4 Buildings and foundations | 2,095.1 | 0.0 | 2,095.1 | 1,988 | 1,080 | 4,693 |
| M5 Completed campus and commissioning | 2,414.6 | 200.0 | 2,214.6 | 215 | 0 | 4,908 |
| M6 First full operating year | 2,414.6 | 200.0 | 2,214.6 | 0 | 0 | 4,908 |

M6 site-supply step above is **preopening supply only** (zero additional construction); operating supply is below.

- Cooling supply: 300 m³/average day; evaporation 225, blowdown 75.
- First-year supply: cooling 109,500, domestic 1,095, selected irrigation 3,600; total **114,195 m³**.
- No-build irrigation assumption: 12,000 m³/year; reduction 8,400; net all-source supplied increase **102,195 m³/year**. Net potable change: unknown (irrigation source shares unverified).
- Initial cooling/fire fills are preopening stocks, not repeated annual consumption.
- Annual rainfall is climate context only; no annual runoff or tank-reliability result is generated.

## Soil-group sensitivity (generated runoff before tank capture)

| Step | A, m³/event | B, m³/event | C, m³/event | D, m³/event |
| --- | ---: | ---: | ---: | ---: |
| M0 | 4.8 | 537.6 | 1,191.2 | 1,583.6 |
| M2 | 1,104.6 | 1,742.4 | 2,228.0 | 2,543.6 |
| M3 | 1,104.6 | 1,742.4 | 2,228.0 | 2,543.6 |
| M4 | 1,656.4 | 2,095.1 | 2,447.6 | 2,674.2 |
| M5 | 2,254.8 | 2,414.6 | 2,610.7 | 2,728.4 |
| M6 | 2,254.8 | 2,414.6 | 2,610.7 | 2,728.4 |

Sensitivity is a set of alternative soil assumptions, not a confidence interval or proof of the actual site's soil.
