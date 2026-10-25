#!/usr/bin/env python3
"""Derive an English land/space handoff from the unchanged SF water surfaces."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'water-demo-golden-gate-polo' / 'scenario.json'
SURFACES = ['turf_m2', 'stripped_not_graded_m2', 'bare_graded_m2',
            'roof_m2', 'other_impervious_m2', 'landscape_m2']
COPY = [
    ('Today', 'Show the authored grass subset within the sports-field setting. Keep surrounding trees and tracks outside the intervention.',
     'The starting place already supports recreation; it is not unused land.',
     'What uses this space today, and which users should be involved?'),
    ('Turf stripping', 'Remove turf from the selected works area while keeping retained turf visible. Do not fell trees.',
     'Removing surface vegetation begins the physical change before buildings appear. Disturbed area is not yet sealed area.',
     'Which parts are removed, and which remain untouched?'),
    ('Grading', 'Reshape the same already stripped ground. Keep the intervention boundary fixed.',
     'The same area is worked again. Do not count it as a second land take or animate a new clearing.',
     'Does grading use more land, or change land already disturbed?'),
    ('Compaction', 'Roll the same prepared ground. Use a soil cutaway as a qualitative mechanism only.',
     'Ground preparation changes the soil condition without increasing the disturbed footprint. No compaction percentage or additional runoff is calculated here.',
     'Why can soil condition change even when the area counter stays the same?'),
    ('Construction', 'Raise roof/building blocks on part of the prepared ground; keep the remaining construction ground bare.',
     'The building footprint is only part of the development. This snapshot does not establish floor area, height or computing capacity.',
     'What other space will the completed campus need besides buildings?'),
    ('Opening', 'Complete internal hard surfaces and the restored vegetated patch. Label restored planting separately from retained turf.',
     'Roads, yards and supporting infrastructure also occupy land. New planting is not the same as keeping the original sports surface.',
     'Does a green patch inside a campus preserve the original recreational use?'),
    ('Operation', 'Keep the completed land allocation fixed while water and electricity animations operate. Offer a before/after surface overlay.',
     'Water and electricity recur, while the completed campus continues occupying the same land. A green-looking area does not establish public access or a playable field.',
     'Which original uses are displaced, and what access or replacement provision needs assessment?'),
]


def build():
    source_bytes = SOURCE.read_bytes()
    scenario = json.loads(source_bytes)
    total = scenario['inputs']['site_area_m2']['value']
    assert total == 40000, 'Review this handoff if the authored campus changes'
    assert [s['id'] for s in scenario['stages']] == [f'M{i}' for i in range(7)]
    assert scenario['stages'][0]['turf_m2'] == total
    cards = []
    for stage, (title, animation, implication, question) in zip(scenario['stages'], COPY):
        areas = {key: stage[key] for key in SURFACES}
        assert all(isinstance(v, int) and v >= 0 for v in areas.values())
        assert sum(areas.values()) == total, 'Surface budget must close at each milestone'
        cumulative_disturbed = total - areas['turf_m2']
        sealed = areas['roof_m2'] + areas['other_impervious_m2']
        vegetated = areas['turf_m2'] + areas['landscape_m2']
        data = dict(total_campus_area_m2=total, surface_areas_m2=areas,
                    cumulative_disturbed_area_m2=cumulative_disturbed,
                    sealed_area_m2=sealed, sealed_share_percent=100 * sealed / total,
                    vegetated_ground_area_m2=vegetated,
                    vegetated_ground_reduction_from_m0_m2=total - vegetated)
        if stage['id'] == 'M0':
            primary = ['total_campus_area_m2', 'vegetated_ground_area_m2']
        elif stage['id'] in ['M1', 'M2', 'M3']:
            primary = ['cumulative_disturbed_area_m2', 'surface_areas_m2.turf_m2']
        elif stage['id'] == 'M4':
            primary = ['surface_areas_m2.roof_m2', 'surface_areas_m2.bare_graded_m2']
        else:
            primary = ['sealed_area_m2', 'surface_areas_m2.turf_m2', 'surface_areas_m2.landscape_m2']
        cards.append(dict(id=stage['id'], title=title, data=data,
                          primary_metrics=primary, default_animation=animation,
                          default_implication=implication,
                          default_evidence_label='Authored demo areas; not a measured development plan',
                          optional_question=question,
                          unknowns=dict(public_access_area_m2=None,
                                        usable_sports_area_m2=None,
                                        displaced_users=None,
                                        external_works_area_m2=None)))
    assert [c['data']['cumulative_disturbed_area_m2'] for c in cards] == [0] + [32000] * 6
    assert cards[2]['data'] == cards[3]['data'], 'Compaction does not change area accounting'
    assert cards[5]['data'] == cards[6]['data'], 'Operation does not repeatedly consume land'
    final = cards[-1]['data']
    assert final['sealed_area_m2'] == 28000 and final['sealed_share_percent'] == 70
    assert final['vegetated_ground_area_m2'] == 12000
    assert final['vegetated_ground_reduction_from_m0_m2'] == 28000
    return dict(
        schema_version=1, scenario_id='sf-polo-land-space-v1', locale='en',
        status='derived_surface_accounting_and_authored_visual_story_not_site_prediction',
        baseline=dict(scenario_id=scenario['scenario_id'], path='../water-demo-golden-gate-polo/scenario.json',
                      sha256=hashlib.sha256(source_bytes).hexdigest()),
        units=dict(areas='m²; divide by 10000 to display hectares', shares='% of the same 40000 m² campus'),
        metric_definitions=dict(
            cumulative_disturbed_area_m2='Unique ground area worked inside the campus since M0; includes subsequently built or restored ground. Excludes unquantified external access wear. Never sum across milestones.',
            sealed_area_m2='Roof footprint plus other impervious surfaces; not a measured infiltration rate.',
            vegetated_ground_area_m2='Retained original turf plus restored vegetated ground; not habitat quality, maturity or public access.',
            vegetated_ground_reduction_from_m0_m2='Starting vegetated ground minus current vegetated ground; not a count of lost playing fields.'),
        scene_rules=dict(
            intervention='Schematic 4 ha turf subset; no surveyed placement or fit. Trees and existing perimeter tracks stay outside quantified campus works. A separate illustrative access overlay can temporarily restrict a park path without converting it into campus hardstanding.',
            controls=['Continue / Back', 'Select milestone', 'Replay / Skip', 'Orbit / Zoom / Reset', 'Toggle before/after surfaces', 'Emphasise Building / Whole campus', 'Replay the same rain using existing water comparison', 'Optional explanation and sources'],
            state='Restore the complete target state on jumps and replay; areas are snapshots, never additive counters.',
            geometry='Surface classes are disjoint and cover exactly 40000 m². Internal road/yard/utility subdivision is unassigned.',
            restoration='Restored vegetation is authored cover, not proof of mature soil, habitat or playable turf at opening.',
            cross_topic='Keep original water and energy results unchanged. No new runoff, energy, drought, temperature, carbon or biodiversity coefficients.',
            alternatives='Baseline layer only. Recycled-water and green-roof concept previews hide all numerical panels as required by the change brief.'),
        temporary_construction_access=dict(
            status='authored_qualitative_overlay_not_approved_route_or_measured_impact',
            visible_label='Illustrative construction access and repair',
            spatial_scope='Schematic park access corridor and external grass verge; no surveyed geometry, road name or area.',
            milestone_states=dict(
                M0='Open park paths; no construction barriers or wear patch.',
                M1='Install temporary barriers and signed illustrative diversion before heavy access starts; reveal possible verge wear.',
                M2='Keep closure active; illustrate repeated access movement and worn grass.',
                M3='Keep closure active and grass-wear overlay; do not accumulate vehicle counts or damage area.',
                M4='Continue temporary construction access restriction and wear patch.',
                M5='Authored end of heavy-access phase: remove temporary works, reopen the schematic path and begin verge repair. Safe real reopening needs a handover plan.',
                M6='Show labelled time-compressed surface revegetation; no selected recovery duration or full soil-recovery claim.'),
            community_prompt='How will I get through the park during construction, and what will be repaired afterwards?',
            visual_contrast='Temporary barriers and grass wear recede while the permanent campus footprint remains.',
            accounting='Outside the 4 ha budget; not the existing 0.4 ha restored campus vegetation or 0.8 ha retained turf. No new water/energy credits or penalties.',
            unknowns=dict(route_geometry=None, closed_path_length_m=None, detour_distance_m=None,
                          damaged_grass_area_m2=None, closure_duration_days=None,
                          recovery_duration_days=None, repair_water_m3=None, access_fuel_l=None),
            reset='Restore this overlay independently for each selected milestone. No temporary damage at M0; no cumulative growth on replay.'),
        visual_reveals=[
            dict(id='whole_campus', trigger='M5 default once; skip/replay available; replay accessible at M6',
                 sequence='Translucent 1.2 ha building outline on original turf, completed building, slight camera pullback, supporting surfaces, full 4 ha boundary.',
                 caption='The building is only part of the space the project needs.',
                 interaction='Building / Whole campus emphasis toggle; no layout edit.'),
            dict(id='original_recreation', trigger='Brief default beat after campus reveal; community detail optional',
                 sequence='Ghost original turf and schematic sports markings through the completed campus at the same position and camera.',
                 caption='Could people still use this space as before?',
                 limits='No surveyed pitch count or quantified permanent public-access loss. Temporary construction barriers are a separate authored access overlay.'),
            dict(id='same_rain', trigger='Offer after spatial reveal; optional investigation; no automatic milestone jump',
                 sequence='Reuse existing water replay comparing M0 and M5 with the same footprint, camera and recorded 86.4 mm reference-station rainfall depth.',
                 limits='Use existing modelled water results; particles illustrative, no flood depth or peak flow. Keep event replay separate from annual use.')],
        demo_priority='Prioritise whole-campus reveal and same-rain investigation if time is short. No new milestones or accumulating resource counters.',
        milestones=cards)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = json.dumps(build(), indent=2, ensure_ascii=False) + '\n'
    target = ROOT / 'milestones.en.json'
    if args.check:
        assert target.read_text() == result, 'Stale handoff; run compute.py'
    else:
        target.write_text(result)
    print('PASS: seven surface budgets, unchanged disturbance, M5/M6 identity and 70% final sealed share; handoff matches canonical baseline.')


if __name__ == '__main__':
    main()
