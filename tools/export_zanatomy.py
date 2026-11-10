"""
Exporta o atlas Z-Anatomy (Startup.blend) para o app web.

Uso (a partir da raiz do projeto):
  blender -b --factory-startup --disable-autoexec raw/extracted/atlas/Z-Anatomy/Startup.blend \
      --python tools/export_zanatomy.py -- public/zanatomy

Gera em <saida>/:
  catalog.json        árvore de estruturas por sistema, pins e metadados
  <sistema>.glb       geometria (Draco) — cada mesh tem extras.zid = chave do nó
  text-<sistema>.json descrições (inglês, derivadas da Wikipedia) por nome

Convenções de nomes do Z-Anatomy:
  "X.g"  rótulo de grupo (nó da árvore)      "X.l" / "X.r"  lado esquerdo / direito
  "X.t" / "X.s"  rótulo de acidente/região   "X.j" / "X.i"  malhas auxiliares (ignoradas)
  ".o*" / ".e*"  origens/inserções musculares (coleção 2, ignorada por enquanto)
"""
import bpy, json, os, re, sys, time

OUT = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
os.makedirs(OUT, exist_ok=True)

# (id, coleção no .blend, nome exibido, cor padrão, visível ao abrir, alvo de triângulos)
SYSTEMS = [
    ("skeletal", "1: Skeletal system", "Sistema Esquelético", "#e3d6bc", True, 350_000),
    ("joints", "3: Joints", "Articulações e Ligamentos", "#d9cfae", False, 100_000),
    ("muscular", "4: Muscular system", "Sistema Muscular", "#b44a3f", False, 500_000),
    ("cardiovascular", "5: Cardiovascular system", "Sistema Cardiovascular", "#c0392b", False, 150_000),
    ("lymphoid", "6: Lymphoid organs", "Sistema Linfático", "#7cb860", False, 80_000),
    ("nervous", "7: Nervous system & Sense organs", "Sistema Nervoso e Sentidos", "#e8c547", False, 300_000),
    ("visceral", "8: Visceral systems", "Sistemas Viscerais", "#c97b6b", False, 150_000),
]
SYS_BY_COL = {s[1]: s for s in SYSTEMS}

# Cores por nome de material (prefixo antes de "-N"). Músculos ficam todos no mesmo vermelho.
MUSCLE = "#b44a3f"
PALETTE = {
    "Bone": "#e3d6bc", "Teeth": "#f2efe6", "Teeth-roots": "#e8dcc0", "Dentine": "#efe6cf",
    "Cartilage": "#a9c8d8", "Suture": "#cbb894", "Ligament": "#d9cfae", "Origin-Ligament": "#d9cfae",
    "Articular capsule": "#b9a6d6", "Bursa": "#a7c7e7", "Tendon": "#e6e1d3", "Fascia": "#d8c3b0",
    "Artery": "#c0392b", "Pulmonary vein": "#c0392b", "Vein": "#2e5fa8", "Pulmonary artery": "#2e5fa8",
    "Heart": "#b03a33", "Nerve": "#e8c547", "Nucleus": "#e0a040", "Nucleus (afferent fibers)": "#e0a040",
    "Nucleus (efferent fibers)": "#e0a040", "Nucleus (mixte)": "#e0a040",
    "Brain": "#e3a6a0", "Brain-Inner": "#e9b7a2", "Frontal lobe": "#e8a5a0", "Parietal lobe": "#a8c8e8",
    "Temporal lobe": "#b8dca0", "Occipital lobe": "#e8d39a", "Limbic lobe": "#d0a8e0", "Insula": "#f0c090",
    "Cerebellum": "#d89a8a", "White matter": "#f0e6dc", "LCR": "#9fd3e6", "Interlobar sulci": "#c08080",
    "Lymph": "#7cb860", "Gland": "#d9a35b", "Organ": "#c97b6b", "Lung": "#e5a3a8", "Lung-base": "#e5a3a8",
    "Bronchi": "#e9d2c5", "Intestine": "#d99a85", "Mucosa": "#d98b8b", "Mucosa of stomach": "#d98b8b",
    "Gallbladder": "#5f8a3a", "Biliary system": "#5f8a3a", "Peritoneum": "#e8cfa5", "Ductus": "#d0b070",
    "Eye": "#f4f4f4", "Cornea": "#cfe8f5", "Iris": "#6b8e4e", "Fat": "#f0d878", "Nail": "#f1d9cf",
    "Skin": "#e8b896", "Skin-in": "#e8b896", "Ingestion": "#c97b6b", "Phonation": "#c97b6b",
}
for m in ["Abductor", "Adductor", "Biarticular", "Depressor", "Diaphragm", "Extension", "Extension hand/foot",
          "Extensor extremities", "External rotation", "Flexion", "Flexion fingers", "Flexion hand/foot",
          "Internal rotator", "Levator", "Masticator", "Orbicularis/Constrictor", "Superficial", "Trapezius"]:
    PALETTE[m] = MUSCLE

INSERTION_RE = re.compile(r"^[oe]\d*[lr]?$")
SUBSURF_KEEP_BELOW = 1500  # malhas com menos triângulos que isso mantêm 1 nível de subdivisão
DECIMATE_MIN_TRIS = 300


def split_name(name):
    """'Femur.l' -> ('Femur', 'l'); 'Occipital bone' -> ('Occipital bone', '')"""
    name = name.strip()
    if "." in name:
        base, suf = name.rsplit(".", 1)
        if suf in ("l", "r", "g", "j", "i", "t", "s") or INSERTION_RE.match(suf):
            return base.strip(), suf
    return name, ""


def display(base):
    return base.strip("()[] ").strip()


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def system_of(o):
    for c in o.users_collection:
        if c.name in SYS_BY_COL:
            return SYS_BY_COL[c.name]
    return None


def b2t(v):
    """Blender (Z-up, frente = -Y) -> three.js (Y-up, frente = +Z)"""
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def srgb_to_linear(h):
    def ch(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (ch(h[1:3]), ch(h[3:5]), ch(h[5:7]), 1.0)


t0 = time.time()
log = lambda *a: print(f"[{time.time() - t0:6.1f}s]", *a, flush=True)

# ---------------------------------------------------------------------------
# 1) Classificar objetos e montar a árvore
# ---------------------------------------------------------------------------
nodes = {}  # key "sistema/base" -> dict


def node_for(sys_id, base):
    key = f"{sys_id}/{base}"
    if key not in nodes:
        nodes[key] = {"key": key, "base": base, "name": display(base), "system": sys_id,
                      "parent": None, "children": [], "objs": [], "pins": {}}
    return nodes[key]


def is_group(o):
    return split_name(o.name)[1] == "g"


def is_structure(o):
    return o.type in ("MESH", "CURVE") and split_name(o.name)[1] in ("", "l", "r")


def tree_parent(o):
    """Sobe na hierarquia até achar um grupo ou estrutura do mesmo sistema."""
    p = o.parent
    while p and not (is_group(p) or is_structure(p)):
        p = p.parent
    return p


candidates = []
for o in bpy.data.objects:
    s = system_of(o)
    if not s:
        continue
    if is_group(o) or is_structure(o):
        n = node_for(s[0], split_name(o.name)[0])
        if is_structure(o):
            n["objs"].append(o)
            candidates.append(o)
        p = tree_parent(o)
        if p and system_of(p) and system_of(p)[0] == s[0]:
            pk = f"{s[0]}/{split_name(p.name)[0]}"
            if pk != n["key"] and n["parent"] is None:
                n["parent"] = pk

# Filhos (depois de todos os nós existirem)
for n in nodes.values():
    if n["parent"]:
        node_for(n["system"], nodes[n["parent"]]["base"])["children"].append(n["key"])

# Pins: rótulos .t/.s presos a uma estrutura ou grupo. A posição preferida é o centro
# da malha do acidente (.i/.j, que fica na superfície); senão, a posição do rótulo.
# Rótulos na origem dependem do plugin do Z-Anatomy para serem posicionados -> ignorados.
landmark_center = {}
for o in bpy.data.objects:
    base, suf = split_name(o.name)
    if o.type == "MESH" and suf in ("i", "j") and len(o.data.vertices) > 0:
        mw = o.matrix_world
        acc = sum((mw @ v.co for v in o.data.vertices), start=mw.translation * 0)
        landmark_center[base] = acc / len(o.data.vertices)

for o in bpy.data.objects:
    if o.type != "FONT":
        continue
    base, suf = split_name(o.name)
    if suf not in ("t", "s"):
        continue
    p = tree_parent(o)
    s = system_of(p) if p else None
    if not s:
        continue
    pk = f"{s[0]}/{split_name(p.name)[0]}"
    if pk in nodes and base != nodes[pk]["base"] and base not in nodes[pk]["pins"]:
        pos = landmark_center.get(base)
        if pos is None and o.matrix_world.translation.length > 1e-3:
            pos = o.matrix_world.translation
        if pos is not None:
            nodes[pk]["pins"][base] = b2t(pos)

log(f"nós: {len(nodes)}  estruturas com geometria: {len(candidates)}")

# ---------------------------------------------------------------------------
# 2) Preparar avaliação: tudo visível, subdivisão controlada, curvas mais leves
# ---------------------------------------------------------------------------
def unexclude(lc):
    lc.exclude = False
    lc.hide_viewport = False
    for c in lc.children:
        unexclude(c)


unexclude(bpy.context.view_layer.layer_collection)
for c in bpy.data.collections:
    c.hide_viewport = False
for o in candidates:
    o.hide_viewport = False
    try:
        o.hide_set(False)
    except RuntimeError:
        pass
    if o.type == "MESH":
        base_tris = tris(o.data)
        for m in o.modifiers:
            if m.type == "SUBSURF":
                if base_tris >= SUBSURF_KEEP_BELOW:
                    m.show_viewport = False
                else:
                    m.levels = min(m.levels, 1)
    else:
        o.data.bevel_resolution = min(o.data.bevel_resolution, 1)
        o.data.resolution_u = min(o.data.resolution_u, 6)

bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
log("depsgraph avaliado")

# ---------------------------------------------------------------------------
# 3) Gerar malhas de exportação (espaço do mundo, material simples, sem UV)
# ---------------------------------------------------------------------------
materials = {}


def material_for(hex_color):
    if hex_color not in materials:
        m = bpy.data.materials.new(f"z{hex_color}")
        m.use_nodes = True
        bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = srgb_to_linear(hex_color)
        bsdf.inputs["Roughness"].default_value = 0.6
        bsdf.inputs["Metallic"].default_value = 0.0
        materials[hex_color] = m
    return materials[hex_color]


def color_for(o, sys_color):
    mat = o.active_material
    if not mat:
        return sys_color
    name = mat.name
    if name in PALETTE:
        return PALETTE[name]
    prefix = name.rsplit("-", 1)[0] if name.rsplit("-", 1)[-1].isdigit() else name
    return PALETTE.get(prefix, sys_color)


export_cols = {}
stats = {s[0]: {"objects": 0, "empty": 0, "tris_in": 0} for s in SYSTEMS}
for s in SYSTEMS:
    col = bpy.data.collections.new(f"EXPORT_{s[0]}")
    bpy.context.scene.collection.children.link(col)
    export_cols[s[0]] = col

for o in candidates:
    s = system_of(o)
    key = f"{s[0]}/{split_name(o.name)[0]}"
    try:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
    except RuntimeError:
        stats[s[0]]["empty"] += 1
        continue
    if len(me.polygons) == 0:
        bpy.data.meshes.remove(me)
        stats[s[0]]["empty"] += 1
        continue
    me.transform(o.matrix_world)
    if o.matrix_world.determinant() < 0:
        me.flip_normals()
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    for attr in list(me.color_attributes):
        me.color_attributes.remove(attr)
    me.materials.clear()
    me.materials.append(material_for(color_for(o, s[3])))
    me.polygons.foreach_set("material_index", [0] * len(me.polygons))

    eo = bpy.data.objects.new(o.name.strip(), me)
    eo["zid"] = key
    export_cols[s[0]].objects.link(eo)
    stats[s[0]]["objects"] += 1
    stats[s[0]]["tris_in"] += tris(me)

log("malhas geradas", {k: (v["objects"], v["tris_in"]) for k, v in stats.items()})

# Remove a cena original da view layer para o export enxergar só o que interessa
for c in list(bpy.context.scene.collection.children):
    if not c.name.startswith("EXPORT_"):
        bpy.context.scene.collection.children.unlink(c)
for o in list(bpy.context.scene.collection.objects):
    bpy.context.scene.collection.objects.unlink(o)

# ---------------------------------------------------------------------------
# 4) Decimar e exportar cada sistema
# ---------------------------------------------------------------------------
gltf_props = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
wanted = dict(
    export_format="GLB", use_selection=True, export_apply=True, export_extras=True,
    export_texcoords=False, export_normals=True, export_tangents=False, export_materials="EXPORT",
    export_cameras=False, export_lights=False, export_animations=False, export_skins=False,
    export_morph=False, export_yup=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14, export_draco_normal_quantization=10,
)
gltf_args = {k: v for k, v in wanted.items() if k in gltf_props}
missing = sorted(set(wanted) - set(gltf_args))
if missing:
    log("AVISO: parâmetros glTF não disponíveis nesta versão:", missing)

systems_out = []
for sys_id, _, sys_name, sys_color, default_visible, target in SYSTEMS:
    col = export_cols[sys_id]
    objs = list(col.objects)
    if not objs:
        continue
    tris_in = stats[sys_id]["tris_in"]
    ratio = min(1.0, target / max(tris_in, 1))
    if ratio < 0.999:
        for eo in objs:
            if tris(eo.data) > DECIMATE_MIN_TRIS:
                mod = eo.modifiers.new("dec", "DECIMATE")
                mod.ratio = ratio
                mod.use_collapse_triangulate = True

    bpy.ops.object.select_all(action="DESELECT")
    for eo in objs:
        eo.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(OUT, f"{sys_id}.glb")
    bpy.ops.export_scene.gltf(filepath=path, **gltf_args)

    tris_out = sum(tris(eo.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()) for eo in objs)
    size = os.path.getsize(path)
    log(f"{sys_id}: {len(objs)} malhas, {tris_in:,} -> {tris_out:,} tris (ratio {ratio:.2f}), {size / 1e6:.1f} MB")
    systems_out.append({
        "id": sys_id, "name": sys_name, "color": sys_color, "defaultVisible": default_visible,
        "file": f"{sys_id}.glb", "text": f"text-{sys_id}.json", "bytes": size, "triangles": tris_out,
        "roots": sorted([n["key"] for n in nodes.values() if n["system"] == sys_id and not n["parent"]]),
    })

# ---------------------------------------------------------------------------
# 5) Catálogo e textos
# ---------------------------------------------------------------------------
exported_keys = {eo["zid"] for col in export_cols.values() for eo in col.objects}


def has_geometry(key, memo={}):
    if key not in memo:
        memo[key] = False  # protege contra ciclos
        n = nodes[key]
        memo[key] = key in exported_keys or any(has_geometry(c) for c in n["children"])
    return memo[key]


def clean_text(t):
    try:
        s = t.as_string()
    except Exception:
        return None
    lines = s.strip().splitlines()
    while lines and (not lines[0].strip() or lines[0].strip().upper() == lines[0].strip()):
        lines.pop(0)  # remove o título em CAIXA ALTA
    s = "\n".join(l.rstrip() for l in lines)
    s = re.sub(r"\[\d+\]", "", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip() or None


texts = {t.name.strip(): t for t in bpy.data.texts}


def find_text(base):
    for k in (base, display(base)):
        if k in texts:
            return clean_text(texts[k])
    return None


catalog_nodes = {}
text_out = {s["id"]: {} for s in systems_out}
for key, n in nodes.items():
    if n["system"] not in text_out or not has_geometry(key):
        continue
    entry = {"n": n["name"], "s": n["system"]}
    if n["parent"] and has_geometry(n["parent"]):
        entry["p"] = n["parent"]
    kids = sorted((c for c in n["children"] if has_geometry(c)), key=lambda k: nodes[k]["name"].lower())
    if kids:
        entry["c"] = kids
    if key in exported_keys:
        entry["g"] = 1
    if n["pins"]:
        entry["pins"] = [[display(b), *pos] for b, pos in sorted(n["pins"].items())]
        for b in n["pins"]:
            txt = find_text(b)
            if txt:
                text_out[n["system"]][display(b)] = txt
    txt = find_text(n["base"])
    if txt:
        text_out[n["system"]][n["name"]] = txt
    catalog_nodes[key] = entry

# Raízes só com nós que sobreviveram
for s in systems_out:
    s["roots"] = [r for r in s["roots"] if r in catalog_nodes]

credits = (
    "Modelos 3D: Z-Anatomy (Gauthier Kervyn, Lluís Vinent) — CC BY-SA 4.0, baseado em "
    "BodyParts3D © The Database Center for Life Science — CC BY-SA 2.1 Japan. "
    "Textos: Wikipedia — CC BY-SA."
)
with open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8") as f:
    json.dump({"version": 1, "credits": credits, "systems": systems_out, "nodes": catalog_nodes},
              f, ensure_ascii=False, separators=(",", ":"))
for sys_id, d in text_out.items():
    with open(os.path.join(OUT, f"text-{sys_id}.json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))

log(f"catálogo: {len(catalog_nodes)} nós, pins: {sum(len(e.get('pins', [])) for e in catalog_nodes.values())}, "
    f"textos: {sum(len(d) for d in text_out.values())}")
log("vazios (sem geometria):", {k: v["empty"] for k, v in stats.items()})
log("FIM")
