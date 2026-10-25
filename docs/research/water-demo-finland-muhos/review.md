# Muhos packet checks and readiness

**Prepared and checked on 24 October 2026 by the primary agent.** This is an evidence-led research/content packet, not an independently certified hydrology model. No separate subagent audit, field validation or legal adjudication is claimed.

## Evidence review

- Read the official Muhos EIA register and the primary 16 September 2025 programme. Extracted technical pages and visually inspected the project map on PDF page 28 / printed page 27 and cooling diagram on PDF page 30 / printed page 29. These distinguish nine halls, the planning boundary and the two cooling options.
- Read the October LVV notice/update and detailed eight-page response. The packet attributes the pause, drainage and water-management findings to the regulator; it does not convert a police referral into conviction or a temporary intervention into a permanent project ban.
- Cross-checked the approximately 330 ha clearance against Yle's attribution to a Google spokesperson. Kajaani and the separate Hamina incident have their own scopes; the case does not combine them into one clearance figure.
- The dated company site page is retained as a company position, not current authority clearance. Kaleva's report of air-cooling intent is explicitly attributed and prevents presenting the older high-water alternative as the current selected design. The final technology and annual water budget remain unverified from primary material obtained here.
- The gross water-need reference includes process and domestic uses. The 70/30 cooling fractions are not applied to it. The normalized 1,000 L example is kept separate from daily/annual operating metrics.
- Followed FMI station metadata and explicit station ID. A place-name query resolved to Oulu Kaukovainio rather than an on-site Muhos gauge. Older Muhos station probes did not supply suitable recent observations. The frozen response itself identifies FMISID 108040 and its coordinates.
- No precise tree count, stripped area, final sealed area, pH, metal load, river-wide pollution, household shortage, proposed upgrade size or inferred local capacity has been invented. The river connection is more specific than SF because the authority identifies Oulujoki as the receiver; exact routes and hydrodynamics are still outside the packet.

## Reproducible checks

| Check                                             | Result                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `python3 compute.py --check`                      | PASS: source hashes/IDs, FMI identity and field order, 31 distinct August timestamps, selected positive event, reference scopes, units, cooling balance, unknowns and seven ordered English cards.                                                                                   |
| Independent rain-volume arithmetic                | PASS: 0.04 m × 330 × 10,000 m² = 132,000 m³; 0.04 m × 275 × 10,000 m² = 110,000 m³. Different scopes; not summed or labelled runoff.                                                                                                                                                 |
| Operating reference arithmetic                    | PASS: 20,000,000 / 365 = 54,794.5 m³/day equivalent. No peak, current operating or final air-cooling demand inferred.                                                                                                                                                                |
| Normalized cooling balance                        | PASS: 1,000 L = 700 L evaporation + 300 L river return for the historical TVE1 example.                                                                                                                                                                                              |
| Negative input probes                             | PASS: unknown source, invalid metric, duplicate milestone, invented numeric runoff, non-conserving cooling fractions and wrong station ID rejected in memory.                                                                                                                        |
| Narrative/data contract                           | PASS: M6 has no default numeric operating forecast; five older reference/example metrics are optional detail. Current pause and conditional-future labels remain separate. Cards reuse SF's metric-path/data/definition pattern and animation/meaning/uncertainty fields in English. |
| Local links and Markdown table structure          | PASS.                                                                                                                                                                                                                                                                                |
| Scoped Prettier formatting and `git diff --check` | PASS. Prettier excludes frozen evidence and generated artifacts. Git whitespace checks exclude raw snapshots to preserve original source bytes.                                                                                                                                      |
| Existing scenarios                                | PASS: all 29 SF and San José files match the pre-task hash snapshot.                                                                                                                                                                                                                 |

The existing application/prototype was not modified or used as evidence. No app server was started. Application tests do not validate the Finnish site physics; the appropriate checks here are provenance, arithmetic, content boundaries and deterministic generation.

## Readiness boundary

Ready for a simple 3D educational story: project versus clearance area; a schematic reported-change sequence; broad ditch-to-river connection; local acid-generating mechanism and water-protection need; current pause; and a conditional future that distinguishes reported air-cooling intent from older EIA alternatives.

Not ready for quantitative site runoff, treatment performance, winter floods, receiving-water pH/metal exposure or actual operating-water demand. That would require additional site hydrology, spatial geometry, monitoring series, construction schedules and a confirmed design. These unknowns are explicit data states, not zero impacts or missing values that the renderer should fill automatically.

For a stronger independent review later, use the bundled authority PDF, source registry and frozen FMI XML; obtain current primary design/assessment material before replacing any future-state assumptions. Publication does not extend the verification scope to field validation or product implementation.
