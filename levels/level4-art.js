// Codex owns the visual direction and texture assets. DSH consumes this API.
// Distinct from gameplay state; all variants are allocated before first render.
export const L4_ART = Object.freeze({
  palette: { background: 0x020405, fog: 0x040709, concrete: 0x929b99, steel: 0x222d30,
    rust: 0x5c4030, enamel: 0xb3beb5, vinyl: 0x97aca6, amber: 0xb78043 },
  lighting: { hemi: 0.025, fogDensity: 0.078, flashlight: 70, flashlightAngle: 0.50,
    flashlightPenumbra: 0.70, flashlightDistance: 19, flashlightDecay: 1.5,
    carEmergency: 0.65, emergencyColor: 0xb8935d },
  textures: { concrete: 'textures/l4-damp-concrete.png', enamel: 'textures/l4-aged-enamel.png',
    vinyl: 'textures/l4-worn-vinyl.png' },
});

export function createLevel4Art({ THREE }) {
  const pending = [];
  const failedTextures = [];
  const loader = new THREE.TextureLoader();
  function texture(path) {
    let finish;
    const loaded = new Promise(resolve => { finish = resolve; });
    const map = loader.load(path, () => finish(), undefined, () => { failedTextures.push(path); finish(); });
    pending.push(loaded);
    // Mirrored sampling keeps edge texels continuous without baking an atlas.
    // Geometry UV periods at the tunnel seam must span an even tile count.
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }
  const concreteMap = texture(L4_ART.textures.concrete);
  const enamelMap = texture(L4_ART.textures.enamel);
  const vinylMap = texture(L4_ART.textures.vinyl);
  const material = (color, roughness, metalness, map) => new THREE.MeshStandardMaterial({
    color, roughness, metalness, ...(map ? { map } : {}),
  });
  const materials = {
    concrete: material(L4_ART.palette.concrete, 0.96, 0.02, concreteMap),
    walkway: material(0x676f6c, 0.94, 0.04, concreteMap),
    normalEnamel: material(0x98a39a, 0.57, 0.25),
    agedEnamel: material(L4_ART.palette.enamel, 0.9, 0.16, enamelMap),
    agedCeiling: material(0x7d857b, 0.94, 0.07, enamelMap),
    agedVinyl: material(L4_ART.palette.vinyl, 0.83, 0.02, vinylMap),
    steel: material(L4_ART.palette.steel, 0.65, 0.7),
    rust: material(L4_ART.palette.rust, 0.98, 0.14, enamelMap),
    rubber: material(0x0d1516, 0.94, 0),
    battery: material(0x8d8b73, 0.58, 0.62),
    key: material(0x9a7950, 0.56, 0.7),
    glass: new THREE.MeshStandardMaterial({color: 0x101e20, roughness: 0.28,
      metalness: 0.16, transparent: true, opacity: 0.68, depthWrite: false}),
    emergency: new THREE.MeshStandardMaterial({color: 0xa08153, roughness: 0.7,
      emissive: 0x7d4b20, emissiveIntensity: 0.38}),
  };
  materials.concrete.bumpMap = concreteMap;
  materials.concrete.bumpScale = 0.026;
  materials.walkway.bumpMap = concreteMap;
  materials.walkway.bumpScale = 0.018;
  materials.agedEnamel.bumpMap = enamelMap;
  materials.agedEnamel.bumpScale = 0.008;
  materials.agedCeiling.bumpMap = enamelMap;
  materials.agedCeiling.bumpScale = 0.006;
  materials.agedVinyl.bumpMap = vinylMap;
  materials.agedVinyl.bumpScale = 0.009;
  // Small utilitarian markings keep the pickup readable as a battery in the beam.
  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 256; cellCanvas.height = 128;
  const ink = cellCanvas.getContext('2d');
  ink.fillStyle = '#9d9c83'; ink.fillRect(0, 0, 256, 128);
  ink.fillStyle = '#222b28'; ink.fillRect(0, 18, 256, 93);
  ink.fillStyle = '#b1b39c'; ink.font = 'bold 27px monospace';
  ink.fillText('LR20', 28, 53); ink.font = '17px monospace';
  ink.fillText('1.5 V  /  CELL', 28, 81);
  ink.fillStyle = '#73663e'; ink.fillRect(0, 5, 256, 5); ink.fillRect(0, 117, 256, 4);
  const cellMap = new THREE.CanvasTexture(cellCanvas); cellMap.colorSpace = THREE.SRGBColorSpace;
  materials.battery.map = cellMap;
  materials.battery.roughness = 0.73;
  return { materials, palette: L4_ART.palette, lighting: L4_ART.lighting,
    ready: Promise.all(pending), failedTextures, prewarmMaterials: Object.values(materials) };
}
