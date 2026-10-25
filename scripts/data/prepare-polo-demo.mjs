/* global console */
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { format, resolveConfig } from 'prettier'

const root = resolve(import.meta.dirname, '../..')
const output = join(root, 'src/game/polo/baseline.generated.json')
const check = process.argv.includes('--check')
if (process.argv.slice(2).some((value) => value !== '--check'))
  throw new Error('Usage: node scripts/data/prepare-polo-demo.mjs [--check]')
const scratch = await mkdtemp(join(tmpdir(), 'landshift-polo-baseline-'))
const phases = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']
const packetNames = {
  water: 'water-demo-golden-gate-polo',
  energy: 'energy-demo-golden-gate-polo',
}
const generatedNames = {
  water: [
    'results.json',
    'milestones.sk.json',
    'results.md',
    'walkthrough.sk.md',
    'wider-water-story.md',
  ],
  energy: [
    'results.json',
    'milestones.en.json',
    'results.md',
    'walkthrough.en.md',
    'wider-energy-story.md',
  ],
}
const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function sameValue(expected, actual, path) {
  if (typeof expected === 'number' && typeof actual === 'number') {
    // Python versions can serialize summation results a few ulps apart.
    assert(
      Number.isFinite(actual) &&
        Math.abs(actual - expected) <= 1e-8 + Math.abs(expected) * 1e-12,
      'Research numerical drift: ' + path,
    )
  } else if (Array.isArray(expected)) {
    assert(
      Array.isArray(actual) && actual.length === expected.length,
      'Research array drift: ' + path,
    )
    expected.forEach((value, index) =>
      sameValue(value, actual[index], path + '.' + index),
    )
  } else if (expected !== null && typeof expected === 'object') {
    assert(
      actual !== null &&
        typeof actual === 'object' &&
        JSON.stringify(Object.keys(expected).sort()) ===
          JSON.stringify(Object.keys(actual).sort()),
      'Research shape drift: ' + path,
    )
    for (const key of Object.keys(expected))
      sameValue(expected[key], actual[key], path + '.' + key)
  } else assert(expected === actual, 'Research content drift: ' + path)
}
function python(packet, args = []) {
  const result = spawnSync('python3', [join(packet, 'compute.py'), ...args], {
    cwd: packet,
    encoding: 'utf8',
    timeout: 30000,
  })
  if (result.error) throw result.error
  assert(
    result.status === 0,
    'Research generator failed:\n' + result.stdout + result.stderr,
  )
}
const number = (value, digits = 0) =>
  value === null
    ? 'Not established'
    : value.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
const metric = (label, value, detail) => ({ label, value, detail })
const sourceHashes = {}
try {
  const packets = {}
  for (const [kind, name] of Object.entries(packetNames)) {
    const original = join(root, 'docs/research', name)
    // Each packet is intentionally standalone: the energy packet's frozen inherited
    // water snapshots remain intact, instead of being replaced by regenerated data.
    const copied = join(scratch, kind, 'docs/research', name)
    await cp(original, copied, { recursive: true })
    python(copied)
    python(copied, kind === 'energy' ? ['--check', '--self-test'] : ['--check'])
    for (const name of generatedNames[kind]) {
      const oldText = await readFile(join(original, name), 'utf8')
      const newText = await readFile(join(copied, name), 'utf8')
      if (name.endsWith('.json'))
        sameValue(JSON.parse(oldText), JSON.parse(newText), kind + '/' + name)
      else
        assert(
          oldText === newText,
          'Research generated text drift: ' + kind + '/' + name,
        )
    }
    const handoff =
      kind === 'water' ? 'milestones.sk.json' : 'milestones.en.json'
    for (const name of [
      'compute.py',
      'scenario.json',
      'sources.json',
      handoff,
    ]) {
      sourceHashes['docs/research/' + packetNames[kind] + '/' + name] =
        createHash('sha256')
          .update(await readFile(join(original, name)))
          .digest('hex')
    }
    packets[kind] = {
      cards: await json(join(copied, handoff)),
      scenario: await json(join(copied, 'scenario.json')),
      sources: await json(join(copied, 'sources.json')),
    }
  }
  const water = packets.water.cards,
    energy = packets.energy.cards
  assert(
    JSON.stringify(water.cards.map((card) => card.id)) ===
      JSON.stringify(phases),
    'Water phase order changed',
  )
  assert(
    JSON.stringify(energy.cards.map((card) => card.id)) ===
      JSON.stringify(phases),
    'Energy phase order changed',
  )
  const waterOperation = water.cards[6].data.operation
  const energyOperation = energy.cards[6].data.operation
  const baseline = {
    researchPhases: phases.map((id, index) => {
      const w = water.cards[index],
        e = energy.cards[index]
      const data = {
        areasM2: w.data.areas_m2,
        rainfallMm: w.data.rainfall_mm,
        rainRunoffM3: w.data.event?.generated_surface_runoff_m3 ?? null,
        rainCapturedM3: w.data.event?.roof_capture_m3 ?? null,
        rainManagedDrainageM3:
          w.data.event?.water_to_managed_drainage_m3 ?? null,
        stageWaterSuppliedM3: w.data.step_site_supplied_m3,
        offsiteConcreteWaterM3: w.data.step_offsite_concrete_mixing_m3,
        selectedDieselL: e.data.stage.selected_diesel_l,
        selectedElectricityKWh: e.data.stage.selected_electricity_kwh,
        workdays: e.data.stage.workdays,
        sourceIds: { water: w.source_ids, energy: e.source_ids },
      }
      const waterMetric = metric(
        'Work water',
        number(data.stageWaterSuppliedM3) + ' m³',
        'Selected water supplied to site during this whole step; research teaching budget, not a measurement.',
      )
      const dieselMetric = metric(
        'Selected diesel',
        number(data.selectedDieselL) + ' L',
        'Illustrative selected equipment allowance over ' +
          data.workdays +
          ' workdays; not the whole construction inventory.',
      )
      const runoffMetric = metric(
        'Rain runoff',
        number(data.rainRunoffM3 / 1000, 1) + ' million L',
        'Modelled runoff during the same 86.4 mm daily rainfall replay; not an annual total or a flood prediction.',
      )
      const cards = {
        M0: {
          title: 'Today',
          kicker: 'A place people already use',
          summary:
            'A four-hectare patch of playing-field grass supports sport and meeting. The trees and track around it stay outside this example.',
          tradeoff:
            'The field already needs care and water. Its actual water sources and energy use are not established.',
          metrics: [
            metric(
              'Demo area',
              number(e.data.site_area_m2 / 10000, 1) + ' ha',
              'Authored subset of the Polo Fields, not the entire venue or a surveyed development plot.',
            ),
            metric(
              'Model irrigation',
              number(
                w.data.no_build_baseline.annual_irrigation_supplied_m3 / 1000,
                1,
              ) + ' million L/year',
              'No-build teaching allowance: 300 mm delivered to 4 ha each year; not metered park demand.',
            ),
          ],
          details: [
            'The campus is inactive. Existing park energy use is not established, not zero.',
            'Optional rain replay: 86.4 mm recorded by NOAA San Francisco Downtown on December 11, 2014, about 5.8 km away. It is not an on-field observation.',
          ],
        },
        M1: {
          title: 'Lift the turf',
          kicker: 'Site preparation · 1 / 3',
          summary:
            'A tractor strips grass from the work area. Some original turf stays; surrounding trees are left in place.',
          tradeoff:
            'Removing turf changes the place people use and adds fuel and supplied-water needs. Runoff at this transitional step is not calculated.',
          metrics: [
            metric(
              'Turf removed',
              number(data.areasM2.stripped_not_graded / 10000, 1) + ' ha',
              'Authored removal within the four-hectare demo area; no tree removal is included.',
            ),
            dieselMetric,
            waterMetric,
          ],
          details: [
            '10 selected workdays. The animation duration is not real elapsed construction time.',
            '0.8 ha of original turf remains. The ground has not yet been graded.',
            'Runoff is not established at this stripped-but-ungraded transition; it must not appear as zero.',
          ],
        },
        M2: {
          title: 'Shape the ground',
          kicker: 'Site preparation · 2 / 3',
          summary:
            'Earthmoving machines grade the already stripped ground. Replay the same rain to see what the changed surface means for drainage.',
          tradeoff:
            'Preparing the ground adds work-water and fuel demand. More modelled runoff needs management; no lake pollution is calculated.',
          metrics: [dieselMetric, waterMetric, runoffMetric],
          details: [
            '30 selected workdays; two illustrative earthmoving machines. Hauling, water trucks and other plant are not fully inventoried.',
            'The runoff method uses an assumed soil group B and the same rainfall at every phase. Actual field soil and flood depths are not established.',
          ],
        },
        M3: {
          title: 'Firm the ground',
          kicker: 'Site preparation · 3 / 3',
          summary:
            'A roller compacts the same prepared area. It does not clear another patch of grass.',
          tradeoff:
            'Another step uses water and fuel. This research does not assign compaction an extra runoff increase.',
          metrics: [dieselMetric, waterMetric, runoffMetric],
          details: [
            '15 selected workdays. The original 0.8 ha of turf still remains.',
            'Runoff is intentionally identical to the grading step under the prepared model; do not invent a compaction multiplier.',
          ],
        },
        M4: {
          title: 'Build the campus',
          kicker: 'Construction',
          summary:
            'Buildings rise on part of the prepared area. Construction needs supplied water, selected machinery and temporary electricity.',
          tradeoff:
            'Water used on site and water mixed into concrete elsewhere are separate. These are selected allowances, not a complete construction footprint.',
          metrics: [
            metric(
              'Roof footprint',
              number(data.areasM2.roof / 10000, 1) + ' ha',
              'Authored building roof area, not an inferred server capacity or total floor area.',
            ),
            metric(
              'Selected electricity',
              number(data.selectedElectricityKWh / 1000, 1) + ' MWh',
              'Illustrative selected temporary-power allowance over 160 workdays.',
            ),
            dieselMetric,
          ],
          details: [
            '160 selected workdays. 2 ha remains bare and 0.8 ha remains original turf at this stage.',
            'Selected water supplied on site: ' +
              number(data.stageWaterSuppliedM3) +
              ' m³ for this whole step.',
            'Selected offsite concrete-mixing water: ' +
              number(data.offsiteConcreteWaterM3) +
              ' m³, kept separate from site supply.',
            'Contained washwater is illustrated; an unverified discharge to a park lake is not.',
          ],
        },
        M5: {
          title: 'Get ready to open',
          kicker: 'Opening',
          summary:
            'Cooling equipment and electrical tests come online. A roof tank captures part of the rain; the rest still needs managed drainage.',
          tradeoff:
            'Storage helps with one rainfall event. It does not create an annual water supply or prove the utilities have spare capacity.',
          metrics: [
            metric(
              'Selected test electricity',
              number(data.selectedElectricityKWh / 1000) + ' MWh',
              'Illustrative selected grid tests over ten commissioning workdays; generator-test fuel is unknown.',
            ),
            metric(
              'Roof rain captured',
              number(data.rainCapturedM3) + ' m³',
              'Capture from the same 86.4 mm event, with the 200 m³ tank starting empty and no within-event release or reuse.',
            ),
            metric(
              'Onward drainage',
              number(data.rainManagedDrainageM3 / 1000, 1) + ' million L',
              'Modelled volume needing managed drainage during this event; no peak-flow or flood-protection claim.',
            ),
          ],
          details: [
            'Final surface mix: 1.2 ha roofs, 1.6 ha hard surfaces, 0.4 ha restored landscape and 0.8 ha retained turf.',
            'Selected supplied water for this commissioning step: ' +
              number(data.stageWaterSuppliedM3) +
              ' m³.',
            'Actual utility connection, spare capacity and full commissioning inventory are not established.',
          ],
        },
        M6: {
          title: 'Switch it on',
          kicker: 'Operation',
          summary:
            'Computing needs electricity and cooling every day. Follow the water and power paths, then explore three possible changes.',
          tradeoff:
            'Supporting systems also use power. Some cooling water evaporates and some becomes managed wastewater; shared-system capacity is not assessed.',
          metrics: [
            metric(
              'Average facility demand',
              number(energyOperation.average_facility_mw) + ' MW',
              'Annual-average electrical demand at the selected PUE, not peak load or connection rating.',
            ),
            metric(
              'Facility electricity',
              number(energyOperation.facility_electricity_mwh_year / 1000, 2) +
                ' GWh/year',
              'First full 365-day operating year: IT plus all supporting systems; not cooling alone.',
            ),
            metric(
              'Cooling water supplied',
              number(waterOperation.daily_average_cooling_supply_m3) +
                ' m³/day',
              'Annual-average cooling make-up, not a hot-day peak. Domestic supply and irrigation are separate.',
            ),
          ],
          details: [
            'Average IT electricity demand: ' +
              number(energyOperation.average_it_mw) +
              ' MW. It is already an average; do not apply utilization a second time.',
            'IT electricity: ' +
              number(energyOperation.it_electricity_mwh_year / 1000, 2) +
              ' GWh/year. Supporting systems: ' +
              number(energyOperation.non_it_electricity_mwh_year / 1000, 2) +
              ' GWh/year, including cooling, electrical losses and other systems.',
            'Cooling water: ' +
              number(waterOperation.daily_average_cooling_evaporation_m3) +
              ' m³/day evaporates and ' +
              number(waterOperation.daily_average_cooling_blowdown_m3) +
              ' m³/day becomes blowdown to an assumed managed sanitary connection.',
            'All-source supplied water in the first operating year: ' +
              number(waterOperation.first_year_total_supplied_m3) +
              ' m³. This is supplied volume, not net consumptive use.',
            'The current three proposal previews show no calculated savings. A separate two-building heat teaching-data packet is ready for later UI integration; recycled water and green roof remain qualitative concepts.',
          ],
        },
      }
      return { id, ...cards[id], data }
    }),
    reference: {
      siteAreaM2: energy.cards[0].data.site_area_m2,
      roofAreaM2: water.cards[6].data.areas_m2.roof,
      averageItMW: energyOperation.average_it_mw,
      averageFacilityMW: energyOperation.average_facility_mw,
      facilityElectricityGWhYear:
        energyOperation.facility_electricity_mwh_year / 1000,
      supportingElectricityGWhYear:
        energyOperation.non_it_electricity_mwh_year / 1000,
      coolingMakeupM3Day: waterOperation.daily_average_cooling_supply_m3,
      rainfallMm: water.cards[0].data.rainfall_mm,
      existingParkElectricityKWhYear:
        energy.cards[0].data.unknowns.existing_park_electricity_kwh_year,
      gridHeadroomMW:
        energy.cards[6].data.unknowns.available_network_headroom_mw,
      peakFacilityMW: energy.cards[6].data.unknowns.peak_facility_mw,
    },
    assumptions: [
      'Fictional educational campus on a schematic four-hectare grass subset of Polo Fields; not an actual development proposal or surveyed fit.',
      '3.2 ha of turf is disturbed; surrounding trees and track are excluded. New planting does not replace public playing space.',
      '10 MW is average IT demand. The transferred annual electrical PUE is 1.20; neither is measured Polo Fields performance.',
      'Cooling make-up is an assumed 1.25 L/kWh IT with concentration ratio 4; coastal-climate performance is unverified.',
      'The rain replay uses a real nearby station observation with assumed soil and runoff conditions; it is not a reconstruction or flood forecast.',
      'A replay restores a complete phase. It never adds water, fuel or electricity to an accumulated score.',
      'The running proposal previews show no calculated benefits or combined savings. Two-building heat teaching data are available separately with UI integration pending; recycled water and green roof remain concepts.',
    ],
    sources: [
      ...packets.water.sources.sources,
      ...packets.energy.sources.sources,
    ]
      .filter(
        (source, index, all) =>
          /^https:\/\//.test(source.url) &&
          all.findIndex((item) => item.url === source.url) === index,
      )
      .map((source) => ({ title: source.title, url: source.url })),
    provenance: {
      generator: 'node scripts/data/prepare-polo-demo.mjs',
      researchScenarioIds: [water.scenario_id, energy.scenario_id],
      researchSha256: sourceHashes,
      validation: [
        'Both original Python generators reproduced offline in isolated temporary copies.',
        'Water --check and energy --check --self-test passed, including source hashes and 14 negative energy cases.',
        'Generated JSON matches frozen research within 1e-8 absolute plus 1e-12 relative tolerance; all nonnumeric content is identical.',
        'Runtime copy is normalized English teaching text; source research was not modified.',
      ],
    },
  }
  // Five presentation chapters over seven unchanged analytical snapshots. The
  // foundations checkpoint is newly authored geometry, not research M1 runoff
  // or an invented split of the original M4 construction water/fuel budgets.
  const [today, , , , construction, ready, operating] = baseline.researchPhases
  const foundations = {
    id: 'M1',
    title: 'Foundations',
    kicker: '2 / 5 · Prepare and lay the foundations',
    summary:
      'Briefly lift, shape and firm the same ground, then pour the foundations. The building outline is now visible; the original turf around the work area stays.',
    tradeoff:
      'The field changes before the building rises. Foundation-only water, fuel and rain runoff are not separately assessed.',
    metrics: [
      metric(
        'Turf disturbed',
        '3.2 ha',
        'Unique ground worked inside the authored campus; counted once across preparation and construction, with no tree removal.',
      ),
      metric(
        'Foundation footprint',
        '1.2 ha',
        'Authored visual checkpoint using the planned building footprint, not a surveyed foundation design or new runoff calculation.',
      ),
    ],
    details: [
      'Preparation is a short sequence inside this chapter. The foundation slabs then appear before the frame and roof in Structure.',
      'This new checkpoint has 0.8 ha retained turf, 2 ha bare works and 1.2 ha schematic foundation slabs. Foundation runoff is not quantified.',
      'Original stripping, grading and compaction inventories remain separate in the research details. The original 160-workday construction budget covers foundations and structure together; no foundation-only share is invented.',
      'The same-rain comparison for prepared ground remains available in the research details. Grading and compaction have equal modelled runoff; stripping-only runoff remains unknown.',
    ],
    data: {
      ...construction.data,
      areasM2: {
        turf: 8000,
        stripped_not_graded: 0,
        bare_graded: 20000,
        roof: 0,
        other_impervious: 12000,
        landscape: 0,
      },
      rainRunoffM3: null,
      rainCapturedM3: null,
      rainManagedDrainageM3: null,
      stageWaterSuppliedM3: null,
      offsiteConcreteWaterM3: null,
      selectedDieselL: null,
      selectedElectricityKWh: null,
      workdays: null,
      sourceIds: {
        water: [
          ...new Set(
            baseline.researchPhases
              .slice(1, 5)
              .flatMap((phase) => phase.data.sourceIds.water),
          ),
        ],
        energy: [
          ...new Set(
            baseline.researchPhases
              .slice(1, 5)
              .flatMap((phase) => phase.data.sourceIds.energy),
          ),
        ],
      },
    },
  }
  const structure = {
    ...construction,
    title: 'Structure',
    kicker: '3 / 5 · Raise the frame and fit the roofs',
    summary:
      'Steel rises from the completed foundations, then roof panels follow. The open structure remains visible before the walls and services are fitted in Ready.',
    metrics: construction.metrics.map((item) => ({
      ...item,
      detail:
        item.detail +
        ' Construction inventories cover foundations and structure together, not an additional budget for this chapter.',
    })),
    details: [
      'The foundations remain in place throughout. Frame and roof grow in sequence; walls, hardstanding and planting follow in Ready.',
      ...construction.details,
      'All construction inventory figures cover the original whole 160-workday stage, including foundations. They are not allocated between the Foundations and Structure chapters or added on replay.',
    ],
  }
  baseline.phases = [
    { ...today, kicker: '1 / 5 · A place people already use' },
    foundations,
    structure,
    {
      ...ready,
      title: 'Ready',
      kicker: '4 / 5 · Finish and test',
      summary:
        'Close the walls, fit equipment, finish the grounds and test the systems. The roof tank is available, but computing and everyday cooling have not started.',
    },
    {
      ...operating,
      title: 'Operating',
      kicker: '5 / 5 · Switch on recurring demand',
    },
  ]
  assert(
    baseline.phases.every(
      (phase) => phase.metrics.length >= 2 && phase.metrics.length <= 3,
    ),
    'Each phase needs two or three primary figures',
  )
  const expected = await format(JSON.stringify(baseline), {
    ...(await resolveConfig(output)),
    parser: 'json',
  })
  if (check)
    assert(
      (await readFile(output, 'utf8')) === expected,
      'Polo runtime baseline is stale; run node scripts/data/prepare-polo-demo.mjs',
    )
  else await writeFile(output, expected)
  console.log(
    'PASS: offline research reproduction, provenance, seven research snapshots and five Polo story chapters' +
      (check ? ' (unchanged).' : '.'),
  )
} finally {
  await rm(scratch, { recursive: true, force: true })
}
