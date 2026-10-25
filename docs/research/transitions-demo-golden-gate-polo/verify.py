#!/usr/bin/env python3
"""Validate transition bindings, accounting boundaries and original-packet preservation."""

import hashlib
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def close(a, b, message):
    require(math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-7), message)


def pointer(document, path):
    require(path.startswith('/'), 'Binding requires a JSON Pointer')
    for token in path[1:].split('/'):
        token = token.replace('~1', '/').replace('~0', '~')
        document = document[int(token)] if isinstance(document, list) else document[token]
    return document


def main():
    pack = json.loads((ROOT / 'transitions.en.json').read_text())
    require(pack['locale'] == 'en', 'New handoff must be English')
    docs = {}
    for name, source in pack['sources'].items():
        path = (ROOT / source['path']).resolve()
        require(REPO in path.parents, 'Source outside repository')
        raw = path.read_bytes()
        require(hashlib.sha256(raw).hexdigest() == source['sha256'], 'Source drift: ' + name)
        docs[name] = json.loads(raw)
    patterns = {p['id']: p for p in pack['patterns']}
    require(len(patterns) == len(pack['patterns']) == 10, 'Duplicate or missing pattern')
    require(set(patterns) == {'W1', 'W2', 'W3', 'E1', 'L1', 'L2', 'C1', 'P1', 'P2', 'P3'}, 'Unexpected scope')
    binding_count = 0
    for pattern in patterns.values():
        if pattern['scope'] == 'baseline':
            require([s['milestone'] for s in pattern['states']] == [f'M{i}' for i in range(7)], 'Missing baseline state')
            bindings = [b for s in pattern['states'] for b in s['bindings']]
        else:
            require(pattern['scope'] == 'proposal_within_M6', 'Proposal must remain inside M6')
            require(pattern['show_numbers'] is False, 'Heat pending / concepts cannot display results')
            require(pattern['bindings'] == [], 'Proposal results not yet modelled')
            require(pattern['phases'][0]['id'] == 'original', 'Proposal needs original starting state')
            require(len({s['id'] for s in pattern['phases']}) == len(pattern['phases']), 'Duplicate phase')
            bindings = pattern['bindings']
        for binding in bindings:
            require(bool(binding['unit']) and bool(binding['time_basis']), 'Binding lacks unit or time basis')
            value = pointer(docs[binding['source']], binding['pointer'])
            require(value is None or (type(value) in (int, float) and math.isfinite(value)), 'Binding is not numeric/null')
            binding_count += 1

    water, energy, land = (docs[k] for k in ['water_results', 'energy_results', 'land_handoff'])
    stages = water['stages']
    require(stages[1]['rain_event'] is None, 'M1 runoff must remain unquantified')
    require(stages[2]['rain_event'] == stages[3]['rain_event'], 'M2/M3 rain plateau changed')
    require(stages[5]['rain_event'] == stages[6]['rain_event'], 'M5/M6 rain plateau changed')
    close(water['event']['rainfall_mm'], 86.4, 'Wrong rain input')
    for stage in stages:
        event = stage['rain_event']
        if event:
            close(event['generated_surface_runoff_m3'], event['roof_capture_m3'] + event['water_to_managed_drainage_m3'], 'Rain-event balance')
    close(stages[5]['rain_event']['roof_capture_m3'], 200, 'Tank event capture changed')
    op = water['operation']
    close(op['daily_average_cooling_supply_m3'], op['daily_average_cooling_evaporation_m3'] + op['daily_average_cooling_blowdown_m3'], 'Cooling balance')
    close(energy['operation']['facility_electricity_mwh_year'], energy['operation']['it_electricity_mwh_year'] + energy['operation']['non_it_electricity_mwh_year'], 'Operating electrical balance')
    require(energy['operation']['peak_facility_mw'] is None, 'Do not replace unknown peak with average')
    for card in land['milestones']:
        require(sum(card['data']['surface_areas_m2'].values()) == 40000, 'Land budget changed')
        require(all(v is None for v in card['unknowns'].values()), 'Access quantities must remain unknown')
    require(list(land['temporary_construction_access']['milestone_states']) == [f'M{i}' for i in range(7)], 'Access transition coverage')
    require(all(v is None for v in land['temporary_construction_access']['unknowns'].values()), 'Do not quantify access overlay')

    preserved = 0
    manifest = docs['preservation']['before_catalog_work']
    for relative, digest in manifest.items():
        path = (REPO / relative).resolve()
        require(REPO in path.parents, 'Invalid preservation path')
        if path.exists():
            require(hashlib.sha256(path.read_bytes()).hexdigest() == digest, 'Original packet changed: ' + relative)
            preserved += 1
    files = list(ROOT.glob('*.md')) + [ROOT.parent / f / 'transitions.en.md' for f in ['water-demo-golden-gate-polo', 'energy-demo-golden-gate-polo']]
    files += [ROOT.parent / 'land-space-demo-golden-gate-polo' / 'README.md', ROOT.parent / 'change-catalog-golden-gate-polo' / 'README.md']
    for path in files:
        for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if '://' not in target and not target.startswith('#'):
                require((path.parent / target.split('#')[0]).exists(), 'Broken local link: ' + target)
    print(f'PASS: 10 patterns, seven-state baselines, M6-only proposal phases, {binding_count} endpoint bindings and pinned source files.')
    print('PASS: runoff gaps/plateaus, tank and cooling balances, electrical balance, land budgets and explicit access unknowns.')
    print(f'Preservation: {preserved}/{len(manifest)} original files present and byte-identical; local documentation links checked.')


if __name__ == '__main__':
    main()
