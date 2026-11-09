/* ============================================================ Level 37 · 泳池层：建造 */
/* 五个真实隔断的区：南入口前厅 / 中央主池厅 / 西更衣淋浴区 / 北浅水回声室 / 东训练池与设备间
   墙体、门洞、地面洞口、台阶、碰撞全部由同一份轴对齐数据生成（模型高度 = groundAt 数据）。
   主环：前厅 →(门洞 z=12)→ 主池厅 →(北门 x-6..-3)→ 回声室 →(东门 z-23..-20)→ 北廊
        →(门 x14..17)→ 东厅北侧 → 绕训练池 →(栏板缺口 x27..30)→ 东厅南侧 →(门 z8..11)→ 主池厅 → 前厅
   西环：主池厅 →(北门 z-9..-6)→ 更衣区 →(南门 z8..11)→ 主池厅 */

const L37_SPAWN = { x: 3, z: 20, yaw: 0 };
const L37_NAV_CELL = 0.5;

/* ---------------- 地面 / 顶棚 ---------------- */
// 主池厅 + 南侧前厅/附属间（主池洞口 12×25m）
addDeck(-14, -16, 12, 24, [[-9, -14, 3, 11]], floorWest, { physical: true });
// 西更衣淋浴区（浅灰小砖）
addDeck(-28, -16, -14, 24, [], floorEast, { physical: true, color: 0xd8dcd8 });
// 北回声室（水泥地 + 浅池洞口）
addDeck(-28, -28, 2, -16, [[-12, -25, -4, -19]], floorMaint, { physical: true });
// 北廊西段
addDeck(2, -28, 12, -16, [], floorMaint, { physical: true });
// 东侧训练池厅 + 设备间（训练池洞口 8×8m）
addDeck(12, -28, 30, 24, [[16, -4, 24, 4]], floorEast, { physical: true, color: 0xd2dbe0 });

// 大厅顶棚（整幅）+ 回声室低顶棚 + 设备间顶棚
const ceilPoolMat = new THREE.MeshStandardMaterial({ map: texFrom('textures/ceiling-dark.png', 15, 13, true), roughness: 0.95 });
const l37Ceil = new THREE.Mesh(new THREE.PlaneGeometry(58, 52), ceilPoolMat);
l37Ceil.rotation.x = Math.PI / 2; l37Ceil.position.set(1, H, -2); scene.add(l37Ceil);
const l37CeilEcho = new THREE.Mesh(new THREE.PlaneGeometry(30, 12),
  new THREE.MeshStandardMaterial({ map: texFrom('textures/ceiling-dark.png', 9, 4, true), roughness: 0.96, color: 0xb9c6c4 }));
l37CeilEcho.rotation.x = Math.PI / 2; l37CeilEcho.position.set(-13, L37_ECHO_H, -22); scene.add(l37CeilEcho);
const l37CeilEquip = new THREE.Mesh(new THREE.PlaneGeometry(6, 10),
  new THREE.MeshStandardMaterial({ map: texFrom('textures/ceiling-dark.png', 3, 4, true), roughness: 0.96, color: 0x9aa2a0 }));
l37CeilEquip.rotation.x = Math.PI / 2; l37CeilEquip.position.set(27, L37_EQUIP_H, -11); scene.add(l37CeilEquip);
// 主厅顶棚梁（长向结构线）
const l37BeamMat = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.9 });
for (const bz of [-9, -1, 7]) addBox(24, 0.34, 0.5, -1, H - 0.17, bz, l37BeamMat);
// 回声室低顶棚横梁（重复柱门节奏）
for (const bz of [-17.6, -20.2, -22.8, -25.4, -27.2]) addBox(29.6, 0.26, 0.34, -13, L37_ECHO_H - 0.13, bz, l37BeamMat);

/* ---------------- 墙体（网格 + 碰撞同源） ---------------- */
const l37WallMat = matFor(wallTiles, 1, 1);
const l37SkirtMat = matFor(skirting, 1, 1, { roughness: 0.5, metalness: 0.06 });
const l37TrimMat = new THREE.MeshStandardMaterial({ color: 0x3a6b72, roughness: 0.5, metalness: 0.3 });

function l37AddWall(x1, z1, x2, z2, o = {}) {
  const h = o.h == null ? H : o.h;
  const t = o.t == null ? 0.42 : o.t;
  const vertical = Math.abs(x2 - x1) < 1e-6;
  if (!vertical && Math.abs(z2 - z1) > 1e-6) throw new Error('l37AddWall 只接受轴对齐墙');
  const e = o.cap === false ? 0 : t / 2;
  let bx1, bx2, bz1, bz2;
  if (vertical) {
    bx1 = x1 - t / 2; bx2 = x1 + t / 2;
    bz1 = Math.min(z1, z2) - e; bz2 = Math.max(z1, z2) + e;
  } else {
    bz1 = z1 - t / 2; bz2 = z1 + t / 2;
    bx1 = Math.min(x1, x2) - e; bx2 = Math.max(x1, x2) + e;
  }
  const w = bx2 - bx1, d = bz2 - bz1;
  if (w <= 0.001 || d <= 0.001) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geo, w, h, d, 1.6);
  const mesh = new THREE.Mesh(geo, o.mat || l37WallMat);
  mesh.position.set((bx1 + bx2) / 2, h / 2, (bz1 + bz2) / 2);
  mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  if (o.collide !== false) COLLIDERS.push({ x1: bx1, x2: bx2, z1: bz1, z2: bz2, y1: 0, y2: h, kind: 'poolWall' });
  if (o.skirt !== false) {
    const sk = 0.16, sy = sk / 2;
    if (vertical) {
      for (const s of [-1, 1]) addBox(0.05, sk, d - 0.06, x1 + s * (t / 2 + 0.025), sy, (bz1 + bz2) / 2, l37SkirtMat);
    } else {
      for (const s of [-1, 1]) addBox(w - 0.06, sk, 0.05, (bx1 + bx2) / 2, sy, z1 + s * (t / 2 + 0.025), l37SkirtMat);
    }
  }
  return mesh;
}
// 门套：z 方向的缺口用 vertical=true（墙沿 z 延伸，门在 x 线上）
function l37Doorway(x, z, vertical, gap, o = {}) {
  const t = o.t == null ? 0.42 : o.t, jw = 0.12, jd = t + 0.08;
  const hh = o.h == null ? 2.35 : o.h;
  if (vertical) {
    for (const s of [-1, 1]) addBox(jd, hh, jw, x, hh / 2, z + s * (gap / 2), l37TrimMat);
    addBox(jd, jw, gap + jw * 2, x, hh + jw / 2, z, l37TrimMat);
  } else {
    for (const s of [-1, 1]) addBox(jw, hh, jd, x + s * (gap / 2), hh / 2, z, l37TrimMat);
    addBox(gap + jw * 2, jw, jd, x, hh + jw / 2, z, l37TrimMat);
  }
}

// —— 外壳四面（薄片，边界碰撞由 BOUNDS 承担）——
addPlane(58, H, 1, H / 2, -28, 0, 0, matFor(wallTiles, 1, 1), wallTiles.coverageX);
addPlane(58, H, 1, H / 2, 24, 0, Math.PI, matFor(wallTiles, 1, 1), wallTiles.coverageX);
addPlane(52, H, -28, H / 2, -2, 0, Math.PI / 2, matFor(wallTiles, 1, 1), wallTiles.coverageX);
addPlane(52, H, 30, H / 2, -2, 0, -Math.PI / 2, matFor(wallTiles, 1, 1), wallTiles.coverageX);

/* —— A. 南入口前厅（x -2..8, z 12..24）：先收后放 —— */
l37AddWall(-2, 12, -2, 18);              // 西墙（z 18..21 侧门进储物间）
l37AddWall(-2, 21, -2, 24);
l37Doorway(-2, 19.5, true, 3.0);
l37AddWall(8, 12, 8, 18);                // 东墙（z 18..21 侧门进工具间）
l37AddWall(8, 21, 8, 24);
l37Doorway(8, 19.5, true, 3.0);
l37AddWall(-14, 12, 1.5, 12);            // 主厅与前厅之间的南墙（同时是储物间北墙）
l37AddWall(4.5, 12, 12, 12);             // 同上东段（同时是工具间北墙）
l37Doorway(3, 12, false, 3.0);           // 前厅→主厅 3m 门洞

/* —— B. 中央主池厅（x -14..12, z -16..12）—— */
l37AddWall(-14, -16, -6, -16, { t: 0.7 });   // 北墙西段（回声室门洞 x -6..-3，厚墙）
l37AddWall(-3, -16, 12, -16);                // 北墙东段
l37Doorway(-4.5, -16, false, 3.0, { t: 0.7 });
l37AddWall(12, -16, 12, 8);                  // 东墙（门下沿 z 8..11 通东厅）
l37AddWall(12, 11, 12, 12);
l37Doorway(12, 9.5, true, 3.0);
l37AddWall(12, 12, 12, 24);                  // 工具间东墙（与东厅相邻）

/* —— C. 西更衣淋浴区（x -28..-14, z -16..24）：南北两个入口 —— */
l37AddWall(-14, -16, -14, -9);               // 北段
l37AddWall(-14, -6, -14, 8);                 // 中段（北门 z -9..-6、南门 z 8..11）
l37AddWall(-14, 11, -14, 24);                // 南段
l37Doorway(-14, -7.5, true, 3.0);
l37Doorway(-14, 9.5, true, 3.0);
l37AddWall(-28, -16, -14, -16, { t: 0.6 });  // 更衣区北墙（与回声室之间的实墙）

/* —— D. 北浅水回声室（x -28..2, z -28..-16）：低顶棚 —— */
l37AddWall(2, -28, 2, -23);                  // 东墙（门洞 z -23..-20 通北廊）
l37AddWall(2, -20, 2, -16);
l37Doorway(2, -21.5, true, 3.0);

/* —— E. 东训练池厅 + 设备间（x 12..30）—— */
l37AddWall(12, -16, 14, -16);                // 北墙：门 x 14..17 通北廊
l37AddWall(17, -16, 26, -16);
l37AddWall(29, -16, 30, -16);                // 设备间北门 x 26..29
l37Doorway(15.5, -16, false, 3.0);
l37Doorway(27.5, -16, false, 3.0);
// 训练池与南侧观景区之间的半高栏板（可见但不立即可达，绕 x 27..30 缺口进入）
(function l37Parapet() {
  const h = 1.05, t = 0.36;
  const geo = new THREE.BoxGeometry(15, h, t);
  scaleBoxUV(geo, 15, h, t, 1.6);
  const m = new THREE.Mesh(geo, l37WallMat);
  m.position.set(19.5, h / 2, 6.5); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  COLLIDERS.push({ x1: 12, x2: 27, z1: 6.5 - t / 2, z2: 6.5 + t / 2, y1: 0, y2: h, kind: 'parapet' });
  addBox(15, 0.09, t + 0.1, 19.5, h + 0.02, 6.5, l37TrimMat);
})();
// 设备间：x 24..30, z -16..-6（西墙留观察窗，南墙留 2m 门）
l37AddWall(24, -16, 24, -12);
l37AddWall(24, -9, 24, -6);
l37AddWall(24, -6, 27, -6);
l37AddWall(29, -6, 30, -6);
l37Doorway(28, -6, false, 2.0);
(function l37EquipWindow() {
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe8ee, transparent: true, opacity: 0.30,
    roughness: 0.08, metalness: 0.0, clearcoat: 1.0, depthWrite: false });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.3), glass);
  pane.rotation.y = Math.PI / 2; pane.position.set(24, 1.85, -10.5); scene.add(pane);
  addBox(0.16, 0.10, 3.1, 24, 1.18, -10.5, l37TrimMat);
  addBox(0.16, 0.10, 3.1, 24, 2.52, -10.5, l37TrimMat);
  COLLIDERS.push({ x1: 23.9, x2: 24.1, z1: -12, z2: -9, y1: 0, y2: 1.18, kind: 'sill' });
})();

/* ---------------- 立方柱 / 柱廊 ---------------- */
const l37ColMat = new THREE.MeshStandardMaterial({ color: 0xded7c8, roughness: 0.72, metalness: 0.03 });
function l37Column(x, z, o = {}) {
  const s = o.s == null ? 0.62 : o.s, h = o.h == null ? H : o.h;
  addBox(s, h, s, x, h / 2, z, l37ColMat);
  addBox(s + 0.16, 0.14, s + 0.16, x, h - 0.07, z, l37TrimMat);
  addBox(s + 0.16, 0.12, s + 0.16, x, 0.06, z, l37TrimMat);
  COLLIDERS.push({ x1: x - s / 2, x2: x + s / 2, z1: z - s / 2, z2: z + s / 2, y1: 0, y2: h, kind: 'column' });
}
// 主池厅：东侧步道双柱列 + 西侧步道柱列（均避开池沿 2m 净宽与更衣区门前）
for (const cz of [-12, -2.5, 7]) { l37Column(6.4, cz); l37Column(10.6, cz); }
for (const cz of [-12, 0, 5]) l37Column(-11.4, cz);
// 训练池厅柱廊（与半高栏板共同读作"柱廊 / 局部墙"）
for (const cx of [14, 18, 22, 26]) l37Column(cx, 6.5);
// 回声室重复柱门（低顶棚 + 一排柱形成节奏）
for (const cz of [-17.8, -21.4, -25.0]) { l37Column(-13.6, cz, { s: 0.5, h: L37_ECHO_H }); l37Column(-2.4, cz, { s: 0.5, h: L37_ECHO_H }); }
// 设备间角柱
l37Column(28.6, -15.4, { s: 0.44, h: L37_EQUIP_H });

/* ---------------- 池体 ---------------- */
function buildPool(p) {
  const W = p.x2 - p.x1, cx = (p.x1 + p.x2) / 2;
  const depth = 0 - p.bottom;
  const fullLen = p.zEnd - p.zDeep1;
  const COV = poolMosaic.coverageX;
  const zc = (p.zDeep1 + p.zEnd) / 2;
  const stair = p.stairs;

  // 池底
  addPlane(W, fullLen, cx, p.bottom, zc, -Math.PI / 2, 0, poolMatShared, COV);
  // 四面池壁（南墙留台阶缺口）
  addPlane(W, depth, cx, -depth / 2, p.zDeep1, 0, 0, poolMatShared, COV);
  if (stair.x1 - p.x1 > 0.05) addPlane(stair.x1 - p.x1, depth, (p.x1 + stair.x1) / 2, -depth / 2, p.zEnd, 0, Math.PI, poolMatShared, COV);
  addPlane(p.x2 - stair.x2, depth, (stair.x2 + p.x2) / 2, -depth / 2, p.zEnd, 0, Math.PI, poolMatShared, COV);
  addPlane(fullLen, depth, p.x1, -depth / 2, zc, 0, Math.PI / 2, poolMatShared, COV);
  addPlane(fullLen, depth, p.x2, -depth / 2, zc, 0, -Math.PI / 2, poolMatShared, COV);

  // 入水台阶 / 水下缓台：与 groundAt 共用 p.stairs.steps（高度完全由数据决定）
  // 注意：不加实体碰撞盒 —— 站立时由 groundAt 的 0.62m 抬升限制决定能否上/下台阶，
  // 加碰撞盒反而会把站在台阶上的玩家推出去（player.y === c.y2 时 collideCircle 不会跳过）。
  for (const s of stair.steps) {
    const h = s.top - p.bottom, dz = s.z2 - s.z1;
    addBox(stair.x2 - stair.x1, h, dz, (stair.x1 + stair.x2) / 2, (s.top + p.bottom) / 2, (s.z1 + s.z2) / 2, poolMatShared, COV);
  }

  // 泳道线 + 泳道绳
  const lanes = p.lanes || 0;
  if (lanes) {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x0e3a58, roughness: 0.6 });
    for (let i = 0; i <= lanes; i++) {
      const lx = p.x1 + (W / lanes) * i;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, fullLen - 0.7), lineMat);
      line.rotation.x = -Math.PI / 2; line.position.set(lx, p.bottom + 0.02, zc); scene.add(line);
      const t1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.6), lineMat);
      t1.rotation.x = -Math.PI / 2; t1.position.set(lx, p.bottom + 0.02, p.zDeep1 + 0.9); scene.add(t1);
      const t2 = t1.clone(); t2.position.z = p.zEnd - 0.9; scene.add(t2);
    }
    const rmat = new THREE.MeshStandardMaterial({ map: makeRopeTexture(), roughness: 0.55, metalness: 0.05 });
    const capMatR = new THREE.MeshStandardMaterial({ color: 0xb03028, roughness: 0.5 });
    for (let i = 1; i < lanes; i++) {
      const rx = p.x1 + (W / lanes) * i;
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, fullLen - 0.5, 10), rmat);
      rope.rotation.x = Math.PI / 2; rope.position.set(rx, p.water + 0.045, zc); scene.add(rope);
      [p.zDeep1 + 0.3, p.zEnd - 0.3].forEach(ez => {
        const ec = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12), capMatR);
        ec.rotation.x = Math.PI / 2; ec.position.set(rx, p.water + 0.045, ez); scene.add(ec);
      });
    }
  }

  // 溢流槽（深色池沿收边）+ 排水格栅（实例化合批）
  const rimH = matFor(rimTiles, 1, 1);
  addBox(W + 0.4, 0.14, 0.44, cx, 0.07, p.zDeep1 - 0.16, rimH);
  addBox(0.44, 0.14, fullLen, p.x1 - 0.16, 0.07, zc, rimH);
  addBox(0.44, 0.14, fullLen, p.x2 + 0.16, 0.07, zc, rimH);
  addBox(W + 0.4, 0.14, 0.44, cx, 0.07, p.zEnd + 0.16, rimH);
  l37DrainGrid(p);

  // 不锈钢扶梯（池岸两组）
  const metal = new THREE.MeshStandardMaterial({ color: 0xe4ebee, metalness: 1.0, roughness: 0.22 });
  [cx - 1.6, cx + 1.6].forEach(lx => {
    [-0.45, 0.45].forEach(dx => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 14), metal);
      rail.position.set(lx + dx, 0.1, p.zDeep1 + 0.55); scene.add(rail);
    });
    [0.75, 0.45, 0.15, -0.25, -0.6].forEach(y => {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.9, 10), metal);
      rung.position.set(lx, y, p.zDeep1 + 0.55); rung.rotation.z = Math.PI / 2; scene.add(rung);
    });
  });

  // 出发台（仅主池北端池岸 4 座）
  if (lanes && p.name === 'main') {
    const blockMat = new THREE.MeshStandardMaterial({ color: 0xe8eae8, roughness: 0.35, metalness: 0.08 });
    for (let i = 0; i < 4; i++) {
      const bx = p.x1 + 2.1 + i * 2.6;
      addBox(0.55, 0.5, 0.55, bx, 0.55, p.zDeep1 - 0.5, blockMat);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.75), blockMat);
      top.position.set(bx, 0.84, p.zDeep1 - 0.32); top.rotation.x = -0.14; scene.add(top);
      COLLIDERS.push({ x1: bx - 0.3, x2: bx + 0.3, z1: p.zDeep1 - 0.88, z2: p.zDeep1 - 0.18, y1: 0, y2: 0.84, kind: 'block' });
    }
  }

  // 碰撞：池壁仅站立时阻挡（poolSide），台阶西侧与池沿外沿实体
  COLLIDERS.push({ x1: p.x1 - 0.15, x2: p.x2 + 0.15, z1: p.zDeep1 - 0.15, z2: p.zDeep1 + 0.15, poolSide: true });
  COLLIDERS.push({ x1: p.x1 - 0.15, x2: p.x1 + 0.15, z1: p.zDeep1 - 0.2, z2: p.zEnd + 0.2, poolSide: true });
  COLLIDERS.push({ x1: p.x2 - 0.15, x2: p.x2 + 0.15, z1: p.zDeep1 - 0.2, z2: p.zEnd + 0.2, poolSide: true });
  COLLIDERS.push({ x1: stair.x1 - 0.2, x2: stair.x1 + 0.05, z1: p.zEnd - 0.25, z2: p.zEnd + 0.25, y1: 0, y2: 1.0, kind: 'stairSide' });
  COLLIDERS.push({ x1: stair.x2, x2: p.x2 + 0.15, z1: p.zEnd - 0.15, z2: p.zEnd + 0.15, poolSide: true });

  // 水面（室内静水）
  const water = new Water(new THREE.PlaneGeometry(W + 0.35, fullLen + 0.35), {
    textureWidth: 512, textureHeight: 512,
    waterNormals: makeAINormalTexture('textures/water-surface.png', 7, 5),
    sunDirection: new THREE.Vector3(0, 1, 0),
    sunColor: 0xfff6e0, waterColor: 0x1a6ab4, distortionScale: 0.45, fog: true });
  water.material.transparent = true;
  water.material.uniforms.alpha.value = 0.55;
  water.material.depthWrite = false;
  water.material.needsUpdate = true;
  const wu = water.material.uniforms;
  wu.rect = { value: new THREE.Vector4(p.x1, p.zDeep1, p.x2, p.zEnd) };
  wu.maxDepth = { value: (Math.min(W, fullLen) / 2) * 0.75 };
  let fs = water.material.fragmentShader;
  fs = 'uniform vec4 rect;\nuniform float maxDepth;\n' + fs;
  fs = fs.replace(/void main\(\) \{/, `void main() {
    vec2 relE = min( worldPosition.xz - rect.xy, rect.zw - worldPosition.xz );
    float depth01 = clamp( min( relE.x, relE.y ) / maxDepth, 0.0, 1.0 );`);
  fs = fs.replace(/float theta[\s\S]*?gl_FragColor = vec4\( outgoingLight, alpha \);/, `
    float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
    float rf0 = 0.28 + depth01 * 0.24;
    float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
    vec3 shallowC = vec3( 0.16, 0.68, 0.78 );
    vec3 deepC = vec3( 0.02, 0.24, 0.56 );
    vec3 depthTint = mix( shallowC, deepC, smoothstep( 0.10, 0.92, depth01 ) );
    vec3 reflTint = reflectionSample * mix( vec3( 1.0 ), vec3( 0.74, 0.87, 1.04 ), 0.3 + depth01 * 0.5 );
    vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * ( waterColor * 0.28 + depthTint * 1.1 );
    vec3 bottomView = ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask();
    vec3 albedo = mix( bottomView, vec3( 0.08 ) + reflTint * 0.95 + reflTint * specularLight, reflectance );
    gl_FragColor = vec4( albedo, mix( 0.40, 0.93, depth01 * depth01 * 0.6 + depth01 * 0.4 ) );`);
  water.material.fragmentShader = fs;
  water.material.needsUpdate = true;
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, p.water, zc);
  scene.add(water);
  waterMats.push(water.material);
  const origOR = water.onBeforeRender;
  water.onBeforeRender = function () {
    const t0 = water.material.uniforms.time.value;
    origOR.apply(this, arguments);
    water.material.uniforms.time.value = t0 + (water.material.uniforms.time.value - t0) * 0.04;
  };
  makeCaustics(W - 0.6, fullLen - 0.9, cx, zc, p.bottom + 0.035, 0.0022);
  p.waterMesh = water;
  return water;
}

/* 池沿排水格栅（单个实例网格，几十个格栅只占 1 次绘制） */
function l37DrainGrid(p) {
  const g = new THREE.PlaneGeometry(0.26, 0.26);
  const m = new THREE.MeshStandardMaterial({ color: 0x59615f, roughness: 0.62, metalness: 0.5 });
  const inst = new THREE.InstancedMesh(g, m, 64);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let x = p.x1 + 0.6; x < p.x2 - 0.2 && n < 62; x += 2.2) {
    dummy.position.set(x, 0.012, p.zDeep1 - 0.62); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix();
    inst.setMatrixAt(n++, dummy.matrix);
    dummy.position.set(x, 0.012, p.zEnd + 0.62); dummy.updateMatrix();
    inst.setMatrixAt(n++, dummy.matrix);
  }
  inst.count = n; inst.receiveShadow = true; inst.castShadow = false;
  scene.add(inst);
}

buildPool(POOLS[0]);
buildPool(POOLS[1]);
buildPool(POOLS[2]);

/* 池深标识（Canvas 贴花） */
function l37DeckSign(text, sub, x, z, ry, w = 1.5, h = 0.9) {
  const c = makeCanvas(256, 160), g = c.getContext('2d');
  g.fillStyle = '#1d4a5a'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#9ff0e6'; g.lineWidth = 5; g.strokeRect(6, 6, 244, 148);
  g.fillStyle = '#eafcff'; g.font = 'bold 74px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 62);
  g.font = 'bold 34px Arial'; g.fillStyle = '#b6e9e2'; g.fillText(sub, 128, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(t));
  mesh.rotation.set(-Math.PI / 2, 0, ry || 0);
  mesh.position.set(x, 0.016, z);
  scene.add(mesh);
}
l37DeckSign('2.05 m', '主池 · 六泳道', -9.9, 12.6, 0, 2.0, 1.2);
l37DeckSign('1.15 m', '训练池', 19.8, 5.6, Math.PI, 1.6, 1.0);
l37DeckSign('0.62 m', '浅水回声池', -14.2, -22, 0, 1.9, 1.1);

/* 主厅东墙高处一排窗框（贴花式，不改碰撞） */
(function l37EastClere() {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9cfcb, roughness: 0.4, metalness: 0.5 });
  for (const wz of [-10, -2, 6]) {
    addBox(0.06, 1.0, 0.10, 11.78, 3.1, wz - 0.9, frameMat);
    addBox(0.06, 1.0, 0.10, 11.78, 3.1, wz + 0.9, frameMat);
    addBox(0.06, 0.10, 1.9, 11.78, 3.6, wz, frameMat);
    addBox(0.06, 0.10, 1.9, 11.78, 2.6, wz, frameMat);
  }
})();

/* ---------------- 灯光（预算：26 盏点光 + 半球 + 天光，固定不随帧创建） ---------------- */
const poolLights = [];      // { light, fxMat, base, zone }
const lockerLights = [];    // 更衣区可闪灯（同时登记在 poolLights）
function l37Lamp(x, z, zone, o = {}) {
  const color = o.color == null ? 0xf2f6ff : o.color;
  const power = o.power == null ? 3.1 : o.power;
  const dist = o.dist == null ? 9.5 : o.dist;
  const y = o.y == null ? H - 0.16 : o.y;
  const light = new THREE.PointLight(color, power, dist, 2);
  light.position.set(x, y, z); scene.add(light);
  const fxMat = new THREE.MeshStandardMaterial({ color: 0x0e1214, emissive: color, emissiveIntensity: 4.4, roughness: 0.6 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(o.r == null ? 0.26 : o.r, 16), fxMat);
  disc.rotation.x = Math.PI / 2; disc.position.set(x, y + 0.03, z); scene.add(disc);
  const rec = { light, fxMat, base: power, zone };
  poolLights.push(rec);
  if (o.locker) lockerLights.push(rec);
  return rec;
}
// 主池厅 8
for (const [x, z] of [[-10, -11], [0, -11], [8, -11], [-10, 2], [0, 2], [8, 2], [-4, 9], [6, 9]]) l37Lamp(x, z, 'main');
// 前厅 2
l37Lamp(-0.5, 18, 'entry', { power: 2.6, dist: 8 });
l37Lamp(5.2, 21, 'entry', { power: 2.4, dist: 8 });
// 更衣区 4（可闪）
for (const z of [-10, -2, 8, 18]) l37Lamp(-22, z, 'locker', { power: 2.2, dist: 8.5, locker: true });
// 回声室 3（冷色水光，低顶棚下）
l37Lamp(-9, -22, 'echo', { color: 0xa9e8ff, power: 2.6, dist: 8, y: L37_ECHO_H - 0.14 });
l37Lamp(-18, -24, 'echo', { color: 0x8fd9c8, power: 2.0, dist: 7, y: L37_ECHO_H - 0.14 });
l37Lamp(0, -20, 'echo', { color: 0xa9e8ff, power: 1.9, dist: 7, y: L37_ECHO_H - 0.14 });
// 北廊 3
for (const [x, z] of [[8, -22], [18, -22], [26, -24]]) l37Lamp(x, z, 'corridor', { power: 1.9, dist: 8 });
// 训练池厅 4
for (const [x, z] of [[14, 10], [21, 10], [27, 2], [13, -10]]) l37Lamp(x, z, 'train');
// 设备间 2
l37Lamp(27, -11, 'equip', { power: 2.2, dist: 7, y: L37_EQUIP_H - 0.14 });
l37Lamp(26.4, -14.4, 'equip', { power: 1.6, dist: 6, color: 0xffd9a6, y: L37_EQUIP_H - 0.14 });
// 水面两盏冷光（保留原有池面高光）
[0xc9f2ff, 0xc9f2ff].forEach((c, i) => {
  const l = new THREE.PointLight(c, 8.5, 13, 2);
  l.position.set(i ? 3.2 : -3.2, 2.2, i ? 4.5 : -1.5); scene.add(l);
  poolLights.push({ light: l, fxMat: null, base: 8.5, zone: 'pool' });
});
const hemi = new THREE.HemisphereLight(0xfff1dd, 0x84989a, 0.5);
scene.add(hemi);

/* ---------------- 更衣淋浴区（x -28..-14） ---------------- */
const showerSprays = [], lockerDoors = [], steamPlanes = [];
let lockerFigure = null;
function l37LockerTex() {
  const c = makeCanvas(256, 512), g = c.getContext('2d');
  g.fillStyle = '#3d5a5f'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#42646a' : '#3a555a';
    g.fillRect(6, 8 + i * 84, 244, 76);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(6, 84 + i * 84, 244, 3);
    g.fillStyle = 'rgba(210,240,238,0.28)';
    for (let k = 0; k < 4; k++) g.fillRect(84, 22 + i * 84 + k * 7, 88, 3);
    g.fillStyle = '#c8d4d2'; g.fillRect(224, 44 + i * 84, 6, 18);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
(function buildLockerRoomL37() {
  const lockerMat = new THREE.MeshStandardMaterial({ map: l37LockerTex(), roughness: 0.48, metalness: 0.35 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xa98a5c, roughness: 0.72 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x59625f, roughness: 0.45, metalness: 0.6 });

  function lockerBank(x, z1, z2, face) {
    const len = z2 - z1, zc = (z1 + z2) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.9, len), lockerMat);
    body.position.set(x, 0.95, zc); body.castShadow = true; body.receiveShadow = true; scene.add(body);
    addBox(0.66, 0.06, len + 0.04, x, 1.93, zc, frameMat);
    COLLIDERS.push({ x1: x - 0.33, x2: x + 0.33, z1: z1 - 0.03, z2: z2 + 0.03, y1: 0, y2: 1.96, kind: 'locker' });
    for (let i = 0; i < 3; i++) {
      const dz = z1 + (len / 3) * (i + 0.5);
      const pivot = new THREE.Group();
      pivot.position.set(x + face * 0.32, 1.05, dz - len / 6);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, len / 3 - 0.06), lockerMat);
      leaf.position.set(0, 0, len / 6); pivot.add(leaf); scene.add(pivot);
      lockerDoors.push({ pivot, amp: (Math.random() > 0.5 ? 1 : -1) * 0.9, t: Math.random() * 6 });
    }
  }
  // 中央柜岛两侧相对（形成必须绕行的实体块）
  lockerBank(-20.4, -4, 6, 1);
  lockerBank(-17.6, -4, 6, -1);
  // 西墙淋浴隔间（4 间）
  const stallMat = new THREE.MeshStandardMaterial({ color: 0xcfd6d2, roughness: 0.35, metalness: 0.05 });
  for (const pz of [-12, -8.4, -4.8, -1.2, 2.4]) {
    addBox(2.4, 2.2, 0.16, -26.8, 1.1, pz, stallMat);
    COLLIDERS.push({ x1: -28, x2: -25.6, z1: pz - 0.1, z2: pz + 0.1, y1: 0, y2: 2.2, kind: 'stall' });
  }
  for (let i = 0; i < 4; i++) {
    const pz = -10.2 + i * 3.6;
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd9e2e0, metalness: 0.9, roughness: 0.25 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), headMat);
    head.position.set(-27.5, 2.15, pz); scene.add(head);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.5, 8), headMat);
    arm.position.set(-27.5, 2.4, pz); arm.rotation.z = Math.PI / 2; scene.add(arm);
    const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.14, 2.0, 10),
      new THREE.MeshBasicMaterial({ color: 0xd8f2f6, transparent: true, opacity: 0.13, depthWrite: false }));
    spray.position.set(-27.35, 1.15, pz); spray.visible = false; scene.add(spray);
    showerSprays.push({ mesh: spray, on: false, t: Math.random() * 20, z: pz });
    addBox(0.22, 0.02, 0.22, -26.6, 0.012, pz + 1.4, frameMat);
  }
  // 长凳（三条）
  for (const [bx, bz, ry] of [[-20.4, 9.4, 0], [-20.4, -13.4, 0], [-23.4, 17.2, Math.PI / 2]]) {
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 3.2), benchMat); top.position.y = 0.46; grp.add(top);
    for (const dz of [-1.4, 1.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.1), frameMat);
      leg.position.set(0, 0.22, dz); grp.add(leg);
    }
    grp.position.set(bx, 0, bz); grp.rotation.y = ry; grp.castShadow = true; scene.add(grp);
    if (ry === 0) COLLIDERS.push({ x1: bx - 0.3, x2: bx + 0.3, z1: bz - 1.7, z2: bz + 1.7, y1: 0, y2: 0.5, kind: 'bench' });
    else COLLIDERS.push({ x1: bx - 1.7, x2: bx + 1.7, z1: bz - 0.3, z2: bz + 0.3, y1: 0, y2: 0.5, kind: 'bench' });
  }
  // 蒸汽面片
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xdfeef0, transparent: true, opacity: 0.07, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), steamMat.clone());
    s.position.set(-24 + Math.random() * 6, 0.6 + Math.random() * 1.6, -11 + Math.random() * 20);
    s.material.opacity = 0.04 + Math.random() * 0.05;
    scene.add(s); steamPlanes.push({ mesh: s, y0: s.position.y, ph: Math.random() * 6.28 });
  }
  // 柜间人影（低频、不可追、共享受击冷却）
  lockerFigure = makeLockerFigure();
})();

function makeLockerFigure() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0c0f10, roughness: 1, metalness: 0 });
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.6, 4, 10), mat);
  torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat);
  head.position.y = 1.66; g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8c1a10 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat);
    e.position.set(s * 0.04, 1.68, 0.11); g.add(e);
  }
  g.visible = false; scene.add(g); return g;
}
let lockerHorrorT = 38 + Math.random() * 26, lockerFigureT = 0;
function resetLockerHorror() {
  for (const l of lockerLights) { l.light.intensity = l.base; if (l.fxMat) l.fxMat.emissiveIntensity = 4.4; }
  for (const d of lockerDoors) d.pivot.rotation.y = 0;
  for (const s of showerSprays) { s.on = false; s.mesh.visible = false; }
  if (lockerFigure) lockerFigure.visible = false;
  lockerHorrorT = 38 + Math.random() * 26;
}
function updateLockerRoom(dt) {
  if (LEVEL !== 1) return;
  const t = performance.now() * 0.001;
  const inRoom = player.x < -14.2 && player.x > -28.2 && player.z > -16 && player.z < 24;
  for (const s of steamPlanes) {
    const m = s.mesh;
    m.position.y = s.y0 + Math.sin(t * 0.4 + s.ph) * 0.18;
    m.position.x += Math.sin(t * 0.23 + s.ph) * dt * 0.05;
    m.material.opacity = (inRoom ? 0.07 : 0.035) + Math.sin(t * 0.7 + s.ph) * 0.02;
  }
  for (const s of showerSprays) {
    s.t -= dt;
    if (s.t <= 0) { s.on = !s.on; s.mesh.visible = s.on; s.t = s.on ? 3 + Math.random() * 5 : 6 + Math.random() * 14; }
    if (s.on) s.mesh.material.opacity = 0.10 + Math.sin(t * 9 + s.z) * 0.03;
  }
  for (const d of lockerDoors) {
    d.t -= dt;
    const target = d.t < 0 ? d.amp * 0.55 : 0;
    d.pivot.rotation.y += (target - d.pivot.rotation.y) * Math.min(1, dt * 2.4);
    if (d.t < -1.6) d.t = 12 + Math.random() * 26;
  }
  for (const l of lockerLights) {
    const flick = inRoom && Math.random() < 0.02 ? 0.15 : 1;
    l.light.intensity = l.base * (0.82 + 0.18 * Math.sin(t * 3.1 + l.light.position.z)) * flick;
    if (l.fxMat) l.fxMat.emissiveIntensity = 3.4 * flick;
  }
  lockerHorrorT -= dt; lockerFigureT -= dt;
  if (lockerFigure && !lockerFigure.visible && inRoom && lockerHorrorT <= 0 && horrorCooldownReady()) {
    lockerFigure.position.set(player.z > 0 ? -20.4 : -20.4, 0, player.z > 0 ? -2.6 : 4.4);
    lockerFigure.lookAt(player.x, 0, player.z);
    lockerFigure.visible = true;
    lockerFigureT = 1.6;
    synthDrip();
    lockerHorrorT = 55 + Math.random() * 40;
  }
  if (lockerFigure && lockerFigure.visible) {
    const d = Math.hypot(player.x - lockerFigure.position.x, player.z - lockerFigure.position.z);
    if (d < 2.2 && horrorCooldownReady()) { lockerFigure.visible = false; poolScare('柜间有人影……'); }
    else if (lockerFigureT <= 0) lockerFigure.visible = false;
  }
  dripTimer -= dt;
  if (dripTimer <= 0 && inRoom) { synthDrip(); dripTimer = 2.2 + Math.random() * 4; }
}

/* ---------------- 东侧：训练池设施 / 设备间 ---------------- */
(function buildTrainHall() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x8f9a9c, metalness: 0.8, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3436, roughness: 0.7, metalness: 0.3 });
  // 南侧观景长凳
  for (const bx of [14.5, 19.5, 24.5]) {
    addBox(2.4, 0.09, 0.42, bx, 0.45, 11.4, l37ColMat);
    addBox(0.12, 0.42, 0.34, bx - 1.0, 0.22, 11.4, metal);
    addBox(0.12, 0.42, 0.34, bx + 1.0, 0.22, 11.4, metal);
    COLLIDERS.push({ x1: bx - 1.2, x2: bx + 1.2, z1: 11.2, z2: 11.6, y1: 0, y2: 0.5, kind: 'bench' });
  }
  // 训练池出发台 2 座（北端池岸）
  for (const bx of [18.5, 21.5]) {
    addBox(0.5, 0.42, 0.5, bx, 0.5, -4.5, l37ColMat);
    COLLIDERS.push({ x1: bx - 0.28, x2: bx + 0.28, z1: -4.8, z2: -4.2, y1: 0, y2: 0.7, kind: 'block' });
  }
  // 设备间：泵组 / 管线 / 压力表 / 配电柜 / 工作台
  const pumpBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.1), dark);
  pumpBase.position.set(26.8, 0.08, -12.4); scene.add(pumpBase);
  for (const px of [26.1, 27.5]) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.72, 16), metal);
    body.position.set(px, 0.52, -12.4); body.rotation.z = Math.PI / 2; scene.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.04, 8, 18), dark);
    ring.position.set(px + 0.36, 0.52, -12.4); ring.rotation.y = Math.PI / 2; scene.add(ring);
  }
  COLLIDERS.push({ x1: 25.6, x2: 28.0, z1: -13.0, z2: -11.8, y1: 0, y2: 0.9, kind: 'pump' });
  for (const [py, pr] of [[2.5, 0.09], [2.1, 0.06], [1.72, 0.05]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 5.6, 12), metal);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(27, py, -15.4); scene.add(pipe);
  }
  for (const gx of [25.2, 26.4]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshStandardMaterial({ color: 0xe8ece9, roughness: 0.4 }));
    face.position.set(gx, 1.6, -15.78); scene.add(face);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0xa81010 }));
    needle.position.set(gx, 1.62, -15.76); needle.rotation.z = -0.6; scene.add(needle);
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3f4a4a, roughness: 0.5, metalness: 0.4 }));
  cab.position.set(24.6, 0.85, -9.4); cab.rotation.y = Math.PI / 2; scene.add(cab);
  COLLIDERS.push({ x1: 24.3, x2: 24.9, z1: -9.9, z2: -8.9, y1: 0, y2: 1.75, kind: 'cabinet' });
  addBox(1.8, 0.08, 0.7, 28.4, 0.86, -8.4, l37ColMat);
  addBox(0.1, 0.86, 0.62, 27.6, 0.43, -8.4, metal);
  addBox(0.1, 0.86, 0.62, 29.2, 0.43, -8.4, metal);
  COLLIDERS.push({ x1: 27.5, x2: 29.3, z1: -8.8, z2: -8.0, y1: 0, y2: 0.9, kind: 'workbench' });
})();

/* ---------------- 北回声室：水箱 / 管道 / 水光 ---------------- */
(function buildEchoRoom() {
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x6d7a78, roughness: 0.55, metalness: 0.45 });
  for (const [tx, tz, r] of [[-23.4, -20.2, 1.05], [-23.4, -25.6, 0.85]]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.2, 20), tankMat);
    tank.position.set(tx, 1.1, tz); tank.castShadow = true; scene.add(tank);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.1, 20), l37TrimMat);
    cap.position.set(tx, 2.24, tz); scene.add(cap);
    COLLIDERS.push({ x1: tx - r, x2: tx + r, z1: tz - r, z2: tz + r, y1: 0, y2: 2.3, kind: 'tank' });
  }
  for (const [pz, py] of [[-18.2, 2.3], [-26.4, 2.35]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 9.4, 12), tankMat);
    p.rotation.z = Math.PI / 2; p.position.set(-18.6, py, pz); scene.add(p);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 6.4),
    new THREE.MeshBasicMaterial({ color: 0x8fe6de, transparent: true, opacity: 0.10, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(-8, POOLS[2].water + 0.02, -22); scene.add(glow);
})();

/* ---------------- 入口前厅陈设 ---------------- */
(function buildEntryVestibule() {
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a5c58, roughness: 0.5, metalness: 0.25 });
  addBox(2.6, 1.05, 0.6, -0.3, 0.525, 21.6, deskMat);
  addBox(2.8, 0.06, 0.7, -0.3, 1.08, 21.6, l37TrimMat);
  COLLIDERS.push({ x1: -1.6, x2: 1.0, z1: 21.3, z2: 21.9, y1: 0, y2: 1.1, kind: 'desk' });
  addBox(2.6, 0.09, 0.42, 5.4, 0.45, 14.2, l37ColMat);
  addBox(0.12, 0.42, 0.34, 4.3, 0.22, 14.2, l37TrimMat);
  addBox(0.12, 0.42, 0.34, 6.5, 0.22, 14.2, l37TrimMat);
  COLLIDERS.push({ x1: 4.1, x2: 6.7, z1: 14.0, z2: 14.4, y1: 0, y2: 0.5, kind: 'bench' });
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x1d2b2c, roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(3, 0.006, 16.4); scene.add(mat);
  const c = makeCanvas(512, 128), g = c.getContext('2d');
  g.fillStyle = '#0d2b31'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#7ff0e2'; g.font = 'bold 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POOL · LEVEL 37', 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, color: 0x000000 }));
  sign.position.set(3, 2.86, 11.75); scene.add(sign);
  // 两侧附属间陈设
  addBox(1.2, 1.7, 0.5, -13.2, 0.85, 14.4, deskMat);
  COLLIDERS.push({ x1: -13.8, x2: -12.6, z1: 14.1, z2: 14.7, y1: 0, y2: 1.75, kind: 'shelf' });
  addBox(0.9, 1.4, 1.6, 10.4, 0.7, 16.0, deskMat);
  COLLIDERS.push({ x1: 9.6, x2: 11.2, z1: 15.2, z2: 16.8, y1: 0, y2: 1.45, kind: 'workbench' });
})();

/* ============================================================ 池中人（Level 37 专属模型） */
/* 与第一关黑影完全独立：灰白浸水皮肤、凹陷眼窝、塌肩偏斜头、分层湿发束、指肘膝连续。
   动画分 stand / swim / sink 三态；由 updatePoolHorror 驱动。 */
const DROWNED_HEAD_TOP = 1.97;   // 局部空间头顶高度（供游姿计算用，测试会校验）

function buildDrownedBody() {
  const g = new THREE.Group();
  const R = {};
  // 复用既有怪物贴图：dead-skin（浅色裂纹，正合淹死体）做皮肤，monster-hair 做发束；
  // 皮肤用物理材质给一层湿润 clearcoat，避免"无贴图塑料人"。
  const drownedSkinSet = { diffuse: 'textures/dead-skin.png', coverageX: 1.3, coverageY: 1.3 };
  const skinMat = physicalMat(drownedSkinSet, 1.3, 1.3, {
    color: 0xcfdad4, roughness: 0.38, metalness: 0.03,
    clearcoat: 0.45, clearcoatRoughness: 0.35, emissive: 0x0b1413, emissiveIntensity: 0.35 });
  const deepSkin = matFor(drownedSkinSet, 1.6, 1.6, {
    color: 0x93a49e, roughness: 0.5, metalness: 0.02, emissive: 0x0a1211, emissiveIntensity: 0.3 });
  const hairMat = new THREE.MeshStandardMaterial({
    map: texFrom('textures/monster-hair.png', 1, 2, true), color: 0x14150f, roughness: 0.72, metalness: 0.03 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x120b09, emissive: 0x4a160c, emissiveIntensity: 1.5, roughness: 0.9 });
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

  R.hips = add(new THREE.SphereGeometry(0.17, 16, 12), skinMat);
  R.hips.scale.set(1.1, 0.78, 0.9); R.hips.position.y = 0.9; g.add(R.hips);
  R.spine = add(new THREE.CapsuleGeometry(0.135, 0.42, 6, 14), skinMat);
  R.spine.position.set(0, 1.2, 0.01); R.spine.rotation.x = 0.1; g.add(R.spine);
  R.chest = add(new THREE.SphereGeometry(0.19, 18, 14), skinMat);
  R.chest.scale.set(1.22, 0.8, 0.82); R.chest.position.set(0, 1.47, 0.02); g.add(R.chest);
  const wet = new THREE.MeshStandardMaterial({ color: 0x6f7d7a, transparent: true, opacity: 0.42, roughness: 0.9, depthWrite: false });
  const wrap = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), wet);
  wrap.position.set(0, 1.3, 0.15); wrap.scale.set(1, 1.5, 1); g.add(wrap);
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), deepSkin);
  socket.position.set(0, 1.58, 0.15); socket.scale.set(2.2, 0.6, 1); g.add(socket);

  // 塌肩（左右不对称）
  R.shoulderL = add(new THREE.SphereGeometry(0.082, 12, 10), skinMat);
  R.shoulderL.position.set(-0.215, 1.56, 0.0); g.add(R.shoulderL);
  R.shoulderR = add(new THREE.SphereGeometry(0.074, 12, 10), skinMat);
  R.shoulderR.position.set(0.198, 1.61, 0.01); g.add(R.shoulderR);
  R.neck = add(new THREE.CylinderGeometry(0.046, 0.062, 0.2, 10), skinMat);
  R.neck.position.set(0.02, 1.7, 0.02); R.neck.rotation.z = 0.18; g.add(R.neck);
  R.head = new THREE.Group();
  const skull = add(new THREE.SphereGeometry(0.135, 18, 14), skinMat);
  skull.scale.set(0.84, 1.06, 0.94); R.head.add(skull);
  for (const s of [-1, 1]) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMat);
    orb.position.set(s * 0.058, 0.005, 0.108); orb.scale.set(1, 0.8, 0.55); R.head.add(orb);
  }
  const jaw = add(new THREE.SphereGeometry(0.075, 12, 10), skinMat);
  jaw.scale.set(0.9, 0.7, 1.0); jaw.position.set(0, -0.1, 0.02); R.head.add(jaw);
  R.head.position.set(0.026, 1.83, 0.03);
  R.head.rotation.set(0.3, 0.1, 0.22);
  g.add(R.head);
  // 分层湿发束（14 束，长度不一，前额遮脸，游动时滞后）
  R.strands = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const len = 0.26 + Math.random() * 0.34;
    const st = new THREE.Group();
    st.position.set(Math.sin(a) * 0.11, 0.06, Math.cos(a) * 0.11);
    st.rotation.set((Math.cos(a) > 0 ? 0.3 : -0.2), a, Math.sin(a) * 0.2);
    const lock = new THREE.Mesh(new THREE.ConeGeometry(0.028, len, 5), hairMat);
    lock.scale.set(1, 1, 0.42);
    lock.position.y = -len / 2; st.add(lock);
    st.userData.bx = st.rotation.x; st.userData.len = len;
    R.head.add(st); R.strands.push(st);
  }

  function arm(side, y0, len, thick) {
    const a = new THREE.Group(); a.position.set(side * 0.2, y0, 0);
    const up = add(new THREE.CapsuleGeometry(thick, len * 0.45, 4, 8), skinMat); up.position.y = -len * 0.25; a.add(up);
    const el = add(new THREE.SphereGeometry(thick * 1.08, 10, 8), deepSkin); el.position.y = -len * 0.5; a.add(el);
    const fo = add(new THREE.CapsuleGeometry(thick * 0.82, len * 0.42, 4, 8), skinMat); fo.position.y = -len * 0.74; a.add(fo);
    const wr = add(new THREE.SphereGeometry(thick * 0.8, 8, 6), deepSkin); wr.position.y = -len * 0.96; a.add(wr);
    const palm = add(new THREE.SphereGeometry(thick * 0.95, 10, 8), skinMat);
    palm.scale.set(1, 1.25, 0.55); palm.position.y = -len * 1.06; a.add(palm);
    const fingers = [];
    for (let f = 0; f < 5; f++) {
      const fg = new THREE.Mesh(new THREE.CapsuleGeometry(thick * 0.3, len * 0.2, 3, 6), skinMat);
      fg.position.set((f - 2) * thick * 0.5, -len * 1.2, 0);
      fg.rotation.x = 0.2 + f * 0.05; a.add(fg); fingers.push(fg);
    }
    a.userData.fingers = fingers;
    g.add(a); return a;
  }
  R.armL = arm(-1, 1.56, 1.06, 0.05);
  R.armR = arm(1, 1.61, 1.12, 0.046);   // 右臂略长（不对称）

  function leg(side) {
    const l = new THREE.Group(); l.position.set(side * 0.095, 0.9, 0);
    const th = add(new THREE.CapsuleGeometry(0.072, 0.42, 4, 8), skinMat); th.position.y = -0.24; l.add(th);
    const kn = add(new THREE.SphereGeometry(0.066, 8, 6), deepSkin); kn.position.y = -0.48; l.add(kn);
    const sh = add(new THREE.CapsuleGeometry(0.05, 0.46, 4, 8), skinMat); sh.position.y = -0.75; l.add(sh);
    const ft = add(new THREE.BoxGeometry(0.09, 0.055, 0.22), skinMat); ft.position.set(0, -0.99, 0.06); l.add(ft);
    g.add(l); return l;
  }
  R.legL = leg(-1); R.legR = leg(1);

  g.userData.body = R;
  g.userData.anim = { t: Math.random() * 8, blend: 0, look: 0 };
  g.userData.skin = skinMat;     // 兼容旧引用（enterPoolrooms / resetGame）
  g.userData.eyes = eyeMat;
  return g;
}

function animateDrowned(g, dt, mode) {
  const R = g.userData.body, A = g.userData.anim;
  A.t += dt;
  const s = A.t;
  if (mode === 'swim') {
    A.blend = Math.min(1, A.blend + dt * 2.2);
    R.legL.rotation.x = Math.sin(s * 2.1) * 0.42 * A.blend;
    R.legR.rotation.x = Math.sin(s * 2.1 + 1.1) * 0.36 * A.blend;         // 两腿不同相位
    R.armL.rotation.x = -1.1 + Math.sin(s * 2.4) * 0.55 * A.blend;
    R.armR.rotation.x = -1.1 + Math.sin(s * 2.4 + 1.5) * 0.5 * A.blend;   // 两臂不同相位
    R.armL.rotation.z = -0.35; R.armR.rotation.z = 0.3;
    R.spine.rotation.x = 0.12 + Math.sin(s * 1.2) * 0.05;
    R.head.rotation.x = 0.25 + Math.sin(s * 0.9) * 0.1;
  } else if (mode === 'sink') {
    A.blend = Math.max(0, A.blend - dt * 1.6);
    R.armL.rotation.x = -0.4; R.armR.rotation.x = -0.4;
    R.legL.rotation.x = 0.2; R.legR.rotation.x = 0.1;
    R.spine.rotation.x = 0.3;
  } else {
    A.blend = Math.max(0, A.blend - dt * 2.4);
    const b = Math.sin(s * 1.35);
    R.chest.scale.set(1.22, 0.8 + b * 0.012, 0.82);
    R.spine.rotation.x = 0.1 + b * 0.02;
    R.shoulderL.position.y = 1.56 + b * 0.006;
    R.armL.rotation.x = -0.06 + Math.sin(s * 0.7) * 0.03;
    R.armR.rotation.x = -0.04 + Math.sin(s * 0.62 + 2.1) * 0.028;
    R.legL.rotation.x *= 0.94; R.legR.rotation.x *= 0.94;
    A.look += ((player.x - g.position.x) * 0.02 - A.look) * Math.min(1, dt * 0.7);
    R.head.rotation.y = Math.max(-0.6, Math.min(0.6, A.look));
    R.head.rotation.z = 0.22 + Math.sin(s * 0.5) * 0.03;
    const fg = R.armR.userData.fingers;
    for (let i = 0; i < fg.length; i++) fg[i].rotation.x = 0.2 + i * 0.05 + Math.sin(s * 2.2 + i) * 0.08;
  }
  for (const st of R.strands) {
    st.rotation.x = st.userData.bx + Math.sin(A.t * 1.5 + st.userData.len * 9) * (0.06 + A.blend * 0.22);
    st.rotation.z = Math.sin(A.t * 1.1 + st.userData.len * 7) * (0.04 + A.blend * 0.14);
  }
}

const watcher = buildDrownedBody();
watcher.scale.setScalar(0.95);
scene.add(watcher);
const WATCHER_SPOTS = [[-6, -3], [0, 4], [-4.5, -8], [1, 8], [-8, 1], [-1.5, -11], [-2, -1]];
function watcherHome() { return { x: -3, y: POOLS[0].bottom, z: -12.2 }; }
watcher.position.set(watcherHome().x, watcherHome().y, watcherHome().z);
// 水面波纹环 + 水下剪影
const wake = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.7, 28),
  new THREE.MeshBasicMaterial({ color: 0x9fe8f4, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
wake.rotation.x = -Math.PI / 2; wake.position.set(0, POOLS[0].water + 0.02, 0); scene.add(wake);
const lurker = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.75, 6, 10),
  new THREE.MeshBasicMaterial({ color: 0x0d1a1c, transparent: true, opacity: 0.45, depthWrite: false }));
lurker.rotation.z = Math.PI / 2; lurker.visible = false; scene.add(lurker);

let poolIntroShown = false, dripTimer = 12;
const poolDark = { timer: 26 + Math.random() * 18, active: false, dur: 0 };
const poolMonster = { swim: false, phase: 'stand', vx: 0, vz: 0, sndT: 0, cool: 0, tpT: 4, moveT: 0 };

/* 视线遮挡：沿线段采样，只把"登记了 y2（真实高度）的碰撞体"当遮挡物（墙 / 柜 / 池沿外的实体） */
function segmentBlockedByWalls(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.ceil(len / 0.16));
  const cols = ACTIVE_COLLIDERS;
  for (let k = 1; k < n; k++) {
    const t = k / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.poolSide || c.metroBoardEdge) continue;
      if (c.y2 == null) continue;
      if (y < (c.y1 == null ? 0 : c.y1) || y > c.y2) continue;
      if (x > c.x1 && x < c.x2 && z > c.z1 && z < c.z2) return true;
    }
  }
  return false;
}
function watcherCanReachPlayer() {
  return !segmentBlockedByWalls(player.x, player.y + 1.2, player.z,
    watcher.position.x, watcher.position.y + 1.2, watcher.position.z);
}

function poolScare(msg) {
  if (!horrorCooldownReady()) return;
  synthScare();
  stats.scares++;
  const sf = document.getElementById('scare-flash');
  if (sf) { sf.style.opacity = '1'; setTimeout(() => { sf.style.opacity = '0'; }, 150); }
  showFlashText(msg || '它一直站在水里看着你……');
  safeRespawn(LEVEL);            // 统一安全复位：保留进度 + 给一段无攻击窗口
  poolMonster.phase = 'retreat';
  poolMonster.cool = 10;
  poolMonster.swim = false;
  watcher.position.set(-3, POOLS[0].bottom, POOLS[0].zDeep1 + 2.4);
}

/* 池中人游姿安全高度：不用解析式自证，而是把真实骨骼摆到该姿态后求 Box3（含发束 / 四肢 / 指尖），
   在 rotX 0..SWIM_ROT 上采样并取每个姿态的最大顶点，运行时按当前 rotX 线性插值。
   这样头顶既不会破水面 30cm，也不会整个沉下去；测试会用同样的 Box3 反查。 */
const DROWNED_SWIM_ROT = 0.42;
const DROWNED_SWIM_STEPS = 9;
const DROWNED_TOP_TABLE = (() => {
  const savedRotY = watcher.rotation.y, savedX = watcher.rotation.x, savedY = watcher.position.y;
  const savedPx = watcher.position.x, savedPz = watcher.position.z;
  const A = watcher.userData.anim;
  const savedT = A.t, savedBlend = A.blend;
  const box = new THREE.Box3();
  const table = [];
  for (let i = 0; i < DROWNED_SWIM_STEPS; i++) {
    const rotX = (DROWNED_SWIM_ROT * i) / (DROWNED_SWIM_STEPS - 1);
    let maxTop = -Infinity;
    // 姿态周期里取 12 个相位，覆盖四肢与发束的最大外延
    for (let k = 0; k < 12; k++) {
      watcher.position.set(0, 0, 0);
      watcher.rotation.set(rotX, 0, 0);
      A.blend = 1; A.t = (k / 12) * 2.6;
      animateDrowned(watcher, 0.0001, 'swim');
      watcher.updateMatrixWorld(true);
      box.setFromObject(watcher);
      if (Number.isFinite(box.max.y)) maxTop = Math.max(maxTop, box.max.y);
    }
    table.push(maxTop);
  }
  watcher.position.set(savedPx, savedY, savedPz);
  watcher.rotation.set(savedX, savedRotY, 0);
  A.t = savedT; A.blend = savedBlend;
  watcher.updateMatrixWorld(true);
  return table;
})();
function drownedSwimY(rotX, waterY) {
  const f = Math.max(0, Math.min(1, rotX / DROWNED_SWIM_ROT)) * (DROWNED_SWIM_STEPS - 1);
  const i = Math.min(DROWNED_SWIM_STEPS - 1, Math.floor(f));
  const frac = f - i;
  const a = DROWNED_TOP_TABLE[i];
  const b = DROWNED_TOP_TABLE[Math.min(DROWNED_SWIM_STEPS - 1, i + 1)];
  const top = a + (b - a) * frac;
  return waterY + 0.035 - top;      // 最高点压在水面下 3.5cm（发梢刚好贴水）
}

function updatePoolHorror(dt) {
  if (LEVEL !== 1) return;
  const now = performance.now() * 0.001;
  const wl = waterLevelAt(player.x, player.z);
  const inWater = wl != null && player.y < wl;
  const inMainPool = player.x > POOLS[0].x1 && player.x < POOLS[0].x2 && player.z > POOLS[0].zDeep1 && player.z < POOLS[0].zEnd;
  const distToWatcher = Math.hypot(player.x - watcher.position.x, player.z - watcher.position.z);

  // —— 停电循环 ——
  if (poolDark.active) {
    poolDark.dur -= dt;
    if (poolDark.dur <= 0) {
      poolDark.active = false;
      poolDark.timer = 26 + Math.random() * 20;
      hemi.intensity = 0.5;
      for (const L of poolLights) { L.light.intensity = L.base; if (L.fxMat) L.fxMat.emissiveIntensity = 4.4; }
      if (inMainPool && distToWatcher < 2.4 && Math.abs(player.y - watcher.position.y) < 2.6
        && watcherCanReachPlayer() && horrorCooldownReady()) poolScare('灯亮时它还在……');
    }
  } else {
    poolDark.timer -= dt;
    if (poolDark.timer <= 0) {
      poolDark.active = true; poolDark.dur = 4.6 + Math.random() * 2.4;
      for (const L of poolLights) { L.light.intensity = 0; if (L.fxMat) L.fxMat.emissiveIntensity = 0; }
      hemi.intensity = 0.09;
      synthBlackout();
      if (!poolIntroShown) { poolIntroShown = true; showFlashText('灯全灭了……'); }
      // 只在有效水下点之间转移，且不闪到接触距离
      const valid = WATCHER_SPOTS.filter(p => Math.hypot(p[0] - player.x, p[1] - player.z) > 4.6 &&
        p[0] > POOLS[0].x1 + 0.8 && p[0] < POOLS[0].x2 - 0.8 && p[1] > POOLS[0].zDeep1 + 0.8 && p[1] < POOLS[0].zEnd - 0.8);
      if (valid.length) {
        const p = valid[Math.floor(Math.random() * valid.length)];
        watcher.position.set(p[0], POOLS[0].bottom, p[1]);
        wake.position.set(p[0], POOLS[0].water + 0.02, p[1]);
        synthSplashFar();
      }
    }
  }

  // —— 池中人：只属于水体，永不上岸 ——
  const pool = POOLS[0];
  poolMonster.cool = Math.max(0, poolMonster.cool - dt);
  const cooldownOK = poolMonster.cool <= 0 && horrorCooldownReady();

  if (inWater && inMainPool) {
    poolMonster.phase = 'stalk';
    poolMonster.swim = true;
    // 速度：贴近时慢一点留出逃跑空间，远时略快（最高 1.85 < 玩家游泳 1.9）
    const sp = Math.min(1.85, 0.72 + distToWatcher * 0.1);
    const dx = player.x - watcher.position.x, dz = player.z - watcher.position.z;
    const d = Math.hypot(dx, dz) || 1;
    watcher.position.x = Math.max(pool.x1 + 0.45, Math.min(pool.x2 - 0.45, watcher.position.x + (dx / d) * sp * dt));
    watcher.position.z = Math.max(pool.zDeep1 + 0.45, Math.min(pool.zEnd - 0.45, watcher.position.z + (dz / d) * sp * dt));
    const ty = drownedSwimY(watcher.rotation.x, pool.water);
    watcher.rotation.x += (DROWNED_SWIM_ROT - watcher.rotation.x) * Math.min(1, dt * 3);
    watcher.position.y += (ty - watcher.position.y) * Math.min(1, dt * 2.6);
    watcher.rotation.y = Math.atan2(dx, dz);
    animateDrowned(watcher, dt, 'swim');
    wake.visible = true;
    wake.position.set(watcher.position.x, pool.water + 0.02, watcher.position.z);
    wake.material.opacity = 0.25 + Math.sin(now * 2.4) * 0.1;
    wake.scale.setScalar(1 + Math.sin(now * 1.7) * 0.08);
    if (distToWatcher < 1.35 && cooldownOK && watcherCanReachPlayer()) poolScare('它就在你身下……');
  } else {
    // 玩家在岸上：只在水里注视 / 缓慢挪动，不上岸追人
    if (poolMonster.phase !== 'retreat') poolMonster.phase = 'stand';
    poolMonster.swim = false;
    watcher.rotation.x += (0 - watcher.rotation.x) * Math.min(1, dt * 2.2);
    animateDrowned(watcher, dt, poolMonster.phase === 'retreat' ? 'sink' : 'stand');
    poolMonster.tpT -= dt;
    if (poolMonster.tpT <= 0 && poolMonster.phase !== 'retreat') {
      const tx2 = Math.max(pool.x1 + 1.0, Math.min(pool.x2 - 1.0, player.x));
      const tz2 = Math.max(pool.zDeep1 + 1.0, Math.min(pool.zEnd - 1.0, player.z - 2.5));
      watcher.position.x += (tx2 - watcher.position.x) * 0.35;
      watcher.position.z += (tz2 - watcher.position.z) * 0.35;
      poolMonster.tpT = 5 + Math.random() * 5;
    }
    watcher.position.y += (pool.bottom - watcher.position.y) * Math.min(1, dt * 1.4);
    watcher.rotation.y = Math.atan2(player.x - watcher.position.x, player.z - watcher.position.z);
    wake.visible = distToWatcher < 9;
    wake.position.set(watcher.position.x, pool.water + 0.02, watcher.position.z);
    wake.material.opacity = wake.visible ? 0.12 + Math.sin(now * 1.4) * 0.05 : 0;
    if (poolMonster.phase === 'retreat') {
      watcher.position.z += (pool.zDeep1 + 2.2 - watcher.position.z) * Math.min(1, dt * 0.9);
      if (watcher.position.z < pool.zDeep1 + 3.0) poolMonster.phase = 'stand';
    }
  }
  // 水下剪影
  const lurkerOn = inWater && inMainPool && distToWatcher < 12;
  lurker.visible = lurkerOn;
  if (lurkerOn) {
    lurker.position.set(watcher.position.x + Math.sin(now * 0.9) * 1.4, pool.water - 1.15,
      watcher.position.z + Math.cos(now * 0.7) * 1.2);
    lurker.rotation.y = now * 0.4;
    lurker.material.opacity = 0.18 + Math.max(0, 1 - distToWatcher / 12) * 0.35;
  }
  poolMonster.sndT -= dt;
  if (poolMonster.sndT <= 0) { synthLap(); poolMonster.sndT = 4 + Math.random() * 6; }
  dripTimer -= dt;
  if (dripTimer <= 0) { synthDrip(); dripTimer = 3 + Math.random() * 6; }
}