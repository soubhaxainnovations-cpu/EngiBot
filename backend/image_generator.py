import os
import re
import time
import uuid
import urllib.parse
import requests
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STYLE_MODIFIERS = {
    "schematic": "clean technical engineering schematic diagram, detailed technical drawing, labeled blueprint components, high resolution vector style, crisp white background, 8k",
    "render": "photorealistic 3D CAD engineering render, octane render, accurate mechanical textures, volumetric lighting, raytracing, high detail 8k",
    "circuit": "electronic circuit schematic, standard PCB layout, electrical symbols, wiring diagram, high precision technical diagram",
    "civil": "civil structural blueprint, architectural elevation, IS code standard CAD drawing, engineering line art, structural cross section",
    "concept": "concept engineering illustration, futuristic technological design, high detail digital art, cinematic lighting",
    "flowchart": "clean engineering system flowchart, block diagram, process flow, clear labeled blocks and directional arrows"
}

DISCIPLINE_MODIFIERS = {
    "cse": "computer science, software architecture, algorithm flowchart, network topology diagram",
    "mech": "mechanical engineering, thermodynamics, machine design, mechanism cross-section, kinematics",
    "civil": "civil engineering, structural mechanics, RCC beam slab, foundation, truss diagram",
    "ece": "electronics and communication engineering, semiconductor, signal processing, VLSI layout",
    "eee": "electrical engineering, power systems, transformer, motor generator, transmission line",
    "general": "engineering science, physics mechanics diagram, technical illustration"
}


def enhance_engineering_prompt(raw_prompt: str, style: str = "schematic", discipline: str = "general") -> str:
    """Enhance user prompt with targeted engineering and technical visual keywords."""
    clean_p = re.sub(
        r"^(generate|draw|create|render|make)(\s+an?)?\s+(image|picture|diagram|schematic|photo|drawing)\s+(of\s+)?",
        "",
        raw_prompt.strip(),
        flags=re.IGNORECASE
    ).strip()
    if not clean_p:
        clean_p = raw_prompt.strip()

    style_kw = STYLE_MODIFIERS.get(style.lower(), STYLE_MODIFIERS["schematic"])
    disc_kw = DISCIPLINE_MODIFIERS.get(discipline.lower(), DISCIPLINE_MODIFIERS["general"])

    return f"{clean_p}, {disc_kw}, {style_kw}"


def generate_image_file(
    prompt: str,
    style: str = "schematic",
    discipline: str = "general",
    width: int = 768,
    height: int = 768
) -> dict:
    """
    Generates an image according to the user prompt and saves it locally in uploads/.
    Returns a dict with image_url, file_name, file_size, enhanced_prompt.
    """
    clean_prompt = prompt.strip() if prompt else ""
    if not clean_prompt:
        return {
            "success": False,
            "error": "Please provide a valid prompt for image generation."
        }

    enhanced_prompt = enhance_engineering_prompt(clean_prompt, style=style, discipline=discipline)
    encoded = urllib.parse.quote(enhanced_prompt)
    seed = int(time.time()) % 100000

    # Model endpoints to query sequentially
    endpoints = [
        f"https://image.pollinations.ai/prompt/{encoded}?seed={seed}",
        f"https://image.pollinations.ai/prompt/{urllib.parse.quote(clean_prompt + ', technical engineering diagram')}?seed={seed}",
        f"https://image.pollinations.ai/prompt/{encoded}?model=sana&seed={seed}",
        f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&seed={seed}"
    ]

    last_err = ""
    for url in endpoints:
        try:
            resp = requests.get(url, timeout=28)
            if resp.status_code == 200 and len(resp.content) > 1000:
                file_uuid = uuid.uuid4().hex[:10]
                slug = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_prompt[:25].strip()).strip('_') or 'diagram'
                filename = f"gen_{slug}_{file_uuid}.jpg"
                file_path = UPLOAD_DIR / filename

                with open(file_path, "wb") as f:
                    f.write(resp.content)

                file_size = len(resp.content)
                rel_url = f"/uploads/{filename}"

                print(f"[IMAGE GENERATOR] Successfully generated: {filename} ({file_size} bytes)")
                return {
                    "success": True,
                    "prompt": clean_prompt,
                    "enhanced_prompt": enhanced_prompt,
                    "image_url": rel_url,
                    "file_name": filename,
                    "file_size": file_size,
                    "attachment_type": "image",
                    "style": style
                }
            elif resp.status_code == 402:
                # Free rate limit handling: extract retry after if small
                try:
                    data = resp.json()
                    msg = data.get("error", {}).get("message", "")
                    match = re.search(r"Retry after (\d+)s", msg)
                    if match:
                        wait_sec = min(int(match.group(1)), 4)
                        time.sleep(wait_sec)
                        retry_resp = requests.get(url, timeout=25)
                        if retry_resp.status_code == 200 and len(retry_resp.content) > 1000:
                            file_uuid = uuid.uuid4().hex[:10]
                            slug = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_prompt[:25].strip()).strip('_') or 'diagram'
                            filename = f"gen_{slug}_{file_uuid}.jpg"
                            file_path = UPLOAD_DIR / filename
                            with open(file_path, "wb") as f:
                                f.write(retry_resp.content)
                            return {
                                "success": True,
                                "prompt": clean_prompt,
                                "enhanced_prompt": enhanced_prompt,
                                "image_url": f"/uploads/{filename}",
                                "file_name": filename,
                                "file_size": len(retry_resp.content),
                                "attachment_type": "image",
                                "style": style
                            }
                except Exception:
                    pass
                last_err = "Generation queue is busy. Please retry in a few seconds."
            else:
                last_err = f"HTTP {resp.status_code}"
        except Exception as e:
            last_err = str(e)
            continue

    return {
        "success": False,
        "error": f"Image generation service notice: {last_err or 'Network timeout'}. Please try clicking Generate again."
    }
