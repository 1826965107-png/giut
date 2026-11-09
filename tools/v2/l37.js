/* ==== Level 37 · 温泉会所（v2） ==== */
/* 一套材料家族：暖灰米色防滑石砖地 / 暖白矿物墙 / 灰绿石质小砖池内 / 烟熏浅木 / 深铜灰五金。
   五张 v2 资产就位后只改 L12_V2_TEX 开关即可切换；此前的旧图保留在工作区，不覆盖。 */
const L12_TEX_DIR = 'assets-v2';     // 规格目标是 textures/；该目录当前被沙箱拒绝写入，已报审批
const L12_V2_TEX = true;
const L12_TEX = {
  floor: L12_V2_TEX ? L12_TEX_DIR + '/l12-v2-spa-floor.png' : 'textures/pool-floor.png',
  plaster: L12_V2_TEX ? L12_TEX_DIR + '/l12-v2-spa-plaster.png' : 'textures/pool-tiles-white.png',
  mosaic: L12_V2_TEX ? L12_TEX_DIR + '/l12-v2-pool-mosaic.png' : 'textures/pool-mosaic-teal.png',
  wallpaper: L12_V2_TEX ? L12_TEX_DIR + '/l12-v2-wallpaper.png' : 'textures/wallpaper-yellow.png',
  carpet: L12_V2_TEX ? L12_TEX_DIR + '/l12-v2-carpet.png' : 'textures/carpet-dark.png'
};
const L12_COV = { floor: 2.4, plaster: 2.0, mosaic: 0.4 };

const l37WallMat = matFor({ diffuse: L12_TEX.plaster, coverageX: L12_COV.plaster, coverageY: L12_COV.plaster },
  1 / L12_COV.plaster, 1 / L12_COV.plaster, { ns: 0.14, roughness: 0.9, metalness: 0.0, env: 0.28, color: 0xf3efe6 });
l37WallMat.roughnessMap = null;
const l37EchoFloorMat = matFor({ diffuse: L12_TEX.floor, coverageX: L12_COV.floor, coverageY: L12_COV.floor },
  1 / L12_COV.floor, 1 / L12_COV.floor, { ns: 0.12, roughness: 0.84, metalness: 0.0, env: 0.24, color: 0xe6e2d6 });
l37EchoFloorMat.roughnessMap = null; l37EchoFloorMat.name = 'l37EchoFloor';
const l37TrimMat = new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: 0.42, metalness: 0.62 });
const l37ColMat = matFor({ diffuse: L12_TEX.plaster, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.12, roughness: 0.86, metalness: 0.0, color: 0xf1ece2 });
const l37WoodMat = matFor({ diffuse: L12_TEX.wallpaper, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.10, roughness: 0.72, metalness: 0.0, color: 0xa98d6a });
const l37CeilMat = matFor({ diffuse: L12_TEX.plaster, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.08, roughness: 0.94, metalness: 0.0, color: 0xe9e5db });
const l37BackCeilMat = matFor({ diffuse: L12_TEX.plaster, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.10, roughness: 0.95, metalness: 0.0, color: 0xbfbcb2 });
const l37MosaicMat = matFor({ diffuse: L12_TEX.mosaic, coverageX: L12_COV.mosaic, coverageY: L12_COV.mosaic },
  1 / L12_COV.mosaic, 1 / L12_COV.mosaic, { ns: 0.10, roughness: 0.55, metalness: 0.0, env: 0.3, color: 0x9fb8ad });
const l37LockerDoors = new THREE.MeshStandardMaterial({ color: 0x8a7256, roughness: 0.68, metalness: 0.05 });

const l37WallPieces = [], l37Headers = [], l37Windows = [], l37DeckSigns = [], l37ColumnBases = [], l37RoomPlan = L37_ROOMS;
const l37WallMatFor = (kind) => (kind === 'equip' ? l37BackCeilMat : l37WallMat);

/* ---------------- 地面：整层一块 deck，四个水体开洞 ---------------- */
const L37_HOLES = POOLS.map(p => [p.x1 - 0.06, p.zDeep1 - 0.06, p.x2 + 0.06, p.zEnd + 0.06]);
addDeck(-30, -30, 30, 30, L37_HOLES, { diffuse: L12_TEX.floor, coverageX: L12_COV.floor, coverageY: L12_COV.floor },
  { mat: l37EchoFloorMat });

/* ---------------- 外壳：墙 / 门洞 / 门楣 / 门套 / 天花 全部由同一份平面数据生成 ---------------- */
const l37Plan = planBuildShell(L37_ROOMS, L37_DOORS, {
  t: 0.24, cov: L12_COV.plaster, wallMat: l37WallMat, ceilMat: l37CeilMat, casingMat: l37TrimMat,
  wallKind: 'poolWall', headerKind: 'poolHeader'
});
for (const w of l37Plan.walls) l37WallPieces.push(w);
for (const h of l37Plan.headers) l37Headers.push(h);
/* 设备间 / 桑拿用旧矿棉板与木格栅天花，避免全馆纯黑面 */
for (const id of ['equip', 'sauna']) {
  const r = roomById(id);
  const w = r.x2 - r.x1, d = r.z2 - r.z1;
  const geo = new THREE.PlaneGeometry(w - 0.06, d - 0.06);
  scaleUV(geo, 1 / 2, 1 / 2);
  const slab = new THREE.Mesh(geo, id === 'sauna' ? l37WoodMat : l37BackCeilMat);
  slab.rotation.x = Math.PI / 2; slab.position.set((r.x1 + r.x2) / 2, r.h - 0.06, (r.z1 + r.z2) / 2);
  scene.add(slab);
}

/* ---------------- 立柱：柱头 / 柱身 / 柱脚三段，柱脚登记真实几何供标识避让 ---------------- */
function l37Column(x, z, o = {}) {
  const s = o.s == null ? 0.6 : o.s;
  const h = o.h == null ? H : o.h;
  const body = addWorldUVBox(s, h, s, x, h / 2, z, o.mat || l37ColMat, 2);
  addBox(s + 0.12, 0.14, s + 0.12, x, h - 0.07, z, l37TrimMat);          // 柱头
  const base = addBox(s + 0.16, 0.12, s + 0.16, x, 0.06, z, l37TrimMat);  // 柱脚（0.12 高）
  COLLIDERS.push({ x1: x - s / 2, x2: x + s / 2, z1: z - s / 2, z2: z + s / 2, y1: 0, y2: h, kind: 'column' });
  l37ColumnBases.push({ x, z, w: s + 0.16, mesh: base });
  return { body, base, h };
}

/* ---------------- 池壁排水格栅（实例化，收边不走样） ---------------- */
function l37DrainGrid(p) {
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), l37TrimMat, 40);
  const m = new THREE.Matrix4();
  let i = 0;
  const y = 0.012;
  for (let x = p.x1 + 0.7; x < p.x2 - 0.4 && i < 40; x += 0.62) {
    m.makeTranslation(x, y, p.zEnd + 0.3); inst.setMatrixAt(i++, m);
  }
  inst.count = i; inst.instanceMatrix.needsUpdate = true; inst.receiveShadow = true;
  scene.add(inst); return inst;
}

/* ---------------- 水体：池底 / 四壁 / 台阶 / 溢流 / 水面（同一 stairs 数据供地面查询） ---------------- */
const basinMats = [];
const rimTilesMat = matFor(rimTiles, 1 / 0.13, 1 / 0.13, { ns: 0.2, roughness: 0.6, metalness: 0.1 });
function buildPool(p) {
  const W = p.x2 - p.x1, L = p.zEnd - p.zDeep1, cx = (p.x1 + p.x2) / 2, cz = (p.zDeep1 + p.zEnd) / 2;
  const stair = p.stairs;
  const poolMat = matFor({ diffuse: L12_TEX.mosaic, coverageX: L12_COV.mosaic, coverageY: L12_COV.mosaic },
    1 / L12_COV.mosaic, 1 / L12_COV.mosaic, { ns: 0.10, roughness: 0.5, metalness: 0.0, env: 0.34, color: 0x9fb2a8 });
  basinMats.push(poolMat);
  const bottom = addWorldUVBox(W, 0.12, L, cx, p.bottom - 0.06, cz, poolMat, L12_COV.mosaic);
  bottom.receiveShadow = true;
  // 四壁（南端留台阶缺口）
  const wallT = 0.12;
  addWorldUVBox(W, p.water - p.bottom + 0.3, wallT, cx, (p.bottom + p.water + 0.3) / 2, p.zDeep1 + wallT / 2, poolMat, L12_COV.mosaic);
  addWorldUVBox(wallT, p.water - p.bottom + 0.3, L, p.x1 + wallT / 2, (p.bottom + p.water + 0.3) / 2, cz, poolMat, L12_COV.mosaic);
  addWorldUVBox(wallT, p.water - p.bottom + 0.3, L, p.x2 - wallT / 2, (p.bottom + p.water + 0.3) / 2, cz, poolMat, L12_COV.mosaic);
  addWorldUVBox(stair.x1 - p.x1, p.water - p.bottom + 0.3, wallT, (p.x1 + stair.x1) / 2, (p.bottom + p.water + 0.3) / 2, p.zEnd - wallT / 2, poolMat, L12_COV.mosaic);
  addWorldUVBox(p.x2 - stair.x2, p.water - p.bottom + 0.3, wallT, (stair.x2 + p.x2) / 2, (p.bottom + p.water + 0.3) / 2, p.zEnd - wallT / 2, poolMat, L12_COV.mosaic);
  // 池壁碰撞：站立时挡住，入水/腾空时可以被水面覆盖
  COLLIDERS.push({ x1: p.x1 - 0.06, x2: p.x1 + wallT, z1: p.zDeep1, z2: p.zEnd, y1: p.bottom, y2: p.water + 0.3, kind: 'poolSide', poolSide: true });
  COLLIDERS.push({ x1: p.x2 - wallT, x2: p.x2 + 0.06, z1: p.zDeep1, z2: p.zEnd, y1: p.bottom, y2: p.water + 0.3, kind: 'poolSide', poolSide: true });
  COLLIDERS.push({ x1: p.x1, x2: p.x2, z1: p.zDeep1 - 0.06, z2: p.zDeep1 + wallT, y1: p.bottom, y2: p.water + 0.3, kind: 'poolSide', poolSide: true });
  // 台阶：网格与 groundAt 共用 p.stairs.steps
  for (const s of stair.steps) {
    const h = s.top - p.bottom, dz = s.z2 - s.z1;
    const step = addWorldUVBox(stair.x2 - stair.x1, h, dz, (stair.x1 + stair.x2) / 2, p.bottom + h / 2, (s.z1 + s.z2) / 2, poolMat, L12_COV.mosaic);
    step.receiveShadow = true;
  }
  // 溢流槽 / 池沿收边
  const rim = 0.34;
  for (const [x, z, w, d] of [[cx, p.zDeep1 - rim / 2, W + rim * 2, rim], [cx, p.zEnd + rim / 2, W + rim * 2, rim]]) {
    addWorldUVBox(w, 0.05, d, x, 0.025, z, rimTilesMat, 0.13);
  }
  for (const x of [p.x1 - rim / 2, p.x2 + rim / 2]) addWorldUVBox(rim, 0.05, L, x, 0.025, cz, rimTilesMat, 0.13);
  l37DrainGrid(p);
  if (p.lanes) {
    const laneW = W / p.lanes;
    const laneMat = new THREE.MeshStandardMaterial({ color: 0x1d3f46, roughness: 0.6 });
    for (let i = 1; i < p.lanes; i++) {
      const x = p.x1 + laneW * i;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.06, L - 0.6), laneMat);
      line.rotation.x = -Math.PI / 2; line.position.set(x, p.bottom + 0.012, cz);
      scene.add(line);
    }
    const ropeMat = new THREE.MeshStandardMaterial({ map: makeRopeTexture(), roughness: 0.6 });
    for (let i = 1; i < p.lanes; i++) {
      const x = p.x1 + laneW * i;
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L - 0.4, 8), ropeMat);
      rope.rotation.x = Math.PI / 2; rope.position.set(x, p.water + 0.045, cz);
      scene.add(rope);
    }
  }
  // 不锈钢扶梯（主池两端各一组）
  if (p.lanes) {
    for (const z of [p.zDeep1 + 0.9, p.zEnd - 0.9]) {
      for (const dx of [-0.85, 0.85]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.9, 8), l37TrimMat);
        rail.position.set(p.x1 + 0.55 + dx * 0.0 + dx, p.water + 0.5, z);
        rail.rotation.z = Math.PI / 2; rail.position.x = p.x1 + 0.55 + dx;
        rail.position.y = p.water + 0.55;
        scene.add(rail);
      }
    }
  }
  // 桑拿 / 静汤池坐台
  if (p.bench) {
    addWorldUVBox(W - 0.4, 0.42, 0.7, cx, p.water - 0.28, p.zDeep1 + 0.55, l37WoodMat, 2);
  }
  // 水面：静水（法线水平分量压到 0.045），假深度分色
  const geo = new THREE.PlaneGeometry(W + 0.02, L + 0.02);
  const water = new Water(geo, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: makeAINormalTexture('textures/water-surface.png', 7, 5),
    sunDirection: new THREE.Vector3(0, 1, 0).normalize(), sunColor: 0xd8e8ef,
    waterColor: 0x2b6f74, distortionScale: 0.10, fog: true
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, p.water, cz);
  water.material.transparent = true;
  water.material.uniforms.alpha.value = 0.62;
  water.material.depthWrite = false;
  const fs0 = water.material.fragmentShader;
  water.material.uniforms.rect = { value: new THREE.Vector4(p.x1, p.zDeep1, p.x2, p.zEnd) };
  water.material.uniforms.maxDepth = { value: p.water - p.bottom };
  let fs = 'uniform vec4 rect;\nuniform float maxDepth;\n' + fs0;
  fs = fs.replace('void main() {', `void main() {
    float dx = clamp((vUv.x - (rect.x - (rect.z - rect.x) * 0.5)) / max(rect.z - rect.x, 0.001), 0.0, 1.0);
    float dz = clamp((vUv.y - (rect.y - (rect.w - rect.y) * 0.5)) / max(rect.w - rect.y, 0.001), 0.0, 1.0);
    float depth01 = 0.5 * (dx + dz);`);
  fs = fs.replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
    'vec3 surfaceNormal = normalize( noise.xzy * vec3( 0.045, 1.0, 0.045 ) );');
  fs = fs.replace(/gl_FragColor = vec4\( outgoingLight, alpha \);/,
    'vec3 wcol = mix(vec3(0.30,0.62,0.60), vec3(0.05,0.24,0.30), depth01);\n\tgl_FragColor = vec4( outgoingLight * wcol * 1.5, mix(0.42, 0.9, depth01) );');
  water.material.fragmentShader = fs;
  water.material.needsUpdate = true;
  water.material.onBeforeRender = () => { water.material.uniforms.time.value += 0.0006; };
  scene.add(water);
  p.waterMesh = water; waterMats.push(water.material);
  makeCaustics(W - 0.4, L - 0.4, cx, cz, p.bottom + 0.04, 0.0022);
  return water;
}
const rimTilesMat2 = null;
for (const p of POOLS) buildPool(p);

/* ---------------- 池深标识：固定位置、真实宽度，按柱脚几何避让 ---------------- */
function l37DeckSign(text, sub, x, z, ry, w = 1.5, h = 0.9) {
  const c = makeCanvas(512, Math.round(512 * h / w)), g = c.getContext('2d');
  g.fillStyle = '#12363c'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#7fd6cf'; g.lineWidth = 14; g.strokeRect(18, 18, c.width - 36, c.height - 36);
  g.fillStyle = '#eef7f4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(c.height * 0.40)}px system-ui, sans-serif`;
  g.fillText(text, c.width / 2, c.height * 0.42);
  g.font = `600 ${Math.round(c.height * 0.17)}px system-ui, sans-serif`;
  g.fillStyle = '#a8d8d2'; g.fillText(sub, c.width / 2, c.height * 0.72);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.0 }));
  mesh.rotation.set(-Math.PI / 2, 0, ry || 0);
  mesh.position.set(x, 0.016, z);
  mesh.receiveShadow = true; scene.add(mesh);
  l37DeckSigns.push({ text, sub, x, z, ry: ry || 0, w, h, mesh });
  return mesh;
}
l37DeckSign('2.00 m', '游泳主池 · 五泳道', 12.9, -0.4, 0, 1.9, 1.0);
l37DeckSign('0.90 m', '温热主汤池', -25.4, -14.2, 0, 1.7, 0.9);
l37DeckSign('0.48 m', '静汤池 · 坐凳', -11.0, -18.4, Math.PI, 1.4, 0.8);
l37DeckSign('1.20 m', '冷水池', -18.4, -9.2, 0, 1.2, 0.7);

/* ---------------- 天花与立面细节：梁、灯槽、门套线 ---------------- */
for (const [x, z, w, d] of [[0, 4, 60, 0.3], [0, -2, 60, 0.3], [6, -14, 0.3, 26], [-2, -14, 0.3, 26]]) {
  addBox(w, 0.26, d, x, H - 0.3, z, l37TrimMat);
}

/* ---------------- 灯光（固定 30 盏 + 半球 + 天光；不随帧创建） ---------------- */
const poolLights = [];
const lockerLights = [];
function l37Lamp(x, z, zone, o = {}) {
  const color = o.color == null ? 0xfff0d8 : o.color;
  const power = o.power == null ? 2.8 : o.power;
  const dist = o.dist == null ? 9.0 : o.dist;
  const y = o.y == null ? H - 0.22 : o.y;
  const light = new THREE.PointLight(color, power, dist, 2);
  light.position.set(x, y, z); scene.add(light);
  const fxMat = new THREE.MeshStandardMaterial({ color: 0x101413, emissive: color, emissiveIntensity: 3.6, roughness: 0.6 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(o.r == null ? 0.22 : o.r, 14), fxMat);
  disc.rotation.x = Math.PI / 2; disc.position.set(x, y + 0.02, z); scene.add(disc);
  const rec = { light, fxMat, base: power, zone };
  poolLights.push(rec);
  if (o.locker) lockerLights.push(rec);
  return rec;
}
// 接待 / 脱鞋
l37Lamp(0, 24, 'lobby', { power: 2.6, dist: 8.5 });
l37Lamp(-7, 21, 'lobby', { power: 2.0, dist: 7.5 });
l37Lamp(7, 21, 'lobby', { power: 2.0, dist: 7.5 });
l37Lamp(0, 14, 'shoe', { power: 2.2, dist: 7.5 });
l37Lamp(-3.4, 9, 'wet', { power: 2.3, dist: 8 });
l37Lamp(3.4, 9, 'wet', { power: 2.3, dist: 8 });
// 更衣（可闪）
for (const [x, z] of [[-22, 9], [-14, 9], [-22, 12.4], [14, 9], [22, 9], [22, 12.4]]) l37Lamp(x, z, 'locker', { power: 2.2, dist: 8, locker: true });
// 淋浴
for (const [x, z] of [[-22, 1], [-14, 1], [14, 1], [22, 1]]) l37Lamp(x, z, 'shower', { power: 1.9, dist: 7.5, color: 0xeaf4ff });
// 泳池厅
for (const [x, z] of [[8, -8], [16, -8], [8, -20], [16, -20], [26, -18], [26, -6]]) l37Lamp(x, z, 'pool', { power: 2.9, dist: 10 });
// 温泉厅（暖光）
for (const [x, z] of [[-26, -10], [-16, -8], [-8, -12], [-26, -22], [-16, -24], [-8, -22]]) l37Lamp(x, z, 'spa', { color: 0xffd9a8, power: 2.4, dist: 9 });
// 桑拿（吊灯低照）
l37Lamp(-27, -6, 'sauna', { color: 0xffc38a, power: 1.5, dist: 5, y: L37_SAUNA_H - 0.18 });
// 休息廊
for (const [x, z] of [[-20, -28.5], [0, -28.5], [20, -28.5]]) l37Lamp(x, z, 'rest', { power: 1.8, dist: 7.5 });
// 设备间
l37Lamp(26, -20, 'equip', { power: 1.8, dist: 6.5, color: 0xffd9a6, y: L37_EQUIP_H - 0.2 });
l37Lamp(26, -24, 'equip', { power: 1.4, dist: 6, color: 0xcfe6ff, y: L37_EQUIP_H - 0.2 });
// 池面两盏冷光（水面高光，不增几何）
[0xc9f2ff, 0xc9f2ff].forEach((c, i) => {
  const l = new THREE.PointLight(c, 7.0, 12, 2);
  l.position.set(i ? 15 : 11, 1.9, i ? -4.5 : -22); scene.add(l);
  poolLights.push({ light: l, fxMat: null, base: 7.0, zone: 'pool' });
});
const hemi = new THREE.HemisphereLight(0xfff1dd, 0x8e9c98, 0.55);
scene.add(hemi);

/* ---------------- 家具与固定装置 ---------------- */
const lockerDoors = [], showerSprays = [], steamPlanes = [];
let lockerFigure = null;
function bench(x, z, w, d, o = {}) {
  const h = o.h == null ? 0.44 : o.h;
  addWorldUVBox(w, 0.08, d, x, h, z, l37WoodMat, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBox(0.07, h - 0.08, 0.07, x + sx * (w / 2 - 0.18), (h - 0.08) / 2, z + sz * (d / 2 - 0.12), l37TrimMat);
  }
  COLLIDERS.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, y1: 0, y2: h, kind: 'bench' });
}
function lockerRow(x, zc, len, zFacing) {
  const doors = Math.max(2, Math.round(len / 0.42));
  const dw = len / doors;
  addWorldUVBox(0.5, 1.9, len, x, 0.95, zc, l37LockerDoors, 0.42);
  addBox(0.56, 0.06, len, x, 1.93, zc, l37TrimMat);
  addBox(0.56, 0.10, len, x, 0.05, zc, l37TrimMat);
  COLLIDERS.push({ x1: x - 0.26, x2: x + 0.26, z1: zc - len / 2, z2: zc + len / 2, y1: 0, y2: 1.98, kind: 'locker' });
  for (let i = 0; i < doors; i++) {
    const dz = zc - len / 2 + dw * (i + 0.5);
    const pivot = new THREE.Group();
    pivot.position.set(x + zFacing * 0.26, 1.06, dz - dw * 0.46);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, dw * 0.92), l37LockerDoors);
    leaf.position.set(0, 0.45, dw * 0.46);
    pivot.add(leaf); scene.add(pivot);
    lockerDoors.push({ pivot, open: 0, target: 0, timer: 1 + Math.random() * 6 });
    addBox(0.04, 0.12, 0.03, x + zFacing * 0.28, 1.18, dz + dw * 0.3, l37TrimMat);
  }
}
function showerStall(x, z, w, d, faceDir) {
  addBox(0.06, 2.05, d, x + (faceDir < 0 ? w / 2 : -w / 2), 1.02, z, l37WallMat);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.02, 0.06, 10), l37TrimMat);
  head.position.set(x, 2.0, z); scene.add(head);
  addBox(0.03, 1.1, 0.03, x, 2.05, z, l37TrimMat);
  addBox(0.34, 0.03, 0.34, x, 0.012, z, l37TrimMat);
  const spray = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.5, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xdfeef2, transparent: true, opacity: 0.13, roughness: 1, side: THREE.DoubleSide, depthWrite: false }));
  spray.position.set(x, 1.3, z); scene.add(spray);
  showerSprays.push({ mesh: spray, base: 0.13, on: 0, timer: Math.random() * 5 });
}
// 更衣：柜列 + 长凳（东西两间镜像）
for (const sx of [-1, 1]) {
  const xFace = sx < 0 ? -29.4 : 29.4;
  lockerRow(xFace, 9, 8.4, sx < 0 ? 1 : -1);
  bench(sx * 24.6, 9, 1.0, 4.2);
  bench(sx * 19.2, 9, 0.6, 1.8, { h: 0.42 });
  // 换衣隔间
  for (const z of [5.4, 12.2]) {
    addBox(2.2, 2.1, 0.06, sx * 21.6, 1.05, z, l37WallMat);
    addBox(0.06, 2.1, 1.6, sx * 20.5, 1.05, z + (z < 9 ? 0.8 : -0.8), l37WallMat);
  }
}
// 淋浴：东西两侧各 5 间
for (const side of [-1, 1]) {
  for (let i = 0; i < 5; i++) {
    showerStall(side * 28.4, -1.4 + i * 1.1, 1.1, 1.0, side < 0 ? 1 : -1);
  }
}
// 湿区分配厅的指路牌
function l37Sign(text, sub, x, y, z, ry, w = 1.4, h = 0.42) {
  const c = makeCanvas(640, Math.round(640 * h / w)), g = c.getContext('2d');
  g.fillStyle = '#1a3a3c'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#86c9c0'; g.lineWidth = 6; g.strokeRect(14, 14, c.width - 28, c.height - 28);
  g.fillStyle = '#eef6f3'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(c.height * 0.34)}px system-ui, sans-serif`; g.fillText(text, c.width / 2, c.height * 0.40);
  g.font = `500 ${Math.round(c.height * 0.20)}px system-ui, sans-serif`; g.fillStyle = '#a9d6cf';
  g.fillText(sub, c.width / 2, c.height * 0.72);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
}
l37Sign('更衣 · 西', 'LOCKERS W', -6.14, 2.2, 8, -Math.PI / 2);
l37Sign('更衣 · 东', 'LOCKERS E', 6.14, 2.2, 8, Math.PI / 2);
l37Sign('淋浴 →', 'SHOWERS', -6.14, 2.2, 1.2, -Math.PI / 2);
l37Sign('温泉 ←', 'THERMAL BATHS', 6.14, 2.2, 1.2, Math.PI / 2);
l37Sign('游泳池 →', 'POOL 25 m', 0, 2.5, 12.14, 0);
l37Sign('静休廊', 'REST GALLERY', 0, 2.5, -26.9, Math.PI);

/* ---------------- 桑拿 / 蒸汽间 ---------------- */
(function buildSauna() {
  const r = roomById('sauna');
  bench(r.x1 + 3.0, r.z1 + 2.2, 4.6, 1.0, { h: 0.46 });
  bench(r.x1 + 3.0, r.z1 + 4.4, 4.6, 1.0, { h: 0.68 });
  addWorldUVBox(0.9, 0.9, 0.9, r.x1 + 1.2, 0.45, r.z1 + 2.0, l37TrimMat, 0.5);   // 炉体
  const stones = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), l37TrimMat);
  stones.position.set(r.x1 + 1.2, 0.95, r.z1 + 2.0); scene.add(stones);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xf2f4f2, transparent: true, opacity: 0.06, depthWrite: false, roughness: 1 }));
    s.rotation.x = -Math.PI / 2; s.position.set(r.x1 + 1.2, 1.1 + i * 0.12, r.z1 + 2.0);
    scene.add(s); steamPlanes.push({ mesh: s, base: 1.1, ph: i });
  }
})();

/* ---------------- 浅水标识 / 温度牌 ---------------- */
function l37Post(text, sub, x, z, o = {}) {
  addBox(0.09, 1.6, 0.09, x, 0.8, z, l37TrimMat);
  const w = o.w == null ? 0.86 : o.w, h = o.h == null ? 0.5 : o.h;
  const c = makeCanvas(512, Math.round(512 * h / w)), g = c.getContext('2d');
  g.fillStyle = '#16383a'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#8fd3ca'; g.lineWidth = 8; g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.fillStyle = '#eef7f4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(c.height * 0.36)}px system-ui, sans-serif`; g.fillText(text, c.width / 2, c.height * 0.38);
  g.font = `500 ${Math.round(c.height * 0.20)}px system-ui, sans-serif`; g.fillStyle = '#a6d8d0';
  g.fillText(sub, c.width / 2, c.height * 0.72);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.position.set(x, 1.5, z); m.rotation.y = o.ry == null ? 0 : o.ry; scene.add(m);
  COLLIDERS.push({ x1: x - 0.1, x2: x + 0.1, z1: z - 0.1, z2: z + 0.1, y1: 0, y2: 1.7, kind: 'post' });
}
l37Post('41 °C', '温热主汤池', -24.2, -14.6, { ry: 0.4 });
l37Post('32 °C', '静汤池', -10.2, -19.4, { ry: -0.5 });
l37Post('12 °C', '冷水池', -18.0, -9.6, { ry: 0.2 });
l37Sign('桑拿 · 90 °C', 'SAUNA', -27, 2.0, -2.14, Math.PI);

/* ---------------- 接待 / 脱鞋 / 湿区陈设 ---------------- */
(function buildEntry() {
  // 前台
  addWorldUVBox(4.6, 1.04, 0.8, 0, 0.52, 25.4, l37WoodMat, 2);
  addBox(4.8, 0.06, 0.9, 0, 1.06, 25.4, l37TrimMat);
  COLLIDERS.push({ x1: -2.4, x2: 2.4, z1: 25.0, z2: 25.8, y1: 0, y2: 1.1, kind: 'desk' });
  addBox(0.5, 0.06, 0.36, 1.1, 1.09, 25.2, l37TrimMat);           // 终端
  addBox(0.14, 0.3, 0.06, 1.1, 1.24, 25.2, l37TrimMat);
  // 服务门（前台后）
  addBox(1.1, 2.1, 0.1, 4.6, 1.05, 25.0, l37WoodMat);
  // 总导览牌
  const c = makeCanvas(768, 384), g = c.getContext('2d');
  g.fillStyle = '#17393b'; g.fillRect(0, 0, 768, 384);
  g.strokeStyle = '#8ad0c7'; g.lineWidth = 10; g.strokeRect(16, 16, 736, 352);
  g.fillStyle = '#f0f7f4'; g.textAlign = 'center';
  g.font = '700 84px system-ui, sans-serif'; g.fillText('LEVEL 37', 384, 130);
  g.font = '600 40px system-ui, sans-serif'; g.fillStyle = '#a9d8d0'; g.fillText('THERMAL SPA · 温泉会所', 384, 200);
  g.font = '500 30px system-ui, sans-serif'; g.fillStyle = '#8fc6bd';
  g.fillText('更衣 → 淋浴 → 温泉 / 泳池', 384, 270);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 }));
  board.position.set(0, 2.1, 27.86); board.rotation.y = Math.PI; scene.add(board);
  addBox(3.3, 0.08, 0.1, 0, 2.94, 27.86, l37TrimMat);
  // 等候长凳 + 饮水
  bench(-8.4, 21.5, 1.0, 5.0);
  bench(8.4, 21.5, 1.0, 5.0);
  addBox(0.5, 0.9, 0.5, -10.6, 0.45, 18.2, l37TrimMat);
  addBox(0.42, 0.1, 0.42, -10.6, 0.95, 18.2, l37TrimMat);
  // 脱鞋储物（鞋柜岛 + 坐凳）
  for (const x of [-3.4, 0, 3.4]) {
    addWorldUVBox(1.6, 1.1, 0.7, x, 0.55, 13.2, l37WoodMat, 2);
    COLLIDERS.push({ x1: x - 0.8, x2: x + 0.8, z1: 12.85, z2: 13.55, y1: 0, y2: 1.1, kind: 'shoeCabinet' });
  }
  bench(-4.2, 15.2, 3.6, 0.5);
  bench(4.2, 15.2, 3.6, 0.5);
})();

/* ---------------- 北静休廊：躺椅 + 边几 + 绿植 ---------------- */
(function buildRest() {
  for (let i = 0; i < 7; i++) {
    const x = -24 + i * 8;
    const seat = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 2.0), l37WoodMat);
    base.position.y = 0.38; seat.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.9), l37WoodMat);
    back.position.set(0, 0.62, -0.72); back.rotation.x = -0.5; seat.add(back);
    for (const sz of [-0.82, 0.82]) for (const sx of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), l37TrimMat);
      leg.position.set(sx, 0.16, sz); seat.add(leg);
    }
    seat.position.set(x, 0, -28.4); scene.add(seat);
    COLLIDERS.push({ x1: x - 0.4, x2: x + 0.4, z1: -29.4, z2: -27.4, y1: 0, y2: 0.5, kind: 'lounger' });
    addBox(0.44, 0.48, 0.44, x + 1.1, 0.24, -28.6, l37TrimMat);
  }
})();

/* ---------------- 设备间：泵组、管汇、控制柜（游客不可穿越） ---------------- */
(function buildEquip() {
  const r = roomById('equip');
  for (let i = 0; i < 3; i++) {
    const x = r.x1 + 1.5 + i * 2.4;
    addWorldUVBox(1.2, 1.0, 1.2, x, 0.5, r.z1 + 2.0, l37TrimMat, 0.6);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 12), l37TrimMat);
    motor.rotation.z = Math.PI / 2; motor.position.set(x, 1.12, r.z1 + 2.0); scene.add(motor);
    COLLIDERS.push({ x1: x - 0.6, x2: x + 0.6, z1: r.z1 + 1.4, z2: r.z1 + 2.6, y1: 0, y2: 1.3, kind: 'pump' });
  }
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.0, 10), l37TrimMat);
    pipe.rotation.x = Math.PI / 2; pipe.position.set(r.x1 + 4.2, 1.7 + i * 0.32, r.z1 + 5.0);
    scene.add(pipe);
  }
  addWorldUVBox(1.4, 2.0, 0.5, r.x2 - 0.9, 1.0, r.z1 + 3.4, l37TrimMat, 0.6);
  COLLIDERS.push({ x1: r.x2 - 1.6, x2: r.x2 - 0.2, z1: r.z1 + 3.15, z2: r.z1 + 3.65, y1: 0, y2: 2.0, kind: 'cabinet' });
})();

/* ---------------- 更衣室恐怖事件的对外接口（沿用旧契约） ---------------- */
let lockerHorrorT = 0;
function resetLockerHorror() {
  for (const d of lockerDoors) { d.open = 0; d.target = 0; }
  for (const s of showerSprays) { s.on = 0; }
  lockerHorrorT = 0;
  if (lockerFigure) lockerFigure.visible = false;
}
function updateLockerRoom(dt) {
  if (LEVEL !== 1) return;
  lockerHorrorT += dt;
  for (const d of lockerDoors) {
    d.timer -= dt;
    if (d.timer <= 0) { d.target = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 1.6; d.timer = 3 + Math.random() * 9; }
    d.open += (d.target - d.open) * Math.min(1, dt * 6);
    d.pivot.rotation.y = d.open;
  }
  for (const s of showerSprays) {
    s.timer -= dt;
    if (s.timer <= 0) { s.on = s.on > 0.2 ? 0 : 0.2 + Math.random() * 0.8; s.timer = 2 + Math.random() * 6; }
    s.mesh.material.opacity = s.base + s.on * 0.22;
  }
  for (const st of steamPlanes) {
    st.mesh.position.y = st.base + Math.sin(lockerHorrorT * 0.6 + st.ph) * 0.12;
    st.mesh.material.opacity = 0.05 + 0.02 * Math.sin(lockerHorrorT * 0.9 + st.ph);
  }
  for (const l of lockerLights) {
    const flick = Math.random() < 0.02 ? 0.15 : 1;
    l.light.intensity = l.base * (0.82 + 0.18 * Math.sin(lockerHorrorT * 7 + l.light.position.z)) * flick;
  }
}
