/* ==== 地图数据（v2：同一份平面数据驱动墙 / 门洞 / 门楣 / 天花 / 碰撞 / 导航） ==== */
const H = 4.4;                       // 泳池层净高
const L37_SAUNA_H = 2.60;            // 桑拿 / 蒸汽间局部低顶
const L37_EQUIP_H = 3.05;            // 设备间顶棚
const BOUNDS = { x1: -30, x2: 30, z1: -30, z2: 30 };

/* 四个水体：游泳主池 / 温热主汤池 / 静汤池 / 冷水池。
   bottom/water 决定水位与 groundAt；stairs.steps 是网格与地面查询的唯一来源。 */
const POOLS = [
  { name: 'pool', label: '游泳主池', x1: 8, x2: 18, zDeep1: -26, zEnd: -1,
    bottom: -2.00, water: -0.28, lanes: 5,
    stairs: { x1: 8, x2: 9.9, steps: [
      { z1: -2.4, z2: -1, top: -0.46 }, { z1: -3.8, z2: -2.4, top: -0.86 },
      { z1: -5.2, z2: -3.8, top: -1.26 }, { z1: -6.6, z2: -5.2, top: -1.66 } ] } },
  { name: 'hot', label: '温热主汤池', x1: -22, x2: -12, zDeep1: -26, zEnd: -18,
    bottom: -1.00, water: -0.16, lanes: 0,
    stairs: { x1: -22, x2: -20.1, steps: [
      { z1: -20, z2: -18, top: -0.44 }, { z1: -21.4, z2: -20, top: -0.76 } ] } },
  { name: 'quiet', label: '静汤池', x1: -12, x2: -6, zDeep1: -26, zEnd: -20,
    bottom: -0.62, water: -0.14, lanes: 0, bench: true,
    stairs: { x1: -12, x2: -10.4, steps: [{ z1: -21.5, z2: -20, top: -0.34 }] } },
  { name: 'cold', label: '冷水池', x1: -22, x2: -19, zDeep1: -13, zEnd: -10,
    bottom: -1.35, water: -0.16, lanes: 0,
    stairs: { x1: -22, x2: -20.9, steps: [{ z1: -11.5, z2: -10, top: -0.52 }, { z1: -12.6, z2: -11.5, top: -0.94 }] } }
];
const POOL_BY_NAME = {};
const COLLIDERS = [];
for (const p of POOLS) { p.cx = (p.x1 + p.x2) / 2; p.cz = (p.zDeep1 + p.zEnd) / 2; POOL_BY_NAME[p.name] = p; }
function poolAt(x, z, pad = 0) {
  for (const p of POOLS) {
    if (x >= p.x1 - pad && x <= p.x2 + pad && z >= p.zDeep1 - pad && z <= p.zEnd + pad) return p;
  }
  return null;
}
function insidePoolArea(x, z, pad = 0.4) { return !!poolAt(x, z, pad); }
const BASIN = POOL_BY_NAME.quiet;      // 旧的浅水盆引用（立柱过滤等）指向静汤池

/* ---------------- 平面数据：房间矩形 + 门洞 ---------------- */
// name 用于房间用途表与测试；kind 只在需要特殊构造（低顶 / 设备 / 湿区）时使用
const L37_ROOMS = [
  { id: 'lobby', name: '接待 · 总导览', x1: -12, z1: 16, x2: 12, z2: 28, h: H, kind: 'dry' },
  { id: 'shoe', name: '脱鞋储物', x1: -6, z1: 12, x2: 6, z2: 16, h: H, kind: 'dry' },
  { id: 'wet', name: '湿区分配厅', x1: -6, z1: -2, x2: 6, z2: 12, h: H, kind: 'wet' },
  { id: 'lockW', name: '西更衣', x1: -30, z1: 4, x2: -6, z2: 14, h: H, kind: 'dry' },
  { id: 'lockE', name: '东更衣', x1: 6, z1: 4, x2: 30, z2: 14, h: H, kind: 'dry' },
  { id: 'shwW', name: '西淋浴', x1: -30, z1: -2, x2: -6, z2: 4, h: H, kind: 'wet' },
  { id: 'shwE', name: '东淋浴', x1: 6, z1: -2, x2: 30, z2: 4, h: H, kind: 'wet' },
  { id: 'spaA', name: '温泉厅 · 主汤池', x1: -30, z1: -27, x2: -2, z2: -15, h: H, kind: 'wet' },
  { id: 'spaB', name: '温泉厅 · 冷热过渡', x1: -24, z1: -15, x2: -2, z2: -2, h: H, kind: 'wet' },
  { id: 'sauna', name: '桑拿 / 蒸汽间', x1: -30, z1: -15, x2: -24, z2: -2, h: L37_SAUNA_H, kind: 'wood' },
  { id: 'poolA', name: '游泳池厅', x1: 6, z1: -27, x2: 22, z2: -2, h: H, kind: 'wet' },
  { id: 'poolB', name: '游泳池厅 · 东廊', x1: 22, z1: -17, x2: 30, z2: -2, h: H, kind: 'wet' },
  { id: 'equip', name: '水处理设备间', x1: 22, z1: -27, x2: 30, z2: -17, h: L37_EQUIP_H, kind: 'equip' },
  { id: 'rest', name: '北静休廊', x1: -30, z1: -30, x2: 30, z2: -27, h: H, kind: 'dry' }
];
// axis:'z' 表示墙沿 x 延伸、位于 z=coord；gap 为门洞占位（净宽 = gap[1]-gap[0]）
const L37_DOORS = [
  { axis: 'z', coord: 28, gap: [22, 25.6], h: 2.4, kind: 'entry' },      // 南入口（外墙）
  { axis: 'z', coord: 16, gap: [-1.4, 1.4] },                            // lobby → shoe
  { axis: 'z', coord: 12, gap: [-1.4, 1.4] },                            // shoe → wet
  { axis: 'x', coord: -6, gap: [4.6, 7.4] },                             // wet → lockW
  { axis: 'x', coord: 6, gap: [4.6, 7.4] },                              // wet → lockE
  { axis: 'z', coord: 4, gap: [-22, -19] },                              // lockW → shwW
  { axis: 'z', coord: 4, gap: [19, 22] },                                // lockE → shwE
  { axis: 'x', coord: -6, gap: [-1.2, 1.2] },                            // wet → shwW
  { axis: 'x', coord: 6, gap: [-1.2, 1.2] },                             // wet → shwE
  { axis: 'z', coord: -2, gap: [-4, -1] },                               // shwW → spaB
  { axis: 'z', coord: -2, gap: [1, 4] },                                 // shwE → poolA
  { axis: 'x', coord: -2, gap: [-2.4, 0.6] },                            // spaB → wet（湿区分配厅西南）
  { axis: 'x', coord: 6, gap: [-2.4, 0.6] },                             // poolA → wet
  { axis: 'x', coord: -24, gap: [-9, -6], h: L37_SAUNA_H },              // sauna → spaB
  { axis: 'x', coord: -24, gap: [-25, -22] },                            // spaA ↔ sauna 后门
  { axis: 'z', coord: -27, gap: [-16, -13] },                            // spaA → rest
  { axis: 'z', coord: -27, gap: [12, 15] },                              // poolA → rest
  { axis: 'x', coord: 22, gap: [-22, -19] }                              // equip 员工门（只通 poolB，游客不能穿设备间换池）
];
function roomById(id) { return L37_ROOMS.find(r => r.id === id); }
function roomAt(x, z) {
  for (const r of L37_ROOMS) if (x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2) return r;
  return null;
}
const L37_SPAWN = { x: 0, z: 24, yaw: 0 };

/* ---------------- 通用外壳生成器 ---------------- */
const PLAN_T = 0.24;                  // 内墙厚

function planMergeIv(list) {
  list.sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const iv of list) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], iv[1]);
    else out.push([iv[0], iv[1]]);
  }
  return out;
}
// 同一坐标上两侧房间的较低净高（没有房间的一侧按 0 处理，表示外墙外无房间）
function planHeightAt(rooms, axis, coord, mid) {
  let h = 0;
  for (const r of rooms) {
    const c1 = axis === 'z' ? r.z1 : r.x1, c2 = axis === 'z' ? r.z2 : r.x2;
    const a1 = axis === 'z' ? r.x1 : r.z1, a2 = axis === 'z' ? r.x2 : r.z2;
    if (Math.abs(c1 - coord) < 1e-6 || Math.abs(c2 - coord) < 1e-6) {
      if (mid > a1 - 1e-6 && mid < a2 + 1e-6) h = h ? Math.min(h, r.h) : r.h;
    }
  }
  return h || H;
}
function planCollect() {
  const map = new Map();
  const add = (axis, coord, a, b) => {
    const k = axis + '|' + coord.toFixed(3);
    if (!map.has(k)) map.set(k, { axis, coord, ivs: [] });
    map.get(k).ivs.push([a, b]);
  };
  for (const r of L37_ROOMS) {
    add('z', r.z1, r.x1, r.x2); add('z', r.z2, r.x1, r.x2);
    add('x', r.x1, r.z1, r.z2); add('x', r.x2, r.z1, r.z2);
  }
  return map;
}
/* 由平面数据生成：墙段 / 门楣 / 门套 / 天花 / 碰撞（墙与门楣同源，不存在"上方漏空"）
   o = { t, wallMat, ceilMat, casingMat, cov, wallKind, headerKind, wallCov } */
function planBuildShell(rooms, doors, o = {}) {
  const t = o.t == null ? PLAN_T : o.t;
  const cov = o.cov == null ? 2.0 : o.cov;
  const wallMat = o.wallMat, ceilMat = o.ceilMat, casingMat = o.casingMat || o.wallMat;
  const map = planCollect();
  const log = { walls: [], headers: [], doorways: [], rooms };
  const gapsFor = (axis, coord) => doors.filter(d => d.axis === axis && Math.abs(d.coord - coord) < 1e-6).map(d => d.gap);
  for (const [, entry] of map) {
    const { axis, coord } = entry;
    const merged = planMergeIv(entry.ivs);
    const solids = planSubtract(merged, gapsFor(axis, coord));
    for (const [a, b] of solids) {
      const mid = (a + b) / 2;
      const h = planHeightAt(axis, coord, mid);
      const cx = axis === 'z' ? mid : coord, cz = axis === 'z' ? coord : mid;
      const w = axis === 'z' ? b - a : t, d = axis === 'z' ? t : b - a;
      const m = addWorldUVBox(w, h, d, cx, h / 2, cz, wallMat, cov);
      COLLIDERS.push({ x1: cx - w / 2, x2: cx + w / 2, z1: cz - d / 2, z2: cz + d / 2, y1: 0, y2: h, kind: o.wallKind || 'planWall' });
      log.walls.push({ axis, coord, a, b, h, t, mesh: m });
    }
  }
  // 门洞：门楣 + 门套 + 上沿碰撞；门楣高度 = 门上方到该墙净高，墙体与顶棚之间不再漏空
  for (const dr of doors) {
    const { axis, coord, gap } = dr;
    const doorH = dr.h == null ? 2.35 : dr.h;
    const h = planHeightAt(axis, coord, (gap[0] + gap[1]) / 2);
    const gw = gap[1] - gap[0], mid = (gap[0] + gap[1]) / 2;
    const hh = Math.max(0.05, h - doorH);
    if (hh > 0.05) {
      const cx = axis === 'z' ? mid : coord, cz = axis === 'z' ? coord : mid;
      const w = axis === 'z' ? gw : t, d = axis === 'z' ? t : gw;
      const m = addWorldUVBox(w, hh, d, cx, doorH + hh / 2, cz, wallMat, cov);
      COLLIDERS.push({ x1: cx - w / 2, x2: cx + w / 2, z1: cz - d / 2, z2: cz + d / 2, y1: doorH, y2: h, kind: o.headerKind || 'planHeader' });
      log.headers.push({ axis, coord, gap: gap.slice(), y0: doorH, y1: h, mesh: m });
    }
    // 门套：洞口内衬 + 两面薄贴脸（端部压在立框上，不做成悬空大梁）
    const jw = 0.07, tw = t + 0.04;
    for (const s of [-1, 1]) {
      const u = s < 0 ? gap[0] - jw / 2 : gap[1] + jw / 2;
      const cx = axis === 'z' ? u : coord, cz = axis === 'z' ? coord : u;
      const w = axis === 'z' ? jw : tw, d = axis === 'z' ? tw : jw;
      addBox(w, doorH, d, cx, doorH / 2, cz, casingMat);
    }
    const hcx = axis === 'z' ? mid : coord, hcz = axis === 'z' ? coord : mid;
    const hw = axis === 'z' ? gw + jw * 2 : tw, hd = axis === 'z' ? tw : gw + jw * 2;
    addBox(hw, 0.09, hd, hcx, doorH + 0.045, hcz, casingMat);
    log.doorways.push({ axis, coord, gap: gap.slice(), doorH });
  }
  // 天花：按房间净高一块，矿物板 / 木格栅 / 旧矿棉板（后台）
  for (const r of rooms) {
    const w = r.x2 - r.x1, d = r.z2 - r.z1;
    const geo = new THREE.PlaneGeometry(w - 0.02, d - 0.02);
    scaleUV(geo, 1 / cov, 1 / cov);
    const plane = new THREE.Mesh(geo, ceilMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.set((r.x1 + r.x2) / 2, r.h - 0.02, (r.z1 + r.z2) / 2);
    plane.receiveShadow = true;
    scene.add(plane);
  }
  return log;
}

function planSubtract(ivs, gaps) {
  let out = ivs.map(v => v.slice());
  for (const g of gaps) {
    const next = [];
    for (const [a, b] of out) {
      if (g[1] <= a + 1e-6 || g[0] >= b - 1e-6) { next.push([a, b]); continue; }
      if (g[0] > a + 1e-6) next.push([a, g[0]]);
      if (g[1] < b - 1e-6) next.push([g[1], b]);
    }
    out = next;
  }
  return out.filter(v => v[1] - v[0] > 0.02);
}
