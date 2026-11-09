# Einmaliges Hilfsskript: 2,5D-Umbau (Parallel-Kamera, Toon-Material, 3D-Figuren entfernen).
import re


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


# ---------- models.ts: Toon-Material, Figuren raus ----------
def models(s):
    s = s.replace("""const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(col: string, o: { rough?: number; emissive?: string; flat?: boolean } = {}) {
  const key = col + (o.rough ?? '') + (o.emissive ?? '') + (o.flat ? 'f' : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: col, roughness: o.rough ?? 0.75, metalness: 0, flatShading: !!o.flat, emissive: o.emissive ?? '#000000' });
    matCache.set(key, m);
  }
  return m;
}""", """/** Comic-Schattierung: wenige harte Helligkeitsstufen statt weichem Verlauf */
export const toonGradient = (() => {
  const d = new Uint8Array([120, 175, 225, 255]);
  const t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
export const toon = (o: THREE.MeshToonMaterialParameters) => new THREE.MeshToonMaterial({ gradientMap: toonGradient, ...o });

const matCache = new Map<string, THREE.MeshToonMaterial>();
export function mat(col: string, o: { rough?: number; emissive?: string; flat?: boolean } = {}) {
  const key = col + (o.emissive ?? '');
  let m = matCache.get(key);
  if (!m) {
    m = toon({ color: col, emissive: o.emissive ?? '#000000' });
    matCache.set(key, m);
  }
  return m;
}""")
    a = s.index("/* ───────────── Mia ───────────── */")
    b = s.index("/* ───────────── Objekte ───────────── */")
    s = s[:a] + s[b:]
    s = s.replace("const OR = '#ea9f46', ORD = '#c27a28', CR = '#fff0d4', PK = '#f2a2a2', INK = '#3b2a1e';\n", "")
    s = s.replace("body = new THREE.Mesh(bushGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));", "body = new THREE.Mesh(bushGeo, toon({ vertexColors: true }));")
    s = s.replace("const body = new THREE.Mesh(bushGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));", "const body = new THREE.Mesh(bushGeo, toon({ vertexColors: true }));")
    s = s.replace("sph(0.17, '#fff', 1, 1.15, 0.6, 10), sx * 0.3, 0.85, 1.12), at(sph(0.09, INK,", "sph(0.17, '#fff', 1, 1.15, 0.6, 10), sx * 0.3, 0.85, 1.12), at(sph(0.09, '#3b2a1e',")
    return s


sub('src/world3d/models.ts', models)


# ---------- decor.ts ----------
def decor(s):
    s = s.replace("import { createHouse } from './models';", "import { createHouse, toon } from './models';")
    s = s.replace("const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: 0.9 });", "const m = toon({ vertexColors: true });\n    void flat;")
    s = s.replace("const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });", "const gm = toon({ vertexColors: true, side: THREE.DoubleSide });")
    s = s.replace("new THREE.MeshStandardMaterial({ color: '#4a9a50', roughness: 1 })", "toon({ color: '#4a9a50' })")
    s = s.replace("new THREE.MeshStandardMaterial({ roughness: 0.8 })", "toon({})")
    s = s.replace("function wind(m: THREE.MeshStandardMaterial,", "function wind(m: THREE.MeshToonMaterial,")
    return s


sub('src/world3d/decor.ts', decor)


# ---------- house.ts ----------
def house(s):
    s = s.replace("import { box, cyl, cone, sph, mat, canvasTex, at, rot } from './models';", "import { box, cyl, cone, sph, mat, canvasTex, at, rot, toon } from './models';")
    s = s.replace("const roofMat = new THREE.MeshStandardMaterial({ color: '#d9534f', map: roofTex, roughness: 0.8 });", "const roofMat = toon({ color: '#d9534f', map: roofTex });")
    s = s.replace("new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 })", "toon({ map: floorTex })")
    return s


sub('src/world3d/house.ts', house)


# ---------- scene.ts: Parallel-Kamera, Toon-Boden, ohne Himmel/Wolken ----------
def scene(s):
    s = s.replace("import { canvasTex, mat } from './models';", "import { canvasTex, mat, toon } from './models';\nimport { PITCH } from './sprites';")
    s = s.replace("const CAM_OFFSET = new THREE.Vector3(0, 10, 10.4);", "const VIEW_H = 15; // sichtbare Höhe in Einheiten (Bildschirm)\nconst CAM_DIST = 70;\nconst CAM_OFFSET = new THREE.Vector3(0, CAM_DIST * Math.sin(PITCH), CAM_DIST * Math.cos(PITCH));")
    s = s.replace("  renderer.toneMapping = THREE.ACESFilmicToneMapping;\n  renderer.toneMappingExposure = 1.05;\n", "  renderer.toneMapping = THREE.NoToneMapping;\n")
    s = s.replace("const HORIZON = new THREE.Color('#d3ecf7');", "const HORIZON = new THREE.Color('#bfe6f5');")
    s = s.replace("scene.fog = new THREE.Fog(HORIZON, 30, 92);", "scene.fog = new THREE.Fog(HORIZON, 74, 135);")
    s = s.replace("const camera = new THREE.PerspectiveCamera(42, VW / VH, 0.5, 400);", "const asp = VW / VH;\n  const camera = new THREE.OrthographicCamera((-VIEW_H * asp) / 2, (VIEW_H * asp) / 2, VIEW_H / 2, -VIEW_H / 2, 1, 260);")
    s = s.replace("scene.add(new THREE.HemisphereLight('#cfe8ff', '#7a9a5a', 1.05));\n  const sun = new THREE.DirectionalLight('#fff1d0', 2.4);", "scene.add(new THREE.HemisphereLight('#ffffff', '#9ab87a', 1.55));\n  const sun = new THREE.DirectionalLight('#fff3d6', 1.5);")
    a = s.index("  /* Himmel: Farbverlauf-Kuppel + Wolken */")
    b = s.index("  /* Untergrund außerhalb der Welt */")
    s = s[:a] + s[b:]
    s = s.replace("new THREE.MeshStandardMaterial({ color: '#5f9a55', roughness: 1 })", "toon({ color: '#5f9a55' })")
    s = s.replace("const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));", "const mesh = new THREE.Mesh(geo, toon({ map: tex }));")
    s = s.replace("      camera.position.set(cam.x + CAM_OFFSET.x, CAM_OFFSET.y, cam.z + CAM_OFFSET.z);\n      camera.lookAt(cam.x, 0.8, cam.z - 0.4);", "      camera.position.set(cam.x + CAM_OFFSET.x, CAM_OFFSET.y, cam.z + CAM_OFFSET.z);\n      camera.lookAt(cam.x, 0.6, cam.z);")
    s = s.replace("      sky.position.copy(camera.position);\n", "")
    s = s.replace("      clouds.children.forEach((c) => { c.position.x += c.userData.sp * 0.016; if (c.position.x > 130) c.position.x = -130; });\n", "")
    s = s.replace("for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {", "for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {")
    s = s.replace("const ext = 20;", "const ext = 18;")
    s = s.replace("new THREE.MeshStandardMaterial({ map: waveTex, transparent: true, opacity: 0.78, roughness: 0.2, metalness: 0.1, emissive: '#1d5f94', emissiveIntensity: 0.25 })", "new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0.8 })")
    return s


sub('src/world3d/scene.ts', scene)
print('ok')
