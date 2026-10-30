/* ============ 第三关纯 Node 断言（真实函数、真实 vendor THREE） ============
   只桩化渲染器/音频/图片解码/DOM；几何、碰撞、AI、材质、灯数全部跑真实实现。 */
const __R = [];
let __fail = 0;
const check = (cond, label, extra = '') => {
  __R.push((cond ? '✓ ' : '✗ ') + label + (extra ? '  [' + extra + ']' : ''));
  if (!cond) __fail++;
};
const T = (name, fn) => {
  try { fn(); } catch (e) { __fail++; __R.push('✗ ' + name + ' 抛异常: ' + e.message + ' @' + String(e.stack || '').split('\n')[1]); }
};
const f2 = v => Math.round(v * 100) / 100;
const f3 = v => Math.round(v * 1000) / 1000;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

const mkBox = obj => { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); };
// collideCircle 返回解算后的 [x,z]：位移非零即说明被挡（不能当 bool 用）
const playerBlockedAt = (x, z, r) => { const p = collideCircle(x, z, r); return Math.hypot(p[0] - x, p[1] - z) > 1e-9; };

const quit = () => { l3State.nextFlicker = l3State.nextPass = l3State.nextTrainSound = l3State.nextScreen = 1e6;
  l3State.nextDrip = l3State.nextClank = l3State.nextPA = 1e6; l3State.dark = false; l3State.passing = false; };
const place = (x, z, y = 0) => {
  keys.clear(); player.x = x; player.z = z; player.y = y; player.vy = 0; player.grounded = true;
  playerCrouch = false; crouchH = 1;
};
const lookAtWorld = (x, z) => {
  camera.position.set(player.x, player.y + EYE, player.z);
  camera.lookAt(x, player.y + EYE, z);
  camera.updateMatrixWorld(true);
  camera.getWorldDirection(_look);
};
const spawnAI = (mode, count, npcX, npcZ, plX, plZ, plY = 0) => {
  resetL3State(); quit(); l3TicketCount = count;
  Object.assign(l3State, {
    entityOn: true, entityT: 0, lookT: 0, mode, patrolDir: 1, patrolX: L3_OX + L3_CONDUCTOR_X,
    chaseT: 9, inspectT: 0, stepT: 10, coolT: 0, yieldT: 0, lostT: 0, stuckT: 0,
    sideFrom: null, sideTo: null, detourSign: null,
  });
  l3Entity.position.set(npcX, 0, npcZ); l3Entity.visible = true;
  place(plX, plZ, plY); lookAtWorld(npcX, npcZ);
};
// 逐帧跑 AI，返回统计
const runAI = (frames, dt = 1 / 60) => {
  const st = { inspects: 0, maxStep: 0, maxSide: 0, modes: {}, last: l3State.mode, xs: [] };
  const x0 = l3Entity.position.x, z0 = l3Entity.position.z;
  let px = l3Entity.position.x, pz = l3Entity.position.z;
  for (let i = 0; i < frames; i++) {
    updateConductorAI(dt);
    const x = l3Entity.position.x, z = l3Entity.position.z;
    st.maxStep = Math.max(st.maxStep, Math.hypot(x - px, z - pz)); px = x; pz = z;
    if (l3State.mode === 'inspect' && st.last !== 'inspect') st.inspects++;
    st.last = l3State.mode;
    st.modes[l3State.mode] = (st.modes[l3State.mode] || 0) + 1;
    st.maxSide = Math.max(st.maxSide, Math.abs(x - x0));
    st.xs.push(x);
  }
  st.moved = dist2(px, pz, x0, z0);
  return st;
};
const countLayer2Lights = () => {
  let n = 0;
  scene.traverseVisible(o => { if (o.isLight && o.layers.test(camera.layers)) n++; });
  return n;
};

const ORIG_RANDOM = Math.random;
Math.random = () => 0.5;                    // 确定性：不触发随机刷怪/闪烁

T('进入第三关', () => {
  enterLevel3(true);
  quit();
  check(camera.layers.mask === (1 << STATION_LAYER), '相机切换到第三关渲染层');
  check(COLLIDERS_L3.length > 30, '第三关静态碰撞表已就绪', 'n=' + COLLIDERS_L3.length);
  check(!!l3Train, '末班列车实例存在');
  check(near(L3_OX, 180, 1e-9), '关卡 X 偏移 L3_OX=180（与其他层共用坐标系）');
});

/* ── 1. 北端通道：整段车体扫掠 vs 所有静态碰撞盒 + 真实建筑网格 ── */
// 第三关网格挂在 L3_OX 偏移的组里：只 updateMatrixWorld 自己会漏掉祖先矩阵，
// 车体会静默地量成局部坐标（x≈6）从而和世界坐标碰撞盒（x≈186）永不相交——测试会假通过。
const worldBox = obj => { scene.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); };
const sweepWorst = () => {
  const cols = COLLIDERS_L3.filter(c => !c.train && !c.poolSide && !c.metroBoardEdge);
  const zSaved = l3Train.position.z;
  const out = { worstD: 0, info: null, tested: 0 };
  for (let z = -110; z <= 0.0001; z += 1) {
    l3Train.position.z = z;
    const b = worldBox(l3Train);
    out.tested += cols.length;
    for (const c of cols) {
      const y1 = c.y1 == null ? -2.2 : c.y1, y2 = c.y2 == null ? 2.6 : c.y2;
      if (b.max.y < y1 + 0.02 || b.min.y > y2 - 0.02) continue;
      const ox = Math.min(b.max.x, c.x2) - Math.max(b.min.x, c.x1);
      const oz = Math.min(b.max.z, c.z2) - Math.max(b.min.z, c.z1);
      if (ox <= 0 || oz <= 0) continue;
      const d = Math.min(ox, oz);
      if (d > out.worstD) { out.worstD = d; out.info = { z, col: JSON.stringify(c), carX: [f2(b.min.x), f2(b.max.x)] }; }
    }
  }
  l3Train.position.z = zSaved; worldBox(l3Train);
  return out;
};

T('车体扫掠净空', () => {
  const s = sweepWorst();
  check(s.tested > 5000, '扫掠逐位置对比了全部静态碰撞盒（111 个位置）', 'comparisons=' + s.tested);
  check(s.worstD <= 0.0001, '北端通道全段扫掠无穿模（车体 vs 静态碰撞盒）',
    s.info ? '最深重叠 ' + f2(s.worstD) + 'm @z' + s.info.z + ' car=' + s.info.carX.join('..') + ' col=' + s.info.col : '干净');
  // 阴性对照：人为塞一个明显侵入车体的碰撞盒，扫掠必须抓得到（否则这套检测就是空转）
  COLLIDERS_L3.push({ x1: L3_OX + 5.0, x2: L3_OX + 6.9, z1: -30, z2: -28, y1: 0, y2: 3 });
  const neg = sweepWorst();
  COLLIDERS_L3.pop();
  check(neg.worstD >= 0.5, '阴性对照：故意侵入的碰撞盒会被扫掠抓到', 'overlap=' + f2(neg.worstD));

  const car = worldBox(l3Train);
  check(car.min.x > 150 && car.max.x < 210, '车体包围盒是世界坐标（L3_OX 偏移生效）', 'x=' + f2(car.min.x) + '..' + f2(car.max.x));

  // 真实建筑网格（不能只信碰撞盒）
  const names = ['l3NorthRoomEastWall', 'l3NorthRoomFloor', 'l3NorthRoomNorthWall', 'l3NorthRoomCeiling'];
  const missing = names.filter(n => !scene.getObjectByName(n));
  check(missing.length === 0, '维修间四个建筑网格已具名存在于场景', missing.length ? '缺 ' + missing.join(',') : '');
  const wall = scene.getObjectByName('l3NorthRoomEastWall');
  const wb = worldBox(wall);
  check(wb.max.x <= L3_OX + 5.90 + 0.001, '东墙网格最外表面 ≤5.90（世界 185.90）', 'max.x=' + f2(wb.max.x));
  check(car.min.x - wb.max.x >= 0.02, '东墙网格与车体网格留有空隙（旧版重叠 0.5m）', 'gap=' + f2(car.min.x - wb.max.x));

  // 维修间整簇网格（墙/地/顶/断路器/柜体/铭牌）逐一检查是否侵入车体扫掠带
  const swept = new THREE.Box3(new THREE.Vector3(car.min.x, 0.06, -120.5), new THREE.Vector3(car.max.x, 3.15, 10.5));
  const hits = [];
  let considered = 0;
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    for (let p = o; p; p = p.parent) if (p === l3Train) return;
    const b = new THREE.Box3().setFromObject(o);
    const cz = (b.min.z + b.max.z) / 2, cx = (b.min.x + b.max.x) / 2;
    if (cz < -35 || cz > -23 || cx < 178 || cx > 187) return;          // 只看维修间簇
    considered++;
    if (b.intersectsBox(swept)) hits.push((o.name || '(未命名)') + ' x' + f2(b.min.x) + '..' + f2(b.max.x) + ' z' + f2(b.min.z) + '..' + f2(b.max.z));
  });
  check(considered >= 6, '维修间簇内确实取到了真实建筑网格（非空跑）', 'considered=' + considered);
  check(hits.length === 0, '维修间簇内没有任何网格侵入车体扫掠带', hits.slice(0, 3).join(' | '));

  const roomWall = COLLIDERS_L3.find(c => near(c.x1, L3_OX + 5.35, 1e-6) && near(c.x2, L3_OX + 5.95, 1e-6));
  check(!!roomWall, '维修间东墙碰撞盒已随墙体西移（世界 185.35..185.95）',
    roomWall ? '' : '没找到；现有 x1∈[184,187]: ' + COLLIDERS_L3.filter(c => c.x1 > 184 && c.x1 < 187).map(c => f2(c.x1)).join(','));
});

/* ── 2. 维修间可达性：用真实 updatePlayer 走进去 ── */
T('维修间可达性', () => {
  resetL3State(); quit(); Math.random = () => 0.5;
  const tx = L3_OX + 2, tz = -30;
  check(near(groundAt(tx, tz), 0, 0.001), '维修间地面高度为 0', 'y=' + f2(groundAt(tx, tz)));
  check(!playerBlockedAt(tx, tz, 0.34), '车票落点不在任何碰撞盒内');
  // yaw=0 → _fwd=(0,0,-1)，从站台北端一路按 W 走进维修间（门洞 x0..3 不能被墙堵）
  place(tx, -22.5); yaw = 0; keys.add('KeyW');
  let arrived = false, maxStep = 0, prev = player.z, prevX = player.x;
  for (let i = 0; i < 240; i++) {
    updatePlayer(1 / 60);
    maxStep = Math.max(maxStep, Math.hypot(player.x - prevX, player.z - prev));
    prev = player.z; prevX = player.x;
    if (player.z <= tz + 0.5) { arrived = true; break; }
  }
  keys.clear();
  check(arrived, '玩家能真实走进维修间（门洞未被东墙挤死）', 'z=' + f2(player.z));
  check(Math.abs(player.x - tx) < 0.6, '行走途中没有被门框挤离', 'x=' + f2(player.x));
  check(maxStep < 0.12, '行走过程无瞬移（单帧位移 < 0.12m）', 'maxStep=' + f3(maxStep));
  check(near(groundAt(player.x, player.z), 0, 0.001), '站在维修间地面上', 'y=' + f2(groundAt(player.x, player.z)));
});

/* ── 3. 检票员：10~12m 死区不再无限停查 ── */
T('11m 死区', () => {
  // (a) 背向巡逻：11m 静止注视 6s，一次都不该停
  spawnAI('patrol', 1, L3_OX + L3_CONDUCTOR_X, 0, L3_OX + L3_CONDUCTOR_X, 11);
  l3State.patrolDir = -1;
  const a = runAI(360);
  check(a.inspects === 0, '11m 静止注视 6s 不反复停查（旧版吹哨 4 次）', 'inspects=' + a.inspects);
  check(a.moved > 3, '同时仍在正常巡逻（旧版仅移动 0.06m）', 'moved=' + f2(a.moved) + 'm');
  check(a.maxStep <= 0.9 * (1 / 60) * 6 + 1e-9, '巡逻位移平滑，无跳变', 'maxStep=' + f3(a.maxStep));

  // (b) 10.6m 朝向玩家：先继续走，走进 9m 内才停一次
  spawnAI('patrol', 1, L3_OX + L3_CONDUCTOR_X, 0, L3_OX + L3_CONDUCTOR_X, 10.6);
  l3State.patrolDir = 1;
  const b = runAI(90);
  check(b.inspects === 0, '10.6m 处不会立刻停下查票（旧版 dist<12 立即 inspect）', 'inspects=' + b.inspects);
  check(b.moved > 1.0, '死区里继续靠近玩家而不是原地空转', 'moved=' + f2(b.moved) + 'm');

  // (c) patr​olDir=+1 从 11m 靠近 6s：只停查一次，随后进入追逐/抓捕
  spawnAI('patrol', 1, L3_OX + L3_CONDUCTOR_X, 0, L3_OX + L3_CONDUCTOR_X, 11);
  l3State.patrolDir = 1;
  const s0 = stats.scares;
  const c = runAI(360);
  check(c.inspects >= 1 && c.inspects <= 2, '靠近过程只停查 1~2 次（不是每 1.6s 一次）', 'inspects=' + c.inspects);
  const caught = stats.scares > s0 || !l3State.entityOn;
  check(c.modes.chase > 0 || caught, '停查结束后转入追逐/抓捕', 'mode=' + l3State.mode + ' chase帧=' + (c.modes.chase || 0));
});

/* ── 4. 三票通过：让行是真实侧移，之后进入冷却不再复查 ── */
T('三票冷却', () => {
  spawnAI('inspect', 3, L3_OX + L3_CONDUCTOR_X, 0, L3_OX + L3_CONDUCTOR_X, 3);
  let guard = 0;
  while (l3State.mode === 'inspect' && guard++ < 300) updateConductorAI(1 / 60);
  check(l3State.mode === 'yield', '三票查验通过后进入平滑让行', 'mode=' + l3State.mode);
  const y = runAI(120);
  check(y.maxSide > 0.3, '让行时有真实横移（不是原地瞬移）', 'maxSide=' + f2(y.maxSide) + 'm');
  check(y.maxSide < 2.2, '横移量受控（旧版 1.5m 生硬侧移）', 'maxSide=' + f2(y.maxSide));
  check(y.maxStep <= CONDUCTOR_AI.sideStep / CONDUCTOR_AI.sideStepTime * 1.5 / 60 * 1.10 + 1e-9,
    '让行逐帧位移受 smoothstep 速度上限约束', 'maxStep=' + f3(y.maxStep));
  const after = runAI(240);
  check(after.modes.yield || after.modes.patrol, '让行结束后回到巡逻', 'modes=' + JSON.stringify(after.modes));
  check(after.inspects === 0, '放行后冷却期内不再重复停查', 'inspects=' + after.inspects);
  check(l3TicketCount === 3, '放行不扣票');
});

/* ── 5. 视线遮挡：立柱挡、夹层栏板不挡、楼梯栏杆挡、矮家具不挡 ── */
T('视线遮挡', () => {
  check(l3SightBlocked(L3_OX - 3.35, -20, L3_OX + 3.4, -20), '中轴立柱挡住地面视线（旧版忽略 y=2.6 默认值）');
  check(!l3SightBlocked(L3_OX + 1.5, 2.0, L3_OX + 1.5, 6.0), '夹层栏板（y4.6..8.6）不再挡住地面视线（旧版误判）');
  const westRail = COLLIDERS_L3.find(c => near(c.x1, L3_OX - 2.08, 1e-6) && near(c.y2, 6.1, 1e-6));
  check(!!westRail, '西楼梯栏杆碰撞盒存在（世界 177.92..178, y0..6.1）');
  check(l3SightBlocked(L3_OX - 3.35, 11.5, L3_OX - 1.9, 11.5), '西楼梯栏杆在眼高处确实遮挡');
  check(!l3SightBlocked(L3_OX - 3.35, -6, L3_OX - 1.9, -6), '空站台无遮挡');
  const bench = COLLIDERS_L3.find(c => near(c.x1, L3_OX + 1.55, 1e-6) && near(c.y2, 1.0, 1e-6));
  check(!!bench, '长椅碰撞盒带真实高度 y0..1.0（旧版无高度=整墙）', bench ? 'z' + f2(bench.z1) + '..' + f2(bench.z2) : '');
  check(!l3SightBlocked(L3_OX + 0.6, -20, L3_OX + 3.9, -20), '1.0m 高的长椅不再挡住 1.62m 眼高视线');
  const bin = COLLIDERS_L3.find(c => c.y2 != null && near(c.y2, 0.86, 1e-6) && c.x1 < L3_OX);
  check(!!bin, '垃圾桶碰撞盒带真实高度 y0..0.86', bin ? 'x' + f2(bin.x1) : '');
});

/* ── 6. 抓人必须真的看见且够得着 ── */
T('抓人条件', () => {
  const s0 = stats.scares;
  spawnAI('chase', 1, L3_OX - 2.65, 11.5, L3_OX - 1.9, 11.5, 2.3214);
  runAI(1);
  check(stats.scares === s0 && l3State.entityOn, '隔西栏杆且玩家在高处不会被抓（旧版 URL 保护绕过）', 'Δscares=' + (stats.scares - s0));
  check(near(player.x, L3_OX - 1.9, 1e-6), '玩家没有被错误复位');
  const s1 = stats.scares;
  spawnAI('chase', 1, L3_OX - 3.35, 0, L3_OX - 3.35, 1.0);
  runAI(1);
  check(stats.scares === s1 + 1, '平地贴身且视线畅通仍然会抓', 'Δscares=' + (stats.scares - s1));
});

/* ── 7. 移动：单步不超请求、楼梯井不瞬移、薄墙不穿越、永不在实体里 ── */
T('移动与碰撞', () => {
  resetL3State(); quit(); Math.random = () => 0.5;
  l3Entity.position.set(L3_OX - 0.5, 0, 7.49);
  const want = Math.hypot(0.04, 0.05);
  const moved = moveConductor(0.04, 0.05);
  check(moved <= want + 1e-9, '单步位移不超过请求位移（旧版瞬移 2.05m）', 'moved=' + f3(moved) + ' want=' + f3(want));
  check(dist2(l3Entity.position.x, l3Entity.position.z, L3_OX - 0.5, 7.49) <= want + 1e-9, '位置只在请求距离内变化');

  check(!!conductorSolid(L3_OX, 12, CONDUCTOR_BODY_R), '中央楼梯井被显式当作障碍（台阶没有 step collider）');
  l3Entity.position.set(L3_OX - 2.0, 0, 8.5);
  moveConductor(2.0, 0);
  check(l3Entity.position.x <= L3_OX - 1.5, '不会横穿楼梯井', 'x=' + f2(l3Entity.position.x - L3_OX));

  l3Entity.position.set(L3_OX - 3.35, 0, 12);
  moveConductor(1.0, 0);
  check(l3Entity.position.x <= L3_OX - 2.52 + 1e-6, '暗中 1m 大步被切成小步，未穿过 0.08m 薄栏杆', 'x=' + f2(l3Entity.position.x - L3_OX));

  l3Entity.position.set(L3_OX - 3.35, 0, 0);
  let inside = 0, maxStep = 0;
  for (let i = 0; i < 900; i++) {
    const a = (i * 2.399963) % (Math.PI * 2), d = 0.12;
    maxStep = Math.max(maxStep, moveConductor(Math.cos(a) * d, Math.sin(a) * d));
    if (conductorSolid(l3Entity.position.x, l3Entity.position.z)) inside++;
  }
  check(inside === 0, '随机游走 900 步后从未停在实体内部', 'inside=' + inside);
  check(maxStep <= 0.12 + 1e-9, '每步位移受限于请求长度', 'max=' + f3(maxStep));

  check(near(CONDUCTOR_BODY_R, 0.44, 1e-6), '碰撞半径等于外套轮廓半径', 'r=' + CONDUCTOR_BODY_R);
  check(!!conductorSolid(L3_OX + 0.77, -20, CONDUCTOR_BODY_R), '中心距柱 0.77m 判定接触（旧版 0.32 判定不接触）');
  check(!conductorSolid(L3_OX + 0.90, -20, CONDUCTOR_BODY_R), '中心距柱 0.90m 判定不接触');
});

/* ── 8. 步态：dt/位移驱动、idle 复位、不原地空转 ── */
T('步态', () => {
  const u = l3Entity.userData;
  u.gait = 0; l3Entity.position.set(L3_OX - 3.35, 0, 0);
  moveConductor(0, 0);
  check(near(u.gait, 0, 1e-12), '零位移不推进步态相位（旧版用绝对时间）');
  moveConductor(0, 0.62);
  check(Math.abs(u.gait - Math.PI) < 1e-6, '一个步距 0.62m 推进半周期 π', 'Δgait=' + f3(u.gait));
  u.gait = Math.PI / 2;                    // sin=1 才有摆幅；gait=π 时 sin(π)=0 本来就是站立相位
  animateConductor(l3Entity, 1 / 60, 'walk', 1.0);
  check(Math.abs(u.legL.rotation.x) > 0.1, '行走时腿真实摆动');
  for (let i = 0; i < 90; i++) animateConductor(l3Entity, 1 / 60, 'idle', 0);
  check(Math.abs(u.legL.rotation.x) < 1e-3 && Math.abs(u.armL.rotation.x) < 1e-3,
    'idle 后四肢回到静止姿态（不再僵在半空）', 'leg=' + f3(u.legL.rotation.x));
  check(u.clock > 1.4, 'idle 计时按 dt 累积', 'clock=' + f2(u.clock));
});

/* ── 9. 模型结构：矩阵先更新，再量真实几何 ── */
T('模型与材质', () => {
  const g = buildConductor();
  g.updateMatrixWorld(true);                // 否则祖先 matrixWorld 未更新，子件会误报在 y=-0.84
  const u = g.userData;
  let gap = 0;
  for (const lg of [u.legL, u.legR]) {
    const bs = lg.children.map(k => new THREE.Box3().setFromObject(k));
    for (let i = 0; i + 1 < bs.length; i++) gap = Math.max(gap, bs[i].min.y - bs[i + 1].max.y);
  }
  check(gap <= 0.001, '腿→膝→鞋三段相接，无 0.18m 断档', 'gap=' + f3(gap));
  const shoeY = Math.min(new THREE.Box3().setFromObject(u.legL.children[2]).min.y,
    new THREE.Box3().setFromObject(u.legR.children[2]).min.y);
  check(Math.abs(shoeY) < 0.03, '鞋底贴合地面', 'y=' + f3(shoeY));

  const handR = u.foreR.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry');
  const hw = handR.getWorldPosition(new THREE.Vector3());
  const lw = u.lantern.getWorldPosition(new THREE.Vector3());
  check(Math.hypot(hw.x - lw.x, hw.y - lw.y, hw.z - lw.z) < 0.30, '手与提灯相连（旧版 x .26→.50 悬空 0.24m）',
    'd=' + f2(Math.hypot(hw.x - lw.x, hw.y - lw.y, hw.z - lw.z)));
  check(u.lantern.parent === u.armR, '提灯挂在右臂骨骼上，随臂摆动');
  check(Math.hypot(lw.x, lw.z) > 0.44, '提灯位于外套轮廓之外，不被衣身包住', 'r=' + f2(Math.hypot(lw.x, lw.z)));

  // 颈与头取真实网格
  const neck = g.children.find(c => c.geometry && c.geometry.type === 'CylinderGeometry' && near(c.geometry.parameters.height, 0.20, 1e-6));
  const head = g.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && near(c.geometry.parameters.radius, 0.13, 1e-6));
  check(!!neck && !!head, '颈柱与头部网格存在');
  check(neck.geometry.parameters.height > 0.1 && neck.position.y + neck.geometry.parameters.height / 2 >= head.position.y - 0.14,
    '颈顶与头底相接（旧版胸顶 1.96 与头底 1.83 重叠且无颈）',
    'neckTop=' + f2(neck.position.y + neck.geometry.parameters.height / 2) + ' headBottom=' + f2(head.position.y - 0.14));

  // 纽扣：按真实半径 0.018 区分（旧筛法 radius<0.03 会把两颗眼睛算进来）
  const btns = g.children.filter(c => c.geometry && c.geometry.type === 'SphereGeometry' && near(c.geometry.parameters.radius, 0.018, 1e-6));
  const buried = btns.filter(b => {
    const r = 0.26 + (1.825 - b.position.y) / 1.35 * 0.18;   // 锥形衣身在该高度的半径
    return b.position.z < r - 0.004;
  });
  check(btns.length === 4 && buried.length === 0, '四颗纽扣全部浮在锥形衣身表面', 'n=' + btns.length + ' buried=' + buried.length);

  // 材质物理尺度：uniform-wool 每 0.45m 一张
  const tile = (mat, meters, label) => {
    const expect = Math.max(0.06, Math.round(meters / 0.45 * 100) / 100);
    const got = mat.map ? mat.map.repeat.x : NaN;
    check(near(got, expect, 0.011), label + ' 纹理按物理尺寸换算', 'repeat=' + got + ' 期望' + expect);
  };
  tile(u.coat.material, 2.20, '衣身');
  const chest = g.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && near(c.geometry.parameters.radius, 0.20, 1e-6));
  tile(chest.material, 1.26, '胸球');
  tile(u.legL.children[2].material, 0.27, '鞋');
  check(chest.material !== u.coat.material && u.legL.children[0].material !== u.coat.material,
    '胸球/袖裤/鞋各自独立尺度，不再共用衣身纹理');
  check(u.coat.material.normalScale.x <= 0.45, '布料法线强度已收弱（旧版 auto .8 偏死）', 'ns=' + f2(u.coat.material.normalScale.x));

  const skin = head.material;
  check(near(skin.map.repeat.x, 1.3, 1e-9), '脸部裂纹 repeat 降到 1.3，不再被切碎', 'repeat=' + skin.map.repeat.x);
  check(skin.color.getHexString() === 'c3c8bd', '死皮保持浅色（sRGB #c3c8bd），不再乘成黑石', '#' + skin.color.getHexString());
  check(skin.emissive.getHex() === 0, '脸部没有整体自发光（emissive 为纯黑）', '#' + skin.emissive.getHexString());
});

/* ── 10. 灯数：固定 26 盏，出/退场都不变 ── */
T('灯数稳定', () => {
  resetL3State();
  updateConductorLight();
  const off = countLayer2Lights();
  let groupLights = 0; l3Group.traverse(o => { if (o.isLight) groupLights++; });
  check(off === 26, '第三关第 2 渲染层固定 26 盏灯', 'layer2=' + off + ' (组内 ' + groupLights + ')');
  l3State.entityOn = true; l3Entity.visible = true; l3Entity.position.set(L3_OX - 3.35, 0, 0);
  updateConductorLight();
  check(countLayer2Lights() === off, '检票员出现不新增参与渲染的灯光', off + ' → ' + countLayer2Lights());
  check(l3Entity.userData.llight.parent === scene, '提灯挂在 scene 根（不随第三关组重算层）');
  l3State.entityOn = false; l3Entity.visible = false;
  updateConductorLight();
  check(countLayer2Lights() === off && l3Entity.userData.llight.intensity === 0, '退场只熄提灯，灯数不变');
});

/* ── 11. 实例化静态网格：几何 boundingBox × matrixWorld × instanceMatrix，逐实例验扫掠 ── */
T('实例化网格', () => {
  const car = worldBox(l3Train);
  check(car.min.x > 150, '实例化检查用世界坐标车体（L3_OX 偏移生效）', 'x=' + f2(car.min.x) + '..' + f2(car.max.x));
  const swept = new THREE.Box3(new THREE.Vector3(car.min.x, 0.06, -120.5), new THREE.Vector3(car.max.x, 3.15, 10.5));
  scene.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), wm = new THREE.Matrix4(), tmp = new THREE.Box3();
  let meshes = 0, inst = 0, own = 0, bad = null;
  scene.traverse(o => {
    if (!o.isInstancedMesh) return;
    // 车厢自身的实例化配件（顶棱/窗带/地板压条 24 组等）在车体内部天经地义，不能算穿模
    let onTrain = false;
    for (let p = o; p; p = p.parent) if (p === l3Train) { onTrain = true; break; }
    if (onTrain) { own += o.count; return; }
    meshes++;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      wm.multiplyMatrices(o.matrixWorld, m);
      tmp.copy(o.geometry.boundingBox).applyMatrix4(wm);
      inst++;
      // 只算真实穿插（>1mm）：站台边缘压条/门槛石正好切在车皮平面上属于零间隙贴合，不是穿模
      const ovx = Math.min(tmp.max.x, swept.max.x) - Math.max(tmp.min.x, swept.min.x);
      const ovy = Math.min(tmp.max.y, swept.max.y) - Math.max(tmp.min.y, swept.min.y);
      const ovz = Math.min(tmp.max.z, swept.max.z) - Math.max(tmp.min.z, swept.min.z);
      if (!bad && ovx > 0.001 && ovy > 0.001 && ovz > 0.001) bad = { n: o.name || '(未命名)', x: [f2(tmp.min.x), f2(tmp.max.x)], y: [f2(tmp.min.y), f2(tmp.max.y)], z: [f2(tmp.min.z), f2(tmp.max.z)], depth: f3(Math.min(ovx, ovy, ovz)) };
    }
  });
  check(meshes > 0 && inst > 1000, '实例化静态网格逐实例检查（排除车厢自身配件）', 'meshes=' + meshes + ' instances=' + inst + ' own=' + own);
  check(!bad, '没有任何车站实例几何体落进车体扫掠带', bad ? JSON.stringify(bad) : '干净');
});

/* ── 12. 复位：新增时序字段全部清零 ── */
T('复位', () => {
  Object.assign(l3State, { coolT: 9, yieldT: 3, lostT: 2, stuckT: 1, sideFrom: { x: 1, z: 1 }, sideTo: { x: 2, z: 2 }, detourSign: -1 });
  resetL3State();
  check(l3State.coolT === 0 && l3State.yieldT === 0 && l3State.lostT === 0 && l3State.stuckT === 0, '冷却/让行/丢失/卡死计时清零');
  check(l3State.sideFrom === null && l3State.sideTo === null && l3State.detourSign === null, '让行目标与绕行方向复位');
  check(!l3State.entityOn && !l3Entity.visible, '复位隐藏检票员');
});

/* ── 13. 站台垃圾桶：碰撞盒高度 vs 真实桶顶，以及 1.5m 视线不被挡 ──
   用的是场景里真实生成的碰撞盒（不塞合成 collider），几何侧则去站台实例/网格里
   按 XZ 找真实桶顶做交叉验证。桶真实高度 ≈0.855m，漏写 y1/y2 时会被
   l3SightBlocked 补成 [-2.2,2.6]，1.5m 视线就被三个垃圾桶挡死。 */
T('垃圾桶高度与视线', () => {
  const bins = [[4.6, -16], [4.6, 4], [-4.6, 12]];
  scene.updateMatrixWorld(true);
  // 桶位附近真实几何最高点（实例与普通网格都算）
  const geomTopAt = (cx, cz) => {
    const lim = 0.32;
    let top = null, found = 0;
    const m = new THREE.Matrix4(), wm = new THREE.Matrix4(), t = new THREE.Box3();
    scene.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      for (let p = o; p; p = p.parent) if (p === l3Train) return;
      if (o.isInstancedMesh) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m); wm.multiplyMatrices(o.matrixWorld, m);
          t.copy(o.geometry.boundingBox).applyMatrix4(wm);
          if (Math.abs((t.min.x + t.max.x) / 2 - cx) > lim || Math.abs((t.min.z + t.max.z) / 2 - cz) > lim) continue;
          found++; if (top === null || t.max.y > top) top = t.max.y;
        }
      } else {
        t.setFromObject(o);
        if (Math.abs((t.min.x + t.max.x) / 2 - cx) <= lim && Math.abs((t.min.z + t.max.z) / 2 - cz) <= lim) {
          found++; if (top === null || t.max.y > top) top = t.max.y;
        }
      }
    });
    return { top, found };
  };
  for (const [x, z] of bins) {
    const wx = L3_OX + x;
    const col = COLLIDERS_L3.find(c => !c.train
      && near(c.x1, wx - 0.3, 1e-6) && near(c.x2, wx + 0.3, 1e-6)
      && near(c.z1, z - 0.3, 1e-6) && near(c.z2, z + 0.3, 1e-6));
    check(!!col, '垃圾桶 (' + x + ',' + z + ') 有专属碰撞盒',
      col ? 'x' + f2(col.x1) + '..' + f2(col.x2) + ' z' + f2(col.z1) + '..' + f2(col.z2) : '未找到');
    check(!!col && col.y1 === 0 && col.y2 === 0.86, '垃圾桶 (' + x + ',' + z + ') 碰撞高度 0..0.86',
      col ? 'y=' + col.y1 + '..' + col.y2 + '（缺失时为 -2.2..2.6 整面墙）' : '');
    const g = geomTopAt(wx, z);
    check(g.found > 0 && g.top != null && Math.abs(g.top - 0.86) <= 0.02,
      '碰撞高度与真实桶顶一致（±2cm）', g.top == null ? '桶位附近没取到几何' : '几何顶=' + f3(g.top) + ' 件数=' + g.found);
    check(!l3SightBlocked(wx, z - 2, wx, z + 2, 1.5, 1.5), '1.5m 视线跨过垃圾桶 (' + x + ',' + z + ') 畅通');
    // 反向对照：同一位置把视线压到桶身高度内，必须被挡（证明上面一条不是因为整条线谁都扫不到）
    check(l3SightBlocked(wx, z - 2, wx, z + 2, 0.5, 0.5), '0.5m 低视线在桶身高度内仍被挡（对照）');
  }
});

Math.random = ORIG_RANDOM;
console.log('\n' + __R.join('\n'));
console.log('\n第三关 Node 回归：' + (__R.length - __fail) + '/' + __R.length + (__fail ? '  FAIL×' + __fail : '  PASS'));
if (__fail) process.exitCode = 1;
