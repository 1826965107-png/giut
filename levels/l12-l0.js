/* Level 0 v2 —— 浴场后台后室（42×24 m 紧凑后勤层）
   几何/碰撞/家具全部由 L12P.L0 的房间与门洞数据生成，不再使用旧 86×48 地图坐标。
   ctx 由宿主注入：THREE / scene / addBox / addWorldUVBox / addDeck / matFor /
   L12_TEX / COLLIDERS_L0 / l0Lights / hemiL0 / makeCanvas / makeSignTexture。 */

import { panelCeiling, wainscot } from './l12-art.js';

const WALL_T = 0.24;
const L0_DOOR_H = 2.15;

function mergeSpans(spans) {
  const s = spans.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const sp of s) {
    const last = out[out.length - 1];
    if (last && sp[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], sp[1]);
    else out.push([sp[0], sp[1]]);
  }
  return out;
}
function subtractSpans(spans, cuts) {
  let cur = spans.map(s => [s[0], s[1]]);
  for (const c of cuts) {
    const next = [];
    for (const s of cur) {
      if (c[1] <= s[0] || c[0] >= s[1]) { next.push(s); continue; }
      if (c[0] > s[0]) next.push([s[0], c[0]]);
      if (c[1] < s[1]) next.push([c[1], s[1]]);
    }
    cur = next;
  }
  return cur;
}

export function createL0V2(ctx) {
  const { THREE, scene, addBox, addWorldUVBox, addDeck, matFor, L12_TEX, COLLIDERS_L0,
    l0Lights, hemiL0, makeCanvas, makeSignTexture, L12P } = ctx;
  const L0 = L12P.L0;
  const B = L0.shell;                                   // 外包（含墙厚）
  const ROOMS = L0.rooms, DOORS = L0.doors;
  const roomById = id => ROOMS.find(r => r.id === id);
  const out = { wallPieces: [], headers: [], doorways: [], props: [], pipes: [], hangers: [], papers: [], sockets: [], vents: [], stains: [], supports: [] };
  const supports = out.supports;

  /* ---------------- 材质：亚麻黄细墙纸 / 深橄榄褐低绒地毯 / 旧木 / 灰绿烤漆 ---------------- */
  const wallMat = matFor({ diffuse: L12_TEX.wallpaper, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
    { ns: 0.16, roughness: 0.95, metalness: 0.0, env: 0.18, color: 0xf2d38f });
  wallMat.roughnessMap = null; wallMat.name = 'l0WallV2';
  const floorMat = matFor({ diffuse: L12_TEX.carpet, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
    { ns: 0.12, roughness: 0.95, metalness: 0.0, env: 0.10, color: 0xe4dac6 });
  floorMat.roughnessMap = null; floorMat.name = 'l0FloorV2';
  const ceilMat = matFor({ diffuse: L12_TEX.plaster, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
    { ns: 0.10, roughness: 0.96, metalness: 0.0, env: 0.04, color: 0xd8d3c6 });
  ceilMat.roughnessMap = null; ceilMat.name = 'l0CeilV2';
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x6f6249, roughness: 0.72, metalness: 0.04 });
  const woodMat = matFor({ diffuse: L12_TEX.wood, coverageX: 2.0, coverageY: 2.0 }, 0.5, 0.5,
    { ns: 0.10, roughness: 0.78, metalness: 0.0, color: 0x8d7452 });
  woodMat.roughnessMap = null; woodMat.name = 'l0WoodV2';
  for (const m of [wallMat, floorMat, woodMat, ceilMat]) {
    if (m.map) { m.map.wrapS = THREE.RepeatWrapping; m.map.wrapT = THREE.RepeatWrapping; m.map.needsUpdate = true; }
  }
  const mats = { ceil: ceilMat, ceilDark: ceilMat, trim: trimMat, wood: woodMat, stone: wallMat, metal: trimMat };
  out.materials = { wallMat, floorMat, ceilMat, trimMat, woodMat };

  /* ---------------- 地面 ---------------- */
  addDeck(B.x1, B.z1, B.x2, B.z2, [], { diffuse: L12_TEX.carpet, coverageX: 2, coverageY: 2 }, { mat: floorMat });

  /* ---------------- 墙体：房间矩形边并集 → 按门洞切段 → 门楣 + 门套 ---------------- */
  const segMap = new Map();
  const addEdge = (axis, coord, a, b) => {
    if (b - a < 1e-6) return;
    const key = axis + ':' + coord.toFixed(3);
    if (!segMap.has(key)) segMap.set(key, { axis, coord, spans: [] });
    segMap.get(key).spans.push([Math.min(a, b), Math.max(a, b)]);
  };
  for (const r of ROOMS) {
    addEdge('z', r.z1, r.x1, r.x2); addEdge('z', r.z2, r.x1, r.x2);
    addEdge('x', r.x1, r.z1, r.z2); addEdge('x', r.x2, r.z1, r.z2);
  }
  const doorAt = (axis, coord) => DOORS.filter(d => d.axis === axis && Math.abs(d.coord - coord) < 1e-6);
  for (const seg of segMap.values()) {
    const cuts = doorAt(seg.axis, seg.coord).map(d => [d.gap[0], d.gap[1]]);
    const spans = subtractSpans(mergeSpans(seg.spans), cuts);
    for (const [a, b] of spans) {
      const len = b - a;
      if (len < 0.05) continue;
      const isX = seg.axis === 'x';
      const cx = isX ? seg.coord : (a + b) / 2, cz = isX ? (a + b) / 2 : seg.coord;
      const h = 3.0;
      const mesh = addWorldUVBox(isX ? WALL_T : len, h, isX ? len : WALL_T, cx, h / 2, cz, wallMat, 1.0);
      if (isX) COLLIDERS_L0.push({ x1: cx - WALL_T / 2, x2: cx + WALL_T / 2, z1: a, z2: b, y1: 0, y2: h, kind: 'l0Wall' });
      else COLLIDERS_L0.push({ x1: a, x2: b, z1: cz - WALL_T / 2, z2: cz + WALL_T / 2, y1: 0, y2: h, kind: 'l0Wall' });
      out.wallPieces.push({ axis: seg.axis, coord: seg.coord, a, b, t: WALL_T, mesh });
    }
  }
  /* 门洞：门楣（门高→天花）+ 双侧薄门套 + 洞口内衬 */
  for (const d of DOORS) {
    const doorH = d.h || L0_DOOR_H;
    const isX = d.axis === 'x';
    const gap = d.gap[1] - d.gap[0], mid = (d.gap[0] + d.gap[1]) / 2;
    const head = 3.0;
    const hh = head - doorH;
    if (hh > 0.01) {
      const mesh = addWorldUVBox(isX ? WALL_T : gap, hh, isX ? gap : WALL_T,
        isX ? d.coord : mid, doorH + hh / 2, isX ? mid : d.coord, wallMat, 1.0);
      COLLIDERS_L0.push(isX
        ? { x1: d.coord - WALL_T / 2, x2: d.coord + WALL_T / 2, z1: d.gap[0], z2: d.gap[1], y1: doorH, y2: head, kind: 'l0Header' }
        : { x1: d.gap[0], x2: d.gap[1], z1: d.coord - WALL_T / 2, z2: d.coord + WALL_T / 2, y1: doorH, y2: head, kind: 'l0Header' });
      out.headers.push({ axis: d.axis, coord: d.coord, gap: d.gap, y0: doorH, y1: head, mesh });
    }
    // 门套：每侧一根薄立框 + 上沿，压在门楣下缘
    const w = 0.07, p = 0.02;
    for (const s of [-1, 1]) {
      const u = s < 0 ? d.gap[0] : d.gap[1];
      for (const face of [-1, 1]) {
        const off = face * (WALL_T / 2 + p);
        addWorldUVBox(isX ? 0.04 : w, doorH + w, isX ? w : 0.04,
          isX ? d.coord + off : u, (doorH + w) / 2, isX ? u : d.coord + off, trimMat, 1);
      }
    }
    for (const face of [-1, 1]) {
      const off = face * (WALL_T / 2 + p);
      addWorldUVBox(isX ? 0.04 : gap + w * 2, w, isX ? gap + w * 2 : 0.04,
        isX ? d.coord + off : mid, doorH + w / 2 - 0.01, isX ? mid : d.coord + off, trimMat, 1);
    }
    out.doorways.push({ axis: d.axis, coord: d.coord, gap: d.gap, doorH, exterior: !!d.exterior });
  }

  /* ---------------- 天花：米制 UV 声学板 + T 龙骨 + 灯盘 + 线槽 ---------------- */
  {
    const artCtx = { THREE, scene, addBox, addWorldUVBox, COLLIDERS: COLLIDERS_L0, mats };
    for (const r of ROOMS) {
      const h = r.h === 'LOWLINEN' ? 2.8 : 3.0;
      // 每房按 1.2×0.6 灯盘节奏排布（实例化在 art 模块内），灯盘只做发光面，不新增点光源
      const panels = [];
      const nx = Math.max(1, Math.round((r.x2 - r.x1) / 4.2));
      const nz = Math.max(1, Math.round((r.z2 - r.z1) / 3.6));
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        panels.push({
          x: r.x1 + (i + 0.5) * ((r.x2 - r.x1) / nx),
          z: r.z1 + (k + 0.5) * ((r.z2 - r.z1) / nz),
          w: 1.2, d: 0.6,
        });
      }
      panelCeiling(artCtx, r, { h, panels, tile: 2.0, cove: true });
      wainscot(artCtx, r, L12P.L0.doors, { h: 0.34, mat: wallMat });
    }
  }

  /* ---------------- 踢脚（沿真实墙段，门洞处断开） ---------------- */
  for (const w of out.wallPieces) {
    const len = w.b - w.a;
    const isX = w.axis === 'x';
    for (const side of [-1, 1]) {
      const off = side * (WALL_T / 2 + 0.016);
      addBox(isX ? 0.03 : len, 0.12, isX ? len : 0.03,
        isX ? w.coord + off : (w.a + w.b) / 2, 0.06,
        isX ? (w.a + w.b) / 2 : w.coord + off, trimMat);
    }
  }

  /* ---------------- 灯：荧光灯盘（含坏灯）+ 少量点光 ---------------- */
  const fxMat = new THREE.MeshStandardMaterial({ color: 0x2a2721, emissive: 0xfff0c8, emissiveIntensity: 1.5, roughness: 0.8 });
  const fixture = (x, z, alive) => {
    addBox(1.24, 0.08, 0.34, x, 2.88, z, trimMat);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.03, 0.26), fxMat.clone());
    panel.position.set(x, 2.835, z); scene.add(panel);
    panel.material.emissiveIntensity = alive ? 2.1 : 0.05;
    l0Lights.push({ mesh: panel, mat: panel.material, base: alive ? 1.5 : 0.05, alive, t: 0 });
  };
  for (const [x, z, alive] of [
    [-146, 0, true], [-138, 0, true], [-130, 0, false], [-122, 0, true], [-114, 0, true],
    [-136, 6, true], [-124, 6, false], [-124, -6, true], [-112, 6, true], [-112, -6, false],
    [-136, -6, true], [-146, -4, true]
  ]) fixture(x, z, alive);
  for (const [x, z] of [[-146, 0], [-128, 0], [-113, 0], [-135, 6], [-124, -6], [-113, -6]]) {
    const l = new THREE.PointLight(0xffe6b0, 9.0, 13, 1.3);
    l.position.set(x, 2.5, z); scene.add(l);
  }
  out.hemi = hemiL0;

  /* ---------------- 房屋陈设（按用途组合，全部落在真实房间内） ---------------- */
  const boxC = (w, h, d, x, y, z, m, cov) => addWorldUVBox(w, h, d, x, y, z, m, cov);
  const collide = (x, z, w, d, y2, kind) => COLLIDERS_L0.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, y1: 0, y2, kind });

  // 接待：值班台 + 三张访客长椅 + 失电配电图
  boxC(3.6, 1.04, 0.8, -145.4, 0.52, -4.6, woodMat, 1);
  addBox(3.75, 0.07, 0.92, -145.4, 1.075, -4.6, trimMat);
  collide(-145.4, -4.6, 3.75, 0.92, 1.12, 'desk');
  for (const z of [-1.6, 0.6, 2.8]) {
    boxC(0.6, 0.10, 1.9, -148.4, 0.44, z, woodMat, 1);
    for (const dz of [-0.75, 0.75]) addBox(0.06, 0.4, 0.06, -148.4, 0.2, z + dz, trimMat);
    collide(-148.4, z, 0.7, 1.9, 0.5, 'chair');
  }
  {
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
    addBox(1.6, 0.06, 0.06, -149.86, 2.17, -3.2, trimMat);
  }

  // 员工更衣与休息：更衣柜一列 + 长凳 + 打卡机 + 休息桌
  for (const z of [2.6, 4.4, 6.2, 8.0]) {
    boxC(0.5, 1.9, 1.5, -139.4, 0.95, z, woodMat, 0.6);
    collide(-139.4, z, 0.52, 1.5, 1.95, 'locker');
    // 柜门分缝（两道竖缝）+ 标签槽 + 细把手 + 踢脚底座
    for (const dz of [-0.25, 0.25]) addBox(0.02, 1.78, 0.02, -139.14, 0.98, z + dz, trimMat);
    addBox(0.02, 0.10, 0.30, -139.13, 1.62, z, trimMat);
    addBox(0.03, 0.03, 0.14, -139.11, 1.18, z, trimMat);
    addBox(0.54, 0.08, 1.54, -139.4, 0.04, z, trimMat);
  }
  addBox(0.54, 0.06, 6.3, -139.4, 1.94, 5.3, trimMat);
  boxC(0.5, 0.09, 4.4, -137.2, 0.45, 5.2, woodMat, 1);
  for (const z of [3.4, 7.0]) addBox(0.06, 0.4, 0.06, -137.2, 0.2, z, trimMat);
  collide(-137.2, 5.2, 0.5, 4.4, 0.5, 'bench');
  addBox(0.34, 0.42, 0.16, -139.6, 1.34, 9.4, trimMat);
  addBox(0.06, 1.34, 0.06, -139.6, 0.67, 9.4, trimMat);
  boxC(1.5, 0.72, 0.9, -134.4, 0.36, 4.2, woodMat, 1);
  for (const dz of [-0.55, 0.55]) addBox(0.5, 0.06, 0.44, -134.4, 0.44, 4.2 + dz, woodMat, 1);
  collide(-134.4, 4.2, 1.5, 0.9, 0.74, 'table');
  supports.push({ x: -134.4, z: 4.2, top: 0.72, w: 1.5, d: 0.9, kind: 'table' });
  out.props.push({ kind: 'table', x: -134.4, z: 4.2, top: 0.72 });

  // 票务档案：票柜阵 + 出票台 + 票据箱
  // 两侧柜列之间留出对准南门的主通道，门内先有完整的转身空间。
  for (const x of [-129.6, -128.0, -123.2]) {
    for (const z of [3.6, 5.2]) {
      boxC(1.2, 1.35, 0.66, x, 0.675, z, woodMat, 1);
      collide(x, z, 1.2, 0.66, 1.42, 'cabinet');
      for (let k = 0; k < 3; k++) {
        const rx = x - 0.34 + k * 0.34;
        addBox(0.30, 0.30, 0.02, rx, 0.42, z + 0.345, woodMat);     // 抽屉面板
        addBox(0.30, 0.30, 0.02, rx, 0.78, z + 0.345, woodMat);
        addBox(0.30, 0.30, 0.02, rx, 1.14, z + 0.345, woodMat);
        addBox(0.24, 0.025, 0.02, rx, 0.24, z + 0.352, trimMat);     // 分缝
        addBox(0.24, 0.025, 0.02, rx, 0.60, z + 0.352, trimMat);
        addBox(0.24, 0.025, 0.02, rx, 0.96, z + 0.352, trimMat);
        addBox(0.10, 0.03, 0.03, rx, 0.50, z + 0.372, trimMat);      // 拉手
        addBox(0.10, 0.03, 0.03, rx, 0.86, z + 0.372, trimMat);
      }
    }
  }
  boxC(3.2, 0.96, 0.8, -124.6, 0.48, 7.2, woodMat, 1);
  addBox(3.36, 0.06, 0.92, -124.6, 1.0, 7.2, trimMat);
  collide(-124.6, 7.2, 3.36, 0.92, 1.02, 'counter');
  supports.push({ x: -124.6, z: 7.2, top: 1.02, w: 3.36, d: 0.92, kind: 'counter' });
  for (let i = 0; i < 3; i++) boxC(0.7, 0.5, 0.5, -122.4, 0.25 + i * 0.52, 9.2, woodMat, 0.8);
  collide(-122.4, 9.2, 0.7, 0.5, 1.6, 'boxes');

  // 布草整理 / 洗衣：布草车 + 层架 + 折叠台
  for (const [x, z] of [[-116.6, 3.4], [-113.4, 3.4], [-116.6, 6.2]]) {
    boxC(1.1, 0.62, 0.72, x, 0.31, z, woodMat, 1);
    addBox(1.16, 0.04, 0.78, x, 0.66, z, trimMat);
    collide(x, z, 1.16, 0.78, 0.68, 'cart');
  }
  for (let i = 0; i < 2; i++) {
    boxC(3.4, 0.06, 0.6, -114.2, 1.2 + i * 0.55, 9.0, woodMat, 1);
    addBox(0.06, 1.2 + i * 0.55, 0.6, -116.0, (1.2 + i * 0.55) / 2, 9.0, trimMat);
    addBox(0.06, 1.2 + i * 0.55, 0.6, -112.4, (1.2 + i * 0.55) / 2, 9.0, trimMat);
  }
  collide(-114.2, 9.0, 3.6, 0.62, 1.8, 'shelf');
  boxC(2.4, 0.9, 0.8, -112.6, 0.45, 5.6, woodMat, 1);
  collide(-112.6, 5.6, 2.4, 0.8, 0.92, 'folding');

  // 维修配电：配电柜 + 桥架 + 工作台 + 工作灯
  boxC(3.2, 1.9, 0.7, -125.0, 0.95, -9.6, trimMat, 0.6);
  collide(-125.0, -9.6, 3.2, 0.7, 1.92, 'switchgear');
  for (let i = 0; i < 3; i++) addBox(0.5, 0.18, 0.03, -126.0 + i * 0.9, 1.5, -9.24, trimMat);
  addBox(1.6, 0.08, 0.5, -124.0, 1.62, -9.0, trimMat);
  supports.push({ x: -124.0, z: -9.0, top: 1.66, w: 1.6, d: 0.5, kind: 'bracket' });
  {
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.85 });
    for (const [x, y] of [[-127.4, 2.55], [-122.6, 2.42]]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 8.2, 10), cableMat);
      pipe.rotation.z = Math.PI / 2; pipe.position.set(x, y, -8.0); scene.add(pipe);
      out.pipes.push({ mesh: pipe, len: 8.2, a: [x - 4.1, y, -8.0], b: [x + 4.1, y, -8.0], r: 0.055 });
      for (const dx of [-3.0, 0, 3.0]) {
        addBox(0.07, 0.05, 0.3, x + dx, y, -8.12, trimMat);
        out.hangers.push({ kind: 'pipeClamp', x: x + dx, y, z: -8.12 });
        addBox(0.05, 3.0 - y, 0.05, x + dx, (3.0 + y) / 2, -8.12, trimMat);
        out.hangers.push({ kind: 'pipeDrop', x: x + dx, y, z: -8.12, y0: y, y1: 3.0 });
      }
    }
  }
  addBox(1.8, 0.06, 0.9, -120.6, 0.86, -3.4, woodMat, 1);
  for (const dx of [-0.8, 0.8]) addBox(0.07, 0.86, 0.07, -120.6 + dx, 0.43, -3.8, trimMat);
  collide(-120.6, -3.4, 1.8, 0.9, 0.9, 'workbench');
  {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x8a8271, roughness: 0.6, side: THREE.DoubleSide }));
    shade.position.set(-120.6, 2.34, -3.4); scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffd28a, emissiveIntensity: 2.4 }));
    bulb.position.set(-120.6, 2.22, -3.4); scene.add(bulb);
    addBox(0.05, 3.0 - 2.46, 0.05, -120.6, (3.0 + 2.46) / 2, -3.4, trimMat);
    out.hangers.push({ kind: 'lampRod', x: -120.6, y: 2.46, z: -3.4 });
  }

  // 布草库 / 后台储存：层架 + 打包台 + 立柱
  for (const z of [-8.6, -6.2, -3.6]) {
    boxC(0.6, 2.1, 0.6, -139.2, 1.05, z, woodMat, 0.8);
    collide(-139.2, z, 0.62, 0.62, 2.12, 'post');
  }
  for (let i = 0; i < 3; i++) boxC(6.4, 0.06, 0.6, -135.0, 0.7 + i * 0.62, -9.2, woodMat, 1);
  collide(-135.0, -9.2, 6.4, 0.62, 1.9, 'shelf');
  boxC(2.0, 0.9, 1.0, -133.4, 0.45, -3.4, woodMat, 1);
  collide(-133.4, -3.4, 2.0, 1.0, 0.92, 'packTable');

  // 服务前室：出口卷帘 + 指示 + 鞋架 + 水渍
  const exitPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 2.95), trimMat);
  exitPanel.position.set(-108.02, 1.18, -5.0); scene.add(exitPanel);
  const exitSignMat = new THREE.MeshStandardMaterial({ map: makeSignTexture('出口', 'EXIT'), color: 0x1a0505, emissive: 0xff2a2a, emissiveIntensity: 1.9, roughness: 0.7 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), exitSignMat);
  sign.position.set(-107.9, 2.66, -5.0); sign.rotation.y = -Math.PI / 2; scene.add(sign);
  const exitLight = new THREE.PointLight(0xff2a2a, 0.9, 4.5, 2);
  exitLight.position.set(-107.55, 2.5, -5.0); scene.add(exitLight);
  for (let i = 0; i < 3; i++) boxC(1.6, 0.42, 0.5, -111.2, 0.21 + i * 0.46, -8.4, woodMat, 0.8);
  collide(-111.2, -8.4, 1.6, 0.5, 1.4, 'rack');
  addBox(0.72, 0.06, 2.4, -109.0, 0.02, -5.0, trimMat);
  {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18),
      new THREE.MeshStandardMaterial({ color: 0x2b2a24, transparent: true, opacity: 0.35, roughness: 0.9, depthWrite: false }));
    puddle.rotation.x = -Math.PI / 2; puddle.position.set(-112.4, 0.006, -4.0); scene.add(puddle);
  }

  /* ---------------- 墙面小件：只贴真实墙段、避开所有门洞 ---------------- */
  const faceAt = (axis, coord, side, along, margin = 0.35) => {
    for (const w of out.wallPieces) {
      if (w.axis !== axis || Math.abs(w.coord - coord) > 1e-6) continue;
      if (along < w.a + margin || along > w.b - margin) continue;
      return w.coord + side * (WALL_T / 2);
    }
    return null;
  };
  for (let x = -147; x < -110; x += 5.5) {
    for (const z of [-1.2, 1.2]) {
      const face = faceAt('z', z, z > 0 ? 1 : -1, x, 0.32);
      if (face == null) continue;
      addBox(0.11, 0.15, 0.022, x, 0.32, face + (z > 0 ? 1 : -1) * 0.012, trimMat);
      out.sockets.push({ x, y: 0.32, z: face });
    }
  }
  for (const [x, z, y] of [[-134, 10, 2.3], [-121, 10, 2.3], [-121.5, -10, 2.3], [-137, -10, 2.3]]) {
    const face = faceAt('z', z, z > 0 ? -1 : 1, x, 0.55);
    if (face == null) continue;
    addBox(0.72, 0.40, 0.03, x, y, face - (z > 0 ? 0.018 : -0.018), trimMat);
    for (let i = 0; i < 6; i++) addBox(0.66, 0.028, 0.012, x, y - 0.15 + i * 0.055, face - (z > 0 ? 0.038 : -0.038), trimMat);
    out.vents.push({ x, y, z: face });
  }
  for (const [x, z, y, r] of [[-128, -10, 2.1, 0.5], [-120, 10, 2.3, 0.4], [-146, 6, 1.6, 0.32], [-112, 10, 2.1, 0.45]]) {
    const face = faceAt('z', z, z > 0 ? -1 : 1, x, 0.7);
    if (face == null) continue;
    const dec = new THREE.Mesh(new THREE.CircleGeometry(r, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a7648, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false }));
    dec.position.set(x, y, face - (z > 0 ? 0.006 : -0.006)); scene.add(dec);
    out.stains.push({ x, y, z: face });
  }

  /* ---------------- 纸张：只落在真实可走地面 ---------------- */
  const paperOk = (x, z) => {
    for (const c of COLLIDERS_L0) {
      if (c.y1 > 0.4) continue;
      if (x > c.x1 - 0.12 && x < c.x2 + 0.12 && z > c.z1 - 0.12 && z < c.z2 + 0.12) return false;
    }
    return true;
  };
  for (let i = 0, tries = 0; i < 14 && tries < 400; tries++) {
    const x = -148 + Math.random() * 38, z = -9 + Math.random() * 18;
    if (!paperOk(x, z)) continue;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.19 + Math.random() * 0.08, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xb3ab95, roughness: 0.95 }));
    sheet.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    sheet.position.set(x, 0.007, z); scene.add(sheet);
    out.papers.push({ x, z, obj: sheet }); i++;
  }

  out.supports = supports.slice();
  out.exitPanel = exitPanel;
  out.exitSignMat = exitSignMat;
  out.exitLight = exitLight;
  out.bounds = { ...L0.bounds };
  out.spawn = { ...L0.spawn };
  return out;
}
