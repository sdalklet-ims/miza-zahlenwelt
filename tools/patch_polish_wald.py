# Einmaliges Hilfsskript: kleine Animationen und Details (Gras weicht Mia aus, Laub/Blüten, Teich-Spritzer, Truhen-Glitzer, Pilz-Sporen, Tiere freuen sich)
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


ed('src/world3d/decor.ts', [
    ("export const windUniform = { value: 0 };\n\nfunction wind(m: THREE.MeshToonMaterial, amp: number, base: number) {\n  m.onBeforeCompile = (sh) => {\n    sh.uniforms.uTime = windUniform;\n    sh.vertexShader = 'uniform float uTime;\\n' + sh.vertexShader.replace(",
     "export const windUniform = { value: 0 };\n/** Mias Position (Welt-Einheiten): Gras in der Nähe biegt sich weg */\nexport const playerUniform = { value: new THREE.Vector3(1e6, 0, 1e6) };\n\nfunction wind(m: THREE.MeshToonMaterial, amp: number, base: number, push = 0) {\n  m.onBeforeCompile = (sh) => {\n    sh.uniforms.uTime = windUniform;\n    sh.uniforms.uPlayer = playerUniform;\n    sh.vertexShader = 'uniform float uTime;\\nuniform vec3 uPlayer;\\n' + sh.vertexShader.replace("),
    ("         transformed.z += cos(ph * 0.8) * sw * sw * ${(amp * 0.7).toFixed(3)};\n       #endif`",
     "         transformed.z += cos(ph * 0.8) * sw * sw * ${(amp * 0.7).toFixed(3)};\n         ${push ? `\n         vec2 dd = vec2(instanceMatrix[3].x - uPlayer.x, instanceMatrix[3].z - uPlayer.z);\n         float dl = length(dd);\n         float pu = ${push.toFixed(2)} * smoothstep(1.7, 0.15, dl) * sw;\n         mat3 im = mat3(instanceMatrix);\n         vec3 ld = transpose(im) * vec3(dd.x, 0.0, dd.y) / max(dl, 0.05);\n         transformed.xz += ld.xz / max(dot(im[0], im[0]), 0.0001) * pu;` : ''}\n       #endif`"),
    ("const grass = instanced(tuft, wind(gm, 0.25, 0.0), grassItems, 1, false);", "const grass = instanced(tuft, wind(gm, 0.25, 0.0, 1.25), grassItems, 1, false);"),
])

ed('src/world/worldScreen.ts', [
    ("import { buildDecor, windUniform } from '../world3d/decor';", "import { buildDecor, playerUniform, windUniform } from '../world3d/decor';"),
    ("    windUniform.value = timeSec;", "    windUniform.value = timeSec;\n    playerUniform.value.set(st.x * S, 0, st.y * S);"),
    # NPCs: sanftes Schaukeln, Freudenhüpfer bei Annäherung
    ("        if (k === 'bee' || k === 'butterfly' || k === 'grasshopper' || k === 'snail') nv.fig.mesh.scale.x = st.x < nv.ent.x ? -1 : 1; // schaut zu Mia",
     "        if (k === 'bee' || k === 'butterfly' || k === 'grasshopper' || k === 'snail') nv.fig.mesh.scale.x = st.x < nv.ent.x ? -1 : 1; // schaut zu Mia\n        nv.fig.mesh.rotation.z = Math.sin(timeSec * 1.3 + nv.ent.x * 0.01) * 0.022; // wiegt sich leicht\n        if (!lift && k !== 'fox' && !PROC_KINDS.includes(k)) { // freut sich, wenn Mia nah ist: kleine Hüpfer\n          const near = d < 300 ? 1 : 0, hop = near ? Math.pow(Math.max(0, Math.sin(timeSec * 3.4 + nv.ent.x)), 3) * 0.2 : 0;\n          nv.root.position.y = heightAt(nv.ent.x, nv.ent.y) + hop;\n        }"),
    # Umgebungseffekte
    ("    if (shakeFog > 0) shakeFog = Math.max(0, shakeFog - DT);", "    if (shakeFog > 0) shakeFog = Math.max(0, shakeFog - DT);\n    ambientFx(DT);"),
    ("  function update() {", """  /* ── Umgebung: fallendes Laub und Blüten, Teich-Spritzer, glitzernde Truhen, Pilz-Sporen ── */
  const ambient: Record<string, number> = {};
  const tick = (key: string, every: number, dt: number) => ((ambient[key] = (ambient[key] ?? Math.random() * every) - dt) <= 0 ? ((ambient[key] = every * (0.6 + Math.random() * 0.8)), true) : false);
  function ambientFx(dt: number) {
    const zone = zoneIndex(st.x);
    const leaf = zone === 0 ? ['#e9a24b', '#d9704a', '#9bd17a', '#f2c14a'] : zone === 1 ? ['#ff8fab', '#ffffff', '#ffd166'] : [];
    if (leaf.length && tick('leaf', 0.45, dt)) {
      const ang = Math.random() * 6.28, rr = 2 + Math.random() * 9;
      fx.add(st.x * S + Math.cos(ang) * rr, 7.5 + Math.random() * 2, st.y * S + Math.sin(ang) * rr * 0.8, (Math.random() - 0.5) * 0.8, -(0.7 + Math.random() * 0.5), (Math.random() - 0.5) * 0.5, 9, zone === 0 ? 0.2 : 0.15, leaf[Math.floor(Math.random() * leaf.length)]);
    }
    for (const nv of npcViews) {
      const e = nv.ent, d = Math.hypot(e.x - st.x, e.y - st.y);
      if (d > 760) continue;
      const gy = heightAt(e.x, e.y), key = e.id;
      if (e.kind === 'pond' && tick('p' + key, 5.5, dt)) { // ein Fisch springt: Spritzer und Wellenringe
        const px = e.x * S + (Math.random() - 0.5) * 2.4, pz = e.y * S + (Math.random() - 0.5) * 1.6;
        for (let i = 0; i < 12; i++) fx.add(px, gy + 0.25, pz, (Math.random() - 0.5) * 1.6, 2.6 + Math.random() * 2, (Math.random() - 0.5) * 1.2, 0.9, 0.16, i % 3 ? '#bfe8ff' : '#ffffff', -9);
        sfx.pop();
      }
      if (e.kind === 'chest' && tick('c' + key, 0.5, dt)) fx.add(e.x * S + (Math.random() - 0.5) * 1.2, gy + 0.9 + Math.random() * 0.6, e.y * S + (Math.random() - 0.5) * 0.6, 0, 0.5, 0, 1.2, 0.2, Math.random() < 0.5 ? '#ffe27a' : '#ffffff');
      if (e.kind === 'shroom' && tick('s' + key, 0.35, dt)) fx.add(e.x * S + (Math.random() - 0.5) * 4, gy + 0.3, e.y * S + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.3, 0.45, (Math.random() - 0.5) * 0.3, 3.5, 0.16, Math.random() < 0.5 ? '#ffe9a0' : '#ffd6f0');
    }
  }

  function update() {"""),
])
print('ok')
