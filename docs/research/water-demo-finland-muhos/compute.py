#!/usr/bin/env python3
"""Reproduce the English Muhos evidence-led demo; no network or dependencies."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
GML = '{http://www.opengis.net/gml/3.2}'
COV = '{http://www.opengis.net/gmlcov/1.0}'
SWE = '{http://www.opengis.net/swe/2.0}'


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def resolve(data, path):
    value = data
    try:
        for key in path.split('.'):
            value = value[key]
    except (KeyError, TypeError) as exc:
        raise ValueError('Invalid metric reference: ' + path) from exc
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('A displayed metric must be finite and numeric: ' + path)
    return value


def parse_weather(scenario):
    event = scenario['event']
    root = ET.parse(ROOT / event['raw_file']).getroot()
    ids = [e.text for e in root.iter(GML + 'identifier')
           if e.attrib.get('codeSpace', '').endswith('/fmisid')]
    if ids != [event['station_id']]:
        raise ValueError('Weather station missing or ambiguous')
    names = [e.text for e in root.iter(GML + 'name')
             if e.attrib.get('codeSpace', '').endswith('/name')]
    if names != [event['station_name']]:
        raise ValueError('Weather station name mismatch')
    fields = [e.attrib['name'] for e in root.iter(SWE + 'field')]
    if len(fields) != len(set(fields)) or not {'rrday', 'tday'} <= set(fields):
        raise ValueError('Invalid or duplicate weather fields')
    pos = root.find('.//' + COV + 'positions')
    vals = root.find('.//' + GML + 'doubleOrNilReasonTupleList')
    if pos is None or vals is None:
        raise ValueError('Weather coverage missing')
    positions = [line.split() for line in pos.text.splitlines() if line.strip()]
    tuples = [line.split() for line in vals.text.splitlines() if line.strip()]
    if len(positions) != 31 or len(tuples) != len(positions):
        raise ValueError('Expected the frozen complete August sample')
    rows = []
    for position, values in zip(positions, tuples):
        if len(position) != 3 or len(values) != len(fields):
            raise ValueError('Weather tuple dimensions do not match')
        stamp = datetime.fromtimestamp(int(position[2]), tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        rows.append(dict(timestamp=stamp, latitude=float(position[0]), longitude=float(position[1]),
                         **dict(zip(fields, map(float, values)))))
    expected = {f'2026-08-{day:02}T00:00:00Z' for day in range(1, 32)}
    if {r['timestamp'] for r in rows} != expected:
        raise ValueError('Missing or duplicate observation timestamps')
    if any(not math.isclose(r['latitude'], 64.99685) or not math.isclose(r['longitude'], 25.52233) for r in rows):
        raise ValueError('Weather position mismatch')
    selected = [r for r in rows if r['timestamp'] == event['record_timestamp']]
    if len(selected) != 1:
        raise ValueError('Selected weather observation missing or ambiguous')
    selected = selected[0]
    if not math.isfinite(selected['rrday']) or selected['rrday'] <= 0:
        raise ValueError('Replay needs a positive finite depth, not a missing or special value')
    positive = [r['rrday'] for r in rows if math.isfinite(r['rrday']) and r['rrday'] > 0]
    if selected['rrday'] != max(positive):
        raise ValueError('Declared maximum-of-sample selection no longer matches')
    # Keep unused special snow codes in raw XML, not as a physical negative depth.
    selected_output = {k: v for k, v in selected.items() if k != 'snow'}
    return dict(station_id=event['station_id'], station_name=event['station_name'], **selected_output,
                unit='mm daily precipitation; degC daily mean temperature',
                note='Offsite FMI observation timestamp, not site rainfall or an exact storm-time window. Other missing/special values are not zero-filled.')


def verify_source_ids(value, known):
    if isinstance(value, dict):
        if 'source_ids' in value and not set(value['source_ids']) <= known:
            raise ValueError('Unknown evidence source ID')
        for item in value.values():
            verify_source_ids(item, known)
    elif isinstance(value, list):
        for item in value:
            verify_source_ids(item, known)


def build(scenario, copy, sources):
    known = {s['id'] for s in sources['sources']}
    if len(known) != len(sources['sources']):
        raise ValueError('Duplicate source ID')
    for raw in sources['raw_files']:
        if hashlib.sha256((ROOT / raw['path']).read_bytes()).hexdigest() != raw['sha256']:
            raise ValueError('Frozen source hash mismatch: ' + raw['path'])
    verify_source_ids(scenario, known)
    verify_source_ids(copy, known)
    if scenario['locale'] != 'en':
        raise ValueError('The Finnish packet must be English')
    inputs = {k: v['value'] for k, v in scenario['inputs'].items()}
    if not (0 < inputs['reported_cleared_area_ha'] <= inputs['project_area_ha']):
        raise ValueError('Invalid project/clearance area')
    # Catchment and clearance are different scopes; never force a partition relation.
    if inputs['drainage_va1_va2_ha'] <= 0 or inputs['new_ditch_length_km'] <= 0:
        raise ValueError('Invalid drainage reference')
    if not math.isclose(inputs['water_cooling_evaporation_fraction'] + inputs['water_cooling_return_fraction'], 1):
        raise ValueError('Cooling reference fractions must conserve water')
    if any(v is not None for v in scenario['unknowns'].values()):
        raise ValueError('Unverified outcomes must remain unknown in this version')
    for key in ['actual_annual_supply_m3', 'actual_cooling_makeup_m3', 'actual_return_m3', 'actual_evaporation_m3']:
        if scenario['operation'][key] is not None:
            raise ValueError('Actual operating water use has not been established')
    weather = parse_weather(scenario)
    depth = weather['rrday']
    upper = inputs['preliminary_maximum_total_water_need_m3_year']
    norm = inputs['illustrative_cooling_makeup_l']
    results = dict(
        scenario_id=scenario['scenario_id'], as_of=scenario['as_of'], weather=weather,
        facts={k: inputs[k] for k in ['project_area_ha', 'reported_cleared_area_ha', 'planned_halls',
                                      'drainage_va1_va2_ha', 'new_ditch_length_km']},
        rain=dict(depth_mm=depth,
                  gross_on_reported_cleared_area_m3=depth * inputs['reported_cleared_area_ha'] * 10,
                  gross_on_va1_va2_m3=depth * inputs['drainage_va1_va2_ha'] * 10,
                  generated_runoff_m3=None, river_discharge_m3=None,
                  note='Two distinct spatial reference calculations; do not add them. Gross precipitation is not runoff.'),
        operation=dict(preliminary_maximum_total_m3_year=upper,
                       even_day_equivalent_m3_day=upper / inputs['year_days_for_equivalent'],
                       normalized_cooling_makeup_l=norm,
                       normalized_cooling_evaporation_l=norm * inputs['water_cooling_evaporation_fraction'],
                       normalized_cooling_return_l=norm * inputs['water_cooling_return_fraction'],
                       actual_use_m3_year=None, selected_actual_technology=scenario['operation']['selected_actual_technology'],
                       note='Upper total-water planning reference and normalized TVE1 cooling illustration are separate; no 70/30 split is applied to the total requirement.'),
        unknowns=scenario['unknowns'])
    # Independent unit check: 1 ha = 10,000 m2 and 1 mm = 0.001 m.
    if not math.isclose(results['rain']['gross_on_va1_va2_m3'], depth * .001 * inputs['drainage_va1_va2_ha'] * 10000):
        raise ValueError('Rain-volume unit mismatch')
    if not math.isclose(norm, results['operation']['normalized_cooling_evaporation_l'] + results['operation']['normalized_cooling_return_l']):
        raise ValueError('Normalized cooling balance failed')
    if [c['id'] for c in copy['cards']] != [f'M{i}' for i in range(7)]:
        raise ValueError('Exactly seven ordered milestone cards are required')
    cards = []
    definitions = {}
    for item in copy['cards']:
        card = dict(item)
        # Reuse the SF handoff's path/definitions/data pattern in English.
        card['data'] = {key: results[key] for key in ['facts', 'rain', 'unknowns']}
        card['data']['operation'] = results['operation'] if card['id'] == 'M6' else None
        card['animation'] = card['default_scene']
        card['meaning'] = card['wider_implication']
        card['uncertainty'] = card['limits']
        for list_key in ['primary_metrics', 'detail_metrics']:
            card[list_key] = list(item.get(list_key, []))
            for path in card[list_key]:
                resolve(card['data'], path)
                meta = metric_meta(path)
                definitions[path] = dict(label=meta['label'], stored_unit=meta['unit'],
                                         display_unit=meta['unit'], display_multiplier=1,
                                         time_basis=meta['time_basis'], evidence_label=meta['evidence'])
        cards.append(card)
    handoff = dict(scenario_id=scenario['scenario_id'], locale='en', shared=copy['shared'],
                   current_state=scenario['current_state'], metric_definitions=definitions,
                   cards=cards, operation_context=scenario['operation'])
    return results, handoff


def metric_meta(path):
    meta = {
        'facts.project_area_ha': ('Project planning envelope', 'ha', 'planning reference'),
        'facts.reported_cleared_area_ha': ('Reported cleared area', 'ha', 'company-reported 2026 extent'),
        'facts.planned_halls': ('Proposed server halls', 'buildings', '2025 proposal'),
        'facts.new_ditch_length_km': ('New ditch network, largely built', 'km', 'October authority document'),
        'facts.drainage_va1_va2_ha': ('Combined VA1+VA2 reference area', 'ha', 'drainage-notice scope'),
        'rain.gross_on_va1_va2_m3': ('Gross rain on VA1+VA2, not runoff', 'm³', 'one independent regional-rain replay'),
        'operation.preliminary_maximum_total_m3_year': ('Preliminary maximum process + domestic water need', 'm³/year', '2025 EIA reference; not current operational demand'),
        'operation.even_day_equivalent_m3_day': ('Even-day equivalent of that annual upper reference', 'm³/day', '365-day arithmetic; not peak or forecast demand'),
        'operation.normalized_cooling_makeup_l': ('TVE1 illustrative pumped cooling water', 'L', 'normalized example, not a day or year'),
        'operation.normalized_cooling_evaporation_l': ('TVE1 illustrative evaporation', 'L', 'same normalized example'),
        'operation.normalized_cooling_return_l': ('TVE1 illustrative river return', 'L', 'same normalized example')}
    label, unit, basis = meta[path]
    return dict(label=label, unit=unit, time_basis=basis,
                evidence='Source-tagged reference or transparent arithmetic; see scenario.json input kinds')


def walkthrough(handoff):
    shared = handoff['shared']
    text = ['# ' + shared['title'], '', shared['opening'], '', '## Default view and actions', '',
            shared['default_view'], '', shared['navigation'], '', shared['pause_handling'], '', shared['rainfall_rule'], '']
    for card in handoff['cards']:
        text += [f"## {card['id']} — {card['title']}", '', '**Status:** ' + card['evidence_status'], '',
                 card['what_changes'], '', '**Why:** ' + card['why'], '',
                 '**Wider implication:** ' + card['wider_implication'], '', '**Simple visual:** ' + card['default_scene'], '']
        for key, heading in [('primary_metrics', 'Default figures'), ('detail_metrics', 'Optional historical-planning detail')]:
            if card[key]:
                text += ['### ' + heading, '', '| Quantity | Value | Time basis |', '| --- | ---: | --- |']
                for path in card[key]:
                    m = handoff['metric_definitions'][path]
                    value = resolve(card['data'], path) * m['display_multiplier']
                    text.append(f"| {m['label']} | {value:,.1f} {m['display_unit']} | {m['time_basis']} |")
                text.append('')
        text += ['**Limits:** ' + card['limits'], '', 'Source IDs: ' + ', '.join(card['source_ids']) +
                 '; links and locators are in [sources.json](sources.json).', '']
    text += ['## Optional questions', '']
    for question in shared['optional_questions']:
        text += ['**' + question['question'] + '**', '', question['answer'], '']
    return '\n'.join(text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    results, cards = build(read('scenario.json'), read('milestone-copy.en.json'), read('sources.json'))
    brief = ['# Reproducible Muhos reference calculations', '',
             'These are scope conversions, gross rain volumes and a normalized cooling example, not calibrated runoff or actual operating demand.', '',
             '| Reference | Value | Interpretation |', '| --- | ---: | --- |',
             f"| Regional daily rainfall | {results['rain']['depth_mm']:.1f} mm | FMI offsite record timestamp 2026-08-16 |",
             f"| Gross rain over reported 330 ha clearance extent | {results['rain']['gross_on_reported_cleared_area_m3']:,.0f} m³ | Not runoff; not added to VA1+VA2 |",
             f"| Gross rain over VA1+VA2, 275 ha | {results['rain']['gross_on_va1_va2_m3']:,.0f} m³ | Not discharge or treated volume |",
             f"| Preliminary maximum total water requirement | {results['operation']['preliminary_maximum_total_m3_year']:,.0f} m³/year | 2025 planning reference, process plus domestic; not a confirmed operating forecast |",
             f"| Even-day equivalent | {results['operation']['even_day_equivalent_m3_day']:,.1f} m³/day | Not a peak-day design or chosen air-cooling demand |",
             '| TVE1 cooling normalization | 1,000 L in = 700 L evaporation + 300 L river return | Not applied to the total annual figure |', '',
             'Runoff, discharge, construction supply, actual cooling demand, pH, metal loads and household shortages remain null, not zero. See [scenario.json](scenario.json) for boundaries. Generate with `python3 compute.py`; verify with `python3 compute.py --check`.', '']
    outputs = {'results.json': json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False) + '\n',
               'milestones.en.json': json.dumps(cards, ensure_ascii=False, indent=2, allow_nan=False) + '\n',
               'results.md': '\n'.join(brief), 'walkthrough.en.md': walkthrough(cards)}
    for name, content in outputs.items():
        f = ROOT / name
        if args.check:
            if not f.exists() or f.read_text(encoding='utf-8') != content:
                raise ValueError('Generated output is stale: ' + name)
        else:
            f.write_text(content, encoding='utf-8')
    print('PASS: source hashes/IDs, FMI identity/fields/dates, reference scopes, units, cooling balance, unknowns and seven English milestone cards.')
    print(f"Regional rain {results['rain']['depth_mm']:.1f} mm; gross VA1+VA2 rain {results['rain']['gross_on_va1_va2_m3']:,.0f} m³; no runoff or actual operating-water prediction.")


if __name__ == '__main__':
    main()
