/* Level 0 v2 —— 浴场后台后室（42×24 m 紧凑后勤层）
   几何/碰撞/家具全部由 L12P.L0 的房间与门洞数据生成，不再使用旧 86×48 地图坐标。
   ctx 由宿主注入：THREE / scene / addBox / addWorldUVBox / addDeck / matFor /
   L12_TEX / COLLIDERS_L0 / l0Lights / hemiL0 / makeCanvas / makeSignTexture。 */

import { panelCeiling, wainscot } from './l12-art.js';
import { createDetailKit } from './l12-detail.js';

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
  // 近景细件库：真实小倒角板材 / 圆杆 / 圆盘（与 L37 共用同一份实现）
  const kit = createDetailKit({ THREE, scene, addBox });

  // 接待：值班台 + 三张访客长椅（原"STAFF WING · 供电示意"总览牌已按需求移除）
  {
    // 值班台：台身内收 + 倒角台面 + 前裙板 + 两端封板 + 三樘独立柜门 + 竖向拉手 + 内收踢脚
    const dx = -145.4, dz = -4.6, W = 3.6, D = 0.8, Hh = 1.04, topT = 0.07, bodyH = Hh - topT;
    const bodyD = D - 0.06, frontZ = dz + bodyD / 2;
    boxC(W - 0.06, bodyH, bodyD, dx, bodyH / 2, dz, woodMat, 1);
    kit.slab({ w: W, h: topT, d: D, x: dx, y: Hh - topT / 2, z: dz, mat: trimMat, axis: 'y', r: 0.012, bevel: 0.004, part: 'deskTop' });
    kit.slab({ w: W - 0.22, h: 0.10, d: 0.022, x: dx, y: bodyH - 0.06, z: frontZ + 0.011, mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    for (const sg of [-1, 1]) {
      kit.slab({ w: 0.026, h: bodyH - 0.03, d: bodyD + 0.004, x: dx + sg * (W / 2 - 0.013), y: (bodyH - 0.03) / 2, z: dz, mat: woodMat, axis: 'x', r: 0.004, bevel: 0.002, part: 'endPanel' });
    }
    const nDoor = 3, gap = 0.004, doorH = bodyH - 0.26;
    const fw = (W - 0.22 - gap * (nDoor - 1)) / nDoor;
    for (let i = 0; i < nDoor; i++) {
      const cx = dx - (W - 0.22) / 2 + i * (fw + gap) + fw / 2;
      const cy = 0.16 + doorH / 2;
      kit.slab({ w: fw, h: doorH, d: 0.02, x: cx, y: cy, z: frontZ + 0.011, mat: woodMat, axis: 'z', r: 0.005, bevel: 0.002, part: 'door' });
      const hx = cx - fw / 2 + 0.05;
      kit.rod({ r: 0.011, len: 0.15, x: hx, y: cy, z: frontZ + 0.036, mat: trimMat, axis: 'y', part: 'handle' });
      for (const hy of [cy + doorH / 2 - 0.09, cy - doorH / 2 + 0.09]) {
        kit.rod({ r: 0.012, len: 0.016, x: hx - 0.018, y: hy, z: frontZ + 0.024, mat: trimMat, axis: 'z', part: 'hinge' });
      }
    }
    kit.slab({ w: W - 0.14, h: 0.09, d: 0.02, x: dx, y: 0.045, z: frontZ - 0.028, mat: trimMat, axis: 'z', r: 0.003, bevel: 0.001, part: 'toeKick' });
    collide(-145.4, -4.6, 3.75, 0.92, 1.12, 'desk');
  }
  for (const z of [-1.6, 0.6, 2.8]) {
    // 访客长椅：三条倒角座板 + 两端支腿 + 端部横撑，接地且顶住座板
    const cx = -148.4, seatT = 0.08, seatY = 0.44;
    const seatLen = 1.9, sGap = 0.004, sd = (seatLen - sGap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const off = -seatLen / 2 + i * (sd + sGap) + sd / 2;
      kit.slab({ w: 0.6, h: seatT, d: sd, x: cx, y: seatY, z: z + off, mat: woodMat, axis: 'y', r: 0.006, bevel: 0.003, part: 'seatSlat' });
    }
    const legH = seatY - seatT / 2;
    for (const dz of [-0.75, 0.75]) {
      kit.slab({ w: 0.5, h: legH, d: 0.07, x: cx, y: legH / 2, z: z + dz, mat: trimMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'leg' });
    }
    kit.rod({ r: 0.014, len: 1.3, x: cx, y: 0.12, z: z, mat: trimMat, axis: 'z', part: 'stretcher' });
    // 座下连续托梁：顶面贴住座板底面（0.40），跨过三段座板与两端腿板
    kit.rod({ r: 0.014, len: seatLen - 0.30, x: cx, y: seatY - seatT / 2 - 0.014, z: z, mat: trimMat, axis: 'z', part: 'rail' });
    collide(-148.4, z, 0.7, 1.9, 0.5, 'chair');
  }
  // 原"STAFF WING · 供电示意"接待总览牌（画布 + 上边条）已按需求移除

  // 员工更衣与休息：更衣柜一列 + 长凳 + 打卡机 + 休息桌
  for (const z of [2.6, 4.4, 6.2, 8.0]) {
    // 员工更衣柜：柜体 + 内收踢脚 + 倒角顶盖 + 三樘独立柜门（4mm 门缝）+ 竖向拉手 + 铰链筒 + 标签
    const lx = -139.4, lw = 0.5, ld = 1.5, lh = 1.9, capT = 0.03;
    const faceX = lx + lw / 2, doorH = lh - 0.26, yDoor = 0.18 + doorH / 2;
    boxC(lw, lh - capT, ld, lx, (lh - capT) / 2, z, woodMat, 0.6);
    boxC(lw - 0.06, 0.07, ld - 0.06, lx, 0.035, z, trimMat, 1);
    kit.slab({ w: lw + 0.03, h: capT, d: ld + 0.03, x: lx, y: lh - capT / 2, z, mat: trimMat, axis: 'y', r: 0.006, bevel: 0.003, part: 'lockerTop' });
    const nD = 3, g = 0.004, dw = (ld - 0.10 - g * (nD - 1)) / nD;
    for (let i = 0; i < nD; i++) {
      const cz = z - (ld - 0.10) / 2 + i * (dw + g) + dw / 2;
      kit.slab({ w: 0.02, h: doorH, d: dw, x: faceX + 0.011, y: yDoor, z: cz, mat: woodMat, axis: 'x', r: 0.004, bevel: 0.002, part: 'door' });
      const hz = cz + (i % 2 === 0 ? dw / 2 - 0.045 : -dw / 2 + 0.045);
      kit.rod({ r: 0.010, len: 0.15, x: faceX + 0.034, y: yDoor, z: hz, mat: trimMat, axis: 'y', part: 'handle' });
      for (const hy of [yDoor + doorH / 2 - 0.11, yDoor - doorH / 2 + 0.11]) {
        kit.rod({ r: 0.012, len: 0.016, x: faceX + 0.026, y: hy, z: hz, mat: trimMat, axis: 'x', part: 'hinge' });
      }
      kit.slab({ w: 0.005, h: 0.05, d: 0.10, x: faceX + 0.024, y: yDoor + 0.28, z: cz, mat: trimMat, axis: 'x', r: 0.002, bevel: 0.001, part: 'label' });
    }
    collide(-139.4, z, 0.52, 1.5, 1.95, 'locker');
  }
  kit.slab({ w: 0.54, h: 0.06, d: 6.3, x: -139.4, y: 1.94, z: 5.3, mat: trimMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'lockerRowCap' });
  {
    // 员工长凳（沿 z 4.4m）：三条倒角座板 + 两端支腿 + 两道端部横撑 + 座下托梁
    const bx = -137.2, bz = 5.2, len = 4.4, seatT = 0.09, seatY = 0.45 + seatT / 2;
    const sGap = 0.004, sd = (len - sGap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const off = -len / 2 + i * (sd + sGap) + sd / 2;
      kit.slab({ w: 0.5, h: seatT, d: sd, x: bx, y: seatY, z: bz + off, mat: woodMat, axis: 'y', r: 0.006, bevel: 0.003, part: 'seatSlat' });
    }
    const legH = seatY - seatT / 2;
    for (const dz of [-1.9, 1.9]) {
      kit.slab({ w: 0.44, h: legH, d: 0.08, x: bx, y: legH / 2, z: bz + dz, mat: trimMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'leg' });
    }
    for (const dz of [-1.9, 1.9]) {
      kit.rod({ r: 0.014, len: 0.40, x: bx, y: 0.13, z: bz + dz, mat: trimMat, axis: 'x', part: 'stretcher' });
    }
    kit.rod({ r: 0.016, len: len - 0.4, x: bx, y: seatY - seatT / 2 - 0.016, z: bz, mat: trimMat, axis: 'z', part: 'rail' });
    collide(-137.2, 5.2, 0.5, 4.4, 0.5, 'bench');
  }
  addBox(0.34, 0.42, 0.16, -139.6, 1.34, 9.4, trimMat);
  addBox(0.06, 1.34, 0.06, -139.6, 0.67, 9.4, trimMat);
  {
    // 休息桌：倒角台面 + 前裙板 + 四腿 + 两块坐垫（首枚保险丝落在 0.72 台面上）
    const tx = -134.4, tz = 4.2, W = 1.5, D = 0.9, topY = 0.72, topT = 0.06;
    kit.slab({ w: W, h: topT, d: D, x: tx, y: topY - topT / 2, z: tz, mat: woodMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'tableTop' });
    for (const sg of [-1, 1]) {
      kit.slab({ w: W - 0.22, h: 0.09, d: 0.02, x: tx, y: topY - topT - 0.05, z: tz + sg * (D / 2 - 0.06), mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.rod({ r: 0.026, len: topY - topT, x: tx + sx * (W / 2 - 0.09), y: (topY - topT) / 2, z: tz + sz * (D / 2 - 0.09), mat: trimMat, axis: 'y', part: 'leg' });
    }
    for (const dz of [-0.55, 0.55]) {
      kit.slab({ w: 0.5, h: 0.06, d: 0.44, x: tx, y: 0.44, z: tz + dz, mat: woodMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'cushion' });
    }
    collide(-134.4, 4.2, 1.5, 0.9, 0.74, 'table');
    supports.push({ x: -134.4, z: 4.2, top: 0.72, w: 1.5, d: 0.9, kind: 'table' });
    out.props.push({ kind: 'table', x: -134.4, z: 4.2, top: 0.72 });
  }

  // 票务档案：票柜阵 + 出票台 + 票据箱
  // 两侧柜列之间留出对准南门的主通道，门内先有完整的转身空间。
  for (const x of [-129.6, -128.0, -123.2]) {
    for (const z of [3.6, 5.2]) {
      // 档案票柜：柜体 + 内收踢脚 + 倒角顶盖 + 三层独立抽屉面板（3.5mm 分缝）+ 立体横拉手 + 卡片座
      const cw = 1.2, ch = 1.35, cd = 0.66, capT = 0.03;
      const frontZ = z + cd / 2;
      const nR = 3, g = 0.0035, ph = (ch - 0.16 - capT - g * (nR - 1)) / nR;
      boxC(cw, ch - capT, cd, x, (ch - capT) / 2, z, woodMat, 1);
      boxC(cw - 0.06, 0.07, cd - 0.06, x, 0.035, z, trimMat, 1);
      kit.slab({ w: cw + 0.02, h: capT, d: cd + 0.02, x, y: ch - capT / 2, z, mat: trimMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'cabinetTop' });
      for (let k = 0; k < nR; k++) {
        const py = 0.15 + k * (ph + g) + ph / 2;
        kit.slab({ w: cw - 0.12, h: ph, d: 0.02, x, y: py, z: frontZ + 0.011, mat: woodMat, axis: 'z', r: 0.005, bevel: 0.002, part: 'drawerFront' });
        kit.rod({ r: 0.009, len: 0.30, x, y: py, z: frontZ + 0.034, mat: trimMat, axis: 'x', part: 'pull' });
        for (const sx of [-1, 1]) {
          kit.rod({ r: 0.010, len: 0.016, x: x + sx * (cw / 2 - 0.05), y: py, z: frontZ + 0.022, mat: trimMat, axis: 'x', part: 'pullMount' });
        }
        kit.slab({ w: 0.11, h: 0.05, d: 0.006, x, y: py + ph / 2 - 0.03, z: frontZ + 0.026, mat: trimMat, axis: 'z', r: 0.002, bevel: 0.001, part: 'cardHolder' });
      }
      collide(x, z, 1.2, 0.66, 1.42, 'cabinet');
    }
  }
  {
    // 出票台：台身内收 + 倒角台面（票据面 1.02）+ 前裙板 + 两端封板 + 两樘门板 + 内收踢脚
    const cx = -124.6, cz = 7.2, W = 3.2, D = 0.8, Hh = 0.96, topT = 0.06;
    const bodyD = D - 0.05, frontZ = cz + bodyD / 2;
    boxC(W - 0.06, Hh, bodyD, cx, Hh / 2, cz, woodMat, 1);
    boxC(W - 0.14, 0.07, bodyD - 0.06, cx, 0.035, cz, trimMat, 1);
    kit.slab({ w: W + 0.16, h: topT, d: D + 0.12, x: cx, y: 1.02 - topT / 2, z: cz, mat: trimMat, axis: 'y', r: 0.012, bevel: 0.004, part: 'counterTop' });
    kit.slab({ w: W - 0.24, h: 0.10, d: 0.022, x: cx, y: Hh - 0.06, z: frontZ + 0.011, mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    const nd = 3, g = 0.004, dw = (W - 0.26 - g * (nd - 1)) / nd, doorH = Hh - 0.26;
    for (let i = 0; i < nd; i++) {
      const dx2 = cx - (W - 0.26) / 2 + i * (dw + g) + dw / 2;
      kit.slab({ w: dw, h: doorH, d: 0.02, x: dx2, y: 0.16 + doorH / 2, z: frontZ + 0.011, mat: woodMat, axis: 'z', r: 0.005, bevel: 0.002, part: 'door' });
      kit.rod({ r: 0.010, len: 0.14, x: dx2 - dw / 2 + 0.05, y: 0.16 + doorH / 2, z: frontZ + 0.034, mat: trimMat, axis: 'y', part: 'handle' });
    }
    collide(-124.6, 7.2, 3.36, 0.92, 1.02, 'counter');
    supports.push({ x: -124.6, z: 7.2, top: 1.02, w: 3.36, d: 0.92, kind: 'counter' });
  }
  for (let i = 0; i < 3; i++) {
    kit.slab({ w: 0.7, h: 0.5, d: 0.5, x: -122.4, y: 0.25 + i * 0.52, z: 9.2, mat: woodMat, axis: 'y', r: 0.012, bevel: 0.005, part: 'bin' });
  }
  collide(-122.4, 9.2, 0.7, 0.5, 1.6, 'boxes');

  // 布草整理 / 洗衣：布草车 + 层架 + 折叠台
  for (const [x, z] of [[-116.6, 3.4], [-113.4, 3.4], [-116.6, 6.2]]) {
    // 布草车：内凹帆布箱体 + 倒角顶圈 + 四角立柱 + 四个脚轮 + 推手
    const cw = 1.1, cH = 0.62, cd = 0.72;
    boxC(cw - 0.08, cH, cd - 0.08, x, cH / 2, z, trimMat, 1);
    kit.slab({ w: cw, h: 0.045, d: cd, x, y: cH + 0.0225, z, mat: trimMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'cartRim' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.rod({ r: 0.014, len: cH, x: x + sx * (cw / 2 - 0.03), y: cH / 2, z: z + sz * (cd / 2 - 0.03), mat: trimMat, axis: 'y', part: 'cartPost' });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.disc({ r: 0.035, t: 0.030, x: x + sx * (cw / 2 - 0.09), y: 0.035, z: z + sz * (cd / 2 - 0.09), mat: trimMat, axis: 'x', part: 'caster', seg: 12 });
    }
    kit.rod({ r: 0.013, len: 0.58, x: x, y: cH + 0.30, z: z + cd / 2 - 0.02, mat: trimMat, axis: 'x', part: 'cartHandle' });
    // 推手支架：从顶圈面（cH + 0.045）接到推手中心高度（cH + 0.30），两端各一根
    for (const sx of [-1, 1]) {
      kit.rod({
        r: 0.012, len: 0.255, x: x + sx * 0.26, y: cH + 0.1725, z: z + cd / 2 - 0.02,
        mat: trimMat, axis: 'y', part: 'cartBracket'
      });
    }
    collide(x, z, 1.16, 0.78, 0.68, 'cart');
  }
  {
    // 布草层架：两层倒角层板 + 四根立柱 + 层板托
    const sx = -114.2, sz = 9.0, sLen = 3.4, sD = 0.6;
    for (let i = 0; i < 2; i++) {
      const y = 1.2 + i * 0.55;
      kit.slab({ w: sLen, h: 0.06, d: sD, x: sx, y, z: sz, mat: woodMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'shelfBoard' });
    }
    for (const dx of [-1, 1]) {
      kit.slab({ w: 0.055, h: 1.75, d: sD, x: sx + dx * (sLen / 2 - 0.03), y: 0.875, z: sz, mat: trimMat, axis: 'x', r: 0.004, bevel: 0.002, part: 'shelfPost' });
    }
    for (const dz of [-1, 1]) {
      kit.rod({ r: 0.012, len: sLen - 0.12, x: sx, y: 1.16, z: sz + dz * (sD / 2 - 0.04), mat: trimMat, axis: 'x', part: 'shelfBrace' });
    }
    collide(-114.2, 9.0, 3.6, 0.62, 1.8, 'shelf');
  }
  {
    // 折叠台：倒角台面 + 前裙板 + 四腿
    const fx = -112.6, fz = 5.6, W = 2.4, D = 0.8, Hh = 0.9, topT = 0.06;
    kit.slab({ w: W, h: topT, d: D, x: fx, y: Hh - topT / 2, z: fz, mat: woodMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'foldingTop' });
    kit.slab({ w: W - 0.24, h: 0.09, d: 0.02, x: fx, y: Hh - topT - 0.05, z: fz + D / 2 - 0.01, mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1]) {
      kit.rod({ r: 0.024, len: Hh - topT, x: fx + sx2 * (W / 2 - 0.10), y: (Hh - topT) / 2, z: fz + sz2 * (D / 2 - 0.10), mat: trimMat, axis: 'y', part: 'leg' });
    }
    collide(-112.6, 5.6, 2.4, 0.8, 0.92, 'folding');
  }

  // 维修配电：配电柜 + 桥架 + 工作台 + 工作灯
  boxC(3.2, 1.9, 0.7, -125.0, 0.95, -9.6, trimMat, 0.6);
  collide(-125.0, -9.6, 3.2, 0.7, 1.92, 'switchgear');
  kit.slab({ w: 3.26, h: 0.04, d: 0.76, x: -125.0, y: 1.92, z: -9.6, mat: trimMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'switchgearCap' });
  boxC(3.1, 0.06, 0.64, -125.0, 0.04, -9.6, trimMat, 1);
  // 三樘配电柜门：门板 + 4mm 门缝 + 竖向把手 + 仪表窗与指示灯
  for (let i = 0; i < 3; i++) {
    const dx = -126.05 + i * 1.05;
    kit.slab({ w: 0.99, h: 1.60, d: 0.02, x: dx, y: 1.02, z: -9.24, mat: trimMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'switchDoor' });
    kit.rod({ r: 0.011, len: 0.18, x: dx + 0.42, y: 0.95, z: -9.21, mat: trimMat, axis: 'y', part: 'handle' });
    addBox(0.30, 0.16, 0.02, dx - 0.10, 1.50, -9.225, trimMat);
    kit.rod({ r: 0.012, len: 0.014, x: dx + 0.24, y: 1.50, z: -9.22, mat: trimMat, axis: 'z', part: 'pilotLamp' });
  }
  kit.slab({
    w: 1.6, h: 0.08, d: 0.5, x: -124.0, y: 1.62, z: -9.0,
    mat: trimMat, axis: 'y', r: 0.004, bevel: 0.002, part: 'bracketTop'
  });
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
  {
    // 维修工作台：倒角台面 + 四周裙板 + 四腿 + 下层置物板
    const wx = -120.6, wz = -3.4, W = 1.8, D = 0.9, Hh = 0.86, topT = 0.06;
    kit.slab({ w: W, h: topT, d: D, x: wx, y: Hh - topT / 2, z: wz, mat: woodMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'workTop' });
    for (const sz of [-1, 1]) {
      kit.slab({ w: W - 0.16, h: 0.08, d: 0.02, x: wx, y: Hh - topT - 0.05, z: wz + sz * (D / 2 - 0.02), mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.rod({ r: 0.022, len: Hh - topT, x: wx + sx * (W / 2 - 0.07), y: (Hh - topT) / 2, z: wz + sz * (D / 2 - 0.07), mat: trimMat, axis: 'y', part: 'leg' });
    }
    kit.slab({ w: W - 0.20, h: 0.03, d: D - 0.16, x: wx, y: 0.22, z: wz, mat: trimMat, axis: 'y', r: 0.006, bevel: 0.002, part: 'lowerShelf' });
    collide(-120.6, -3.4, 1.8, 0.9, 0.9, 'workbench');
  }
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
  for (let i = 0; i < 3; i++) {
    kit.slab({ w: 6.4, h: 0.06, d: 0.6, x: -135.0, y: 0.7 + i * 0.62, z: -9.2, mat: woodMat, axis: 'y', r: 0.008, bevel: 0.003, part: 'stockBoard' });
  }
  for (const dx of [-1, 1]) {
    kit.slab({ w: 0.06, h: 1.92, d: 0.6, x: -135.0 + dx * 3.16, y: 0.96, z: -9.2, mat: trimMat, axis: 'x', r: 0.004, bevel: 0.002, part: 'stockPost' });
  }
  kit.rod({ r: 0.013, len: 6.2, x: -135.0, y: 1.28, z: -8.94, mat: trimMat, axis: 'x', part: 'stockBrace' });
  collide(-135.0, -9.2, 6.4, 0.62, 1.9, 'shelf');
  {
    // 打包台：倒角台面 + 前裙板 + 四腿
    const px = -133.4, pz = -3.4, W = 2.0, D = 1.0, Hh = 0.9, topT = 0.06;
    kit.slab({ w: W, h: topT, d: D, x: px, y: Hh - topT / 2, z: pz, mat: woodMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'packTop' });
    kit.slab({ w: W - 0.22, h: 0.09, d: 0.02, x: px, y: Hh - topT - 0.05, z: pz + D / 2 - 0.02, mat: woodMat, axis: 'z', r: 0.004, bevel: 0.002, part: 'apron' });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      kit.rod({ r: 0.024, len: Hh - topT, x: px + sx * (W / 2 - 0.10), y: (Hh - topT) / 2, z: pz + sz * (D / 2 - 0.10), mat: trimMat, axis: 'y', part: 'leg' });
    }
    collide(-133.4, -3.4, 2.0, 1.0, 0.92, 'packTable');
  }

  // 服务前室：出口卷帘 + 指示 + 鞋架 + 水渍
  const exitPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 2.95), trimMat);
  exitPanel.position.set(-108.02, 1.18, -5.0); scene.add(exitPanel);
  const exitSignMat = new THREE.MeshStandardMaterial({ map: makeSignTexture('出口', 'EXIT'), color: 0x1a0505, emissive: 0xff2a2a, emissiveIntensity: 1.9, roughness: 0.7 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), exitSignMat);
  sign.position.set(-107.9, 2.66, -5.0); sign.rotation.y = -Math.PI / 2; scene.add(sign);
  const exitLight = new THREE.PointLight(0xff2a2a, 0.9, 4.5, 2);
  exitLight.position.set(-107.55, 2.5, -5.0); scene.add(exitLight);
  for (let i = 0; i < 3; i++) {
    kit.slab({ w: 1.6, h: 0.42, d: 0.5, x: -111.2, y: 0.21 + i * 0.46, z: -8.4, mat: woodMat, axis: 'y', r: 0.010, bevel: 0.004, part: 'shoeBoard' });
  }
  for (const dx of [-1, 1]) {
    kit.rod({ r: 0.016, len: 1.4, x: -111.2 + dx * 0.74, y: 0.7, z: -8.4, mat: trimMat, axis: 'y', part: 'shoePost' });
  }
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

  kit.flush();
  out.detail = kit.stats();
  out.detailKit = kit;
  out.supports = supports.slice();
  out.exitPanel = exitPanel;
  out.exitSignMat = exitSignMat;
  out.exitLight = exitLight;
  out.bounds = { ...L0.bounds };
  out.spawn = { ...L0.spawn };
  return out;
}
