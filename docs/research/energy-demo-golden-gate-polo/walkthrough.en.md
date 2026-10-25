# Seven energy milestones for Golden Gate Park Polo Fields

Open at M0. Show each change and its short energy/wider-context card automatically; advancing remains user-controlled.

Read each figure with its unit, time basis and evidence label. All stage budgets are selected teaching inventories. The city-network strip is schematic.

## M0 Today — an existing sports field

**Automatic scene:** Show the same managed turf, tracks and perimeter trees as the water scene. Keep the campus inactive.

**What changes:** The selected 4 ha is currently modelled as managed sports turf.

**Why:** Mowing, irrigation and existing facilities can use energy before any campus is built.

**Meaning:** The campus electricity budget must not be described as the measured net increase over today.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| site_area_m2 | 4 ha | site footprint; Inherited authored area |

**Visible assumptions:** 4 ha authored subset; no trees removed. Unknown maintenance energy is not zero.

**Limits:** Current park electricity, maintenance fuel and the exact electrical connection are not established.

**Beyond the site:** Nearby homes and park facilities already use electricity. Their individual feeders are not mapped here.

**Status:** Regional context; existing local topology unknown.

**Evidence:** W01, E04, E05 in [the source registry](sources.json).

## M1 Site preparation — remove turf

**Automatic scene:** Animate one generic tractor stripping sod on the existing 3.2 ha work area.

**What changes:** Machinery begins consuming fuel during turf removal.

**Why:** An engine needs fuel while working and idling; machine hours matter as well as land area.

**Meaning:** This is a selected work-stage fuel allowance, separate from future server electricity.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| stage.selected_diesel_l | 300 L diesel | selected inventory during this work stage; Illustrative selected machinery allowance |

**Visible assumptions:** 1 tractor × 6 engine-on hours/day × 10 workdays. 5 L/hour authored average including idling.

**Limits:** The fleet, five-litre hourly rate and operating hours are teaching assumptions, not observed park works.

**Beyond the site:** Fuel is supplied to the work site; offsite fuel transport and production are outside this inventory.

**Status:** Selected on-site fuel only.

**Evidence:** W01 in [the source registry](sources.json).

## M2 Site preparation — grade the ground

**Automatic scene:** Animate two schematic excavators on the already stripped area.

**What changes:** Earthmoving adds another selected fuel allowance.

**Why:** The demo multiplies machine count, engine-on hours and hourly fuel use.

**Meaning:** The quantity illustrates an equipment inventory; it does not establish fuel per hectare for every development.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| stage.selected_diesel_l | 4,320 L diesel | selected inventory during this work stage; Illustrative selected machinery allowance |

**Visible assumptions:** 2 machines × 6 engine-on hours/day × 30 workdays. 12 L/hour transferred illustrative rate; not a California equipment specification.

**Limits:** One manufacturer example anchors the rate, but grade volumes, productivity and the actual compliant fleet are unvalidated.

**Beyond the site:** Earthmoving fuel is a different energy pathway from the electrical network serving homes.

**Status:** No household-supply effect modelled.

**Evidence:** W01, E08 in [the source registry](sources.json).

## M3 Site preparation — compact the ground

**Automatic scene:** Animate a generic roller on the same 3.2 ha; do not remove more turf.

**What changes:** Compaction consumes fuel without changing the selected future IT demand.

**Why:** Construction activity and eventual server use have different drivers.

**Meaning:** Another work-stage inventory is added; no permanent operating-power penalty follows from roller passes.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| stage.selected_diesel_l | 900 L diesel | selected inventory during this work stage; Illustrative selected machinery allowance |

**Visible assumptions:** 1 roller × 6 engine-on hours/day × 15 workdays. 10 L/hour authored average including idling.

**Limits:** Roller consumption and hours are authored. Soil-water and compaction quality are not predicted by this energy allowance.

**Beyond the site:** The fuel budget grows during works while the permanent electricity connection remains unassessed.

**Status:** Connection and spare capacity not assessed.

**Evidence:** W01, E06 in [the source registry](sources.json).

## M4 Construction — temporary electricity and handling

**Automatic scene:** Build the inherited 1.2 ha roof blocks; show a schematic temporary cable and generic materials loader.

**What changes:** Selected building work uses both electricity and diesel.

**Why:** Tools, welfare and selected lifting need electricity; a loader uses fuel for on-site handling.

**Meaning:** A temporary supply is distinct from the long-term campus connection. Both need appropriate arrangements.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| stage.selected_electricity_kwh | 38.4 MWh | selected inventory during this work stage; Authored selected electrical allowance |
| stage.selected_diesel_l | 6,400 L diesel | selected inventory during this work stage; Illustrative selected machinery allowance |

**Visible assumptions:** 160 authored workdays. 30 kW average × 8 hours/day; loader 10 L/hour × 4 hours/day. Temporary grid supply is a scenario assumption.

**Limits:** The selected allowances omit other plant, transport, material manufacturing and offsite utility construction.

**Beyond the site:** If connection works are required, cables or other infrastructure could extend the project effects beyond the campus. Their extent is unknown.

**Status:** No cable route, reinforcement or neighbourhood disruption predicted.

**Evidence:** W01, E04, E06 in [the source registry](sources.json).

## M5 Opening — commission the equipment

**Automatic scene:** Reveal schematic switchgear and cooling equipment; pulse only the selected grid-testing pathway.

**What changes:** Selected electrical tests occur before the operating year.

**Why:** A short commissioning programme does not mean the campus has already used a full year of electricity.

**Meaning:** The testing budget is one-time and separate from normal operation. Standby tests require their own fuel inventory.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| stage.selected_electricity_kwh | 20 MWh | selected inventory during this work stage; Authored selected electrical allowance |

**Visible assumptions:** 500 kW aggregate average × 4 hours/day × 10 workdays. Support draw is already inside the allowance; no extra PUE applied.

**Limits:** The 500 kW grid test allowance is authored; complete acceptance tests and generator fuel remain unknown.

**Beyond the site:** A real opening would depend on agreed service and electrical readiness. The demo timeline does not establish approval or energization.

**Status:** Illustrative future; actual service and capacity unassessed.

**Evidence:** W01, E04, E06 in [the source registry](sources.json).

## M6 Operation — servers and supporting systems

**Automatic scene:** Start schematic servers. Split incoming electricity into IT and supporting systems; show inherited cooling make-up and blowdown beside it.

**What changes:** The campus now has a full-year normal-operation electrical budget.

**Why:** IT uses electricity; cooling, electrical losses and other supporting systems add to the facility budget.

**Meaning:** At the selected PUE, supporting systems add 20% to IT electricity and make up one-sixth of facility electricity. This is not a cooling-only measurement.

| Primary metric | Display | Time basis and evidence |
| --- | --- | --- |
| operation.average_facility_mw | 12 MW | annual average, not peak; Derived with transferred design PUE |
| operation.facility_electricity_mwh_year | 105.12 GWh/year | first full 365-day normal operating year; Derived with transferred design PUE |
| operation.non_it_electricity_mwh_year | 17.52 GWh/year | same operating year; all supporting systems; Derived overhead, not cooling alone |

**Visible assumptions:** 10 MW average IT; no further utilization multiplier. Annual electrical PUE 1.20; 365 days. Cooling make-up 1.25 L/kWh IT; annual averages, not hot-day peaks.

**Limits:** The transferred PUE is a design-based teaching assumption. Peak demand, local headroom and actual Polo performance are unknown.

**Beyond the site:** A new continuous demand must be assessed alongside other users. Electricity procurement and network delivery are different; annual averages cannot prove spare capacity or household shortages.

**Status:** Network capacity and household effects not assessed.

**Evidence:** W01, E01, E03, E04, E05, E06 in [the source registry](sources.json).
