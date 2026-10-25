# Beyond the site: a simple San Francisco water story

The campus changes rainfall pathways and adds demand to a wider water system. Its footprint, water supply and wastewater do not stop at the site boundary.

English content and visualization brief for the SF scenario only. This extends the existing numerical model with qualitative regional context; it adds no city-capacity, household-shortage or downstream-impact calculation. Product implementation is separate.

## What users see

Keep the existing 3D campus and water card. Add one short context sentence per step and a small schematic strip beside the scene. Highlight only the current pathway. Rainfall arrows appear only during the optional rainfall replay. At M6, show the three cooling flows together. Broader context is visible without opening a detail panel; it never adds a required task.

Continue, Back, camera movement, replay and rainfall controls remain as defined in README.md. One optional About this connection detail explains provenance and uncertainty. Use the prepared questions below; no new sliders, city-management mode, forced decision, free-form chat or extra milestone is required.

## Three simple pathways

### Where delivered water comes from

**Documented context:** SFPUC supplies residents and businesses through regional sources, treatment, storage and city distribution. Hetch Hetchy is part of that system, alongside other sources; supply can originate well beyond the park.

**Our scenario:** The fictional campus uses an assumed potable connection for construction, cooling and domestic water. Its actual service, available reserve and peak-day demand have not been established.

Sources: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system).

### Where rainfall needs to go

**Documented context:** San Francisco manages stormwater through systems whose requirements depend on actual drainage connections and site conditions.

**Our scenario:** Reuse the selected rainfall/runoff and roof-tank calculation. The generic endpoint means water requiring managed drainage, not a verified receiving lake or sewer.

Sources: [P10](https://www.sfpuc.gov/construction-contracts/design-guidelines-standards/stormwater-requirements), [S07](https://www.hydrocad.net/pdf/TR-55%20Manual.pdf).

### Where cooling water goes

**Documented context:** Evaporative cooling divides make-up water between evaporation and managed liquid outflow under the selected balance. Liquid outflow may require treatment and an appropriate discharge route.

**Our scenario:** Use the existing CoC 4 model with negligible drift/leaks. Evaporated water does not return through the local wastewater connection. The sanitary route is assumed; the treatment plant and downstream capacity are unverified.

Sources: [S09](https://www.energy.gov/cmei/femp/best-management-practice-10-cooling-tower-management), [S08](https://efiling.energy.ca.gov/GetDocument.aspx?DocumentContentId=101543&tn=264764).

## One short story beat per milestone

These beats accompany the existing milestone cards automatically. They do not introduce a new timeline or required interaction. All numbers below are model outputs with their original time bases.

### M0 — This place already has a water story.

The turf already needs modelled irrigation, while other city users rely on a wider supply system; the turf water source is unverified.

**Simple visual:** Keep the grass scene. Show the separate irrigation-context label and a small city-supply/other-users icon. No operating-campus arrow.

Sources and mechanism references: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system), [P08](https://www.sfpuc.gov/sites/default/files/documents/Westside_Enhanced_Water_Recycling_Project_FAQ_August_2024.pdf), [P09](https://www.sfpuc.gov/construction-contracts/construction-projects/westside-enhanced-water-recycling-project). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M1 — Work water comes from beyond the boundary.

Work adds a modelled demand to water supplied from outside the site boundary.

**Simple visual:** Highlight the dashed assumed work-water connection. Remove turf as already specified. Do not draw a quantified rainfall outflow.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Water supplied for this work step | 50.0 m³ | entire work step |

Sources and mechanism references: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system), [S10](https://www.epa.gov/sites/default/files/2020-10/documents/13.2.3_heavy_construction_operations.pdf), [S11](https://efiling.energy.ca.gov/GetDocument.aspx?DocumentContentId=65450&tn=232985). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M2 — Disturbed ground changes what drainage must manage.

Preparing the ground increases modelled runoff during this rainfall, leaving more water for drainage to manage.

**Simple visual:** During optional rain, highlight the arrow to a generic managed-drainage endpoint. Add a qualitative sediment-risk cue, never a polluted lake.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Water requiring managed drainage | 1,742.4 m³ | one independent rainfall replay |

Sources and mechanism references: [P10](https://www.sfpuc.gov/construction-contracts/design-guidelines-standards/stormwater-requirements), [S07](https://www.hydrocad.net/pdf/TR-55%20Manual.pdf). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M3 — The same land now has another work-water step.

Compaction adds another work-water requirement, while the same prepared surface still needs runoff management.

**Simple visual:** Highlight work-water supply by default. During optional rain, reuse the M2 drainage result without increasing it again.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Water supplied for this work step | 525.0 m³ | entire work step |
| Water requiring managed drainage | 1,742.4 m³ | one independent rainfall replay |

Sources and mechanism references: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system), [P10](https://www.sfpuc.gov/construction-contracts/design-guidelines-standards/stormwater-requirements), [S07](https://www.hydrocad.net/pdf/TR-55%20Manual.pdf). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M4 — Construction needs supply and controlled waste handling.

Construction needs supplied water, contained washwater handling and water for offsite concrete mixing.

**Simple visual:** Show the work-water arrow and a small contained-washwater icon inside the site. Do not send raw washwater into the drainage arrow.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Water supplied for this work step | 1,988.0 m³ | entire work step |
| Offsite concrete mixing water | 1,080.0 m³ | entire work step |

Sources and mechanism references: [S12](https://www.epa.gov/sites/default/files/2020-02/documents/concretewashout.pdf), [S17](https://www.fao.org/fishery/static/FAO_Training/FAO_Training/General/x6708e/x6708e03.htm), [P12](https://www.sfpuc.gov/about-us/our-systems/water-system). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M5 — Storage helps, while onward drainage still matters.

Roof storage holds part of this rainfall; the remaining volume still needs managed drainage beyond the roof system.

**Simple visual:** During optional rain, split roof inflow into the tank and generic drainage path. Show the neutral service-status note, not a new plant or a blocked-gameplay warning.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Roof capture | 200.0 m³ | one independent rainfall replay |
| Water requiring managed drainage | 2,214.6 m³ | one independent rainfall replay |

Sources and mechanism references: [P10](https://www.sfpuc.gov/construction-contracts/design-guidelines-standards/stormwater-requirements), [P12](https://www.sfpuc.gov/about-us/our-systems/water-system). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

### M6 — Cooling connects supply, evaporation and wastewater.

Cooling adds a regular demand to an assumed supply that also serves other users, with water split between evaporation and managed wastewater.

**Simple visual:** Show supply → campus, campus → sky, and campus → assumed managed wastewater. Keep the other-users icon neutral and the spare-capacity status visible. Rainfall stays a separate optional view.

| Modelled quantity | Value | Time basis |
| --- | ---: | --- |
| Cooling make-up supply | 300,000.0 L/day | average operating day |
| Cooling evaporation | 225,000.0 L/day | average operating day |
| Cooling blowdown | 75,000.0 L/day | average operating day |
| Increase over assumed no-build irrigation | 102,195.0 m³/year | first full operating year |

Sources and mechanism references: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system), [S09](https://www.energy.gov/cmei/femp/best-management-practice-10-cooling-tower-management), [S08](https://efiling.energy.ca.gov/GetDocument.aspx?DocumentContentId=101543&tn=264764), [P08](https://www.sfpuc.gov/sites/default/files/documents/Westside_Enhanced_Water_Recycling_Project_FAQ_August_2024.pdf), [P09](https://www.sfpuc.gov/construction-contracts/construction-projects/westside-enhanced-water-recycling-project). Numerical paths resolve to the existing scenario data, not to measurements in those sources.

## Does this mean a new water plant is needed?

Not established. First distinguish available source water, treatment throughput and delivery capacity in pipes, pumps and storage. If the relevant system cannot serve the additional demand, a response might involve lower demand, another supply or an infrastructure upgrade. A larger treatment plant alone does not create a new water source. This demo does not determine which constraint exists or which response is required.

**Always-visible status at Opening and Operation:** Campus service and spare capacity: not assessed. Household shortages and required infrastructure upgrades: not predicted.

Annual-average campus supply cannot establish a peak-day or drought deficit. Do not show an invented reserve percentage, plant overload or upgrade size.

Context: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system).

## Could recycled water change the story?

It is a local option to investigate. SFPUC describes a Westside project for park irrigation and lake fill, with completion listed for end 2026 when checked on 24 October 2026. This establishes regional context, not an active cooling connection or spare allocation for this campus. The base cooling assumption remains potable supply; irrigation source remains unverified.

Sources: [P08](https://www.sfpuc.gov/sites/default/files/documents/Westside_Enhanced_Water_Recycling_Project_FAQ_August_2024.pdf), [P09](https://www.sfpuc.gov/construction-contracts/construction-projects/westside-enhanced-water-recycling-project).

## Visual rules for David

- The strip is schematic, not a map of buried pipes or a hydraulic service zone. Show a regional-source icon, shared city-supply icon, generic other-users/homes icon, campus, sky, and generic managed-drainage/wastewater endpoints. Reveal only the icons needed for the active step.
- Use a solid connection for documented regional context and a visibly labelled dashed connection for an assumed campus connection or unknown destination. Rainfall and modelled volumes must be labelled Scenario calculation; documented city context must be labelled Regional context.
- Label the homes icon Other city water users. It illustrates shared-system context, not a measured neighbourhood allocation. Do not reduce household water, animate dry taps, lower a reservoir or change river levels.
- Keep rainfall drainage and operating wastewater as separate pathways. Their actual downstream connections are unverified; endpoints may later join a real system, but this demo does not establish that. Do not attach either to a named park lake, creek, ocean outfall or treatment plant.
- Flow arrows explain direction, not pipe sizing, instantaneous flow, pressure or capacity. Replays do not accumulate demand or water loss. Only the roof tank receives an event-volume fill animation.
- Park irrigation has an unverified source. Do not connect the baseline irrigation budget to the assumed potable cooling line or automatically call its reduction a potable-water saving.
- At M0, show the existing setting without an operating data-centre flow. At M1, runoff is unquantified. At M2/M3, use the same coarse runoff result. At M6, the event and average-day operating views retain separate time labels.

## Optional questions

**Will nearby homes have less water?**

The campus adds a modelled demand to an assumed shared supply. We have not established the available reserve or local service conditions, so household shortages are not predicted.

Context: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system).

**Will runoff enter the nearest park lake?**

We have not verified the site drainage route. The model shows the volume requiring management; proximity alone does not establish a lake connection or pollution.

Context: [P10](https://www.sfpuc.gov/construction-contracts/design-guidelines-standards/stormwater-requirements).

**Would an extra treatment plant solve every supply constraint?**

It can address treatment capacity if enough source water and delivery capacity are available. It does not by itself establish a new water source or solve a local pipe constraint.

Context: [P12](https://www.sfpuc.gov/about-us/our-systems/water-system).

## Data handoff and validation

Edit the English `wider-water-story.json`, then run `python3 compute.py`. Metric paths resolve into each existing card's data; the generator supplies stored/display values and checks source IDs, scenario identity and seven-step coverage. Each generated card in `milestones.sk.json` includes an English `wider_context`; the complete story is also at its root `wider_water_story`. Existing Slovak card copy retains its explicit locale; the new brief and story fields are English.

This document is generated. Verify with `python3 compute.py --check`. Refer to [README.md](README.md) for the complete scenario, [results.md](results.md) for the unchanged numerical model and [sources.json](sources.json) for provenance.
