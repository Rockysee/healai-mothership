#!/usr/bin/env python3
"""
Framegen — Manim whiteboard scene renderer (with RDKit chemistry support).

Usage:
  python3 manim_generator.py --input /tmp/scene.json --output /path/out.mp4

Input JSON schema:
  {
    "title":        "Scene title",
    "narration":    "Voice-over text",
    "equations":    ["F = ma", "E = mc^2"],
    "key_facts":    ["Fact one", "Fact two"],
    "duration_sec": 10,
    "smiles":       ["OS(=O)(=O)O", "O"],   // optional — chemistry molecules
    "subject":      "chemistry"              // optional — triggers chem layout
  }
"""
import sys, json, os, argparse, subprocess, tempfile, shutil

# ── RDKit availability (optional — chemistry scenes only) ─────────────────
try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    from rdkit.Chem.Draw import rdMolDraw2D
    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False


# ── Generate molecule SVG via RDKit ───────────────────────────────────────
def smiles_to_svg(smiles: str, out_path: str, size=(280, 180)) -> str | None:
    if not RDKIT_AVAILABLE:
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    AllChem.Compute2DCoords(mol)
    drawer = rdMolDraw2D.MolDraw2DSVG(size[0], size[1])
    drawer.drawOptions().addAtomIndices = False
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    with open(out_path, "w") as f:
        f.write(drawer.GetDrawingText())
    return out_path


# ── Detect whether equation needs LaTeX ──────────────────────────────────
def _needs_latex(eq: str) -> bool:
    indicators = ["\\frac", "\\sqrt", "\\int", "\\sum", "\\infty",
                  "\\alpha", "\\beta", "\\gamma", "\\Delta", "\\pi",
                  "^{", "_{", "\\cdot", "\\times", "\\leq", "\\geq"]
    return any(s in eq for s in indicators)


# ── Equations block ───────────────────────────────────────────────────────
def _eq_block(equations: list, top_y: float):
    lines = []
    y = top_y
    for i, eq in enumerate(equations[:3]):
        eq = eq.strip()
        v = f"eq{i}"
        if _needs_latex(eq):
            lines.append(f'        {v} = MathTex(r"{eq}", color=RED_D, font_size=40)')
        else:
            safe = eq.replace('"', "'")
            lines.append(f'        {v} = Text("{safe}", color=RED_D, font_size=36, weight=BOLD, font="Courier New")')
        lines.append(f'        {v}_bg = BackgroundRectangle({v}, color=YELLOW_E, fill_opacity=0.22, buff=0.18, corner_radius=0.1)')
        lines.append(f'        {v}_grp = VGroup({v}_bg, {v}).move_to(UP * {y:.2f} + LEFT * 0)')
        lines.append(f'        self.play(FadeIn({v}_bg, run_time=0.3), Write({v}, run_time=1.0))')
        lines.append(f'        self.wait(0.35)')
        y -= 1.15
    return "\n".join(lines), y


# ── Key-facts block ───────────────────────────────────────────────────────
def _facts_block(facts: list, top_y: float):
    lines = []
    y = top_y
    for i, fact in enumerate(facts[:3]):
        safe = fact.strip()[:72].replace('"', "'").replace("\\", "\\\\")
        v = f"fact{i}"
        lines.append(f'        {v}_dot  = Dot(color=BLUE_D, radius=0.09).move_to(LEFT * 5.5 + UP * {y:.2f})')
        lines.append(f'        {v}_txt  = Text("{safe}", color=DARK_BLUE, font_size=26, line_spacing=1.4).next_to({v}_dot, RIGHT, buff=0.25)')
        lines.append(f'        self.play(FadeIn({v}_dot), Write({v}_txt, run_time=0.85))')
        lines.append(f'        self.wait(0.25)')
        y -= 0.78
    return "\n".join(lines), y


# ── Narration caption ─────────────────────────────────────────────────────
def _narration_block(narration: str):
    if not narration.strip():
        return "        pass  # no narration"
    words = narration.strip().split()
    mid   = max(1, len(words) // 2)
    l1    = " ".join(words[:mid]).replace('"', "'")[:65]
    l2    = " ".join(words[mid:]).replace('"', "'")[:65]
    return (
        f'        nar = VGroup(\n'
        f'            Text("{l1}", color=GRAY_D, font_size=22, slant=ITALIC),\n'
        f'            Text("{l2}", color=GRAY_D, font_size=22, slant=ITALIC),\n'
        f'        ).arrange(DOWN, buff=0.1).to_edge(DOWN, buff=0.55)\n'
        f'        self.play(FadeIn(nar, shift=UP * 0.15, run_time=0.7))\n'
        f'        self.wait(2.2)'
    )


# ── Chemistry molecule block (RDKit SVG → SVGMobject) ────────────────────
def _chem_block(smiles_list: list, tmp_dir: str) -> str:
    """Generate Manim code to display up to 2 molecule structures side-by-side."""
    if not smiles_list or not RDKIT_AVAILABLE:
        return "        pass  # no molecules"

    lines = []
    x_positions = [-3.2, 1.2]  # left / right if two molecules

    for i, smiles in enumerate(smiles_list[:2]):
        svg_path = os.path.join(tmp_dir, f"mol_{i}.svg")
        result   = smiles_to_svg(smiles.strip(), svg_path)
        if not result:
            continue

        safe_path = svg_path.replace("\\", "/")
        v = f"mol{i}"
        x = x_positions[i] if len(smiles_list) > 1 else 0
        lines += [
            f'        {v}_svg  = SVGMobject(r"{safe_path}")',
            f'        {v}_svg.set_stroke(BLACK, width=1.8).set_fill(BLACK, opacity=1)',
            f'        {v}_svg.scale(1.5).move_to(RIGHT * {x:.1f} + UP * 0.4)',
            f'        self.play(FadeIn({v}_svg, shift=UP * 0.2, run_time=0.7))',
            f'        self.wait(0.3)',
        ]

    return "\n".join(lines) if lines else "        pass  # no valid molecules"


# ── Scene templates ───────────────────────────────────────────────────────

# Standard whiteboard (STEM: equations + facts)
SCENE_TMPL = '''\
from manim import *

config.background_color    = WHITE
config.frame_rate          = 30
config.pixel_height        = 720
config.pixel_width         = 1280

class WhiteboardScene(Scene):
    def construct(self):
        # ── Title ──────────────────────────────────────────────────────
        title = Text(
            {title!r},
            color   = BLACK,
            font_size = 44,
            weight  = BOLD,
        ).to_edge(UP, buff = 0.55)
        bar = Line(
            title.get_left(), title.get_right(),
            color        = BLUE_D,
            stroke_width = 3,
        ).next_to(title, DOWN, buff = 0.12)
        self.play(Write(title, run_time=1.2), GrowFromPoint(bar, bar.get_left(), run_time=0.7))
        self.wait(0.3)

        # ── Equations ──────────────────────────────────────────────────
{eq_block}

        # ── Key Facts ──────────────────────────────────────────────────
{fact_block}

        # ── Narration caption ──────────────────────────────────────────
{nar_block}

        self.wait(0.8)
'''

# Chemistry layout (molecules left + equations/facts right)
CHEM_TMPL = '''\
from manim import *

config.background_color    = WHITE
config.frame_rate          = 30
config.pixel_height        = 720
config.pixel_width         = 1280

class WhiteboardScene(Scene):
    def construct(self):
        # ── Title ──────────────────────────────────────────────────────
        title = Text(
            {title!r},
            color     = BLACK,
            font_size = 40,
            weight    = BOLD,
        ).to_edge(UP, buff = 0.45)
        bar = Line(
            title.get_left(), title.get_right(),
            color        = BLUE_D,
            stroke_width = 3,
        ).next_to(title, DOWN, buff = 0.1)
        self.play(Write(title, run_time=1.0), GrowFromPoint(bar, bar.get_left(), run_time=0.6))
        self.wait(0.2)

        # ── Molecule structures (RDKit) ────────────────────────────────
{chem_block}

        # ── Equations ──────────────────────────────────────────────────
{eq_block}

        # ── Key Facts ──────────────────────────────────────────────────
{fact_block}

        # ── Narration caption ──────────────────────────────────────────
{nar_block}

        self.wait(0.8)
'''


def build_script(data: dict, tmp_dir: str) -> str:
    title   = data.get("title", "Untitled")[:52]
    eqs     = data.get("equations", [])
    facts   = data.get("key_facts", [])
    narr    = data.get("narration", "")
    smiles  = data.get("smiles", [])
    subject = data.get("subject", "").lower()

    is_chemistry = subject == "chemistry" and smiles and RDKIT_AVAILABLE

    if is_chemistry:
        # Chemistry layout: molecules top-left, equations/facts on right
        chem_code           = _chem_block(smiles, tmp_dir)
        # Push equations and facts to right column
        eq_code,   next_y   = _eq_block(eqs, 0.2)
        fact_code, _        = _facts_block(facts, next_y - 0.2)
        # Shift equations/facts right
        eq_code   = eq_code.replace("LEFT * 0", "RIGHT * 3.0")
        fact_code = fact_code.replace("LEFT * 5.5", "LEFT * 0.2")
        nar_code  = _narration_block(narr)
        return CHEM_TMPL.format(
            title      = title,
            chem_block = chem_code,
            eq_block   = eq_code   or "        pass  # no equations",
            fact_block = fact_code or "        pass  # no key facts",
            nar_block  = nar_code,
        )
    else:
        # Standard STEM whiteboard layout
        eq_code,   next_y = _eq_block(eqs, 1.75)
        fact_code, _      = _facts_block(facts, next_y - 0.25)
        nar_code          = _narration_block(narr)
        return SCENE_TMPL.format(
            title      = title,
            eq_block   = eq_code   or "        pass  # no equations",
            fact_block = fact_code or "        pass  # no key facts",
            nar_block  = nar_code,
        )


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input",  required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    tmp_dir = tempfile.mkdtemp(prefix="fg_manim_")
    py_file = os.path.join(tmp_dir, "scene.py")
    script  = build_script(data, tmp_dir)

    with open(py_file, "w") as f:
        f.write(script)

    try:
        result = subprocess.run(
            [sys.executable, "-m", "manim",
             py_file, "WhiteboardScene",
             "--output_file", os.path.basename(args.output),
             "--media_dir",   tmp_dir,
             "--format", "mp4",
             "-q", "m",
             "--disable_caching"],
            capture_output=True, text=True, timeout=180,
        )

        if result.returncode != 0:
            print(result.stderr[-2500:], file=sys.stderr)
            sys.exit(1)

        # Find the rendered MP4
        rendered = None
        for root, _, files in os.walk(tmp_dir):
            for fn in files:
                if fn.endswith(".mp4") and "WhiteboardScene" in fn:
                    rendered = os.path.join(root, fn)
                    break
            if rendered:
                break

        if not rendered:
            print("ERROR: Manim produced no MP4 output", file=sys.stderr)
            sys.exit(1)

        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        shutil.move(rendered, args.output)
        print(f"OK:{args.output}")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
