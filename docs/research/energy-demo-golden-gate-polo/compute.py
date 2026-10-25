#!/usr/bin/env python3
"""Offline SF Polo energy accounting and English milestone handoff; Python 3.9+."""

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IDS = [f'M{i}' for i in range(7)]
EXPECTED_UNKNOWNS = {
    'existing_park_electricity_kwh_year', 'existing_park_fuel_l_year',
    'net_electricity_change_kwh_year', 'peak_it_mw', 'peak_facility_mw',
    'service_voltage_kv', 'available_network_headroom_mw', 'required_grid_upgrade_mw',
    'connection_lead_time_months', 'named_feeder_or_substation',
    'construction_full_energy_total_kwh', 'commissioning_generator_fuel_l',
    'operating_standby_fuel_l_year', 'cooling_only_electricity_mwh_year',
    'household_outage_effect', 'heatwave_power_increment_mw',
}
INPUT_UNITS = {
    'site_area_m2': 'm²', 'roof_area_m2': 'm²', 'average_it_load_mw': 'MW IT average',
    'operation_days': 'days/year', 'annual_site_electricity_pue': 'ratio',
    'cooling_makeup_l_per_kwh_it': 'L/kWh IT',
}


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, label, minimum=0):
    require(not isinstance(value, bool) and isinstance(value, (int, float))
            and math.isfinite(value) and value >= minimum, 'Invalid number: ' + label)
    return value


def integer(value, label, minimum=1):
    number(value, label, minimum)
    require(isinstance(value, int), 'Expected integer: ' + label)
    return value


def safe_path(name):
    result = (ROOT / name).resolve()
    require(ROOT in result.parents, 'Path outside packet: ' + name)
    return result


def source_ids(value, known):
    if isinstance(value, dict):
        if 'source_ids' in value:
            require(isinstance(value['source_ids'], list)
                    and set(value['source_ids']) <= known, 'Unknown evidence source ID')
        for child in value.values():
            source_ids(child, known)
    elif isinstance(value, list):
        for child in value:
            source_ids(child, known)


def resolve(data, path):
    value = data
    try:
        for part in path.split('.'):
            value = value[part]
    except (KeyError, TypeError) as exc:
        raise ValueError('Invalid metric path: ' + path) from exc
    return number(value, path)


def validate(scenario, content, registry):
    known = {item['id'] for item in registry['sources']}
    require(len(known) == len(registry['sources']), 'Duplicate source ID')
    raw = registry['raw_files']
    require(len({item['path'] for item in raw}) == len(raw), 'Duplicate raw file')
    for item in raw:
        require(item['source_id'] in known, 'Unknown raw-file source ID')
        require(hashlib.sha256(safe_path(item['path']).read_bytes()).hexdigest()
                == item['sha256'], 'Frozen source hash mismatch: ' + item['path'])
    for item in [scenario, content]:
        source_ids(item, known)
        require(item['locale'] == 'en', 'English handoff required')
    require(scenario['scenario_id'] == 'sf-polo-turf-energy-v1', 'Wrong scenario identity')
    require([s['id'] for s in scenario['stages']] == IDS, 'Stage IDs/order mismatch')
    require([c['id'] for c in content['cards']] == IDS, 'Card IDs/order mismatch')
    require(not scenario['location']['network_topology_verified'], 'Topology not established')
    require(set(scenario['unknowns']) == EXPECTED_UNKNOWNS
            and all(v is None for v in scenario['unknowns'].values()),
            'Unverified baseline/grid/other outcomes must remain null')
    comparison = scenario['cooling']['comparison']
    require(comparison['status'] == 'not_quantified'
            and comparison['alternative_pue'] is None
            and comparison['alternative_makeup_l_per_kwh_it'] is None,
            'No supported numerical technology comparison in this version')
    require(scenario['grid_context']['status'] == 'not_assessed_for_fictional_campus',
            'Actual campus electrical service has not been assessed')
    inputs = scenario['inputs']
    require(set(inputs) == set(INPUT_UNITS), 'Unexpected/missing input')
    for key, unit in INPUT_UNITS.items():
        require(inputs[key]['unit'] == unit, 'Wrong input unit: ' + key)
        number(inputs[key]['value'], key)
    require(inputs['annual_site_electricity_pue']['value'] >= 1, 'PUE below one')
    require(math.isclose(inputs['annual_site_electricity_pue']['value'], 1.20),
            'Closed baseline selects PUE 1.20; revise evidence/copy for another choice')
    inheritance = scenario['inherits']
    require({inheritance['snapshot'], inheritance['results_snapshot']}
            <= {item['path'] for item in raw}, 'Inherited snapshots must be hash-registered')
    water = read(inheritance['snapshot'])
    water_results = read(inheritance['results_snapshot'])
    require(water['scenario_id'] == water_results['scenario_id']
            == inheritance['scenario_id'] == 'sf-polo-turf-water-v1', 'Water identity mismatch')
    wi = water['inputs']
    for ours, inherited in [
        ('site_area_m2', 'site_area_m2'), ('roof_area_m2', 'roof_area_m2'),
        ('average_it_load_mw', 'average_it_load_mw'), ('operation_days', 'operation_days'),
        ('cooling_makeup_l_per_kwh_it', 'cooling_supply_l_kwh_it'),
    ]:
        require(inputs[ours]['value'] == wi[inherited]['value'],
                'Inherited value mismatch: ' + ours)
    require(scenario['cooling']['technology'] == wi['cooling_technology']['value'],
            'Inherited cooling technology mismatch')
    require([s['id'] for s in water['stages']] == IDS, 'Inherited stage mismatch')
    for i, stage in enumerate(scenario['stages']):
        workdays = stage['workdays']
        if i in (0, 6):
            require(workdays is None and not stage['diesel'] and not stage['electricity'],
                    'M0/M6 cannot contain preopening inventories')
            continue
        integer(workdays, stage['id'] + ' workdays')
        expected = water['stages'][i]['worker_days'] if i < 5 else wi['commissioning_workdays']['value']
        require(workdays == expected, 'Inherited workday mismatch')
        for item in stage['diesel']:
            integer(item['count'], 'machine count')
            hours = number(item['hours_per_machine_workday'], 'engine hours')
            require(hours <= 24, 'Engine hours exceed one day')
            number(item['fuel_l_per_machine_hour'], 'fuel rate')
            require(item['kind'] == 'scenario_assumption', 'Fleet is not measured')
        for item in stage['electricity']:
            number(item['average_kw'], 'average electrical draw')
            hours = number(item['hours_per_workday'], 'electrical hours')
            require(hours <= 24, 'Electrical hours exceed one day')
            require(item['kind'] == 'scenario_assumption', 'Temporary/test load is authored')
    require(sum(s['workdays'] for s in scenario['stages'][1:5])
            == wi['construction_workdays']['value'], 'Construction programme mismatch')
    return water_results


def build(scenario, content, registry):
    water_results = validate(scenario, content, registry)
    inputs = {key: item['value'] for key, item in scenario['inputs'].items()}
    hours = inputs['operation_days'] * 24
    it = inputs['average_it_load_mw'] * hours
    facility = it * inputs['annual_site_electricity_pue']
    overhead = facility - it
    makeup = it * inputs['cooling_makeup_l_per_kwh_it']
    water_op = water_results['operation']
    require(math.isclose(makeup, water_op['annual_supply_by_use_m3']['cooling']),
            'Annual cooling make-up does not reproduce water packet')
    require(math.isclose(makeup / inputs['operation_days'], water_op['daily_average_cooling_supply_m3']),
            'Daily cooling make-up mismatch')
    operation = dict(
        hours_per_year=hours, average_it_mw=inputs['average_it_load_mw'],
        average_facility_mw=facility / hours, annual_site_electricity_pue=inputs['annual_site_electricity_pue'],
        it_electricity_mwh_year=it, non_it_electricity_mwh_year=overhead,
        facility_electricity_mwh_year=facility, non_it_share_of_facility_percent=overhead / facility * 100,
        non_it_percent_of_it=overhead / it * 100,
        cooling_makeup_m3_year=makeup, cooling_makeup_m3_average_day=makeup / inputs['operation_days'],
        cooling_evaporation_m3_year=water_op['annual_cooling_evaporation_m3'],
        cooling_blowdown_m3_year=water_op['annual_cooling_blowdown_m3'],
        cooling_only_electricity_mwh_year=None, peak_facility_mw=None,
        net_electricity_change_mwh_year=None, operating_standby_fuel_l_year=None,
        evidence='Derived teaching budget; transferred SJ04 design PUE; inherited authored average IT and make-up intensity.',
        source_ids=['W01', 'E01'],
        boundary='Normal operating site electricity, assumed grid supplied; standby fuel and complete lifecycle energy excluded.',
    )
    require(math.isclose(it + overhead, facility), 'Electrical balance failed')
    require(math.isclose(operation['cooling_evaporation_m3_year'] + operation['cooling_blowdown_m3_year'], makeup),
            'Inherited water balance failed')
    stages = []
    fuel_sum = 0.0
    electricity_sum = 0.0
    for stage in scenario['stages']:
        days = stage['workdays']
        fuel = (sum(d['count'] * d['hours_per_machine_workday'] * d['fuel_l_per_machine_hour'] * days
                    for d in stage['diesel']) if stage['diesel'] else None)
        electricity = (sum(e['average_kw'] * e['hours_per_workday'] * days
                           for e in stage['electricity']) if stage['electricity'] else None)
        if fuel is not None:
            fuel_sum += fuel
        if electricity is not None:
            electricity_sum += electricity
        stages.append(dict(id=stage['id'], workdays=days, selected_diesel_l=fuel,
                           selected_electricity_kwh=electricity, inventory_status=stage['inventory_status']))
    results = dict(
        scenario_id=scenario['scenario_id'], as_of=scenario['as_of'], generated_by='compute.py',
        operation=operation, stages=stages,
        selected_preopening_inventory_sums=dict(
            diesel_l=fuel_sum, grid_electricity_kwh=electricity_sum,
            is_complete_construction_or_commissioning_energy=False,
            scope='Sum of listed M1–M5 inventory items only. Missing categories are not zero; no lifecycle total or fuel-to-electricity addition.',
        ),
        unknowns=copy.deepcopy(scenario['unknowns']), cooling_comparison=copy.deepcopy(scenario['cooling']['comparison']),
    )
    cards = []
    definitions = content['metric_definitions']
    for item in content['cards']:
        card = copy.deepcopy(item)
        stage = stages[IDS.index(card['id'])]
        data = dict(site_area_m2=inputs['site_area_m2'], stage=stage,
                    operation=operation if card['id'] == 'M6' else None,
                    unknowns=copy.deepcopy(scenario['unknowns']))
        for path in card['primary_metrics'] + card['detail_metrics']:
            require(path in definitions, 'Metric definition missing: ' + path)
            resolve(data, path)
        card.update(data=data, evidence_status='Authored educational scenario; not a measured development',
                    metric_time_basis='Read each metric definition; construction stage and full operating year are distinct.')
        cards.append(card)
    handoff = dict(schema_version=1, scenario_id=scenario['scenario_id'], locale='en', as_of=scenario['as_of'],
                   shared=content['shared'], metric_definitions=definitions,
                   grid_context=scenario['grid_context'], location=scenario['location'],
                   electrical_boundary=scenario['electrical_boundary'],
                   cooling_comparison=scenario['cooling']['comparison'], cards=cards)
    return results, handoff


def displayed(card, path, definitions):
    d = definitions[path]
    value = resolve(card['data'], path) * d['display_multiplier']
    return f"{value:,.3f}".rstrip('0').rstrip('.') + ' ' + d['display_unit']


def outputs(results, handoff):
    op = results['operation']
    lines = ['# Generated energy results', '',
             'All quantities belong to an authored educational scenario. Reproduce with `python3 compute.py`; check with `python3 compute.py --check`.', '',
             '## Normal operation', '',
             '| Metric | Result |', '| --- | ---: |',
             f"| Average IT electrical demand | {op['average_it_mw']:g} MW |",
             f"| Selected annual site-electricity PUE | {op['annual_site_electricity_pue']:g} |",
             f"| IT electricity | {op['it_electricity_mwh_year']:,.0f} MWh/year |",
             f"| Supporting-system electricity | {op['non_it_electricity_mwh_year']:,.0f} MWh/year |",
             f"| Facility electricity | {op['facility_electricity_mwh_year']:,.0f} MWh/year |",
             f"| Average facility demand | {op['average_facility_mw']:g} MW, not peak |",
             f"| Supporting-system share of facility electricity | {op['non_it_share_of_facility_percent']:.2f}% |",
             f"| Inherited cooling make-up | {op['cooling_makeup_m3_year']:,.0f} m³/year; {op['cooling_makeup_m3_average_day']:g} m³/average day |", '',
             'PUE transfers a developer design average to this scenario. Supporting systems include cooling, electrical losses and other loads. Their combined budget is not cooling electricity alone. Make-up water is supply, including blowdown; it is not all evaporated.', '',
             '## Selected preopening inventories', '',
             '| Stage | Authored workdays | Selected diesel, L/stage | Selected electricity, kWh/stage |',
             '| --- | ---: | ---: | ---: |']
    for stage in results['stages'][1:6]:
        def cell(v):
            return 'Not inventoried' if v is None else f'{v:,.0f}'
        lines.append(f"| {stage['id']} | {stage['workdays']} | {cell(stage['selected_diesel_l'])} | {cell(stage['selected_electricity_kwh'])} |")
    sums = results['selected_preopening_inventory_sums']
    lines += ['', f"Listed-item sums: **{sums['diesel_l']:,.0f} L diesel** and **{sums['grid_electricity_kwh']:,.0f} kWh grid electricity**, kept separate. These are partial inventories; unlisted uses and generator tests are not zero. No full construction or lifecycle energy total is available.", '',
              '## Unknowns and comparison', '',
              'Existing park energy, net electricity change, peak demand, capacity allocation, actual cable/substation routes, required reinforcement, standby fuel and cooling-only electricity are not established. No numeric alternative cooling design or heatwave outcome is supplied.', '']
    walkthrough = ['# Seven energy milestones for Golden Gate Park Polo Fields', '', handoff['shared']['default_view'], '',
                   'Read each figure with its unit, time basis and evidence label. All stage budgets are selected teaching inventories. The city-network strip is schematic.', '']
    wider = ['# Electricity beyond the Polo Fields site', '',
             'Use a small, explicitly schematic strip: **regional supply → distribution → campus and existing users**. It explains relationships; it does not map a shared feeder, allocated capacity or power-flow result.', '',
             'City-owned-property development must apply for Hetch Hetchy Power; service and delivery design still require assessment. SFPUC describes service points involving PG&E distribution. CleanPowerSF is a separate local example of procurement using PG&E delivery, not the campus supplier. [SFPUC developers](https://www.sfpuc.gov/hetch-hetchy-power), [CleanPowerSF FAQ](https://cleanpowersf.org/faq).', '']
    for card in handoff['cards']:
        walkthrough += [f"## {card['id']} {card['title']}", '', '**Automatic scene:** ' + card['animation'], '',
                        '**What changes:** ' + card['what_changed'], '', '**Why:** ' + card['why'], '',
                        '**Meaning:** ' + card['meaning'], '', '| Primary metric | Display | Time basis and evidence |',
                        '| --- | --- | --- |']
        for path in card['primary_metrics']:
            d = handoff['metric_definitions'][path]
            walkthrough.append(f"| {path} | {displayed(card, path, handoff['metric_definitions'])} | {d['time_basis']}; {d['evidence_label']} |")
        walkthrough += ['', '**Visible assumptions:** ' + ' '.join(card['visible_assumptions']), '',
                        '**Limits:** ' + card['uncertainty'], '',
                        '**Beyond the site:** ' + card['wider_context']['default_explanation'], '',
                        '**Status:** ' + card['wider_context']['status_note'], '',
                        '**Evidence:** ' + ', '.join(card['source_ids']) + ' in [the source registry](sources.json).', '']
        wider += [f"## {card['id']} {card['title']}", '', card['wider_context']['default_explanation'], '',
                  '**Animation:** ' + card['wider_context']['animation_instructions'], '',
                  '**Status:** ' + card['wider_context']['status_note'], '']
    wider += ['## Optional contextual questions', '']
    for item in handoff['shared']['optional_questions']:
        wider += ['**' + item['question'] + '**', '', item['answer'], '',
                  'Source IDs: ' + ', '.join(item['source_ids']) + ' in [sources.json](sources.json).', '']
    return {'results.json': json.dumps(results, indent=2, ensure_ascii=False) + '\n',
            'milestones.en.json': json.dumps(handoff, indent=2, ensure_ascii=False) + '\n',
            'results.md': '\n'.join(lines), 'walkthrough.en.md': '\n'.join(walkthrough),
            'wider-energy-story.md': '\n'.join(wider)}


def preservation_check():
    manifest = read('preservation-sha256.json')['captured_before_energy_work']
    repo = ROOT.parents[2]
    checked = 0
    for name, digest in manifest.items():
        path = (repo / name).resolve()
        require(repo in path.parents, 'Preservation path outside repository')
        if path.exists():
            require(hashlib.sha256(path.read_bytes()).hexdigest() == digest,
                    'Existing packet changed since energy baseline: ' + name)
            checked += 1
    return checked, len(manifest)


def self_test(scenario, content, registry):
    cases = []
    def case(name, change):
        s, c, r = copy.deepcopy((scenario, content, registry))
        change(s, c, r)
        cases.append((name, s, c, r))
    case('PUE below one', lambda s, c, r: s['inputs']['annual_site_electricity_pue'].update(value=0.9))
    case('Wrong units', lambda s, c, r: s['inputs']['average_it_load_mw'].update(unit='kW'))
    case('IT utilization applied twice', lambda s, c, r: s['inputs']['average_it_load_mw'].update(value=7))
    case('Negative machine hours', lambda s, c, r: s['stages'][1]['diesel'][0].update(hours_per_machine_workday=-1))
    case('Nonfinite fuel rate', lambda s, c, r: s['stages'][2]['diesel'][0].update(fuel_l_per_machine_hour=float('nan')))
    case('Invented capacity', lambda s, c, r: s['unknowns'].update(available_network_headroom_mw=20))
    case('Numerical unverified cooling alternative', lambda s, c, r: s['cooling']['comparison'].update(alternative_pue=1.3))
    case('Missing metric', lambda s, c, r: c['cards'][6]['primary_metrics'].append('operation.missing'))
    case('Unknown shown as zero/numeric', lambda s, c, r: c['cards'][0]['primary_metrics'].append('unknowns.peak_facility_mw'))
    case('Wrong stage order', lambda s, c, r: c['cards'][0].update(id='M1'))
    case('Unknown source', lambda s, c, r: c['cards'][0]['source_ids'].append('MISSING'))
    case('Corrupt frozen provenance', lambda s, c, r: r['raw_files'][0].update(sha256='0' * 64))
    case('Changed workday programme', lambda s, c, r: s['stages'][2].update(workdays=31))
    case('Boolean fuel quantity', lambda s, c, r: s['stages'][2]['diesel'][0].update(count=True))
    for name, s, c, r in cases:
        try:
            build(s, c, r)
        except ValueError:
            continue
        raise ValueError('Negative case was accepted: ' + name)
    first = outputs(*build(scenario, content, registry))
    second = outputs(*build(scenario, content, registry))
    require(first == second, 'Generation/replay is not stateless')
    print(f'PASS: {len(cases)} rejected invalid-input cases and stateless repeated generation.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify deterministic files without writing')
    parser.add_argument('--self-test', action='store_true', help='Exercise accounting/provenance guardrails')
    args = parser.parse_args()
    scenario, content, registry = read('scenario.json'), read('milestone-copy.en.json'), read('sources.json')
    generated = outputs(*build(scenario, content, registry))
    checked, recorded = preservation_check()
    for name, expected in generated.items():
        path = ROOT / name
        if args.check:
            require(path.exists() and path.read_text(encoding='utf-8') == expected,
                    'Generated artifact stale: ' + name)
        else:
            path.write_text(expected, encoding='utf-8')
    if args.self_test:
        self_test(scenario, content, registry)
    print('PASS: source hashes, inherited water/schedule, energy and water balance, units, unknowns and seven English cards.')
    print(f'Preservation: {checked}/{recorded} recorded sibling files present and byte-identical; bundled inheritance supports standalone reproduction.')


if __name__ == '__main__':
    main()
