# Independent review: Polo Fields water-only alternative

> **Historical calculation review.** The audit below records the original seven-stage research packet. The current demo has five visible chapters; see [the current mapping](README.md#current-demo-and-calculation-stages). Numerical assumptions and results are unchanged. This documentation update does not turn the earlier audit into certification of the new UI.

**Status: accepted for the stated educational water-only data/content packet, 24 October 2026.** Independent subagent: `/root/polo_water_audit`. Review happened after the alternative packet was prepared; the reviewer did not edit files. The primary agent corrected the finding and the same reviewer explicitly rechecked the saved file and generator.

Acceptance covers source fidelity, declared assumptions, reproducible arithmetic, seven Slovak milestone cards and comparison boundaries. It does not establish a surveyed footprint, current field soils, irrigation metering, utility service, approved siting or engineering feasibility.

## Authorized documentation follow-up: 3D and game-engine handoff

After the independent data audit, the user explicitly requested an introductory implementation handoff in **both scenario READMEs**: milestones, automatic/default scene and water-card content, optional user actions, navigation/replay rules and the boundary of the fixed demo. These sections are documentation of intended behaviour, not a claim of implemented controls. The quantitative scenario, sources, generators, card copy and generated results were not changed.

The previous byte-for-byte preservation result above describes the initial alternative task. In this follow-up, **only the original packet's README is intentionally amended**; its other 11 files retain their audited hashes. The live `preservation-sha256.json` baseline advances for that README only. Its prior digest is retained here so the change is explicit:

- Original San José README before the authorized addition: `12940619833ee3ba1e2e7e13d093d7ec0ce72affa6bd1187074fc174d4c752e7`.
- Original San José README after the formatted addition: `d15b2b9b1fb8ee269b11ddd8805ef34f09c9f8b95f65a46275887f405a58b7bc`.

Both deterministic generator checks and scoped documentation formatting were rerun successfully. The introduction's seven IDs, land budgets, tank sizes, IT loads, rainfall values and metric/animation references were checked against the existing inputs and cards. No new scientific input or calculation was introduced; the new interaction text has not been presented as a separate independent UX audit.

## Authorized translation follow-up

The user then requested English for project documents and translation of both scenario documents. The introductory implementation handoffs in both READMEs are now English; their remaining technical content was already English. The project-scoped preference is recorded in `AGENTS.md`. No scenario parameters, source data, card assets, generators or numerical results changed.

The live preservation baseline advances only for the translated San José README, from `d15b2b9b1fb8ee269b11ddd8805ef34f09c9f8b95f65a46275887f405a58b7bc` to `3cfef623a09f42c15e05f1391e0b45915235fbd1e8e47f12e1bd63063a734925`. Its other 11 original-packet files retain their audited fingerprints. Both generator checks and formatting checks were rerun after translation.

## SF-only wider-story follow-up

The user requested a simple broader water narrative for San Francisco only. Added the English `wider-water-story.json` source and generated `wider-water-story.md` brief, linked near the top of the SF README. The existing seven generated cards now include English `wider_context` fields, plus a complete `wider_water_story` at the handoff root. It adds short default explanations, schematic animation instructions, optional contextual questions and explicit service/capacity status. It introduces no new milestone, required task, city-management interaction or quantitative capacity model.

The new P12 primary source is SFPUC's regional water-system description. On 24 October 2026 the primary agent checked its source/treatment/distribution context, the existing P10 stormwater distinctions and P09's end-2026 construction status. Campus connections remain assumptions; no receiver, neighbourhood allocation, water shortage, depletion, overload or required upgrade is inferred. The distinction between source availability, treatment capacity and distribution capacity is a qualitative explanation, not a project capacity assessment.

Primary-agent checks for this follow-up passed:

- Every San José file is byte-identical to its pre-follow-up version. Its preservation manifest remains valid and unchanged.
- SF `scenario.json`, numerical `results.json`/`results.md`, original localized copy and legacy walkthrough are byte-identical to their pre-follow-up versions.
- Both generators pass `--check`; SF story covers M0–M6 exactly once and preserves three distinct pathways. Every source ID and metric reference resolves.
- Generated per-card story values match the existing data, including 300,000 / 225,000 / 75,000 L per average cooling day, and retain their time bases. M1 runoff remains null.
- In-memory probes reject wrong-scenario links, duplicate steps, invalid metric references, duplicate pathways and invalid display multipliers without altering saved input files.
- Scoped formatting, Markdown table consistency and `git diff --check` pass. No application code or development server was involved.

The original independent numerical audit remains historical evidence for the unchanged calculations. The new narrative and generator linkage were checked by the primary agent; they have not been labelled as a new independent audit or implemented product feature.

## Finding and resolution

| Priority | Finding                                                                                                                                                                             | Correction                                                            | Independent recheck                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P3       | `scenario.json` commissioning duration note still referred to the original 270 construction workdays; this alternative's programme is 215. Numerical calculations already used 215. | Note now says commissioning is outside the 215 construction workdays. | Reviewer reread the actual file and reran `compute.py --check`: PASS. |

No remaining actionable findings were reported after recheck. This audit is independent AI review of a declared scenario, not professional certification or field validation.

## Independent substantive checks

- Recomputed every quantified stage and A/B/C/D alternative using imperial-unit TR-55 equations independently of the generator's metric helper. Checked class values against the primary USDA document; no weighted-CN shortcut or duplicate roof/foundation area.
- Inspected the frozen NOAA PRCP day block `'  864  W'`: 86.4 mm, blank measurement and quality flags, source W. Independently summed all 12 monthly normals to 581.4 mm. Checked missing/duplicate-month, station, provenance and source-fingerprint behaviour.
- Verified all seven 40,000 m² area budgets; M1 unknown runoff remains null; M2/M3 have the same coarse runoff class without an invented compaction increment.
- Independently reconciled 3,828 m³ direct preopening supply and 4,908 m³ including selected offsite mixing; 300 m³/day cooling; 114,195 m³ gross annual supplied water; 102,195 m³/year all-source supplied increase over the assumed no-build irrigation budget.
- Exercised empty, full, partly full, oversized and zero-capacity tanks. Capture respects available storage and roof inflow. Rainfall, residual, capture and drainage balance; cooling supply equals evaporation plus blowdown. No event capture becomes an annual utility offset.
- Verified same-service IT comparison and the controlled per-hectare/soil/rainfall comparison in `comparison.md`. Native totals do not identify a location effect or a maritime-climate saving.
- Checked primary-source support for venue 24.64 acres, the grass/track setting, historical aerial-map limits and rain-saturation context. Regional sand remains context, not a measured Polo HSG.
- Checked SJ04 reference and DOE cooling accounting. Verified the SFPUC page still describes construction/end-2026 completion; no unsupported active recycled-water service, known irrigation-source split, potable irrigation saving, spare allocation or named drainage destination is asserted.
- Read the seven Slovak cards for assumptions and time-basis labels, water-supply/evaporation/runoff distinctions and safe animation guidance. No unsupported forest-versus-field dust multiplier found.
- Confirmed all 12 files in the original San José packet remain byte-for-byte unchanged against the pre-task SHA-256 manifest.

## Primary-agent verification and repository checks

| Check                                                | Result                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alternative generator and `--check`                  | PASS, including source hashes, weather parser, area/runoff/cooling/irrigation balances, units and deterministic generated output.                                                                                         |
| Original generator `--check`                         | PASS; original outputs were not regenerated or edited.                                                                                                                                                                    |
| Independent imperial-unit arithmetic and tank probes | PASS; independently repeated by reviewer.                                                                                                                                                                                 |
| UTF-8 and Markdown table-column checks               | PASS. A sensitivity-table separator was corrected before final review.                                                                                                                                                    |
| Formatting for all newly authored alternative files  | PASS; frozen snapshots and deterministic generated outputs follow the existing ignore convention.                                                                                                                         |
| `git diff --check`                                   | PASS.                                                                                                                                                                                                                     |
| `npm test`                                           | PASS: 1 test, 1 file in the current repository. These application tests are not the scientific audit.                                                                                                                     |
| `npm run typecheck`                                  | PASS.                                                                                                                                                                                                                     |
| `npm run build`                                      | PASS.                                                                                                                                                                                                                     |
| `npm run check`                                      | FAIL at lint: 32 existing errors in `prototypes/build-data-centre-demo.mjs`, `prototypes/data-centre-scene.js` and `prototypes/site-preparation-experience.js`. These files existed before this task and were not edited. |
| Standalone `npm run format:check`                    | FAIL: 9 existing files under `prototypes/`; alternative packet formatting passes. No prototype files were reformatted.                                                                                                    |
| Original-packet preservation                         | PASS: all 12 pre-task file hashes match; frozen manifest retained as `preservation-sha256.json`.                                                                                                                          |

The global check failures are existing prototype issues outside this data task; they are reported rather than counted as passes. No development/preview server was started. No product code, prototype, original scenario or canonical experience specification was changed during this alternative task. The only shared configuration addition is `.prettierignore` entries for the alternative's frozen/generated files.

## Standalone SF handoff

The Golden Gate Park packet is published independently of the separate San José research. SF generation and the default implementation handoff require only this directory and standard-library Python. Comparison tables preserve a checked snapshot; references to checks on the separate original packet are historical audit evidence. They do not imply that the original research is included in this handoff. Publication preparation removed links that depended on that separate directory, without changing quantitative inputs or results.

## Reproduce core checks

Run from the repository root:

```sh
python3 docs/research/water-demo-golden-gate-polo/compute.py --check
node_modules/.bin/prettier --check docs/research/water-demo-golden-gate-polo
git diff --check
```

The following preservation check is **optional** and requires the separate San José research packet. The SF calculation check above does not require it. The preservation manifest keys are repository-relative paths. Eleven values retain the pre-alternative fingerprints; the README value incorporates the explicitly requested documentation and translation follow-ups recorded above. Verify the current accepted preservation baseline with standard Python from the repository root:

```python
import hashlib
import json
from pathlib import Path

manifest = json.loads(
    Path("docs/research/water-demo-golden-gate-polo/preservation-sha256.json").read_text()
)
missing = [name for name in manifest if not Path(name).is_file()]
if len(missing) == len(manifest):
    print("SKIP: separate San José research packet is not included")
else:
    assert not missing, f"Incomplete separate research packet: {missing}"
    for filename, expected in manifest.items():
        assert hashlib.sha256(Path(filename).read_bytes()).hexdigest() == expected, filename
    print(f"PASS: {len(manifest)} original files preserved")
```

Repeated future changes to either scenario require fresh generation and review; acceptance applies to this saved version and its declared scope.
