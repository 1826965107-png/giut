/* Level 12 v2 平面数据（唯一来源）：房间 / 门洞 / 水体 / 出生点 / 验收辅助。
   宿主 HTML 与 Node 检查脚本都从这里取数据，避免"地图数据"和"测试常量"各写一份。
   约定：axis:'z' = 墙沿 x 延伸、位于 z=coord；gap 是该墙上的门洞区间（净宽）。
   L37 分区按 Codex 已核对参考：北静休廊 z[-32,-28]；湿区主段 z[-28,2] 由
   左温泉厅 / 中央湿廊 / 右泳池厅三块并列；湿区分配厅 z[2,6] 再经 z=2 三门通往三块；
   淋浴 z[2,6]、更衣 z[6,16]、脱鞋 z[12,16]、接待 z[16,24]，中部 z[6,12] 为封闭布草值守间。 */

export const L37 = {
  bounds: { x1: -28, x2: 28, z1: -32, z2: 24 },
  spawn: { x: 0, z: 22.5, yaw: 0.62 },
  rooms: [
    { id: 'lobby', name: '接待 · 总导览', x1: -10, z1: 16, x2: 10, z2: 24, h: 'H', kind: 'dry' },
    { id: 'shoe', name: '脱鞋储物', x1: -6, z1: 12, x2: 6, z2: 16, h: 'H', kind: 'dry' },
    { id: 'svc', name: '布草值守间（封闭后勤）', x1: -6, z1: 6, x2: 6, z2: 12, h: 'H', kind: 'dry' },
    { id: 'lockW', name: '西更衣', x1: -28, z1: 6, x2: -6, z2: 16, h: 'H', kind: 'dry' },
    { id: 'lockE', name: '东更衣', x1: 6, z1: 6, x2: 28, z2: 16, h: 'H', kind: 'dry' },
    { id: 'shwW', name: '西淋浴', x1: -28, z1: 2, x2: -6, z2: 6, h: 'H', kind: 'wet' },
    { id: 'shwE', name: '东淋浴', x1: 6, z1: 2, x2: 28, z2: 6, h: 'H', kind: 'wet' },
    { id: 'wetHall', name: '湿区分配厅', x1: -6, z1: 2, x2: 6, z2: 6, h: 'H', kind: 'wet' },
    { id: 'spaA', name: '温泉厅（主汤 / 静汤）', x1: -28, z1: -28, x2: -2, z2: -12, h: 'H', kind: 'wet' },
    { id: 'spaB', name: '温泉厅（冷水池 / 休息）', x1: -22, z1: -12, x2: -2, z2: 2, h: 'H', kind: 'wet' },
    { id: 'sauna', name: '桑拿间', x1: -28, z1: -12, x2: -22, z2: -4, h: 'SAUNA', kind: 'wet' },
    { id: 'wetSpine', name: '中央湿廊', x1: -2, z1: -28, x2: 2, z2: 2, h: 'H', kind: 'wet' },
    { id: 'poolA', name: '游泳池厅', x1: 2, z1: -28, x2: 22, z2: 2, h: 'H', kind: 'wet' },
    { id: 'poolB', name: '游泳池厅（南段）', x1: 22, z1: -20, x2: 28, z2: 2, h: 'H', kind: 'wet' },
    { id: 'equip', name: '水处理设备间', x1: 22, z1: -28, x2: 28, z2: -20, h: 'EQUIP', kind: 'wet' },
    { id: 'restLink', name: '北静休廊', x1: -28, z1: -32, x2: 28, z2: -28, h: 'H', kind: 'dry' }
  ],
  doors: [
    { axis: 'z', coord: 24, gap: [-2, 2], h: 2.4, exterior: true },   // 接待外门（南墙中部）
    { axis: 'z', coord: 16, gap: [-2, 2] },                 // lobby ↔ shoe
    { axis: 'x', coord: -6, gap: [13.2, 14.8] },            // shoe ↔ lockW
    { axis: 'x', coord: 6, gap: [13.2, 14.8] },             // shoe ↔ lockE
    { axis: 'x', coord: -6, gap: [8.0, 9.6] },              // svc ↔ lockW（后勤，唯一入口）
    { axis: 'z', coord: 6, gap: [-14.0, -11.6] },           // lockW ↔ shwW
    { axis: 'z', coord: 6, gap: [11.6, 14.0] },             // lockE ↔ shwE
    { axis: 'x', coord: -6, gap: [3.0, 5.0] },              // shwW ↔ wetHall
    { axis: 'x', coord: 6, gap: [3.0, 5.0] },               // shwE ↔ wetHall
    { axis: 'z', coord: 2, gap: [-4.6, -2.6] },             // wetHall ↔ spaB
    { axis: 'z', coord: 2, gap: [-1.4, 1.4] },              // wetHall ↔ wetSpine
    { axis: 'z', coord: 2, gap: [2.6, 4.6] },               // wetHall ↔ poolA
    { axis: 'x', coord: -2, gap: [-24.0, -20.0] },          // spaA ↔ wetSpine（湿区内环路）
    { axis: 'x', coord: 2, gap: [-24.0, -20.0] },           // wetSpine ↔ poolA（湿区内环路）
    { axis: 'z', coord: -12, gap: [-16.0, -13.0] },         // spaB ↔ spaA
    { axis: 'x', coord: -22, gap: [-10.0, -6.0] },          // spaB ↔ sauna
    { axis: 'z', coord: -28, gap: [-18.0, -14.0] },         // spaA ↔ restLink
    { axis: 'z', coord: -28, gap: [-1.4, 1.4] },            // wetSpine ↔ restLink
    { axis: 'z', coord: -28, gap: [16.0, 20.0] },           // poolA ↔ restLink
    { axis: 'z', coord: -20, gap: [23.4, 25.4] },           // poolB ↔ equip（员工门）
    { axis: 'x', coord: 22, gap: [-10.0, -6.0] }            // poolA ↔ poolB（泳池厅南段连通）
  ]
};
// 禁止直连（干湿顺序 / 后勤不穿越）
L37.forbiddenPairs = [
  ['shoe', 'wetHall'], ['shoe', 'wetSpine'], ['svc', 'wetHall'], ['svc', 'wetSpine'],
  ['lobby', 'lockW'], ['lobby', 'lockE'], ['lobby', 'svc'],
  ['equip', 'restLink'], ['equip', 'poolA'], ['sauna', 'restLink']
];

export const L37_POOLS = [
  { name: 'pool', label: '游泳主池', x1: 8, x2: 18, zDeep1: -25.2, zEnd: -0.2, bottom: -2.0, water: -0.28, lanes: 5,
    stairs: { x1: 8, x2: 9.9, steps: [
      { z1: -1.6, z2: -0.2, top: -0.46 }, { z1: -3.0, z2: -1.6, top: -0.86 },
      { z1: -4.4, z2: -3.0, top: -1.26 }, { z1: -5.8, z2: -4.4, top: -1.66 }] } },
  { name: 'hot', label: '温热主汤池', x1: -25.2, x2: -15.2, zDeep1: -24, zEnd: -16, bottom: -1.0, water: -0.16, lanes: 0, benches: [{ x1: -24.7, z1: -24, x2: -15.7, z2: -23.1, top: -0.44 }],
    stairs: { x1: -25.2, x2: -23.3, steps: [{ z1: -17.6, z2: -16, top: -0.44 }, { z1: -19.0, z2: -17.6, top: -0.76 }] } },
  { name: 'quiet', label: '静汤池', x1: -12, x2: -6, zDeep1: -22, zEnd: -16, bottom: -0.62, water: -0.14, lanes: 0, benches: [{ x1: -11.5, z1: -22, x2: -6.5, z2: -21.1, top: -0.34 }],
    stairs: { x1: -12, x2: -10.4, steps: [{ z1: -17.4, z2: -16, top: -0.34 }] } },
  { name: 'cold', label: '冷水池', x1: -19.2, x2: -16.2, zDeep1: -9.8, zEnd: -6.8, bottom: -1.35, water: -0.16, lanes: 0,
    stairs: { x1: -19.2, x2: -18.1, steps: [{ z1: -8.2, z2: -6.8, top: -0.52 }, { z1: -9.4, z2: -8.2, top: -0.94 }] } }
];
export const L37_PICKUPS = [
  ['duck', 11.0, -6.0, 'pool'], ['ring', 15.4, -16.0, 'pool'],
  ['duck', -20.0, -18.5, 'hot'], ['ring', -23.0, -21.0, 'hot'],
  ['duck', -9.0, -18.0, 'quiet'], ['ring', -8.0, -20.5, 'quiet']
];
export const WATCHER_SPOTS = [[10, -6], [15, -12], [12, -19], [16, -23], [9, -15], [13, -3]];

export const L0 = {
  bounds: { x1: -150, x2: -108, z1: -10, z2: 10 },
  shell: { x1: -150, x2: -108, z1: -12, z2: 12 },          // 外包 42×24，南北各 2m 为实心后勤带
  spawn: { x: -147, z: 0, yaw: 0 },
  rooms: [
    { id: 'entry', name: '值班接待 / 停用访客厅', x1: -150, z1: -6, x2: -140, z2: 6, h: 'L0H', kind: 'carpet' },
    { id: 'corr', name: '员工走廊', x1: -140, z1: -1.2, x2: -108, z2: 1.2, h: 'L0H', kind: 'carpet' },
    { id: 'staff', name: '员工更衣与休息', x1: -140, z1: 1.2, x2: -131, z2: 10, h: 'L0H', kind: 'carpet' },
    { id: 'archive', name: '票务档案', x1: -131, z1: 1.2, x2: -119, z2: 10, h: 'L0H', kind: 'carpet' },
    { id: 'linen', name: '布草整理 / 洗衣后勤', x1: -119, z1: 1.2, x2: -108, z2: 10, h: 'L0H', kind: 'carpet' },
    { id: 'maint', name: '维修配电', x1: -131, z1: -10, x2: -119, z2: -1.2, h: 'L0H', kind: 'carpet' },
    { id: 'vest', name: '通往浴场的服务前室', x1: -119, z1: -10, x2: -108, z2: -1.2, h: 'L0H', kind: 'carpet' },
    { id: 'store', name: '布草库 / 后台储存', x1: -140, z1: -10, x2: -131, z2: -1.2, h: 'L0H', kind: 'carpet' }
  ],
  doors: [
    { axis: 'x', coord: -140, gap: [-0.9, 0.9] },            // entry ↔ corr
    { axis: 'z', coord: 1.2, gap: [-137.2, -135.4] },        // corr ↔ staff
    { axis: 'z', coord: 1.2, gap: [-126.5, -124.7] },        // corr ↔ archive
    { axis: 'z', coord: 1.2, gap: [-115.5, -113.7] },        // corr ↔ linen
    { axis: 'z', coord: -1.2, gap: [-126.5, -124.7] },       // corr ↔ maint
    { axis: 'z', coord: -1.2, gap: [-115.5, -113.7] },       // corr ↔ vest
    { axis: 'x', coord: -131, gap: [6.0, 7.8] },             // staff ↔ archive（短回环 1）
    { axis: 'x', coord: -119, gap: [-7.6, -5.8] },           // maint ↔ vest
  { axis: 'x', coord: -119, gap: [6.0, 7.8] },             // archive ↔ linen：追逐后绕行出口（新循环）
    { axis: 'x', coord: -140, gap: [-5.8, -4.2] },           // entry ↔ store
    { axis: 'x', coord: -131, gap: [-7.6, -5.8] },           // store ↔ maint（短回环 2）
    { axis: 'x', coord: -108, gap: [-6.5, -3.5], h: 2.4, exterior: true }   // vest → 浴场（出口）
  ]
};
L0.forbiddenPairs = [['entry', 'maint'], ['entry', 'vest'], ['corr', 'store'], ['staff', 'linen']];

/* ---------------- 通用几何辅助（纯数据，无 THREE 依赖） ---------------- */
export function roomById(list, id) { return list.find(r => r.id === id); }
export function roomAt(list, x, z) {
  for (const r of list) if (x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2) return r;
  return null;
}
export function roomsAtEdge(list, axis, coord, u) {
  const out = [];
  for (const r of list) {
    const c1 = axis === 'z' ? r.z1 : r.x1, c2 = axis === 'z' ? r.z2 : r.x2;
    const a1 = axis === 'z' ? r.x1 : r.z1, a2 = axis === 'z' ? r.x2 : r.z2;
    if (Math.abs(c1 - coord) < 1e-6 || Math.abs(c2 - coord) < 1e-6) {
      if (u > a1 - 1e-6 && u < a2 + 1e-6) out.push(r);
    }
  }
  return out;
}
export function doorCheck(rooms, bounds, door) {
  const mid = (door.gap[0] + door.gap[1]) / 2;
  const adj = roomsAtEdge(rooms, door.axis, door.coord, mid);
  const onBoundary = door.axis === 'z'
    ? (Math.abs(door.coord - bounds.z1) < 1e-6 || Math.abs(door.coord - bounds.z2) < 1e-6)
    : (Math.abs(door.coord - bounds.x1) < 1e-6 || Math.abs(door.coord - bounds.x2) < 1e-6);
  if (door.exterior) {
    if (!onBoundary) return { ok: false, why: '外墙门不在外包边界上' };
    if (adj.length !== 1) return { ok: false, why: `外墙门邻接 ${adj.length} 个房间` };
    return { ok: true, adj };
  }
  if (adj.length !== 2) return { ok: false, why: `邻接 ${adj.length} 个房间（应为 2）` };
  for (const u of [door.gap[0] + 0.02, door.gap[1] - 0.02]) {
    if (roomsAtEdge(rooms, door.axis, door.coord, u).length !== 2) return { ok: false, why: '门洞超出公共边界' };
  }
  return { ok: true, adj };
}
export function doorGraph(rooms, doors) {
  const g = new Map(rooms.map(r => [r.id, new Set()]));
  for (const d of doors) {
    const mid = (d.gap[0] + d.gap[1]) / 2;
    const adj = roomsAtEdge(rooms, d.axis, d.coord, mid).filter(Boolean);
    if (adj.length === 2) { g.get(adj[0].id).add(adj[1].id); g.get(adj[1].id).add(adj[0].id); }
  }
  return g;
}
export function connected(g, from, to) {
  const seen = new Set([from]); const q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) return true;
    for (const m of g.get(n) || []) if (!seen.has(m)) { seen.add(m); q.push(m); }
  }
  return false;
}
// 房间不得互相重叠（重叠会让墙体与天花重复生成）
export function overlaps(rooms) {
  const bad = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const oz = Math.min(a.z2, b.z2) - Math.max(a.z1, b.z1);
      if (ox > 1e-6 && oz > 1e-6) bad.push([a.id, b.id, +ox.toFixed(2), +oz.toFixed(2)]);
    }
  }
  return bad;
}
export function areaOf(rooms) { return rooms.reduce((s, r) => s + (r.x2 - r.x1) * (r.z2 - r.z1), 0); }
// 引用了不存在的房间 id（避免"负对照空跑"：配对写错名字时检查会静默通过）
export function unknownIds(level) {
  const ids = new Set(level.rooms.map(r => r.id));
  const bad = [];
  for (const pair of level.forbiddenPairs || []) {
    for (const id of pair) if (!ids.has(id)) bad.push(id);
  }
  return [...new Set(bad)];
}
