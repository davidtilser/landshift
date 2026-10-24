# Consequence sandbox

The game combines the local San José map with authored teaching rules. It is an operational design sandbox with cooling, planting and restoration choices; the narrower site-preparation presentation in [the experience proposal](san-jose-datacentre-experience.md) remains a separate demo direction.

## Playable loop

1. Place or rotate the illustrative campus. Check the mapped footprint conflicts.
2. Follow three short steps: **Cool it → Add nature → Share**. Spend a fictional 100-credit upgrade allowance on the choices.
3. Switch between dry summer, heatwave and heavy rain tests. Inspect Now, Year 5 and Year 10.
4. **See it in 10 years** shows a short, plain-language payoff: less water, the electricity trade-off, growing trees and shared benefits. The fixed reference and current sketch use the same weather and year; the numeric comparison is optional.
5. Save up to three experiments in this tab and restore them to explore alternatives.
6. Optionally record a preference, reason, accepted compromise and question for a planner. These notes stay in memory and with saved experiments for this tab; a reload clears them. Nothing is transmitted, scored or treated as community agreement.

The reference is our illustrative campus at the starting location with evaporative cooling and no upgrades. It is **not the applicant's engineering proposal**. Moving the campus changes the current site's GIS checks; the reference site remains fixed. Comparisons preserve the map camera. Saved experiments retain their own weather selection, which is shown beside them.

The main map uses everyday labels such as “Water-wise,” “Uses more power” and “Growing.” Numeric indices, equations, source links, alternative weather tests and the longer reflection are optional details. There is no mandatory quiz.

## What comes from GIS

The complete 184 × 112 m campus pad, including the space between the buildings, is checked against OSM-derived building footprints and water polygons, city park/trail-corridor polygons, the city street-tree inventory, and flood polygons with `SFHATF = T`. Swimming pools are excluded from the waterbody warning. Record fragments with matching IDs are deduplicated.

These are intersections with downloaded data, not verified displacement, current site conditions, permission to build, flood depths, or an exhaustive constraint analysis. City street-tree records exclude many trees on private land. A mapped flood exposure remains visible regardless of restoration. Building, waterbody and park overlaps remain conflicts regardless of upgrades.

## Authored assumptions

Every coefficient below is a **game-design assumption**. Sources establish the mechanisms; they do not supply or validate these site-specific numbers.

### Resources

The same computing service is retained across all cooling options: illustrative 24 MW IT capacity × 70% average load = 16.8 MW average IT demand.

| Cooling     | Upgrade credits |  PUE | Direct water, L/kWh IT |
| ----------- | --------------: | ---: | ---------------------: |
| Evaporative |               0 | 1.25 |                    1.8 |
| Hybrid      |              32 | 1.35 |                    0.6 |
| Dry         |              44 | 1.48 |                   0.03 |

- Daily cooling water (m³) = average IT MW × 24 × water factor × scenario multiplier.
- Establishment irrigation adds 0.008 m³ per planted tree per day at Year 0, then 0.003 m³ per planted tree per day.
- Annualized electricity (GWh) = average IT MW × PUE × scenario multiplier × 8,760 ÷ 1,000.
- Heatwave: water × 1.3; electricity × 1.06, 1.10 or 1.18 for evaporative, hybrid or dry.
- Dry summer: water × 1.12. Heavy rain uses the unmodified coefficients.

Water is rounded to whole m³/day and electricity to 0.1 GWh/year. Annualization describes a consistent stress-test condition; it is not a forecast of a whole year of weather. Indirect water for electricity generation, supply sources, grid emissions, capacity, operating costs and detailed cooling engineering are excluded.

### Landscape and community choices

| Choice                  | Credits | Meaning                                             |
| ----------------------- | ------: | --------------------------------------------------- |
| 24 / 60 native trees    | 14 / 30 | Planting and care included                          |
| Native meadow           |      18 | Proposed habitat and soil-recovery opportunity      |
| Rain garden             |      28 | Proposed planting and runoff-management opportunity |
| Paid local training     |      12 | Fictional commitment to 12 paid places per year     |
| Community walking space |      10 | Proposed accessible space outside the secure campus |

Credits are deliberately fictional resource constraints, not currency, land prices or engineering costs. A negative balance is allowed during exploration but fails the budget goal. The model does not predict employment, eligibility or economic returns.

Tree survival in the stress test is 82% in drought and 90% otherwise. Surviving count = rounded planted count × survival. For indices, canopy growth is 0.12 / 0.55 / 1 at Years 0 / 5 / 10. Restoration recovery is 0.2 / 0.65 / 1. The 3D crown scale is schematic (0.25 / 0.6 / 1), so saplings remain visible; this is not a biological tree-growth model.

Planned planting surrounds the movable campus. A schematic 38 × 140 m restoration patch and a 7 × 140 m walking strip illustrate the selected interventions. These are **proposals**, not detected restoration sites or approved public access. Greening extensions are not checked for ownership, environmental suitability, conflicts, setbacks or available land. The geometry is not used to claim a verified restored area or quantified ecological gain.

### Individual game indices

All indices are rounded and clamped to 0–100. They are neither physical units nor measured biodiversity, health, temperatures or public approval.

Let `T` be surviving trees, `g` canopy growth, `r` restoration recovery, `E` street-tree records in the pad, `B` building overlaps, and `C` be 1 if the pad intersects a waterbody or park, otherwise 0.

- Shade = `T × g × 1.3`.
- Nature = `18 + T × g × 0.65 + habitat × r − E × 4 − C × 25`. Habitat = 40 for meadow, 32 for rain garden, 0 otherwise.
- Runoff = `88 − infiltration × r − T × g × 0.25`. Infiltration = 56 for rain garden, 30 for meadow, 0 otherwise. Lower is better.
- Local benefits = `28 + training × 25 + access × 20 + shade × 0.18 + restoration × 8 × r − B × 12 − E × 2 − C × 20`. Boolean choices are 0 or 1.

No universal project score combines these values. A four-goal challenge indicator counts game objectives met:

1. Drought: direct water ≤ 300 m³/day; heatwave: shade ≥ 45; heavy rain: runoff ≤ 45.
2. Nature ≥ 55.
3. Local benefits ≥ 60.
4. No mapped building/waterbody/park footprint conflicts and spending ≤ 100 credits.

Meeting those targets is not an approval or a verdict that one project is best. Flood warnings remain visible even when all game goals are met. The player can prefer the reference, their alternative, or more evidence.

## Evidence behind the mechanisms

- [LBNL, 2024 United States Data Center Energy Usage Report](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf): cooling equipment, water and energy use, and climate-dependent trade-offs.
- [EPA, Benefits of Trees and Vegetation](https://www.epa.gov/heatislands/benefits-trees-and-vegetation): shade, evapotranspiration, habitat and community co-benefits.
- [EPA, Green and Gray Infrastructure Research](https://www.epa.gov/water-research/green-and-gray-infrastructure-research): stormwater capture and filtration, and the need for appropriate design and maintenance.

Ecological recovery, soil condition, flood protection, emissions, desertification and community agreement are not predicted by these game indices. Preserving an unbuilt area alone does not establish any of those outcomes.

## Verification

`consequences.test.ts` tests resource trade-offs, delayed growth, heat stress, persistent siting conflicts, non-cancellation of flood exposure, training/resource separation, and multiple feasible game strategies. Existing campus movement and rendering regression tests remain in place. Browser verification covers the choice → visible map change → comparison → revision loop.
