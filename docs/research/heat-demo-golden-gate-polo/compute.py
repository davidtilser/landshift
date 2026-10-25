#!/usr/bin/env python3
"""Reproduce a bounded two-building teaching case; no UI or network dependency."""

import argparse
import calendar
import copy
import datetime
import hashlib
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUTS = ('results.json', 'results.md', 'ui-handoff.en.json')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, minimum=0, maximum=None):
    require(type(value) in (int, float) and math.isfinite(value), 'Finite number required')
    require(value >= minimum and (maximum is None or value <= maximum), 'Out-of-range input')
    return value


def validate(scenario):
    require(scenario['reference_year'] == 2026, 'This case uses the 2026 non-leap year')
    model = scenario['model']
    recipients = scenario['recipients']
    require([r['id'] for r in recipients] == ['anglers_lodge', 'senior_center'], 'Fixed pair required')
    require([r['name'] for r in recipients] == ['Anglers Lodge', 'Golden Gate Park Senior Center'], 'Wrong recipient labels')
    weights = model['monthly_demand_percent']
    require(len(weights) == 12, 'Twelve monthly demand weights required')
    require(math.isclose(sum(number(w, 0, 100) for w in weights), 100), 'Demand weights must sum to 100')
    number(model['weekday_heating_hours'], 0.001, 24)
    number(model['heating_cop'], 1.001, 20)
    number(model['it_electricity_to_heat_fraction'], 0, 1)
    for key in ('source_available_kw', 'heat_pump_hot_capacity_kw', 'common_pump_kw', 'controls_kw'):
        number(model[key])
    number(model['source_heat_capacity_kj_kg_k'], 0.001)
    for key in ('source_return_c', 'source_after_recovery_c', 'heat_pump_source_in_c',
                'heat_pump_source_out_c', 'delivery_supply_c', 'delivery_return_c',
                'building_supply_c', 'building_return_c'):
        number(model[key], 1, 100)
    approach = number(model['minimum_exchanger_approach_k'], 0.001)
    require(model['source_return_c'] > model['source_after_recovery_c'], 'Source needs positive temperature drop')
    require(model['heat_pump_source_in_c'] > model['heat_pump_source_out_c'], 'Heat-pump source drop required')
    require(model['source_return_c'] - model['heat_pump_source_in_c'] >= approach, 'Source inlet approach')
    require(model['source_after_recovery_c'] - model['heat_pump_source_out_c'] >= approach, 'Source outlet approach')
    require(model['delivery_supply_c'] > model['delivery_return_c'], 'Delivery temperature drop required')
    require(model['building_supply_c'] > model['building_return_c'], 'Building temperature drop required')
    require(model['delivery_supply_c'] - model['building_supply_c'] >= approach, 'Recipient inlet approach')
    require(model['delivery_return_c'] - model['building_return_c'] >= approach, 'Recipient outlet approach')
    for recipient in recipients:
        number(recipient['annual_useful_heat_demand_mwh'])
        number(recipient['delivery_efficiency'], 0.001, 1)
        number(recipient['assumed_route_length_m'], 0.001)
        number(recipient['branch_hot_capacity_kw'])
        number(recipient['branch_pump_kw'])


def window(demands, recipients, model, hours, source_kw=None):
    """Capacity-cap requests, then share one hot-side budget proportionally."""
    cop = model['heating_cop']
    source_kw = model['source_available_kw'] if source_kw is None else source_kw
    available = source_kw * hours / 1000
    hot_capacity = min(available / (1 - 1 / cop), model['heat_pump_hot_capacity_kw'] * hours / 1000)
    requests = [min(demand / r['delivery_efficiency'], r['branch_hot_capacity_kw'] * hours / 1000)
                for demand, r in zip(demands, recipients)]
    total_request = sum(requests)
    fraction = min(1, hot_capacity / total_request) if total_request else 0
    hot = [fraction * request for request in requests]
    delivered = [q * r['delivery_efficiency'] for q, r in zip(hot, recipients)]
    compressor = sum(hot) / cop
    recovered = sum(hot) - compressor
    auxiliary_kw = (model['common_pump_kw'] + model['controls_kw']
                    + sum(r['branch_pump_kw'] for q, r in zip(hot, recipients) if q > 0)) if sum(hot) > 0 else 0
    auxiliary = auxiliary_kw * hours / 1000
    close = lambda a, b: math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-9)
    require(recovered <= available + 1e-9, 'Shared source overdrawn')
    require(close(sum(hot), recovered + compressor), 'Heat-pump energy balance')
    require(sum(hot) <= model['heat_pump_hot_capacity_kw'] * hours / 1000 + 1e-9, 'Common capacity exceeded')
    branches = []
    for r, demand, q, useful in zip(recipients, demands, hot, delivered):
        require(useful <= demand + 1e-9, 'Delivery exceeds demand')
        require(q <= r['branch_hot_capacity_kw'] * hours / 1000 + 1e-9, 'Branch capacity exceeded')
        branches.append({'id': r['id'], 'demand_mwh_th': demand, 'hot_input_mwh_th': q,
                         'delivered_mwh_th': useful, 'loss_mwh_th': q - useful,
                         'backup_heat_mwh_th': max(0, demand - useful)})
    return {'hours': hours, 'source_available_mwh_th': available,
            'hot_output_mwh_th': sum(hot), 'recovered_source_mwh_th': recovered,
            'compressor_mwh_el': compressor, 'auxiliary_mwh_el': auxiliary,
            'additional_electricity_mwh_el': compressor + auxiliary,
            'delivered_mwh_th': sum(delivered), 'loss_mwh_th': sum(hot) - sum(delivered),
            'branches': branches}


def build(scenario):
    validate(scenario)
    model = scenario['model']
    recipients = scenario['recipients']
    frozen = ROOT / scenario['baseline']['snapshot']
    raw = frozen.read_bytes()
    require(hashlib.sha256(raw).hexdigest() == scenario['baseline']['sha256'], 'Frozen baseline drift')
    baseline = json.loads(raw)['operation']
    require(baseline['average_it_mw'] == 10 and baseline['hours_per_year'] == 8760, 'Inherited case changed')
    require(model['source_available_kw'] <= 1000 * baseline['average_it_mw'] * model['it_electricity_to_heat_fraction'], 'Source exceeds IT-heat reference')
    sibling = ROOT.parent / 'energy-demo-golden-gate-polo' / 'results.json'
    if sibling.exists():
        require(sibling.read_bytes() == raw, 'Current energy baseline differs from frozen input')
    months = []
    for month, weight in enumerate(model['monthly_demand_percent'], 1):
        weekdays = sum(datetime.date(scenario['reference_year'], month, day).weekday() < 5
                       for day in range(1, calendar.monthrange(scenario['reference_year'], month)[1] + 1))
        demands = [r['annual_useful_heat_demand_mwh'] * weight / 100 for r in recipients]
        result = window(demands, recipients, model, weekdays * model['weekday_heating_hours'])
        result.update({'month': month, 'weekdays': weekdays, 'demand_weight_percent': weight})
        months.append(result)
    keys = ('hours', 'source_available_mwh_th', 'hot_output_mwh_th', 'recovered_source_mwh_th',
            'compressor_mwh_el', 'auxiliary_mwh_el', 'additional_electricity_mwh_el', 'delivered_mwh_th', 'loss_mwh_th')
    annual = {key: sum(m[key] for m in months) for key in keys}
    demand = sum(r['annual_useful_heat_demand_mwh'] for r in recipients)
    annual.update({'demand_mwh_th': demand, 'coverage_percent': 100 * annual['delivered_mwh_th'] / demand if demand else None,
                   'backup_heat_mwh_th': demand - annual['delivered_mwh_th'],
                   'it_heat_reference_mwh_th': baseline['it_electricity_mwh_year'] * model['it_electricity_to_heat_fraction'],
                   'baseline_facility_electricity_mwh_el': baseline['facility_electricity_mwh_year']})
    annual['recovered_share_of_it_heat_reference_percent'] = 100 * annual['recovered_source_mwh_th'] / annual['it_heat_reference_mwh_th'] if annual['it_heat_reference_mwh_th'] else None
    annual['it_heat_reference_not_recovered_mwh_th'] = annual['it_heat_reference_mwh_th'] - annual['recovered_source_mwh_th']
    branches = []
    for index, recipient in enumerate(recipients):
        totals = {key: sum(m['branches'][index][key] for m in months)
                  for key in ('demand_mwh_th', 'hot_input_mwh_th', 'delivered_mwh_th', 'loss_mwh_th', 'backup_heat_mwh_th')}
        totals.update({'id': recipient['id'], 'name': recipient['name'],
                       'coverage_percent': 100 * totals['delivered_mwh_th'] / totals['demand_mwh_th'] if totals['demand_mwh_th'] else None})
        branches.append(totals)
    return {'scenario_id': scenario['scenario_id'], 'readiness': 'calculated_teaching_data_ui_not_implemented',
            'reference_year': scenario['reference_year'],
            'input_sha256': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ('scenario.json', 'sources.json')},
            'annual': annual, 'recipients': branches, 'months': months,
            'source_interface_flow_kg_s': model['source_available_kw'] / (model['source_heat_capacity_kj_kg_k'] * (model['source_return_c'] - model['source_after_recovery_c'])),
            'unknowns': {'actual_recipient_demand': None, 'actual_heating_compatibility': None,
                         'net_combined_electricity_change_mwh': None, 'cooling_electricity_credit_mwh': None,
                         'cooling_water_change_m3': None, 'cost_saving': None, 'carbon_saving': None}}


def render(result):
    annual = result['annual']
    handoff = {'scenario_id': result['scenario_id'], 'readiness': result['readiness'],
               'evidence_label': 'Calculated teaching scenario · assumed demand and connections',
               'reference_period': '2026 model year; occupied-weekday space heating only',
               'primary_metrics': [
                   {'label': 'Useful heat delivered', 'value': annual['delivered_mwh_th'], 'unit': 'MWh thermal/year', 'decimals': 1},
                   {'label': 'Combined modelled heat demand covered', 'value': annual['coverage_percent'], 'unit': '%', 'decimals': 1},
                   {'label': 'Additional recovery electricity', 'value': annual['additional_electricity_mwh_el'], 'unit': 'MWh electric/year', 'decimals': 1}],
               'original': {'heat_exported_mwh_th': 0, 'coverage_percent': 0 if annual['demand_mwh_th'] else None,
                            'recovery_electricity_mwh_el': 0, 'recipient_backup_heat_mwh_th': annual['demand_mwh_th']},
               'recipients': result['recipients'],
               'replay': {'control': 'Buildings need heat / Buildings need no heat',
                          'annual_card': 'Fixed reference-year result; this explanatory toggle does not recompute the year.',
                          'off': 'Delivery stops to both buildings; IT and original cooling continue. No exported-heat counter accumulates.'},
               'visibility': {'heat': 'Recommend these three figures only after a separate UI integration.',
                              'recycled_water_and_green_roof': 'Hide all numerical overlays; concepts have no calculated results.'},
               'limits': 'No net electricity, cooling-water, cost or carbon saving is calculated. Annual heating demand, COP, temperatures and connections are assumptions.'}
    lines = ['# Two-building heat results', '', '**Calculated educational case; UI integration not implemented.**', '',
             f"Model year: {result['reference_year']}; occupied weekday heating windows: {annual['hours']:.0f} h.", '',
             '| Quantity | Result |', '| --- | ---: |']
    for metric in handoff['primary_metrics']:
        value = 'Not applicable' if metric['value'] is None else f"{metric['value']:.1f} {metric['unit']}"
        lines.append(f"| {metric['label']} | {value} |")
    lines += ['', f"Useful demand: {annual['demand_mwh_th']:.3f} MWh thermal/year; remaining backup heating: {annual['backup_heat_mwh_th']:.3f} MWh thermal/year.",
              f"Recovered source heat: {annual['recovered_source_mwh_th']:.3f} MWh; compressor: {annual['compressor_mwh_el']:.3f} MWh electric; delivery losses: {annual['loss_mwh_th']:.3f} MWh thermal; pumps/controls: {annual['auxiliary_mwh_el']:.4f} MWh electric.",
              f"Recovered heat is {annual['recovered_share_of_it_heat_reference_percent']:.4f}% of the inherited IT-heat reference. Remaining IT-reference heat is not a complete facility cooling-duty estimate.", '',
              '| Building | Demand MWh thermal | Delivered MWh thermal | Coverage | Backup MWh thermal |', '| --- | ---: | ---: | ---: | ---: |']
    for r in result['recipients']:
        coverage = 'N/A' if r['coverage_percent'] is None else f"{r['coverage_percent']:.1f}%"
        lines.append(f"| {r['name']} | {r['demand_mwh_th']:.3f} | {r['delivered_mwh_th']:.3f} | {coverage} | {r['backup_heat_mwh_th']:.3f} |")
    lines += ['', '| Month | Heating h | Demand MWh thermal | Delivered MWh thermal | Extra MWh electric |', '| --- | ---: | ---: | ---: | ---: |']
    for m in result['months']:
        lines.append(f"| {m['month']} | {m['hours']:.0f} | {sum(r['demand_mwh_th'] for r in m['branches']):.3f} | {m['delivered_mwh_th']:.3f} | {m['additional_electricity_mwh_el']:.3f} |")
    lines += ['', 'All new numerical inputs are authored teaching assumptions; building identities alone are observed. These are not measured building results or validated network performance.',
              'The original view has no datacentre heat export or recovery electricity; the recipients retain the same modelled heating demand. Backup heating is useful thermal energy, not an assumed fuel/electricity saving.',
              'See [the model and UI recommendation](README.md), [inputs](scenario.json), [source boundaries](sources.json) and [machine handoff](ui-handoff.en.json).', '']
    return {'results.json': json.dumps(result, indent=2, allow_nan=False) + '\n',
            'results.md': '\n'.join(lines), 'ui-handoff.en.json': json.dumps(handoff, indent=2, allow_nan=False) + '\n'}


def self_test(scenario):
    model, recipients = scenario['model'], scenario['recipients']
    # Independently tractable period: 40 kW hot output for 100 h, 3 MWh recovered + 1 MWh electricity.
    r = window([10, 10], recipients, model, 100)
    require(math.isclose(r['hot_output_mwh_th'], 4), 'Hand calculation hot output')
    require(math.isclose(r['recovered_source_mwh_th'], 3), 'Hand calculation source')
    require(math.isclose(r['compressor_mwh_el'], 1), 'Hand calculation compressor')
    require(math.isclose(r['delivered_mwh_th'] + r['loss_mwh_th'], 4), 'Delivery/loss balance')
    for demands, source in [([0, 0], 30), ([1, 2], 0), ([0, 2], 30), ([2, 0], 30)]:
        r = window(demands, recipients, model, 100, source)
        if not source or not any(demands):
            require(r['delivered_mwh_th'] == r['additional_electricity_mwh_el'] == 0, 'Inactive equipment consumes no modelled energy')
        for d, b in zip(demands, r['branches']):
            require(d > 0 or b['delivered_mwh_th'] == 0, 'No demand means no delivery')
    rng = random.Random(417)
    for _ in range(300):
        hours = rng.uniform(0, 200)
        r = window([rng.uniform(0, 25), rng.uniform(0, 25)], recipients, model, hours, rng.uniform(0, 35))
        require(math.isclose(r['hot_output_mwh_th'], r['delivered_mwh_th'] + r['loss_mwh_th']), 'Randomized heat balance')
    for key, value in [('heating_cop', 1), ('source_available_kw', -1), ('weekday_heating_hours', 25), ('building_supply_c', 60)]:
        bad = copy.deepcopy(scenario)
        bad['model'][key] = value
        try:
            validate(bad)
        except ValueError:
            continue
        raise ValueError('Invalid input accepted: ' + key)
    empty = copy.deepcopy(scenario)
    for recipient in empty['recipients']:
        recipient['annual_useful_heat_demand_mwh'] = 0
    require(build(empty)['annual']['coverage_percent'] is None, 'Zero annual demand is N/A')
    print('PASS: independent period arithmetic, 300 invariant cases, unavailable/one-building demand, invalid inputs and zero-demand N/A.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    scenario = json.loads((ROOT / 'scenario.json').read_text())
    result = build(scenario)
    if args.self_test:
        self_test(scenario)
    outputs = render(result)
    for name in OUTPUTS:
        path = ROOT / name
        if args.check:
            require(path.exists() and path.read_text() == outputs[name], 'Generated output drift: ' + name)
        else:
            path.write_text(outputs[name])
    a = result['annual']
    print(f"PASS: {a['delivered_mwh_th']:.3f} MWh useful heat; {a['coverage_percent']:.3f}% combined coverage; {a['additional_electricity_mwh_el']:.3f} MWh additional electricity.")


if __name__ == '__main__':
    main()
