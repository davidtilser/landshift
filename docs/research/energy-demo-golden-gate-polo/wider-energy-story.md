# Electricity beyond the Polo Fields site

> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).

Use a small, explicitly schematic strip: **regional supply → distribution → campus and existing users**. It explains relationships; it does not map a shared feeder, allocated capacity or power-flow result.

City-owned-property development must apply for Hetch Hetchy Power; service and delivery design still require assessment. SFPUC describes service points involving PG&E distribution. CleanPowerSF is a separate local example of procurement using PG&E delivery, not the campus supplier. [SFPUC developers](https://www.sfpuc.gov/hetch-hetchy-power), [CleanPowerSF FAQ](https://cleanpowersf.org/faq).

## M0 Today — an existing sports field

Nearby homes and park facilities already use electricity. Their individual feeders are not mapped here.

**Animation:** Reveal a neutral city-network schematic and small existing-user icons; no verified wires drawn on the map.

**Status:** Regional context; existing local topology unknown.

## M1 Site preparation — remove turf

Fuel is supplied to the work site; offsite fuel transport and production are outside this inventory.

**Animation:** Show a small fuel-delivery symbol beside the machine; no neighbourhood electricity draw is inferred.

**Status:** Selected on-site fuel only.

## M2 Site preparation — grade the ground

Earthmoving fuel is a different energy pathway from the electrical network serving homes.

**Animation:** Keep the fuel symbol active; do not drain the city-grid illustration when diesel equipment runs.

**Status:** No household-supply effect modelled.

## M3 Site preparation — compact the ground

The fuel budget grows during works while the permanent electricity connection remains unassessed.

**Animation:** Replay the roller and fuel icon; show a neutral pending-assessment label on the future connection.

**Status:** Connection and spare capacity not assessed.

## M4 Construction — temporary electricity and handling

If connection works are required, cables or other infrastructure could extend the project effects beyond the campus. Their extent is unknown.

**Animation:** Show a generic temporary connection and an optional dashed works corridor marked Location and need not established; never excavate a real street by default.

**Status:** No cable route, reinforcement or neighbourhood disruption predicted.

## M5 Opening — commission the equipment

A real opening would depend on agreed service and electrical readiness. The demo timeline does not establish approval or energization.

**Animation:** Reveal a schematic permanent connection with an Illustrative future label; keep nearby-home lights steady.

**Status:** Illustrative future; actual service and capacity unassessed.

## M6 Operation — servers and supporting systems

A new continuous demand must be assessed alongside other users. Electricity procurement and network delivery are different; annual averages cannot prove spare capacity or household shortages.

**Animation:** Show campus and nearby-user branches from an explicitly schematic shared network. Flows are explanatory, not load-flow results; do not dim homes or show a reserve gauge.

**Status:** Network capacity and household effects not assessed.

## Optional contextual questions

**Does 10 MW mean the whole building?**

No. It is the authored average IT demand. With PUE 1.20, the modelled annual-average facility demand is 12 MW. Peak demand and connection rating remain unknown.

Source IDs: W01, E01 in [sources.json](sources.json).

**Is all the extra electricity used for cooling?**

No. The non-IT budget also includes power-conversion losses and other supporting systems. PUE alone cannot separate cooling.

Source IDs: E01, E03 in [sources.json](sources.json).

**Will nearby homes lose electricity?**

This packet cannot determine that. A service assessment needs peak loads, network topology, available capacity and protection requirements; an annual energy budget cannot predict household outages.

Source IDs: E04, E06 in [sources.json](sources.json).

**Do we need a new substation?**

That is not established. Service assessment may identify cables, transformers or other reinforcement. The schematic illustrates that possibility without selecting a real route, upgrade or construction impact.

Source IDs: E04, E06 in [sources.json](sources.json).

**Would clean electricity remove the need to assess the grid?**

No. SF has different electricity procurement and delivery arrangements. The physical connection still needs assessment; this campus has no confirmed supply contract or network capacity allocation.

Source IDs: E04, E05, E06 in [sources.json](sources.json).

**What happens in hot weather or drought?**

Hot weather can increase regional cooling demand. The campus response depends on its actual equipment and controls. No heatwave electricity or drought-water multiplier is applied; annual averages are not stress-event predictions.

Source IDs: E03, E07 in [sources.json](sources.json).

**Could we save water with another cooling system?**

Potentially. The energy consequence depends on technology and conditions. No matched SF alternative has been established here, so the demo explains the choice without displaying invented water or electricity savings.

Source IDs: E03 in [sources.json](sources.json).
