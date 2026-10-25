# Energy packet verification

## Scope

Verification covers arithmetic, provenance, shared-scenario consistency, explicit unknowns, the seven-card data handoff and limits of the wider-network story. It does not validate an SF electrical design, engineering feasibility or a public-park development proposal. No product code or server is involved.

## Preparation checks

| Check                                                       | Status                                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Frozen source bytes and inherited scenario/result hashes    | PASS in the offline generator.                                                                        |
| Original SJ, SF and Muhos packet preservation               | PASS for 43 pre-task file hashes.                                                                     |
| IT/facility/support electricity and inherited water balance | PASS; no second IT utilization factor or extra cooling allowance.                                     |
| Partial construction scope and missing-category handling    | Explicit: listed-item sums only; unknown baseline, generator tests and full lifecycle remain unknown. |
| Seven English cards and metric paths                        | PASS in the offline generator.                                                                        |
| Invalid-input and repeated-generation checks                | PASS for 14 rejected input cases and stateless repeated generation.                                   |
| Final formatting, local links and standalone generation     | PASS, including isolated offline generation with no sibling packets.                                  |
| Independent agent verification                              | PASS; source, arithmetic, scope and handoff review completed with no actionable findings.             |

## Readiness boundary

The intended handoff explains selected construction fuel/electricity, a normal operating electrical budget, its inherited cooling-water connection, and a schematic shared-network story. It does not supply a numerical cooling alternative, hourly weather response, local network capacity, outage model or complete lifecycle total. Unknown values must remain labelled **Not established**, never rendered as zero.

## Independent review

A separate verification agent, `sf_energy_verification`, reviewed the completed packet before delivery. It independently inspected the SJ04, EPA, LBNL and Caterpillar PDFs and rechecked current SFPUC, CleanPowerSF and CAISO context. The review confirmed the transferred-design and equipment caveats, distinct make-up/consumption boundaries, and the separation of City-owned-property application requirements from actual service or development approval.

It independently recalculated **87.6 GWh/year IT**, **17.52 GWh/year supporting systems**, **105.12 GWh/year facility electricity**, **12 MW annual-average facility demand**, and the selected preopening sums of **11,920 L diesel** and **58,400 kWh electricity**. It checked metric paths, units, time bases, null handling, all seven English cards and the wider-story claims.

The agent ran `compute.py --check --self-test`, scoped Prettier, local Markdown-link checks and isolated-copy offline reproduction with zero sibling files. All passed. All 43 preserved water files remained byte-identical. There were no actionable findings requiring correction.

This review establishes consistency of the educational accounting and handoff. It does not validate site or grid feasibility, actual machine productivity, thermal performance or product/UI behaviour. The full LBNL 2025-update report was not obtained; only its current official overview is used, without importing numerical parameters.
