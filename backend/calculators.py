"""
EngiBot Deterministic Calculation Engine
Pure Python numerical calculations for engineering branches. Zero LLM hallucination.
"""

import math
from typing import Dict, Any, List

def calculate_beam_bending(
    beam_type: str, 
    load_type: str, 
    span_m: float, 
    load_val: float, 
    load_pos_m: float = 0.0
) -> Dict[str, Any]:
    """
    Civil Engineering: Beam Bending & Shear Force Calculator.
    beam_type: 'ssb' (Simply Supported) or 'cantilever'
    load_type: 'point' (Concentrated load in kN) or 'udl' (Uniformly Distributed Load in kN/m)
    span_m: Span length in meters (L)
    load_val: Load value (kN for point, kN/m for UDL)
    load_pos_m: Distance from left support for point load (meters). Defaults to midspan if 0 or outside.
    """
    if span_m <= 0:
        raise ValueError("Span length must be positive.")
    if load_val <= 0:
        raise ValueError("Load value must be positive.")

    beam_type = beam_type.lower()
    load_type = load_type.lower()

    if beam_type == "ssb":
        if load_type == "point":
            a = load_pos_m if (0 < load_pos_m < span_m) else (span_m / 2.0)
            b = span_m - a
            ra = (load_val * b) / span_m
            rb = (load_val * a) / span_m
            max_moment = (load_val * a * b) / span_m
            max_shear = max(ra, rb)
            formula_m = "M_max = (P * a * b) / L" if a != b else "M_max = (P * L) / 4"
            formula_v = "V_max = max(R_A, R_B)"
            crit_loc = a
        else:  # UDL
            ra = (load_val * span_m) / 2.0
            rb = ra
            max_moment = (load_val * (span_m ** 2)) / 8.0
            max_shear = ra
            formula_m = "M_max = (w * L^2) / 8"
            formula_v = "V_max = (w * L) / 2"
            crit_loc = span_m / 2.0

        title = f"Simply Supported Beam ({load_type.upper()})"
    elif beam_type == "cantilever":
        if load_type == "point":
            ra = load_val
            rb = 0.0
            max_moment = load_val * span_m
            max_shear = load_val
            formula_m = "M_max = P * L (at fixed support)"
            formula_v = "V_max = P"
            crit_loc = 0.0
        else:  # UDL
            ra = load_val * span_m
            rb = 0.0
            max_moment = (load_val * (span_m ** 2)) / 2.0
            max_shear = ra
            formula_m = "M_max = (w * L^2) / 2 (at fixed support)"
            formula_v = "V_max = w * L"
            crit_loc = 0.0
        title = f"Cantilever Beam ({load_type.upper()})"
    else:
        raise ValueError(f"Unsupported beam type: {beam_type}. Use 'ssb' or 'cantilever'.")

    return {
        "calculator": "beam_bending",
        "title": title,
        "standard_cited": "IS 456:2000 Cl. 22 / IS 800:2007 (Limit State Structural Design)",
        "inputs": {
            "beam_type": beam_type,
            "load_type": load_type,
            "span_m": span_m,
            "load_val": load_val,
            "load_pos_m": load_pos_m
        },
        "assumptions": [
            "Prismatic beam cross-section with constant flexural rigidity (EI)",
            "Self-weight of beam neglected (add to load_val if required)",
            "Small deflection Euler-Bernoulli linear elastic beam theory"
        ],
        "results": {
            "reaction_A_kN": round(ra, 3),
            "reaction_B_kN": round(rb, 3),
            "max_shear_force_kN": round(max_shear, 3),
            "max_bending_moment_kNm": round(max_moment, 3),
            "critical_section_m": round(crit_loc, 3),
            "moment_formula": formula_m,
            "shear_formula": formula_v
        },
        "units": "Span: m | Load: kN or kN/m | Shear: kN | Moment: kN*m",
        "safety_disclaimer": "⚠️ SAFETY NOTICE: Preliminary structural assessment only. Verification by a licensed structural engineer is required for rebar detailing."
    }

def calculate_cable_sizing(
    power_kw: float,
    voltage_v: float,
    length_m: float,
    power_factor: float = 0.85,
    is_three_phase: bool = True,
    conductor: str = "aluminum",
    insulation: str = "xlpe",
    max_drop_pct: float = 3.0
) -> Dict[str, Any]:
    """
    Electrical (EEE): Cable Sizing & Voltage Drop Calculator.
    power_kw: Load power in kW
    voltage_v: System line-to-line voltage in Volts (e.g. 415V for 3-phase, 230V for 1-phase)
    length_m: One-way cable run length in meters
    conductor: 'copper' or 'aluminum'
    insulation: 'xlpe' (90°C) or 'pvc' (70°C)
    """
    if power_kw <= 0 or voltage_v <= 0 or length_m <= 0:
        raise ValueError("Power, voltage, and length must be positive numbers.")
    if not (0.5 <= power_factor <= 1.0):
        power_factor = 0.85

    # 1. Full load current
    if is_three_phase:
        flc = (power_kw * 1000.0) / (math.sqrt(3) * voltage_v * power_factor)
    else:
        flc = (power_kw * 1000.0) / (voltage_v * power_factor)

    # 2. Design current with safety margin (1.25x for motor/continuous load)
    design_current = flc * 1.25

    # 3. Standard sizes and approximate air ampacity ratings (IS 7098 Table 3 & IEC 60364-5-52)
    # Sizes in sq.mm
    standard_sizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400]
    
    # Base resistivity ohm*mm^2/m at 20°C
    rho = 0.0175 if conductor.lower() == "copper" else 0.0282
    temp_factor = 1.28 if insulation.lower() == "xlpe" else 1.20 # Account for operating temp rise
    rho_eff = rho * temp_factor

    # Select minimum size by ampacity
    # Approximate current carrying capacity rule of thumb for standard XLPE cables
    ampacity_table = {
        "copper": {1.5: 18, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 269, 150: 300, 185: 341, 240: 400, 300: 456, 400: 521},
        "aluminum": {1.5: 14, 2.5: 18, 4: 25, 6: 32, 10: 44, 16: 59, 25: 78, 35: 96, 50: 117, 70: 150, 95: 183, 120: 212, 150: 238, 185: 272, 240: 321, 300: 368, 400: 424}
    }
    
    cond_key = "copper" if conductor.lower() == "copper" else "aluminum"
    ratings = ampacity_table[cond_key]

    selected_size = None
    selected_drop_v = 0.0
    selected_drop_pct = 0.0

    sin_phi = math.sqrt(max(0.0, 1.0 - (power_factor ** 2)))

    for size in standard_sizes:
        amp = ratings.get(size, 0)
        if amp >= design_current:
            # Check voltage drop
            r_per_km = (rho_eff / size) * 1000.0  # ohm/km
            x_per_km = 0.08  # approx reactance ohm/km for multicore cable
            z_eff = (r_per_km * power_factor) + (x_per_km * sin_phi)
            
            if is_three_phase:
                v_drop = math.sqrt(3) * flc * (length_m / 1000.0) * z_eff
            else:
                v_drop = 2.0 * flc * (length_m / 1000.0) * z_eff
            
            drop_pct = (v_drop / voltage_v) * 100.0
            
            if drop_pct <= max_drop_pct:
                selected_size = size
                selected_drop_v = v_drop
                selected_drop_pct = drop_pct
                break

    if selected_size is None:
        # Fallback to largest size
        selected_size = standard_sizes[-1]
        r_per_km = (rho_eff / selected_size) * 1000.0
        x_per_km = 0.08
        z_eff = (r_per_km * power_factor) + (x_per_km * sin_phi)
        v_drop = (math.sqrt(3) if is_three_phase else 2.0) * flc * (length_m / 1000.0) * z_eff
        selected_drop_v = v_drop
        selected_drop_pct = (v_drop / voltage_v) * 100.0

    is_compliant = selected_drop_pct <= max_drop_pct

    return {
        "calculator": "cable_sizing",
        "title": f"Cable Sizing & Voltage Drop ({'3-Phase' if is_three_phase else '1-Phase'}, {conductor.title()} {insulation.upper()})",
        "standard_cited": "IS 7098 (Part 1/2) / IS 1255 / IEC 60364-5-52 / NEC Table 310.16",
        "inputs": {
            "power_kw": power_kw,
            "voltage_v": voltage_v,
            "length_m": length_m,
            "power_factor": power_factor,
            "phase": "3-Phase" if is_three_phase else "1-Phase",
            "conductor": conductor.upper(),
            "insulation": insulation.upper(),
            "max_drop_allowable_pct": max_drop_pct
        },
        "assumptions": [
            f"Conductor operating temperature: {'90°C (XLPE)' if insulation.lower() == 'xlpe' else '70°C (PVC)'}",
            "Installation in perforated cable tray / air with ambient temperature 40°C",
            "Continuous motor/industrial load factor = 1.25x FLC"
        ],
        "results": {
            "full_load_current_A": round(flc, 2),
            "design_current_A": round(design_current, 2),
            "recommended_cable_size_sqmm": selected_size,
            "voltage_drop_V": round(selected_drop_v, 2),
            "voltage_drop_pct": round(selected_drop_pct, 2),
            "max_allowable_drop_pct": max_drop_pct,
            "status": "PASS (COMPLIANT)" if is_compliant else "WARNING (EXCEEDS PERMISSIBLE DROP)"
        },
        "units": "Current: A | Length: m | Cable Area: sq.mm | Voltage Drop: V (%)",
        "safety_disclaimer": "⚠️ SAFETY NOTICE: Field conditions (grouping de-rating, soil thermal resistivity, short-circuit withstand) must be verified by a licensed electrical engineer."
    }

def calculate_circuit_analysis(
    circuit_mode: str,
    resistance_ohms: float,
    inductance_mh: float = 0.0,
    capacitance_uf: float = 0.0,
    frequency_hz: float = 50.0,
    voltage_v: float = 230.0
) -> Dict[str, Any]:
    """
    Electronics & ECE: DC & AC RLC Circuit Solver.
    circuit_mode: 'series_rlc', 'parallel_rlc', 'ohms_dc', 'voltage_divider'
    """
    mode = circuit_mode.lower()
    res = {}

    if mode == "ohms_dc":
        if resistance_ohms <= 0:
            raise ValueError("Resistance must be greater than zero.")
        i = voltage_v / resistance_ohms
        p = voltage_v * i
        res = {
            "current_A": round(i, 4),
            "power_W": round(p, 3),
            "resistance_ohms": resistance_ohms,
            "voltage_V": voltage_v,
            "formula": "I = V / R; P = V * I = I^2 * R"
        }
        title = "DC Ohm's Law & Power Solver"

    elif mode in ("series_rlc", "parallel_rlc"):
        f = max(0.1, frequency_hz)
        omega = 2.0 * math.pi * f
        l_h = (inductance_mh or 0.0) / 1000.0
        c_f = (capacitance_uf or 0.0) / 1000000.0

        xl = omega * l_h if l_h > 0 else 0.0
        xc = (1.0 / (omega * c_f)) if (c_f > 0 and omega > 0) else 0.0

        f_res = (1.0 / (2.0 * math.pi * math.sqrt(l_h * c_f))) if (l_h > 0 and c_f > 0) else 0.0
        q_factor = ((1.0 / resistance_ohms) * math.sqrt(l_h / c_f)) if (l_h > 0 and c_f > 0 and resistance_ohms > 0) else 0.0

        if mode == "series_rlc":
            x_net = xl - xc
            z = math.sqrt((resistance_ohms ** 2) + (x_net ** 2))
            phase_rad = math.atan2(x_net, resistance_ohms)
            phase_deg = math.degrees(phase_rad)
            i_rms = (voltage_v / z) if z > 0 else 0.0
            p_active = voltage_v * i_rms * math.cos(phase_rad)
            title = "AC Series RLC Circuit Analyzer"
        else: # parallel
            y_r = 1.0 / resistance_ohms if resistance_ohms > 0 else 0.0
            y_l = (1.0 / xl) if xl > 0 else 0.0
            y_c = (1.0 / xc) if xc > 0 else 0.0
            b_net = y_c - y_l
            y = math.sqrt((y_r ** 2) + (b_net ** 2))
            z = (1.0 / y) if y > 0 else 0.0
            phase_rad = math.atan2(b_net, y_r)
            phase_deg = math.degrees(phase_rad)
            i_rms = voltage_v * y
            p_active = voltage_v * i_rms * math.cos(phase_rad)
            title = "AC Parallel RLC Circuit Analyzer"

        res = {
            "frequency_Hz": f,
            "inductive_reactance_Xl_ohms": round(xl, 3),
            "capacitive_reactance_Xc_ohms": round(xc, 3),
            "total_impedance_Z_ohms": round(z, 3),
            "current_I_rms_A": round(i_rms, 4),
            "phase_angle_deg": round(phase_deg, 2),
            "resonant_frequency_Hz": round(f_res, 2),
            "quality_factor_Q": round(q_factor, 2),
            "active_power_W": round(p_active, 3),
            "power_factor": round(math.cos(phase_rad), 3)
        }
    else:
        raise ValueError(f"Unsupported mode: {circuit_mode}")

    return {
        "calculator": "circuit_analysis",
        "title": title,
        "standard_cited": "IEEE Standard Circuit Theory & Kirchhoff's Laws (KVL/KCL)",
        "inputs": {
            "mode": mode,
            "resistance_ohms": resistance_ohms,
            "inductance_mh": inductance_mh,
            "capacitance_uf": capacitance_uf,
            "frequency_hz": frequency_hz,
            "voltage_v": voltage_v
        },
        "results": res,
        "units": "Resistance/Impedance: Ohm | Inductance: mH | Capacitance: uF | Current: A | Power: W",
        "safety_disclaimer": "⚠️ SAFETY NOTICE: Electronic prototyping formulas. High-voltage AC circuits require isolation and safety interlocks."
    }

def calculate_algo_complexity(
    algorithm: str,
    raw_array: List[int]
) -> Dict[str, Any]:
    """
    CSE: Algorithm Step-by-Step Visualizer & Big-O Profiler.
    Supported: 'bubble_sort', 'selection_sort', 'insertion_sort'
    """
    algo = algorithm.lower().strip()
    arr = list(raw_array[:12]) # limit to 12 items for clean trace
    n = len(arr)

    comparisons = 0
    swaps = 0
    traces = []

    if algo == "bubble_sort":
        temp = list(arr)
        traces.append(f"Initial State: {temp}")
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                comparisons += 1
                if temp[j] > temp[j + 1]:
                    temp[j], temp[j + 1] = temp[j + 1], temp[j]
                    swaps += 1
                    swapped = True
            traces.append(f"Pass {i + 1}: {temp}")
            if not swapped:
                break
        big_o = {"best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)", "space": "O(1)"}
        title = "Bubble Sort Visualizer"

    elif algo == "selection_sort":
        temp = list(arr)
        traces.append(f"Initial State: {temp}")
        for i in range(n):
            min_idx = i
            for j in range(i + 1, n):
                comparisons += 1
                if temp[j] < temp[min_idx]:
                    min_idx = j
            if min_idx != i:
                temp[i], temp[min_idx] = temp[min_idx], temp[i]
                swaps += 1
            traces.append(f"Pass {i + 1} (min={temp[i]}): {temp}")
        big_o = {"best": "O(n^2)", "average": "O(n^2)", "worst": "O(n^2)", "space": "O(1)"}
        title = "Selection Sort Visualizer"

    elif algo == "insertion_sort":
        temp = list(arr)
        traces.append(f"Initial State: {temp}")
        for i in range(1, n):
            key = temp[i]
            j = i - 1
            while j >= 0:
                comparisons += 1
                if temp[j] > key:
                    temp[j + 1] = temp[j]
                    swaps += 1
                    j -= 1
                else:
                    break
            temp[j + 1] = key
            traces.append(f"Step {i} (insert {key}): {temp}")
        big_o = {"best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)", "space": "O(1)"}
        title = "Insertion Sort Visualizer"
    else:
        raise ValueError(f"Algorithm '{algorithm}' not supported for step trace.")

    return {
        "calculator": "algo_complexity",
        "title": title,
        "standard_cited": "Cormen, Leiserson, Rivest, Stein (CLRS) - Introduction to Algorithms",
        "inputs": {"algorithm": algo, "input_array": arr, "size": n},
        "results": {
            "sorted_array": temp,
            "total_comparisons": comparisons,
            "total_swaps_shifts": swaps,
            "complexity": big_o,
            "step_by_step_trace": traces
        }
    }

def calculate_stress_strain(
    force_kn: float,
    shape: str,
    dim1_mm: float,
    dim2_mm: float = 0.0,
    orig_length_m: float = 1.0,
    delta_l_mm: float = 0.0,
    yield_strength_mpa: float = 250.0
) -> Dict[str, Any]:
    """
    Mechanical Engineering: Tensile Stress, Strain & Factor of Safety Calculator.
    shape: 'circular' (dim1 = diameter) or 'rectangular' (dim1 = width, dim2 = thickness)
    """
    if force_kn <= 0 or dim1_mm <= 0 or orig_length_m <= 0:
        raise ValueError("Force, dimensions, and length must be positive.")

    # Cross sectional area
    if shape.lower() == "circular":
        area_mm2 = (math.pi * (dim1_mm ** 2)) / 4.0
    else:
        if dim2_mm <= 0:
            raise ValueError("Rectangular shape requires thickness (dim2).")
        area_mm2 = dim1_mm * dim2_mm

    force_n = force_kn * 1000.0
    stress_mpa = force_n / area_mm2

    strain = (delta_l_mm / (orig_length_m * 1000.0)) if delta_l_mm > 0 else 0.0
    youngs_modulus_gpa = ((stress_mpa / strain) / 1000.0) if strain > 0 else 0.0

    fos = (yield_strength_mpa / stress_mpa) if stress_mpa > 0 else 0.0
    is_safe = fos >= 1.5

    return {
        "calculator": "stress_strain",
        "title": f"Tensile Stress-Strain & Safety Factor ({shape.title()})",
        "standard_cited": "ASME Sec VIII / ASTM E8 / IS 2062 (Steel Standards)",
        "inputs": {
            "force_kn": force_kn,
            "shape": shape,
            "dim1_mm": dim1_mm,
            "dim2_mm": dim2_mm,
            "orig_length_m": orig_length_m,
            "delta_l_mm": delta_l_mm,
            "yield_strength_mpa": yield_strength_mpa
        },
        "results": {
            "area_mm2": round(area_mm2, 2),
            "stress_MPa": round(stress_mpa, 2),
            "strain": round(strain, 6) if strain > 0 else "Not evaluated (delta_l omitted)",
            "youngs_modulus_GPa": round(youngs_modulus_gpa, 2) if youngs_modulus_gpa > 0 else "N/A",
            "factor_of_safety": round(fos, 2),
            "safety_verdict": "SAFE (FOS >= 1.5)" if is_safe else "UNSAFE / HIGH RISK (FOS < 1.5)"
        },
        "units": "Force: kN | Stress: MPa (N/mm^2) | Strain: dimensionless | E: GPa",
        "safety_disclaimer": "⚠️ SAFETY NOTICE: Static uniaxial tensile evaluation only. Dynamic impact, fatigue, and stress concentration (Kt) must be assessed by a licensed mechanical engineer."
    }

def calculate_unit_conversion(
    category: str,
    value: float,
    from_unit: str,
    to_unit: str
) -> Dict[str, Any]:
    """
    General Engineering: High-Precision Engineering Unit Converter.
    Categories: force, pressure, energy, power, length
    """
    cat = category.lower().strip()
    f_u = from_unit.lower().strip()
    t_u = to_unit.lower().strip()

    # Normalization tables to SI Base
    tables = {
        "force": { # base: N
            "n": 1.0, "kn": 1000.0, "mn": 1000000.0,
            "lbf": 4.44822, "kgf": 9.80665, "dyne": 0.00001
        },
        "pressure": { # base: Pa (N/m^2)
            "pa": 1.0, "kpa": 1000.0, "mpa": 1000000.0, "gpa": 1000000000.0,
            "bar": 100000.0, "psi": 6894.76, "n/mm2": 1000000.0, "kgf/cm2": 98066.5,
            "atm": 101325.0
        },
        "energy": { # base: Joules (J)
            "j": 1.0, "kj": 1000.0, "mj": 1000000.0, "kwh": 3600000.0,
            "cal": 4.184, "kcal": 4184.0, "btu": 1055.06, "ev": 1.60218e-19
        },
        "power": { # base: Watts (W)
            "w": 1.0, "kw": 1000.0, "mw": 1000000.0, "hp": 745.7, "btu/hr": 0.293071
        },
        "length": { # base: meters (m)
            "m": 1.0, "mm": 0.001, "cm": 0.01, "km": 1000.0,
            "in": 0.0254, "ft": 0.3048, "yd": 0.9144, "mile": 1609.34
        }
    }

    if cat not in tables:
        raise ValueError(f"Category '{category}' not supported. Choose from: {list(tables.keys())}")

    mapping = tables[cat]
    if f_u not in mapping:
        raise ValueError(f"Unknown unit '{from_unit}' for {category}.")
    if t_u not in mapping:
        raise ValueError(f"Unknown unit '{to_unit}' for {category}.")

    # Convert to base, then to target
    base_val = value * mapping[f_u]
    converted_val = base_val / mapping[t_u]

    dim_formulas = {
        "force": "M * L * T^-2",
        "pressure": "M * L^-1 * T^-2",
        "energy": "M * L^2 * T^-2",
        "power": "M * L^2 * T^-3",
        "length": "L"
    }

    return {
        "calculator": "unit_converter",
        "title": f"Unit Conversion: {category.title()}",
        "inputs": {"value": value, "from_unit": from_unit, "to_unit": to_unit, "category": category},
        "results": {
            "converted_value": round(converted_val, 6),
            "conversion_factor": round(mapping[f_u] / mapping[t_u], 8),
            "dimensional_formula": dim_formulas.get(cat, "")
        }
    }

