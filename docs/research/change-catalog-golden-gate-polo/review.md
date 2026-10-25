> Historical verification: this review covers the earlier four calculated changes. The [current three-case demo brief](README.md) selects heat reuse for future numerical modelling and recycled water / green roof for visual-only previews. The heat model is not yet implemented or verified.

# Four change catalogue verification

Verification covers the educational catalogue, source provenance, coupled accounting, request constraints and seven-milestone handoff. It does not certify engineering, roof packing, actual hourly self-consumption, chemistry, network capacity or public-park development feasibility.

| Check                                                                             | Status                                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Exactly four actions, independent previews against one frozen baseline            | PASS in generation.                                               |
| Raw source/baseline hashes and inherited 10 MW, 4 ha, PUE and rainfall identity   | PASS.                                                             |
| PVGIS database, period, coordinates, 1 kW units, monthly/annual output and losses | PASS.                                                             |
| Energy, water and land balances; original baseline rain reproduction              | PASS.                                                             |
| Tank roof-inflow cap and full-storage case                                        | PASS.                                                             |
| Turf irrigation trade-off and unquantified incremental pumping                    | PASS; no invented whole-campus energy saving.                     |
| Conditional CoC calculation and unchanged evaporation                             | PASS; chemistry and added treatment energy remain unassessed.     |
| Four identity settings, 14 rejected requests and stateless replay                 | PASS.                                                             |
| Existing packet preservation                                                      | PASS for 67 pre-task file hashes.                                 |
| Final local links, formatting and isolated reproduction                           | PASS; links, scoped formatting and isolated offline reproduction. |
| Separate verification agent                                                       | PASS; completed independent audit with no actionable findings.    |

The catalogue supplies numeric previews only for its four declared actions and supported parameters. A goal can remain unmet; a value outside a prepared range does not imply universal physical impossibility. Unknowns must remain null, and separate alternatives must not be combined by summing savings.

## Separate verification

The verification agent `sf_energy_verification` independently reviewed the complete catalogue before delivery. It inspected the original PVGIS response, checked current JRC and DOE method documentation, and verified source identity, kW/kWh units, limits and conditional assumptions. It did not edit the packet.

Independent calculations confirmed **900 kWp → 1,453.428 MWh/year**, **103,666.572 MWh/year grid import** and **1.382637%** annual coverage. A 10% target requires **43,395.34 m²** of solar zone under the same assumptions and remains unmet. It confirmed the tank inflow/storage limits, the turf alternative's **268.141 m³/event** drainage reduction and **1,200 m³/year** irrigation increase, and the conditional cooling balance of **98,550 / 16,425 / 82,125 m³/year** for make-up / blowdown / evaporation.

The agent ran the packet's checks and 14 rejected-request cases, independently tested 12 intermediate/boundary previews, checked normalized metric/null handling and all seven states, and reproduced the handoff in an isolated copy without siblings. Formatting, local links, JSON checks and all **67** existing packet-file hashes passed. There were no actionable findings requiring correction.

This review validates accounting consistency and the data handoff. Actual roof fit/structure, hourly solar self-consumption, water chemistry, access/layout, incremental pumping/treatment energy, network capacity and product/UI behaviour remain unvalidated. ERA5 output is a regional long-term estimate, not on-roof generation or a park-scale fog/shading model.
