/* ==== Level 0 · 浴场后台后室（v2：42 × 24 m 紧凑后勤层） ==== */
const L0_BOUNDS = { x1: -150, x2: -108, z1: -12, z2: 12 };
const L0_DOOR_H = 2.15;

/* 六个可辨识区域 + 一条中央走廊；每个房间都有用途，没有"空办公室" */
const L0_ROOMS = [
  { id: 'entry', name: '值班接待 / 停用访客厅', x1: -150, z1: -6, x2: -140, z2: 6, h: L0H },
  { id: 'corr', name: '员工走廊', x1: -140, z1: -1.2, x2: -108, z2: 1.2, h: L0H },
  { id: 'staff', name: '员工更衣与休息', x1: -140, z1: 1.2, x2: -131, z2: 10, h: L0H },
  { id: 'archive', name: '票务档案', x1: -131, z1: 1.2, x2: -119, z2: 10, h: L0H },
  { id: 'linen', name: '布草整理 / 洗衣后勤', x1: -119, z1: 1.2, x2: -108, z2: 10, h: 2.8 },
  { id: 'maint', name: '维修配电', x1: -131, z1: -10, x2: -119, z2: -1.2, h: L0H },
  { id: 'vest', name: '通往浴场的服务前室', x1: -119, z1: -10, x2: -108, z2: -1.2, h: L0H },
  { id: 'store', name: '布草库 / 后台储存', x1: -140, z1: -10, x2: -131, z2: -1.2, h: L0H }
];
const L0_DOORS = [
  { axis: 'x', coord: -140, gap: [-0.9, 0.9] },        // 接待 → 走廊
  { axis: 'z', coord: 1.2, gap: [-137.2, -135.4] },    // 走廊 → 员工区
  { axis: 'z', coord: 1.2, gap: [-126.5, -124.7] },    // 走廊 → 档案
  { axis: 'z', coord: 1.2, gap: [-115.5, -113.7] },    // 走廊 → 布草
  { axis: 'z', coord: -1.2, gap: [-126.5, -124.7] },   // 走廊 → 配电
  { axis: 'z', coord: -1.2, gap: [-115.5, -113.7] },   // 走廊 → 服务前室
  { axis: 'x', coord: -131, gap: [6.0, 7.8] },         // 员工区 ↔ 档案（短回环 1）
  { axis: 'x', coord: -119, gap: [-7.6, -5.8] },       // 配电 ↔ 服务前室
  { axis: 'x', coord: -140, gap: [-6.8, -5.0] },       // 接待 ↔ 布草库
  { axis: 'x', coord: -131, gap: [-7.6, -5.8] },       // 布草库 ↔ 配电（短回环 2）
  { axis: 'x', coord: -108, gap: [-6.5, -3.5], h: 2.4 } // 服务前室 → 浴场（出口）
];
function l0RoomAt(x, z) {
  for (const r of L0_ROOMS) if (x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2) return r;
  return null;
}

/* ---------------- 材质：亚麻黄细墙纸 / 深橄榄褐低绒地毯 ---------------- */
const l0WallMat = matFor({ diffuse: L12_TEX.wallpaper, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
  { ns: 0.16, roughness: 0.95, metalness: 0.0, env: 0.3, color: 0xf2d38f });
l0WallMat.roughnessMap = null;
const l0FloorMat = matFor({ diffuse: L12_TEX.carpet, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
  { ns: 0.12, roughness: 0.95, metalness: 0.0, env: 0.2, color: 0x4a4438 });
l0FloorMat.roughnessMap = null;
const l0TrimMat = new THREE.MeshStandardMaterial({ color: 0x6f6249, roughness: 0.72, metalness: 0.04 });
const l0CeilMat = matFor({ diffuse: L12_TEX.plaster, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.10, roughness: 0.96, metalness: 0.0, color: 0xcfc6b0 });
const l0WoodMat = matFor({ diffuse: L12_TEX.wallpaper, coverageX: 2, coverageY: 2 }, 0.5, 0.5,
  { ns: 0.10, roughness: 0.74, metalness: 0.0, color: 0x7d6242 });

/* ---------------- 地面 / 天花 / 踢脚 ---------------- */
addDeck(L0_BOUNDS.x1, L0_BOUNDS.z1, L0_BOUNDS.x2, L0_BOUNDS.z2, [], { diffuse: L12_TEX.carpet, coverageX: 2, coverageY: 2 }, { mat: l0FloorMat });
const l0Plan = planBuildShell(L0_ROOMS, L0_DOORS, {
  t: 0.24, cov: 2.0, wallMat: l0WallMat, ceilMat: l0CeilMat, casingMat: l0TrimMat,
  wallKind: 'l0Wall', headerKind: 'l0Header'
});
const l0WallPieces = l0Plan.walls, l0Headers = l0Plan.headers, L0_GAPS = l0Plan.doorways;
const l0Skirt = [], l0Sockets = [], l0Vents = [], l0Stains = [], l0GridList = [], l0Handles = [];
const l0Props = [], l0Pipes = [], l0Hangers = [], l0Papers = [], l0Lights = [];
let exitPanel = null, exitSignMat = null, exitLight = null;
/* 踢脚：沿真实墙段生成（门洞处断开），实例化合批 */
for (const w of l0WallPieces) {
  const len = w.b - w.a;
  if (len < 0.3) continue;
  const cx = w.axis === 'z' ? (w.a + w.b) / 2 : w.coord;
  const cz = w.axis === 'z' ? w.coord : (w.a + w.b) / 2;
  for (const side of [-1, 1]) {
    const off = side * (w.t / 2 + 0.016);
    const px = cx + (w.axis === 'z' ? 0 : off), pz = cz + (w.axis === 'z' ? off : 0);
    const sx = w.axis === 'z' ? len : 0.03, sz = w.axis === 'z' ? 0.03 : len;
    const m = addBox(sx, 0.12, sz, px, 0.06, pz, l0TrimMat);
    l0Skirt.push({ x: px, y: 0.06, z: pz, sx, sz, mesh: m });
  }
}
/* 天花检修缝：沿走廊与房间分界，不做纯黑面 */
for (const z of [-9, -5.4, 5.4, 9]) {
  const seam = new THREE.Mesh(new THREE.BoxGeometry(42, 0.03, 0.06), l0TrimMat);
  seam.position.set(-129, L0H - 0.03, z); scene.add(seam);
}
const hemiL0 = new THREE.HemisphereLight(0xcdbd8a, 0x3d3826, 0.5);
scene.add(hemiL0);

/* ---------------- 照明：荧光灯盘（含 3 盏坏灯）+ 少量点光 ---------------- */
const l0FxMat = new THREE.MeshStandardMaterial({ color: 0x2a2721, emissive: 0xfff0c8, emissiveIntensity: 1.55, roughness: 0.8 });
function l0Fixture(x, z, alive) {
  addBox(1.24, 0.08, 0.34, x, L0H - 0.12, z, l0TrimMat);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.03, 0.26), l0FxMat.clone());
  panel.position.set(x, L0H - 0.165, z); scene.add(panel);
  const mat = panel.material;
  mat.emissiveIntensity = alive ? 1.55 : 0.06;
  l0Lights.push({ mesh: panel, mat, base: alive ? 1.55 : 0.06, alive, t: 0 });
}
for (const [x, z, alive] of [
  [-146, 0, true], [-138, 0, true], [-130, 0, false], [-122, 0, true], [-114, 0, true],
  [-136, 6, true], [-124, 6, false], [-124, -6, true], [-112, 6, true], [-112, -6, false],
  [-136, -6, true], [-146, -4, true]
]) l0Fixture(x, z, alive);
const l0Spots = [[-146, 0], [-128, 0], [-113, 0], [-135, 6], [-124, -6], [-113, -6]];
for (const [x, z] of l0Spots) {
  const l = new THREE.PointLight(0xffe6b0, 1.5, 7.5, 2);
  l.position.set(x, L0H - 0.5, z); scene.add(l);
}

/* ---------------- 装饰：只贴在真实墙面区段上，避开所有门洞 ---------------- */
function l0Face(axis, coord, side, along, margin = 0.35) {
  for (const w of l0WallPieces) {
    if (w.axis !== axis || Math.abs(w.coord - coord) > 1e-6) continue;
    if (along < w.a + margin || along > w.b - margin) continue;
    if (L0_GAPS.some(g => g.axis === axis && Math.abs(g.coord - coord) < 1e-6 && along > g.gap[0] - margin && along < g.gap[1] + margin)) continue;
    return { axis, coord, side, face: coord + side * (w.t / 2), piece: w };
  }
  return null;
}
function l0Socket(x, z) {
  const f = l0Face('z', z, 1, x, 0.32);
  if (!f) return null;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.022), l0TrimMat);
  plate.position.set(x, 0.32, f.face + 0.012); scene.add(plate);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.008), new THREE.MeshStandardMaterial({ color: 0x2a2721, roughness: 0.9 }));
  hole.position.set(x, 0.32, f.face + 0.025); scene.add(hole);
  l0Sockets.push({ x, y: 0.32, z, face: f.face, axis: 'z' });
  return f;
}
function l0Vent(x, z, y) {
  const f = l0Face('z', z, 1, x, 0.55);
  if (!f) return null;
  addBox(0.72, 0.40, 0.03, x, y, f.face + 0.018, l0TrimMat);
  for (let i = 0; i < 6; i++) addBox(0.66, 0.028, 0.012, x, y - 0.15 + i * 0.055, f.face + 0.038, l0TrimMat);
  l0Vents.push({ x, y, z, face: f.face, axis: 'z' });
  return f;
}
function l0Stain(x, z, y, r) {
  const f = l0Face('z', z, 1, x, 0.7);
  if (!f) return null;
  const dec = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a7648, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false }));
  dec.position.set(x, y, f.face + 0.006); scene.add(dec);
  l0Stains.push({ x, y, z, axis: 'z', face: f.face });
  return f;
}
for (let x = -147; x < -110; x += 5.5) { l0Socket(x, 6); l0Socket(x, -6); }
for (const z of [-8, -4, 4, 8]) { l0Socket(-140, z); l0Socket(-131, z); l0Socket(-119, z); }
for (const [x, z, y] of [[-134, 10, 2.35], [-121, 10, 2.35], [-121.5, -10, 2.3], [-137, -10, 2.3]]) l0Vent(x, z, y);
for (const [x, z, y, r] of [[-128, -12, 2.2, 0.55], [-120, 12, 2.4, 0.4], [-146, -6, 1.6, 0.32], [-112, 12, 2.1, 0.45]]) l0Stain(x, z, y, r);

/* ---------------- 接待：值班台 / 停用访客厅 / 失电配电图 ---------------- */
(function buildEntry() {
  addWorldUVBox(3.6, 1.04, 0.8, -145.4, 0.52, -4.6, l0WoodMat, 2);
  addBox(3.75, 0.07, 0.92, -145.4, 1.08, -4.6, l0TrimMat);
  COLLIDERS_L0.push({ x1: -147.2, x2: -143.6, z1: -5.06, z2: -4.14, y1: 0, y2: 1.12, kind: 'desk' });
  addBox(0.46, 0.36, 0.05, -146.4, 1.02, -4.75, l0TrimMat);      // 值班登记板
  addBox(0.3, 0.04, 0.22, -144.4, 1.11, -4.7, l0TrimMat);        // 电话
  // 访客长椅（三张，朝向入口）
  for (const z of [-1.6, 0.6, 2.8]) {
    addWorldUVBox(0.6, 0.10, 1.9, -148.4, 0.44, z, l0WoodMat, 1);
    for (const dz of [-0.75, 0.75]) addBox(0.06, 0.4, 0.06, -148.4, 0.2, z + dz, l0TrimMat);
    COLLIDERS_L0.push({ x1: -148.75, x2: -148.05, z1: z - 0.95, z2: z + 0.95, y1: 0, y2: 0.5, kind: 'chair' });
  }
  // 失电配电图（后室线索：三枚保险丝位置）
  const c = makeCanvas(420, 300), g = c.getContext('2d');
  g.fillStyle = '#d8cfae'; g.fillRect(0, 0, 420, 300);
  g.strokeStyle = '#6b5a3a'; g.lineWidth = 4; g.strokeRect(8, 8, 404, 284);
  g.fillStyle = '#4a3d28'; g.font = 'bold 26px system-ui, sans-serif';
  g.fillText('STAFF WING · 供电示意', 28, 44);
  g.strokeStyle = '#7a6642'; g.lineWidth = 3;
  g.strokeRect(30, 70, 120, 80); g.strokeRect(170, 70, 120, 80); g.strokeRect(300, 70, 90, 80);
  g.strokeRect(30, 175, 170, 70); g.strokeRect(220, 175, 170, 70);
  g.fillStyle = '#8a2f1e';
  for (const [x, y] of [[90, 110], [230, 110], [345, 110]]) g.fillRect(x - 5, y - 5, 10, 10);
  g.fillStyle = '#4a3d28'; g.font = '16px system-ui, sans-serif';
  g.fillText('更衣', 60, 168); g.fillText('档案', 205, 168); g.fillText('配电', 322, 168);
  g.fillText('布草库', 60, 265); g.fillText('服务前室 → 浴场', 245, 265);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.07), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  board.position.set(-149.86, 1.62, -3.2); board.rotation.y = Math.PI / 2; scene.add(board);
  addBox(1.6, 0.06, 0.06, -149.86, 2.17, -3.2, l0TrimMat);
  COLLIDERS_L0.push({ x1: -149.98, x2: -149.7, z1: -1.9, z2: -1.9, y1: 0, y2: 0.1, kind: 'stub' });
})();

/* ---------------- 员工区：更衣柜 / 长凳 / 打卡机 / 休息桌 ---------------- */
(function buildStaff() {
  for (const z of [2.6, 4.4, 6.2, 8.0]) {
    addWorldUVBox(0.5, 1.9, 1.5, -139.4, 0.95, z, l0WoodMat, 0.6);
    COLLIDERS_L0.push({ x1: -139.66, x2: -139.14, z1: z - 0.75, z2: z + 0.75, y1: 0, y2: 1.95, kind: 'locker' });
  }
  addBox(0.54, 0.06, 6.3, -139.4, 1.94, 5.3, l0TrimMat);
  addWorldUVBox(0.5, 0.09, 4.4, -137.2, 0.45, 5.2, l0WoodMat, 1);
  for (const z of [3.4, 7.0]) addBox(0.06, 0.4, 0.06, -137.2, 0.2, z, l0TrimMat);
  COLLIDERS_L0.push({ x1: -137.45, x2: -136.95, z1: 3.0, z2: 7.4, y1: 0, y2: 0.5, kind: 'bench' });
  // 打卡机 + 值班牌
  addBox(0.34, 0.42, 0.16, -139.6, 1.34, 9.4, l0TrimMat);
  addBox(0.06, 1.34, 0.06, -139.6, 0.67, 9.4, l0TrimMat);
  // 休息桌 + 两把椅
  addWorldUVBox(1.5, 0.72, 0.9, -134.4, 0.36, 4.2, l0WoodMat, 1);
  for (const dz of [-0.55, 0.55]) addBox(0.5, 0.06, 0.44, -134.4, 0.44, 4.2 + dz, l0WoodMat);
  COLLIDERS_L0.push({ x1: -135.15, x2: -133.65, z1: 3.75, z2: 4.65, y1: 0, y2: 0.74, kind: 'table' });
  l0Props.push({ kind: 'table', obj: null, x: -134.4, z: 4.2, top: 0.72 });
})();

/* ---------------- 档案：票柜阵 + 出票台 + 票据箱 ---------------- */
(function buildArchive() {
  for (let i = 0; i < 5; i++) {
    for (const z of [2.4, 4.0]) {
      const x = -129.6 + i * 1.6;
      addWorldUVBox(1.2, 1.35, 0.66, x, 0.675, z, l0WoodMat, 1);
      COLLIDERS_L0.push({ x1: x - 0.6, x2: x + 0.6, z1: z - 0.33, z2: z + 0.33, y1: 0, y2: 1.42, kind: 'cabinet' });
      for (let k = 0; k < 3; k++) addBox(0.28, 0.05, 0.02, x - 0.34 + k * 0.34, 0.95, z + 0.35, l0Handles);
    }
  }
  addWorldUVBox(3.2, 0.96, 0.8, -124.6, 0.48, 7.2, l0WoodMat, 1);
  addBox(3.36, 0.06, 0.92, -124.6, 1.0, 7.2, l0TrimMat);
  COLLIDERS_L0.push({ x1: -126.2, x2: -123.0, z1: 6.76, z2: 7.64, y1: 0, y2: 1.02, kind: 'counter' });
  // 出票盘 + 票据箱
  addBox(0.6, 0.16, 0.4, -125.3, 1.1, 7.1, l0TrimMat);
  for (let i = 0; i < 3; i++) addWorldUVBox(0.7, 0.5, 0.5, -122.4, 0.25 + i * 0.52, 9.2, l0WoodMat, 0.8);
  COLLIDERS_L0.push({ x1: -122.75, x2: -122.05, z1: 8.95, z2: 9.45, y1: 0, y2: 1.6, kind: 'boxes' });
})();

/* ---------------- 布草 / 洗衣：布草车 + 层架 + 折叠台 ---------------- */
(function buildLinen() {
  for (const [x, z] of [[-116.6, 3.4], [-113.4, 3.4], [-116.6, 6.2]]) {
    addWorldUVBox(1.1, 0.62, 0.72, x, 0.31, z, l0WoodMat, 1);
    addBox(1.16, 0.04, 0.78, x, 0.66, z, l0TrimMat);
    COLLIDERS_L0.push({ x1: x - 0.58, x2: x + 0.58, z1: z - 0.39, z2: z + 0.39, y1: 0, y2: 0.68, kind: 'cart' });
  }
  for (let i = 0; i < 2; i++) {
    addWorldUVBox(3.4, 0.06, 0.6, -114.2, 1.2 + i * 0.55, 9.0, l0WoodMat, 1);
    addBox(0.06, 1.2 + i * 0.55, 0.6, -116.0, (1.2 + i * 0.55) / 2, 9.0, l0TrimMat);
    addBox(0.06, 1.2 + i * 0.55, 0.6, -112.4, (1.2 + i * 0.55) / 2, 9.0, l0TrimMat);
  }
  COLLIDERS_L0.push({ x1: -116.0, x2: -112.4, z1: 8.7, z2: 9.3, y1: 0, y2: 1.8, kind: 'shelf' });
  addWorldUVBox(2.4, 0.9, 0.8, -112.6, 0.45, 5.6, l0WoodMat, 1);
  COLLIDERS_L0.push({ x1: -113.8, x2: -111.4, z1: 5.16, z2: 6.04, y1: 0, y2: 0.92, kind: 'folding' });
})();

/* ---------------- 配电：配电柜 + 桥架 + 维修工作台 ---------------- */
(function buildMaint() {
  addWorldUVBox(3.2, 1.9, 0.7, -125.0, 0.95, -9.6, l0TrimMat, 0.6);
  COLLIDERS_L0.push({ x1: -126.6, x2: -123.4, z1: -9.95, z2: -9.25, y1: 0, y2: 1.92, kind: 'switchgear' });
  for (let i = 0; i < 3; i++) addBox(0.5, 0.18, 0.03, -126.0 + i * 0.9, 1.5, -9.24, l0Handles);
  addBox(1.6, 0.08, 0.5, -124.0, 1.62, -9.55, l0TrimMat);        // 仪表托架
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.85 });
  for (const [x, y] of [[-127.4, 2.55], [-122.6, 2.42]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 8.2, 10), cableMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(x + 0.0, y, -8.0); scene.add(pipe);
    l0Pipes.push({ mesh: pipe, len: 8.2, a: [x - 4.1, y, -8.0], b: [x + 4.1, y, -8.0], r: 0.055 });
    for (const dx of [-3.0, 0, 3.0]) {
      addBox(0.07, 0.05, 0.3, x + dx, y, -8.12, l0TrimMat);
      l0Hangers.push({ kind: 'pipeClamp', x: x + dx, y, z: -8.12 });
      addBox(0.05, L0H - y, 0.05, x + dx, (L0H + y) / 2, -8.12, l0TrimMat);
    }
  }
  addBox(1.8, 0.06, 0.9, -120.6, 0.86, -3.4, l0WoodMat);
  addBox(0.07, 0.86, 0.07, -121.4, 0.43, -3.8, l0TrimMat);
  addBox(0.07, 0.86, 0.07, -119.8, 0.43, -3.8, l0TrimMat);
  COLLIDERS_L0.push({ x1: -121.5, x2: -119.7, z1: -3.85, z2: -2.95, y1: 0, y2: 0.9, kind: 'workbench' });
  // 维修工作灯（吊杆 + 灯罩）
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 14, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x8a8271, roughness: 0.6, side: THREE.DoubleSide }));
  shade.position.set(-120.6, 2.34, -3.4); scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffd28a, emissiveIntensity: 2.4 }));
  bulb.position.set(-120.6, 2.24, -3.4); scene.add(bulb);
  addBox(0.05, L0H - 2.46, 0.05, -120.6, (L0H + 2.46) / 2, -3.4, l0TrimMat);
  l0Hangers.push({ kind: 'lampRod', x: -120.6, y: 2.46, z: -3.4 });
  addBox(0.09, 0.04, 0.09, -120.6, 0.0, -3.4, l0TrimMat);
})();

/* ---------------- 服务前室：出口门 + 卷帘 + 指示 + 鞋架 ---------------- */
(function buildVest() {
  exitPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 2.95), l0TrimMat);
  exitPanel.position.set(-108.0, 1.18, -5.0); scene.add(exitPanel);
  COLLIDERS_L0.push({ x1: -108.35, x2: -107.75, z1: -6.5, z2: -3.5, y1: 0, y2: 2.4, kind: 'exitDoor' });
  exitSignMat = new THREE.MeshStandardMaterial({ map: makeSignTexture('出口', 'EXIT'), color: 0x1a0505, emissive: 0xff2a2a, emissiveIntensity: 1.9, roughness: 0.7 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), exitSignMat);
  sign.position.set(-107.86, 2.66, -5.0); sign.rotation.y = -Math.PI / 2; scene.add(sign);
  exitLight = new THREE.PointLight(0xff2a2a, 0.9, 4.5, 2);
  exitLight.position.set(-107.5, 2.5, -5.0); scene.add(exitLight);
  for (let i = 0; i < 3; i++) addWorldUVBox(1.6, 0.42, 0.5, -111.2, 0.21 + i * 0.46, -8.4, l0WoodMat, 0.8);
  COLLIDERS_L0.push({ x1: -112.0, x2: -110.4, z1: -8.65, z2: -8.15, y1: 0, y2: 1.4, kind: 'rack' });
  addBox(0.72, 0.06, 2.4, -109.0, 0.02, -5.0, l0TrimMat);
  // 后台地面的水渍
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18),
    new THREE.MeshStandardMaterial({ color: 0x2b2a24, transparent: true, opacity: 0.35, roughness: 0.9, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(-112.4, 0.006, -4.0); scene.add(puddle);
})();

/* ---------------- 布草库：层架 + 打包台 ---------------- */
(function buildStore() {
  for (const z of [-8.6, -6.2, -3.6]) {
    addWorldUVBox(0.6, 2.1, 0.6, -139.2, 1.05, z, l0WoodMat, 0.8);
    COLLIDERS_L0.push({ x1: -139.5, x2: -138.9, z1: z - 0.3, z2: z + 0.3, y1: 0, y2: 2.12, kind: 'post' });
  }
  for (let i = 0; i < 3; i++) addWorldUVBox(6.4, 0.06, 0.6, -135.0, 0.7 + i * 0.62, -9.2, l0WoodMat, 1);
  COLLIDERS_L0.push({ x1: -138.2, x2: -131.8, z1: -9.5, z2: -8.9, y1: 0, y2: 1.9, kind: 'shelf' });
  addWorldUVBox(2.0, 0.9, 1.0, -133.4, 0.45, -3.4, l0WoodMat, 1);
  COLLIDERS_L0.push({ x1: -134.4, x2: -132.4, z1: -3.9, z2: -2.9, y1: 0, y2: 0.92, kind: 'packTable' });
})();

/* ---------------- 纸张 / 灰尘（避开墙体与家具：只落在真实可走地面） ---------------- */
function l0PaperOk(x, z) {
  for (const c of COLLIDERS_L0) {
    if (c.y1 > 0.4) continue;
    if (x > c.x1 - 0.12 && x < c.x2 + 0.12 && z > c.z1 - 0.12 && z < c.z2 + 0.12) return false;
  }
  return true;
}
for (let i = 0, tries = 0; i < 16 && tries < 400; tries++) {
  const x = -148 + Math.random() * 38, z = -11 + Math.random() * 22;
  if (!l0PaperOk(x, z)) continue;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.21 + Math.random() * 0.1, 0.29),
    new THREE.MeshStandardMaterial({ color: 0xd9d2bd, roughness: 0.95 }));
  sheet.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
  sheet.position.set(x, 0.007, z); scene.add(sheet);
  l0Papers.push({ x, z, obj: sheet }); i++;
}

/* ---------------- 保险丝：接待台 / 票柜 / 配电箱（各有承载物） ---------------- */
const fusesList = [];
let nearestFuse = null;
const FUSE_DEFS = [
  { x: -134.4, z: 4.2, y: 0.72, on: '员工区休息桌' },
  { x: -124.6, z: 7.2, y: 1.00, on: '档案出票台' },
  { x: -125.0, z: -9.3, y: 1.62, on: '配电柜仪表托架' }
];
function spawnFuse(def) {
  const surface = def.y == null ? 0.30 : def.y;
  const y = surface + 0.12;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x2a2216, emissive: 0xff9b1e, emissiveIntensity: 0.9, roughness: 0.5 }));
  m.position.set(def.x, y, def.z); scene.add(m);
  fusesList.push({ mesh: m, x: def.x, z: def.z, y, surface, on: def.on || '', ph: Math.random() * 6.28 });
}
function spawnFuseList() {
  for (const f of fusesList) scene.remove(f.mesh);
  fusesList.length = 0;
  for (const d of FUSE_DEFS) spawnFuse(d);
}
spawnFuseList();
function fuseReachableFrom(f, ex, ey, ez) {
  if (Math.hypot(ex - f.x, ez - f.z) > 1.9) return false;
  if (f.y > player.y + 1.9 || f.y < player.y - 0.4) return false;
  return !segmentBlockedByWalls(ex, ey, ez, f.x, f.y, f.z, 0.15);
}
function updateFuseProximity() {
  nearestFuse = null;
  let bestD = 1.9;
  const eyeY = player.y + EYE * (crouchH || 1);
  for (const f of fusesList) {
    if (f.y > player.y + 1.9 || f.y < player.y - 0.4) continue;
    const d = Math.hypot(player.x - f.x, player.z - f.z);
    if (d >= bestD) continue;
    if (!fuseReachableFrom(f, player.x, eyeY, player.z)) continue;
    bestD = d; nearestFuse = f;
  }
}
function tryFuse() {
  const target = nearestFuse;
  if (!target) return;
  if (fusesList.indexOf(target) < 0) { nearestFuse = null; return; }
  if (!fuseReachableFrom(target, player.x, player.y + EYE * (crouchH || 1), player.z)) { nearestFuse = null; return; }
  fusesList.splice(fusesList.indexOf(target), 1);
  scene.remove(target.mesh);
  fuses++;
  synthFuse();
  nearestFuse = null;
  if (fuses >= 3) {
    exitUnlocked = true; openExitDoor();
    showFlashText('三枚保险丝归位，服务门解锁。');
    startChase(2.85, 20);
  } else if (fuses === 2) {
    showFlashText('还差最后一步……配电箱（修）。');
    startChase(2.2, 12);
  } else {
    showFlashText('员工区来电了，但主线还断着。');
    activateEntity(3.0, 9);
  }
  stats.fuses = fuses;
}

function makeSignTexture(cn, en) {
  const c = makeCanvas(256, 96), g = c.getContext('2d');
  g.fillStyle = '#1e0404'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ff2a2a'; g.font = 'bold 44px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(en || cn, 128, 40);
  if (en) { g.font = 'bold 22px Arial'; g.fillText(cn, 128, 74); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dark_cable() { return new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.85 }); }
