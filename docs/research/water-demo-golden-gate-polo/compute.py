#!/usr/bin/env python3
"""Reproduce the frozen water-only demo without network or third-party packages."""

import argparse
import calendar
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AREA_KEYS = (
    "turf_m2", "stripped_not_graded_m2", "bare_graded_m2",
    "roof_m2", "other_impervious_m2", "landscape_m2",
)


def current_demo_markdown(content):
    """Label original calculation stages without changing any numerical output."""
    title, body = content.split('\n', 1)
    return title + '\n\n' + '> **Current demo: five chapters — Today → Foundations → Structure → Ready → Operating.** M0–M6 below are the seven original calculation stages, not seven selectable timeline points. The new Foundations checkpoint has no separately assessed water, fuel, electricity or runoff. Original M4 construction inventories cover foundations and structure together; they must not be split arbitrarily or counted twice. See the [five-chapter mapping in this packet](README.md#current-demo-and-calculation-stages) and the [runtime contract](../../polo-demo.md#five-chapter-contract-and-retained-use-cases).' + '\n' + body


def read_json(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def close(actual, expected, label):
    if not math.isclose(actual, expected, abs_tol=1e-7, rel_tol=1e-10):
        raise ValueError(f"{label}: {actual} != {expected}")


def runoff_mm(rain_mm, cn):
    """TR-55 equations 2-3/2-4, converted from inches to millimetres."""
    if not 0 < cn <= 100 or rain_mm < 0:
        raise ValueError("Invalid rainfall or curve number")
    retention = 25400 / cn - 254
    return ((rain_mm - 0.2 * retention) ** 2 / (rain_mm + 0.8 * retention)
            if rain_mm > 0.2 * retention else 0.0)


def load_event(scenario):
    event = scenario["event"]
    lines = (ROOT / event["raw_file"]).read_text().splitlines()
    year, month, day = map(int, event["observation_date"].split("-"))
    matching = [line for line in lines
                if line[:11] == event["station_id"]
                and line[11:17] == f"{year:04}{month:02}"
                and line[17:21] == "PRCP"]
    if len(matching) != 1 or day > calendar.monthrange(year, month)[1]:
        raise ValueError("Daily source record is missing or ambiguous")
    block = matching[0][21 + (day - 1) * 8:29 + (day - 1) * 8]
    value = int(block[:5])
    if value == -9999 or block[6] != " " or block[5] == "T":
        raise ValueError("Selected event must be numeric, non-trace and unflagged")
    return {
        "station_id": event["station_id"], "observation_date": event["observation_date"],
        "rainfall_mm": value / 10, "measurement_flag": block[5].strip(),
        "quality_flag": block[6].strip(), "source_flag": block[7].strip(),
    }


def surface_event(stage, rain, cn, inputs):
    # No substitute curve number for sod-stripping transition: unknown is not zero.
    if stage["stripped_not_graded_m2"]:
        return None
    parts = {
        "turf": runoff_mm(rain, cn["turf"]) * stage["turf_m2"] / 1000,
        "bare_graded": runoff_mm(rain, cn["bare_graded"]) * stage["bare_graded_m2"] / 1000,
        "roofs": runoff_mm(rain, cn["impervious"]) * stage["roof_m2"] / 1000,
        "other_impervious": runoff_mm(rain, cn["impervious"]) * stage["other_impervious_m2"] / 1000,
        "landscape": runoff_mm(rain, cn["landscape"]) * stage["landscape_m2"] / 1000,
    }
    generated = sum(parts.values())
    remaining_capacity = inputs["roof_tank_capacity_m3"] - inputs["roof_tank_initial_m3"]
    captured = min(parts["roofs"], remaining_capacity) if stage["tank_active"] else 0
    drainage = generated - captured
    rainfall = rain * inputs["site_area_m2"] / 1000
    non_surface = rainfall - generated
    close(rainfall, non_surface + captured + drainage, "Event volume balance")
    if min(non_surface, captured, drainage) < -1e-8:
        raise ValueError("Negative event volume")
    return {
        "generated_by_surface_m3": parts, "generated_surface_runoff_m3": generated,
        "roof_capture_m3": captured, "water_to_managed_drainage_m3": drainage,
        "rainfall_not_generated_as_surface_runoff_m3": non_surface,
        "tank_storage_after_event_m3": inputs["roof_tank_initial_m3"] + captured if stage["tank_active"] else 0,
        "basis": "one independent replay; no within-event tank release or reuse; no flow routing",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify generated files without writing")
    args = parser.parse_args()
    scenario = read_json("scenario.json")
    manifest = read_json("sources.json")
    source_ids = {s["id"] for s in manifest["sources"]}
    for raw in manifest["raw_files"]:
        digest = hashlib.sha256((ROOT / raw["path"]).read_bytes()).hexdigest()
        if digest != raw["sha256"]:
            raise ValueError(f"Source snapshot hash mismatch: {raw['path']}")
    for record in scenario["inputs"].values():
        if not set(record["source_ids"]) <= source_ids:
            raise ValueError("Unknown source ID")
    inputs = {key: item["value"] for key, item in scenario["inputs"].items()}
    if not 0 <= inputs["roof_tank_initial_m3"] <= inputs["roof_tank_capacity_m3"]:
        raise ValueError("Invalid initial tank storage")
    if inputs["cycles_of_concentration"] <= 1:
        raise ValueError("CoC must exceed one")
    if inputs["operation_days"] != 365:
        raise ValueError("This first-year scenario uses 365 days")
    event = load_event(scenario)
    normals_raw = read_json(scenario["normals_raw_file"])
    if len(normals_raw) != 12 or {row["DATE"] for row in normals_raw} != {f"{m:02}" for m in range(1, 13)}:
        raise ValueError("Missing or duplicate monthly normal")
    if any(row["STATION"] != event["station_id"] for row in normals_raw):
        raise ValueError("Weather station mismatch")
    normals = [{"month": int(row["DATE"]), "precipitation_mm": float(row["MLY-PRCP-NORMAL"])}
               for row in normals_raw]
    normal_total = sum(row["precipitation_mm"] for row in normals)
    winter = sum(row["precipitation_mm"] for row in normals if row["month"] in (11, 12, 1, 2, 3, 4))
    cn_groups = scenario["cn_method"]["curve_numbers"]
    cn = cn_groups[inputs["hydrologic_soil_group"]]
    final = scenario["stages"][-1]
    for surface, parameter in (("roof_m2", "roof_area_m2"),
                               ("other_impervious_m2", "other_impervious_area_m2"),
                               ("landscape_m2", "landscaped_area_m2")):
        close(final[surface], inputs[parameter], "Final layout input")
    close(final["turf_m2"] + final["landscape_m2"], inputs["irrigation_area_m2"], "Irrigated surfaces")
    close(inputs["baseline_irrigation_area_m2"], inputs["site_area_m2"], "Baseline turf")
    close(scenario["stages"][1]["stripped_not_graded_m2"], inputs["cleared_area_m2"], "Stripped area")
    stage_results = []
    cumulative_site = 0
    cumulative_offsite = 0
    for stage in scenario["stages"]:
        close(sum(stage[k] for k in AREA_KEYS), inputs["site_area_m2"], f"{stage['id']} area")
        if min(stage[k] for k in AREA_KEYS) < 0:
            raise ValueError("Negative area")
        if stage["average_active_watering_area_m2"] > inputs["cleared_area_m2"]:
            raise ValueError("Active work area exceeds works footprint")
        if not 0 <= stage["eligible_watering_workdays"] <= stage["worker_days"]:
            raise ValueError("Watering days outside working days")
        dust = (stage["average_active_watering_area_m2"] * stage["eligible_watering_workdays"]
                * inputs["dust_allowance_l_m2_workday"] / 1000)
        domestic = stage["worker_days"] * inputs["construction_workers"] * inputs["worker_water_l_person_day"] / 1000
        site = {"dust_and_soil_wetting": dust, "worker_domestic": domestic,
                "curing": 0, "equipment_wash": 0, "initial_cooling_fill": 0,
                "initial_fire_fill": 0, "commissioning_flush": 0}
        offsite = 0
        if stage["id"] == "M4":
            site["curing"] = inputs["curing_area_m2"] * inputs["curing_l_m2_day"] * inputs["curing_days"] / 1000
            site["equipment_wash"] = inputs["equipment_wash_m3"]
            offsite = inputs["concrete_volume_m3"] * inputs["concrete_mixing_water_l_m3"] / 1000
        if stage["id"] == "M5":
            site["worker_domestic"] = inputs["commissioning_workdays"] * inputs["commissioning_workers"] * inputs["worker_water_l_person_day"] / 1000
            site["initial_cooling_fill"] = inputs["cooling_initial_fill_m3"]
            site["initial_fire_fill"] = inputs["fire_initial_fill_m3"]
            site["commissioning_flush"] = inputs["commissioning_flush_m3"]
        cumulative_site += sum(site.values())
        cumulative_offsite += offsite
        rain_event = surface_event(stage, event["rainfall_mm"], cn, inputs)
        sensitivity = {g: surface_event(stage, event["rainfall_mm"], c, inputs) for g, c in cn_groups.items()}
        stage_results.append({
            "id": stage["id"], "milestone": stage["milestone"], "step": stage["step"],
            "areas_m2": {k.removesuffix("_m2"): stage[k] for k in AREA_KEYS},
            "rain_event": rain_event,
            "construction_and_commissioning_supply_m3": site,
            "step_site_supply_m3": sum(site.values()), "step_offsite_concrete_mixing_m3": offsite,
            "cumulative_preopening_site_supply_m3": cumulative_site,
            "cumulative_preopening_selected_supply_m3": cumulative_site + cumulative_offsite,
            "soil_group_sensitivity": {g: None if v is None else v["generated_surface_runoff_m3"] for g, v in sensitivity.items()},
        })
    close(sum(s["worker_days"] for s in scenario["stages"]), inputs["construction_workdays"], "Construction working days")
    close(stage_results[2]["rain_event"]["generated_surface_runoff_m3"], stage_results[3]["rain_event"]["generated_surface_runoff_m3"], "No invented compaction increment")
    close(stage_results[-1]["cumulative_preopening_selected_supply_m3"], stage_results[-2]["cumulative_preopening_selected_supply_m3"], "No repeated construction supply in operation")
    daily_cooling = inputs["average_it_load_mw"] * 1000 * 24 * inputs["cooling_supply_l_kwh_it"] / 1000
    blowdown = daily_cooling / inputs["cycles_of_concentration"]
    evaporation = daily_cooling - blowdown
    close(daily_cooling, blowdown + evaporation, "Cooling balance")
    days = inputs["operation_days"]
    irrigation = inputs["irrigation_area_m2"] * inputs["irrigation_depth_mm_application"] * inputs["irrigation_applications"] / 1000
    annual = {"cooling": daily_cooling * days, "domestic": inputs["operating_domestic_m3_day"] * days, "landscape_irrigation": irrigation}
    baseline_irrigation = (inputs["baseline_irrigation_area_m2"] * inputs["irrigation_depth_mm_application"]
                           * inputs["irrigation_applications"] / 1000)
    operation = {
        "assumptions": {
            key: scenario["inputs"][key] for key in (
                "average_it_load_mw", "cooling_technology", "cooling_supply_l_kwh_it",
                "cycles_of_concentration", "water_supply_type", "operation_days",
                "operating_domestic_m3_day", "irrigation_applications",
                "irrigation_depth_mm_application", "irrigation_supply_type",
            )
        },
        "daily_average_cooling_supply_m3": daily_cooling,
        "daily_average_cooling_evaporation_m3": evaporation,
        "daily_average_cooling_blowdown_m3": blowdown,
        "annual_supply_by_use_m3": annual, "first_year_total_supplied_m3": sum(annual.values()),
        "annual_cooling_evaporation_m3": evaporation * days,
        "annual_cooling_blowdown_m3": blowdown * days,
        "annual_rainwater_supply_credit_m3": inputs["operations_rainwater_supply_credit_m3"],
        "supply_type": inputs["water_supply_type"],
        "known_scenario_potable_cooling_and_domestic_m3": annual["cooling"] + annual["domestic"],
        "irrigation_supply_type": inputs["irrigation_supply_type"],
        "no_build_baseline_irrigation_m3_year": baseline_irrigation,
        "irrigation_supply_reduction_m3_year": baseline_irrigation - irrigation,
        "net_all_source_supply_increase_m3_year": sum(annual.values()) - baseline_irrigation,
        "net_potable_supply_change_m3_year": None,
        "baseline_note": "Same selected 300 mm annual delivered irrigation on the same 4 ha baseline versus 1.2 ha planted final surface. Not metered, not net consumptive use. Unknown irrigation-source shares prevent net-potable claim; no construction-season irrigation credit.",
        "daily_cooling_supply_sensitivity_m3": {str(i): inputs["average_it_load_mw"] * 24 * i for i in (0.5, 1.25, 2.0)},
        "sensitivity_note": "Illustrative intensity choices, not measured range, confidence interval or same-capacity engineered alternatives.",
    }
    close(annual["cooling"], operation["annual_cooling_evaporation_m3"] + operation["annual_cooling_blowdown_m3"], "Annual cooling balance")
    close(operation["annual_rainwater_supply_credit_m3"], 0, "No event-to-year harvest credit")
    close(sum(annual.values()), operation["net_all_source_supply_increase_m3_year"] + baseline_irrigation, "No-build comparison balance")
    results = {
        "scenario_id": scenario["scenario_id"], "generated_by": "python3 compute.py",
        "evidence": "Observed weather; published method; authored site and demand assumptions; derived outputs.",
        "event": {**event, "rainfall_on_parcel_m3": event["rainfall_mm"] * inputs["site_area_m2"] / 1000},
        "climate_context": {"station_id": event["station_id"], "normal_period": "1991–2020", "monthly_normals": normals,
                            "sum_rounded_monthly_normals_mm": normal_total, "november_to_april_share_pct": winter / normal_total * 100,
                            "normal_rainfall_on_parcel_m3": normal_total * inputs["site_area_m2"] / 1000,
                            "gross_normal_rainfall_on_roofs_m3": normal_total * inputs["roof_area_m2"] / 1000,
                            "annual_runoff_m3": None, "note": "Rainfall volumes only, not harvest, recharge or annual runoff."},
        "stages": stage_results, "operation": operation,
        "no_build_baseline": {
            "annual_irrigation_supplied_m3": baseline_irrigation,
            "gross_irrigation_allowance_mm_year": inputs["irrigation_depth_mm_application"] * inputs["irrigation_applications"],
            "source_type": inputs["irrigation_supply_type"],
            "kind": "derived_from_scenario_assumptions_not_metered",
        },
        "totals": {"preopening_site_supplied_m3": cumulative_site, "preopening_selected_offsite_mixing_m3": cumulative_offsite,
                   "preopening_selected_supply_m3": cumulative_site + cumulative_offsite,
                   "preopening_plus_first_operating_year_selected_supply_m3": cumulative_site + cumulative_offsite + sum(annual.values())},
    }
    close(runoff_mm(0, 98), 0, "Zero rain")
    close(runoff_mm(event["rainfall_mm"], 100), event["rainfall_mm"], "CN100")
    # Independent imperial-unit reference calculation catches mm/inch conversion errors.
    p_inches = event["rainfall_mm"] / 25.4
    s_inches = 1000 / 70 - 10
    q_inches = (p_inches - 0.2 * s_inches) ** 2 / (p_inches + 0.8 * s_inches)
    close(runoff_mm(event["rainfall_mm"], 70), q_inches * 25.4, "Independent unit conversion")
    cards = build_cards(scenario, results)
    def verify_sources(value):
        if isinstance(value, dict):
            if "source_ids" in value and not set(value["source_ids"]) <= source_ids:
                raise ValueError("Unknown source ID in content")
            for child in value.values():
                verify_sources(child)
        elif isinstance(value, list):
            for child in value:
                verify_sources(child)
    verify_sources(scenario)
    verify_sources(cards)
    outputs = {
        "results.json": json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        "milestones.sk.json": json.dumps(cards, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        "results.md": results_markdown(results),
        "walkthrough.sk.md": walkthrough_markdown(cards),
        "wider-water-story.md": wider_story_markdown(cards["wider_water_story"], manifest),
    }
    outputs = {name: current_demo_markdown(content) if name.endswith('.md') else content
               for name, content in outputs.items()}
    for name, content in outputs.items():
        path = ROOT / name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                raise ValueError(f"Generated output is stale: {name}; run python3 compute.py")
        else:
            path.write_text(content, encoding="utf-8")
    print("PASS: raw hashes, station/date/flags, 7 area budgets, event volume balances, cooling balances, units and generated files.")
    print(f"Event {event['rainfall_mm']} mm; preopening site {cumulative_site:,.0f} m³; selected total {cumulative_site+cumulative_offsite:,.0f} m³; first operating year {sum(annual.values()):,.0f} m³.")


def build_cards(scenario, results):
    copy = read_json("milestone-copy.sk.json")
    if set(copy["cards"]) != {s["id"] for s in results["stages"]}:
        raise ValueError("Missing milestone copy")
    cards = []
    for index, stage in enumerate(results["stages"]):
        item = {"id": stage["id"], **copy["cards"][stage["id"]]}
        item["data"] = {
            "areas_m2": stage["areas_m2"], "rainfall_mm": results["event"]["rainfall_mm"],
            "rainfall_on_parcel_m3": results["event"]["rainfall_on_parcel_m3"],
            "event": stage["rain_event"], "step_site_supplied_m3": stage["step_site_supply_m3"],
            "step_offsite_concrete_mixing_m3": stage["step_offsite_concrete_mixing_m3"],
            "cumulative_preopening_selected_supply_m3": stage["cumulative_preopening_selected_supply_m3"],
            "operation": results["operation"] if stage["id"] == "M6" else None,
            "no_build_baseline": results["no_build_baseline"],
            "baseline_generated_runoff_m3": results["stages"][0]["rain_event"]["generated_surface_runoff_m3"],
            "generated_runoff_change_from_baseline_m3": None if stage["rain_event"] is None else stage["rain_event"]["generated_surface_runoff_m3"] - results["stages"][0]["rain_event"]["generated_surface_runoff_m3"],
            "area_change_from_previous_step_m2": None if index == 0 else {
                key: value - results["stages"][index - 1]["areas_m2"][key]
                for key, value in stage["areas_m2"].items()
            },
        }
        for path in item["primary_metrics"]:
            metric_value(item["data"], path)
        cards.append(item)
    story = read_json("wider-water-story.json")
    if story["scenario_id"] != scenario["scenario_id"] or story["locale"] != "en":
        raise ValueError("Wider story must match the SF scenario and use English")
    if [step["id"] for step in story["steps"]] != [card["id"] for card in cards]:
        raise ValueError("Wider story must cover each milestone exactly once, in order")
    if (len(story["paths"]) != 3 or
            {path["id"] for path in story["paths"]} != {"supply", "rainfall", "wastewater"}):
        raise ValueError("Wider story must keep the three pathways distinct")
    for step, card in zip(story["steps"], cards):
        for metric in step["metrics"]:
            try:
                metric["stored_value"] = metric_value(card["data"], metric["path"])
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid wider-story metric at {step['id']}: {metric['path']}") from error
            if not math.isfinite(metric["display_multiplier"]) or metric["display_multiplier"] <= 0:
                raise ValueError("Wider-story display multiplier must be finite and positive")
            metric["display_value"] = metric["stored_value"] * metric["display_multiplier"]
            metric["stored_unit"] = (
                "m³/day" if metric["path"].startswith("operation.daily_") else
                "m³/year" if metric["path"].endswith("_year") else "m³"
            )
            metric["evidence"] = "Derived from the existing scenario assumptions; not measured site performance"
        card["wider_context"] = {"locale": "en", **step}
    return {"scenario_id": scenario["scenario_id"], "shared": copy["shared"],
            "metric_definitions": metric_definitions(), "cards": cards,
            "wider_water_story": story}


def wider_story_markdown(story, manifest):
    sources = {item["id"]: item for item in manifest["sources"]}

    def links(ids):
        return ", ".join(f"[{i}]({sources[i]['url']})" for i in ids)

    text = [f"# {story['title']}", "", story["core_message"], "",
            "English content and visualization brief for the SF scenario only. This extends the existing numerical model with qualitative regional context; it adds no city-capacity, household-shortage or downstream-impact calculation. Product implementation is separate.", "",
            "## What users see", "", story["default_presentation"], "", story["user_actions"], "",
            "## Three simple pathways", ""]
    for path in story["paths"]:
        text += [f"### {path['label']}", "", f"**Documented context:** {path['regional_context']}", "",
                 f"**Our scenario:** {path['site_assumption']}", "", f"Sources: {links(path['source_ids'])}.", ""]
    text += ["## One short story beat per milestone", "",
             "These beats accompany the existing milestone cards automatically. They do not introduce a new timeline or required interaction. All numbers below are model outputs with their original time bases.", ""]
    for step in story["steps"]:
        text += [f"### {step['id']} — {step['headline']}", "", step["default_explanation"], "",
                 f"**Simple visual:** {step['animation']}", ""]
        if step["metrics"]:
            text += ["| Modelled quantity | Value | Time basis |", "| --- | ---: | --- |"]
            for metric in step["metrics"]:
                text.append(f"| {metric['label']} | {metric['display_value']:,.1f} {metric['display_unit']} | {metric['time_basis']} |")
            text.append("")
        text += [f"Sources and mechanism references: {links(step['source_ids'])}. Numerical paths resolve to the existing scenario data, not to measurements in those sources.", ""]
    capacity = story["capacity_explainer"]
    recycled = story["local_recycled_water_context"]
    text += [f"## {capacity['question']}", "", capacity["answer"], "",
             f"**Always-visible status at Opening and Operation:** {capacity['visible_status']}", "",
             capacity["why_not_a_gauge"], "", f"Context: {links(capacity['source_ids'])}.", "",
             f"## {recycled['question']}", "", recycled["answer"], "", f"Sources: {links(recycled['source_ids'])}.", "",
             "## Visual rules for David", ""]
    text += [f"- {rule}" for rule in story["visual_rules"]]
    text += ["", "## Optional questions", ""]
    for question in story["optional_questions"]:
        text += [f"**{question['question']}**", "", question["answer"], "", f"Context: {links(question['source_ids'])}.", ""]
    text += ["## Data handoff and validation", "",
             "Edit the English `wider-water-story.json`, then run `python3 compute.py`. Metric paths resolve into each existing card's data; the generator supplies stored/display values and checks source IDs, scenario identity and seven-step coverage. Each generated card in `milestones.sk.json` includes an English `wider_context`; the complete story is also at its root `wider_water_story`. Existing Slovak card copy retains its explicit locale; the new brief and story fields are English.", "",
             "This document is generated. Verify with `python3 compute.py --check`. Refer to [README.md](README.md) for the complete scenario, [results.md](results.md) for the unchanged numerical model and [sources.json](sources.json) for provenance.", ""]
    return "\n".join(text)


def metric_definitions():
    # Stored units and display conversion are explicit; labels alone never rescale data.
    definitions = {}
    for path, label in (
        ("areas_m2.turf", "Zostávajúci pôvodný trávnik"),
        ("areas_m2.stripped_not_graded", "Odstránený trávnik pred zarovnaním"),
        ("areas_m2.bare_graded", "Pripravená holá plocha"),
        ("areas_m2.roof", "Pôdorysná plocha budov"),
    ):
        definitions[path] = {"label": label, "stored_unit": "m²", "display_unit": "ha", "display_multiplier": 0.0001, "time_basis": "stav pozemku", "evidence_label": "Predpoklad scenára"}
    for path, label, basis, evidence in (
        ("rainfall_on_parcel_m3", "Dážď na celom pozemku", "pri porovnávacom daždi", "Výpočet z merania NOAA a plochy scenára"),
        ("event.generated_surface_runoff_m3", "Vzniknutý povrchový odtok", "pri porovnávacom daždi", "Modelový výpočet"),
        ("event.roof_capture_m3", "Zachytené v pôvodne prázdnej strešnej nádrži", "pri porovnávacom daždi", "Modelový výpočet"),
        ("event.water_to_managed_drainage_m3", "Voda smerujúca do spravovaného odvodnenia", "pri porovnávacom daždi", "Modelový výpočet"),
        ("step_site_supplied_m3", "Voda dodaná na stavenisko", "spolu za tento krok", "Rozpočtový výpočet z predpokladov"),
        ("step_offsite_concrete_mixing_m3", "Voda na miešanie betónu mimo staveniska", "spolu za tento krok", "Rozpočtový výpočet z predpokladov"),
        ("operation.first_year_total_supplied_m3", "Celková dodaná voda", "prvý celý rok prevádzky", "Modelový výpočet"),
        ("no_build_baseline.annual_irrigation_supplied_m3", "Pôvodná modelová závlaha", "rok bez výstavby", "Rozpočtový predpoklad, nie meranie ihriska"),
        ("operation.irrigation_supply_reduction_m3_year", "Pokles dodanej vody na závlahu", "prvý celý rok oproti roku bez výstavby", "Výpočet zo zvolenej závlahy"),
        ("operation.net_all_source_supply_increase_m3_year", "Nárast dodanej vody zo všetkých zdrojov", "prvý celý rok oproti roku bez výstavby", "Výpočet zo zvolenej závlahy a prevádzky"),
    ):
        definitions[path] = {"label": label, "stored_unit": "m³", "display_unit": "mil. litrov", "display_multiplier": 0.001, "time_basis": basis, "evidence_label": evidence}
    for path, label in (
        ("operation.daily_average_cooling_supply_m3", "Dodaná chladiaca voda"),
        ("operation.daily_average_cooling_evaporation_m3", "Odparená chladiaca voda"),
        ("operation.daily_average_cooling_blowdown_m3", "Chladiaci odluh do splaškovej kanalizácie"),
    ):
        definitions[path] = {"label": label, "stored_unit": "m³/day", "display_unit": "litrov", "display_multiplier": 1000, "time_basis": "za priemerný prevádzkový deň", "evidence_label": "Modelový výpočet"}
    return definitions


def metric_value(data, path):
    value = data
    for key in path.split("."):
        value = value[key]
    if not isinstance(value, (int, float)):
        raise ValueError(f"Primary metric is not numeric: {path}")
    return value


def walkthrough_markdown(cards):
    shared = cards["shared"]
    text = [f"# {shared['title']}", "", shared["scenario_label"], "", shared["opening_disclosure"], "",
            f"**Porovnávací dážď:** {shared['rain_replay_label']}", "", shared["rain_replay_explanation"], "",
            "Toto je obsahový náhľad kariet, nie implementovaný prototyp. Číselné štítky a ich časový základ patria do hlavného zobrazenia.", ""]
    for card in cards["cards"]:
        text += [f"## {card['id']} — {card['title']}", "", card["what_changes"], "",
                 "| Údaj | Hodnota | Časový základ | Pôvod |", "| --- | ---: | --- | --- |"]
        for path in card["primary_metrics"]:
            definition = cards["metric_definitions"][path]
            value = metric_value(card["data"], path) * definition["display_multiplier"]
            number = (f"{value:,.0f}".replace(",", " ") if definition["display_unit"] == "litrov"
                      else f"{value:.1f}".replace(".", ","))
            text.append(f"| {definition['label']} | {number} {definition['display_unit']} | {definition['time_basis']} | {definition['evidence_label']} |")
        if card["id"] in ("M2", "M3", "M4", "M5"):
            baseline = card["data"]["baseline_generated_runoff_m3"] / 1000
            text += ["", f"Pri rovnakom daždi vzniklo na modelovom pôvodnom trávniku **{baseline:.1f} mil. litrov** povrchového odtoku. Porovnanie sa týka vzniknutého odtoku pred zachytávaním.".replace(f"{baseline:.1f}", f"{baseline:.1f}".replace(".", ","))]
        if card.get("visible_assumptions"):
            text += ["", "**Predpoklady priamo pri číslach:**", ""]
            text += [f"- {assumption}" for assumption in card["visible_assumptions"]]
        text += ["", f"**Prečo:** {card['why']}", "", f"**Čo to znamená:** {card['meaning']}", "",
                 f"**Hranica tvrdenia:** {card['uncertainty']}", "", f"*Podklad pre animáciu:* {card['animation']}", "",
                 f"Zdroje: {', '.join(card['source_ids'])}; odkazy a predpoklady sú v [registri zdrojov](sources.json) a [podkladoch](README.md).", ""]
    text += ["## Voliteľné otázky", ""]
    for question in shared["optional_questions"]:
        text += [f"**{question['question']}**", "", question["answer"], ""]
    return "\n".join(text)


def results_markdown(results):
    text = ["# Generated numerical results", "", "Reproduce with `python3 compute.py`; verify with `python3 compute.py --check`.", "",
            "All results depend on the scenario assumptions. m³ = 1,000 litres. Each rainfall replay is independent; do not sum replays across stages.", "",
            "| Step | Generated runoff, m³/event | Roof capture, m³/event | To managed drainage, m³/event | Site supply in step, m³ | Selected offsite mixing, m³ | Cumulative selected preopening supply, m³ |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for stage in results["stages"]:
        event = stage["rain_event"]
        e = ["Not quantified"] * 3 if event is None else [f"{event[k]:,.1f}" for k in ("generated_surface_runoff_m3", "roof_capture_m3", "water_to_managed_drainage_m3")]
        text.append(f"| {stage['id']} {stage['step']} | {' | '.join(e)} | {stage['step_site_supply_m3']:,.0f} | {stage['step_offsite_concrete_mixing_m3']:,.0f} | {stage['cumulative_preopening_selected_supply_m3']:,.0f} |")
    op = results["operation"]
    text += ["", "M6 site-supply step above is **preopening supply only** (zero additional construction); operating supply is below.", "",
             f"- Cooling supply: {op['daily_average_cooling_supply_m3']:,.0f} m³/average day; evaporation {op['daily_average_cooling_evaporation_m3']:,.0f}, blowdown {op['daily_average_cooling_blowdown_m3']:,.0f}.",
             f"- First-year supply: cooling {op['annual_supply_by_use_m3']['cooling']:,.0f}, domestic {op['annual_supply_by_use_m3']['domestic']:,.0f}, selected irrigation {op['annual_supply_by_use_m3']['landscape_irrigation']:,.0f}; total **{op['first_year_total_supplied_m3']:,.0f} m³**.",
             f"- No-build irrigation assumption: {op['no_build_baseline_irrigation_m3_year']:,.0f} m³/year; reduction {op['irrigation_supply_reduction_m3_year']:,.0f}; net all-source supplied increase **{op['net_all_source_supply_increase_m3_year']:,.0f} m³/year**. Net potable change: unknown (irrigation source shares unverified).",
             "- Initial cooling/fire fills are preopening stocks, not repeated annual consumption.",
             "- Annual rainfall is climate context only; no annual runoff or tank-reliability result is generated.", "",
             "## Soil-group sensitivity (generated runoff before tank capture)", "",
             "| Step | A, m³/event | B, m³/event | C, m³/event | D, m³/event |", "| --- | ---: | ---: | ---: | ---: |"]
    for stage in results["stages"]:
        if stage["rain_event"] is not None:
            text.append(f"| {stage['id']} | " + " | ".join(f"{stage['soil_group_sensitivity'][g]:,.1f}" for g in ("A", "B", "C", "D")) + " |")
    text += ["", "Sensitivity is a set of alternative soil assumptions, not a confidence interval or proof of the actual site's soil.", ""]
    return "\n".join(text)


if __name__ == "__main__":
    main()
