# Engaging Youth in Sustainable Land-Use Decisions

**Source:** Notion hackpack page, “Engaging Youth in Sustainable Land-Use Decisions”; user-provided text export received on 24 October 2026.

This document preserves the supplied challenge brief. Notion callout markup and exported table line breaks have been normalized for Markdown. LandShift's primary experience is the [San Francisco Polo Fields demo](polo-demo.md), with [Muhos, Finland](research/water-demo-finland-muhos/README.md) retained as an alternative water-data scenario.

## 1. What is the problem, and why is it important now?

Young people lack accessible, engaging ways to understand and participate in the land-use and urban planning decisions that shape their communities. The connection between everyday choices, planning decisions, and longer-term consequences—such as land degradation, water scarcity, and ecosystem recovery—can be difficult to see.

This creates a gap between awareness and action: young people may care about their environment without understanding how their behavior or participation in local planning can influence its future.

Decisions made today shape how land and resources will be used for years to come. Making these consequences understandable now can help young people make more informed choices and contribute meaningfully to their communities’ planning agendas.

**The challenge is to create an engaging game or interactive educational experience for young people aged 15–24 that helps them explore land-use choices, understand their consequences and opportunities, and translate learning into informed behavior and participation in local planning. Teams may choose their own scenarios and gameplay.**

## 2. What is being done or used as a workaround right now, and why is it insufficient?

UNCCD’s proposal reviews existing approaches that address parts of this challenge:

- **Participatory design tools such as Block by Block:** This Minecraft-based approach helps community members visualize ideas and contribute to the design of public spaces. Its approachable, immersive format gives people without technical expertise a way to participate. However, UNCCD’s review identifies limitations in representing resource scarcity, ecological processes, and the lasting consequences of land-use decisions. Manually constructing larger landscapes can also require substantial time.
- **GIS and landscape visualization tools:** These can represent real terrain and larger geographic areas more efficiently. However, geographic accuracy alone does not provide the engaging learning experience, accessible choices, or understandable feedback needed to encourage youth participation and behavior change.

The gap is an experience that combines accessible community participation with meaningful environmental consequences: users should be able to explore choices and understand how those choices affect the land over time.

## 3. What does the ideal outcome look like?

An intuitive game or interactive educational experience enables young people without technical training to:

- **Connect choices to consequences.** Explore how everyday behaviors and land-use decisions affect soil, water, vegetation, and community well-being over simulated time. Understand the connections and tradeoffs between environmental, social, and economic considerations.
- **Experiment and learn.** Compare scenarios, experience resource constraints, and see how different choices can contribute to degradation or restoration. Explore how sustainable land management and restoration can improve livelihoods, environmental resilience, and community well-being.
- **Apply learning locally.** Relate the experience to their own communities and become better equipped to discuss, propose, or advocate for sustainable land-use and urban planning decisions. Consider how different stakeholders and communities participate, including opportunities for cooperation around shared natural resources.
- **Move from awareness toward action.** Identify practical changes they could make in their behavior or participation in local planning.

For the hackathon, success means a focused, working interactive prototype that demonstrates a **clear learning experience: a user makes a meaningful choice, sees its consequences, and understands why it matters**. A complete platform is not expected.

**Optional extension:** Explore whether educational credits earned through participation could be linked to funding for real urban planning or land-restoration projects. This is a bonus concept; funding arrangements and implementation are not prerequisites for the core solution.

## 4. What restrictions or guardrails should participants know?

1. **Engagement and education are essential.** The experience must be approachable and compelling for young people. A statistical model or landscape visualization alone is insufficient.
2. **Environmental consequences should be credible and understandable.** Simplified, evidence-informed rules are acceptable for the hackathon when teams clearly explain their assumptions and cite credible sources. Established models and datasets are encouraged where relevant and feasible, but are not mandatory. Distinguish illustrative outcomes from precise real-world predictions.
3. **Keep participation accessible.** Users should not need technical, GIS, or urban planning expertise to understand the experience and make meaningful choices.
4. **Design for measurable educational impact.** Explain how changes in understanding, intended behavior, or planning participation could be assessed. Gameplay activity alone should not be treated as proof of behavior change. Implementing monitoring techniques is outside the project scope.
5. **Keep implementation and maintenance feasible.** Propose a realistic path from prototype to an initial usable version, targeting less than three months of additional development. Minimize ongoing technical support needs. If the solution is a game, an independent group of developers should be able to implement and maintain it.
6. **Choose technology to support the learning goal.** GIS data, satellite imagery, game engines, and digital-twin techniques are possible approaches. Scope technical complexity to what is necessary to demonstrate the educational experience and its feasibility.
7. **The solution must not be profit-driven in any way.** Its purpose is education, participation, and public benefit.

## 5. Hack pack data and tools

Use these resources to support the educational experience described above. They are a mix of datasets, catalogs, analysis tools and dashboards. You are not expected to integrate all seven.

Start with a small landscape baseline and one meaningful choice, explain the environmental, social, and economic tradeoffs, and let the player compare alternatives. Observed data can describe a starting condition or historical pattern. A separate, documented rule or model is needed to show consequences of a player’s action.

### Resource guide

Core resources support land cover, degradation and ecosystem services. The three conflict resources are optional context for a Peace Forest Initiative scenario, they do not expand the core youth land-use challenge into conflict prediction.

| **Resource and priority**                                  | **Provides and challenge use**                                                                                                                                                                                     | **Access and limitations**                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESA WorldCover — Core baseline                             | 2021 v200 global land cover at 10 m, 11 classes, Cloud Optimized GeoTIFFs. Build the starting landscape and explain physical cover.                                                                                | CC BY 4.0. Public S3 route available; viewer downloads require login. The 2020 v100 and 2021 v200 algorithms differ, so direct differences are not a clean change map.                          |
| Trends.Earth — Core reference                              | Land-change analysis including SDG 15.3.1 outputs; GeoTIFF outputs with documented class coding. Explain historical degradation and restoration context.                                                           | Analysis tool, not a single ready-made dataset. Period and resolution depend on chosen inputs. For the documented SDG indicator, −32768 is no data; −1 degradation, 0 no change, 1 improvement. |
| Stanford NatCap Data Hub and InVEST — Core modeling option | Catalog of ecosystem-service data and model inputs or outputs; a separate suite of spatial ecosystem-service models. Find inputs or precomputed scenario outputs for one environmental tradeoff.                   | Choose a specific dataset, model and license. Geographic fit, input preparation and parameter validation remain necessary.                                                                      |
| FAO Earth Map — Core exploration option                    | Web analysis of environmental and climate layers for an area of interest. Explore baseline climate, vegetation or water context.                                                                                   | Dates, resolution, source terms and export format vary by layer. Historical analysis is not a causal gameplay model.                                                                            |
| eEARTH — Optional context                                  | International Crisis Group dashboard combining resource, climate and conflict analysis; developed through work in the Horn of Africa. Inform a contextual resource-sharing or cooperation scenario where relevant. | Check regional coverage and each layer’s reuse and export terms. Conflict events can be underreported and unevenly observed; dashboard visibility does not grant redistribution rights.         |
| Climate–Conflict–Vulnerability Index — Optional context    | Quarterly climate, conflict and vulnerability metrics on a 0.5° grid, roughly 55 km at the equator. Regional background for a separately scoped learning scenario.                                                 | CC BY-NC 4.0. Data page offers TSV and Parquet                                                                                                                                                  |
| UNEP–FAO Strata — Optional context                         | Maps overlapping environmental, security and socioeconomic stresses; documentation describes data-layer and CSV exports. Explore converging stresses in an optional Peace Forest Initiative scenario.              | FAQ explicitly says Strata has no predictive or future modeling capacity; hotspots are not event probabilities.                                                                                 |

**Keep conflict resources optional.**
