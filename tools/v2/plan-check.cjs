// 灰盒平面校验：只读 levels/l12-plan.js，不依赖 three/宿主。
// 先验证"房间不重叠 / 门洞邻接 / 干湿顺序 / 池体净距 / 连通与回环"，再接入 HTML。
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN = path.join(ROOT, 'levels', 'l12-plan.js');

let pass = 0, fail = 0;
const lines = [];
function ok(cond, label, extra) {
  if (cond) { pass++; lines.push(`  OK   ${label}${extra ? '  [' + extra + ']' : ''}`); }
  else { fail++; lines.push(`  FAIL ${label}${extra ? '  [' + extra + ']' : ''}`); }
}
function section(name) { lines.push(''); lines.push('== ' + name + ' =='); }

(async () => {
  const P = await import(pathToFileURL(PLAN).href);
  const { L37, L37_POOLS, L37_PICKUPS, WATCHER_SPOTS, L0,
    roomAt, roomsAtEdge, doorCheck, doorGraph, connected, overlaps, areaOf } = P;

  for (const [tag, level] of [['L37', L37], ['L0', L0]]) {
    section(`${tag} 房间与门洞`);
    const ov = overlaps(level.rooms);
    ok(ov.length === 0, `${tag} 房间互不重叠`, ov.length ? JSON.stringify(ov.slice(0, 3)) : '0 重叠');
    for (const d of level.doors) {
      const res = doorCheck(level.rooms, level.bounds, d);
      ok(res.ok, `${tag} ${d.axis}=${d.coord} gap[${d.gap}]${d.exterior ? ' 外墙' : ''}`,
        res.ok ? res.adj.map(r => r.id).join(' + ') : res.why);
    }

    section(`${tag} 连通与回环`);
    const g = doorGraph(level.rooms, level.doors);
    const spawnRoom = roomAt(level.rooms, level.spawn.x, level.spawn.z);
    ok(!!spawnRoom, `${tag} 出生点在房间内`, spawnRoom ? spawnRoom.id : 'NONE');
    if (spawnRoom) for (const r of level.rooms) ok(connected(g, spawnRoom.id, r.id), `${tag} ${spawnRoom.id} → ${r.id} 可达`);
    let edges = 0; for (const [, s] of g) edges += s.size; edges /= 2;
    const cycles = edges - g.size + 1;
    ok(tag === 'L0' ? cycles >= 2 : cycles >= 2, `${tag} 环路数 ${cycles}`, `${edges} 边 / ${g.size} 房`);

    section(`${tag} 禁止直连`);
    const badIds = P.unknownIds(level);
    ok(badIds.length === 0, `${tag} forbiddenPairs 引用的房间 id 都存在`, badIds.join(',') || '0 个未知');
    for (const [a, b] of level.forbiddenPairs || []) ok(!(g.get(a) || new Set()).has(b), `${tag} ${a} 不直连 ${b}`);
  }

  section('L37 干湿顺序');
  {
    const g = doorGraph(L37.rooms, L37.doors);
    const spray = new Set(['shwW', 'shwE']);
    const q = [['lobby', []]]; const seen = new Set(['lobby']); let path = null;
    while (q.length) {
      const [n, p] = q.shift();
      if (n === 'wetHall') { path = p; break; }
      for (const m of g.get(n) || []) if (!seen.has(m)) { seen.add(m); q.push([m, p.concat(m)]); }
    }
    ok(!!path && path.some(n => spray.has(n)), 'lobby→wetHall 必经淋浴间', path ? path.join('→') : '无路径');
    ok(![...(g.get('shoe') || [])].some(n => n === 'wetHall' || n === 'wetSpine'), '鞋区不直通湿区', [...(g.get('shoe') || [])].join(','));
    ok(![...(g.get('svc') || [])].some(n => n === 'wetHall' || n === 'wetSpine'), '布草间不直通湿区', [...(g.get('svc') || [])].join(','));
    // 后勤设备间不作为游客去下一池的必经之路：去掉 equip 相关边后湿区仍连通
    const g2 = doorGraph(L37.rooms, L37.doors.filter(d => {
      const mid = (d.gap[0] + d.gap[1]) / 2;
      return !roomsAtEdge(L37.rooms, d.axis, d.coord, mid).some(r => r.id === 'equip');
    }));
    let stillWet = true;
    for (const r of ['spaA', 'spaB', 'poolA', 'poolB', 'wetHall', 'wetSpine']) if (!connected(g2, 'lobby', r)) stillWet = false;
    ok(stillWet, '设备间不是游客必经路（移除其门后湿区仍全通）');
  }

  section('L37 池体净距');
  for (const p of L37_POOLS) {
    const cz = (p.zDeep1 + p.zEnd) / 2, cx = (p.x1 + p.x2) / 2;
    const room = roomAt(L37.rooms, cx, cz);
    ok(!!room, `${p.name} 位于房间内`, room ? room.id : 'NONE');
    if (!room) continue;
    const dW = p.x1 - room.x1, dE = room.x2 - p.x2, dN = p.zDeep1 - room.z1, dS = room.z2 - p.zEnd;
    ok(Math.min(dW, dE, dN, dS) >= 2.2 - 1e-6, `${p.name} 四周绕池净距 ≥2.2m`, `W${dW.toFixed(1)} E${dE.toFixed(1)} N${dN.toFixed(1)} S${dS.toFixed(1)}`);
    ok(p.zEnd > p.zDeep1 && p.x2 > p.x1, `${p.name} 尺寸 ${(p.x2 - p.x1).toFixed(1)}×${(p.zEnd - p.zDeep1).toFixed(1)}m`);
    const steps = (p.stairs && p.stairs.steps) || [];
    const tops = steps.map(s => s.top).concat(p.bottom).sort((a, b) => b - a);
    let maxStep = 0;
    for (let i = 1; i < tops.length; i++) maxStep = Math.max(maxStep, Math.abs(tops[i - 1] - tops[i]));
    ok(maxStep > 0 && maxStep <= 0.62, `${p.name} 单级台阶 ≤0.62m`, `最大 ${maxStep.toFixed(2)}m`);
    ok((p.stairs.x1 >= p.x1 - 1e-6) && (p.stairs.x2 <= p.x2 + 1e-6), `${p.name} 台阶横向在池内`);
    for (const [i, s] of steps.entries()) ok(s.z1 >= p.zDeep1 - 1e-6 && s.z2 <= p.zEnd + 1e-6, `${p.name} 台阶 ${i} 纵向在池内`);
  }
  ok(L37_POOLS.filter(p => p.lanes > 0).length === 1, '仅主池设泳道');
  ok(L37_POOLS[0].lanes === 5, '主池 5 条泳道', String(L37_POOLS[0].lanes));

  section('L37 收集物与池中人');
  const byName = new Map(L37_POOLS.map(p => [p.name, p]));
  const counts = {};
  for (const [kind, x, z, body] of L37_PICKUPS) {
    const p = byName.get(body);
    ok(!!p, `拾取 ${kind}@${x},${z} 所属水体存在`, body);
    if (!p) continue;
    ok(x > p.x1 && x < p.x2 && z > p.zDeep1 && z < p.zEnd, `拾取 ${kind} 在 ${body} 水体内`, `${x},${z}`);
    counts[body] = (counts[body] || 0) + 1;
  }
  ok(L37_PICKUPS.length === 6, '共 6 件收集物');
  for (const n of ['pool', 'hot', 'quiet']) ok(counts[n] === 2, `${n} 分配 2 件`, String(counts[n] || 0));
  const mp = byName.get('pool');
  for (const [x, z] of WATCHER_SPOTS) ok(x > mp.x1 && x < mp.x2 && z > mp.zDeep1 && z < mp.zEnd, `池中人点位 ${x},${z} 在主池内`);

  section('L0 回环与出口');
  {
    const g = doorGraph(L0.rooms, L0.doors);
    const ex = L0.doors.find(d => d.exterior);
    ok(!!ex, '存在对外出口门');
    const exitRoom = ex && roomsAtEdge(L0.rooms, ex.axis, ex.coord, (ex.gap[0] + ex.gap[1]) / 2)[0];
    ok(exitRoom && exitRoom.id === 'vest', '出口位于服务前室', exitRoom ? exitRoom.id : 'NONE');
    ok(connected(g, 'entry', 'vest'), 'entry → vest 可达');
    ok(connected(g, 'staff', 'archive'), 'staff ↔ archive 回环 1 存在');
    ok(connected(g, 'store', 'maint'), 'store ↔ maint 回环 2 存在');
    const area = areaOf(L0.rooms);
    ok(area >= 700 && area <= 880, `L0 毛可走面积 ${area.toFixed(0)}m² 在 700–880`, String(Math.round(area)));
    const shellW = L0.shell.x2 - L0.shell.x1, shellD = L0.shell.z2 - L0.shell.z1;
    ok(shellW <= 44 && shellD <= 26, `L0 外包 ${shellW}×${shellD}m ≤ 44×26`);
    ok(!!roomAt(L0.rooms, L0.spawn.x, L0.spawn.z), 'L0 出生点在房间内');
  }

  section('L37 面积与尺度');
  {
    const area = areaOf(L37.rooms);
    ok(area > 2000, `L37 毛面积 ${area.toFixed(0)}m²`);
    for (const r of L37.rooms) {
      const w = r.x2 - r.x1, d = r.z2 - r.z1;
      ok(Math.max(w, d) >= 4 && Math.min(w, d) >= 3.6, `${r.id} 尺度 ${w.toFixed(1)}×${d.toFixed(1)}`, '');
    }
    ok(!!roomAt(L37.rooms, L37.spawn.x, L37.spawn.z), 'L37 出生点在房间内');
    const spaRooms = ['spaA', 'spaB'];
    ok(L37_POOLS.filter(p => p.name === 'hot' || p.name === 'quiet').every(p =>
      spaRooms.some(id => { const r = L37.rooms.find(x => x.id === id); return p.x1 >= r.x1 && p.x2 <= r.x2 && p.zDeep1 >= r.z1 && p.zEnd <= r.z2; })), '主汤/静汤在温泉厅内');
    const sauna = L37.rooms.find(r => r.id === 'sauna');
    const cold = L37_POOLS.find(p => p.name === 'cold');
    const c = L37.rooms.find(r => r.id === 'spaB');
    ok(cold.x1 >= c.x1 && cold.x2 <= c.x2 && cold.zDeep1 >= c.z1 && cold.zEnd <= c.z2, '冷水池在 spaB 内');
    ok(sauna.h === 'SAUNA', '桑拿间独立局部低顶', sauna.h);
  }

  section('负对照（旧几何必须被同一套判据判为不合法）');
  {
    const shellW = 86, shellD = 48;                       // 旧 L0 外包
    ok(!(shellW <= 44 && shellD <= 26), '旧 L0 外包 86×48 会被判超限', `${shellW}×${shellD}`);
    const roomA = L37.rooms.find(r => r.id === 'poolA');
    const oldMain = { x1: -9, x2: 3, zDeep1: -14, zEnd: 11 };   // 旧主池坐标
    const dW = oldMain.x1 - roomA.x1;
    ok(dW < 2.2 - 1e-6, '旧主池坐标放进新泳池厅会被判绕池净距不足', `W${dW.toFixed(1)}`);
    const oldTrain = { x1: 16, x2: 24, zDeep1: -4, zEnd: 4 };    // 旧训练池坐标
    const roomPool = L37.rooms.find(r => r.id === 'poolA');
    ok(!(oldTrain.x1 >= roomPool.x1 && oldTrain.x2 <= roomPool.x2 &&
         oldTrain.zDeep1 >= roomPool.z1 && oldTrain.zEnd <= roomPool.z2),
      '旧训练池坐标会越出新泳池厅（不能当合法水体）', `z${oldTrain.zDeep1}..${oldTrain.zEnd} vs ${roomPool.z1}..${roomPool.z2}`);
  }

  lines.push('');
  lines.push(`PLAN-CHECK  pass=${pass} fail=${fail}`);
  console.log(lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
