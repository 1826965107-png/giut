// 第一/二关场景预算探针（不渲染，只统计真实场景图）。
// 由 tools/level12-budget.cjs 抽模块后追加执行；输出一行 BUDGET <json>。
function __visChain(o) {
  let n = o;
  while (n) { if (!n.visible) return false; n = n.parent; }
  return true;
}

function __budgetSnapshot(label) {
  let meshes = 0, visMeshes = 0, instanced = 0, instCount = 0, triangles = 0, visTriangles = 0;
  let lights = 0, visLights = 0, shadowCasters = 0;
  const matSet = new Set(), geoSet = new Set(), texSet = new Set();
  scene.traverse(o => {
    if (o.isMesh || o.isInstancedMesh) {
      const n = o.isInstancedMesh ? o.count : 1;
      const vis = __visChain(o);
      meshes++; if (vis) visMeshes++;
      if (o.isInstancedMesh) { instanced++; instCount += n; }
      let t = 0;
      if (o.geometry) {
        geoSet.add(o.geometry.uuid);
        if (o.geometry.index) t = o.geometry.index.count / 3;
        else if (o.geometry.attributes && o.geometry.attributes.position) t = o.geometry.attributes.position.count / 3;
        triangles += t * n;
        if (vis) visTriangles += t * n;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        matSet.add(m.uuid);
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
          if (m[k] && m[k].uuid) texSet.add(m[k].uuid);
        }
      }
      if (o.castShadow) shadowCasters++;
    }
    if (o.isLight) { lights++; if (__visChain(o) && o.intensity > 0) visLights++; }
  });
  return {
    label,
    meshes, visMeshes, instanced, instCount,
    triangles: Math.round(triangles), visTriangles: Math.round(visTriangles),
    lights, visLights, shadowCasters,
    materials: matSet.size, geometries: geoSet.size, textures: texSet.size
  };
}

// 按水平区域统计（四个关卡同处一个场景，只能靠坐标区分各自预算）
function __budgetRegion(label, rx1, rx2, rz1, rz2) {
  const v = new THREE.Vector3();
  let meshes = 0, instanced = 0, instCount = 0, triangles = 0, lights = 0, lightsOn = 0, shadowCasters = 0;
  const matSet = new Set(), geoSet = new Set(), texSet = new Set();
  scene.traverse(o => {
    if (!(o.isMesh || o.isInstancedMesh) && !o.isLight) return;
    o.getWorldPosition(v);
    if (v.x < rx1 || v.x > rx2 || v.z < rz1 || v.z > rz2) return;
    if (o.isLight) {
      lights++;
      if (o.intensity > 0) lightsOn++;
      return;
    }
    const n = o.isInstancedMesh ? o.count : 1;
    meshes++;
    if (o.isInstancedMesh) { instanced++; instCount += n; }
    let t = 0;
    if (o.geometry) {
      geoSet.add(o.geometry.uuid);
      if (o.geometry.index) t = o.geometry.index.count / 3;
      else if (o.geometry.attributes && o.geometry.attributes.position) t = o.geometry.attributes.position.count / 3;
      triangles += t * n;
    }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      matSet.add(m.uuid);
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
        if (m[k] && m[k].uuid) texSet.add(m[k].uuid);
      }
    }
    if (o.castShadow) shadowCasters++;
  });
  return {
    label, meshes, instanced, instCount, triangles: Math.round(triangles),
    lights, lightsOn, shadowCasters,
    materials: matSet.size, geometries: geoSet.size, textures: texSet.size
  };
}

resetGame();
const bL0 = __budgetRegion('L0', -152, -62, -26, 26);
const scene0 = __budgetSnapshot('scene');
const l0LightEntries = l0Lights.length;
enterPoolroomsPreview(3, 20);
const bL37 = __budgetRegion('L37', -30, 32, -30, 26);
const poolLightEntries = poolLights.length;
const lockerLightEntries = lockerLights.length;
console.log('BUDGET ' + JSON.stringify({
  L0: bL0, L37: bL37, sceneAll: scene0,
  l0LightEntries, poolLightEntries, lockerLightEntries,
  pools: POOLS.map(p => ({ name: p.name, w: p.x2 - p.x1, len: p.zEnd - p.zDeep1, bottom: p.bottom, water: p.water, steps: p.stairs ? p.stairs.steps.length : 0 })),
  pickups: pickups.map(p => ({ kind: p.kind, body: p.body, x: p.x, z: p.z, waterY: p.waterY })),
  collidersL0: COLLIDERS_L0.length, collidersL37: COLLIDERS.length
}, null, 1));