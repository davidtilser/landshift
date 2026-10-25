# Heat alternative: completed data case and implementation recommendation

**Status: numerical data/content task complete; UI integration not implemented.**

The fixed alternative supplies modelled heat to **Anglers Lodge and Golden Gate Park Senior Center together**. The user selected these two buildings to keep the example simple, then authorised closing the assumptions and calculations on 24 October 2026. The final instruction limits delivery to documents, reproducible calculations and a recommendation for future UI display.

## Canonical completed packet

The [two-building heat packet](heat-demo-golden-gate-polo/README.md) now owns the selected assumptions, method, evidence boundaries and recommended experience. It supersedes this document's earlier open modelling proposal and arithmetic-only example.

- [Inputs](heat-demo-golden-gate-polo/scenario.json) select the demand of both buildings, monthly timing, temperatures, source/package/branch capacities, COP, delivery efficiencies, assumed routes and pumping inventory.
- [Source register](heat-demo-golden-gate-polo/sources.json) distinguishes actual building identities, inherited teaching data and authored assumptions. Real demand, heating-system compatibility and connection feasibility are not claimed as observed.
- [Results](heat-demo-golden-gate-polo/results.md) and [full-precision data](heat-demo-golden-gate-polo/results.json) close the annual and monthly calculation.
- [English UI recommendation payload](heat-demo-golden-gate-polo/ui-handoff.en.json) specifies labels, units, precision, original comparison, pair-wide replay and numerical isolation from the other concepts. It is not wired into the application.
- [Verification record](heat-demo-golden-gate-polo/review.md) records reproducibility, independent arithmetic and accounting checks.

## Recommended main result card

| Metric                                   | Calculated teaching result |
| ---------------------------------------- | -------------------------: |
| Useful heat delivered to the pair        |      51.5 MWh thermal/year |
| Combined modelled heating demand covered |                      78.0% |
| Additional recovery electricity          |     15.9 MWh electric/year |

Assumed total useful demand is 66 MWh thermal/year; the original heaters still cover 14.532 MWh thermal/year. The period is the modelled 2026 year with 2,088 occupied-weekday heating hours. Keep **Calculated teaching scenario · assumed demand and connections** visible whenever these figures are later integrated.

## Intended learner loop

Follow the five-chapter project (Today → Foundations → Structure → Ready → Operating), choose the prepared heat alternative, compare benefits and added requirements, and optionally inspect the cause-and-effect explanation. The two named buildings are fixed; there is no building selector or route editor.

The source and delivery equipment serve two isolated building-heating circuits. Heat delivery is limited by available source heat, equipment capacity and useful coincident demand. Original cooling and backup heating remain. Turning the single pair-wide demand replay off stops delivery while computing continues; the fixed annual result is not recalculated by an explanatory toggle.

## Boundaries and next work

Data calculations are complete under explicit educational assumptions. The UI and its current legacy-pool illustration were not changed. The [three-case brief](change-catalog-golden-gate-polo/README.md) and transition specifications distinguish data readiness from later UI acceptance. Recycled-water and green-roof proposals remain qualitative concepts.

The separate [learning-validation proposal](../learning-validation-proposal.md) can test comprehension after a suitable build exists. No learner study has been performed, and this packet does not validate real-world retrofit performance, consent, costs, carbon savings or cooling-water savings. Finland remains a separate scenario with its own inputs.
