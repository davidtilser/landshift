# Heat-data verification, 24 October 2026

**PASS for the authored data/calculation scope. UI integration and visual verification: not implemented / not run.**

## Scope and evidence

This record covers the fixed Anglers Lodge + Golden Gate Park Senior Center teaching case, its input assumptions, offline generator, generated outputs and future UI recommendation. No running application was changed or visually assessed by this task. Existing building-heating equipment, metered demand, engineered routes and recipient consent remain unverified.

All new numerical values are declared educational assumptions. Public sources establish facility identity and the general recovery mechanism; the inherited energy snapshot establishes the frozen teaching baseline. The result is a complete conditional calculation, not a site-specific performance prediction.

## Checks performed

| Check                                     | Result                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen baseline hash and sibling identity | PASS: inherited 10 MW average IT and 87,600 MWh/year IT electricity preserved.                                                                                                                      |
| Offline generation and exact output check | PASS: `compute.py --check --self-test` reproduces all three generated outputs.                                                                                                                      |
| Heat, electricity and demand conservation | PASS: shared source/package limits, branch capacities, delivery/loss split, compressor contribution and backup demand checked.                                                                      |
| Timing and demand denominator             | PASS: 2026 weekdays give 2,088 model heating hours; monthly weights sum to 100%; combined coverage uses total delivered / 66 MWh model demand.                                                      |
| Boundary cases                            | PASS: absent source, neither/one/both buildings needing heat, zero-demand N/A, invalid COP/temperatures/hours/source and 300 seeded invariant cases.                                                |
| Independent numerical audit               | PASS: separate high-precision Decimal arithmetic in kWh, manually enumerated monthly weekday counts and both branch caps reproduce monthly delivery and annual results.                             |
| Isolated reproduction                     | PASS: a temporary copy of this packet without sibling packets reproduces all outputs; no network required.                                                                                          |
| Transition specification checks           | PASS: 43 stable acceptance IDs, ten patterns and 48 endpoint/data references. Heat values are data-only recommendations; scene numerical display remains disabled.                                  |
| Existing source preservation              | PASS: all 55 present original files in the historical 67-file water/energy manifest remain byte-identical. The 12 absent files are the previously removed San José packet and are not dependencies. |
| Local links, JSON and scoped formatting   | PASS. Generated outputs and frozen baseline are intentionally excluded from formatter rewrites.                                                                                                     |

The independent arithmetic audit used a separate calculation in this same task; no independent human or subagent engineering review is claimed. Visual checks and participant comprehension studies were not performed.

## Audited results

| Quantity                         |             Unrounded audit result |
| -------------------------------- | ---------------------------------: |
| Delivered heat                   |  51.4684071408392 MWh thermal/year |
| Combined modelled demand covered |                  77.9824350618776% |
| Additional electricity           | 15.9207764705882 MWh electric/year |

Recommended display precision is **51.5 MWh thermal/year**, **78.0%**, **15.9 MWh electric/year**. Do not interpret thermal MWh as electrical savings. No cooling-water, net combined electricity, cost or carbon saving is supplied.

## Reproduction

```sh
python3 docs/research/heat-demo-golden-gate-polo/compute.py --check --self-test
python3 docs/research/transitions-demo-golden-gate-polo/acceptance.py --check
python3 docs/research/transitions-demo-golden-gate-polo/verify.py
```

The user requested documents, calculations and recommendations only. UI integration remains separate work, including replacement of the legacy-pool illustration with the two real buildings, checked display/context bindings and browser acceptance evidence.
