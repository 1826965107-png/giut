/* ============================================================ Level 0 · 后室（经典前置关卡） */
/* 86×48m 外壳内的房间化重做：接待区 / 档案区 / 配电区 / 空办公室 + 主走廊，
   三处保险丝各有承载物（接待台 / 档案柜 / 配电柜），两条以上真实闭合环路，
   通道净宽 ≥1.6m，门洞是墙上的真实缺口（不是贴图）。 */
let l0Lights = [], exitPanel = null, exitSignMat = null, exitLight = null;
// 阴黄抹灰墙面（低对比、无裂纹）
const wallpaper = createTileSet({ cols: 4, rows: 4, tileWorld: 1.0, size: 512,
  tile: '#d5c99e', grout: '#c8bc92', vary: 0.02, grime: 0.12, tileScale: 0.96, ao: 0.12, mottle: 0.03, normalStrength: 1.2 });
const carpet = createTileSet({ cols: 6, rows: 6, tileWorld: 0.9, size: 512,
  tile: '#211b13', grout: '#171209', vary: 0.02, grime: 0.25, tileScale: 0.96, ao: 0.2, mottle: 0.05, normalStrength: 1.2 });
const ceilL0 = createPlain({ base: '#0e0c08', speck: 0.3 });
wallpaper.diffuse = 'textures/wallpaper-yellow.png'; wallpaper.normal = null; wallpaper.rough = null;
carpet.diffuse = 'textures/carpet-dark.png'; carpet.normal = null; carpet.rough = null;
ceilL0.diffuse = 'textures/ceiling-dark.png';

const hemiL0 = new THREE.HemisphereLight(0xcdbd8a, 0x3d3826, 0.5);
scene.add(hemiL0);

const l0WallMat = matFor(wallpaper, 1, 1);
const l0TextureMaterials = new Set([l0WallMat]);
// 小件合批容器：踢脚 / 插座 / 通风口 / 天花拼缝
const l0Skirt = [], l0Outlets = [], l0Vents = [], l0GridList = [];

function wall(x1, z1, x2, z2, o = {}) {
  const horizontal = z1 === z2;
  const len = horizontal ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const t = o.t == null ? 0.3 : o.t;
  const w = horizontal ? len : t;
  const d = horizontal ? t : len;
  const cx = horizontal ? (x1 + x2) / 2 : x1;
  const cz = horizontal ? z1 : (z1 + z2) / 2;
  const h = o.h == null ? L0H : o.h;
  addBox(w, h, d, cx, h / 2, cz, l0WallMat, wallpaper.coverageX);
  if (o.collide !== false) COLLIDERS_L0.push({ x1: cx - w / 2 - 0.08, x2: cx + w / 2 + 0.08, z1: cz - d / 2 - 0.08, z2: cz + d / 2 + 0.08, y1: 0, y2: h, kind: 'l0Wall' });
  // 两侧踢脚（收集后合批成 1 个 InstancedMesh）
  if (o.skirt !== false && len > 0.6) {
    if (horizontal) {
      for (const s of [-1, 1]) l0Skirt.push({ x: cx, y: 0.07, z: z1 + s * (t / 2 + 0.02), sx: len - 0.02, sy: 0.14, sz: 0.04 });
    } else {
      for (const s of [-1, 1]) l0Skirt.push({ x: x1 + s * (t / 2 + 0.02), y: 0.07, z: cz, sx: 0.04, sy: 0.14, sz: len - 0.02 });
    }
  }
}
/* 沿 x 的墙（z 固定），gaps 为 [xStart,xEnd] 门洞 */
function wallZ(z, xa, xb, gaps, o) {
  const gs = (gaps || []).slice().sort((a, b) => a[0] - b[0]);
  let cur = Math.min(xa, xb);
  const end = Math.max(xa, xb);
  for (const g of gs) {
    if (g[0] > cur) wall(cur, z, g[0], z, o);
    cur = Math.max(cur, g[1]);
  }
  if (cur < end) wall(cur, z, end, z, o);
}
/* 沿 z 的墙（x 固定） */
function wallX(x, za, zb, gaps, o) {
  const gs = (gaps || []).slice().sort((a, b) => a[0] - b[0]);
  let cur = Math.min(za, zb);
  const end = Math.max(za, zb);
  for (const g of gs) {
    if (g[0] > cur) wall(x, cur, x, g[0], o);
    cur = Math.max(cur, g[1]);
  }
  if (cur < end) wall(x, cur, x, end, o);
}
/* 门套（墙厚 + 两侧竖框 + 过梁） */
const l0TrimMat = new THREE.MeshStandardMaterial({ color: 0x6f6249, roughness: 0.72 });
function l0Casing(x, z, vertical, gap) {
  const t = 0.34, jw = 0.1, hh = 2.18;
  if (vertical) {
    for (const s of [-1, 1]) addBox(t + 0.06, hh, jw, x, hh / 2, z + s * (gap / 2), l0TrimMat);
    addBox(t + 0.06, jw, gap + jw * 2, x, hh + jw / 2, z, l0TrimMat);
  } else {
    for (const s of [-1, 1]) addBox(jw, hh, t + 0.06, x + s * (gap / 2), hh / 2, z, l0TrimMat);
    addBox(gap + jw * 2, jw, t + 0.06, x, hh + jw / 2, z, l0TrimMat);
  }
}
function flushInstanced(geo, mat, list, castShadow) {
  if (!list.length) return null;
  const inst = new THREE.InstancedMesh(geo, mat, list.length);
  const d = new THREE.Object3D();
  list.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z);
    d.scale.set(it.sx || 1, it.sy || 1, it.sz || 1);
    d.rotation.set(0, it.ry || 0, 0);
    d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
  });
  inst.castShadow = !!castShadow; inst.receiveShadow = true;
  scene.add(inst);
  return inst;
}

(function buildLevel0() {
  // 地板 / 天花板 / 外壳
  const floorL0 = new THREE.Mesh(new THREE.PlaneGeometry(86, 48),
    physicalMat(carpet, 86 / carpet.coverageX, 48 / carpet.coverageY, { roughness: 0.62, clearcoat: 0.05 }));
  floorL0.rotation.x = -Math.PI / 2; floorL0.position.set(-107, 0, 0); scene.add(floorL0);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(86, 48),
    new THREE.MeshStandardMaterial({ map: texFrom(ceilL0.diffuse, 10, 5, true), roughness: 0.96 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(-107, L0H, 0); scene.add(ceil);
  l0TextureMaterials.add(floorL0.material); l0TextureMaterials.add(ceil.material);
  // 外壳四面
  addBox(0.4, L0H, 48, -150, L0H / 2, 0, l0WallMat, wallpaper.coverageX);
  addBox(0.4, L0H, 48, -64, L0H / 2, 0, l0WallMat, wallpaper.coverageX);
  addBox(86, L0H, 0.4, -107, L0H / 2, -24, l0WallMat, wallpaper.coverageX);
  addBox(86, L0H, 0.4, -107, L0H / 2, 24, l0WallMat, wallpaper.coverageX);

  /* —— 墙体拓扑：走廊被两座错位门廊切断视线，东端再经服务井转折到出口 —— */
  // 走廊北墙（门洞：接待 1、档案 2、配电 2）
  wallZ(-5, -150, -72, [[-142, -139], [-130, -127], [-106, -103], [-96, -93], [-80, -77]]);
  // 走廊南墙（门洞：空办公室、档案二、配电副间）
  wallZ(5, -150, -72, [[-136, -133], [-112, -109], [-82, -79]]);
  // 北侧分隔墙
  wallX(-132, -24, -5, [[-16, -13]]);
  wallX(-100, -24, -5, [[-18, -15]]);
  wallX(-72, -24, -5, [[-9, -6]]);
  // 南侧分隔墙
  wallX(-118, 5, 24, [[13, 16]]);
  wallX(-94, 5, 24, [[8, 11]]);
  wallX(-72, 5, 24, [[6, 9]]);

  /* 错位门廊 A（防火分区前室，x -126..-120）：西侧门在 z 1.2..4.2，东侧门在 z -4.2..-1.2，
     进出必须横向绕行 —— 这是主走廊的第一次视线切断，有门的理由（防火分区）。 */
  wallX(-126, -5, 5, [[1.2, 4.2]]);
  wallX(-120, -5, 5, [[-4.2, -1.2]]);
  l0Casing(-126, 2.7, true, 3.0); l0Casing(-120, -2.7, true, 3.0);
  // 门廊 A 内：双开门扇（半开）+ 防火门指示牌 + 顶灯
  addBox(0.08, 2.1, 0.9, -125.4, 1.05, 3.55, new THREE.MeshStandardMaterial({ color: 0x554a33, roughness: 0.7 }));
  addBox(0.08, 2.1, 0.9, -120.6, 1.05, -3.55, new THREE.MeshStandardMaterial({ color: 0x554a33, roughness: 0.7 }));
  const fireSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26),
    decalMat(makeSignTexture('防火分区', 'FIRE ZONE')));
  fireSign.position.set(-125.83, 2.34, 2.7); fireSign.rotation.y = Math.PI / 2; scene.add(fireSign);

  /* 错位门廊 B（服务横廊，x -90..-84）：门位与 A 相反，视线在这里第二次被打断；
     头顶走一条横穿的服务管线，地面上留排水明沟。 */
  wallX(-90, -5, 5, [[-4.2, -1.2]]);
  wallX(-84, -5, 5, [[1.2, 4.2]]);
  l0Casing(-90, -2.7, true, 3.0); l0Casing(-84, 2.7, true, 3.0);
  const svcPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b6357, roughness: 0.42, metalness: 0.68 }));
  svcPipe.position.set(-87, 2.62, 0); svcPipe.rotation.z = Math.PI / 2; scene.add(svcPipe);
  addBox(0.34, 0.03, 9.4, -87, 0.016, 0, new THREE.MeshStandardMaterial({ color: 0x2a2822, roughness: 0.85, metalness: 0.2 }));
  const svcSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), decalMat(makeSignTexture('服务通道', 'SERVICE')));
  svcSign.position.set(-83.83, 2.32, 2.7); svcSign.rotation.y = -Math.PI / 2; scene.add(svcSign);

  /* 东端出口前厅（x -72..-64, z -10..10）：先经服务井（x=-70 的竖井墙挡在 z -5..1.2）向南绕行，
     再回到中线才正对出口门 —— 出口不会被长走廊一眼看穿。 */
  wallZ(-10, -72, -64, [], {}); wallZ(10, -72, -64, [], {});
  wallX(-70, -5, 1.2, [], {});
  addBox(0.4, L0H, 0.4, -70, L0H / 2, -4.8, l0TrimMat);
  const shaftSign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.24), decalMat(makeSignTexture('竖井', 'SHAFT')));
  shaftSign.position.set(-69.78, 2.3, -2.4); shaftSign.rotation.y = Math.PI / 2; scene.add(shaftSign);

  // 门套（走廊两侧门洞）
  for (const g of [[-140.5, -5], [-128.5, -5], [-104.5, -5], [-94.5, -5], [-78.5, -5],
    [-134.5, 5], [-110.5, 5], [-80.5, 5]]) l0Casing(g[0], g[1], false, 3);
  l0Casing(-132, -14.5, true, 3); l0Casing(-100, -16.5, true, 3); l0Casing(-72, -7.5, true, 3);
  l0Casing(-118, 14.5, true, 3); l0Casing(-94, 9.5, true, 3); l0Casing(-72, 7.5, true, 3);

  /* —— 天花拼缝 / 灯盘（消费级天花板网格） —— */
  const ceilGridMat = new THREE.MeshStandardMaterial({ color: 0x9e957a, roughness: 0.9 });
  for (let x = -148; x <= -66; x += 4) l0GridList.push({ x, y: L0H - 0.02, z: 0, sx: 0.06, sy: 0.04, sz: 48 });
  for (let z = -22; z <= 22; z += 4) l0GridList.push({ x: -107, y: L0H - 0.02, z, sx: 86, sy: 0.04, sz: 0.06 });

  const panelGeo = new THREE.BoxGeometry(2.4, 0.06, 1.2);
  const l0PanelPositions = [];
  for (let x = -144; x <= -76; x += 8) l0PanelPositions.push([x, 0]);            // 走廊
  for (const x of [-140, -114, -88]) l0PanelPositions.push([x, -14.5]);          // 北侧
  for (const x of [-134, -106, -82]) l0PanelPositions.push([x, 14.5]);           // 南侧
  l0PanelPositions.push([-68, 0]);
  const aliveIdx = [0, 3, 6, 9, 12, 15, 18];
  l0PanelPositions.forEach(([x, z], i) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2418, emissive: 0xf6e6b4, emissiveIntensity: aliveIdx.includes(i) ? 1.55 : 0.06, roughness: 0.5 });
    const m = new THREE.Mesh(panelGeo, mat); m.position.set(x, L0H - 0.05, z); scene.add(m);
    addBox(2.56, 0.04, 1.36, x, L0H - 0.02, z, l0TrimMat);
    l0Lights.push({ mesh: m, mat, base: aliveIdx.includes(i) ? 1.55 : 0.06, alive: aliveIdx.includes(i), t: 0 });
  });
  // 真正参与照明的点光（预算 6 盏，覆盖走廊与三间）
  const l0PointDefs = [[-142, 0], [-120, 0], [-98, 0], [-140, -16], [-112, -16], [-84, -18]];
  for (const [x, z] of l0PointDefs) {
    const l = new THREE.PointLight(0xffe9b8, 3.4, 12, 2);
    l.position.set(x, L0H - 0.25, z); scene.add(l);
  }

  /* —— 接待区（N_A，x -150..-132, z -24..-5）：接待台 / 黄门 / 倒伏椅 / 指引 —— */
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a3d28, roughness: 0.6, metalness: 0.08 });
  addBox(2.0, 0.92, 0.9, -140, 0.46, -14, deskMat);                 // 接待台
  addBox(2.1, 0.06, 1.0, -140, 0.95, -14, l0TrimMat);
  COLLIDERS_L0.push({ x1: -141.05, x2: -138.95, z1: -14.5, z2: -13.5, y1: 0, y2: 0.98, kind: 'desk' });
  addBox(1.1, 0.08, 0.62, -140, 0.46, -11.9, l0TrimMat);            // 侧台
  addBox(0.12, 0.42, 0.5, -140.6, 0.21, -11.9, deskMat);
  addBox(0.12, 0.42, 0.5, -139.4, 0.21, -11.9, deskMat);
  COLLIDERS_L0.push({ x1: -140.6, x2: -139.4, z1: -12.3, z2: -11.5, y1: 0, y2: 0.5, kind: 'sidetable' });
  // 黄门（贴墙假门：门扇 + 门把 + 门套，墙后是实心）
  const yellowDoorMat = new THREE.MeshStandardMaterial({ color: 0x8a7333, roughness: 0.62, metalness: 0.05 });
  addBox(0.06, 2.05, 1.0, -149.72, 1.03, -18, yellowDoorMat);
  addBox(0.1, 0.06, 1.1, -149.7, 2.09, -18, l0TrimMat);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb9a878, metalness: 0.9, roughness: 0.3 }));
  knob.position.set(-149.62, 1.02, -17.6); scene.add(knob);
  // 倒伏椅
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x2c2b26, roughness: 0.7 });
  const chair = new THREE.Group();
  chair.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.5), chairMat));
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.07), chairMat); back.position.set(0, 0.25, -0.22); chair.add(back);
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), chairMat);
    leg.position.set(dx, -0.22, dz); chair.add(leg);
  }
  chair.position.set(-143.6, 0.5, -12.4); chair.rotation.set(1.35, 0.6, 0.2); scene.add(chair);
  COLLIDERS_L0.push({ x1: -144.2, x2: -143.0, z1: -13.0, z2: -11.8, y1: 0, y2: 0.45, kind: 'chair' });
  // 指引牌
  const guideTex = makeSignTexture('接待', 'RECEPTION');
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), decalMat(guideTex));
  guide.position.set(-146, 2.3, -5.16); scene.add(guide);

  /* —— 档案区（N_B，x -132..-100, z -24..-5）：错开墙段 + 档案柜 + 密天花 —— */
  wallZ(-16, -126, -114, [], {});          // 错开短墙 1
  wallZ(-10, -118, -106, [], {});          // 错开短墙 2
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x3a3a34, roughness: 0.62, metalness: 0.18 });
  const cabDefs = [
    [-128.6, -21.4, 1.3, 0.66, 1.35], [-126.2, -21.4, 1.3, 0.66, 1.35], [-123.8, -21.4, 1.3, 0.66, 1.35],
    [-128.6, -12.6, 1.3, 0.66, 1.35], [-121.0, -7.6, 1.3, 0.66, 1.35], [-118.6, -7.6, 1.3, 0.66, 1.35],
    [-110.4, -19.6, 1.3, 0.66, 1.35], [-108.0, -19.6, 1.3, 0.66, 1.35], [-105.6, -19.6, 1.3, 0.66, 1.35],
    [-104.2, -12.4, 1.3, 0.66, 1.35], [-108.6, -12.4, 1.3, 0.66, 1.35],
  ];
  for (const [x, z, sx, sz, h] of cabDefs) {
    addBox(sx, h, sz, x, h / 2, z, cabMat);
    addBox(sx + 0.04, 0.05, sz + 0.04, x, h + 0.02, z, l0TrimMat);
    COLLIDERS_L0.push({ x1: x - sx / 2, x2: x + sx / 2, z1: z - sz / 2, z2: z + sz / 2, y1: 0, y2: h, kind: 'cabinet' });
    // 抽屉拉手（合批）
    for (let i = 0; i < 3; i++) l0Outlets.push({ x: x + 0.02, y: 0.3 + i * 0.42, z: z - sz / 2 - 0.03, sx: 0.34, sy: 0.03, sz: 0.03 });
  }
  // 散落纸张（薄片，无碰撞）
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xcfc7ad, roughness: 0.95 });
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), paperMat);
    p.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28);
    p.position.set(-130 + Math.random() * 28, 0.008, -23 + Math.random() * 17);
    scene.add(p);
  }

  /* —— 配电区（N_C，x -100..-72, z -24..-5）：配电柜 + 裸露管线 + 维修灯 —— */
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x3d443f, roughness: 0.55, metalness: 0.45 });
  addBox(3.2, 1.9, 0.7, -86, 0.95, -23.3, panelMat);
  COLLIDERS_L0.push({ x1: -87.6, x2: -84.4, z1: -23.65, z2: -22.95, y1: 0, y2: 1.9, kind: 'switchgear' });
  // 面板上的表与开关（合批）
  for (let i = 0; i < 6; i++) l0Outlets.push({ x: -87.2 + i * 0.5, y: 1.35, z: -22.93, sx: 0.16, sy: 0.2, sz: 0.03 });
  // 裸露管线
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6b6357, roughness: 0.45, metalness: 0.7 });
  for (const [px, py] of [[-78, 2.55], [-78, 2.25]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 24, 10), pipeMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(-86, py, px + 0); scene.add(pipe);
  }
  for (const [x1, z1, x2, z2] of [[-72.4, -22, -72.4, -8], [-96, -20, -80, -20]]) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 10), pipeMat);
    pipe.position.set((x1 + x2) / 2, 2.72, (z1 + z2) / 2);
    pipe.rotation.set(Math.PI / 2, 0, Math.atan2(x2 - x1, z2 - z1)); scene.add(pipe);
  }
  // 维修工作灯（暖点光）
  const workLamp = new THREE.PointLight(0xffc98a, 5.2, 9, 2);
  workLamp.position.set(-84, 2.3, -20); scene.add(workLamp);
  addBox(0.5, 0.05, 0.3, -84, 2.32, -20, new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc98a, emissiveIntensity: 3.5 }));
  // 配电区地面电缆卷
  const cable = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 20), dark_cable());
  cable.rotation.x = Math.PI / 2; cable.position.set(-92, 0.09, -12); scene.add(cable);

  /* —— 空办公室（S_A，x -150..-118, z 5..24）：空房间 + 隔断 + 百叶窗 —— */
  addBox(0.09, 1.35, 5.2, -134, 0.675, 12, l0TrimMat);                       // 隔断
  COLLIDERS_L0.push({ x1: -134.06, x2: -133.94, z1: 9.4, z2: 14.6, y1: 0, y2: 1.35, kind: 'partition' });
  // 百叶窗（南墙内侧，一格一格合批）
  for (let i = 0; i < 12; i++) l0Vents.push({ x: -142, y: 1.55 + i * 0.11, z: 23.72, sx: 3.0, sy: 0.05, sz: 0.04 });
  l0Vents.push({ x: -142, y: 2.86, z: 23.7, sx: 3.2, sy: 0.08, sz: 0.1 });    // 窗楣

  /* —— 档案二（S_B，x -118..-94）：矮柜与箱子 —— */
  for (const [x, z] of [[-114, 19.4], [-110.6, 19.4], [-100, 7.6]]) {
    addBox(1.1, 0.62, 0.6, x, 0.31, z, cabMat);
    COLLIDERS_L0.push({ x1: x - 0.55, x2: x + 0.55, z1: z - 0.3, z2: z + 0.3, y1: 0, y2: 0.66, kind: 'filecab' });
  }
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x6a5a40, roughness: 0.9 });
  for (const [x, z, s] of [[-116, 11, 0.7], [-113.4, 12.2, 0.6], [-96.5, 16.4, 0.66]]) {
    addBox(s, s, s, x, s / 2, z, boxMat);
    COLLIDERS_L0.push({ x1: x - s / 2, x2: x + s / 2, z1: z - s / 2, z2: z + s / 2, y1: 0, y2: s, kind: 'crate' });
  }

  /* —— 配电副间（S_C，x -94..-72）：支路配电柜（第三枚保险丝所在支路有回路可逃） —— */
  addBox(2.6, 1.8, 0.66, -80, 0.9, 8.35, panelMat);
  COLLIDERS_L0.push({ x1: -81.3, x2: -78.7, z1: 8.0, z2: 8.7, y1: 0, y2: 1.8, kind: 'switchgear' });
  addBox(0.9, 0.05, 0.4, -80, 1.84, 8.35, new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc98a, emissiveIntensity: 2.6 }));

  /* —— 主走廊陈设：方柱 + 墙面插座 / 通风口 / 水渍 —— */
  const colMat = new THREE.MeshStandardMaterial({ color: 0x8e8368, roughness: 0.85 });
  for (const x of [-146, -128, -110, -92, -76]) {
    for (const z of [-3.2, 3.2]) {
      addBox(0.7, L0H, 0.7, x, L0H / 2, z, colMat);
      COLLIDERS_L0.push({ x1: x - 0.35, x2: x + 0.35, z1: z - 0.35, z2: z + 0.35, y1: 0, y2: L0H, kind: 'column' });
    }
  }
  // 插座（合批）：沿走廊墙每 6m 一个
  for (let x = -148; x < -70; x += 6) {
    l0Outlets.push({ x, y: 0.32, z: -5.19, sx: 0.09, sy: 0.14, sz: 0.03 });
    l0Outlets.push({ x: x + 3, y: 0.32, z: 5.19, sx: 0.09, sy: 0.14, sz: 0.03 });
  }
  // 通风口
  for (let x = -140; x < -74; x += 12) {
    for (let i = 0; i < 5; i++) l0Vents.push({ x, y: 2.55 + i * 0.075, z: -5.16, sx: 0.9, sy: 0.03, sz: 0.02 });
  }
  // 水渍（贴花）
  const stainTex = (() => {
    const c = makeCanvas(256, 256), g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      const r = 12 + Math.random() * 46;
      const gr = g.createRadialGradient(128 + (Math.random() - 0.5) * 90, 128 + (Math.random() - 0.5) * 90, 2, 128, 128, r);
      gr.addColorStop(0, 'rgba(86,66,34,0.22)'); gr.addColorStop(1, 'rgba(86,66,34,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(128, 128, r, 0, 6.283); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const [x, z, ry, s] of [[-136, -5.1, 0, 1.6], [-116, 5.1, Math.PI, 2.0], [-96, -5.1, 0, 1.3], [-82, 5.1, Math.PI, 1.5], [-126, -23.7, 0, 2.2]]) {
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.8), new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, opacity: 0.55, depthWrite: false }));
    dec.position.set(x, 2.35, z); dec.rotation.y = ry; scene.add(dec);
  }

  /* —— 出口（东端）：双门 + 门框 + EXIT 牌 + 红灯 —— */
  addBox(0.3, 2.5, 3.4, -64.4, 1.25, 0, l0TrimMat);                      // 门框
  exitPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x3b3a33, roughness: 0.5, metalness: 0.55 }));
  exitPanel.position.set(-64.1, 1.1, 0); scene.add(exitPanel);
  COLLIDERS_L0.push({ x1: -64.6, x2: -63.7, z1: -1.5, z2: 1.5, y1: 0, y2: 2.5, kind: 'exitDoor' });
  exitSignMat = new THREE.MeshStandardMaterial({ map: makeSignTexture('出口', 'EXIT'), color: 0x1a0505,
    emissive: 0xff2222, emissiveMap: makeSignTexture('出口', 'EXIT'), emissiveIntensity: 1.2 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), exitSignMat);
  sign.position.set(-64.02, 2.72, 0); sign.rotation.y = -Math.PI / 2; scene.add(sign);
  exitLight = new THREE.PointLight(0xff2a1a, 3.4, 7, 2);
  exitLight.position.set(-63.5, 2.4, 0); scene.add(exitLight);

  // 合批落地：踢脚 / 插座+拉手 / 百叶 + 天花拼缝
  flushInstanced(new THREE.BoxGeometry(1, 1, 1), l0TrimMat, l0Skirt, false);
  flushInstanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xcfc8b4, roughness: 0.55, metalness: 0.3 }), l0Outlets, false);
  flushInstanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8b8370, roughness: 0.7, metalness: 0.25 }), l0Vents, false);
  flushInstanced(new THREE.BoxGeometry(1, 1, 1), ceilGridMat, l0GridList, false);

  // 办公角落（保留原有氛围光）
  const spot = new THREE.SpotLight(0xffe0a8, 6, 12, 0.72, 0.5, 1.4);
  spot.position.set(-140, L0H - 0.2, -12); spot.target.position.set(-140, 0, -14);
  spot.castShadow = false; scene.add(spot); scene.add(spot.target);
})();

function dark_cable() {
  return new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.85 });
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

/* ---------------- 保险丝（各有承载物：接待台 / 档案柜 / 配电柜） ---------------- */
const fusesList = [];
let nearestFuse = null;
const FUSE_DEFS = [
  { x: -140, z: -14, y: 1.02, on: '接待台' },
  { x: -128.6, z: -21.4, y: 1.42, on: '档案柜' },
  { x: -86, z: -22.9, y: 1.52, on: '配电柜' },
];
function fuseMesh() {
  return new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x241c0a, emissive: 0xff9b1e, emissiveIntensity: 2.6, roughness: 0.4 }));
}
function spawnFuse(def) {
  const y = def.y == null ? 0.42 : def.y;
  const m = fuseMesh(); m.position.set(def.x, y, def.z); scene.add(m);
  fusesList.push({ mesh: m, x: def.x, z: def.z, y, on: def.on || '', ph: Math.random() * 6.28 });
}
function spawnFuseList() {
  for (const f of fusesList) scene.remove(f.mesh);
  fusesList.length = 0;
  FUSE_DEFS.forEach(spawnFuse);
}
spawnFuseList();
function updateFuseProximity() {
  let best = null, bestD = 1.9;
  for (const f of fusesList) {
    const d = Math.hypot(player.x - f.x, player.z - f.z);
    if (d > bestD) continue;
    // 高度必须在伸手可及范围内
    if (f.y > player.y + 1.9 || f.y < player.y - 0.4) continue;
    // 真实遮挡：墙体 / 柜体挡住就不算"看得见摸得着"
    if (segmentBlockedByWalls(player.x, player.y + 1.2, player.z, f.x, f.y, f.z)) continue;
    bestD = d; best = f;
  }
  nearestFuse = best;
}
function tryFuse() {
  if (!nearestFuse) return;
  scene.remove(nearestFuse.mesh);
  fusesList.splice(fusesList.indexOf(nearestFuse), 1);
  fuses++;
  synthFuse();
  document.getElementById('v-task').textContent = `收集保险丝 ${fuses}/3`;
  document.querySelectorAll('#fuse-slots i').forEach((s, i) => s.classList.toggle('on', i < fuses));
  if (fuses >= 3) {
    exitUnlocked = true;
    synthUnlock();
    document.getElementById('v-task').textContent = '出口已开启！它在追你——快跑！';
    openExitDoor();
    showFlashText('出口开启！快跑！！！');
    startChase(3.05, 22);
  } else if (fuses === 2) {
    showFlashText('它开始追你了——别停下！');
    startChase(2.2, 12);
  } else {
    showFlashText(`保险丝 ${fuses}/3 — 它来了…`);
    activateEntity(3.0, 9);
  }
  nearestFuse = null;
}