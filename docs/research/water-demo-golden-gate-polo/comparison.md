# San José woodland and Polo Fields: what can be compared?

> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

These are two separate authored demos. The original 10 ha woodland packet is separate research; [this alternative](README.md) changes the setting to a smaller grass subset of Polo Fields. This document retains a checked snapshot of the comparison, so the separate packet is not needed to read these tables or reproduce the SF calculations. Neither is a real proposed development. Figures below come from each packet's frozen `scenario.json` and generated `results.json`, checked on 24 October 2026. Source IDs refer to each packet's own registry.

## Selected demos side by side

| Quantity                                                              |                      Original: San José / Los Gatos |                          Alternative: SF / Polo Fields |
| --------------------------------------------------------------------- | --------------------------------------------------: | -----------------------------------------------------: |
| Authored total campus                                                 |                                               10 ha |            4 ha, a subset of the ~9.97 ha listed venue |
| Initial cover                                                         |                                   Woodland analogue |                      Managed natural-grass sports turf |
| Removed cover                                                         |                                       8 ha woodland |                           3.2 ha turf; no tree removal |
| Final roofs / other impervious / restored / retained                  |                                    3 / 4 / 1 / 2 ha |                               1.2 / 1.6 / 0.4 / 0.8 ha |
| Selected soil group                                                   |                                C, regional analogue |       B, illustrative choice without field soil survey |
| Soil alternatives                                                     |                                               B/C/D |                                                A/B/C/D |
| NOAA reference station                                                |                               Los Gatos USC00045123 |                  SF Downtown USW00023272, ~5.8 km east |
| Rounded monthly normal sum, 1991–2020                                 |                                       563.7 mm/year |                                          581.4 mm/year |
| Daily recorded rain, observation 2014-12-11                           |                                             74.2 mm |                                                86.4 mm |
| Baseline generated runoff in that replay                              |                                          1,704.3 m³ |                                               537.6 m³ |
| Final generated runoff before tank                                    |                                          5,341.5 m³ |                                             2,414.6 m³ |
| Empty roof-tank capacity / event capture                              |                                        500 / 500 m³ |                                           200 / 200 m³ |
| Final event volume to managed drainage                                |                                          4,841.5 m³ |                                             2,214.6 m³ |
| Construction workdays, excluding commissioning                        |                                                 270 |                                                    215 |
| Direct site supply before opening                                     |                                           11,195 m³ |                                               3,828 m³ |
| Selected offsite concrete mixing                                      |                                            2,700 m³ |                                               1,080 m³ |
| Selected preopening inventory                                         |                                           13,895 m³ |                                               4,908 m³ |
| Authored average IT load                                              |                                               20 MW |                                                  10 MW |
| Selected supplied-cooling intensity                                   |                                       1.25 L/kWh IT |                                          1.25 L/kWh IT |
| Average daily cooling supply / evaporation / blowdown                 |                                  600 / 450 / 150 m³ |                                      300 / 225 / 75 m³ |
| First full year gross supplied water                                  |                                          221,725 m³ |                                             114,195 m³ |
| No-build irrigation in selected boundary                              | Retained/initial woodland is not irrigated in model |                    12,000 m³/year assumed, not metered |
| Final first-year irrigation                                           |                      900 m³ establishment allowance |                  3,600 m³ on retained + restored cover |
| SF net all-source supplied increase over selected no-build irrigation |           Not the same authored irrigation boundary |                                        102,195 m³/year |
| Assumed supply sources                                                |                      Potable for direct site supply | Potable cooling/domestic; irrigation source unverified |

**Do not rank locations from the raw totals.** Campus area, soil group, cover, rainfall, construction programme, IT capacity and irrigation assumptions all changed. The operating totals also include different domestic/landscape budgets. The new packet is a smaller educational story, not evidence that San Francisco halves water use for the same computing service.

## Hold computing capacity constant

Both demos use the **same transferred SJ04 design reference**, rounded to 1.25 L supplied cooling water/kWh IT. Thus both imply **30 m³/day per MW average IT** under the selected assumptions. At 20 MW each would require 600 m³/day; at 10 MW each would require 300 m³/day. The half-sized cooling total is entirely due to the authored IT load. A site-specific hourly weather/technology model would be needed to quantify any real climate advantage.

## Hold rainfall, soil group and layout fractions constant

A separate **controlled hypothetical comparison**, not either site's prediction, uses 1 ha, P = 74.2 mm, HSG C, ARC II, no capture, and the same 70% final impervious / 10% restored / 20% retained layout. The only changed class is the original and retained cover: good woods CN 70 versus good open space CN 74. Restored space uses CN 74; impervious uses CN 98, all from TR-55 [S07].

| Generated direct runoff, m³ per hectare per replay | Good woods baseline | Good turf baseline |
| -------------------------------------------------- | ------------------: | -----------------: |
| Before development                                 |               170.4 |              218.1 |
| Final surfaces, before any capture                 |               534.2 |              543.7 |
| Increase over own baseline                         |               363.7 |              325.6 |

Calculated by summing disjoint surface volumes using each class's runoff depth; no weighted-CN calculation. This isolates the **selected cover classes** while holding the other inputs constant. It demonstrates why the lower baseline runoff in the native Polo demo cannot be attributed to “grass is better than forest”: native Polo also uses a more permeable assumed soil group and a smaller area. It does not establish current sports-field soil or real forest/turf water yield. Actual compacted turf, drainage, soil layering and antecedent wetness could change results substantially.

## Contrast that is useful in the story

- The woodland story starts with removing trees; this story starts with removing irrigated sports turf. Do not reuse the forest-felling animation on the grass subset.
- Disturbed/sealed land changes event runoff in both stories. Quantified runoff is still neither groundwater recharge nor a downstream flood prediction.
- Polo has an existing irrigation budget to acknowledge. Its 8,400 m³/year modelled reduction offsets a portion of added supplied water, but the 300 mm allowance is authored and source shares are unknown. It cannot be advertised as 8,400 m³ of potable savings.
- A dusty field is not automatically a higher-watering construction site than former woodland. Both budgets use the same selected 1 L/m²/workday allowance. Programmes, active areas and material quantities differ; no forest-versus-turf multiplier is supported [S10, S11].
- Park recycling infrastructure provides relevant local context [P08, P09], not an established cooling connection. Its status must not be changed to operational merely because the calendar says 2026 or signs are present.

The controlled examples explain mechanisms. The native totals tell each authored story. Neither substitutes for a same-service, same-boundary comparison of surveyed alternative sites.
