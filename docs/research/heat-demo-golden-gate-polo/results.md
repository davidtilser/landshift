# Two-building heat results

**Calculated educational case; UI integration not implemented.**

Model year: 2026; occupied weekday heating windows: 2088 h.

| Quantity | Result |
| --- | ---: |
| Useful heat delivered | 51.5 MWh thermal/year |
| Combined modelled heat demand covered | 78.0 % |
| Additional recovery electricity | 15.9 MWh electric/year |

Useful demand: 66.000 MWh thermal/year; remaining backup heating: 14.532 MWh thermal/year.
Recovered source heat: 44.944 MWh; compressor: 14.981 MWh electric; delivery losses: 8.456 MWh thermal; pumps/controls: 0.9396 MWh electric.
Recovered heat is 0.0513% of the inherited IT-heat reference. Remaining IT-reference heat is not a complete facility cooling-duty estimate.

| Building | Demand MWh thermal | Delivered MWh thermal | Coverage | Backup MWh thermal |
| --- | ---: | ---: | ---: | ---: |
| Anglers Lodge | 12.000 | 9.583 | 79.9% | 2.417 |
| Golden Gate Park Senior Center | 54.000 | 41.885 | 77.6% | 12.115 |

| Month | Heating h | Demand MWh thermal | Delivered MWh thermal | Extra MWh electric |
| --- | ---: | ---: | ---: | ---: |
| 1 | 176 | 10.560 | 6.053 | 1.839 |
| 2 | 160 | 9.240 | 5.501 | 1.672 |
| 3 | 176 | 7.920 | 6.045 | 1.839 |
| 4 | 176 | 5.940 | 5.940 | 1.809 |
| 5 | 168 | 3.960 | 3.960 | 1.229 |
| 6 | 176 | 1.980 | 1.980 | 0.656 |
| 7 | 184 | 1.320 | 1.320 | 0.467 |
| 8 | 168 | 1.320 | 1.320 | 0.460 |
| 9 | 176 | 2.640 | 2.640 | 0.848 |
| 10 | 176 | 4.620 | 4.620 | 1.424 |
| 11 | 168 | 7.260 | 5.770 | 1.756 |
| 12 | 184 | 9.240 | 6.320 | 1.923 |

All new numerical inputs are authored teaching assumptions; building identities alone are observed. These are not measured building results or validated network performance.
The original view has no datacentre heat export or recovery electricity; the recipients retain the same modelled heating demand. Backup heating is useful thermal energy, not an assumed fuel/electricity saving.
See [the model and UI recommendation](README.md), [inputs](scenario.json), [source boundaries](sources.json) and [machine handoff](ui-handoff.en.json).
