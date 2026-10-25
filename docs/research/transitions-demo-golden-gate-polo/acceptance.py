#!/usr/bin/env python3
"""Validate acceptance coverage and render owning-pack transition checklists."""

import argparse
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def relative_link(target, output):
    return Path(os.path.relpath(target, output.parent)).as_posix()


def format_tables(lines):
    """Align plain GFM tables without HTML comments or formatter directives."""
    result = []
    index = 0
    while index < len(lines):
        if not lines[index].startswith('| '):
            result.append(lines[index])
            index += 1
            continue
        rows = []
        while index < len(lines) and lines[index].startswith('| '):
            rows.append([cell.strip() for cell in lines[index].strip('|').split('|')])
            index += 1
        require(len(rows) >= 2, 'Table header and separator required')
        require(all(len(row) == len(rows[0]) for row in rows), 'Inconsistent table columns')
        widths = [max(3, *(len(row[column]) for i, row in enumerate(rows) if i != 1))
                  for column in range(len(rows[0]))]
        for i, row in enumerate(rows):
            cells = ['-' * width for width in widths] if i == 1 else [cell.ljust(width) for cell, width in zip(row, widths)]
            result.append('| ' + ' | '.join(cells) + ' |')
    return '\n'.join(result)


def load_and_validate():
    spec = json.loads((ROOT / 'acceptance.en.json').read_text())
    patterns = {p['id']: p for p in json.loads((ROOT / 'transitions.en.json').read_text())['patterns']}
    groups = {g['id']: g for g in spec['groups']}
    require(len(groups) == len(spec['groups']) == 5, 'Five distinct owning tables required')
    require(spec['locale'] == 'en', 'English acceptance tables required')
    chapters = spec['runtime_chapters']
    require(chapters == [dict(id=i, title=t) for i, t in [
        ('M0', 'Today'), ('M1', 'Foundations'), ('M4', 'Structure'),
        ('M5', 'Ready'), ('M6', 'Operating')]], 'Five approved runtime chapters required')
    runtime = json.loads((REPO / 'src/game/polo/baseline.generated.json').read_text())
    require([dict(id=p['id'], title=p['title']) for p in runtime['phases']] == chapters,
            'Runtime chapters differ from the approved transition contract')
    require([p['id'] for p in runtime['researchPhases']] == [f'M{i}' for i in range(7)],
            'Preserved analytical snapshots missing')
    foundation = runtime['phases'][1]['data']
    require(all(foundation[k] is None for k in ['rainRunoffM3', 'stageWaterSuppliedM3',
            'offsiteConcreteWaterM3', 'selectedDieselL', 'selectedElectricityKWh', 'workdays']),
            'Foundation-only resource estimates must remain unquantified')
    rows = spec['transitions']
    require(len({r['id'] for r in rows}) == len(rows), 'Acceptance IDs must be unique')
    coverage = {k: set() for k in patterns}
    outputs = set()
    for group in groups.values():
        output = (ROOT / group['output']).resolve()
        require(REPO in output.parents and output not in outputs, 'Invalid or repeated owning table')
        outputs.add(output)
        require(set(group['pattern_ids']) <= set(patterns), 'Unknown group pattern')
    for row in rows:
        require(row['id'].startswith('SF-'), 'Acceptance ID needs scenario prefix')
        require(row['owner'] in groups, 'Acceptance row lacks an owning pack')
        require(set(row['pattern_ids']) <= set(patterns), 'Unknown row pattern')
        require(all(row[k].strip() for k in ['from_state', 'to_state', 'trigger', 'visible_change', 'evidence_kind']), 'Missing transition contract')
        require(len(row['pass_criteria']) >= 2 and all(c.strip() for c in row['pass_criteria']), 'Need observable pass criteria')
        require(row['implementation_status'] == 'not_assessed' and row['verification_status'] == 'not_run', 'Specification must not claim engine verification')
        if row['owner'] != 'shared':
            require(set(row['pattern_ids']) <= set(groups[row['owner']]['pattern_ids']), 'Wrong owning pack')
        for key, refs in row['state_refs'].items():
            require(key in row['pattern_ids'], 'State reference lacks pattern relation')
            pattern = patterns[key]
            field, id_field = ('states', 'milestone') if pattern['scope'] == 'baseline' else ('phases', 'id')
            valid = {state[id_field] for state in pattern[field]}
            require(bool(refs) and set(refs) <= valid, 'Acceptance references an undefined state/phase')
            coverage[key].update(refs)
        require(all('|' not in s and '\n' not in s for s in [row['trigger'], row['visible_change'], row['from_state'], row['to_state'], row['evidence_kind']] + row['pass_criteria']), 'Unescaped table cell content')
    for key, pattern in patterns.items():
        field, id_field = ('states', 'milestone') if pattern['scope'] == 'baseline' else ('phases', 'id')
        require(coverage[key] == {state[id_field] for state in pattern[field]}, 'Uncovered state/phase: ' + key)
    require(any(not row['pattern_ids'] for row in rows), 'Shared navigation checks missing')
    require({f'SF-X-{i:02}' for i in range(1, 9)} <= {r['id'] for r in rows if r['owner'] == 'shared'}, 'Shared baseline/proposal interruption checks missing')
    require(all(any(r['owner'] == g for r in rows) for g in groups), 'Empty owning table')
    return spec, patterns


def render_tables(spec, patterns):
    rendered = {}
    for group in spec['groups']:
        output = (ROOT / group['output']).resolve()
        root_link = relative_link(ROOT / 'README.md', output)
        registry_link = relative_link(ROOT / 'acceptance.en.json', output)
        manifest_link = relative_link(ROOT / 'transitions.en.json', output)
        shared_link = relative_link(ROOT / 'transition-checklist.en.md', output)
        lines = [f"# {group['title']}", '',
                 f"Verifiable implementation contracts for the fictional SF demo. Follow the [shared transition direction]({root_link}); the [acceptance registry]({registry_link}) owns these rows. This table is generated by `acceptance.py`.", '',
                 '**Active UI: Today → Foundations → Structure → Ready → Operating.** These are five chapter buttons (M0, M1, M4, M5, M6). Other M0–M6 references below describe preserved analytical snapshots or internal preparation beats, not additional selectable stops. Runtime M1 is a new foundation checkpoint; original research M1 is stripping-only. Foundation-only resource budgets and runoff remain unquantified. See the shared direction for the current binding.', '',
                 '**Current status for every row: implementation not assessed; engine verification NOT RUN.** Passing a generator or source-data check does not establish that an animation works. All listed pass criteria must hold in the same tested build.', '',
                 'For each row, establish the stated starting state, perform the trigger, observe the transition and settled endpoint, and check the source/labels. Evidence should capture the change as well as its endpoint; a single final screenshot cannot prove ordering or persistence.', '']
        if group['id'] != 'shared':
            lines += [f"Also run the [shared navigation, replay and selector checks]({shared_link}) against this pack. Earlier-state navigation restores a comparison snapshot; it never demonstrates physical reversal.", '']
        else:
            lines += ['## Owning-pack tables', '', '| Pack | Acceptance table |', '| --- | --- |']
            for other in spec['groups']:
                if other['id'] != 'shared':
                    target = (ROOT / other['output']).resolve()
                    lines.append(f"| {other['id'].title()} | [Open table]({relative_link(target, output)}) |")
            lines += ['']
        sections = group['pattern_ids'] + (['shared_controls'] if group['id'] == 'shared' else [])
        for section in sections:
            rows = [r for r in spec['transitions'] if r['owner'] == group['id'] and
                    ((r['id'].startswith('SF-X-') if section == 'shared_controls' else r['id'].startswith('SF-' + section + '-')))]
            require(bool(rows), 'Empty checklist section: ' + section)
            title = 'Shared controls and mode changes' if section == 'shared_controls' else f"{section}: {patterns[section]['label']}"
            lines += [f'## {title}', '',
                      '| ID | From → to; trigger | Visible transition | Pass only if all criteria hold | Evidence / data boundary |',
                      '| --- | --- | --- | --- | --- |']
            for row in sorted(rows, key=lambda r: r['id']):
                identity = f"`{row['id']}`"
                movement = f"**{row['from_state']} → {row['to_state']}**. {row['trigger']}"
                criteria = ' '.join(f"**{i + 1}.** {c}" for i, c in enumerate(row['pass_criteria']))
                refs = '; '.join(f"{key}: {', '.join(values)}" for key, values in row['state_refs'].items())
                evidence = (f"[Manifest]({manifest_link}) — {refs}. " if refs else '') + row['evidence_kind'] + '.'
                lines.append(f"| {identity} | {movement} | {row['visible_change']} | {criteria} | {evidence} |")
            lines += ['']
        lines += ['## Verification record to fill during implementation', '',
                  'Reference the stable row ID in implementation work, issues and QA evidence. Record a separate result per row and tested build. No results have been filled by this content task.', '',
                  '| Transition ID | Build / commit and environment | Result | Evidence and failed criterion |',
                  '| --- | --- | --- | --- |',
                  '| Copy an ID above | Record build, browser/device and mode | Not run / Pass / Fail / Blocked | Link a recording or before/after captures; identify criterion number |', '',
                  'Re-run affected rows after a change and the shared reset/visibility checks after changing scene state management. Numeric display rounding is allowed only at the stated precision; retain original units and time bases. Unknown values must never be replaced with zero.', '']
        for row in spec['transitions']:
            if row['owner'] == group['id']:
                require(sum(f'`{row["id"]}`' in line for line in lines) == 1, 'Acceptance row omitted or repeated in table: ' + row['id'])
        rendered[output] = format_tables(lines)
    return rendered


def check_or_write(check=True):
    spec, patterns = load_and_validate()
    rendered = render_tables(spec, patterns)
    for output, content in rendered.items():
        if check:
            require(output.exists() and output.read_text() == content, 'Stale acceptance table: ' + str(output))
        else:
            output.write_text(content)
    print(f"PASS: {len(spec['transitions'])} stable acceptance IDs, all 10 patterns/states/phases covered, {len(rendered)} owning-pack tables; engine status remains Not run.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    check_or_write(args.check)
