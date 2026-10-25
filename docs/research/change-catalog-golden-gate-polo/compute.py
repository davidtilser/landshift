#!/usr/bin/env python3
"""Four bounded SF design alternatives and an offline English data handoff."""

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHANGE_IDS = ['solar_roof', 'roof_tank', 'preserve_turf', 'cooling_water_controls']
STAGES = [f'M{i}' for i in range(7)]
AREAS = ['turf_m2', 'stripped_not_graded_m2', 'bare_graded_m2', 'roof_m2',
         'other_impervious_m2', 'landscape_m2']
METRICS = {
    'facility_electricity_mwh_year': ('energy', 'MWh/year', 'same full operating-year demand; not a peak'),
    'it_electricity_mwh_year': ('energy', 'MWh/year', 'same 10 MW average IT service assumption'),
    'grid_import_mwh_year': ('energy', 'MWh/year', 'normal operation; flat-load assumption for PV'),
    'pv_generation_mwh_year': ('energy', 'MWh/year', 'long-term average regional PV output estimate'),
    'grid_import_reduction_percent': ('energy', '%', 'annual grid-import reduction against baseline'),
    'cooling_makeup_m3_year': ('water', 'm³/year', 'cooling make-up supplied; includes blowdown'),
    'cooling_evaporation_m3_year': ('water', 'm³/year', 'cooling water evaporated'),
    'cooling_blowdown_m3_year': ('water', 'm³/year', 'cooling sanitary blowdown volume'),
    'existing_uses_water_supply_m3_year': ('water', 'm³/year', 'selected cooling, domestic and irrigation uses only'),
    'irrigation_supply_m3_year': ('water', 'm³/year', 'inherited 300 mm delivered allowance'),
    'event_generated_runoff_m3': ('water', 'm³/event', 'same 86.4 mm rain, selected HSG B'),
    'event_roof_capture_m3': ('water', 'm³/event', 'roof-only storage, empty start, no release'),
    'event_managed_drainage_m3': ('water', 'm³/event', 'volume after roof capture; not peak or flood'),
    'retained_turf_m2': ('land', 'm²', 'original turf retained at completed campus'),
    'final_impervious_m2': ('land', 'm²', 'roof plus other final hard surfaces'),
    'campus_footprint_m2': ('land', 'm²', 'same authored campus envelope'),
    'roof_area_m2': ('land', 'm²', 'same roof footprint'),
    'pv_dc_kwp': ('energy', 'kWp DC', 'nameplate power, not annual generation'),
    'tank_capacity_m3': ('water', 'm³ storage', 'static tank capacity'),
    'tank_added_nominal_footprint_m2': ('land', 'm²', 'additional volume / assumed usable depth'),
    'additional_pv_cleaning_water_m3_year': ('water', 'm³/year', 'not estimated once PV is added'),
    'additional_controls_electricity_mwh_year': ('energy', 'MWh/year', 'not estimated for changed water treatment/control'),
    'public_access_area_m2': ('community', 'm²', 'not established; green inside campus is not public access'),
    'available_network_headroom_mw': ('energy', 'MW', 'not assessed for this site'),
}
PRIMARY = {
    'solar_roof': ['pv_generation_mwh_year', 'grid_import_mwh_year', 'grid_import_reduction_percent'],
    'roof_tank': ['event_roof_capture_m3', 'event_managed_drainage_m3', 'tank_added_nominal_footprint_m2'],
    'preserve_turf': ['retained_turf_m2', 'event_managed_drainage_m3', 'irrigation_supply_m3_year'],
    'cooling_water_controls': ['cooling_makeup_m3_year', 'cooling_blowdown_m3_year', 'cooling_evaporation_m3_year', 'facility_electricity_mwh_year'],
}


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def finite(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def close(a, b, message):
    require(math.isclose(a, b, abs_tol=1e-7, rel_tol=1e-10), message)


def sources_in(value, known):
    if isinstance(value, dict):
        if 'source_ids' in value:
            require(set(value['source_ids']) <= known, 'Unknown source ID')
        for child in value.values():
            sources_in(child, known)
    elif isinstance(value, list):
        for child in value:
            sources_in(child, known)


def runoff_mm(rain_mm, cn):
    require(finite(rain_mm) and rain_mm >= 0 and finite(cn) and 0 < cn <= 100,
            'Invalid rain or curve number')
    retention = 25400 / cn - 254
    return (rain_mm - 0.2 * retention) ** 2 / (rain_mm + 0.8 * retention) if rain_mm > 0.2 * retention else 0.0


def event(stage, rain, cn, capacity, initial=0):
    require(0 <= initial <= capacity, 'Invalid initial storage')
    if stage['stripped_not_graded_m2']:
        return None
    mapping = [('turf_m2', 'turf'), ('bare_graded_m2', 'bare_graded'),
               ('roof_m2', 'impervious'), ('other_impervious_m2', 'impervious'),
               ('landscape_m2', 'landscape')]
    parts = {area: runoff_mm(rain, cn[kind]) * stage[area] / 1000 for area, kind in mapping}
    generated = sum(parts.values())
    captured = min(parts['roof_m2'], capacity - initial) if stage['tank_active'] else 0
    gross = rain * sum(stage[key] for key in AREAS) / 1000
    residual = gross - generated
    drainage = generated - captured
    require(min(residual, captured, drainage) >= -1e-7, 'Negative event volume')
    close(gross, residual + captured + drainage, 'Rain-event mass balance')
    return dict(generated_surface_runoff_m3=generated, roof_capture_m3=captured,
                water_to_managed_drainage_m3=drainage, roof_inflow_m3=parts['roof_m2'],
                unpartitioned_non_surface_runoff_residual_m3=residual,
                note='One event; no flow routing. Residual is not groundwater recharge.')


class Model:
    def __init__(self):
        self.scenario, self.catalog, self.registry = read('scenario.json'), read('catalog.en.json'), read('sources.json')
        self.validate()
        b = self.scenario['baseline']
        self.water, self.water_results = read(b['water_scenario']), read(b['water_results'])
        self.energy, self.energy_results = read(b['energy_scenario']), read(b['energy_results'])
        self.pv = read(self.scenario['solar']['response'])
        self.changes = {item['id']: item for item in self.catalog['changes']}
        self.inputs = {key: item['value'] for key, item in self.water['inputs'].items()}
        self.validate_baseline()
        self.baseline = self.baseline_metrics()

    def validate(self):
        s, c, r = self.scenario, self.catalog, self.registry
        require(s['locale'] == c['locale'] == 'en', 'English catalogue required')
        require(s['scenario_id'] == c['scenario_id'] == 'sf-polo-four-changes-v1', 'Wrong identity')
        require([item['id'] for item in c['changes']] == CHANGE_IDS, 'Exactly four distinct ordered changes required')
        require(s['comparison_policy']['max_simultaneous_changes'] == 1, 'Combination model not available')
        known = {item['id'] for item in r['sources']}
        require(len(known) == len(r['sources']), 'Duplicate source ID')
        sources_in(s, known)
        sources_in(c, known)
        require(len({item['path'] for item in r['raw_files']}) == len(r['raw_files']), 'Duplicate snapshot')
        for item in r['raw_files']:
            path = (ROOT / item['path']).resolve()
            require(ROOT in path.parents and item['source_id'] in known, 'Invalid source path/ID')
            require(hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], 'Frozen source hash mismatch')
        registered = {item['path'] for item in r['raw_files']}
        require(set(s['baseline'][key] for key in ['water_scenario', 'water_results', 'energy_scenario', 'energy_results'])
                <= registered, 'Baseline copies must be registered')
        require({s['solar']['response'], s['solar']['request']} <= registered, 'Solar response/request unregistered')
        for item in c['changes']:
            p = item['parameter']
            require(all(finite(p[k]) for k in ['minimum', 'maximum', 'default'])
                    and p['minimum'] <= p['default'] <= p['maximum'], 'Invalid parameter range')
            require(set(item['milestones']) <= set(STAGES), 'Unknown milestone')

    def validate_baseline(self):
        s, w, wr, e, er = self.scenario, self.water, self.water_results, self.energy, self.energy_results
        require(w['scenario_id'] == wr['scenario_id'] == 'sf-polo-turf-water-v1', 'Water identity mismatch')
        require(e['scenario_id'] == er['scenario_id'] == 'sf-polo-turf-energy-v1', 'Energy identity mismatch')
        require([stage['id'] for stage in w['stages']] == [stage['id'] for stage in wr['stages']] == STAGES,
                'Seven baseline milestones required')
        i = self.inputs
        for key in ['site_area_m2', 'roof_area_m2', 'average_it_load_mw', 'operation_days']:
            close(i[key], e['inputs'][key]['value'], 'Inherited common parameter mismatch')
        close(i['site_area_m2'], 40000, 'Wrong site area')
        close(i['roof_area_m2'], 12000, 'Wrong roof')
        close(i['average_it_load_mw'], 10, 'Wrong average IT')
        close(er['operation']['it_electricity_mwh_year'], 10 * 8760, 'IT used more than once')
        close(er['operation']['facility_electricity_mwh_year'], 10 * 8760 * 1.2, 'Facility baseline mismatch')
        close(er['operation']['cooling_makeup_m3_year'], wr['operation']['annual_supply_by_use_m3']['cooling'], 'Water/energy coupling mismatch')
        close(i['roof_tank_capacity_m3'], s['tank']['baseline_capacity_m3'], 'Tank inheritance mismatch')
        close(i['cycles_of_concentration'], s['cooling']['baseline_concentration_ratio'], 'CoC inheritance mismatch')
        for stage in w['stages']:
            close(sum(stage[k] for k in AREAS), i['site_area_m2'], 'Baseline area does not close')
        require(s['turf']['max_prepared_extra_retained_turf_m2'] <= i['other_impervious_area_m2'], 'Turf edit consumes roof or extra land')
        pv = self.pv
        loc = pv['inputs']['location']
        close(loc['latitude'], 37.7682117, 'PV latitude mismatch')
        close(loc['longitude'], -122.4932246, 'PV longitude mismatch')
        meteo = pv['inputs']['meteo_data']
        require(meteo['radiation_db'] == 'PVGIS-ERA5' and meteo['meteo_db'] == 'ERA5'
                and meteo['year_min'] == 2005 and meteo['year_max'] == 2023
                and meteo['use_horizon'] is True, 'Solar weather identity mismatch')
        module = pv['inputs']['pv_module']
        require(module['technology'] == 'c-Si', 'PV technology mismatch')
        close(module['peak_power'], 1, 'Solar reference must be 1 kWp')
        close(module['system_loss'], 14, 'Solar input loss mismatch')
        require(pv['meta']['inputs']['pv_module']['variables']['peak_power']['units'] == 'kW', 'Solar nameplate unit mismatch')
        fixed = pv['inputs']['mounting_system']['fixed']
        require(fixed['type'] == 'free-standing', 'Ventilated rack approximation mismatch')
        close(fixed['slope']['value'], 10, 'PV slope mismatch')
        close(fixed['azimuth']['value'], 0, 'PV azimuth mismatch')
        months = pv['outputs']['monthly']['fixed']
        require(sorted(m['month'] for m in months) == list(range(1, 13)), 'PV months missing/duplicated')
        require(all(finite(m['E_m']) and m['E_m'] >= 0 for m in months), 'Invalid PV monthly output')
        annual = pv['outputs']['totals']['fixed']['E_y']
        require(finite(annual) and annual > 0, 'PV annual output missing')
        require(abs(sum(m['E_m'] for m in months) - annual) <= 0.1, 'PV monthly/annual rounding mismatch')
        require(pv['meta']['outputs']['totals']['variables']['E_y']['units'] == 'kWh/y', 'PV annual output unit mismatch')
        solar = s['solar']
        zone, coverage, density = (solar[k]['value'] for k in ['max_solar_zone_m2', 'module_coverage_of_zone', 'module_dc_kw_per_m2'])
        require(0 < zone <= i['roof_area_m2'] and 0 < coverage <= 1 and 0 < density <= 1, 'Invalid roof allocation or density')
        flat = solar['constant_facility_demand_mw']['value']
        close(flat, er['operation']['average_facility_mw'], 'Flat-load assumption mismatch')
        require(solar['all_modelled_pv_self_consumed']['value'] is True
                and zone * coverage * density < flat * 1000, 'Prepared PV exceeds flat-load self-consumption scope')
        require(s['tank']['initial_storage_m3'] == 0 and s['tank']['annual_reuse_modelled'] is False, 'Tank boundary changed')
        require(s['tank']['usable_depth_m']['value'] > 0, 'Invalid tank depth')
        require((s['tank']['max_prepared_capacity_m3'] - i['roof_tank_capacity_m3']) / s['tank']['usable_depth_m']['value']
                <= s['tank']['expansion_zone_m2']['value'] <= i['other_impervious_area_m2'], 'Tank expansion budget exceeded')
        require(s['cooling']['fixed_evaporation'] is True and s['cooling']['negligible_drift_and_leaks'] is True
                and s['cooling']['water_chemistry_feasibility_established'] is False, 'Conditional cooling scope changed')
        for key, expected in [('solar_roof', zone), ('roof_tank', s['tank']['max_prepared_capacity_m3']),
                              ('preserve_turf', s['turf']['max_prepared_extra_retained_turf_m2']),
                              ('cooling_water_controls', s['cooling']['max_prepared_concentration_ratio'])]:
            close(self.changes[key]['parameter']['maximum'], expected, 'Catalogue/constraint mismatch')
        for stage, reference in zip(w['stages'], wr['stages']):
            rain = event(stage, wr['event']['rainfall_mm'], w['cn_method']['curve_numbers'][i['hydrologic_soil_group']], i['roof_tank_capacity_m3'])
            require((rain is None) == (reference['rain_event'] is None), 'Unknown stripping runoff mismatch')
            if rain is not None:
                for name in ['generated_surface_runoff_m3', 'roof_capture_m3', 'water_to_managed_drainage_m3']:
                    close(rain[name], reference['rain_event'][name], 'Baseline event reproduction failed')

    def baseline_metrics(self):
        w, e, i = self.water_results['operation'], self.energy_results['operation'], self.inputs
        rain = self.water_results['stages'][-1]['rain_event']
        return dict(facility_electricity_mwh_year=e['facility_electricity_mwh_year'],
                    it_electricity_mwh_year=e['it_electricity_mwh_year'], grid_import_mwh_year=e['facility_electricity_mwh_year'],
                    pv_generation_mwh_year=0, grid_import_reduction_percent=0,
                    cooling_makeup_m3_year=w['annual_supply_by_use_m3']['cooling'],
                    cooling_evaporation_m3_year=w['annual_cooling_evaporation_m3'],
                    cooling_blowdown_m3_year=w['annual_cooling_blowdown_m3'],
                    existing_uses_water_supply_m3_year=w['first_year_total_supplied_m3'],
                    irrigation_supply_m3_year=w['annual_supply_by_use_m3']['landscape_irrigation'],
                    event_generated_runoff_m3=rain['generated_surface_runoff_m3'],
                    event_roof_capture_m3=rain['roof_capture_m3'], event_managed_drainage_m3=rain['water_to_managed_drainage_m3'],
                    retained_turf_m2=self.water['stages'][-1]['turf_m2'],
                    final_impervious_m2=i['roof_area_m2']+i['other_impervious_area_m2'],
                    campus_footprint_m2=i['site_area_m2'], roof_area_m2=i['roof_area_m2'], pv_dc_kwp=0,
                    tank_capacity_m3=i['roof_tank_capacity_m3'], tank_added_nominal_footprint_m2=0,
                    additional_pv_cleaning_water_m3_year=0, additional_controls_electricity_mwh_year=0,
                    public_access_area_m2=None, available_network_headroom_mw=None)

    @staticmethod
    def rejected(status, explanation):
        return dict(status=status, preview_allowed=False, explanation=explanation, metrics=None, milestone_states=None)

    def evaluate(self, request):
        if not isinstance(request, dict):
            return self.rejected('invalid_input', 'Use one structured request.')
        if set(request) - {'change_id', 'parameters', 'goal'}:
            return self.rejected('invalid_input', 'Unsupported request fields; assumptions cannot be overridden through input.')
        change_id = request.get('change_id')
        if isinstance(change_id, list):
            return self.rejected('combined_changes_not_supported', 'Preview one change against the same baseline; do not add savings from separate previews.')
        if change_id is None:
            return self.rejected('clarification_required', 'Choose a concrete edit: rooftop solar, roof-rain storage, retained grass or cooling-water management.')
        if not isinstance(change_id, str) or change_id not in self.changes:
            return self.rejected('unsupported_change', 'This catalogue contains exactly four prepared actions. Keep other ideas as suggestions, without invented results.')
        action = self.changes[change_id]
        p = action['parameter']
        params = request.get('parameters', {})
        if not isinstance(params, dict) or set(params) - {p['name']}:
            return self.rejected('invalid_input', 'Use only the named parameter and its declared unit.')
        value = params.get(p['name'], p['default'])
        if not finite(value) or value < 0:
            return self.rejected('invalid_input', 'The parameter must be a finite, nonnegative number in the declared unit.')
        if change_id == 'cooling_water_controls' and value <= 1:
            return self.rejected('invalid_input', 'This steady-state make-up model requires a concentration ratio above one.')
        if change_id == 'solar_roof' and value > self.inputs['roof_area_m2']:
            return self.rejected('exceeds_geometric_bound', 'The requested solar zone exceeds the entire 12,000 m² roof in this design.')
        if not p['minimum'] <= value <= p['maximum']:
            return self.rejected('outside_prepared_range', 'The request is outside this prepared scenario range. This is not proof that all such real designs are impossible.')
        goal = request.get('goal')
        if goal is not None and (change_id != 'solar_roof' or not isinstance(goal, dict)
                                 or set(goal) != {'metric', 'value'} or goal['metric'] != 'grid_import_reduction_percent'
                                 or not finite(goal['value']) or not 0 <= goal['value'] <= 100):
            return self.rejected('unsupported_goal', 'The prepared numeric goal is rooftop solar annual grid-import reduction from 0 to 100 percent.')
        alternative = copy.deepcopy(self.baseline)
        stages = copy.deepcopy(self.water['stages'])
        tank = self.inputs['roof_tank_capacity_m3']
        details = {}
        unquantified = ['Construction fuel/electricity/material deltas and costs are not calculated for the edit.',
                        'Actual grid capacity, route, outage effects, biodiversity and community consent remain unassessed.']
        if change_id == 'solar_roof':
            solar = self.scenario['solar']
            density = solar['module_coverage_of_zone']['value'] * solar['module_dc_kw_per_m2']['value']
            kwp = value * density
            annual_kwh = kwp * self.pv['outputs']['totals']['fixed']['E_y']
            alternative.update(pv_dc_kwp=kwp, pv_generation_mwh_year=annual_kwh/1000,
                               grid_import_mwh_year=self.baseline['grid_import_mwh_year']-annual_kwh/1000,
                               grid_import_reduction_percent=annual_kwh/(1000*self.baseline['grid_import_mwh_year'])*100,
                               additional_pv_cleaning_water_m3_year=None if value else 0)
            details = dict(solar_zone_m2=value, module_surface_m2=value*solar['module_coverage_of_zone']['value'],
                           specific_yield_kwh_per_kwp_year=self.pv['outputs']['totals']['fixed']['E_y'],
                           meteo_source=self.pv['inputs']['meteo_data'],
                           monthly_generation_kwh=[dict(month=m['month'], energy_kwh=m['E_m']*kwp) for m in self.pv['outputs']['monthly']['fixed']],
                           peak_connection_reduction_mw=None,
                           self_consumption_basis='Assumed flat 12 MW demand; prepared DC array below demand; no export/storage; regional yield with chosen losses.')
            unquantified += ['PV cleaning water, actual local shade, roof fit/structure and maintenance are not estimated. Existing modelled water uses stay at baseline; no complete revised water total is claimed.']
        elif change_id == 'roof_tank':
            tank = value
            footprint = (value-self.inputs['roof_tank_capacity_m3']) / self.scenario['tank']['usable_depth_m']['value']
            require(footprint <= self.scenario['tank']['expansion_zone_m2']['value'], 'Tank footprint exceeds prepared zone')
            alternative.update(tank_capacity_m3=value, tank_added_nominal_footprint_m2=footprint)
            details = dict(annual_reuse_savings_m3=None, initial_storage_m3=0, nominal_usable_depth_m=self.scenario['tank']['usable_depth_m']['value'],
                           footprint_basis='Additional capacity divided by assumed depth, within existing hardstanding; no new impervious-area change.',
                           operation_basis='No within-event release or annual reuse; selected normal-operation electricity and water uses are held fixed.')
            unquantified += ['Actual tank fit, construction resources, treatment/reuse, drainage peaks and flood outcomes are not estimated.']
        elif change_id == 'preserve_turf':
            for stage in stages[1:]:
                source = ('stripped_not_graded_m2' if stage['id'] == 'M1' else
                          'bare_graded_m2' if stage['id'] in ('M2','M3','M4') else 'other_impervious_m2')
                stage[source] -= value
                stage['turf_m2'] += value
            added_irrigation = value*self.inputs['irrigation_applications']*self.inputs['irrigation_depth_mm_application']/1000
            alternative.update(retained_turf_m2=self.baseline['retained_turf_m2']+value,
                               final_impervious_m2=self.baseline['final_impervious_m2']-value,
                               irrigation_supply_m3_year=self.baseline['irrigation_supply_m3_year']+added_irrigation,
                               existing_uses_water_supply_m3_year=self.baseline['existing_uses_water_supply_m3_year']+added_irrigation,
                               facility_electricity_mwh_year=None if value else self.baseline['facility_electricity_mwh_year'],
                               grid_import_mwh_year=None if value else self.baseline['grid_import_mwh_year'],
                               grid_import_reduction_percent=None if value else 0)
            details = dict(extra_retained_turf_m2=value, added_irrigation_m3_year=added_irrigation,
                           clearing_area_m2=self.inputs['cleared_area_m2']-value,
                           layout_feasibility='Delivery, emergency access, parking and utility fit unassessed.',
                           power_basis='IT and the reference cooling budget unchanged; incremental irrigation pumping not quantified, so revised whole-campus electricity is null.')
            unquantified += ['Irrigation pumping electricity, construction changes, habitat quality and actual public access are not calculated. The same campus still occupies 4 ha.']
        else:
            evaporation = self.baseline['cooling_evaporation_m3_year']
            blowdown = evaporation/(value-1)
            makeup = evaporation+blowdown
            changed = not math.isclose(value,self.scenario['cooling']['baseline_concentration_ratio'])
            alternative.update(cooling_makeup_m3_year=makeup,cooling_blowdown_m3_year=blowdown,
                               existing_uses_water_supply_m3_year=self.baseline['existing_uses_water_supply_m3_year']+makeup-self.baseline['cooling_makeup_m3_year'],
                               additional_controls_electricity_mwh_year=None if changed else 0,
                               facility_electricity_mwh_year=None if changed else self.baseline['facility_electricity_mwh_year'],
                               grid_import_mwh_year=None if changed else self.baseline['grid_import_mwh_year'],
                               grid_import_reduction_percent=None if changed else 0)
            details = dict(concentration_ratio=value, chemistry_feasibility='not_established',
                           cooling_makeup_m3_average_day=makeup/self.inputs['operation_days'],
                           model_condition='Fixed evaporation/heat-rejection duty, negligible drift/leaks and suitable chemistry/treatment assumed. No treatment-energy or ancillary process-water estimate.')
            close(makeup, evaporation+blowdown, 'Cooling water balance failed')
            close(makeup/blowdown,value,'Concentration ratio failed')
            unquantified += ['Water chemistry/treatment feasibility, added treatment electricity and ancillary water are unassessed. Conditional make-up saving is not reduced evaporation or proof of household supply relief.']
        states = []
        cn = self.water['cn_method']['curve_numbers'][self.inputs['hydrologic_soil_group']]
        for stage, baseline_stage in zip(stages,self.water['stages']):
            require(all(stage[key]>=0 for key in AREAS),'Negative surface area')
            close(sum(stage[key] for key in AREAS),self.inputs['site_area_m2'],'Alternative area balance')
            rain = event(stage,self.water_results['event']['rainfall_mm'],cn,tank)
            states.append(dict(id=stage['id'],areas_m2={key:stage[key] for key in AREAS},
                               area_delta_from_same_baseline_m2={key:stage[key]-baseline_stage[key] for key in AREAS},
                               rain_event=rain, edit_visible=stage['id'] in action['milestones'],
                               annual_operation_metrics=None))
        final = states[-1]['rain_event']
        alternative.update(event_generated_runoff_m3=final['generated_surface_runoff_m3'],
                           event_roof_capture_m3=final['roof_capture_m3'],event_managed_drainage_m3=final['water_to_managed_drainage_m3'])
        rows=[]
        for key,(facet,unit,basis) in METRICS.items():
            base,after = self.baseline[key],alternative[key]
            delta = after-base if after is not None and base is not None else None
            status = 'not_established' if after is None else 'unchanged_under_model_assumptions' if delta is not None and math.isclose(delta,0,abs_tol=1e-7) else 'calculated_with_assumptions'
            rows.append(dict(id=key,facet=facet,unit=unit,time_basis=basis,baseline=base,alternative=after,delta=delta,status=status))
        states[-1]['annual_operation_metrics'] = {k:v for k,v in alternative.items() if METRICS[k][1] in ('MWh/year','m³/year','%')}
        goal_result=None
        if goal is not None:
            target_energy=self.baseline['grid_import_mwh_year']*1000*goal['value']/100
            needed_kwp=target_energy/self.pv['outputs']['totals']['fixed']['E_y']
            needed_zone=needed_kwp/(self.scenario['solar']['module_coverage_of_zone']['value']*self.scenario['solar']['module_dc_kw_per_m2']['value'])
            goal_result=dict(target_percent=goal['value'],achieved_percent=alternative['grid_import_reduction_percent'],
                             status='met_under_model_assumptions' if alternative['grid_import_reduction_percent']+1e-10>=goal['value'] else 'not_met_by_this_preview',
                             required_dc_kwp_under_same_yield=needed_kwp,required_solar_zone_m2_under_same_assumptions=needed_zone,
                             exceeds_prepared_roof_allocation=needed_zone>self.scenario['solar']['max_solar_zone_m2']['value'],
                             exceeds_entire_roof_under_same_assumptions=needed_zone>self.inputs['roof_area_m2'])
        return dict(change_id=change_id,title=action['title'],status='conditional_educational_preview',preview_allowed=True,
                    parameters={p['name']:value},engineering_feasibility='not_established',source_ids=action['source_ids'],
                    primary_metrics=PRIMARY[change_id],metrics=rows,details=details,goal=goal_result,
                    unquantified_implications=unquantified,milestone_states=states,
                    visualization=action['visual'],wider_context=action['wider'])


def verify_preservation():
    baseline=read('preservation-sha256.json')['before_catalog_work']
    repo=ROOT.parents[2]
    checked=0
    for name,digest in baseline.items():
        path=(repo/name).resolve()
        require(repo in path.parents,'Invalid preservation path')
        if path.exists():
            require(hashlib.sha256(path.read_bytes()).hexdigest()==digest,'Original packet changed: '+name)
            checked+=1
    return checked,len(baseline)


def generate(model):
    defaults=[model.evaluate(dict(change_id=c['id'])) for c in model.catalog['changes']]
    examples=[dict(id=e['id'],user_input=e['user_input'],request=e['request'],result=model.evaluate(e['request']))
              for e in read('interaction-examples.en.json')['examples']]
    require(all(c['preview_allowed'] for c in defaults),'Default preview failed')
    results=dict(scenario_id=model.scenario['scenario_id'],locale='en',baseline_metrics=model.baseline,
                 solar_reference=model.pv['inputs'],alternatives=defaults)
    handoff=dict(schema_version=1,scenario_id=model.scenario['scenario_id'],locale='en',
                 interaction=model.catalog['interaction'],comparison_policy=model.scenario['comparison_policy'],
                 changes=[dict(**action,preview=result) for action,result in zip(model.catalog['changes'],defaults)],
                 input_examples=examples,display_rules='Retain metric unit/time basis and status. Null is Not established. Positive/negative delta is not a universal good/bad score. Never sum previews.')
    lines=['# Four modelled changes at Golden Gate Park Polo Fields','','Each is a separate alternative design against the same frozen baseline. Quantities are educational calculations, not site approvals.','',
           '| Change | Primary result |','| --- | --- |']
    for case in defaults:
        rows={r['id']:r for r in case['metrics']}
        summary='; '.join(f"{key}: {rows[key]['alternative']:,.3f} {rows[key]['unit']}" if rows[key]['alternative'] is not None else f'{key}: Not established' for key in case['primary_metrics'])
        lines.append(f"| {case['title']} | {summary} |")
    for case in defaults:
        lines += ['', '## '+case['title'],'',case['visualization'],'',case['wider_context'],'',
                  '| Metric | Baseline | Alternative | Delta | Unit and time basis | Status |',
                  '| --- | ---: | ---: | ---: | --- | --- |']
        for row in case['metrics']:
            def show(v):
                return 'Not established' if v is None else f'{v:,.3f}'.rstrip('0').rstrip('.')
            lines.append(f"| {row['id']} | {show(row['baseline'])} | {show(row['alternative'])} | {show(row['delta'])} | {row['unit']}; {row['time_basis']} | {row['status']} |")
        lines += ['','**Unquantified implications:**','']+['- '+s for s in case['unquantified_implications']]
    lines += ['','## Example requests','']
    for e in examples:
        result=e['result']
        lines += ['**'+e['user_input']+'**','', 'Response status: `'+result['status']+'`.','']
        if result.get('goal'):
            g=result['goal']
            lines += [f"Target {g['target_percent']:g}%; achieved {g['achieved_percent']:.3f}%. Required solar zone under the same assumptions: {g['required_solar_zone_m2_under_same_assumptions']:,.1f} m². This exceeds the entire roof: {g['exceeds_entire_roof_under_same_assumptions']}.",'']
        elif not result['preview_allowed']:
            lines += [result['explanation'],'']
    return {'results.json':json.dumps(results,indent=2,ensure_ascii=False)+'\n',
            'handoff.en.json':json.dumps(handoff,indent=2,ensure_ascii=False)+'\n',
            'results.md':'\n'.join(lines)+'\n'}


def self_test(model):
    def case(change,**params):
        result=model.evaluate(dict(change_id=change,parameters=params))
        require(result['preview_allowed'],'Expected prepared preview')
        return result,{r['id']:r['alternative'] for r in result['metrics']}
    solar,sm=case('solar_roof',solar_zone_m2=6000)
    close(sm['facility_electricity_mwh_year'],105120,'Solar must not reduce IT/support demand')
    close(sm['grid_import_mwh_year']+sm['pv_generation_mwh_year'],sm['facility_electricity_mwh_year'],'PV energy balance')
    require(sm['additional_pv_cleaning_water_m3_year'] is None,'PV cleaning is unknown')
    target=model.evaluate(dict(change_id='solar_roof',goal=dict(metric='grid_import_reduction_percent',value=10)))['goal']
    require(target['status']=='not_met_by_this_preview' and target['exceeds_entire_roof_under_same_assumptions'],'Ten-percent target must not be promised')
    tank,tm=case('roof_tank',tank_capacity_m3=400)
    close(tm['event_managed_drainage_m3'],model.baseline['event_managed_drainage_m3']-200,'Double tank event effect')
    close(tm['existing_uses_water_supply_m3_year'],model.baseline['existing_uses_water_supply_m3_year'],'No annual reuse credit')
    large,lm=case('roof_tank',tank_capacity_m3=2000)
    close(lm['event_roof_capture_m3'],model.water_results['stages'][-1]['rain_event']['generated_by_surface_m3']['roofs'],'Capture cannot exceed roof inflow')
    full=copy.deepcopy(model.water['stages'][-1])
    rain=event(full,86.4,model.water['cn_method']['curve_numbers']['B'],400,400)
    close(rain['roof_capture_m3'],0,'Full tank cannot capture more')
    green,gm=case('preserve_turf',extra_retained_turf_m2=4000)
    require(gm['event_generated_runoff_m3']<model.baseline['event_generated_runoff_m3'],'Retaining turf must reduce event runoff in chosen classes')
    close(gm['irrigation_supply_m3_year'],4800,'Extra irrigation must not disappear')
    close(gm['campus_footprint_m2'],40000,'Green is not a smaller campus')
    require(gm['facility_electricity_mwh_year'] is None and gm['public_access_area_m2'] is None,'Unknown pumping/access must stay unknown')
    require(green['milestone_states'][1]['rain_event'] is None,'No invented stripping-only runoff')
    cool,cm=case('cooling_water_controls',concentration_ratio=6)
    close(cm['cooling_makeup_m3_year'],98550,'CoC make-up')
    close(cm['cooling_blowdown_m3_year'],16425,'CoC blowdown')
    close(cm['cooling_evaporation_m3_year'],82125,'No evaporation saving')
    require(cm['facility_electricity_mwh_year'] is None,'Treatment energy must not be zeroed')
    for change,param,value in [('solar_roof','solar_zone_m2',0),('roof_tank','tank_capacity_m3',200),('preserve_turf','extra_retained_turf_m2',0),('cooling_water_controls','concentration_ratio',4)]:
        _,same=case(change,**{param:value})
        for key in model.baseline:
            before,after=model.baseline[key],same[key]
            require(before is None and after is None or before is not None and after is not None and math.isclose(before,after,abs_tol=1e-7),'Identity setting changes baseline: '+key)
    rejected=[dict(change_id='battery'),dict(change_id=None),dict(change_id=['solar_roof','roof_tank']),
              dict(change_id='solar_roof',parameters={'solar_zone_m2':20000}),
              dict(change_id='solar_roof',parameters={'solar_zone_m2':7000}),
              dict(change_id='preserve_turf',parameters={'extra_retained_turf_m2':10000}),
              dict(change_id='cooling_water_controls',parameters={'concentration_ratio':20}),
              dict(change_id='cooling_water_controls',parameters={'concentration_ratio':1}),
              dict(change_id='roof_tank',parameters={'tank_capacity_m3':-1}),
              dict(change_id='solar_roof',parameters={'solar_zone_m2':True}),
              dict(change_id='solar_roof',parameters={'solar_zone_m2':float('nan')}),
              dict(change_id='solar_roof',parameters={'solar_zone_m2':float('inf')}),
              dict(change_id='solar_roof',parameters={'average_it_load_mw':1}),
              dict(change_id='roof_tank',goal={'metric':'grid_import_reduction_percent','value':10})]
    require(all(not model.evaluate(r)['preview_allowed'] for r in rejected),'Invalid/unsupported request was accepted')
    require(generate(model)==generate(model),'Preview/replay not deterministic')
    print(f'PASS: energy/water/area balances, roof limits, tank plateau/full state, irrigation trade-off, conditional cooling, four identity settings, {len(rejected)} rejected requests and stateless preview.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--self-test',action='store_true')
    parser.add_argument('--request',help='Evaluate one JSON request and print its preview; does not write artifacts')
    args=parser.parse_args()
    model=Model()
    checked,total=verify_preservation()
    if args.request:
        print(json.dumps(model.evaluate(json.loads(args.request)),indent=2,ensure_ascii=False))
        return
    for name,text in generate(model).items():
        path=ROOT/name
        if args.check:
            require(path.exists() and path.read_text(encoding='utf-8')==text,'Stale generated file: '+name)
        else:
            path.write_text(text,encoding='utf-8')
    if args.self_test:
        self_test(model)
    print('PASS: four actions, frozen source/baseline hashes, PV identity/units, inherited rain and seven milestone states.')
    print(f'Preservation: {checked}/{total} sibling files present and byte-identical. Bundled snapshots support standalone reproduction.')


if __name__=='__main__':
    main()
