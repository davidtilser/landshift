# LandShift UI experience verification

**Final result: passed**

## Comparison target

The user supplied an onboarding screenshot from another app as a **style
reference** and explicitly requested an incremental improvement to the existing
LandShift game. This is not a recreation of that app’s content or screen layout.
The comparison therefore checks typography, short copy, portrait treatment,
purple/lime accents and clean cards. The existing map, chapters and decisions
remain the product’s structure.

- Source visual truth:
  `/var/folders/mc/wyrnrkcj70q0fklb97vpsl0m0000gn/T/codex-clipboard-e6b931ff-5394-4e48-8935-0ca926f2bd43.png`.
- Implementation route: `/game.html?scenario=golden-gate-polo`.
- Desktop viewport and screenshot: 1280 × 720 CSS/pixels, density 1.
- Mobile viewport and screenshot: 393 × 852 CSS/pixels, density 1.
- Source normalized to 393 px width, preserving its aspect ratio. Its longer
  screen is retained rather than stretched to the implementation’s viewport.
- State: Water → Today → step 2, displaying the authored irrigation allowance.
- Full-view comparison: `docs/screenshots/ui-experience/reference-comparison.png`.
  Both source and implementation were opened together in that comparison image.
- Focused evidence: the avatar, title, number and navigation are legible in the
  full-width mobile captures, so an additional enlarged crop was unnecessary.
  The four individual portraits were also inspected together at native asset size.

## Required fidelity surfaces

| Surface        | Assessment                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typography     | Bold dark system-sans headings, 21 px educational body copy and 40–52 px numeric values establish the requested hierarchy. Mobile chat is 20 px; its earlier inherited 12 px styling was corrected and checked via computed styles.                                                                                |
| Spacing/layout | Rounded portrait cards and generous modal spacing follow the reference. Native dialogs fit both tested viewports. Persistent mobile actions fit; secondary actions use More. A map workspace intentionally replaces the reference’s full-page onboarding form.                                                     |
| Colors         | Lavender cards, purple selection/progress and lime primary actions follow the supplied direction. Dark text remains readable.                                                                                                                                                                                      |
| Images         | Four generated raster portraits match the approachable 3D guide direction. They load locally, preserve aspect ratio and show complete faces. Existing in-game symbolic icons remain part of the game’s established vocabulary; the source has no water/electricity/land icon specification to reproduce.           |
| Copy           | Lessons, complete evidence readers and message pages respect the 70-code-point limit. A browser check of the displayed numerical step confirmed a 61-character explanation. Unknowns, teaching assumptions and unquantified proposal effects remain labeled. Provider-managed credits retain required attribution. |

## Comparison and repair history

| Finding                                                               | Repair and post-fix evidence                                                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: private chat inherited 12 px low-contrast paragraph styling.      | Scoped inheritance and heading styles now override generic dialog rules. Browser computed size is 20 px with dark text. `chat-mobile.png`.                            |
| P2: hidden composer label appeared inside the input row.              | Scoped visually-hidden rules work independently of the older gameplay stylesheet. Browser confirms the label is 1 × 1 px. `chat-mobile.png`.                          |
| P2: mobile source/reset controls were clipped.                        | More exposes the original controls; the menu’s stacking was then raised above the impact toolbar. Sources and reset were exercised. `menu-mobile.png`.                |
| P2: topics could fall below the operation proposals.                  | Topic buttons now precede animation/proposal content; the later placement refinement hides them until confirmation. They remain available in every confirmed chapter. |
| P2: map comments obscured infrastructure.                             | Selecting a layer hides competing map labels while keeping people and portrait shortcuts available. `water-layer-desktop.png`, `heat-desktop.png`.                    |
| P2: underground lines remained hidden through some streamed geometry. | Depth-independent native markers supplement the below-ground line. Their visibility was confirmed through the 3D landscape. `water-layer-desktop.png`.                |
| P2: cutaway lines did not follow unconfirmed movement.                | Pipe/marker positions now read the current transform. Keyboard rotation was exercised with Water active.                                                              |
| P2: land boundary and baseline area differed.                         | Boundary now reads the same 320 × 125 m pad dimensions as the 4 ha model.                                                                                             |
| P2: Today’s comparison implied zero water use.                        | It now states supply unknown and separately identifies the authored irrigation allowance.                                                                             |
| P2: feedback could cover the operating animation.                     | Completion feedback waits for animation completion; browser observed animation active with the dialog closed, then the result dialog after completion.                |
| P2: same-proposal baseline-to-preview action skipped feedback.        | First activation now produces the same five-step comparison. Browser verified 12 → 18 game-index points for an available heat recipient.                              |
| P2: reset during placement retained a selected layer.                 | Reset explicitly clears the scene layer. Browser verified all four layer buttons returned to false.                                                                   |

## Interaction evidence

Screenshots below are in `docs/screenshots/ui-experience/`:

- `water-desktop.png`, `water-mobile.png`: short lesson, progress, portrait and
  prominent numerical value at both viewports.
- `chat-mobile.png`: readable private dialogue and composer. Full messages were
  paged in both directions; entering a custom message preserved the transcript
  and switched to free chat with an explicitly labeled demo response.
- `community-mobile.png`: public timeline, portraits, composer and fictional
  emotion percentages separated from the Support game index.
- `menu-mobile.png`: source, basemap and reset controls remain accessible.
- `water-layer-desktop.png`, `heat-desktop.png`: expanded environmental context
  and schematic cutaway routes.

Additional checks covered chapter progression, distinct Today/Structure/Ready/
Operating content, source pagination, baseline/proposal switching and recipient
unavailability (Support returned from 18 to 12). Native buttons and dialogs
retain keyboard activation, focus handling and Escape closing. The More menu
also closes with Escape. No application console errors were captured in the
final preview. Live provider dialogue was not validated; browser chat checks
used the labeled demo fallback, and automated tests cover conversation behavior.

## Follow-up polish

- P3: tune optional camera framing for long infrastructure routes on narrow
  screens. As in other map views, world-anchored labels can reach the viewport
  edge; the complete explanation remains in the topic dialog.
- Quantified proposal savings and older sandbox curriculum parity remain in
  `docs/ui-environment-experience.md`; they are not represented as completed.

## Implementation checklist

- [x] Repair identified P1/P2 issues and inspect the resulting captures.
- [x] Compare the source and implementation in one normalized image.
- [x] Exercise primary lesson, map, comparison and conversation controls.
- [x] Pass lint, strict types, formatting, 150 tests and production build.
- [x] Reproduce the unchanged research baseline and provenance.

## Browser annotation follow-up

The five placement/navigation annotations are implemented as scoped edits.

- The former left-side Confirm button is hidden before confirmation.
- A campus-anchored Confirm action appears only after a valid move or rotation.
- The location lock acknowledgement is followed by the proposed impact deck;
  Water, Electricity and Land remain hidden beforehand.
- Map controls are inside the top navbar; the initial placement caption and the
  Heroes’ Grove/basemap navigation options are removed.
- Browser checks passed at 1269 × 962 and 393 × 852. Reset hides the map Confirm
  action and topic deck again; arrow rotation reveals only the nearby action.
- `docs/screenshots/placement-flow/inline-confirm-desktop.png` and
  `inline-confirm-mobile.png` verify the new arrangement.
- `confirmation-transition.png` records `poloConfirming=true` with the impact deck
  hidden. `proposed-impact-desktop.png` shows the deck after that transition.
- TypeScript, lint, formatting, all 150 tests and production build pass.

## Community opinion annotation follow-up

- Replaced the rectangular map commentary with at most two rounded speech
  bubbles, each showing a human portrait, name, short opinion and chat action.
- Coral **A concern** preserves the current field-loss reaction. Mint **An idea**
  offers a conditional improvement, without suggesting measured public support.
- Mobile at 393 × 852 keeps both opinions fully above the story deck and removes
  the duplicate portrait strip. Desktop at 1269 × 962 positions bubbles near
  their people while reserving room for map controls and the story deck.
- Keyboard activation opened the correct private conversations for Maya and
  Owen. Water-layer selection hid the bubbles; deselection restored them.
- `docs/screenshots/community-opinions/mobile.png` and `desktop.png` capture the
  Foundations phase with the updated layout.
- Strict types, lint, formatting, all 150 existing tests and production build
  pass. No simulation parameters or research quantities changed.

## City introduction and keyboard follow-up

- The first frame opens over San Francisco with a short portrait-led setup
  dialog. The 4 ha value comes from the baseline; Golden Gate Park is the
  preselected second entry among four locations. Other entries are disabled and
  labeled coming soon, with no unsupported location model implied.
- The dialog fits 1269 × 962 and 393 × 852 without internal scrolling. A long
  selected location label was shortened to **Golden Gate Park**, with **Polo
  Fields** retained in the helper text, so the value fits the mobile control.
- Starting setup shows a flight state with construction still unconfirmed.
  Arrival reveals the prepared map confirmation without requiring a move first.
  Confirming still begins Foundations and reveals the educational topics.
- W/S use the navbar's zoom behavior. The mini guide sits at the bottom right,
  above provider credits. Keyboard policy tests protect editing, modifiers,
  composition, open dialogs, Community and unfinished setup.
- Browser inspection found Cesium's hidden ARIA credit dialog blocked shortcuts.
  The guard now checks rendered visibility, while visible dialogs still block
  camera keys.
- Screenshots in `docs/screenshots/project-setup/` record the introductory dialog
  at both sizes and the prepared location with the keyboard guide.
- Actual W/S keys changed the map camera in the browser. Both letters remained
  usable in the private composer. Reset cleared confirmation and returned to
  the city overview/dialog. All 155 tests, lint, types, formatting and production
  build pass.

## Size slider, building prominence and conversation follow-up

- Campus size is now a native 2–6 ha slider with half-hectare steps and a live
  large value. Keyboard selection of 2.5 ha and the 6 ha endpoint was exercised.
  The location helper note is removed. The mobile dialog fits without scrolling.
- Size persists through confirmation and chapters: 2.5 ha showed 2 ha disturbed
  turf and 0.75 ha foundations; 6 ha showed 4.8 ha and 1.8 ha respectively.
  Operating at 6 ha showed 18 MW, 157.68 GWh/year and 450 m³/day, with the
  comparison reader explicitly labeling the area-proportional teaching model.
- Campus dimensions and underground routes scale with the same square-root
  transform. Access still follows the observed road before its schematic link.
  Baseline source JSON is unchanged; selected-size quantities are assumptions.
- Site framing is 30% tighter and shifted away from the desktop story card.
  Upper-row opinions keep the larger building view clear when space permits.
  Broader connection/park views retain their context.
- Benefits questions now receive concrete answers and different followups.
  A custom smaller-footprint question retained five visible/history bubbles;
  another suggested turn retained seven. A custom **Why?** gave a contextual
  continuation. Suggestions and the custom composer remain available together.
- Mobile followup cards were compacted after they consumed too much of the log.
  The log grew from 184 to 290 px, showing the latest question and response.
  Resizing while following the latest message kept the log at its bottom.
- Each authored opening answer is tested as a complete sentence within its
  first 70-character page across characters, topics, chapters and proposals.
- `docs/screenshots/size-chat/` records the slider, building and conversations.
  Lint, types, formatting, 179 tests and production build pass.

final result: passed
