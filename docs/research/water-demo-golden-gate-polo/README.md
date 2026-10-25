# Alternative water-only demo: Golden Gate Park Polo Fields

## For David: milestones, 3D scene and user actions

This is a **content brief for the 3D visualization and game engine**; it does not imply that these controls already exist in the prototype. The demo follows one fixed project and isolates **water impacts**. Users move through land-development states and understand the change, its cause and its water implications at each step. Completing a task or opening a detail panel is never required to continue.

### SF extension: the wider water story

The SF demo now includes [Beyond the site: a simple water story](wider-water-story.md), an English brief for David with one short context beat per existing milestone. A small schematic strip shows the relevant **shared supply**, **rainfall drainage** or **cooling/wastewater** pathway alongside the campus. The new sentence appears by default; further explanation is optional. The 4 ha layout, 10 MW load and all calculated water volumes remain unchanged.

This is a qualitative extension using documented regional context and clearly labelled campus assumptions. It explains how other water users and infrastructure can be involved without predicting shortages, pollution, river-level changes or a new treatment plant. At M5/M6, a neutral status states that campus service and spare capacity have not been assessed. Existing timeline navigation and rainfall controls still apply; no new required task is added.

### What users see by default

The scenario opens at **M0 / Today**. Users see the original landscape in 3D, the model campus boundary, the scenario name and area, and a timeline. Moving to the next step automatically plays a short animation of **that change only**, then shows its resulting state. Users control subsequent progression; the demo does not advance to the end on its own.

Every step includes a compact water card without requiring a click: **what changed → why → what it means**, the relevant primary figures with units and time bases, and material assumptions or uncertainties. Figures may describe water supplied during an entire construction step, volume during one comparison rainfall event, or daily/annual operating supply; those time bases must remain visible. Exact copy and numeric fields are already provided in [milestones.sk.json](milestones.sk.json), particularly `cards[].primary_metrics`, `visible_assumptions` and `metric_definitions`.

**Rainfall replay is off when a step opens.** The card can immediately show results labelled “during the comparison rainfall event,” but rain plays in the 3D scene only on request. It must not imply that rainfall actually occurs during every construction stage. M6 also shows a schematic distinction between operating water supply, evaporation and blowdown by default; daily averages are not an animation of measured instantaneous flow.

### Five main milestones, seven steps

**Today → Site preparation → Construction → Opening → Operation**

Site preparation contains three separate animations: M1, M2 and M3. Each other milestone has one step. The timeline must clearly identify the active preparation step.

| ID / milestone                            | Automatic 3D change                                                                                                                                   | Information visible without opening details                                                                                                                                                                                                | Optional action specific to this step                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **M0 · Today**                            | Original 4 ha model subset of sports turf. Perimeter trees and tracks remain outside the intervention.                                                | Selected area, reference runoff under the recorded 86.4 mm rainfall input, and the assumed original irrigation budget. Four hectares is not the area of the whole Polo Fields venue.                                                       | Replay comparison rainfall on the turf; inspect the weather source and soil/irrigation assumptions.                       |
| **M1 · Site preparation / sod stripping** | Remove turf on 3.2 ha; retain 0.8 ha of original turf. No tree felling or completed grading.                                                          | Removed and retained turf areas and water supplied during this work step. Runoff after sod stripping alone is **not quantified**.                                                                                                          | Replay sod stripping or open the mechanism explanation. A quantified rainfall replay is unavailable for this state.       |
| **M2 · Site preparation / grading**       | Grade the already stripped 3.2 ha; retain 0.8 ha of turf.                                                                                             | Prepared-ground runoff compared with M0 under the same rainfall, this step's water supply, and the qualitative risk of sediment transport.                                                                                                 | Replay rainfall; compare the prepared surface with the original M0 state.                                                 |
| **M3 · Site preparation / compaction**    | Compact the same 3.2 ha without removing further turf.                                                                                                | Additional water supplied for this work step. Runoff remains at the M2 level because both states use the same coarse model category.                                                                                                       | Replay compaction or rainfall; open the explanation of the unchanged runoff estimate.                                     |
| **M4 · Construction**                     | Buildings occupy 1.2 ha; 2 ha remain bare and 0.8 ha remain turf.                                                                                     | Water supplied during this stage, separate offsite concrete-mixing water, and runoff from the selected construction snapshot.                                                                                                              | Replay rainfall; expand the construction budget and explanation of contained washwater management.                        |
| **M5 · Opening**                          | Complete 1.2 ha of roofs, 1.6 ha of hardstanding and 0.4 ha of restored vegetation, retaining 0.8 ha of turf; add the tank and one-time system fills. | Generated runoff, capture in the initially empty 200 m³ roof tank, remaining water requiring managed drainage, and commissioning water.                                                                                                    | Replay rainfall and follow the split from roof to tank and onward drainage.                                               |
| **M6 · Operation**                        | Completed surfaces remain unchanged; servers and the schematic cooling-water flows start.                                                             | Average daily supply, evaporation and blowdown, plus first-year supplied water and its increase over assumed original irrigation. Keep **10 MW IT, 1.25 L/kWh IT, CoC 4** and the unverified irrigation source visible beside the figures. | Expand the annual budget and before/after irrigation comparison; optionally replay the same rainfall surface state as M5. |

### Actions available to users

- **Continue / Back / select a timeline step:** move between states without mandatory investigation or questions. At M6, users can finish the demo or return to the beginning.
- **Orbit and zoom the camera:** inspect the campus boundary and layout. Provide a way to reset the camera to the whole campus. Camera navigation does not change the model.
- **Replay or skip an animation:** replay changes the visualization; skipping immediately applies the correct final state and card for that step. Waiting for an animation or opening details must never block progression.
- **Replay comparison rainfall / return to the dry scene:** available at M0 and M2–M6. Always use the same rainfall input within this scenario and distinguish it from operating flows. M1 offers a qualitative explanation only. Each independent M5/M6 replay starts with the assumed empty tank.
- **Compare with the original state:** M2–M5 rainfall cards already show the baseline in their default content; users can optionally switch the visualization to M0 and back. This is the original surface of the same site, not another location. Sequential replays still use identical input conditions.
- **Open details, assumptions and sources:** expand a work-step/annual budget, mechanism explanation or data provenance. Material uncertainties and assumptions beside primary figures remain visible without opening details.
- **Select a prepared contextual question:** use the questions and answers in `shared.optional_questions` in [milestones.sk.json](milestones.sk.json). This brief does not require an open-ended AI chat; questions are optional and never block progression.

### Engine rules and scope of this version

Each step **M0–M6 is a complete state**, not an instruction to “add more damage.” A direct timeline jump applies the entire target state from `scenario.json.stages` and displays its card. A normal forward transition animates the area changes in `data.area_change_from_previous_step_m2`; M0 has no preceding-state delta. When jumping across multiple steps or moving backwards, use the complete target states rather than a delta against the wrong preceding step.

Replaying, returning, triggering rainfall or comparing **must not add tree/turf removal, construction water or annual supply again**. Load cumulative construction figures for the selected step from the data. M5 and M6 have identical surfaces; M6 has a separate operating-water budget. Rainfall replay does not recalculate annual supply, the tank has no automatic annual supply credit, and M1's `null` must never display as zero runoff. Short animations summarize stages; their duration does not represent actual working days.

In this closed demo, users **do not change the boundary, area, server count, cooling technology, watering allowance or tank**. They do not design roads or select another development site. General proposal editing remains a broader future flow in the project specification; these two packets are fixed scenarios. Sensitivity calculations in the supporting material are explanatory detail, not ready-made playable alternatives. The outcome is understanding consequences; progression requires no score, quiz or correct answer.

**Implementation inputs:** [milestones.sk.json](milestones.sk.json) provides card content and figures; [scenario.json](scenario.json) provides states and inputs; [walkthrough.sk.md](walkthrough.sk.md) is a readable preview of every card. The technical material below explains the sources and limits of the figures.

---

This is a self-contained SF alternative. [comparison.md](comparison.md) includes a snapshot comparison with a separate San José woodland scenario; that separate research packet is not required to generate or use the SF handoff. This packet closes one **authored 4 ha / 10 MW IT educational scenario** in the real Polo Fields setting, using primary-source local context and NOAA weather. It is not an announced development, a site-selection recommendation or an engineered prediction. Product code and the existing prototype are outside this task.

Start with [the seven Slovak cards](walkthrough.sk.md). [comparison.md](comparison.md) explains the differences from San José and the limits of comparing them. [sources.json](sources.json) gives direct source links, provenance, locators and frozen-data hashes. Identifiers in brackets below refer to that registry.

## Files and reproduction

| File                                      | Role                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `scenario.json`                           | Selected layout, demand assumptions, boundaries and seven surface states; each input has a kind, unit and note. |
| `sources.json`                            | Primary-source registry; NOAA snapshot hashes and reference-document fingerprints.                              |
| `raw/`                                    | Frozen NOAA monthly normals and verbatim daily PRCP line; authored location metadata.                           |
| `compute.py`                              | Offline deterministic generator and numerical/provenance checks; standard Python 3.9+ only.                     |
| `results.json`, `results.md`              | Generated unrounded numerical handoff and readable tables.                                                      |
| `milestone-copy.sk.json`                  | Authored Slovak explanations, animation guidance, metric paths and visible assumptions.                         |
| `milestones.sk.json`, `walkthrough.sk.md` | Generated implementation handoff and user-content preview.                                                      |
| `comparison.md`                           | Comparison with the preserved original, including a controlled hypothetical comparison.                         |
| `review.md`                               | Independent review, corrections and final verification status.                                                  |
| `wider-water-story.json`                  | Authored English regional story, seven visual beats, metric references and source IDs.                          |
| `wider-water-story.md`                    | Generated readable SF story; `milestones.sk.json` also carries English `wider_context` per card.                |

From the repository root:

```sh
python3 docs/research/water-demo-golden-gate-polo/compute.py
python3 docs/research/water-demo-golden-gate-polo/compute.py --check
```

Generation requires no network. JSON volumes are m³; multiply by 1,000 for litres or divide by 1,000 for million litres. Areas are m²; divide by 10,000 for hectares. Always retain the time basis. Generated files must be regenerated after editing inputs or copy.

## 1. The place and the chosen smaller footprint

The supplied [map link](https://maps.app.goo.gl/oWkaHd1QNv66b3C1A) resolves to **Golden Gate Park Polo Field**, with a place-label point at 37.7682117, -122.4932246 [P01]. This point is not a surveyed boundary. The city's venue listing gives **24.64 acres = 99,714.54 m², about 9.97 ha** [P02]. That listing is for the venue; it does not establish the exact grass area or buildable land.

The official field-map PDF shows natural-grass pitches within perimeter tracks, with woodland outside [P03]. Its aerial image is historical (2012 shown), so current official facility and usage descriptions provide a second check of the athletic-field setting [P11]. The usage page describes rain-saturation closures. Neither a grass photograph nor regional sand proves high infiltration.

We **choose** a smaller 40,000 m² campus as a schematic grass subset: a 250 × 160 m local-coordinate rectangle. Placement/rotation is illustrative, within the grass setting; no surveyed fit or georeferenced polygon is asserted. `raw/location-reference.json` distinguishes the place label, venue area and authored geometry. The baseline is managed sports turf, not forest and not a bare agricultural field. There is **no tree removal** in this variant. Surrounding trees, existing perimeter tracks/stands, external access and pipe construction are excluded; extending the footprint into them requires new areas and calculations. No tree number is inferred.

| Final surface                                               |         m² |      ha |
| ----------------------------------------------------------- | ---------: | ------: |
| Retained original turf                                      |      8,000 |     0.8 |
| Building roofs / footprint                                  |     12,000 |     1.2 |
| Internal roads, yards, utilities and storage infrastructure |     16,000 |     1.6 |
| Rehabilitated vegetated ground                              |      4,000 |     0.4 |
| **Total**                                                   | **40,000** | **4.0** |

Thus 3.2 ha of turf is removed, 2.8 ha ends impervious and 0.4 ha is restored. The 1.2 ha irrigated final area includes both retained and restored vegetation. These are different quantities. Building floor count, actual server fit and structural quantities are not validated from land area; **10 MW average IT load is independently authored**.

## 2. Real weather and its geographic limits

NOAA **SAN FRANCISCO DOWNTOWN, USW00023272**, is at 37.7705, -122.4269, elevation 45.7 m [P06], about **5.8 km east** of the place label. We use it as a verified city reference, not an on-field gauge. West-park microclimate, fog deposition and hourly cooling weather are not resolved.

The frozen 1991–2020 metric monthly precipitation normals sum to **581.4 mm/year** [P05]. The official annual report's 22.89 inches equals 581.406 mm; rounding explains the difference. This is approximately **23,256 m³/year of gross rainfall on 4 ha**, including 6,976.8 m³ on the selected roofs. It is neither a measured single year nor harvest, recharge or annual runoff. Monthly normals cannot determine eligible watering days or irrigation demand by subtraction alone.

The event replay uses **86.4 mm**, GHCN daily observation indexed **11 December 2014** [P04]: raw value 864 in tenths of mm, blank measurement/quality flags, source flag `W` [S03]. It gives **3,456 m³ of rainfall** over the model campus. It is the same regional storm date as the old scenario, but a different station and depth. It is a strong-rain example without an assigned return period. Observation-date labels do not specify the exact clock-time storm window.

Every surface state gets an independent replay of that depth with the same assumed average antecedent condition. We are not reconstructing that storm's actual runoff, simulating a dated construction programme, or adding seven storms into a lifecycle total. Event surface flows and annual supply remain separate.

## 3. Milestone contract

The same five main milestones contain seven independently animated cards:

| Card | Milestone / state               | Numerical scope                                                                                                                                                             |
| ---- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0   | Today: 4 ha managed grass       | Reference rain/runoff and **assumed** no-build annual irrigation.                                                                                                           |
| M1   | Site preparation: sod stripping | Remove 3.2 ha turf, retain 0.8 ha. Area and phase work water; runoff **null**, not zero.                                                                                    |
| M2   | Site preparation: grading       | 3.2 ha newly graded bare soil, 0.8 ha turf. Event runoff and phase supply.                                                                                                  |
| M3   | Site preparation: compaction    | Same coarse runoff class and areas as M2; separate phase water, no invented second runoff increment.                                                                        |
| M4   | Construction                    | Snapshot: 1.2 ha roof, 2 ha bare works, 0.8 ha turf. Site water plus separate offsite concrete mixing.                                                                      |
| M5   | Opening                         | Final surfaces and roof-only tank; one-time system fills and testing. Good restored cover is assumed for this representative state, not promised immediately after seeding. |
| M6   | Operation                       | First full 365-day year: daily cooling flows, annual supply and comparison with an assumed no-build irrigation year.                                                        |

The handoff includes what changes, why, implications, units, provenance, animation and limits for every card. M1 is deliberately unquantified for runoff because stripping sod without subsequent grading is not isolated by the selected coarse classes. M3 does not add another CN penalty on top of “newly graded.” Construction animation must not interpolate snapshots into a validated hydrological time model.

## 4. Event runoff, soils and tank

Use NRCS TR-55 equations 2-3/2-4 [S07]:

```text
S = 25400 / CN - 254
Q_mm = 0                                  if P_mm <= 0.2 S
Q_mm = (P_mm - 0.2 S)^2 / (P_mm + 0.8 S)   otherwise
volume_m3 = Q_mm × surface_area_m2 / 1000
```

Select ARC II, Ia = 0.2S. Compute each disjoint surface separately and sum, never a weighted CN first. Roofs and foundations occupying the same plan area are one surface. Final good-cover landscape assumes soil rehabilitation and >75% grass-equivalent cover.

| Class                     | HSG A | **HSG B selected** | HSG C | HSG D |
| ------------------------- | ----: | -----------------: | ----: | ----: |
| Good open space / turf    |    39 |             **61** |    74 |    80 |
| Newly graded, unvegetated |    77 |             **86** |    91 |    94 |
| Impervious                |    98 |             **98** |    98 |    98 |

These are published class values applied to **chosen conditions**, not site tests. The 2005 park plan mentions sandy soils [P07], but that does not identify current engineered/compacted sports-field layers, underdrains or water table. We choose **B** as an illustrative condition and include A/C/D alternatives. Do not label B as a mapped observation. Baseline runoff ranges from about 4.8 m³ under A to 1,583.6 m³ under D; these are alternative assumptions, not confidence bounds. The A result is particularly small and unreliable for precise interpretation: TR-55 warns about low-runoff estimates. Antecedent moisture is also not measured.

Under selected B, M0 produces **537.6 m³**; M2/M3 **1,742.4 m³**; M4 **2,095.1 m³**; M5/M6 **2,414.6 m³ before storage**. Full figures are in [results.md](results.md).

The selected **200 m³ roof tank** starts empty for each independent M5/M6 replay, receives only roof runoff, and does not release/reuse water during the event. Capture is `min(roof inflow, available capacity)`; 200 m³ is captured and **2,214.6 m³** remains for managed site drainage. No volume-reduction credit is assigned to unspecified treatment.

```text
rainfall = unpartitioned non-surface-runoff residual + captured water + managed drainage
```

The residual is **not groundwater recharge**; it may include storage and later evaporation. The model does not route flows, predict peak rates/floods, establish a lake/ocean/sewer connection or prove compliance. SFPUC's local drainage approach depends on actual service and design [P10]; citywide combined-sewer generalisations are insufficient to identify the Polo footprint's connection. The tank has no annual water-supply credit. A full tank captures zero additional water; an oversized tank cannot capture more than roof inflow.

Quality effects stay qualitative: uncovered ground can generate sediment; concrete washwater needs containment [S12]. No sediment mass, turbidity, receiving-water pH or pollution occurrence is invented.

## 5. Construction and commissioning inventory

These quantities are **authored budgets**, not a real project estimate. The dose remains 1 L/m² per eligible workday for combined dust control/soil wetting. CEC's rough 1,000 US gallons/acre/day is about 0.935 L/m²/day [S11], providing only an order-of-magnitude reference. It does not prove a required compaction moisture or a universal dose. Selected eligible days are net watering workdays, not derived from precipitation normals.

| Step             |            Days | Average active watered m² | Watering m³ | Worker supply m³ |                       Other direct site m³ |
| ---------------- | --------------: | ------------------------: | ----------: | ---------------: | -----------------------------------------: |
| M1 sod stripping |              10 |                     2,000 |          20 |               30 |                                          0 |
| M2 grading       |              30 |                    32,000 |         960 |               90 |                                          0 |
| M3 compaction    |              15 |                    32,000 |         480 |               45 |                                          0 |
| M4 construction  |             160 |                     8,000 |       1,280 |              480 |             168 curing + 60 contained wash |
| M5 commissioning | 10, no watering |                         0 |           0 |               15 | 100 cooling fill + 50 fire fill + 50 flush |

Construction uses 60 average workers × 50 L/workday × 215 days. Commissioning is 30 × 50 L × 10 days. Curing is 12,000 m² × 2 L/m²/day × 7 days, a selected allowance rather than a curing specification. Total dust/soil-wetting water is **2,740 m³**; worker supply **660 m³ including commissioning**. **Direct preopening supply = 3,828 m³.** It is not all evaporative consumption: system fills are initial stocks, wash/flush needs managed discharge, and worker returns are not partitioned.

Selected offsite concrete mixing adds **6,000 m³ concrete × 180 L/m³ = 1,080 m³ water**, giving **4,908 m³ selected preopening inventory**. Concrete quantity and recipe are assumptions, not a measured bill of materials [S17]. Concrete-plant water source is unspecified. This excludes upstream cement/aggregate manufacture, pipe/access works, excavation dewatering and unspecified existing-infrastructure demolition; it is not a whole lifecycle water footprint or proof those activities would need no water.

SJ04's 2025 construction estimate (~4,317 m³) and the separate 2020 San Jose project's estimate (~62,908 m³, dust dominant) illustrate scope differences [S08, S11], not a hectare coefficient. EPA relates dust to soil moisture/fines, activity, traffic and exposed area [S10]. There is **no supported “sports field uses much more dust water than former forest” multiplier**. A wet managed pitch is not a dry ploughed field. Different construction totals between our demos reflect authored areas, programmes and quantities.

## 6. First operating year and the existing irrigation counterfactual

Choose **10 MW average IT**, the same **1.25 L cooling make-up/kWh IT** reference as the original, and CoC = 4 with negligible leaks/drift. SJ04's planned ratio is:

```text
680 acre-feet/year × 1233.48184 m³/acre-foot × 1000 L/m³
/ (76800 kW IT × 8760 h/year) = 1.2467413 L supplied/kWh IT
```

We round to 1.25 [S08]. This is a transferred design ratio, not observed WUE or a validated San Francisco cooling design. No cool-coast weather saving is assumed. The internal closed loop rejects heat through equipment that can evaporate water. DOE supports the make-up/evaporation/blowdown balance [S09].

```text
cooling supply = 10000 kW × 24 h × 1.25 L/kWh / 1000 = 300 m³/day
blowdown = 300 / 4 = 75 m³/day
evaporation = 300 - 75 = 225 m³/day
```

Annual cooling is **109,500 m³ supplied**, **82,125 m³ evaporated**, **27,375 m³ blowdown**. The hypothetical blowdown connection is managed sanitary discharge, not a confirmed Polo utility connection or discharge into a lake. Daily values are annual averages, not hot-day peaks. At authored intensities 0.5/1.25/2 L/kWh, supply is 120/300/480 m³/day; these are illustrative choices, not measured bounds or verified upgrades. Another project, Walsh, specifies air-cooled chillers [S14]; different cooling boundaries prevent treating all data centres as this evaporative case.

### Count the baseline, without inventing meter data

Apply the same **selected gross delivered irrigation allowance of 300 mm/year** (10 mm × 30 applications) to the 4 ha no-build turf and to the final 1.2 ha planted area. This is not ET-derived, not rainfall minus demand, not an irrigation recommendation, and not actual Polo meter data. Its purpose is an explicit, inspectable counterfactual. No avoided irrigation during the undated construction period is credited.

| Annual supplied water | No build: same 4 ha | First full operating year |
| --------------------- | ------------------: | ------------------------: |
| Cooling               |                   0 |                109,500 m³ |
| Building domestic     |                   0 |                  1,095 m³ |
| Selected irrigation   |           12,000 m³ |                  3,600 m³ |
| **Selected total**    |       **12,000 m³** |            **114,195 m³** |

The 8,400 m³ irrigation reduction therefore coexists with a **102,195 m³/year increase in all-source supplied water**. These selected totals exclude existing toilets, other venue amenities, lake fill and offsite park demands; only the authored turf subset's irrigation is the no-build boundary. This is not net consumptive loss or a net city potable-water result.

Cooling/domestic and site construction have a **hypothetical potable connection**. Irrigation is a separately tracked **unverified park supply**; the site-specific split between groundwater, potable or future recycled water is not known. Thus cooling/domestic are 110,595 m³/year of assumed potable supply, while **net potable change remains null**, not zero. We do not deduct the irrigation reduction from that potable subtotal or claim avoided well pumping.

SFPUC's project page checked 24 October 2026 still lists the Westside recycling project under construction with end-2026 completion [P09]. Its FAQ describes a planned park supply transition and groundwater backup; advance signage is not evidence of active deliveries [P08]. Neither source establishes a data-centre connection or spare allocation. Do not assume today's Polo irrigation or the fictional campus already receives recycled water. There is no assumed annual tank offset or shortage/failure animation.

## 7. Handoff and remaining limits

Use [milestones.sk.json](milestones.sk.json) for implementation. It includes exact numeric data, metric definitions, units, area deltas and visible assumptions. Display provenance next to numbers, especially baseline irrigation, soil choice, IT load and cooling intensity. Optional questions cover dust, groundwater, rainfall capture and capacity comparisons. Surface runoff and utility supply must never become one water score.

This packet is closed for the stated water-only educational demo. The wider-story extension adds qualitative shared-system context, not a capacity or downstream-impact model. Unknown stripping-only runoff, actual irrigation-source shares and drainage connection are explicit limits with safe display behaviour. They are not silently filled with zero. Real engineering would require a surveyed site, current soils/underdrains, utility agreements, measured water use, dated programme, material design and hourly cooling/weather calculations. This task does not certify those or assess the public-park development's feasibility.

Independent subagent review accepted this educational data/content packet after one stale schedule note was corrected and rechecked. See [review.md](review.md) for the audit, checks and existing prototype lint/format failures. All 12 original-packet files match the saved [preservation hashes](preservation-sha256.json). AI review is not field validation.
