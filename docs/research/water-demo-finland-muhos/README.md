# Finland water demo: Google/Tuike Finland, Muhos

**English data and 3D/game-engine brief, evidence checked 24 October 2026.** This is a separate, self-contained case. Existing San José and Golden Gate Park packets remain unchanged. The user requested the same milestone-based, water-only format for the actual Finnish controversy.

Start with [the investigation](investigation.md), [the seven milestone cards](walkthrough.en.md) and [the simple wider water story](wider-water-story.md). The case is suitable for an evidence-led educational visualization. It does not supply a calibrated site runoff model or a verified final operating-water forecast.

## For David: default experience and actions

Keep the five main milestones: **Today → Site preparation → Construction → Opening → Operation**. Site preparation contains M1–M3, giving seven cards. Open at reconstructed M0, not at an already operating campus. Automatically show one short change animation, its water explanation, relevant sourced numbers and the wider connection. Rainfall replay starts off; opening evidence or answering a question is never required.

| Step                                           | Default scene and explanation                                                                                                    | Available numbers and status                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 · Today                                     | Reconstructed forest/peatland setting beside Oulujoki, using the EIA layout reference.                                           | **571 ha** planning envelope. It is not all proven intact forest.                                                                                             |
| M1 · Site preparation / felling                | Remove trees within a schematic clearance mask; ground stripping is a separate step.                                             | **About 330 ha** cleared, company-reported through Yle. No invented tree count or canopy-only runoff volume.                                                  |
| M2 · Site preparation / stripping and drainage | Reveal disturbed land, ditches, water protection and the river pathway; show the current work-pause note.                        | **8.9 km** proposed new ditches, largely built; **275 ha** combined VA1+VA2. Optional **40 mm** regional rainfall replay gives gross rain volume, not runoff. |
| M3 · Site preparation / compaction             | Show a clearly labelled conditional continuation and a schematic working patch. Keep monitoring visible.                         | Additional work-water demand, compacted area and runoff increment remain unquantified.                                                                        |
| M4 · Construction                              | Conditional future: place nine schematic hall blocks from the EIA layout reference.                                              | **Nine planned halls**; floor/roof area, materials and construction water remain unknown.                                                                     |
| M5 · Opening                                   | Conditional future: completed schematic buildings and generic water-protection structures.                                       | No invented commissioning volume, storage size, treatment efficiency or approval status.                                                                      |
| M6 · Operation                                 | Conditional future: air-cooling intent is reported; show a closed-loop/air-cooler schematic, with an unknown final water budget. | Keep the older river-water alternative and its 2025 numerical estimates in an optional historical-detail panel. No active intake by default.                  |

Users can Continue, go Back, select a step directly, orbit/zoom/reset the camera, replay/skip animation, open evidence and replay the summer rainfall illustration at M0/M2–M6. M1 has no quantified rainfall view. M3–M6 carry **Conditional future** throughout. An optional M6 panel explains the historical TVE1 alternative, without selecting it as the actual design or recalculating the project.

A jump restores a complete target scene/card. Replays do not accumulate cleared area, water demand or damage. Brief animations do not represent real construction durations. There is no mandatory planning task, city-management mode, quiz, pH slider or new universal score.

The default timeline may continue through a hypothetical future after the pause, but must never imply that environmental assessment is complete or permission to restart has been granted. Protective work and monitoring during the pause are distinct from further development.

## The specific Finnish water story

```mermaid
flowchart LR
    A[Disturbed land and ditches] --> B[Water protection and monitoring]
    B --> C[Oulujoki]
    D[Rain or snowmelt] --> A
```

The diagram shows a documented broad drainage connection and the purpose of controls, not their proven effectiveness or exact pipe/ditch geometry. The frozen authority document identifies black shale and acid-producing material, reports indications of acidification in company monitoring, and requires better protection. The river link is more concrete than in the SF demo; pollutant loads and ecological outcomes are still unquantified. [LVV detailed response, printed pp.4–6](https://www.sttinfo.fi/files/69821631/72435808/532934/fi)

## Evidence, calculations and safe boundaries

Three areas have different meanings: **571 ha project envelope**, **about 330 ha reported clearance**, and **275 ha across two drainage subcatchments**. They are not a land-cover partition. Do not subtract them to invent a remaining forest, wetland or third-catchment area.

FMI station **108040, Oulu Kaukovainio**, supplies an offsite regional example: record timestamp **16 August 2026**, daily precipitation **40.0 mm**. It is the largest positive daily depth in the frozen August sample, not a design return-period event or on-project measurement. The replay assumes a thawed summer surface. It does not reconstruct the timing of the historical storm or the later reported site-water complaint.

Geometric calculations give **132,000 m³ gross precipitation over 330 ha**, or **110,000 m³ over VA1+VA2's 275 ha**. These are alternative spatial references; never add them. Neither is runoff, contaminated water, overflow or river discharge. We do not transfer SF/SJ curve numbers onto this site or use the summer illustration for snowmelt/frozen-ground response.

The 2025 EIA programme presents TVE1 river-fed evaporative cooling and TVE2 air coolers/chillers. Kaleva reports intended air cooling; the final design and water budget have not been verified from primary material obtained here. Therefore:

- Actual operating water use remains **unknown**, not zero.
- The preliminary maximum **20 million m³/year**, including process and domestic water, is a historical planning reference in optional detail. Its **54,794.5 m³/day** even-day equivalent is arithmetic, not expected or peak daily demand.
- TVE1's approximately **70% evaporation / 30% river return** applies to pumped cooling water only. An illustrative **1,000 L → 700 L evaporation + 300 L return** explains that balance; it is not applied to the whole annual process-plus-domestic figure.
- TVE1 river return is not the SF sanitary-blowdown route. A separate intake/treatment solution is described because the EIA programme says local waterworks/aquifer capacity cannot supply that cooling requirement. This does not establish household supply cuts or the need to expand a municipal plant under TVE2.

The programme is a developer planning source, not an approval or measured operation. See [sources.json](sources.json), F02 printed pp.28–31, and F14 for the attributed reporting of air-cooling intent.

## Data handoff and reproduction

| File                                      | Purpose                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `investigation.md`                        | What happened, what remains disputed and which Finnish projects must not be conflated.          |
| `scenario.json`                           | Source-tagged inputs, scope, current pause status, planning alternatives and explicit unknowns. |
| `sources.json`                            | Primary/secondary provenance, exact uses, page locators and hashes.                             |
| `raw/`                                    | Frozen FMI response and original public LVV water-management PDF.                               |
| `milestone-copy.en.json`                  | English story/animation instructions, optional questions and numerical field references.        |
| `compute.py`                              | Offline validation and transparent reference calculations; Python 3.9+ standard library.        |
| `results.json`, `results.md`              | Generated reference values with no invented runoff or operating demand.                         |
| `milestones.en.json`, `walkthrough.en.md` | Generated seven-card machine handoff and readable preview.                                      |
| `wider-water-story.md`                    | Short, visualizable wider implications for this particular site.                                |
| `review.md`                               | Checks, limitations and readiness status.                                                       |

```sh
python3 docs/research/water-demo-finland-muhos/compute.py
python3 docs/research/water-demo-finland-muhos/compute.py --check
```

For implementation, use the same core field pattern as SF: `primary_metrics` and `detail_metrics` contain paths into each card's `data`; root `metric_definitions` supplies units, display conversion, labels and time bases. The familiar `animation`, `meaning` and `uncertainty` fields are also present in English. Evidence/future labels are in `evidence_status`. Unlike SF, no numeric surface-area transition is supplied where the actual geometry is unknown. Use `current_state` for the pause banner; no assumption of approved continuation is encoded. Unknowns remain null and display **Not established**, never zero. Numerical values retain their unit and time basis.

The remaining work for a predictive site simulation is different from rendering this evidence-led story: georeferenced boundaries and current land cover, site hydrology/snowmelt, water-quality series, approved drainage design, actual construction quantities, and the confirmed cooling design/water budget. These gaps are explicit in the handoff, rather than filled with SF assumptions. Product implementation is separate from this data and content packet.
