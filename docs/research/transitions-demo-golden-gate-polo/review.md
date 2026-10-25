# Transition and land demo verification

## Scope

This review covers the SF cross-topic transition specification, the new land/space packet and their documentation links. It checks consistency of the visual story and handoff with existing water/energy budgets, not a running game-engine implementation or real development design. No new external-site measurement or heat calculation is claimed.

## Automated and editorial checks

- Ten patterns cover water, energy, land/space, community context and all three selected proposals.
- Baseline trajectories use M0–M6; proposal phases stay inside M6 and begin from the original proposal state.
- Earlier-state navigation restores snapshots. It is distinct from physical recovery, a recipient-unavailable mechanism or reversal of water flow.
- Source hashes and endpoint bindings preserve units, time bases and unknowns. No interpolated numerical trajectories are supplied.
- M1 runoff remains unquantified; M2/M3 and M5/M6 rainfall outputs remain equal. Tank, water and energy balances remain intact.
- The land generator checks each 4 ha surface budget, one-time disturbance and unchanged completed surfaces. External access wear/recovery is qualitative and separate from retained turf and the existing 0.4 ha restored campus area.
- All 67 existing water/energy files in the preservation manifest remain byte-identical in the authoring workspace. A checkout containing only published scenarios can contain fewer sibling files; present files must match and the SF sources required by this pack must exist.
- Heat results remain pending. Recycled-water and green-roof previews hide all numerical overlays. Proposal equipment, routes and results never stack.
- Scoped formatting, JSON parsing and local Markdown links are checked. No application code or community implementation is changed.

## Independent review

**PASS — no actionable findings.** The separate agent `transitions_land_audit` inspected the actual transition manifest, land handoff/generator, topic companions, current proposal brief and canonical source values. It ran the transition verifier (10 patterns, 45 endpoint bindings), land generation check, water check, energy and historical-catalogue checks/self-tests, and scoped Prettier validation. All passed; all 67 original baseline files were byte-identical in the authoring workspace.

The audit confirmed buildup, persistence, pathway change and recovery across the stories, with event snapshots, stage totals, annual-average operation and M6 proposal phases kept distinct. It confirmed the runoff null/plateaus, 4 ha land balance, separation of external access repair from campus restoration, explicit comparison/reset behaviour, pending heat results and numerical suppression in the two concept previews.

The packet also reproduced in an isolated checkout of current published `main`. All required SF source files were present and matched their pinned hashes. That checkout contained 55 of the 67 historical sibling files; all 55 matched. The 12 absent files belong to the separate unpublished San José packet and are not dependencies of the SF transition pack.

Limitations: this was a documentation/data audit. No engine render, animation timing, real route, utility headroom, recipient availability or actual ecological recovery was validated.

## Reproduction

```sh
python3 docs/research/transitions-demo-golden-gate-polo/verify.py
python3 docs/research/land-space-demo-golden-gate-polo/compute.py --check
python3 docs/research/water-demo-golden-gate-polo/compute.py --check
python3 docs/research/energy-demo-golden-gate-polo/compute.py --check --self-test
python3 docs/research/change-catalog-golden-gate-polo/compute.py --check --self-test
```

The last command verifies only the historical four-change calculations. It does not verify a heat-reuse model or the current three-case selector. Visual timing, camera composition, legibility, safe real-world access and actual vegetation recovery remain implementation or site-assessment questions.
