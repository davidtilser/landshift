# Reproducible Muhos reference calculations

These are scope conversions, gross rain volumes and a normalized cooling example, not calibrated runoff or actual operating demand.

| Reference | Value | Interpretation |
| --- | ---: | --- |
| Regional daily rainfall | 40.0 mm | FMI offsite record timestamp 2026-08-16 |
| Gross rain over reported 330 ha clearance extent | 132,000 m³ | Not runoff; not added to VA1+VA2 |
| Gross rain over VA1+VA2, 275 ha | 110,000 m³ | Not discharge or treated volume |
| Preliminary maximum total water requirement | 20,000,000 m³/year | 2025 planning reference, process plus domestic; not a confirmed operating forecast |
| Even-day equivalent | 54,794.5 m³/day | Not a peak-day design or chosen air-cooling demand |
| TVE1 cooling normalization | 1,000 L in = 700 L evaporation + 300 L river return | Not applied to the total annual figure |

Runoff, discharge, construction supply, actual cooling demand, pH, metal loads and household shortages remain null, not zero. See [scenario.json](scenario.json) for boundaries. Generate with `python3 compute.py`; verify with `python3 compute.py --check`.
