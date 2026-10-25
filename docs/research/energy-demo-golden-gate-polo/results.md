# Generated energy results

> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

All quantities belong to an authored educational scenario. Reproduce with `python3 compute.py`; check with `python3 compute.py --check`.

## Normal operation

| Metric | Result |
| --- | ---: |
| Average IT electrical demand | 10 MW |
| Selected annual site-electricity PUE | 1.2 |
| IT electricity | 87,600 MWh/year |
| Supporting-system electricity | 17,520 MWh/year |
| Facility electricity | 105,120 MWh/year |
| Average facility demand | 12 MW, not peak |
| Supporting-system share of facility electricity | 16.67% |
| Inherited cooling make-up | 109,500 m³/year; 300 m³/average day |

PUE transfers a developer design average to this scenario. Supporting systems include cooling, electrical losses and other loads. Their combined budget is not cooling electricity alone. Make-up water is supply, including blowdown; it is not all evaporated.

## Selected preopening inventories

| Stage | Authored workdays | Selected diesel, L/stage | Selected electricity, kWh/stage |
| --- | ---: | ---: | ---: |
| M1 | 10 | 300 | Not inventoried |
| M2 | 30 | 4,320 | Not inventoried |
| M3 | 15 | 900 | Not inventoried |
| M4 | 160 | 6,400 | 38,400 |
| M5 | 10 | Not inventoried | 20,000 |

Listed-item sums: **11,920 L diesel** and **58,400 kWh grid electricity**, kept separate. These are partial inventories; unlisted uses and generator tests are not zero. No full construction or lifecycle energy total is available.

## Unknowns and comparison

Existing park energy, net electricity change, peak demand, capacity allocation, actual cable/substation routes, required reinforcement, standby fuel and cooling-only electricity are not established. No numeric alternative cooling design or heatwave outcome is supplied.
