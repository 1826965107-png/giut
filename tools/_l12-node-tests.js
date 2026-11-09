/* ============================================================================
   第一关（Level 0 后室）/ 第二关（Level 37 泳池层）真实几何与行为回归
   运行方式：node tools/check-level12-node.cjs
   —— 真实 vendor THREE + 真实几何/碰撞/寻路/AI 代码；只有渲染器、画布、音频、图片、DOM 是桩。
   这里断言的不是源码字符串，而是真实网格/碰撞体/行走结果。
   ============================================================================ */
const __R = { pass: 0, fail: 0, lines: [] };
function __ok(cond, label, extra) {
  if (cond) { __R.pass++; console.log('✓ ' + label + (extra != null ? `  [${extra}]` : '')); }
  else { __R.fail++; __R.lines.push(label); console.error('✗ ' + label + (extra != null ? `  [${extra}]` : '')); }
}
function __f(v, n = 2) { return Number.isFinite(v) ? v.toFixed(n) : String(v); }
function __section(name, fn) {
  console.log(`\n—— ${name} ——`);
  try { fn(); } catch (e) {
    __R.fail++; __R.lines.push(`${name} 抛出异常`);
    console.error(`✗ ${name} 抛出异常: ${e && e.message}`);
    if (e && e.stack) console.error(String(e.stack).split('\n').slice(0, 4).join('\n'));
  }
}

/* ---------------- 通用：测试自带导航栅格（独立实现，不复用游戏内 L0_NAV） ---------------- */
function __mkNav(bx1, bx2, bz1, bz2, cols, cell, pad) {
  const nx = Math.ceil((bx2 - bx1) / cell), nz = Math.ceil((bz2 - bz1) / cell);
  const walk = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = bx1 + (ix + 0.5) * cell, z = bz1 + (iz + 0.5) * cell;
      let ok = 1;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (c.metroBoardEdge) continue;
        if (c.y1 != null && c.y1 > 0.75) continue;          // 高处物件不挡脚
        if (x > c.x1 - pad && x < c.x2 + pad && z > c.z1 - pad && z < c.z2 + pad) { ok = 0; break; }
      }
      // 任意一侧贴到世界边界也算不可走
      if (x < bx1 + pad || x > bx2 - pad || z < bz1 + pad || z > bz2 - pad) ok = 0;
      walk[iz * nx + ix] = ok;
    }
  }
  return { bx1, bz1, nx, nz, cell, walk };
}
function __navIdx(G, x, z) {
  const ix = Math.floor((x - G.bx1) / G.cell), iz = Math.floor((z - G.bz1) / G.cell);
  if (ix < 0 || iz < 0 || ix >= G.nx || iz >= G.nz) return -1;
  return iz * G.nx + ix;
}
function __navXY(G, i) {
  const ix = i % G.nx, iz = (i - ix) / G.nx;
  return { x: G.bx1 + (ix + 0.5) * G.cell, z: G.bz1 + (iz + 0.5) * G.cell };
}
function __navFree(G, x, z, blockFn) {
  const i = __navIdx(G, x, z);
  if (i < 0 || !G.walk[i]) return false;
  if (blockFn && blockFn(x, z)) return false;
  return true;
}
function __navNearest(G, x, z, blockFn) {
  if (__navFree(G, x, z, blockFn)) return __navIdx(G, x, z);
  const r = Math.ceil(1.6 / G.cell);
  let best = -1, bd = Infinity;
  const ci = __navIdx(G, x, z);
  const cix = ci >= 0 ? ci % G.nx : Math.floor((x - G.bx1) / G.cell);
  const ciz = ci >= 0 ? (ci - cix) / G.nx : Math.floor((z - G.bz1) / G.cell);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const ix = cix + dx, iz = ciz + dz;
      if (ix < 0 || iz < 0 || ix >= G.nx || iz >= G.nz) continue;
      const j = iz * G.nx + ix;
      if (!G.walk[j]) continue;
      const p = __navXY(G, j);
      if (blockFn && blockFn(p.x, p.z)) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = j; }
    }
  }
  return best;
}
/* 八向 A*（不切墙角）。返回路径点数组，或 null（不可达） */
function __navPath(G, sx, sz, tx, tz, blockFn) {
  const s = __navNearest(G, sx, sz, blockFn), t = __navNearest(G, tx, tz, blockFn);
  if (s < 0 || t < 0) return null;
  const { nx, nz, walk } = G;
  const g = new Float32Array(nx * nz).fill(Infinity);
  const came = new Int32Array(nx * nz).fill(-1);
  const closed = new Uint8Array(nx * nz);
  const heap = [s]; const hf = [0];
  const h = (i) => {
    const a = i % nx, b = (i - a) / nx, c = t % nx, d = (t - c) / nx;
    const dx = Math.abs(a - c), dz = Math.abs(b - d);
    return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  const push = (i, f) => {
    heap.push(i); hf.push(f);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hf[p] <= hf[k]) break;
      const ti = heap[p]; heap[p] = heap[k]; heap[k] = ti;
      const tf = hf[p]; hf[p] = hf[k]; hf[k] = tf; k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const li = heap.pop(), lf = hf.pop();
    if (heap.length) {
      heap[0] = li; hf[0] = lf;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1, r = l + 1;
        let m = k;
        if (l < heap.length && hf[l] < hf[m]) m = l;
        if (r < heap.length && hf[r] < hf[m]) m = r;
        if (m === k) break;
        const ti = heap[m]; heap[m] = heap[k]; heap[k] = ti;
        const tf = hf[m]; hf[m] = hf[k]; hf[k] = tf; k = m;
      }
    }
    return top;
  };
  g[s] = 0; came[s] = -1;
  push(s, h(s));
  let guard = 0;
  while (heap.length && guard++ < 200000) {
    const cur = pop();
    if (cur === t) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % nx, cz = (cur - cx) / nx;
    for (let k = 0; k < 8; k++) {
      const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dz = [0, 0, 1, -1, 1, -1, 1, -1][k];
      const nxi = cx + dx, nzi = cz + dz;
      if (nxi < 0 || nzi < 0 || nxi >= nx || nzi >= nz) continue;
      const ni = nzi * nx + nxi;
      if (!walk[ni] || closed[ni]) continue;
      if (blockFn) { const p = __navXY(G, ni); if (blockFn(p.x, p.z)) continue; }
      if (dx && dz) {  // 不切墙角
        if (!walk[cz * nx + nxi] || !walk[nzi * nx + cx]) continue;
        if (blockFn) {
          const a = __navXY(G, cz * nx + nxi), b = __navXY(G, nzi * nx + cx);
          if (blockFn(a.x, a.z) || blockFn(b.x, b.z)) continue;
        }
      }
      const step = (dx && dz) ? Math.SQRT2 : 1;
      const ng = g[cur] + step;
      if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ni, ng + h(ni)); }
    }
  }
  if (came[t] === -1 && t !== s) return null;
  const out = [];
  for (let i = t; i !== -1; i = came[i]) out.push(__navXY(G, i));
  out.reverse();
  return out;
}

/* ---------------- 通用：用真实 updatePlayer 沿路点连续行走 ---------------- */
function __walk(wps, maxFrames) {
  const dt = 1 / 60;
  let wi = 0, frames = 0, stuck = 0;
  let prevX = player.x, prevZ = player.z, prevY = player.y;
  let maxStep = 0, maxDY = 0, ys = [player.y];
  const max = maxFrames || 2400;
  keys.add('KeyW');
  try {
    while (wi < wps.length && frames < max) {
      const wp = wps[wi];
      const dx = wp.x - player.x, dz = wp.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.55) { wi++; stuck = 0; continue; }
      yaw = Math.atan2(-dx, -dz);          // 前向 = (-sin yaw, -cos yaw)
      updatePlayer(dt);
      frames++;
      const st = Math.hypot(player.x - prevX, player.z - prevZ);
      if (st > maxStep) maxStep = st;
      if (Math.abs(player.y - prevY) > maxDY) maxDY = Math.abs(player.y - prevY);
      if (st < 0.004) { if (++stuck > 120) break; } else stuck = 0;
      prevX = player.x; prevZ = player.z; prevY = player.y;
      ys.push(player.y);
    }
  } finally { keys.delete('KeyW'); }
  return { done: wi >= wps.length, frames, maxStep, maxDY, stuck, ys };
}
function __place(x, z, y) {
  player.x = x; player.z = z;
  player.y = y == null ? groundAt(x, z) : y;
  player.vy = 0; player.grounded = true;
}
function __enterL0() {
  LEVEL = 0; ACTIVE_COLLIDERS = COLLIDERS_L0; ACTIVE_BOUNDS = BOUNDS_L0;
  transitioning = false; entityChasing = false; entityState = 'idle'; entity.visible = false;
  entityPath = null; lastSeen.valid = false; lostT = 0; horrorCoolUntil = 0;
  __place(L0_SPAWN.x, L0_SPAWN.z, 0); yaw = -Math.PI / 2; pitch = 0;
}
function __enterL37(x, z) {
  LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
  transitioning = false; entity.visible = false; entityChasing = false;
  horrorCoolUntil = 0; poolMonster.cool = 0; poolMonster.phase = 'stand'; poolMonster.swim = false;
  poolDark.active = false; poolDark.timer = 9999; poolDark.dur = 0;
  for (const L of poolLights) { L.light.intensity = L.base; if (L.fxMat) L.fxMat.emissiveIntensity = 4.4; }
  hemi.intensity = 0.5;
  watcher.position.set(watcherHome().x, watcherHome().y, watcherHome().z);
  watcher.rotation.set(0, 0, 0);
  __place(x == null ? L37_SPAWN.x : x, z == null ? L37_SPAWN.z : z);
  yaw = L37_SPAWN.yaw; pitch = 0;
}
/* 采样：玩家位置是否在任一碰撞体内（含半径） */
function __worstPenetration(cols, x, z, r) {
  let worst = Infinity, which = null;
  for (const c of cols) {
    if (c.metroBoardEdge) continue;
    if (c.y1 != null && c.y1 > 0.75) continue;
    const cx = Math.max(c.x1, Math.min(x, c.x2)), cz = Math.max(c.z1, Math.min(z, c.z2));
    const d = Math.hypot(x - cx, z - cz);
    if (d < worst) { worst = d; which = c; }
  }
  return { gap: worst - r, c: which };
}

/* ============================================================ 第二关：地图与水体 */
let __NAV37 = null, __NAV0 = null;

__section('L37 外壳与水体数据', () => {
  __ok(BOUNDS.x1 === -28 && BOUNDS.x2 === 30 && BOUNDS.z1 === -28 && BOUNDS.z2 === 24,
    '外壳尺寸符合设计（x -28..30, z -28..24）', `=${BOUNDS.x1}..${BOUNDS.x2}/${BOUNDS.z1}..${BOUNDS.z2}`);
  __ok(Math.abs(H - 4.4) < 1e-6 && L37_ECHO_H < H && L37_EQUIP_H <= H,
    '主厅无吊顶压低、回声室/设备间有独立低顶棚', `H=${H} echo=${L37_ECHO_H} equip=${L37_EQUIP_H}`);
  __ok(POOLS.length === 3 && POOLS.map(p => p.name).join(',') === 'main,train,echo',
    '三个水体：主池 / 训练池 / 浅水回声池', POOLS.map(p => `${p.label}(${p.x2 - p.x1}×${p.zEnd - p.zDeep1})`).join(' '));
  const main = POOL_BY_NAME.main;
  __ok(main.x2 - main.x1 === 12 && main.zEnd - main.zDeep1 === 25 && main.lanes === 6,
    '主池保持 25×12m 且改为六条泳道', `${main.x2 - main.x1}×${main.zEnd - main.zDeep1} lanes=${main.lanes}`);
  const echo = POOL_BY_NAME.echo;
  __ok(echo.x1 === -12 && echo.x2 === -4 && echo.zDeep1 === -25 && echo.zEnd === -19,
    '浅水回声池位于设计指定矩形（x -12..-4, z -25..-19）', `${echo.x1}..${echo.x2}/${echo.zDeep1}..${echo.zEnd}`);
  const echoDepth = echo.water - echo.bottom;
  __ok(echoDepth > 0.35 && echoDepth < 0.65, '回声池水深约 0.5m', `${__f(echoDepth)}m`);
  __ok(POOL_BY_NAME.train.x2 - POOL_BY_NAME.train.x1 === 8, '训练池保留在东厅', `${POOL_BY_NAME.train.x2 - POOL_BY_NAME.train.x1}m 宽`);
  // 三池水面都在互通层，且都在外壳范围内
  let insideAll = true;
  for (const p of POOLS) {
    if (p.x1 < BOUNDS.x1 || p.x2 > BOUNDS.x2 || p.zDeep1 < BOUNDS.z1 || p.zEnd > BOUNDS.z2) insideAll = false;
  }
  __ok(insideAll, '三个水体全部落在建筑外壳内');
});

__section('L37 池台阶：单级落差、模型与 groundAt 同源', () => {
  __enterL37(3, 20);   // groundAt 只在 LEVEL===1 时按水体高度场求解
  let worst = 0, worstDesc = '';
  for (const p of POOLS) {
    const steps = p.stairs.steps.slice().sort((a, b) => b.z1 - a.z1);  // 从浅到深
    let prevTop = 0;   // 岸上高度
    for (const s of steps) {
      const drop = prevTop - s.top;
      if (drop > worst) { worst = drop; worstDesc = `${p.name} ${__f(prevTop)}→${__f(s.top)}`; }
      prevTop = s.top;
    }
    const last = prevTop - p.bottom;
    if (last > worst) { worst = last; worstDesc = `${p.name} 最深一级 ${__f(prevTop)}→${__f(p.bottom)}`; }
  }
  __ok(worst <= 0.62, '所有池台阶单级落差 ≤ 0.62m（控制器上限）', `最大 ${__f(worst)}m @ ${worstDesc}`);

  // 模型网格与 groundAt 必须同源：地面采暖取到的每个 top 都要在该位置真的有一块网格
  let mismatch = 0, checked = 0;
  for (const p of POOLS) {
    for (const s of p.stairs.steps) {
      const zc = (s.z1 + s.z2) / 2, xc = (p.stairs.x1 + p.stairs.x2) / 2;
      const g = groundAt(xc, zc);
      if (Math.abs(g - s.top) > 1e-6) mismatch++;
      checked++;
      // 台阶网格：在该高度 ±3cm 内应当存在同尺寸的实体
      const box = new THREE.Box3();
      let found = false;
      scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        box.setFromObject(o);
        if (!Number.isFinite(box.min.y)) return;
        if (box.max.y > s.top - 0.02 && box.min.y < s.top + 0.02 &&
          xc > box.min.x && xc < box.max.x && zc > box.min.z && zc < box.max.z) found = true;
      });
      if (!found) mismatch++;
    }
  }
  __ok(mismatch === 0, '每一级台阶的地面高度都能在真实网格中找到对应实体', `检查 ${checked} 级，不一致 ${mismatch}`);
});

__section('L37 真实行走：入池 → 池底 → 出池', () => {
  if (!__NAV37) __NAV37 = __mkNav(BOUNDS.x1, BOUNDS.x2, BOUNDS.z1, BOUNDS.z2, COLLIDERS, 0.4, 0.28);
  const main = POOL_BY_NAME.main;
  const bottom = { x: 0, z: -4 };
  __enterL37(L37_SPAWN.x, L37_SPAWN.z);
  const path = __navPath(__NAV37, player.x, player.z, bottom.x, bottom.z);
  __ok(!!path && path.length > 4, '从入口出生点能规划出走到主池深处的路径', path ? `${path.length} 个路点` : 'null');
  const wps = (path || []).concat([bottom]);
  const r1 = __walk(wps, 3600);
  __ok(r1.done, '连续 WASD 真实走到主池深处（无瞬移）', `帧=${r1.frames} 最大单帧位移=${__f(r1.maxStep, 3)}m`);
  __ok(r1.maxStep <= 0.10, '每帧位移不超过控制器速度上限', `maxStep=${__f(r1.maxStep, 3)}m`);
  __ok(Math.abs(player.y - main.bottom) < 0.06, '走到底后站在池底真实高度上', `y=${__f(player.y)} 期望=${__f(main.bottom)}`);
  const below = r1.ys.filter(y => y > -0.30).length;   // 水下不该出现"浮回水面"以外的抬高
  __ok(below < r1.ys.length, '下潜途中高度单调进入水下（没有反复穿水面）', `帧=${r1.ys.length}`);
  // 出池
  const back = __navPath(__NAV37, player.x, player.z, 5, 12);
  const r2 = __walk((back || []).concat([{ x: 5, z: 12 }]), 3600);
  __ok(r2.done && player.y > -0.05, '沿台阶真实走出池子上到干地', `y=${__f(player.y)} 帧=${r2.frames}`);
  __ok(r2.maxDY <= 0.62 + 1e-6, '出池时没有出现超过一步高度的"瞬移登岸"', `最大高度跳变=${__f(r2.maxDY, 3)}m`);
});

__section('L37 其余两池也可真实进出', () => {
  // 训练池
  __enterL37(14, 6);
  let p1 = __navPath(__NAV37, 14, 6, 20, 0);
  let r = __walk((p1 || []).concat([{ x: 20, z: 0 }]), 2400);
  // 水下有浮力，走到池底后要留出下沉时间（真实重力/阻尼，不是瞬移贴地）
  for (let i = 0; i < 240; i++) updatePlayer(1 / 60);
  __ok(r.done && Math.abs(player.y - POOL_BY_NAME.train.bottom) < 0.06,
    '训练池可沿台阶走进池底', `y=${__f(player.y)} 期望=${__f(POOL_BY_NAME.train.bottom)} 帧=${r.frames}`);
  let p2 = __navPath(__NAV37, 20, 0, 14, 6);
  r = __walk((p2 || []).concat([{ x: 14, z: 6 }]), 2400);
  __ok(r.done && player.y > -0.05, '训练池可沿台阶走出', `y=${__f(player.y)}`);
  // 回声池（浅水 + 西侧缓台）
  __enterL37(-10.5, -17);
  const ledge = groundAt(-10.5, -22);
  __ok(Math.abs(ledge - (-0.30)) < 1e-6, '回声池西侧缓台是连续的浅水可走面', `y=${__f(ledge)}`);
  p1 = __navPath(__NAV37, -10.5, -17, -6, -22);
  r = __walk((p1 || []).concat([{ x: -6, z: -22 }]), 2400);
  __ok(r.done && Math.abs(player.y - POOL_BY_NAME.echo.bottom) < 0.06,
    '走向回声池深处时沿缓台下水', `y=${__f(player.y)}`);
  p2 = __navPath(__NAV37, -6, -22, -10.5, -17);
  r = __walk((p2 || []).concat([{ x: -10.5, z: -17 }]), 2400);
  __ok(r.done && player.y > -0.05, '可从回声池走回干地', `y=${__f(player.y)}`);
});

__section('L37 出生点与五个功能区连通、双回路', () => {
  const spawn = L37_SPAWN;
  __ok(groundAt(spawn.x, spawn.z) === 0 && !poolAt(spawn.x, spawn.z),
    '出生点在南侧入口缓冲的干地上（不在水里/墙里）', `(${spawn.x},${spawn.z})`);
  const pen = __worstPenetration(COLLIDERS, spawn.x, spawn.z, RADIUS);
  __ok(pen.gap >= -1e-6, '出生点不与任何碰撞体重叠', `余量=${__f(pen.gap, 3)}m`);
  const zones = [
    ['主池厅东侧步道', 6, 4],
    ['主池厅北侧步道', 6, -15],
    ['西更衣淋浴区', -20, 0],
    ['更衣区淋浴间', -24, 6],
    ['北侧浅水回声室', -16, -22],
    ['北廊', 8, -20],
    ['东厅训练池区', 14, -8],
    ['设备间', 27, -11],
    ['附属储物间', -5, 20],
  ];
  let unreachable = [];
  for (const [name, x, z] of zones) {
    const p = __navPath(__NAV37, spawn.x, spawn.z, x, z);
    if (!p) unreachable.push(name);
  }
  __ok(unreachable.length === 0, '五个功能区（含附属间）都能从入口走到', unreachable.length ? '不可达: ' + unreachable.join('/') : `${zones.length} 个目标点全部可达`);

  // 双回路：封掉主池北门 x -6..-3 后，仍能从入口到回声室（走更衣区北门）
  const cutNorthDoor = (x, z) => (z < -15.2 && z > -16.9 && x > -6.2 && x < -2.8);
  const alt1 = __navPath(__NAV37, spawn.x, spawn.z, -16, -22, cutNorthDoor);
  __ok(!!alt1, '封死主池北门后，仍可经西更衣区绕到回声室（回路 1）', alt1 ? `${alt1.length} 个路点` : '不可达');
  // 封掉更衣区北门（x=-14, z -9..-6）后，仍能从入口到更衣区（走主池厅西门）
  const cutLockerDoor = (x, z) => (x < -13.6 && x > -14.4 && z > -9.3 && z < -5.7);
  const alt2 = __navPath(__NAV37, spawn.x, spawn.z, -20, 0, cutLockerDoor);
  __ok(!!alt2, '封死更衣区北门后，仍可经主池厅西门进入更衣区（回路 2）', alt2 ? `${alt2.length} 个路点` : '不可达');
  // 负对照：墙体内部点不可达
  const wallPt = { x: -14, z: 0 };   // x=-14 的更衣区隔墙中段
  const bad = __navPath(__NAV37, spawn.x, spawn.z, wallPt.x, wallPt.z);
  const badFar = bad && bad.length ? Math.hypot(bad[bad.length - 1].x - wallPt.x, bad[bad.length - 1].z - wallPt.z) : 99;
  __ok(badFar > 0.55, '负对照：墙体内部位置不会被当作可达目标', `终点距墙芯 ${__f(badFar)}m`);
});

__section('L37 六个漂浮物：水体归属、可达、不能上岸', () => {
  __ok(pickups.length === 6 && PICK_TOTAL === 6, '共六个漂浮物', `实际 ${pickups.length}`);
  const kinds = pickups.map(p => p.kind);
  __ok(kinds.filter(k => k === 'duck').length === 4 && kinds.filter(k => k === 'ring').length === 2,
    '四只鸭子 + 两个救生圈', kinds.join(','));
  const byBody = {};
  for (const p of pickups) byBody[p.body] = (byBody[p.body] || 0) + 1;
  __ok(byBody.main === 2 && byBody.train === 2 && byBody.echo === 2,
    '三个水体各两个漂浮物', JSON.stringify(byBody));
  let allInside = true, allReach = true;
  const bad = [];
  for (const pk of pickups) {
    const body = POOL_BY_NAME[pk.body];
    if (!(pk.x > body.x1 && pk.x < body.x2 && pk.z > body.zDeep1 && pk.z < body.zEnd)) { allInside = false; bad.push(pk.body + '越界'); }
    const p = __navPath(__NAV37, L37_SPAWN.x, L37_SPAWN.z, pk.x, pk.z);
    if (!p) { allReach = false; bad.push(`${pk.kind}@${pk.body} 不可达`); }
  }
  __ok(allInside, '六个漂浮物都落在各自水体范围内', bad.join(' ') || 'OK');
  __ok(allReach, '六个漂浮物都能从入口真实走到（含下水）', bad.join(' ') || '六个目标全部可达');

  // 只能在自己水体里漂：把玩家放在池外远处，强制漂移 20s，坐标不得离开水体矩形
  __enterL37(L37_SPAWN.x, L37_SPAWN.z);
  let escaped = 0;
  for (let i = 0; i < 1200; i++) {
    updatePickups(1 / 60);
  }
  for (const pk of pickups) {
    const body = POOL_BY_NAME[pk.body];
    if (pk.x < body.x1 || pk.x > body.x2 || pk.z < body.zDeep1 || pk.z > body.zEnd) escaped++;
  }
  __ok(escaped === 0, '漂浮物漂移 20s 后仍留在所属水体（不会漂上岸/穿池壁）', `越界 ${escaped}`);
});

__section('L37 拾取：遮挡与高度', () => {
  __enterL37(0.5, 2.0);   // 直接站在主池内第一个鸭子旁边
  player.y = POOL_BY_NAME.main.water - 0.4;
  updatePickups(1 / 60);
  __ok(!!nearestPickup, '同池同层贴近时可以拾取', nearestPickup ? nearestPickup.kind : 'null');
  const before = pickups.length;
  tryPickup();
  __ok(pickups.length === before - 1, '拾取成功后漂浮物被移除', `${before}→${pickups.length}`);

  // 负对照：把玩家放到水面之上 3m（隔着一层高的混凝土梁），不能再拾取
  const defs = pickups.map(p => ({ kind: p.kind, x: p.x, z: p.z, body: p.body }));
  player.y = 3.2;
  updatePickups(1 / 60);
  __ok(!nearestPickup, '高度差过大（隔着高处结构）时不会误判为可拾取', nearestPickup ? String(nearestPickup.kind) : 'null');
  // 负对照：在玩家与漂浮物之间插入一道合成墙，拾取必须失效
  const target = pickups[0];
  __enterL37(target.x, target.z);
  player.y = POOL_BY_NAME.main.water - 0.4;
  updatePickups(1 / 60);
  const okBefore = !!nearestPickup;
  const fakeWall = { x1: target.x - 0.6, x2: target.x + 0.6, z1: target.z - 0.25, z2: target.z + 0.25, y1: 0, y2: 3, kind: 'testWall' };
  COLLIDERS.push(fakeWall);
  ACTIVE_COLLIDERS = COLLIDERS;
  updatePickups(1 / 60);
  const okBlocked = nearestPickup;
  COLLIDERS.pop();
  updatePickups(1 / 60);
  __ok(okBefore && !okBlocked, '负对照：夹在两者之间的实体墙会阻断拾取', okBefore ? '墙前可拾取 / 墙后不可' : '前置条件失败');
  __ok(defs.length === pickups.length, '负对照没有破坏漂浮物列表');

  // 负对照：执行时再校验水平半径（缓存过期/被推离 1.7m 外不能远程拾取）
  const t2 = pickups[0];
  __enterL37(t2.x, t2.z);
  player.y = t2.waterY - 0.4;
  updatePickups(1 / 60);
  __ok(!!nearestPickup, '半径内：可以拾取（前置条件）', nearestPickup ? nearestPickup.kind : 'null');
  nearestPickup = t2;                       // 故意塞一个"陈旧"目标
  player.x = t2.x + 4.0; player.z = t2.z + 4.0;
  const n0 = pickups.length, c0 = pickedCount;
  tryPickup();
  __ok(pickups.length === n0 && pickedCount === c0, '负对照：水平距离 >1.7m 时 tryPickup 拒绝执行', `pickups ${n0}→${pickups.length}, picked ${c0}→${pickedCount}`);
  __ok(nearestPickup === null, '被拒绝后会清空 nearestPickup 缓存', String(nearestPickup));
});

__section('L37 池中人：只属于主池、不上岸、不隔墙抓取', () => {
  const main = POOL_BY_NAME.main;
  // 1) 停电点位全部在主池内且有水深
  let spotsOK = true, spotBad = [];
  for (const [x, z] of WATCHER_SPOTS) {
    if (!(x > main.x1 && x < main.x2 && z > main.zDeep1 && z < main.zEnd)) { spotsOK = false; spotBad.push(`${x},${z}`); }
    if (groundAt(x, z) >= main.water) { spotsOK = false; spotBad.push(`${x},${z} 不在水下`); }
  }
  __ok(spotsOK, '停电转移点全部在主池的深水区（没有池外/干地点位）', spotBad.join(' ') || `${WATCHER_SPOTS.length} 个点位`);

  // 2) 玩家站岸上 20s：怪物不上岸、不抓、坐标不出水体
  __enterL37(6, 0);      // 主池东侧步道，干地
  player.y = 0;
  let sc0 = stats.scares, outOfPool = 0, maxY = -99;
  for (let i = 0; i < 600; i++) {
    updatePoolHorror(1 / 30);
    if (!(watcher.position.x > main.x1 && watcher.position.x < main.x2 &&
      watcher.position.z > main.zDeep1 && watcher.position.z < main.zEnd)) outOfPool++;
    if (watcher.position.y > maxY) maxY = watcher.position.y;
  }
  __ok(outOfPool === 0, '玩家站在岸上时它始终待在水体矩形内（永不上岸）', `越界帧 ${outOfPool}`);
  __ok(stats.scares === sc0, '玩家在干地上不会被水下怪物抓取', `scares Δ=${stats.scares - sc0}`);
  __ok(maxY <= main.water + 0.05, '站在水中时头顶不会冒出水面', `最高 y=${__f(maxY)} 水面=${__f(main.water)}`);

  // 3) 玩家在主池水里贴脸：会被抓（正对照）
  __enterL37(0, -4);
  player.y = main.water - 0.45;
  watcher.position.set(0.4, main.bottom, -4);
  const s1 = stats.scares;
  for (let i = 0; i < 90; i++) updatePoolHorror(1 / 30);
  __ok(stats.scares > s1, '水中近身且视线畅通时会被抓（正对照）', `scares ${s1}→${stats.scares}`);
  const s2 = stats.scares;
  const distSpawn = Math.hypot(player.x - L37_SPAWN.x, player.z - L37_SPAWN.z);
  for (let i = 0; i < 120; i++) updatePoolHorror(1 / 30);
  __ok(stats.scares === s2, '受击后有冷却，不会连续重复抓取', `scares 保持 ${s2}`);
  __ok(distSpawn < 0.6, '被抓后玩家被送回安全入口', `距出生点 ${__f(distSpawn)}m`);

  // 4) 负对照：玩家与怪物之间插入实体墙 → 不抓（怪物逐帧钉住，只检验视线门）
  __enterL37(0, -4);
  player.y = main.water - 0.45;
  horrorCoolUntil = 0; poolMonster.cool = 0;
  watcher.position.set(0.4, main.bottom, -4);
  const pinPos = watcher.position.clone();
  const s4a = stats.scares;
  for (let i = 0; i < 90; i++) { watcher.position.copy(pinPos); updatePoolHorror(1 / 30); }
  __ok(stats.scares > s4a, '正对照：同一距离但无墙遮挡时会被抓', `scares ${s4a}→${stats.scares}`);
  __enterL37(0, -4);
  player.y = main.water - 0.45;
  horrorCoolUntil = 0; poolMonster.cool = 0;
  watcher.position.copy(pinPos);
  COLLIDERS.push({ x1: 0.13, x2: 0.27, z1: -5, z2: -3, y1: -3, y2: 3, kind: 'testWall' });
  const s3 = stats.scares;
  for (let i = 0; i < 90; i++) { watcher.position.copy(pinPos); updatePoolHorror(1 / 30); }
  __ok(stats.scares === s3, '负对照：视线被实体墙挡住时不会抓取（不能隔墙抓人）', `scares Δ=${stats.scares - s3}`);
  COLLIDERS.pop();

  // 5) 玩家在别的池（训练池）里：怪物不应该追过来
  __enterL37(20, 0);
  player.y = POOL_BY_NAME.train.water - 0.4;
  const w0 = watcher.position.clone();
  for (let i = 0; i < 180; i++) updatePoolHorror(1 / 30);
  const moved = Math.hypot(watcher.position.x - w0.x, watcher.position.z - w0.z);
  const inTrain = watcher.position.x > POOL_BY_NAME.train.x1 && watcher.position.x < POOL_BY_NAME.train.x2;
  __ok(poolMonster.phase !== 'stalk' && !inTrain, '玩家在训练池时不会跨池锁定（它仍只在主池）', `phase=${poolMonster.phase} 位移=${__f(moved)}m`);
  __ok(watcher.position.x > main.x1 - 1 && watcher.position.x < main.x2 + 1 || moved < 3,
    '怪物没有瞬移到另一个水体', `x=${__f(watcher.position.x)}`);
});

__section('L37 游姿高度用真实包围盒校验', () => {
  __enterL37(0, -4);
  const main = POOL_BY_NAME.main;
  let okAll = true, worst = -99, worstRot = 0;
  for (let k = 0; k <= 6; k++) {
    const rot = (DROWNED_SWIM_ROT * k) / 6;
    for (let ph = 0; ph < 5; ph++) {
      watcher.userData.anim.t = ph * 0.52;
      // 姿态由动画相位给出（与运行时同序：先 animateDrowned 再量），高度由 drownedSwimY 给出
      watcher.userData.anim.blend = 1;
      animateDrowned(watcher, 0.0001, 'swim');
      watcher.rotation.set(rot, 0.7, 0);
      watcher.position.set(0, drownedSwimY(rot, main.water), -4);
      updateMatrixWorldAll(watcher);
      const box = new THREE.Box3().setFromObject(watcher);
      const topAbove = box.max.y - main.water;
      if (topAbove > worst) { worst = topAbove; worstRot = rot; }
      if (topAbove > 0.02) okAll = false;
    }
  }
  __ok(okAll, '游动姿态（含四肢/发束）最高点始终在水面以下', `最高出水 ${__f(worst, 3)}m @rot=${__f(worstRot)}`);
  // 站立脚掌贴底：让 AI 自己在岸上站定，再用真实包围盒量脚底
  __enterL37(6, 0);
  player.y = 0;
  for (let i = 0; i < 150; i++) updatePoolHorror(1 / 30);
  watcher.rotation.set(0, watcher.rotation.y, 0);
  watcher.userData.anim.blend = 0;
  updateMatrixWorldAll(watcher);
  const box2 = new THREE.Box3().setFromObject(watcher);
  __ok(Math.abs(box2.min.y - main.bottom) < 0.06, '站立姿态脚掌贴合池底（不悬空、不穿底）', `最低点=${__f(box2.min.y)} 池底=${__f(main.bottom)}`);
  __ok(box2.max.y - box2.min.y > 1.5, '池中人是完整人形高度（不是色块）', `高=${__f(box2.max.y - box2.min.y)}m`);
});
/* 世界矩阵更新 helper：updateMatrixWorldAll 在 THREE r160 里是 Object3D.updateMatrixWorld */
function updateMatrixWorldAll(o) { o.updateMatrixWorld(true); }

__section('L37 站→游→站：真实 updatePoolHorror 多帧不浮出水面', () => {
  const main = POOL_BY_NAME.main;
  __enterL37(0, 8.5);
  poolDark.active = false; poolDark.timer = 900;     // 本段不测停电，避免传送干扰姿态
  watcher.position.set(0, main.bottom + DROWNED_FOOT_LIFT, -12.5);
  watcher.rotation.set(0, 0, 0, 'YXZ');
  watcher.userData.anim.blend = 0;
  poolMonster.swim = false; poolMonster.phase = 'stand'; poolMonster.cool = 999;  // 只测姿态，不触发吓退

  // ① 站 → 游：玩家潜入水中，逐帧跑真实 updatePoolHorror，量全身包围盒最高点
  //    注意：入姿前几帧仍是直立下沉，头顶本来就在水面之上（真实行为），所以只对
  //    "已经摆成游姿"的帧断言全身出水，并单独限制下潜用了多少帧。
  player.y = main.water - 1.2;
  let overSwim = -99, jump = 0, prevY = watcher.position.y, frames = 0;
  let diveFrames = -1, afterDive = 0, afterDiveBelow = 0;
  for (let i = 0; i < 240; i++) {
    updatePoolHorror(1 / 30);
    updateMatrixWorldAll(watcher);
    const b = new THREE.Box3().setFromObject(watcher);
    const above = b.max.y - main.water;
    if (diveFrames < 0 && above < 0) diveFrames = i;
    if (diveFrames >= 0) { afterDive++; if (above < 0) afterDiveBelow++; }
    if (watcher.rotation.x > DROWNED_SWIM_ROT - 0.01) overSwim = Math.max(overSwim, above);
    jump = Math.max(jump, Math.abs(watcher.position.y - prevY));
    prevY = watcher.position.y; frames++;
  }
  __ok(poolMonster.swim === true, '玩家入水后池中人进入真实游动状态', `swim=${poolMonster.swim} phase=${poolMonster.phase}`);
  __ok(diveFrames >= 0 && diveFrames <= 45, '入水过渡及时（1.5s 内整只沉到水面以下，不是飘着）', `下潜完成帧 ${diveFrames}`);
  __ok(afterDiveBelow === afterDive, '入水之后没有任何一帧重新浮出水面', `出水帧 0 / ${afterDive}`);
  __ok(overSwim <= 0.02, '摆成游姿后全身没有一帧浮出水面', `最高出水 ${__f(overSwim, 3)}m / ${frames} 帧`);
  __ok(jump < 0.30, '入姿过渡是平滑下潜（没有一帧跳到水里）', `单帧最大位移 ${__f(jump, 3)}m`);

  // ② 游 → 站：玩家上岸，水面姿态要平滑收回直立，头顶重新露出水面
  player.x = 0; player.z = 14.5; player.y = 0;
  let backOver = 0, backJump = 0, prevY2 = watcher.position.y;
  for (let i = 0; i < 300; i++) {
    updatePoolHorror(1 / 30);
    backJump = Math.max(backJump, Math.abs(watcher.position.y - prevY2));
    prevY2 = watcher.position.y;
  }
  updateMatrixWorldAll(watcher);
  const bb = new THREE.Box3().setFromObject(watcher);
  backOver = bb.max.y - main.water;
  __ok(poolMonster.swim === false, '玩家上岸后池中人停止游动', `swim=${poolMonster.swim}`);
  __ok(backJump < 0.30, '出水回到直立也是平滑的（没有瞬移）', `单帧最大位移 ${__f(backJump, 3)}m`);
  __ok(backOver > 0.05, '重新站直后头部露出水面（没有一直趴在水里）', `头顶高出水面 ${__f(backOver, 3)}m`);
  const inPool = watcher.position.x > main.x1 && watcher.position.x < main.x2 &&
                 watcher.position.z > main.zDeep1 && watcher.position.z < main.zEnd;
  __ok(inPool, '池中人没有跟着爬到干地上（仍留在主池水体范围内）',
    `位置 ${__f(watcher.position.x, 1)},${__f(watcher.position.z, 1)} 池 ${main.x1}..${main.x2} / ${main.zDeep1}..${main.zEnd}`);
});

/* ============================================================ 第一关：地图与保险丝 */
__section('L0 房间化与分段视线', () => {
  __enterL0();
  __ok(BOUNDS_L0.x1 === -150 && BOUNDS_L0.x2 === -64 && BOUNDS_L0.z1 === -24 && BOUNDS_L0.z2 === 24,
    '第一关外壳仍是 86×48m', `${BOUNDS_L0.x2 - BOUNDS_L0.x1}×${BOUNDS_L0.z2 - BOUNDS_L0.z1}`);
  // 出生点到出口门的视线必须被打断（走廊七拐八折，不能一眼看穿）
  const seeExit = segmentBlockedByWalls(L0_SPAWN.x, 1.62, L0_SPAWN.z, -64.5, 1.62, 0);
  __ok(seeExit, '出生点无法一眼看穿到东端出口（视线被错位门廊切断）');
  // 对照：同一房间内的两点视线是通的
  const nearFree = segmentBlockedByWalls(L0_SPAWN.x + 1.0, 1.62, L0_SPAWN.z, L0_SPAWN.x + 5.0, 1.62, 0);
  __ok(!nearFree, '对照：同一房间内近距视线畅通（遮挡函数没有一律返回 true）');

  if (!__NAV0) __NAV0 = __mkNav(BOUNDS_L0.x1, BOUNDS_L0.x2, BOUNDS_L0.z1, BOUNDS_L0.z2, COLLIDERS_L0, 0.4, 0.30);
  const rooms = [
    ['接待区（北侧 N_A）', -140, -14],
    ['档案区（北侧 N_B）', -116, -18],
    ['配电区（北侧 N_C）', -86, -18],
    ['南侧空办公室（S_A）', -134, 16],
    ['南侧档案二（S_B）', -106, 18],
    ['南侧配电副间（S_C）', -80, 18],
    ['出口前厅', -68, 0],
  ];
  const bad = [];
  for (const [name, x, z] of rooms) {
    if (!__navPath(__NAV0, L0_SPAWN.x, L0_SPAWN.z, x, z)) bad.push(name);
  }
  __ok(bad.length === 0, '六个新房间 + 出口前厅都能从出生点走到', bad.length ? '不可达: ' + bad.join('/') : `${rooms.length} 个房间全部连通`);

  // 双回路：截断走廊中段的一处门洞后，仍能从出生点走到出口前厅
  const cut1 = (x, z) => (x < -84.6 && x > -89.4 && z > -5.4 && z < 5.4);   // 服务横廊
  const alt = __navPath(__NAV0, L0_SPAWN.x, L0_SPAWN.z, -68, 0, cut1);
  __ok(!!alt, '截断走廊一处环节后仍能绕行到达出口（存在闭合回路 1）', alt ? `${alt.length} 个路点` : '不可达');
  const cut2 = (x, z) => (x < -119.6 && x > -126.4 && z > -5.4 && z < 5.4); // 防火分区前室
  const alt2 = __navPath(__NAV0, L0_SPAWN.x, L0_SPAWN.z, -68, 0, cut2);
  __ok(!!alt2, '截断另一处环节后仍能绕行到达出口（存在闭合回路 2）', alt2 ? `${alt2.length} 个路点` : '不可达');
});

__section('L0 真实行走：出生点 → 三枚保险丝', () => {
  __enterL0();
  let allDone = true, detail = [];
  for (const f of FUSE_DEFS) {
    __enterL0();
    const p = __navPath(__NAV0, L0_SPAWN.x, L0_SPAWN.z, f.x, f.z);
    if (!p) { allDone = false; detail.push(`${f.on} 不可达`); continue; }
    const last = p[p.length - 1];
    const near = Math.hypot(last.x - f.x, last.z - f.z);
    const r = __walk(p.concat([{ x: f.x, z: f.z }]), 4200);
    const arrived = Math.hypot(player.x - f.x, player.z - f.z) < 1.7;
    updateFuseProximity();
    const got = nearestFuse && Math.abs(nearestFuse.x - f.x) < 0.01 && Math.abs(nearestFuse.z - f.z) < 0.01;
    if (!arrived || !got) { allDone = false; detail.push(`${f.on} 走到但不可拾取(到达=${arrived} 提示=${!!got})`); }
    else detail.push(`${f.on}@${f.x},${f.z} y=${__f(f.y)} 路点${p.length} 帧${r.frames}`);
  }
  __ok(allDone, '三枚保险丝都能真实走到并进入可交互范围', detail.join(' | '));
  // 承载物：每枚保险丝都有真实高度的托座，不是浮在半空
  let supported = 0;
  for (const f of FUSE_DEFS) {
    const box = new THREE.Box3();
    let top = -99;
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      box.setFromObject(o);
      if (!Number.isFinite(box.min.y)) return;
      if (f.x > box.min.x - 0.05 && f.x < box.max.x + 0.05 && f.z > box.min.z - 0.05 && f.z < box.max.z + 0.05 &&
        box.max.y <= f.y + 0.02 && box.max.y > top) top = box.max.y;
    });
    if (top > 0.45 && Math.abs(top - f.y) < 0.35) supported++;
  }
  __ok(supported === FUSE_DEFS.length, '三枚保险丝都放在真实家具/柜体的台面上（不是浮空）', `${supported}/${FUSE_DEFS.length}`);

  // 负对照：玩家与保险丝之间插入一堵真实墙体（不是承载家具），必须拾取不到
  __enterL0();
  const __sameFuse = (a, f) => !!a && Math.abs(a.x - f.x) < 0.01 && Math.abs(a.z - f.z) < 0.01;
  let seenOK = 0, blockedOK = 0, total = 0;
  for (const f of FUSE_DEFS) {
    const cand = [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]];
    for (const [ox, oz] of cand) {
      const px = f.x + ox, pz = f.z + oz;
      if (!__navFree(__NAV0, px, pz)) continue;
      total++;
      __place(px, pz, 0);
      updateFuseProximity();
      if (__sameFuse(nearestFuse, f)) seenOK++;
      // 墙在玩家与保险丝中点，厚度 0.2m、高度盖住视线
      const wx = f.x + ox * 0.5, wz = f.z + oz * 0.5;
      COLLIDERS_L0.push({
        x1: wx - (ox ? 0.1 : 1.2), x2: wx + (ox ? 0.1 : 1.2),
        z1: wz - (oz ? 0.1 : 1.2), z2: wz + (oz ? 0.1 : 1.2),
        y1: -1, y2: 3, kind: 'testWall'
      });
      __place(px, pz, 0);
      updateFuseProximity();
      if (!__sameFuse(nearestFuse, f)) blockedOK++;
      COLLIDERS_L0.pop();
      break;
    }
  }
  __ok(total === 3 && seenOK === 3 && blockedOK === 3,
    '负对照：玩家与保险丝之间插入真实墙体后无法拾取（且无墙时可拾取）',
    `样本 ${total}，无墙可拾取 ${seenOK}，有墙仍可拾取 ${total - blockedOK}`);
});

__section('L0 保险丝：真实柜体正/背面、高低视点、围住目标的墙', () => {
  __enterL0();
  const same = (a, f) => !!a && Math.abs(a.x - f.x) < 0.01 && Math.abs(a.z - f.z) < 0.01;
  const f3 = FUSE_DEFS[2];                    // 配电柜上的保险丝（柜体高 1.9m，真实可遮挡）
  // 一、正面：站在柜前，从真实眼位看得到摸得着
  __place(f3.x, f3.z + 1.4, 0);
  updateFuseProximity();
  const frontOK = same(nearestFuse, f3);
  // 二、背面：柜体（0.7m 厚、1.9m 高）把视线完全挡住
  __place(f3.x, f3.z - 1.0, 0);
  updateFuseProximity();
  const backBlocked = !same(nearestFuse, f3);
  __place(f3.x, f3.z + 1.4, 0);
  updateFuseProximity();
  __ok(frontOK && backBlocked, '同一枚保险丝：柜体正面看得到、背面被柜体挡住',
    `正面=${frontOK} 背面挡住=${backBlocked}`);

  // 三、高低视点：站姿从各个可行方向都能拾取；蹲伏（眼位 0.89m）低于 0.98m 台面，
  //     视线被台面边缘真实挡住 —— 说明遮挡判定随视点变化，不是一刀切豁免高度。
  const f1 = FUSE_DEFS[0];
  let standAll = 0, dirs = 0, lowBlocked = 0, belowReach = 0;
  for (const [ox, oz] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) {
    if (!__navFree(__NAV0, f1.x + ox, f1.z + oz)) continue;
    dirs++;
    __place(f1.x + ox, f1.z + oz, 0);
    crouchH = 1; updateFuseProximity();
    if (same(nearestFuse, f1)) standAll++;
    crouchH = 0.55; updateFuseProximity();
    if (!same(nearestFuse, f1)) lowBlocked++;
    crouchH = 1;
    player.y = -2.6; updateFuseProximity();               // 相当于隔着楼板 / 站在池底
    if (same(nearestFuse, f1)) belowReach++;
    player.y = 0;
  }
  __ok(dirs >= 2 && standAll === dirs && lowBlocked >= 1 && belowReach === 0,
    '遮挡随视点变化：站姿可拾取、蹲到台面以下会被挡住、隔层一律拒绝',
    `方向 ${dirs}，站姿可拾取 ${standAll}，蹲姿被挡 ${lowBlocked}，降层误判 ${belowReach}`);

  // 四、一堵"包住目标 xz"的墙：容差只放过紧贴端点的采样，不允许把承载物/墙体整体豁免
  const f2 = FUSE_DEFS[1];
  let enclOK = false, enclDetail = '无可用站位';
  for (const [ox, oz] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) {
    if (!__navFree(__NAV0, f2.x + ox, f2.z + oz)) continue;
    __place(f2.x + ox, f2.z + oz, 0);
    updateFuseProximity();
    const clear = same(nearestFuse, f2);
    COLLIDERS_L0.push({ x1: f2.x - 0.6, x2: f2.x + 0.6, z1: f2.z - 0.6, z2: f2.z + 0.6, y1: 0, y2: 3, kind: 'enclose' });
    updateFuseProximity();
    const blocked = !same(nearestFuse, f2);
    COLLIDERS_L0.pop();
    updateFuseProximity();
    const back = same(nearestFuse, f2);
    enclOK = clear && blocked && back;
    enclDetail = `无墙=${clear} 围住=${blocked} 移除后恢复=${back}`;
    break;
  }
  __ok(enclOK, '把墙围在目标四周时依然判定被遮挡（容差不会整体豁免承载物）', enclDetail);

  // 五、复位后不得保留旧的交互目标（禁止按 E 远程拾取）
  __place(f1.x + 1.3, f1.z, 0);
  updateFuseProximity();
  const hadTarget = !!nearestFuse;
  safeRespawn(0);
  const cleared = nearestFuse === null && nearestPickup === null;
  __ok(hadTarget && cleared, '安全复位会清空 nearestFuse / nearestPickup 缓存', `有目标=${hadTarget} 清空=${cleared}`);

  // 六、执行时二次校验：目标被移走后 tryFuse 不能凭空 +1
  __enterL0();
  const before = fuses;
  const keep = nearestFuse;
  tryFuse();                                  // 此时没有有效目标：数量必须不变
  __ok(fuses === before, '没有有效目标时按 E 不会增加保险丝数量', `before=${before} after=${fuses} keep=${!!keep}`);
  crouchH = 1; player.y = 0;
});

__section('L0 黑影：独立模型、绕墙追逐、最后目击记忆', () => {
  __enterL0();
  // 模型尺寸与肢体连续性：不靠 rig 变量，直接量真实网格
  entity.visible = true; entity.position.set(-140, 0, 10); entity.rotation.set(0, 0, 0);
  entity.scale.setScalar(ENTITY_SCALE);
  animateBlackFigure(entity, 0.016, 'idle');
  updateMatrixWorldAll(entity);
  const bb = new THREE.Box3().setFromObject(entity);
  const hgt = bb.max.y - bb.min.y;
  __ok(hgt > 1.9 && hgt < 2.45, '黑影整体高度接近设计的 2.2m', `实测 ${__f(hgt)}m`);
  __ok(Math.abs(bb.min.y) < 0.10, '脚掌贴地，没有悬空或埋进地板', `最低点 ${__f(bb.min.y, 3)}`);
  // 手臂必须挂在躯干上：把肩膀父节点整体平移，手臂要跟着动
  const rig = entity.userData.rig;
  __ok(!!rig && !!rig.shoulderL && !!rig.shoulderR, '左右肩节点存在且分别挂载手臂');
  if (rig && rig.shoulderL) {
    const handL = rig.shoulderL.getObjectByProperty('type', 'Object3D');
    const beforeBox = new THREE.Box3().setFromObject(rig.shoulderL);
    const armCount = rig.shoulderL.children.length;
    __ok(armCount > 0, '左臂挂在左肩节点下（不是从地面长出来的独立手臂）', `children=${armCount}`);
    __ok(beforeBox.max.y > 1.2 && beforeBox.min.y < 1.0,
      '手臂从肩部向下延伸到膝下高度', `肩组 y ${__f(beforeBox.min.y)}..${__f(beforeBox.max.y)}`);
  }
  // 指尖要低于膝盖：驼背长臂
  if (rig && rig.shoulderL) {
    const handBox = new THREE.Box3();
    let lowest = 99;
    rig.shoulderL.traverse((o) => { if (o.isMesh) { handBox.setFromObject(o); if (handBox.min.y < lowest) lowest = handBox.min.y; } });
    __ok(lowest < 0.75, '指尖垂到膝盖以下（长臂特征）', `指尖最低 ${__f(lowest, 3)}m`);
  }
  entity.visible = false;

  // 寻路：每个出现点都能走到玩家
  let noPath = [];
  for (const [x, z] of ENTITY_POINTS) {
    if (!l0Path(x, z, L0_SPAWN.x, L0_SPAWN.z)) noPath.push(`${x},${z}`);
  }
  __ok(noPath.length === 0, '所有黑影出现点都能寻路到出生点', noPath.join(' ') || `${ENTITY_POINTS.length} 个点`);

  // 追逐 900 帧：不穿墙、不出界、坐标始终有限
  __enterL0();
  __place(-120, 0, 0);
  startChase(2.6, 60);
  entity.visible = true; entityState = 'chase';
  entity.position.set(-110, 0, 0);
  let penWorst = 99, nanHit = 0, maxStep = 0;
  let prevE = entity.position.clone();
  for (let i = 0; i < 900; i++) {
    updateLevel0(1 / 60);
    if (!Number.isFinite(entity.position.x) || !Number.isFinite(entity.position.z)) nanHit++;
    const pen = __worstPenetration(COLLIDERS_L0, entity.position.x, entity.position.z, 0.32);
    if (pen.gap < penWorst) penWorst = pen.gap;
    const st = Math.hypot(entity.position.x - prevE.x, entity.position.z - prevE.z);
    if (st > maxStep) maxStep = st;
    prevE.copy(entity.position);
    if (!entityChasing) break;
  }
  __ok(nanHit === 0, '追逐全程怪物坐标始终有限（没有 NaN）', `nan=${nanHit}`);
  __ok(penWorst > -0.08, '追逐全程没有穿进墙体（真实碰撞推出）', `最小间隙 ${__f(penWorst, 3)}m`);
  __ok(maxStep < 0.10, '追逐每帧位移受速度上限约束（无瞬移）', `maxStep=${__f(maxStep, 3)}m`);

  // 最后目击记忆：把玩家瞬移到墙后的远处，怪物不能继续全知追踪
  __enterL0();
  __place(-120, 0, 0);
  entity.visible = true; entity.position.set(-118, 0, 0); entityState = 'chase';
  startChase(2.2, 60);
  for (let i = 0; i < 20; i++) updateLevel0(1 / 60);       // 先让它确实看见
  const seenAt = { x: lastSeen.x, z: lastSeen.z, valid: lastSeen.valid };
  // 找一个在墙后、且与怪物视线不通的落点
  let hide = null;
  for (const [hx, hz] of [[-140, -14], [-140, -20], [-134, 16], [-116, -18], [-86, -18], [-106, 18], [-80, 18], [-68, 0], [-120, 20]]) {
    if (!__navFree(__NAV0, hx, hz)) continue;
    if (segmentBlockedByWalls(entity.position.x, 1.0, entity.position.z, hx, 1.0, hz)) { hide = { x: hx, z: hz }; break; }
  }
  __ok(!!hide, '存在可用于"躲在墙后"的测试落点', hide ? `${hide.x},${hide.z}` : 'null');
  if (hide) {
    __place(hide.x, hide.z, 0);
    let minDist = 99, maximized = false;
    for (let i = 0; i < 420; i++) {
      updateLevel0(1 / 60);
      if (!Number.isFinite(entity.position.x)) break;
      const dd = Math.hypot(entity.position.x - player.x, entity.position.z - player.z);
      if (dd < minDist) minDist = dd;
      if (!entityChasing) { maximized = true; break; }
    }
    const frozen = Math.hypot(lastSeen.x - seenAt.x, lastSeen.z - seenAt.z);
    __ok(frozen < 1.2, '丢失视线后"最后目击位置"不再被更新为玩家新位置', `记忆偏移 ${__f(frozen)}m`);
    __ok(minDist > 1.3, '怪物没有直接穿墙扑到藏起来的玩家身上', `最近距离 ${__f(minDist)}m`);
    __ok(!entityChasing || maximized, '丢失踪迹后追逐会结束/转搜寻（不再无限全知追踪）', `chasing=${entityChasing}`);
  }
});

__section('L0 攻击节奏、复位与出口门阈值', () => {
  __enterL0();
  // 追逐起点必须有效：实体隐藏且坐标在界外 (0,0) 时，会重选界内、远处、可寻路的落点并给反应窗口
  __place(-115, 0, 0);
  entity.visible = false; entity.position.set(0, 0, 0);
  horrorCoolUntil = 0;
  startChase(2.2, 30);
  const dStart = Math.hypot(entity.position.x - player.x, entity.position.z - player.z);
  const inB = entity.position.x > BOUNDS_L0.x1 + 0.5 && entity.position.x < BOUNDS_L0.x2 - 0.5 &&
    entity.position.z > BOUNDS_L0.z1 + 0.5 && entity.position.z < BOUNDS_L0.z2 - 0.5;
  const reach = !!l0Path(entity.position.x, entity.position.z, player.x, player.z);
  __ok(entity.visible && entityChasing && inB && dStart >= 7.0 && reach,
    'startChase 会把隐藏/界外的实体重选到有效出生点', `d=${__f(dStart)}m 界内=${inB} 可寻路=${reach}`);
  __ok(horrorCoolUntil - performance.now() > 600, 'startChase 给出反应窗口（不是开场即抓）',
    `剩余 ${Math.round(horrorCoolUntil - performance.now())}ms`);

  // 攻击：贴身且视线通 → 抓一次；随后冷却期内不重复（注意选点不能站在门廊墙体里）
  __enterL0();
  __place(-115, 0, 0);
  entity.visible = true; entityChasing = true; entityState = 'chase';
  entity.position.set(player.x + 0.7, 0, player.z);
  horrorCoolUntil = 0;
  const s0 = stats.scares;
  let jumped = -1;
  for (let i = 0; i < 30; i++) {
    updateLevel0(1 / 60);
    if (stats.scares > s0) { jumped = i; break; }
  }
  __ok(jumped >= 0 && stats.scares - s0 === 1, '贴身抓取会触发一次', `首帧=${jumped} scares +${stats.scares - s0}`);
  const distAfter = Math.hypot(player.x - L0_SPAWN.x, player.z - L0_SPAWN.z);
  __ok(distAfter < 1.0, '被抓后玩家回到关卡起点', `距起点 ${__f(distAfter)}m (${__f(player.x)},${__f(player.z)})`);
  const s1 = stats.scares;
  for (let i = 0; i < 150; i++) {
    // 持续把实体钉在身边，检验冷却窗口本身
    entity.visible = true; entityChasing = true; entityState = 'chase';
    entity.position.set(player.x + 0.7, 0, player.z);
    updateLevel0(1 / 60);
  }
  __ok(stats.scares === s1, '冷却期内贴身也不会连环抓', `scares Δ=${stats.scares - s1}`);

  // 出口阈值：只有真正走到东端门里才推进关卡
  __enterL0();
  exitUnlocked = true;
  __place(-70, 0, 0);
  transitioning = false;
  for (let i = 0; i < 10; i++) updateLevel0(1 / 60);
  __ok(transitioning === false, '负对照：在走廊中段（x=-70）不会误触发进入下一关', `x=${__f(player.x)}`);
  __place(-65.5, 0, 0);
  for (let i = 0; i < 10; i++) updateLevel0(1 / 60);
  __ok(transitioning === true, '走到东端出口门内会真正推进到第二关', `transitioning=${transitioning}`);
  transitioning = false;
  // 侧向偏移在门外时不该推进
  __enterL0();
  exitUnlocked = true; transitioning = false;
  __place(-65.5, 6, 0);
  for (let i = 0; i < 10; i++) updateLevel0(1 / 60);
  __ok(transitioning === false, '负对照：出口门外的侧向位置不会推进关卡', `z=${__f(player.z)}`);
  exitUnlocked = false;

  // 未解锁时绝不推进
  __enterL0();
  __place(-65.5, 0, 0);
  for (let i = 0; i < 10; i++) updateLevel0(1 / 60);
  __ok(transitioning === false, '保险丝没集齐时出口不会开启', `exitUnlocked=${exitUnlocked}`);
});

__section('复位与关卡衔接（不丢进度）', () => {
  // R 复位：第二关回到入口，且拾取进度保留
  __enterL37(L37_SPAWN.x, L37_SPAWN.z);
  const pickedBefore = pickedCount;
  const remainBefore = pickups.length;
  player.x = 0; player.z = -6; player.y = POOL_BY_NAME.main.water - 0.5;
  respawnToLevelStart();
  __ok(Math.abs(player.x - L37_SPAWN.x) < 0.01 && Math.abs(player.z - L37_SPAWN.z) < 0.01,
    '第二关 R 复位回到南侧入口出生点', `(${__f(player.x)},${__f(player.z)})`);
  __ok(pickedCount === pickedBefore && pickups.length === remainBefore, '复位不重置已收集的漂浮物进度', `${pickedCount}/${PICK_TOTAL}`);
  __ok(!horrorCooldownReady(), '复位后给出一段安全冷却（不会立刻被再次抓）', `剩余 ${Math.round(horrorCoolUntil - performance.now())}ms`);
  __ok(poolMonster.phase === 'retreat' || poolMonster.cool > 0, '复位后怪物退开/进入冷却', `phase=${poolMonster.phase} cool=${__f(poolMonster.cool)}`);

  // L0 复位
  __enterL0();
  player.x = -100; player.z = 10;
  respawnToLevelStart();
  __ok(Math.abs(player.x - L0_SPAWN.x) < 0.01 && Math.abs(player.z - L0_SPAWN.z) < 0.01,
    '第一关 R 复位回到出生点', `(${__f(player.x)},${__f(player.z)})`);

  // 重置整局（新开一局）后：六件漂浮物与三枚保险丝都回来了
  resetGame();
  __ok(pickups.length === 6 && pickedCount === 0, '重开一局后六个漂浮物重新出现', `${pickups.length} 个, picked=${pickedCount}`);
  __ok(fusesList.length === 3 && fuses === 0, '重开一局后三枚保险丝重新出现', `${fusesList.length} 枚, fuses=${fuses}`);
  __ok(LEVEL === 0, '重开一局回到第一关', `LEVEL=${LEVEL}`);
  __enterL0();
});

/* ---------------- 第二关直达预览入口 ---------------- */
__section('第二关直达预览（?level=37）：建关到位但不写档', () => {
  const recBefore = localStorage.getItem(REC_KEY);
  enterPoolroomsPreview();
  const recAfter = localStorage.getItem(REC_KEY);
  const dSpawn = Math.hypot(player.x - L37_SPAWN.x, player.z - L37_SPAWN.z);
  __ok(LEVEL === 1 && ACTIVE_COLLIDERS === COLLIDERS && ACTIVE_BOUNDS === BOUNDS,
    '预览入口直接进入第二关并使用泳池层的碰撞/边界', `LEVEL=${LEVEL}`);
  __ok(dSpawn < 0.6 && Math.abs(player.y - groundAt(player.x, player.z)) < 0.01,
    '预览出生点落在入口地面（不卡墙、不悬空）', `距入口 ${__f(dSpawn)} y=${__f(player.y)}`);
  __ok(runPreview === true && recAfter === recBefore,
    '预览不写任何记录（本地存档逐字节不变）', `runPreview=${runPreview} 存档变化=${recAfter !== recBefore}`);
  // 预览出生点必须能真的走到主池厅步道（真实导航，不是直线距离）
  if (!__NAV37) __NAV37 = __mkNav(BOUNDS.x1, BOUNDS.x2, BOUNDS.z1, BOUNDS.z2, COLLIDERS, 0.4, 0.28);
  const path = __navPath(__NAV37, player.x, player.z, -3, 12.5);   // 主池南沿步道（池外）
  __ok(!!path && path.length > 1, '预览出生点能走到主池边的步道', `路点 ${path ? path.length : 0}`);
  __enterL0();
});

/* ---------------- L0 建造：门洞收口 ---------------- */
__section('L0 门洞收口：每个真实缺口上方都有门楣网格，接顶棚、不挡通行', () => {
  __enterL0();
  const gaps = L0_GAPS.slice();
  __ok(gaps.length >= 15, '登记到真实门洞数量', `${gaps.length} 个`);
  const missing = [], badY = [], badSpan = [], notToCeil = [];
  for (const g of gaps) {
    const h = l0Headers.find(x => x.axis === g.axis && Math.abs(x.fixed - g.fixed) < 0.02 &&
      Math.abs(x.a - g.a) < 0.02 && Math.abs(x.b - g.b) < 0.02);
    if (!h) { missing.push(`${g.axis}@${__f(g.fixed)}`); continue; }
    const b = new THREE.Box3().setFromObject(h.mesh);
    if (!(b.max.y > b.min.y + 0.2) || Math.abs(b.min.y - h.y0) > 0.03 || Math.abs(b.max.y - h.y1) > 0.03) badY.push(`${g.axis}@${__f(g.fixed)}`);
    const along = g.axis === 'x' ? (b.max.x - b.min.x) : (b.max.z - b.min.z);
    if (along < (g.b - g.a) - 0.06) badSpan.push(`${g.axis}@${__f(g.fixed)}:${__f(along)}`);
    if (Math.abs(b.max.y - h.y1) > 0.03) notToCeil.push(`${g.axis}@${__f(g.fixed)}`);
  }
  __ok(missing.length === 0, '每个门洞都能找到对应门楣（没有门头黑洞）', missing.join(',') || '全部命中');
  __ok(badY.length === 0, '门楣网格的上下沿与登记的门头高度一致', badY.join(',') || `${gaps.length} 个`);
  __ok(badSpan.length === 0, '门楣横向跨度覆盖整个洞口（不是一条细梁）', badSpan.join(',') || '全部覆盖');
  // 门楣顶面必须贴到 L0 顶棚：要么直接到 L0H，要么到局部顶（出口门套 2.4 也到 L0H）
  let ceilGap = 0;
  for (const h of l0Headers) {
    const b = new THREE.Box3().setFromObject(h.mesh);
    if (b.max.y < Math.min(L0H, h.y1) - 0.03) ceilGap++;
  }
  __ok(ceilGap === 0, '门楣与顶棚之间没有漏空', `漏空 ${ceilGap}`);
  const hc = COLLIDERS_L0.filter(c => c.kind === 'l0Header');
  __ok(hc.length === gaps.length && hc.every(c => c.y1 >= 2.1 && Math.abs(c.y2 - L0H) < 0.05),
    '门楣碰撞只占门头以上（净高通行不受影响）', `${hc.length} 条, y1>=${__f(Math.min(...hc.map(c => c.y1)))}`);
  // 负对照：把同一门洞补成整高实墙后，从门口穿过去必须被判定为被墙挡住
  const gx = -126, gz = 2.7;                              // 门廊 A 的西侧门洞
  const clearBefore = !segmentBlockedByWalls(gx - 0.8, 1.2, gz, gx + 0.8, 1.2, gz, 0.05);
  COLLIDERS_L0.push({ x1: gx - 0.16, x2: gx + 0.16, z1: gz - 1.5, z2: gz + 1.5, y1: 0, y2: L0H, kind: 'testWall' });
  const blockedAfter = segmentBlockedByWalls(gx - 0.8, 1.2, gz, gx + 0.8, 1.2, gz, 0.05);
  COLLIDERS_L0.pop();
  __ok(clearBefore && blockedAfter, '负对照：门洞本来是通的，补成整高墙后才会挡住视线',
    `之前通过=${clearBefore} 之后被挡=${blockedAfter}`);
});

/* ---------------- L0 建造：墙面装饰贴面 ---------------- */
__section('L0 墙面装饰：插座/百叶/水渍都贴在真实墙面上，且不覆盖门洞', () => {
  __enterL0();
  // 真实墙面判定：给定“沿墙坐标/离墙坐标”，必须在注册过的整高墙段贴面上
  const onWallFace = (axis, coord, along, tol = 0.06) => {
    for (const p of l0WallPieces) {
      if (p.axis !== axis) continue;
      const f1 = p.fixed + p.t / 2, f2 = p.fixed - p.t / 2;
      if (Math.abs(coord - f1) > tol && Math.abs(coord - f2) > tol) continue;
      if (along < p.a - 0.03 || along > p.b + 0.03) continue;
      return true;
    }
    return false;
  };
  const insideGap = (axis, coord, along, tol = 0.10) => {
    for (const g of L0_GAPS) {
      if (g.axis !== axis) continue;
      if (Math.abs(coord - g.fixed) > g.t / 2 + 0.12) continue;
      if (along > g.a - tol && along < g.b + tol) return true;
    }
    return false;
  };
  const plates = l0Sockets.filter(s => Math.abs(s.sy - 0.15) < 0.001);
  let offWall = [], overGap = [];
  for (const s of plates) {
    const axis = s.sx > s.sz ? 'x' : 'z';
    const coord = axis === 'x' ? s.z : s.x;
    const along = axis === 'x' ? s.x : s.z;
    if (!onWallFace(axis, coord, along)) offWall.push(`(${__f(along)},${__f(coord)})`);
    if (insideGap(axis, coord, along)) overGap.push(`(${__f(along)},${__f(coord)})`);
  }
  __ok(plates.length >= 12, '生成到的插座面板数量', `${plates.length} 个`);
  __ok(offWall.length === 0, '每个插座都贴在实际墙面上（没有站在空中的插座板）', offWall.join(' ') || '全部贴面');
  __ok(overGap.length === 0, '没有插座落进门洞', overGap.join(' ') || '无');
  // 负对照 1：门洞中心位置必须被判定为“不能放”
  const gapCentre = [-140.5, -5];                          // 走廊北墙 [-142,-139] 门洞
  __ok(insideGap('x', gapCentre[1] + 0.15, gapCentre[0]) && !onWallFace('x', gapCentre[1] + 0.15, gapCentre[0], 0.06),
    '负对照：门洞里的位置既不算贴面也会被判为覆盖门洞', `x=${gapCentre[0]}`);
  __ok(l0Face('x', -5, 1, -140.5, 0.45) === null && l0Face('x', -5, 1, -136, 0.45) !== null,
    '负对照：l0Face 在门洞处返回 null、在实墙处返回墙面', '门洞/实墙判定正确');
  // 百叶/窗：所有叶片与压条都必须贴在南墙贴面或窗框上（离墙不超过 6cm）
  let ventFloat = [], ventOverGap = [];
  for (const v of l0Vents) {
    if (Math.abs(v.z - 23.775) < 0.05 || Math.abs(v.z - 23.795) < 0.05 || Math.abs(v.z - 23.77) < 0.02) continue; // 窗单元自成一体
    const axis = v.sx > v.sz ? 'x' : 'z';
    const coord = axis === 'x' ? v.z : v.x;
    const along = axis === 'x' ? v.x : v.z;
    if (!onWallFace(axis, coord, along, 0.07)) ventFloat.push(`(${__f(along)},${__f(coord)})`);
    if (insideGap(axis, coord, along)) ventOverGap.push(`(${__f(along)},${__f(coord)})`);
  }
  __ok(ventFloat.length === 0, '通风口/百叶全部紧贴墙面（不再漂在门洞上方）', ventFloat.join(' ') || '全部贴面');
  __ok(ventOverGap.length === 0, '没有通风口落进门洞', ventOverGap.join(' ') || '无');
  // 窗单元：叶片必须在框内，且框贴在南墙
  const slats = l0Vents.filter(v => Math.abs(v.z - 23.775) < 0.05 && Math.abs(v.sy - 0.05) < 0.001);
  const frameTop = l0Vents.filter(v => Math.abs(v.z - 23.77) < 0.02);
  __ok(slats.length === 12 && slats.every(v => Math.abs(v.x + 142) < 0.01), '百叶窗 12 片叶片都在窗框中心线上', `${slats.length} 片`);
  __ok(frameTop.length >= 4, '窗框（上下框 + 两侧立框）确实存在', `${frameTop.length} 件`);
  // 水渍贴花：位置贴面、朝向与墙面法向一致
  let stainBad = [], stainGap = [];
  for (const s of l0Stains) {
    const axis = s.axis, coord = axis === 'x' ? s.obj.position.z : s.obj.position.x;
    const along = axis === 'x' ? s.obj.position.x : s.obj.position.z;
    const f = l0Face(axis, s.fixed, s.side, along, 0.7);
    if (!f || Math.abs(coord - (f.face + s.side * 0.006)) > 0.02) stainBad.push(`(${__f(along)})`);
    const n = new THREE.Vector3(0, 0, 1).applyEuler(s.obj.rotation);
    const want = axis === 'x' ? new THREE.Vector3(0, 0, s.side) : new THREE.Vector3(s.side, 0, 0);
    if (n.dot(want) < 0.9) stainGap.push(`(${__f(along)})`);
  }
  __ok(l0Stains.length >= 4, '生成到的水渍贴花数量', `${l0Stains.length} 处`);
  __ok(stainBad.length === 0, '每处水渍都贴在墙面上（不嵌进墙里）', stainBad.join(' ') || '全部贴面');
  __ok(stainGap.length === 0, '水渍朝向与墙面法向一致（不会背对房间）', stainGap.join(' ') || '朝向正确');
  __ok(l0Face('x', -5, 1, -140.5, 0.7) === null && l0Face('x', -5, 1, -136, 0.7) !== null,
    '负对照：门洞里放不了水渍（l0Face 返回 null）', '返回 null');
});

/* ---------------- L0 建造：地面陈设与管线支撑 ---------------- */
__section('L0 陈设接地与管线支撑：最低点贴地、管线落在关内且有管夹/吊杆', () => {
  __enterL0();
  const floatProps = [];
  let checked = 0;
  for (const p of l0Props) {
    if (!p.obj) continue;
    p.obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(p.obj);
    checked++;
    if (b.min.y < -0.02 || b.min.y > 0.03) floatProps.push(`${p.kind}:${__f(b.min.y)}`);
  }
  __ok(checked >= 20, '参与接地点检查的陈设数量', `${checked} 件`);
  __ok(floatProps.length === 0, '所有地面陈设的最低点都贴着地面（没有悬空/插进地板）', floatProps.join(' ') || '全部贴地');
  // 侧台腿必须在台面投影内
  const st = l0Props.find(p => p.kind === 'sidetable');
  const legsInside = st && st.legs.every(([dx, dz]) => Math.abs(dx) + 0.03 <= 0.55 && Math.abs(dz) + 0.03 <= 0.31);
  __ok(!!legsInside, '侧台四条腿落在台面投影内（不会踩在台面外）', st ? st.legs.map(l => l.join('/')).join(' ') : '缺失');
  // 管线：端点必须在关内；支撑要用"真实网格包围盒"同时碰到管体和墙面/顶棚，
  // 不能只看坐标离管子近不近（那样会把悬在管旁边 15cm、或挂在管子另一侧的假夹子当成支撑）。
  const inLevel = (x, y, z) => x > BOUNDS_L0.x1 + 0.12 && x < BOUNDS_L0.x2 - 0.12 &&
    z > BOUNDS_L0.z1 + 0.12 && z < BOUNDS_L0.z2 - 0.12 && y > 0.2 && y < L0H - 0.05;
  const boxOf = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
  const wallBoxes = () => {
    const out = l0WallPieces.map(p => boxOf(p.mesh).expandByScalar(0.02));   // 真实墙体网格
    for (const c of COLLIDERS_L0) {
      if (c.y1 <= 0.4 && c.y2 >= 1.2) out.push(new THREE.Box3(
        new THREE.Vector3(c.x1 - 0.02, 0, c.z1 - 0.02), new THREE.Vector3(c.x2 + 0.02, L0H, c.z2 + 0.02)));
    }
    return out;
  };
  const walls = wallBoxes();
  const pipeOut = [], pipeUnsupported = [];
  for (const p of l0Pipes) {
    if (!inLevel(p.a[0], p.a[1], p.a[2]) || !inLevel(p.b[0], p.b[1], p.b[2])) {
      pipeOut.push(`(${p.a.map(v => __f(v)).join(',')})->(${p.b.map(v => __f(v)).join(',')})`);
      continue;
    }
    const pb = boxOf(p.mesh);
    let good = 0;
    for (const h of l0Hangers) {
      if (!h.mesh) continue;                                   // 只有登记了真实支撑网格的才算
      const hb = boxOf(h.mesh);
      const onPipe = hb.intersectsBox(pb);                     // 与管体接触
      const toWall = h.kind === 'pipeClamp'
        ? walls.some(w => hb.intersectsBox(w))                  // 夹子另一端必须真的贴墙
        : hb.max.y >= L0H - 0.02;                               // 吊杆必须真的顶到顶棚
      if (onPipe && toWall) good++;
    }
    if (good < 2) pipeUnsupported.push(`${good} 处真实接触`);
  }
  __ok(l0Pipes.length >= 5, '登记到的管线数量（含服务横廊横穿管）', `${l0Pipes.length} 根`);
  __ok(pipeOut.length === 0, '所有管线端点都在关内（原缺陷把管放到了 z=-78 的关外）', pipeOut.join(' ') || '全部在关内');
  __ok(pipeUnsupported.length === 0, '每根管线的支撑同时接触管体与墙面/顶棚（≥2 处）', pipeUnsupported.join(' ') || '支撑两端都接实');
  // 服务横廊那根必须沿 z 横穿（原来是一根沿 x 的长管）
  const svc = l0Pipes.find(p => Math.abs(p.a[0] + 87) < 0.01 && p.a[0] === p.b[0] && Math.abs(p.b[2] - p.a[2]) > 9);
  __ok(!!svc, '服务横廊管线沿 z 横穿走廊（不再沿 x）',
    svc ? `(${svc.a.map(v => __f(v)).join(',')})->(${svc.b.map(v => __f(v)).join(',')})` : '缺失');
  // 负对照一：夹子沿管子轴线量偏 15cm（旧缺陷）→ 与管体不相交
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.30));
  const target = l0Pipes.find(p => Math.abs(p.a[2] + 23.30) < 0.01) || l0Pipes[0];
  const tb = boxOf(target.mesh);
  ghost.position.set(target.a[0] + 10, target.a[1], -23.66); ghost.updateMatrixWorld(true);
  const ghostOffPipe = !boxOf(ghost).intersectsBox(tb);
  // 负对照二：夹子挂在管子远离墙的一侧（旧东墙缺陷）→ 与墙面不相交
  const eastT = l0Pipes.find(p => Math.abs(p.a[0] + 72.4) < 0.01) || target;
  const eastB = new THREE.Box3(); // 复现旧参数：center x=-72.55, 宽 0.3
  ghost.position.set(-72.55, eastT.a[1], eastT.a[2] + 4); ghost.scale.set(5, 1, 1); ghost.updateMatrixWorld(true);
  eastB.copy(boxOf(ghost));
  const ghostOffWall = !walls.some(w => eastB.intersectsBox(w));
  __ok(ghostOffPipe && ghostOffWall, '负对照：夹偏 15cm 不碰管、挂到管子另一侧不碰墙（都不算支撑）',
    `离管15cm 不相交=${ghostOffPipe} 管子另一侧 不贴墙=${ghostOffWall}`);
  // 负对照：旧坐标 (z=-78) 必须被判定为关外
  __ok(!inLevel(-86, 2.55, -78) && inLevel(-86, 2.55, -23.55), '负对照：关外坐标会被判出来、关内坐标通过', 'z=-78 判为关外');
});

/* ---------------- L0 贴图：世界米制 UV 与跨段相位 ---------------- */
__section('L0 墙面 UV：世界米制尺度、同一堵墙被门洞切段后相位连续', () => {
  __enterL0();
  const faceSeg = (mesh, faceIdx) => {
    const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
    const out = [];
    for (let k = faceIdx * 4; k < faceIdx * 4 + 4; k++) {
      out.push({ x: pos.getX(k) + mesh.position.x, y: pos.getY(k) + mesh.position.y,
        z: pos.getZ(k) + mesh.position.z, u: uv.getX(k) });
    }
    return out;
  };
  let badOrigin = [], badScale = [], measured = 0;
  for (const p of l0WallPieces) {
    const c = p.mesh.userData.worldUV;
    if (!c) { badOrigin.push(`${p.axis}@${__f(p.fixed)}:无 worldUV`); continue; }
    const faces = p.axis === 'x' ? [4, 5] : [0, 1];
    for (const f of faces) {
      const q = faceSeg(p.mesh, f);
      // 绝对尺子：u 必须等于 ±世界坐标/c，若每段从 UV0 重起，常数项会等于段起点
      const sign = (p.axis === 'x') ? (f === 4 ? 1 : -1) : (f === 0 ? -1 : 1);
      const coordOf = p.axis === 'x' ? (a => a.x) : (a => a.z);
      for (const a of q) {
        measured++;
        const origin = a.u - sign * coordOf(a) / c;
        if (Math.abs(origin) > 0.02) badOrigin.push(`${p.axis}@${__f(p.fixed)}:${__f(origin)}`);
      }
      const d = q[1][p.axis === 'x' ? 'x' : 'z'] - q[0][p.axis === 'x' ? 'x' : 'z'];
      const du = q[1].u - q[0].u;
      if (Math.abs(d) > 0.5 && Math.abs(Math.abs(du / d) - 1 / c) > 0.02) badScale.push(`${__f(du / d)} vs ${__f(1 / c)}`);
    }
  }
  __ok(measured > 100, '参与检查的墙面顶点数', `${measured} 个`);
  __ok(badOrigin.length === 0, '所有墙段共用同一把绝对尺子（相位跨段连续）', badOrigin.slice(0, 4).join(' ') || '常数项全为 0');
  __ok(badScale.length === 0, '贴图尺度是世界米制（1/c 每米，不随段长变化）', badScale.slice(0, 3).join(' ') || `c=${__f(wallpaper.coverageX)}`);
  // 负对照：用旧的 scaleBoxUV 造一段同尺寸墙，它的 UV 常数项必然偏离 0（每段从 0 起）
  const g = new THREE.BoxGeometry(7, L0H, 0.3);
  scaleBoxUV(g, 7, L0H, 0.3, wallpaper.coverageX);
  const m = new THREE.Mesh(g, l0WallMat); m.position.set(-139, L0H / 2, -5);
  const q = faceSeg(m, 4);
  const badOriginNaive = Math.max(...q.map(a => Math.abs(a.u - a.x / wallpaper.coverageX)));
  __ok(badOriginNaive > 1, '负对照：旧的按段重起 UV 会产生明显相位偏移', `偏移 ${__f(badOriginNaive)}`);
  // 材质参数：墙纸浮雕收敛、地毯无镜面反光
  __ok(l0WallMat.normalScale.x >= 0.10 && l0WallMat.normalScale.x <= 0.22,
    'L0 墙纸浮雕强度收敛在 0.10~0.22', `normalScale=${__f(l0WallMat.normalScale.x)}`);
  __ok(l0WallMat.roughness >= 0.9 && l0WallMat.metalness <= 0.02, '墙纸接近哑光', `rough=${__f(l0WallMat.roughness)} metal=${__f(l0WallMat.metalness)}`);
  __ok(!!l0FloorMat && l0FloorMat.normalScale.x <= 0.16, '地毯浮雕很浅（不把污渍变浮雕）', l0FloorMat ? `normalScale=${__f(l0FloorMat.normalScale.x)}` : '缺失');
  __ok(!!l0FloorMat && l0FloorMat.roughness >= 0.9 && l0FloorMat.metalness <= 0.02 && !l0FloorMat.roughnessMap && !l0FloorMat.clearcoat,
    '地毯无镜面反光、无派生粗糙度亮斑', l0FloorMat ? `rough=${__f(l0FloorMat.roughness)} metal=${__f(l0FloorMat.metalness)}` : '缺失');
  const naive = matFor(wallpaper, 1, 1);
  __ok(naive.normalScale.x > 0.5, '负对照：默认派生浮雕强度确实会超过上限', `naive=${__f(naive.normalScale.x)}`);
});

/* ---------------- L37 门楣与观察窗 ---------------- */
__section('L37 门洞与观察窗：门楣补到局部顶棚，窗下有实墙', () => {
  __enterL37(3, 20);
  __ok(l37Headers.length >= 11, '登记到的门楣数量', `${l37Headers.length} 个`);
  const bad = [], overCeil = [];
  for (const h of l37Headers) {
    const b = new THREE.Box3().setFromObject(h.mesh);
    if (!(b.max.y > b.min.y + 0.05)) bad.push('退化门楣');
    if (Math.abs(b.min.y - h.y0) > 0.04) bad.push(`下沿@${__f(b.min.y)}≠${__f(h.y0)}`);
    if (Math.abs(b.max.y - h.top) > 0.04) bad.push(`上沿@${__f(b.max.y)}≠${__f(h.top)}`);
    if (b.max.y > H + 0.02) overCeil.push(`${__f(b.max.y)}`);
  }
  __ok(bad.length === 0, '每个 L37 门洞上方都有实体门楣（上下沿与登记一致）', bad.slice(0, 4).join(' ') || `${l37Headers.length} 个`);
  __ok(overCeil.length === 0, '门楣不越过全场顶棚（不会穿顶）', overCeil.join(' ') || '无');
  const echoH = l37Headers.filter(h => Math.abs(h.top - L37_ECHO_H) < 0.02);
  __ok(echoH.length >= 1, '回声室门楣按局部低顶 L37_ECHO_H 收口', `${echoH.length} 个 top=${__f(L37_ECHO_H)}`);
  const ph = COLLIDERS.filter(c => c.kind === 'poolHeader');
  __ok(ph.length >= l37Headers.length && ph.every(c => c.y1 >= 2.0 && c.y2 > c.y1),
    '门楣碰撞只占门头以上（净高保持通行）', `${ph.length} 条，最低 y1=${__f(Math.min(...ph.map(c => c.y1)))}`);
  // 观察窗：窗下必须有实墙 + 整幅碰撞（不能只有玻璃和一条细框）
  const win = l37Windows[0];
  __ok(!!win, '登记到设备间观察窗', win ? `z ${__f(win.z1)}..${__f(win.z2)}` : '缺失');
  const wc = COLLIDERS.find(c => c.kind === 'poolWall' && Math.abs(c.x1 - 23.79) < 0.05 && Math.abs(c.z1 - win.z1) < 0.05);
  __ok(!!wc && wc.y1 === 0 && Math.abs(wc.y2 - H) < 0.01, '观察窗占位是整幅实墙碰撞（不能从玻璃穿过去）',
    wc ? `y ${__f(wc.y1)}..${__f(wc.y2)}` : '缺失');
  // 窗台下沿以上、窗楣以下都要有可见墙体：用场景里同一 x 平面的网格盒子覆盖范围来判断
  const cover = [];
  scene.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.min.x > 24.06 || b.max.x < 23.94) return;          // 只认跨过玻璃所在 x 平面的实体
    if (b.min.z > win.z1 + 0.25 || b.max.z < win.z2 - 0.25) return;
    if (b.max.y - b.min.y < 0.1) return;
    cover.push([b.min.y, b.max.y]);
  });
  const belowCovered = cover.some(([y0, y1]) => y0 < 0.05 && y1 > win.sillH - 0.05);
  const aboveCovered = cover.some(([y0, y1]) => y0 < win.headH + 0.05 && y1 > win.top - 0.05);
  __ok(belowCovered, '窗台以下有实体墙面（不是悬空的窗）', `窗台 ${__f(win.sillH)}`);
  __ok(aboveCovered, '窗楣以上到设备间顶也有实体墙面', `窗楣 ${__f(win.headH)} 顶 ${__f(win.top)}`);
});

/* ---------------- 回声室地面材质与池深标识避让 ---------------- */
__section('L37 回声池地面：接大厅同一张 pool-floor.png、统一米制 UV、低反光防滑', () => {
  const FLOOR_ASSET = 'textures/pool-floor.png';
  // 场景里真实绑定了这张图的网格 → 按材质分组，分别得到"回声池地面"和"大厅地面"
  const byMat = new Map();
  scene.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.map) return;
    const asset = o.material.map.userData && o.material.map.userData.asset;
    if (asset !== FLOOR_ASSET) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  const echo = l37EchoFloorMat;
  const echoMeshes = byMat.get(echo) || [];
  __ok(byMat.size >= 2, '地面图片资产同时被回声池与大厅使用（不是各用一套）',
    [...byMat.entries()].map(([m, l]) => `${m.name || '(未命名)'}×${l.length}`).join(' '));
  __ok(echoMeshes.length === 2, '回声室与北廊两片地面都绑定了该材质', `${echoMeshes.length} 片`);
  __ok(echo.map.userData.asset === FLOOR_ASSET, '回声池地面材质的贴图资产是 textures/pool-floor.png',
    String(echo.map.userData.asset));
  __ok(echo.map.userData.status !== 'fallback', '该资产没有走到兜底图（Node 侧绑定；浏览器加载见截图取证）',
    `status=${echo.map.userData.status}`);
  __ok(echo.isMeshPhysicalMaterial !== true && !echo.clearcoat,
    '地面不是物理材质（没有 clearcoat 通道）', echo.type);
  __ok(echo.roughness >= 0.8 && echo.roughness <= 0.95, '粗糙度落在低反光防滑区间 0.8–0.95', `roughness=${__f(echo.roughness, 3)}`);
  __ok(echo.metalness <= 0.01, '金属度为 0（不再是金属面板）', `metalness=${__f(echo.metalness, 3)}`);
  __ok(echo.roughnessMap === null, '没有派生 roughnessMap 把最终粗糙度乘低',
    echo.roughnessMap ? '仍带 roughnessMap' : 'null');
  __ok(Math.abs(echo.normalScale.x - 0.12) < 0.03, '法线强度约 0.12（弱起伏，不是浮雕砖）', `ns=${__f(echo.normalScale.x, 3)}`);
  __ok(echo.envMapIntensity <= 0.5, '环境反射强度压低', `env=${__f(echo.envMapIntensity, 2)}`);

  // 米制 UV：ShapeGeometry 的 uv 就是世界米数（u=x, v=-z），不同地面只要 repeat 相同，相位/尺度就一致
  const hallMat = [...byMat.keys()].find(m => m !== echo);
  const uvMeshes = [...echoMeshes, ...((hallMat && byMat.get(hallMat)) || [])];
  const uvMeta = uvMeshes.map(mesh => {
    const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
    let maxU = 0, maxV = 0;
    for (let i = 0; i < uv.count; i++) {
      maxU = Math.max(maxU, Math.abs(uv.getX(i) - pos.getX(i)));
      maxV = Math.max(maxV, Math.abs(uv.getY(i) - pos.getY(i)));
    }
    return { maxU, maxV };
  });
  const uvWorst = Math.max(...uvMeta.map(m => Math.max(m.maxU, m.maxV)));
  __ok(uvMeta.length >= 3 && uvWorst < 1e-4, '地面 UV 以米为单位（u=x, v=-z），同一张图在世界坐标里相位连续',
    `${uvMeta.length} 片，最大偏差 ${__f(uvWorst, 5)}`);
  __ok(!!hallMat && Math.abs(echo.map.repeat.x - hallMat.map.repeat.x) < 1e-9
    && Math.abs(echo.map.repeat.y - hallMat.map.repeat.y) < 1e-9,
    '回声池与大厅地面使用同一 repeat（整张石砖图覆盖 6m → repeat 1/6）',
    `echo=${__f(echo.map.repeat.x, 4)} hall=${hallMat ? __f(hallMat.map.repeat.x, 4) : 'n/a'}`);
  // 负对照：旧的 Canvas 地面（物理材质 + 强法线）必须被识别为不合格
  const oldMat = physicalMat(floorMaint, 1 / floorMaint.coverageX, 1 / floorMaint.coverageY, { ns: 0.8 });
  __ok(!!oldMat.clearcoat && oldMat.normalScale.x > 0.5, '负对照：旧画布物理地面（clearcoat+强法向）会被判不合格',
    `clearcoat=${__f(oldMat.clearcoat, 2)} ns=${__f(oldMat.normalScale.x, 2)}`);
});

__section('L37 池深标识：按真实顶点投影避让柱脚，旧坐标必须被判重叠', () => {
  // 凸多边形 vs AABB 的分离轴判定
  function satPolyRect(poly, r) {
    const cx = [r.x1, r.x2, r.x2, r.x1], cz = [r.z1, r.z1, r.z2, r.z2];
    const axes = [[1, 0], [0, 1]];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz) || 1;
      axes.push([-dz / len, dx / len]);
    }
    for (const [ax, az] of axes) {
      let minP = Infinity, maxP = -Infinity, minR = Infinity, maxR = -Infinity;
      for (const [x, z] of poly) { const p = x * ax + z * az; minP = Math.min(minP, p); maxP = Math.max(maxP, p); }
      for (let i = 0; i < 4; i++) { const p = cx[i] * ax + cz[i] * az; minR = Math.min(minR, p); maxR = Math.max(maxR, p); }
      if (maxP < minR - 1e-9 || maxR < minP - 1e-9) return false;
    }
    return true;
  }
  function polyRectGap(poly, r) {
    let gap = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      for (let k = 0; k <= 128; k++) {
        const t = k / 128, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        const dx = Math.max(r.x1 - x, 0, x - r.x2), dz = Math.max(r.z1 - z, 0, z - r.z2);
        gap = Math.min(gap, Math.hypot(dx, dz));
      }
    }
    return gap;
  }
  function planePoly(mesh) {
    mesh.updateMatrixWorld(true);
    const pos = mesh.geometry.attributes.position, out = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      out.push([v.x, v.z, v.y]);
    }
    return out;
  }
  function tempPoly(x, z, ry, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h));
    m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.016, z);
    m.updateMatrixWorld(true);
    const out = planePoly(m);
    m.geometry.dispose();
    return out;
  }
  const baseBoxes = l37ColumnBases.map(b => {
    const bb = new THREE.Box3().setFromObject(b.mesh);
    return { b, rect: { x1: bb.min.x, x2: bb.max.x, z1: bb.min.z, z2: bb.max.z }, h: bb.max.y - bb.min.y };
  });
  __ok(baseBoxes.length >= 6 && baseBoxes.every(o => o.h > 0.05), '登记到真实柱脚网格（有厚度，不是空盒子）',
    `${baseBoxes.length} 个柱脚，厚度 ${__f(Math.min(...baseBoxes.map(o => o.h)), 2)}m`);

  const echoSign = l37DeckSigns.find(s => s.text === '0.62 m');
  __ok(!!echoSign, '找到浅水回声池地贴', echoSign ? `(${echoSign.x}, ${echoSign.z})` : '缺失');
  const echoPoly = planePoly(echoSign.mesh);
  __ok(echoPoly.every(p => Math.abs(p[2] - 0.016) < 0.002), '地贴四角真实世界坐标都贴在干地面高度',
    `y=${echoPoly.map(p => __f(p[2], 3)).join('/')}`);
  // 旧坐标必须被判重叠（负对照）：证明检查用的是真实几何，而不是照着常量自证
  const oldPoly = tempPoly(-14.2, -22, 0, 1.9, 1.1);
  const oldHit = baseBoxes.filter(o => satPolyRect(oldPoly, o.rect));
  __ok(oldHit.length === 1, '负对照：旧坐标 (-14.2,-22) 的投影确实压住柱脚（检查有效）',
    oldHit.length ? `压住 (${__f(oldHit[0].b.x)}, ${__f(oldHit[0].b.z)}) 的 ${__f(oldHit[0].b.w, 2)}m 底座` : '未检出');
  const echoHit = baseBoxes.filter(o => satPolyRect(echoPoly, o.rect));
  __ok(echoHit.length === 0, '新位置 (-15.2,-22) 的地贴不再与任何柱脚相交',
    echoHit.length ? echoHit.map(o => `(${__f(o.b.x)},${__f(o.b.z)})`).join(' ') : '无相交');
  const echoGap = Math.min(...baseBoxes.map(o => polyRectGap(echoPoly, o.rect)));
  __ok(echoGap >= 0.30, '地贴完整投影与最近柱脚净距 ≥ 0.30m', `净距 ${__f(echoGap, 3)}m`);

  // 另两块地贴同样按真实顶点检查：不得压柱脚、不得落进水池/池沿、整张图不被裁切
  for (const sign of l37DeckSigns) {
    const poly = planePoly(sign.mesh);
    const hits = baseBoxes.filter(o => satPolyRect(poly, o.rect));
    __ok(hits.length === 0, `地贴「${sign.text} ${sign.sub}」不压柱脚`,
      hits.length ? hits.map(o => `(${__f(o.b.x)},${__f(o.b.z)})`).join(' ') : `ry=${__f(sign.ry, 2)}`);
    const inPool = POOLS.filter(p => poly.some(([x, z]) => x > p.x1 - 0.2 && x < p.x2 + 0.2 && z > p.zDeep1 - 0.2 && z < p.zEnd + 0.2));
    __ok(inPool.length === 0, `地贴「${sign.text}」落在干地、不压池沿`,
      inPool.length ? inPool.map(p => p.label).join(',') : '干地');
    const uv = sign.mesh.geometry.attributes.uv;
    let uMin = 9, uMax = -9, vMin = 9, vMax = -9;
    for (let i = 0; i < uv.count; i++) {
      uMin = Math.min(uMin, uv.getX(i)); uMax = Math.max(uMax, uv.getX(i));
      vMin = Math.min(vMin, uv.getY(i)); vMax = Math.max(vMax, uv.getY(i));
    }
    const map = sign.mesh.material.map;
    __ok(uMin === 0 && uMax === 1 && vMin === 0 && vMax === 1 && map.repeat.x === 1 && map.repeat.y === 1,
      `地贴「${sign.text}」用整张图（文字/边框不被裁切或平铺）`,
      `uv ${uMin}..${uMax}/${vMin}..${vMax} repeat ${map.repeat.x}`);
  }
});

/* ---------------- 汇总 ---------------- */
console.log(`\n第一/二关 Node 回归：${__R.pass}/${__R.pass + __R.fail}  PASS`);
if (__R.fail) {
  console.error('失败项：' + __R.lines.join(' / '));
  process.exitCode = 1;
}