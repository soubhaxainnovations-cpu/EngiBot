"""
EngiBot System Prompts Module
Composites Master Protocol, Branch Technical Directives, Mode Directives, User Context,
and Branch Domain Boundary & Scope Enforcement.
"""
import re
from typing import Optional, Dict, Any

DISCIPLINE_METADATA = {
    "cse": {
        "id": "cse",
        "name": "Computer Science & Engineering (CSE)",
        "icon": "Cpu",
        "scope": "Programming, Algorithms, Data Structures, Web/App Development, Operating Systems, Computer Networks, DBMS/SQL, Artificial Intelligence, Machine Learning, Cloud Computing, Cybersecurity, Software Architecture",
        "examples": "Algorithms, Data Structures, Python/Java/C++, System Design, SQL Queries, OS concepts, Networking, or AI/ML"
    },
    "civil": {
        "id": "civil",
        "name": "Civil & Structural Engineering",
        "icon": "HardHat",
        "scope": "Structural Analysis, Concrete Technology, RCC & Steel Design, Geotechnical & Foundation Engineering, Surveying, Transportation, Fluid Mechanics, Environmental Engineering, Building Codes (IS 456, IS 800, IS 1893)",
        "examples": "RCC beam/slab design, IS 456:2000 calculations, bending moments & shear forces, concrete slump & mix design, soil bearing capacity, or surveying"
    },
    "mech": {
        "id": "mech",
        "name": "Mechanical Engineering",
        "icon": "Wrench",
        "scope": "Strength of Materials, Thermodynamics, Heat & Mass Transfer, Fluid Mechanics, Theory of Machines, Machine Design, Manufacturing & CNC Machining, Automobile Systems, HVAC, Material Science, ASME codes",
        "examples": "Thermodynamics cycles (Carnot, Otto, Rankine), Strength of Materials (bending stress, shear, torsion), Heat Transfer, Fluid Mechanics, or Machine Design"
    },
    "eee": {
        "id": "eee",
        "name": "Electrical Engineering & Power Systems",
        "icon": "Zap",
        "scope": "Electrical Machines, Power Systems, Transmission & Distribution, Control Systems, Power Electronics, Industrial Wiring, Switchgear & Protection, IS 7098, IEC 60364",
        "examples": "Transformers, 3-Phase induction motors, power transmission & voltage drop, cable sizing (IS 7098), power factor correction, or control systems"
    },
    "ece": {
        "id": "ece",
        "name": "Electronics & Communication Engineering (ECE)",
        "icon": "Radio",
        "scope": "Analog & Digital Electronics, Semiconductor Devices, Microprocessors & Microcontrollers (8051, ARM, ESP32, Arduino), Signals & Systems, Communication Systems, RF & Antennas, VLSI Design",
        "examples": "Op-Amp circuits, BJT/MOSFET transistor biasing, 8051/ARM/ESP32 microcontrollers, digital logic & K-maps, signals & systems, or modulation theory"
    },
    "general": {
        "id": "general",
        "name": "General Engineering & Basic Sciences",
        "icon": "MessageSquare",
        "scope": "First-year foundational Engineering Physics, Chemistry, Engineering Mathematics (Calculus, Linear Algebra, ODEs), Engineering Graphics/Drawing, Basic Mechanics",
        "examples": "Engineering Mathematics (calculus, matrices, ODEs), Engineering Physics, Engineering Chemistry, Engineering Graphics, or Basic Statics"
    }
}

# Regex indicators for cross-branch technical questions
BRANCH_INDICATORS = {
    "civil": [
        r"\brcc\b", r"\bis\s*456\b", r"\bis\s*800\b", r"\bis\s*1893\b",
        r"\bconcrete\b", r"\bcement\b", r"\bslump\s*test\b", r"\bcompressive\s*strength\b",
        r"\bm15\b", r"\bm20\b", r"\bm25\b", r"\bm30\b", r"\bm35\b", r"\bm40\b",
        r"\breinforcement\s*bar\b", r"\brebar\b", r"\bbending\s*moment\b", r"\bshear\s*force\b",
        r"\bsfd\b", r"\bbmd\b", r"\bsoil\s*mechanics\b", r"\bbearing\s*capacity\b",
        r"\bterzaghi\b", r"\bshallow\s*foundation\b", r"\bdeep\s*foundation\b",
        r"\bsurveying\b", r"\btheodolite\b", r"\btotal\s*station\b", r"\blevelling\b",
        r"\bretaining\s*wall\b", r"\bcantilever\s*beam\b", r"\btruss\s*analysis\b",
        r"\bpavement\s*design\b", r"\bcbr\s*test\b", r"\bbitumen\b", r"\bsewage\s*treatment\b",
        r"\bhydrology\b", r"\bcatchment\s*area\b", r"\blimit\s*state\s*method\b",
        r"\bcharacteristic\s*strength\s*of\s*concrete\b", r"\bwater[-\s]*cement\s*ratio\b"
    ],
    "cse": [
        r"\bpython\b", r"\bjavascript\b", r"\btypescript\b", r"\breact\b", r"\bangular\b",
        r"\bnode\.?js\b", r"\bjava\b", r"\bc\+\+\b", r"\bsql\b", r"\bdatabase\s*design\b",
        r"\b1nf\b", r"\b2nf\b", r"\b3nf\b", r"\bbcnf\b", r"\bbinary\s*search\s*tree\b",
        r"\blinked\s*list\b", r"\bdijkstra\b", r"\bdynamic\s*programming\b",
        r"\btime\s*complexity\b", r"\bbig[-\s]*o\b", r"\bmerge\s*sort\b", r"\bquick\s*sort\b",
        r"\boperating\s*system\b", r"\bdeadlock\b", r"\bsemaphore\b", r"\bpaging\b",
        r"\bvirtual\s*memory\b", r"\btcp\s*/\s*ip\b", r"\brest\s*api\b", r"\bdocker\b",
        r"\bkubernetes\b", r"\bmachine\s*learning\b", r"\bneural\s*network\b", r"\bcnn\b",
        r"\btransformer\s*model\b", r"\bllm\b", r"\bweb\s*development\b", r"\bhash\s*table\b",
        r"\bdepth\s*first\s*search\b", r"\bbreadth\s*first\s*search\b"
    ],
    "mech": [
        r"\bcarnot\s*cycle\b", r"\brankine\s*cycle\b", r"\botto\s*cycle\b", r"\bdiesel\s*cycle\b",
        r"\bbrayton\s*cycle\b", r"\bsteam\s*table\b", r"\bboiler\b", r"\brefrigeration\b",
        r"\bcop\s*of\s*refrigerat\w*", r"\bhvac\b", r"\bpsychrometric\b", r"\bheat\s*exchanger\b",
        r"\blmtd\b", r"\bnusselt\s*number\b", r"\blathe\s*machine\b", r"\bmilling\s*cutter\b",
        r"\bcnc\s*machining\b", r"\bturning\s*operation\b", r"\btaylor\s*tool\s*life\b",
        r"\bspur\s*gear\b", r"\bhelical\s*gear\b", r"\bcam\s*and\s*follower\b", r"\bflywheel\b",
        r"\basme\s*section\s*viii\b", r"\bic\s*engine\b", r"\bair\s*standard\s*efficiency\b",
        r"\bpressure\s*vessel\s*shell\b", r"\blewis\s*equation\b", r"\bco-efficient\s*of\s*performance\b"
    ],
    "eee": [
        r"\b3[-\s]*phase\s*transformer\b", r"\binduction\s*motor\b", r"\bsynchronous\s*generator\b",
        r"\balternator\b", r"\btransmission\s*line\b", r"\bsubstation\b", r"\bswitchgear\b",
        r"\bcircuit\s*breaker\b", r"\bbusbar\b", r"\bsymmetrical\s*components\b",
        r"\bis\s*7098\b", r"\bis\s*694\b", r"\bcable\s*sizing\b", r"\bpower\s*factor\s*correction\b",
        r"\bcapacitor\s*bank\b", r"\bieee\s*519\b", r"\bharmonics\s*thd\b",
        r"\bbuck\s*converter\b", r"\bboost\s*converter\b", r"\bneutral\s*grounding\b",
        r"\bper\s*unit\s*system\b", r"\bload\s*flow\s*analysis\b", r"\bgap\s*flashover\b"
    ],
    "ece": [
        r"\bop[-\s]*amp\b", r"\b741\s*op[-\s]*amp\b", r"\b555\s*timer\b", r"\bzener\s*diode\b",
        r"\bbjt\s*biasing\b", r"\bmosfet\s*amplifier\b", r"\bk[-\s]*map\b", r"\bflip[-\s]*flop\b",
        r"\b8085\b", r"\b8086\b", r"\b8051\b", r"\barm\s*cortex\b", r"\besp32\b",
        r"\barduino\b", r"\bembedded\s*c\b", r"\buart\b", r"\bspi\b", r"\bi2c\b",
        r"\bnyquist\s*rate\b", r"\bsampling\s*theorem\b", r"\bam\s*modulation\b",
        r"\bfm\s*modulation\b", r"\bantenna\s*radiation\b", r"\bvlsi\b", r"\bverilog\b", r"\bvhdl\b",
        r"\bcarrier\s*frequency\b", r"\bbw\s*of\s*fm\b", r"\bs-parameters\b"
    ]
}

def detect_branch_mismatch(message: str, current_discipline: str) -> Optional[Dict[str, Any]]:
    """
    Checks if a user message in the current discipline clearly belongs to another engineering branch.
    Returns mismatch details if a violation is detected, or None if the query is in-scope.
    """
    curr = current_discipline.lower().strip()
    if curr == "general":
        # General Engineering can answer fundamental first-year inquiries
        return None

    text = message.lower()
    
    # Priority check against other branches
    for branch_key, patterns in BRANCH_INDICATORS.items():
        if branch_key == curr:
            continue
        
        matched_clues = []
        for pat in patterns:
            if re.search(pat, text):
                matched_clues.append(pat)
        
        if matched_clues:
            target_meta = DISCIPLINE_METADATA.get(branch_key, {})
            current_meta = DISCIPLINE_METADATA.get(curr, {})
            return {
                "current_discipline": curr,
                "current_name": current_meta.get("name", curr.upper()),
                "target_discipline": branch_key,
                "target_name": target_meta.get("name", branch_key.upper()),
                "target_examples": target_meta.get("examples", ""),
                "current_examples": current_meta.get("examples", ""),
                "matched_clues": matched_clues
            }

    return None

def format_branch_mismatch_response(mismatch_info: Dict[str, Any]) -> str:
    """
    Formats a polite, instructive branch boundary notice guiding the user to switch branch.
    """
    curr_name = mismatch_info["current_name"]
    target_name = mismatch_info["target_name"]
    target_disc = mismatch_info["target_discipline"]
    curr_examples = mismatch_info.get("current_examples", "")

    return f"""### ⚠️ Branch Boundary Notice

You are currently interacting with the **{curr_name}** Expert.
This question belongs to the **{target_name}** discipline.

#### Why this boundary is enforced:
EngiBot enforces strict engineering domain specialization to ensure all calculations, regulatory code standards (such as **IS 456**, **IS 800**, **IEEE**, or **ASME**), and technical methodologies are applied with 100% disciplinary accuracy.

#### How to get the solution:
1. Click **Switch Branch** in the header or in your user profile and select **{target_name}**.
2. Once switched, ask your question to the **{target_name} Expert** to receive the complete worked solution, governing standards, and formula verification.

*Feel free to ask any question related to **{curr_name}** here ({curr_examples})!*"""

MASTER_PROTOCOL = """You are EngiBot, the premier AI engineering assistant designed for university engineering students and practicing field engineers.

### CORE OPERATING PRINCIPLES:
1. QUANTITATIVE ACCURACY & UNIT DISCIPLINE:
   - Always state explicit physical units for every numerical value (e.g., kN, MPa, mm, kW, A, V, rad/s).
   - Check dimensional homogeneity in all formulas before evaluating.
   - Do not perform probabilistic arithmetic approximations; if a verified code calculation is supplied in the context, treat it as ground truth.

2. STANDARDS & CITATIONS INTEGRITY:
   - When citing engineering standards (IS 456, IS 800, NEC, IEC, IEEE, ASME, ASTM), quote the exact standard code and clause where known.
   - NEVER invent or hallucinate clause numbers or table references. If a clause number is uncertain, state: "Refer to general provisions of [Standard Name]; exact clause must be verified in standard handbook."

3. SAFETY-CRITICAL MANDATORY DISCLAIMER:
   - For all structural designs, electrical installations, pressure vessels, foundation load-bearing checks, or life-safety systems, include this exact notice:
     "⚠️ SAFETY NOTICE: This calculation is for educational and preliminary engineering assessment only. Final construction/fabrication designs must be validated and stamped by a licensed Professional Engineer (PE / Chartered Engineer)."

4. SINGLE CLARIFYING QUESTION PROTOCOL:
   - If a numerical problem is underspecified (missing voltage, span length, soil bearing capacity, material grade, or power factor), ask ONE targeted clarifying question with the most common industry default assumptions clearly stated so the user can immediately proceed if they agree.

5. MULTILINGUAL INSTRUCTION:
   - You natively support English, Hindi (हिन्दी), Odia (ଓଡ଼ିଆ), and Telugu (తెలుగు).
   - If the user writes or requests answers in Hindi, Odia, or Telugu, respond naturally in that language while keeping standard engineering symbols, unit abbreviations (kN, mm, V, kW), and code designations (IS 456, IEEE 519) in Latin script for technical accuracy.
"""

LEARN_MODE_DIRECTIVE = """
[ACTIVE MODE: LEARN MODE]
Target Audience: Engineering Student / Learner.
Objective: Build deep conceptual clarity, first-principles intuition, and exam mastery.

RESPONSE STRUCTURE:
1. Conceptual Definition: Explain the physical meaning and relevance in engineering practice using an intuitive analogy.
2. Governing Equations: Display the mathematical equation using KaTeX ($...$ or $$...$$), defining all variables and their SI units.
3. Step-by-Step Worked Solution:
   - Step 1: List Given Data with Units.
   - Step 2: List Stated Assumptions (e.g., steady-state, linear elastic, neglected self-weight).
   - Step 3: Show intermediate algebraic substitution (never jump straight from equation to final number).
   - Step 4: Final answer highlighted with units and appropriate significant figures.
4. University Exam / Viva Tip: Highlight a common mistake made by students in semester exams (e.g., forgetting de-rating factors, mixing mm with meters, sign convention errors).
5. Quick Check Concept Question: Conclude with ONE multiple-choice or short conceptual question to reinforce the topic.
"""

WORK_MODE_DIRECTIVE = """
[ACTIVE MODE: WORK MODE]
Target Audience: Field Engineer / Consultant / Site Supervisor.
Objective: Rapid, actionable, standards-compliant decision support with zero conversational fluff.

RESPONSE STRUCTURE:
1. Executive Output Block:
   ```
   [RESULT]: <Primary metric and design verdict>
   [GOVERNING CODES]: <IS / IEC / IEEE / ASME code and clause reference>
   [ASSUMPTIONS]: <List key boundary conditions, ambient temperatures, material grades>
   ```
2. Calculation & Formula Verification:
   - State the exact formula used.
   - Provide the substitution line and final value with units.
3. Design Verification Table:
   - Table containing: Parameter | Calculated Value | Permissible Limit / Standard Rule | Status (Pass / Fail / Warning)
4. Field Precautions & Inspection Checks:
   - Bullet points covering installation precautions, tolerances, or safety clearances.
5. Mandatory Safety Disclaimer.
"""

BRANCH_PROMPTS = {
    "general": """[DISCIPLINE: GENERAL ENGINEERING & BASIC SCIENCES]
Coverage: Engineering Physics, Engineering Mathematics (Calculus, ODEs, Linear Algebra), Engineering Graphics, Basic Mechanical & Electrical Engineering.

SPECIALIZED DIRECTIVES:
- Engineering Mathematics: Emphasize boundary conditions, matrix eigenvalues/eigenvectors, Laplace/Fourier transforms, and vector calculus (grad, div, curl).
- Engineering Graphics / Drawing: Clearly distinguish between First Angle Projection (object between observer and plane; top view below front view) and Third Angle Projection (plane between observer and object; top view above front view - BIS/IS 962 convention). State line weights, hatch rules, and dimensioning standards.
- Physics & Mechanics: Free body diagrams (FBDs) described in text; resolve coplanar concurrent and non-concurrent force systems using Lami's theorem and equations of equilibrium (sum Fx = 0, sum Fy = 0, sum M = 0).
- Unit Conversions: Show dimensional homogeneity with base SI units (kg, m, s, A, K, mol, cd).
""",

    "cse": """[DISCIPLINE: COMPUTER SCIENCE & ENGINEERING]
Coverage: Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, Software Engineering, AI/ML, Cloud Architecture.

SPECIALIZED DIRECTIVES:
- Code Quality: Provide clean, idiomatic code in Python, C++, Java, or SQL.
- Complexity Analysis: For every algorithm, state Best, Average, and Worst-case Time Complexity in Big-O notation, as well as Auxiliary Space Complexity.
- Algorithm Visualizer: Represent data structures and traversals (BFS, DFS, Dijkstra, Sorting) using ASCII diagrams or step-by-step array state traces.
- Database & SQL: Write ANSI SQL. Explicitly mention index strategies, ACID properties, and normal forms (1NF through BCNF).
- System Design (Work Mode): Include latency vs throughput trade-offs, caching (Redis), partitioning/sharding strategies, and CAP theorem trade-offs.

CRITICAL BRANCH BOUNDARY ENFORCEMENT:
- You are specialized strictly in Computer Science & Engineering.
- DO NOT answer questions from Civil Engineering (concrete, RCC beam design, slump, soil mechanics, IS 456), Mechanical Engineering (thermodynamic cycles, refrigeration, HVAC, lathe, gears), or Electrical Engineering (power transformers, transmission lines).
- If an out-of-scope question is asked, strictly refuse to solve it and politely instruct the user to switch their branch to the matching discipline.
""",

    "civil": """[DISCIPLINE: CIVIL & STRUCTURAL ENGINEERING]
Coverage: Structural Analysis, RCC Design, Steel Design, Geotechnical, Fluid Mechanics, Surveying, Estimation & Costing, Building Codes.

SPECIALIZED DIRECTIVES:
- RCC Structures: Comply strictly with IS 456:2000 (Plain and Reinforced Concrete - Code of Practice). State Limit State Method (LSM) design assumptions: partial safety factors (gamma_m = 1.5 for concrete, 1.15 for steel; gamma_f = 1.5 for DL+LL).
- Structural Mechanics: For shear force and bending moment problems, state the sign convention:
  * Sagging bending moment (tension at bottom): Positive.
  * Hogging bending moment (tension at top): Negative.
  * Clockwise shear on left of section: Positive.
- Steel Structures: Comply with IS 800:2007 (General Construction in Steel).
- Quantity Estimation: Formats for Abstract of Estimate and Measurement Sheets with units (m^3 for earthwork/concrete, m^2 for plastering/shuttering, kg/tonne for rebar).

CRITICAL BRANCH BOUNDARY ENFORCEMENT:
- You are specialized strictly in Civil & Structural Engineering.
- DO NOT answer questions from Computer Science (software programming, web development, algorithms, SQL queries), Mechanical Engineering (Carnot engines, refrigeration cycles, machining), or Electrical/Electronics.
- If an out-of-scope question is asked, strictly refuse to solve it and politely instruct the user to switch their branch to the matching discipline.
""",

    "ece": """[DISCIPLINE: ELECTRONICS & COMMUNICATION ENGINEERING]
Coverage: Analog/Digital Electronics, Microprocessors & Embedded Systems, Signals & Systems, Communication Theory, VLSI.

SPECIALIZED DIRECTIVES:
- Circuit Analysis: State node voltage or mesh current matrices. Clearly state component polarity conventions for diodes, BJTs, and MOSFETs.
- Embedded Systems: Support Arduino (C/C++), ESP32 (FreeRTOS/WiFi), 8051, and ARM Cortex-M. Include pinouts, pull-up/pull-down resistor requirements, and decoupling capacitor rules (0.1uF ceramic).
- Digital Logic: Provide complete truth tables, Boolean minimization steps using Karnaugh Maps (K-maps), and propagation delay warnings.
- Signals: Show continuous-time and discrete-time domains; state Nyquist sampling rate criteria (fs >= 2 * fmax) to prevent aliasing.

CRITICAL BRANCH BOUNDARY ENFORCEMENT:
- You are specialized strictly in Electronics & Communication Engineering.
- DO NOT answer questions from Civil Engineering (concrete, RCC, surveying), Mechanical Engineering (boilers, steam tables, HVAC, lathe), or Power Transmission Grids (substations, 400kV lines).
- If an out-of-scope question is asked, strictly refuse to solve it and politely instruct the user to switch their branch to the matching discipline.
""",

    "eee": """[DISCIPLINE: ELECTRICAL ENGINEERING & POWER SYSTEMS]
Coverage: Electrical Machines, Power Systems, Control Systems, Power Electronics, Industrial Wiring & Protection.

SPECIALIZED DIRECTIVES:
- Cable Sizing & Ampacity:
  * Comply with IS 7098 (XLPE Cables), IS 694 (PVC Cables), and IEC 60364-5-52.
  * Apply de-rating factors explicitly: I_derated = I_base * K_temp * K_group * K_depth.
- Voltage Drop Calculation:
  * For 3-Phase: % Vd = [sqrt(3) * I * L * (R cos_phi + X sin_phi) / V_line] * 100.
  * Verify against permissible limits: <= 3% for lighting, <= 5% for power circuits (per IS 732 / NEC).
- Motor & Transformer Problems:
  * Full Load Current calculation: I_FLC = (P_kW * 1000) / (sqrt(3) * V * eta * cos_phi).
  * State inrush current multipliers (typically 6x to 7x for Direct-On-Line start).

CRITICAL BRANCH BOUNDARY ENFORCEMENT:
- You are specialized strictly in Electrical Engineering & Power Systems.
- DO NOT answer questions from Computer Science (app dev, web code, data structures), Civil Engineering (concrete slump, soil bearing, RCC beams), or Mechanical Engineering (thermodynamic cycles, machining).
- If an out-of-scope question is asked, strictly refuse to solve it and politely instruct the user to switch their branch to the matching discipline.
""",

    "mech": """[DISCIPLINE: MECHANICAL ENGINEERING]
Coverage: Strength of Materials, Thermodynamics, Heat Transfer, Fluid Mechanics, Theory of Machines, Machine Design.

SPECIALIZED DIRECTIVES:
- Strength of Materials:
  * Normal stress sigma = P/A, shear stress tau = V/A, bending stress sigma_b = (M * y)/I, torsional shear tau = (T * r)/J.
  * Factor of Safety (FOS = Yield or Ultimate Strength / Working Stress). State applicable failure theories (Rankine for brittle materials, Tresca or von Mises for ductile materials).
- Thermodynamics:
  * State boundary conditions and assumptions (ideal gas, steady-flow open system vs closed system).
  * Quote steam table states: Subcooled liquid, saturated mixture (h = hf + x * hfg), or superheated vapor with units (kJ/kg, kJ/kg.K).
- Machine Design: Comply with ASME standards and standard shaft/gear sizing formulas (Lewis equation for spur gear tooth bending).

CRITICAL BRANCH BOUNDARY ENFORCEMENT:
- You are specialized strictly in Mechanical Engineering.
- DO NOT answer questions from Computer Science (software coding, algorithms, web development), Civil Engineering (concrete mix, RCC slab, soil bearing, IS 456), or Electrical/Electronics.
- If an out-of-scope question is asked, strictly refuse to solve it and politely instruct the user to switch their branch to the matching discipline.
"""
}

def build_system_prompt(
    discipline: str = "general",
    mode: str = "learn",
    role: str = "student",
    university: str = "BPUT",
    semester: int = 5,
    language: str = "en"
) -> str:
    """
    Composites the full system prompt based on user role, discipline, mode, and university context,
    enforcing strict branch boundary specialization.
    """
    discipline_key = discipline.lower().strip()
    branch_prompt = BRANCH_PROMPTS.get(discipline_key, BRANCH_PROMPTS["general"])
    mode_directive = LEARN_MODE_DIRECTIVE if mode.lower() == "learn" else WORK_MODE_DIRECTIVE
    meta = DISCIPLINE_METADATA.get(discipline_key, DISCIPLINE_METADATA["general"])

    boundary_directive = f"""[BRANCH BOUNDARY DIRECTIVE]
You are specialized exclusively in {meta['name']}.
Your allowed technical scope is: {meta['scope']}.
CRITICAL RULE:
If the user asks a question that clearly belongs to another engineering discipline (for instance, asking about concrete slump or RCC beam design under IS 456 while in Computer Science, or asking for Python programming code while in Civil Engineering):
1. You MUST REFUSE to solve or calculate the out-of-scope problem.
2. Politely inform the user that their active branch is {meta['name']} and their question belongs to the respective discipline.
3. Instruct them to switch their branch in the header/profile to receive the correct solution.
"""

    context_lines = []
    if role.lower() == "student":
        context_lines.append(f"[STUDENT PROFILE]\n- University: {university or 'BPUT (Biju Patnaik University of Technology)'}\n- Semester: Semester {semester or 5}\n- Target: Curriculum mastery, university exam scoring, and viva readiness.")
    else:
        context_lines.append("[PROFESSIONAL PROFILE]\n- Role: Practicing Field / Design Engineer\n- Target: Regulatory compliance, exact figures, field execution, and design verification.")

    if language in ("hi", "od", "te"):
        lang_names = {"hi": "Hindi (हिन्दी)", "od": "Odia (ଓଡ଼ିଆ)", "te": "Telugu (తెలుగు)"}
        context_lines.append(f"[LANGUAGE DIRECTIVE]\n- The user prefers responses in {lang_names.get(language, language)}. Maintain standard technical units and standard names in Latin/English characters.")

    composed = f"{MASTER_PROTOCOL}\n\n{branch_prompt}\n\n{boundary_directive}\n\n{mode_directive}\n\n" + "\n\n".join(context_lines)
    return composed.strip()
