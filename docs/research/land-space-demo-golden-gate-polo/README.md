# Golden Gate Park: land and space

English content and 3D handoff for the **same fictional 4 ha Polo Fields campus** as the [water](../water-demo-golden-gate-polo/README.md) and [energy](../energy-demo-golden-gate-polo/README.md) packets. This adds a land-and-space perspective to their preserved M0–M6 analytical snapshots. It reuses their exact surface areas; it does not propose another layout or change their calculations.

The learning question is **“What does the development occupy, what changes on the ground, and which original uses does a green-looking campus fail to preserve?”** Surface accounting is quantitative. Soil condition, recreation and access implications are explained qualitatively, with unknowns retained. A separate authored construction-access overlay shows temporary path closures, vehicle wear and subsequent surface repair beyond the campus; it adds no measured area or resource totals.

Follow the shared [cross-topic transition pack](../transitions-demo-golden-gate-polo/README.md) for how these states develop alongside water, electricity and the proposals. **L1** covers one disturbance becoming a permanent allocation; **L2** covers temporary access wear and repair; **C1** connects changing community questions. Earlier-state navigation restores a comparison snapshot rather than reversing physical damage.

The [verifiable transition table](transition-checklist.en.md) gives stable **SF-L1** and **SF-L2** IDs, triggers, visible changes and pass criteria for implementation and later QA. It includes barrier-before-vehicle ordering, persistence during works, explicit reopening/repair and recovery labels. Shared navigation checks are linked from the table. Engine verification is **Not run** until evidence is recorded for a tested build.

## For David: milestones, defaults and user actions

**Active UI direction:** use **Today → Foundations → Structure → Ready → Operating**. Preparation is a short sequence inside Foundations, which settles with slabs visible; Structure raises frame and roof; Ready finishes walls, grounds and commissioning. This five-chapter direction supersedes the earlier seven-stop presentation. See the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases) for chapter bindings and unquantified foundation-only budgets.

### Current five-chapter land story

| Visible chapter  | Land and space story                                                                      | Accounting boundary                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today (M0)       | Original sports turf and existing users.                                                  | The same authored 4 ha campus boundary.                                                                                                                                            |
| Foundations (M1) | Brief turf removal, grading and compaction, then visible slabs.                           | One 3.2 ha disturbance and 0.8 ha retained turf. The new 1.2 ha slab footprint is visual geometry, not the original stripping-only M1 allocation or a new soil/runoff calculation. |
| Structure (M4)   | Frame and roof rise from the completed foundations.                                       | Original M4 allocation: 1.2 ha roofs, 2 ha bare works and 0.8 ha retained turf. Slabs and roofs share one footprint; never count both as additional land take.                     |
| Ready (M5)       | Finish the grounds and reveal building versus whole campus, then the original sports use. | Final 2.8 ha sealed and 1.2 ha vegetated ground. Distinguish 0.8 ha retained from 0.4 ha restored vegetation.                                                                      |
| Operating (M6)   | The campus stays while water and electricity recur; proposals become available.           | Same final area as Ready. Greener appearance or a proposal benefit does not restore public sports use automatically.                                                               |

`presentation.chapters` in the generated [handoff](milestones.en.json) explicitly binds these five chapters. The separate `milestones` array keeps the seven original analytical snapshots, with its original areas and unknowns unchanged. The new Foundations checkpoint must not load the original stripping-only M1 card as its complete physical state.

### Original analytical reference snapshots

The seven rows below are preserved analytical reference snapshots, not seven selectable stops. Original M1 means stripping-only in this research packet; runtime M1 means the new Foundations checkpoint. M2/M3 remain optional prepared-ground research comparisons. The land reveal belongs to Ready; proposal exploration belongs to Operating. Investigations are optional.

| Milestone             | Default scene and figures                                                                                                                              | Meaning and wider implication                                                                                                                                         | Optional user action                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **M0 Today**          | Highlight the **4 ha managed sports-turf subset**. Show surrounding tracks and trees as context outside the works.                                     | The place already has recreational use. The selected footprint is an authored teaching area, not an approved or surveyed parcel.                                      | Inspect the boundary and existing-use explanation.                                                    |
| **M1 Turf stripping** | Remove **3.2 ha** of turf; retain **0.8 ha**. Keep the stripped ground visibly different from finished paving.                                         | Vegetation removal starts the transformation before any building appears. The worked area is not yet sealed.                                                          | Replay removal or compare original and retained cover.                                                |
| **M2 Grading**        | Grade the same **3.2 ha**, with **0.8 ha** retained. Do not expand the boundary.                                                                       | Earthworks reshape already disturbed ground. Reworking it does not take another 3.2 ha.                                                                               | Inspect a qualitative ground section or return to M0.                                                 |
| **M3 Compaction**     | Roll the same **3.2 ha**; retain **0.8 ha**.                                                                                                           | Soil condition can change while area stays constant. No density, infiltration or additional runoff change is quantified.                                              | Replay the roller or open the explanation of unchanged area totals.                                   |
| **M4 Construction**   | Raise **1.2 ha** of building/roof footprint; **2 ha** remain bare construction ground and **0.8 ha** remain turf.                                      | The building is only part of the campus. This is a construction snapshot, not the final road layout or total floor area.                                              | Toggle building footprint versus the full site.                                                       |
| **M5 Opening**        | Show **2.8 ha sealed**: **1.2 ha roofs + 1.6 ha other hard surfaces**. Show **0.8 ha original turf retained + 0.4 ha restored vegetation** separately. | Supporting roads, yards and infrastructure also use space. Restored planting does not establish restoration of the original sports use or soil functions.             | Inspect the four final surface categories or compare with M0.                                         |
| **M6 Operation**      | Keep the M5 allocation fixed. Detail: **70% sealed, 30% vegetated ground**, of the authored campus.                                                    | Recurring water/electricity use accompanies continued occupation of the land. Vegetation inside the campus does not establish public access or a usable sports field. | Use the before/after overlay, explore the community question or enter the existing proposal selector. |

Reuse Continue, Back, direct milestone selection, replay/skip, orbit/zoom/reset and optional details. Add a **Before/after surfaces** overlay and a **Building / Whole campus** emphasis toggle. These change the view, not the design. A milestone jump must restore the complete surface allocation and the matching temporary-access state described below. Replaying animations never increases land take.

## Temporary construction access and recovery

**Authored demo assumption:** heavy construction vehicles use a schematic park access corridor. Temporarily close the affected path segment to ordinary park users while it serves construction traffic, with barriers and a signed illustrative diversion. Show some grass at an access verge becoming flattened, worn and locally bare through repeated vehicle movement. The selected closure, route, diversion and wear patch are proposed scene elements, not an actual park traffic-management plan or observed damage.

The following five rows bind the proposed access story to the visible chapters. Preparation does not add extra timeline points. These remain authored visual requirements; the research acceptance registry does not claim every overlay is implemented or browser-verified.

| Visible chapter  | Proposed temporary overlay                                                                                                                                             | Boundary                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Today (M0)       | Paths open; no barriers or vehicle-wear patch.                                                                                                                         | Original comparison.                                                                                                           |
| Foundations (M1) | Before the first heavy vehicle, introduce schematic barriers/diversion and possible verge wear. Keep them through the short preparation sequence and foundation works. | No route permission, measured wear area or closure duration is established.                                                    |
| Structure (M4)   | Keep temporary restriction and wear visible while building works continue.                                                                                             | The same external overlay; no accumulating damage counter.                                                                     |
| Ready (M5)       | End heavy access as an authored handover beat, remove temporary barriers, reopen the schematic path and begin repair/seeding.                                          | Safe real reopening requires a site-specific handover plan; repair is a task, not an automatic result of switching on servers. |
| Operating (M6)   | Optional labelled time-compressed surface revegetation while the permanent campus remains.                                                                             | No recovery duration, full soil recovery or restored recreational capacity is claimed.                                         |

The visual contrast is **barriers and vehicle tracks appear early, then the path reopens and the verge becomes green again, while the campus stays**. Let the same camera frame include the temporary corridor and permanent site boundary. This distinguishes an impact that is intended to be repaired from the ongoing occupation of land. It gives David's community layer a concrete scenario concern: **“How will I get through the park during construction, and what will be repaired afterwards?”**

Keep the overlay labelled **Illustrative construction access and repair**. Select no real road name, closure length, detour distance, damaged hectares or repair cost. Grass wear is a qualitative scenario possibility, not an inevitable consequence of every machine journey. No tree damage is proposed. The recovery replay has no selected real-world duration or guarantee of success; avoid an instant mature lawn at M5.

**Accounting boundary:** this illustrative external verge patch is separate from the campus's existing **0.4 ha restored vegetation** and **0.8 ha retained turf**. Do not damage the retained turf while continuing to call it undisturbed, subtract external repair from the sealed footprint, or add the patch to the 4 ha surface budget. The 3.2 ha disturbed figure covers the campus only; total project disturbance including access remains unquantified. External access effects on water, fuel and soil are unquantified, not zero. Quantifying this overlay later requires new geometry and compatible updates to the relevant resource budgets.

## The surface budget and its interpretation

All values below are **authored scenario areas**, inherited from the canonical water scenario. They are not measurements of actual development, habitat or access at the park.

| Ground allocation at completion   |         m² |      ha | Share of campus |
| --------------------------------- | ---------: | ------: | --------------: |
| Original turf retained            |      8,000 |     0.8 |             20% |
| Building roofs / ground footprint |     12,000 |     1.2 |             30% |
| Other impervious surfaces         |     16,000 |     1.6 |             40% |
| Restored vegetated ground         |      4,000 |     0.4 |             10% |
| **Total campus**                  | **40,000** | **4.0** |        **100%** |

**Three different quantities must stay distinct:**

- **3.2 ha disturbed within the campus:** unique ground worked since M1, including land subsequently built over or restored. It is not added again at grading, compaction or construction. It excludes the unquantified external access overlay.
- **2.8 ha sealed at completion:** roofs plus other hard surfaces, or 70% of the campus. This is a cover classification, not a measured infiltration rate.
- **1.2 ha vegetated ground at completion:** 0.8 ha retained plus 0.4 ha restored. Compared with 4 ha initially, vegetated ground decreases by 2.8 ha; this is not a quantified habitat loss or a count of lost pitches.

The 1.6 ha supporting-surface allowance includes internal roads, yards, utilities and storage infrastructure. Their subdivision and exact geometry are not specified. An artist may depict schematic components within that allowance; do not invent additional measured road areas or place them on existing perimeter tracks. Roof footprint is not gross floor area. The independently authored 10 MW average IT load is not inferred from hectares or validated building fit.

## Visual reveal and the wow moment

Use a short sequence of three reveals rather than relying on area counters or surface recolouring alone. The primary visual surprise is the campus footprint; the other beats connect it to recreation and the existing water explanation. These are presentation beats inside the existing timeline, not new milestones.

### 1. Reveal the whole campus — primary demo moment

At **Ready (runtime M5)**, briefly overlay a translucent **1.2 ha building outline** on the original turf. Then reveal the completed building and pull the camera back slightly as internal roads, yards and supporting surfaces appear around it. Finish by highlighting the full **4 ha campus boundary**. Keep the boundary recognisable through the reveal so the camera movement cannot be mistaken for a change of site.

Show the short caption **“The building is only part of the space the project needs.”** The **Building / Whole campus** toggle lets the user repeat the contrast, emphasising either the 1.2 ha building or the entire 4 ha allocation. Finish with a labelled overlay of 2.8 ha sealed ground, 0.8 ha retained turf and 0.4 ha restored vegetation. This ratio belongs to our authored campus, not every datacentre.

### 2. Reveal the original recreational use — community connection

After restored planting appears, briefly ghost the original turf and schematic sports markings through the completed campus, using the same footprint and camera. Let the learner see where the proposed buildings and hard surfaces overlap the former playing surface. Keep retained turf and restored planting distinct.

Show **“Could people still use this space as before?”** and offer the related community perspective. The ghosted markings are an explanatory reference, not a surveyed pitch layout or a calculated loss of playing fields. Temporary construction barriers belong to the explicitly authored access overlay above; do not present them as evidence of a permanent closure or surveyed public-access loss. Completed-campus public access, safe playable space and replacement provision remain questions to assess.

### 3. Replay the same rain — connection to water

Offer **Replay the same rain** after the spatial reveal, using the existing water replay for **Today (M0) versus Ready (M5)**, with the same camera, authored footprint and recorded **86.4 mm rainfall input**. Use a before/after switch or wipe; keep the selected rain conditions identical. The contrast connects changed surfaces to the previously calculated runoff and roof-storage pathways.

Reuse the water packet's results and qualifications. The rainfall depth is observed at the reference station; the displayed site response is modelled, not observed Polo Fields runoff. Rain streaks and flow particles remain illustrative unless driven by a supported output. Do not infer local flood depths, street flooding or peak flow, and do not recalculate runoff from the new land percentages. Keep rain replay separate from recurring annual operating-water use.

**Demo priority:** play the building-to-campus reveal once by default at Ready (M5), with skip/replay available. Follow with the brief recreation overlay and question; opening the community detail is optional. Offer the rain comparison as the preferred next investigation, not an automatic milestone jump or a required task. If presentation time is short, prioritise the campus reveal and rain comparison. At Operating (M6), keep all three available through replay without adding new land disturbance or resource use.

The before/after view should use the same footprint and camera. Colour plus labels or patterns distinguish original turf, stripped ground, graded ground, roofs, other hard surfaces and restored planting. A soil cutaway may explain preparation qualitatively, but it must not imply measured compaction depth, density, soil-carbon loss or subsurface damage. New planting should not suddenly look like an established mature ecosystem.

## Connection to communities and other topics

Use one simple community prompt: **“Some ground is green again, but can people still use this place as before?”** The original sports use and future campus use compete for the same space. Shape, safe access and management matter in addition to surface colour. Retained turf is not automatically retained recreational capacity.

David's community layer can attach labelled scenario perspectives, such as a sports user asking about replacement space or a park visitor asking about access. They are not quotes, surveyed preferences, consent or proof of a real closure. Do not calculate displaced visitors, lost playing fields, walking detours, public-access hectares or replacement capacity from these surface areas. Those require a selected layout, access policy and use data.

The water layer already explains runoff from the same surface classes. The energy layer explains construction and operation. Link to those explanations without adding new resource penalties or counting the same work twice. The heat-reuse proposal may introduce a schematic external trench; its route and disturbed area are unselected and **outside this 4 ha surface budget**, not zero. Recycled-water and green-roof concept previews retain their rule of hiding all numerical panels, including this land overlay.

## Evidence and boundaries

The [canonical water scenario](../water-demo-golden-gate-polo/scenario.json) supplies every milestone area. Its [source registry](../water-demo-golden-gate-polo/sources.json) records the official local context:

- [SF Recreation & Parks venue listing](https://sfrecpark.org/877/Golden-Gate-Park---Polo-Field): venue extent, not a buildable or grass-only boundary.
- [Official field map](https://www.sfrecpark.org/DocumentCenter/View/19734/Polo-Fields-PDF): historical aerial reference supporting a sports-turf setting within tracks, with trees outside. It is not a current survey.
- [Facility description](https://www.sfrecpark.org/Facilities/Facility/Details/Polo-Field-419): context for existing athletic use. This pack inherits the prior packet's evidence review; it does not assert a new site survey.

The scenario strips turf, **not forest**. The 4 ha subset is schematic and is not the whole venue. Existing perimeter trees, tracks and stands remain outside the quantified campus works. The temporary-access overlay may illustrate path restrictions and verge repair outside that boundary, without converting those paths into campus hardstanding. There is no new tree-removal claim, quantified external footprint, drought/temperature/biodiversity/carbon model, restoration timetable or proof of soil recovery. The model's good-cover vegetation category is an accounting assumption, not evidence of instant recovery at opening. Keep measured public access, playable area and external construction quantities **Not established**, never zero.

## Files and verification

- `compute.py` reads the canonical SF water scenario without modifying it and derives the English handoff. It uses Python's standard library and requires that sibling packet.
- `milestones.en.json` contains an explicit five-chapter `presentation` binding plus seven preserved analytical surface snapshots, primary metric paths, default copy, optional questions, scene rules, explicit unknowns and the source file's SHA-256 hash. Areas are m²; divide by 10,000 for hectares. Shares always use the 4 ha campus denominator.

```sh
python3 docs/research/land-space-demo-golden-gate-polo/compute.py
python3 docs/research/land-space-demo-golden-gate-polo/compute.py --check
```

Validation requires nonnegative disjoint surfaces totalling 40,000 m² at every milestone, the same 32,000 m² disturbed from M1 onward, unchanged M2/M3 area accounting, identical M5/M6 land allocation and the final 28,000 m² sealed / 12,000 m² vegetated balance. Formatting and local links should be checked with the documentation. No baseline inputs, water/energy results, community implementation or proposal calculations are changed by this packet.
