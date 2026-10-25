# Polo Fields guided demo

Open `/game.html?scenario=golden-gate-polo`. Heroes’ Grove remains at `/game.html?scenario=golden-gate-park`; links connect both experiences. `src/game/entry.ts` selects the independent Polo app, so the original sandbox’s geometry, 24 MW assumptions and controls are not reused for the research case.

The Polo demo reuses the full Golden Gate Park geographic pack, its local NAIP imagery/elevation, and optional streamed Google Photorealistic 3D Tiles. No new map download is needed when that pack is prepared. A local OSM place point positions a **schematic** 320 × 125 m teaching footprint. It is not a surveyed campus polygon. The model recipient, equipment, construction activity, underground connection and people are fictional illustrations. They do not establish real utility routes, a real pool connection or actual development plans.

## Prepared baseline

```sh
npm run data:prepare:polo
npm run data:verify:polo
```

Python 3 is needed for preparation/verification. The browser uses the committed `src/game/polo/baseline.generated.json`, so running the app requires no Python or live research downloads. The adapter reproduces Marian’s water and energy generators in temporary copies, validates their results and self-tests, and exports a compact English M0–M6 handoff. It never rewrites the research packets. Tiny Python-version floating-point differences are checked within a numerical tolerance; text, shapes, unknowns and material values must match.

The baseline keeps the same 4 ha site, 1.2 ha roof and 10 MW **average** IT demand. Operation uses 12 MW annual-average facility demand, 105.12 GWh/year facility electricity and 300 m³/day average cooling make-up. These are authored research assumptions/calculations, not field measurements or forecasts. Work-stage figures cover selected activities and their stated time bases, not lifecycle totals. Unknown existing electricity, peak demand and grid headroom remain null. M1 runoff is unknown; M2 and M3 use the same runoff case. Rain animation explains the optional event and never changes annual electricity or creates a new weather forecast.

Research inputs:

- [Water baseline](research/water-demo-golden-gate-polo/README.md)
- [Energy baseline](research/energy-demo-golden-gate-polo/README.md)
- [Current three-case visual brief](research/change-catalog-golden-gate-polo/README.md)

The old four-change catalogue is historical and is not loaded by this application.

## Interaction and visual concepts

The player first positions a translucent campus directly on the map. The placement view shows the campus and a compact Confirm location button, without an introductory card. The field outline is a visual guide, not a movement restriction. Grab the campus itself or its green handle and drag; with it focused, use Left/Right arrows to rotate (Shift uses a finer step). The small rotate buttons provide an alternative. **Confirm location** locks the candidate and opens the timeline at Today. Until then, phases and research figures stay hidden and the server rejects requests to advance an unconfirmed plan.

After confirmation the player chooses when to advance through seven states: Today, stripping, grading, compaction, construction, opening and operation. All stages, proposal comparisons and replays preserve the selected center and orientation. The campus can still be moved or rotated during any phase without rewinding or reconfirming. Move campus focuses the handle; restarting returns to the default unconfirmed candidate. Each state replaces the previous one; replay and skip never accumulate resource consumption. Orbit, zoom, whole-park framing, baseline rain and evidence remain available.

Walking people and clickable opinion bubbles remain part of the scene during placement and the timeline. Their movement stays anchored to the field while the ghost campus moves. Bubbles open the existing private chats; the Talk avatar controls provide a keyboard-accessible alternative.

At operation, heat reuse is selected first. Three large cards switch independent complete proposal states. Original plan restores the prepared baseline. With this idea removes the numeric baseline components and shows the chosen visual mechanism, a short trade-off and a small experiment. None of the three proposals calculates benefits, stacks savings or modifies the frozen baseline.

- **Heat for neighbours:** follow a heat-recovery interface, schematic buried supply/return pair and a fictional model pool. Internal coolant, delivery water and pool water stay separate. Extra equipment can require electricity; original cooling and the recipient’s own heater remain. Turning recipient demand off stops delivery and keeps computing/cooling active. Heat modelling is deferred; no exported heat, temperature or savings is asserted.
- **Recycled water:** follow a schematic source, quality/treatment interface and cooling delivery. Neither source availability nor a real campus connection is confirmed. Evaporation and blowdown remain considerations; no saved volume is calculated.
- **Green roof:** reveal planted layers, maintenance and qualitative rain/drainage flow. No runoff, thermal, biodiversity or electrical improvement is quantified. Roof planting does not restore the public sports field.

## Community conversations

Polo uses the same bubble/private-chat and shared Community interfaces, including public simulated mood percentages, with separate scenario histories and fictional Polo perspectives: park regular, soil volunteer, young player and designer. Stage/proposal changes append to the same public thread. Chat never applies equipment or changes public access.

The server validates the Polo scene state, confirmation and matching coordinates/orientation, and constructs context from the committed phase handoff. Moving the campus does not recalculate the frozen turf-scenario baseline into a new GIS impact estimate. It bypasses the old sandbox consequence equations. Active concept views omit numeric baseline facts from model context and explicitly prohibit fabricated performance or savings. Gemini replies remain interpretation; authored demo replies are labeled when the provider is unavailable. Private messages stay separate from public history.

## Verification

Tests cover offline baseline reproduction, reference units/unknowns, phase ordering, site/roof areas, free placement, rotation, confirmation gates, pose persistence, exclusive proposal activation, concept-versus-baseline context, unavailable recipients, scenario validation and community continuity. Browser checks verify placement and confirmation, visible phase changes, proposal switching, original comparison, rain, recipient demand, private chats, Community and Heroes’ Grove navigation.
