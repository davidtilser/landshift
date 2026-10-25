# Energy methods and assumptions for the Polo Fields demo

## Shared project reference

The frozen water scenario supplies the 4 ha site, 1.2 ha roof, 10 MW average IT load, indirect evaporative cooling concept, 365-day operating year and work-stage schedule. The energy layer adds an electrical-efficiency assumption and selected equipment inventories. It does not resize the campus or modify the water scenario.

The 10 MW is not a maximum design load. Capacity utilization is already implicit in that authored average, so multiplying by another 70% utilization would change the inherited project. Land area and roof footprint do not establish IT capacity or verify a real building fit.

## Operating electrical boundary

Use site electrical energy for the complete hypothetical campus, including IT and supporting systems, under normal grid-supplied operation. With annual electrical PUE 1.20, facility energy equals IT energy multiplied by 1.20. The difference is the combined support budget. No extra cooling, lighting, UPS-loss or water-pumping allowance is added on top.

The selected 1.20 is a transferred SJ04 design average, not a measurement. Its project description derives average/peak design ratios using original project loads and historical weather. Treating its average as an annual energy ratio at our already-average 10 MW is an explicit educational approximation. The original peak PUE and electrical connection are not transferred. [E01, printed pp.7–9 / PDF pp.8–10](https://efiling.energy.ca.gov/GetDocument.aspx?DocumentContentId=101543&tn=264764)

EPA's ENERGY STAR example converts a mixed-fuel building to source energy for scoring. This packet does not copy those multipliers or calculate that score; its budget uses site electricity consistently. [E02, PDF p.9](https://www.energystar.gov/sites/default/files/tools/Data_Center_August_2018_EN_508.pdf)

Reported annual-average MW is annual MWh divided by annual hours. It is not a minimum guaranteed connection size, peak draw, transformer rating, redundant-generator rating or MVA requirement. No annual budget can supply the missing maximum IT load, peak cooling conditions, diversity or power factor.

## Selected construction inventories

All counts and hours below are authored. Stage workdays inherit the water case. Engine-on hours include idling within the stated hourly rate; adding an extra idle allowance would double count that selected time.

| Stage and selected item              | Assumed count | Hours per machine or allowance per workday | Average rate   | Workdays | Basis                                                                                           |
| ------------------------------------ | ------------: | -----------------------------------------: | -------------- | -------: | ----------------------------------------------------------------------------------------------- |
| M1 turf-stripping tractor            |             1 |                                6 engine-on | 5 L/hour       |       10 | Authored teaching rate and activity.                                                            |
| M2 grading excavators                |             2 |                                6 engine-on | 12 L/hour      |       30 | Authored rate anchored to one manufacturer earthmoving example; fleet/productivity unvalidated. |
| M3 compaction roller                 |             1 |                                6 engine-on | 10 L/hour      |       15 | Authored teaching rate and activity.                                                            |
| M4 materials loader                  |             1 |                                4 engine-on | 10 L/hour      |      160 | Authored teaching rate and selected on-site activity.                                           |
| M4 temporary electrical allowance    |     Aggregate |                      8 electrically active | 30 kW average  |      160 | Authored tools, welfare and selected lifting draw, with assumed temporary grid supply.          |
| M5 selected grid commissioning tests |     Aggregate |                      4 electrically active | 500 kW average |       10 | Authored aggregate draw including support; partial testing, not a full commissioning protocol.  |

The Caterpillar reference places the illustrative M2 rate within one manufacturer's stated earthmoving example. It does not validate the other fleet rates, digging productivity, idle treatment, soil quantities or California-compliant equipment selection. [E08, PDF pp.1 and 4](https://s7d2.scene7.com/is/content/Caterpillar/CM20231103-119fd-8ac71)

The scope is the listed items, not a representative sample scaled to all construction. Missing categories stay unknown. In particular, the selected M5 grid allowance says nothing about diesel-generator tests. M4 has electricity and fuel quantities, but no combined kWh-equivalent total. This avoids an unnecessary fuel-energy conversion and prevents generator fuel/output double counting.

These inventories explain the dependence on equipment and time. They do not demonstrate fuel requirements per hectare, construction feasibility, earthwork sufficiency, completed compaction quality or lifecycle dominance. If later research supplies a supported activity inventory, replace the relevant assumed inputs and revise the source/uncertainty copy together.

## Coupled water and energy accounting

The inherited cooling factor is **make-up supplied per IT kWh**, including blowdown. It is not interchangeable with a water-consumption-only WUE. Multiply 87,600,000 IT kWh by 1.25 L/kWh and divide by 1,000 to recover 109,500 m³/year. The source water packet's evaporation/blowdown balance is preserved.

The PUE transfer and water intensity share a technical design reference, but that does not validate an SF annual cooling simulation. The original water ratio already contains its own annual/full-load design simplification. We preserve that explicit approximation rather than adding a coastal-weather saving.

LBNL identifies climate and operating assumptions as important to cooling performance. The June 2026 update overview was checked; its full report was not obtained and no numerical parameters are imported. [E03, printed pp.43–47](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf?stream=top), [E09, update overview](https://datacenters.lbl.gov/publications/united-states-data-center-energy-2025)

A numerical alternative would need compatible equipment/heat-rejection definitions, the same IT service and weather, and paired electricity and make-up estimates. Those are not established here. The optional question explains the design choice while keeping the alternative coefficients null. No other project's dry-cooling water total is treated as a controlled comparison.

## Regional interpretation

The source-backed SF context is application/service assessment, supply versus delivery, possible connection works, and shared regional demand. It is enough for a short wider story. City-owned-property application requirements do not establish that a public-park datacentre is permissible or has been offered power. [E04](https://www.sfpuc.gov/hetch-hetchy-power)

The neighbourhood branch is schematic. No named local substation, feeder headroom, household displacement, tariff increase, outage probability or required reinforcement is derived. CAISO explains broad planning roles; site load interconnection remains a utility matter. [E06](https://www.caiso.com/generation-transmission/load/large-loads)

The CEC describes increased summer air-conditioning demand. This contextual mechanism does not quantify the campus's hourly response, identify a local shortage or establish that a hypothetical campus caused an existing event. Rainfall and drought do not automatically rescale annual electricity. [E07](https://www.energy.ca.gov/data-reports/california-energy-planning-library/reliability/summer-reliability)

## Evidence and future extension

Source metadata and verbatim snapshots are in [sources.json](sources.json). Hash-checked inheritance and the preservation manifest protect existing water packets. Public sources are reference material; no external-source text is executed by generation.

The first packet intentionally excludes emissions, tariffs, embodied energy, upstream water, batteries, solar sizing and heat-reuse revenue. Add those only as separate, explicitly bounded extensions. Site-level engineering would additionally require a surveyed layout, equipment schedule, utility study, peak demand and commissioning design.
