# Einmaliges Hilfsskript: Mia schlanker (längere Beine, schmalerer Körper), Figuren insgesamt kleiner.
def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


def models(s):
    s = s.replace("body.position.y = 0.66;", "body.position.y = 0.9;")
    s = s.replace("body.add(sph(0.5, OR, 0.86, 0.82, 1.22, 18));", "body.add(sph(0.5, OR, 0.72, 0.72, 1.3, 18));")
    s = s.replace("body.add(at(sph(0.42, CR, 0.82, 0.6, 1.0, 14), 0, -0.2, 0.12));", "body.add(at(sph(0.42, CR, 0.66, 0.5, 1.05, 14), 0, -0.17, 0.12));")
    s = s.replace("0, 0.38 - Math.abs(i - 1.5) * 0.03, -0.38 + i * 0.26", "0, 0.34 - Math.abs(i - 1.5) * 0.03, -0.42 + i * 0.28")
    s = s.replace("head.position.set(0, 0.58, 0.58);", "head.position.set(0, 0.5, 0.66);")
    s = s.replace("head.add(sph(0.43, OR, 1.06, 0.92, 0.96, 18));", "head.add(sph(0.37, OR, 1.06, 0.92, 0.96, 18));")
    s = s.replace("head.add(at(sph(0.2, CR, 1, 0.72, 0.8, 12), 0, -0.13, 0.33));", "head.add(at(sph(0.17, CR, 1, 0.72, 0.8, 12), 0, -0.11, 0.29));")
    s = s.replace("head.add(at(sph(0.05, PK, 1.2, 0.8, 0.8, 8), 0, -0.04, 0.43));", "head.add(at(sph(0.045, PK, 1.2, 0.8, 0.8, 8), 0, -0.04, 0.37));")
    s = s.replace("sx * 0.17, 0.08, 0.37);\n    head.add(e);", "sx * 0.15, 0.07, 0.32);\n    head.add(e);")
    s = s.replace("sx * 0.17 + 0.02, 0.13, 0.41)", "sx * 0.15 + 0.02, 0.12, 0.36)")
    s = s.replace("ear.position.set(sx * 0.27, 0.36, -0.02);", "ear.position.set(sx * 0.23, 0.31, -0.02);")
    s = s.replace("at(wh, sx * 0.36, -0.1 + w * 0.045, 0.36);", "at(wh, sx * 0.32, -0.1 + w * 0.045, 0.3);")
    s = s.replace("[[-0.24, 0.4, 0], [0.24, 0.4, Math.PI], [-0.24, -0.4, Math.PI], [0.24, -0.4, 0]]", "[[-0.2, 0.46, 0], [0.2, 0.46, Math.PI], [-0.2, -0.46, Math.PI], [0.2, -0.46, 0]]")
    s = s.replace("g.position.set(lx, 0.42, lz);\n    g.add(at(cyl(0.085, 0.07, 0.46, OR, 8), 0, -0.23, 0), at(sph(0.1, CR, 1, 0.65, 1.35, 8), 0, -0.46, 0.04));",
                  "g.position.set(lx, 0.62, lz);\n    g.add(at(cyl(0.075, 0.06, 0.66, OR, 8), 0, -0.33, 0), at(sph(0.09, CR, 1, 0.65, 1.35, 8), 0, -0.66, 0.04));")
    s = s.replace("s.position.set(0, i === 0 ? 0.12 : 0.27, i === 0 ? -0.58 : 0);", "s.position.set(0, i === 0 ? 0.1 : 0.27, i === 0 ? -0.66 : 0);")
    s = s.replace("body.position.y = 0.66 + (moving", "body.position.y = 0.9 + (moving")
    # Tiere kleiner/schlanker
    s = s.replace("g.scale.setScalar(1.15);\n  return { root: g, update: (t) => { body.scale.y", "g.scale.set(0.95, 1.0, 0.95);\n  return { root: g, update: (t) => { body.scale.y")
    s = s.replace("g.scale.setScalar(1.1);\n  return { root: g, update: (t) => (g.scale.y = 1.1", "g.scale.setScalar(0.9);\n  return { root: g, update: (t) => (g.scale.y = 0.9")
    s = s.replace("g.scale.setScalar(1.05);\n  return { root: g, update: (t) => (head.rotation.y", "g.scale.setScalar(0.88);\n  return { root: g, update: (t) => (head.rotation.y")
    s = s.replace("g.scale.setScalar(1.05);\n  return { root: g, update: (t) => { head.rotation.z", "g.scale.set(0.85, 0.95, 0.85);\n  return { root: g, update: (t) => { head.rotation.z")
    s = s.replace("g.scale.setScalar(1.1);\n  return { root: g, update: (t) => { tail.rotation.y", "g.scale.set(0.85, 0.95, 0.85);\n  return { root: g, update: (t) => { tail.rotation.y")
    return s


sub('src/world3d/models.ts', models)
sub('src/world/worldScreen.ts', lambda s: s.replace("  const miaRig = M.createMia(equippedFor('mia'));\n  scene.add(miaRig.root);",
                                                    "  const miaRig = M.createMia(equippedFor('mia'));\n  miaRig.root.scale.setScalar(0.82); // schlanker und kleiner als zuvor\n  scene.add(miaRig.root);").replace("sq.root.scale.setScalar(1.3);", "sq.root.scale.setScalar(1.0);"))
sub('src/world3d/scene.ts', lambda s: s.replace("new THREE.Vector3(0, 11.2, 11.2)", "new THREE.Vector3(0, 10, 10.4)"))
print('ok')
