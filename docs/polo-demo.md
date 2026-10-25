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

The player first positions a translucent campus directly on the map. The placement view shows the campus and a compact Confirm location button, without an introductory card or access-road overlay. Grab the campus itself or its green handle and drag; with it focused, use Left/Right arrows to rotate (Shift uses a finer step). The small rotate buttons provide an alternative. **Confirm location** locks the candidate, reveals the proposed access route and starts the animated Clear step (M1). Today remains available as a comparison snapshot. Until confirmation, phases, research figures, access highlighting and traffic stay hidden and the server rejects requests to advance an unconfirmed plan.

After confirmation the player chooses when to advance through seven states: Today, stripping, grading, compaction, construction, opening and operation. All stages, proposal comparisons and replays preserve the selected center and orientation. Confirmation locks both position and orientation for every phase, including the Today comparison. The Move data center handle, rotation controls and movement hints disappear, and pointer/keyboard placement is disabled. Restarting is the only way to choose a new location; it returns to the default unconfirmed candidate. Each state replaces the previous one; replay and skip never accumulate resource consumption. Orbit, zoom, whole-park framing, baseline rain and evidence remain available.

Moving forward one stage plays a time-compressed illustration: a tractor strips turf, grading and compaction work over the same cleared ground, foundations precede steel and roof panels, and opening adds walls, paving and planting. Operation reveals flows on the completed campus. A compact progress strip names the current action; Skip settles the scene immediately and Replay repeats the selected step. Backward navigation and timeline jumps show completed comparison snapshots. Reduced-motion preferences settle the work immediately. Changing rain does not restart construction. Figures shown during a transition describe the endpoint, labeled **After this step**, rather than a simulated running total.

### Proposed access and illustrative traffic

A warm solid line appears only after confirmation and highlights the user's marked approach using the prepared DataSF centerlines for Martin Luther King Jr Drive (11995000) and Middle West Drive (9007000). This geographic road segment stays fixed while the player chooses the campus location. A dashed schematic spur joins an OSM track point (4762834072), then follows the campus perimeter to the gate. Only this campus connection follows placement and rotation before confirmation; confirmation freezes it with the selected campus pose. The geometry does not establish permission for motor traffic, actual access arrangements or an engineered road design; the pack's conservative traffic flags are unchanged.

**Confirm location** jointly reveals the road, plays a brief route pulse, frames the approach, starts four staggered illustrative red trucks and plays the first site-preparation animation. Road trucks and on-site machinery are 50% larger than their original visual size. Preparation/construction use trucks; opening/operation use cars and service vans. Returning to Today labels truck movements as a **future traffic preview**. Distances control animation speed across unequal segments. After this shared confirmation trigger, the access clock is independent of construction, so phase replay, skip, rain and proposal changes do not restart traffic or add vehicles. Reset hides the route and traffic and returns to placement. Reduced motion shows the completed preparation step and one stationary vehicle after confirmation, without the pulse. **Access route** becomes available after confirmation to frame the road and campus again.

Route and vehicle heights use local elevation, or loaded photorealistic mesh surfaces while connected, excluding the illustrative campus and vehicles from surface sampling. Original schematic glTF vehicles use a minimum screen size for legibility; their apparent size is not a measured scale. Regenerate them with `node scripts/data/prepare-polo-vehicles.mjs` (no downloads). Traffic volumes, road capacity, emissions, transport fuel and additional land disturbance are not calculated; none changes the frozen water/energy baseline or proposal savings.

Walking people and clickable opinion bubbles remain part of the scene during placement and the timeline. Their movement stays anchored to the field while the ghost campus moves. Bubbles open the existing private chats; the Talk avatar controls provide a keyboard-accessible alternative.

Each phase has authored fictional reactions shared by map bubbles, private-chat greetings and the Community feed. Players walk off the pitch as turf is stripped; a peaceful rally grows progressively along the track during preparation and construction. Placards, short opinions and bubble colors change with the stage. The designer joins the visible conversation during construction. Operation and proposal previews bring different concerns and qualified interest: exploring a benefit does not erase the public-space protest. The crowd is an illustrative cast of characters, not an estimate of attendance or a real group's position. Replay, Skip and comparison jumps restore the corresponding cast without accumulating people. Live chat receives each speaker's current phase reaction and mood alongside their lasting motivation and boundaries.

The [construction protest capture](screenshots/polo-phase-protests.png) shows the visible cast and phase-specific bubbles. Browser checks also verified a bubble opening the matching construction-stage greeting, a live Gemini reply about lost play space, the shared thread's phase posts and mood, and qualified green-roof interest while the rally remains.

Operation opens on the original plan with heat reuse preselected for exploration. Three large cards switch independent complete proposal states. Original plan restores the prepared baseline. With this idea removes the numeric baseline components and shows the chosen visual mechanism, a short trade-off and a small experiment. None of the three proposals calculates benefits, stacks savings or modifies the frozen baseline. Proposal animations have their own lifecycle and do not replay construction.

- **Heat for neighbours:** follow a heat-recovery interface, schematic buried supply/return pair and a fictional model pool. Internal coolant, delivery water and pool water stay separate. Extra equipment can require electricity; original cooling and the recipient’s own heater remain. Turning recipient demand off stops delivery and keeps computing/cooling active. Heat modelling is deferred; no exported heat, temperature or savings is asserted.
- **Recycled water:** follow a schematic source, quality/treatment interface and cooling delivery. Neither source availability nor a real campus connection is confirmed. Evaporation and blowdown remain considerations; no saved volume is calculated.
- **Green roof:** reveal planted layers, maintenance and qualitative rain/drainage flow. No runoff, thermal, biodiversity or electrical improvement is quantified. Roof planting does not restore the public sports field.

## Community conversations

Polo uses the same bubble/private-chat and shared Community interfaces, including public simulated mood percentages, with separate scenario histories and fictional Polo perspectives: park regular, soil volunteer, young player and designer. Stage/proposal changes append to the same public thread. Chat never applies equipment or changes public access.

The server validates the Polo scene state, confirmation and matching coordinates/orientation, and constructs context from the committed phase handoff. Choosing a campus location does not recalculate the frozen turf-scenario baseline into a new GIS impact estimate. It bypasses the old sandbox consequence equations. Active concept views omit numeric baseline facts from model context and explicitly prohibit fabricated performance or savings. Gemini replies remain interpretation; authored demo replies are labeled when the provider is unavailable. Private messages stay separate from public history.

## Verification

Tests cover offline baseline reproduction, reference units/unknowns, phase ordering, site/roof areas, free placement and rotation before confirmation, locked poses in all confirmed phases, reset unlocking, confirmation gates, pose persistence, exclusive proposal activation, concept-versus-baseline context, unavailable recipients, scenario validation and community continuity. Browser checks verify placement and confirmation, visible phase changes, proposal switching, original comparison, rain, recipient demand, private chats, Community and Heroes’ Grove navigation.

Construction checks also cover continuous physical endpoints, ordered reveals, machine routes, replay/skip and reduced motion. Earlier construction checks exercised forward progression, comparison jumps, concept replay, clickable map bubbles and the local aerial fallback. Placement is now locked after confirmation; the regression checks cover removed movement controls, blocked campus dragging, fixed poses across phases and unlocking on reset. Ordered captures show [foundations](screenshots/polo-construction-01-foundations.png), [steel](screenshots/polo-construction-02-steel.png) and [roof panels](screenshots/polo-construction-03-roofs.png). These are illustrative scene checks, not certification of every item in the research acceptance registry.
