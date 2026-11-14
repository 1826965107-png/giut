/* ============ 第四关重做 · 纯 Node 断言 ============================================
   真跑 vendor THREE / levels/level4-tunnel.js / levels/level4-art.js，
   只桩化渲染器、音频、图片解码与 DOM。移动一律走宿主真实 updatePlayer + collideCircle，
   交互一律走真实相机准星（camera.getWorldDirection）+ l4.interact()，
   不写任何"直接改数值"的假断言。

   本文件被 tools/check-level4-node.cjs 拼接到 backrooms-pool.html 的 module script 之后，
   因此可以直接使用宿主作用域：player / keys / yaw / pitch / camera / LEVEL / l4 /
   enterLevel4 / updatePlayer / collideCircle / groundAt / tryInteract / toggleFlash /
   updateFlashHud / respawnToLevelStart / syncCameraToPlayer / RADIUS / EYE / crouchH /
   ACTIVE_COLLIDERS / ACTIVE_BOUNDS / endScreenOpen / l4Completed / L4_SFX。
   ============================================================================ */
const __R4 = [];
let __fail4 = 0;
const check4 = (cond, label, extra = '') => {
  __R4.push((cond ? '✓ ' : '✗ ') + label + (extra ? '  [' + extra + ']' : ''));
  if (!cond) __fail4++;
};
const T4 = (name, fn) => {
  __R4.push('— ' + name);
  try { fn(); } catch (e) {
    __fail4++;
    __R4.push('✗ ' + name + ' 抛异常: ' + (e && e.message ? e.message : e));
  }
};
const f2 = (v) => Math.round(v * 100) / 100;
const f3 = (v) => Math.round(v * 1000) / 1000;

const LAY = L4_LAYOUT;
const CAR = LAY.car;
const SEAM = L4_SEAM;
const LX = (lx) => L4_OX + lx;                 // 本地 x → 世界 x
const snap4 = () => ({
  r: l4.renderInfo, light: l4.lightCount,
  cols: l4.colliders.length, kids: l4.group.children.length,
});

/* 摆位：真实宿主坐标系（yaw=π/2 面朝 -x，即面朝步道侧车门） */
const setPose = (lx, z, yawv = Math.PI / 2, pitchv = 0) => {
  player.x = LX(lx);
  player.z = z;
  player.y = l4 ? l4.groundAt(player.x, z) : 0;
  player.vy = 0;
  player.grounded = true;
  yaw = yawv;
  pitch = pitchv;
  crouchH = 1;
  playerCrouch = false;
  if (l4) syncCameraToPlayer();
  camera.updateMatrixWorld(true);
};

/* 真实瞄准：宿主 camera.rotation.order === 'YXZ'，所以 yaw/pitch 与视线方向一一对应 */
const aimAt = (wx, wy, wz) => {
  if (l4) syncCameraToPlayer();
  camera.updateMatrixWorld(true);
  const vx = wx - camera.position.x;
  const vy = wy - camera.position.y;
  const vz = wz - camera.position.z;
  yaw = Math.atan2(-vx, -vz);
  pitch = Math.atan2(vy, Math.hypot(vx, vz));
  if (l4) syncCameraToPlayer();
  camera.updateMatrixWorld(true);
  const d = new THREE.Vector3();
  camera.getWorldDirection(d);
  const len = Math.hypot(vx, vy, vz) || 1;
  return (vx * d.x + vy * d.y + vz * d.z) / len;
};

const item4 = (key) => l4.interactables.find((i) => i.key === key);
const aimItem = (key) => {
  const it = item4(key);
  if (!it) return false;
  const p = it.pos();
  return aimAt(p.x, p.y, p.z);
};
const pressE = (key) => { aimItem(key); return l4.interact(); };

/* 真实 WASD 行走：每帧把朝向对准路点并按住 W，位移全部交给 updatePlayer。
   中途不改 player.x/z，因此碰撞、台阶撤销、地面高度场、净高夹紧、接缝变换全走原实现。
   接缝帧允许一次整周期位移；相机同步误差分水平/竖直两路统计（竖直含真实走路 bob）。 */
const wasdTo = (targetLx, targetZ, opts = {}) => {
  const dt = opts.dt || 1 / 60;
  const maxFrames = opts.maxFrames || 9000;
  const tol = opts.tol || 0.12;
  const tx = LX(targetLx);
  let frames = 0, maxStep = 0, camErrXZ = 0, camErrY = 0, stuck = 0;
  let prevX = player.x, prevZ = player.z;
  let crosses = l4.seamState.crossings;
  let seamFrames = 0, zAtSeam = null;
  let seamCamYDelta = 0, seamRotDelta = 0, seamZShift = 0;
  keys.clear();
  keys.add('KeyW');
  if (opts.run) keys.add('ShiftLeft');
  if (opts.keys) for (const k of opts.keys) keys.add(k);
  while (frames++ < maxFrames) {
    const dx = tx - player.x, dz = targetZ - player.z;
    if (Math.hypot(dx, dz) < tol) break;
    yaw = Math.atan2(-dx, -dz);
    updatePlayer(dt);
    // 接缝帧必须只平移相机 z：高度（步态 bob）与朝向都不许被重置
    const camY0 = camera.position.y, camZ0 = camera.position.z;
    const rotX0 = camera.rotation.x, rotY0 = camera.rotation.y, rotZ0 = camera.rotation.z;
    l4.update(dt);
    const jump = Math.hypot(player.x - prevX, player.z - prevZ);
    const seam = l4.seamState.crossings !== crosses;
    if (seam) {
      crosses = l4.seamState.crossings;
      seamFrames++;
      zAtSeam = player.z;
      seamCamYDelta = Math.max(seamCamYDelta, Math.abs(camera.position.y - camY0));
      seamRotDelta = Math.max(seamRotDelta,
        Math.abs(camera.rotation.x - rotX0), Math.abs(camera.rotation.y - rotY0), Math.abs(camera.rotation.z - rotZ0));
      seamZShift = camera.position.z - camZ0;
    } else if (jump > maxStep) {
      maxStep = jump;
    }
    prevX = player.x; prevZ = player.z;
    camera.updateMatrixWorld(true);
    const exz = Math.max(Math.abs(camera.position.x - player.x), Math.abs(camera.position.z - player.z));
    const ey = Math.abs(camera.position.y - (player.y + EYE * crouchH));
    if (exz > camErrXZ) camErrXZ = exz;
    if (ey > camErrY) camErrY = ey;
    if (seam) stuck = 0;
    else if (jump < 1e-6) stuck++;
    else stuck = 0;
    if (stuck > 150) break;
    if (opts.stopOnSeam && seam) break;
  }
  keys.clear();
  return {
    frames, maxStep, camErrXZ, camErrY, seamFrames, zAtSeam, stuck,
    seamCamYDelta, seamRotDelta, seamZShift,
    lx: player.x - L4_OX, z: player.z, y: player.y,
    dist: Math.hypot(player.x - tx, player.z - targetZ),
    crossings: l4.seamState.crossings,
    forward: l4.seamState.forward, back: l4.seamState.back,
  };
};

/* 车内某一条横截面上"玩家圆心可站"的净宽（真实 collideCircle 判定） */
const freeSpan = (lx0, z, half = 1.80) => {
  let lo = null, hi = null;
  for (let x = lx0 - half; x <= lx0 + half; x += 0.02) {
    const r = collideCircle(LX(x), z, RADIUS);
    if (Math.hypot(r[0] - LX(x), r[1] - z) < 1e-9) {
      if (lo === null) lo = x;
      hi = x;
    }
  }
  return { lo: lo, hi: hi, w: lo === null ? 0 : hi - lo };
};

/* ============================================================================ */
T4('A 对外契约与尺度', () => {
  check4(L4_OX === 360 && L4_LEVEL === 3 && TUNNEL_LAYER === 3, 'L4_OX/L4_LEVEL/TUNNEL_LAYER 未变', L4_OX + '/' + L4_LEVEL + '/' + TUNNEL_LAYER);
  check4(LAY.module === 6 && LAY.tile === 3, '隧道模数 6m、UV 周期 3m');
  check4(SEAM.wrap === 84, '回环节距 84m', String(SEAM.wrap));
  check4(SEAM.wrap % LAY.module === 0, '84 是 6 的整数倍（周期结构可对齐）');
  check4((SEAM.wrap / LAY.tile) % 2 === 0, '84/3 = 28 为偶数格（镜像重复也不跳 UV）');
  check4(CAR.doorW >= 1.1, '车门净宽 >= 1.1m', f2(CAR.doorW));
  check4(2 * CAR.gapHalf >= 1.1, '门洞有效净宽 >= 1.1m', f2(2 * CAR.gapHalf));
  check4(CAR.ceil - CAR.floor >= 2.15, '车内净高 >= 2.15m', f2(CAR.ceil - CAR.floor));
  check4(CAR.ceilSag - CAR.floor >= 2.15, '下垂段净高仍 >= 2.15m', f2(CAR.ceilSag - CAR.floor));
});

T4('B 真实进入：图层 / 碰撞表 / 雾 / 固定灯池', () => {
  enterLevel4({ instant: true, mode: 'preview' });
  check4(LEVEL === L4_LEVEL && !!l4, 'LEVEL 切到第四关且实例已建立');
  check4(l4.built === true, 'ensureBuilt 已建（只建一次）');
  check4((camera.layers.mask & (1 << TUNNEL_LAYER)) !== 0, '相机可见 TUNNEL_LAYER');
  check4(ACTIVE_COLLIDERS === l4.colliders, 'ACTIVE_COLLIDERS 就是本关碰撞表（异变后不复用旧数组）');
  check4(ACTIVE_BOUNDS === l4.bounds, 'ACTIVE_BOUNDS 就是本关边界');
  check4(l4.bounds.x1 === LX(LAY.maint.x1) && l4.bounds.x2 === LX(LAY.trough.x2),
    'bounds 取真实内表面（维修间后墙 / 轨槽侧壁），宿主会再减半径', f2(l4.bounds.x1) + '..' + f2(l4.bounds.x2));
  // 放宽到维修间后，门洞之外的步道左墙必须仍由碰撞体拦住（不能只靠 bounds 兜底）
  const zWall = LAY.maint.cz - 6;
  check4(l4.colliders.some((c) => c.kind === 'tunnelWall' && zWall > c.z1 && zWall < c.z2),
    '门洞外步道左墙是实体碰撞（放宽 bounds 不会漏出关外）');
  check4(Math.abs(scene.fog.density - l4.artLighting.fogDensity) < 1e-9,
    '雾密度 = art.lighting.fogDensity', String(scene.fog.density));
  check4(scene.fog.color.getHex() === l4.artPalette.fog, '雾色 = art.palette.fog');
  check4(scene.background.getHex() === l4.artPalette.background, '背景色 = art.palette.background');
  check4(scene.environment === null, '第四关不套站台环境图');
  check4(Math.abs(hemi.intensity - l4.artLighting.hemi) < 1e-9, '半球光 = art.lighting.hemi');
  check4(l4.lightCount === 8, '固定灯池 8 盏（4 基础 + 维修间 2 + 第二形态 2，全部建关时预建）', String(l4.lightCount));
  check4(l4.lights.every((L) => (L.layers.mask & (1 << TUNNEL_LAYER)) !== 0), '8 盏灯都在本关图层');
  check4(Math.abs(flashLight.distance - l4.artLighting.flashlightDistance) < 1e-9 &&
    Math.abs(flashLight.angle - l4.artLighting.flashlightAngle) < 1e-9 &&
    Math.abs(flashLight.penumbra - l4.artLighting.flashlightPenumbra) < 1e-9 &&
    Math.abs(flashLight.decay - l4.artLighting.flashlightDecay) < 1e-9,
    '手电 beam 参数取自 art.lighting', f2(flashLight.distance) + 'm/' + f3(flashLight.angle));
  const r = l4.renderInfo;
  check4(r.meshes > 4 && r.materials >= 6 && r.triangles > 2000, '几何/材质已合批', r.meshes + ' meshes / ' + r.materials + ' mat / ' + r.triangles + ' tri');
  check4(!!l4.anchors.carNormal && !!l4.anchors.carAged, '正常/异常两版车厢同层预建');
  check4(l4.anchors.carNormal.visible === true && l4.anchors.carAged.visible === false, '初始只显示正常车厢');
  check4(!!l4.anchors.carNormal.parent && l4.anchors.carNormal.parent === l4.group, '两版车厢常驻场景（预热时才拿得到材质）');
  // 门外那只实体手电：必须真的建在步道上（不是只有交互点）
  check4(!!l4.anchors.torch && l4.anchors.torch.visible === true, '门外有实体手电模型');
  if (l4.anchors.torch) {
    // 手电挂在 group 下（group 自己有 L4_OX 平移），所以 .position 是局部坐标：
    // 一律用世界坐标核对，避免把局部 x 再加减一次 L4_OX。
    l4.group.updateMatrixWorld(true);
    const wp = l4.anchors.torch.getWorldPosition(new THREE.Vector3());
    check4(Math.abs(wp.x - LX(LAY.torch.x)) < 1e-6 && Math.abs(wp.z - LAY.torch.z) < 1e-6,
      '手电就在门外步道定位点（不在墙里/不埋地）', f2(wp.x - L4_OX) + ',' + f3(wp.y) + ',' + f2(wp.z));
    check4(wp.y > 0.02, '手电离地高度 > 2cm（不是埋在地里）', f3(wp.y));
  }
  // 异常车厢的新窗洞：低透明旧玻璃
  let transparentMats = 0;
  l4.group.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent && o.material.opacity < 0.5) transparentMats++;
  });
  check4(transparentMats >= 1, '异常车厢有真正低透明旧玻璃', String(transparentMats));
  check4(typeof l4.artReady === 'object' && typeof l4.artReady.then === 'function', 'artReady 是可等待的 Promise（贴图 ready 接入预热）');
});

T4('C 未拾取手电：F 无效、光束为 0', () => {
  check4(l4.torchOwned === false && l4.torchOn === false, '初始未拥有手电');
  toggleFlash();                                  // 宿主 F 键路径
  check4(l4.torchOn === false, '未拥有时按 F 不会点亮');
  check4(l4.torchOwned === false && l4.beamFactor() === 0, '未拥有时 beamFactor = 0');
  check4(l4.setTorch(true) === false, '未拥有时 setTorch(true) 被拒绝');
  check4(l4.toggleTorch() === false, '未拥有时 toggleTorch 返回 false');
  updateFlashHud();
  check4(true, 'HUD 在未拥有态可安全刷新（不抛异常）');
});

T4('D 真实准星 + 车门：只有步道侧中门滑动', () => {
  setPose(0, 0, Math.PI / 2, 0);                  // 车内出生点，面朝 -x 车门
  const it = item4('door');
  check4(!!it && it.reach >= 2.4, '车门交互点存在且可达 2.6m');
  const dot = aimItem('door');
  check4(dot > 0.99, '准星真的对准车门（dot≈1）', f3(dot));
  l4.update(0);                                   // 准星焦点在帧更新里刷新
  check4(!!l4.focus && l4.focus.key === 'door', 'focus 命中车门', l4.focus ? l4.focus.key : 'none');
  check4(l4.state.doorTarget === 0, '初始车门关闭');
  const ok = l4.interact();                        // 与宿主 tryInteract 同一条路径
  check4(ok === true && l4.state.doorTarget === 1, '按 E 触发开门');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  check4(Math.abs(l4.state.door - 1) < 1e-6, '门电机滑到全开', f3(l4.state.door));
  const mid = l4.doorLeaves.filter((l) => l.doorZ === 0);
  const side = l4.doorLeaves.filter((l) => l.doorZ !== 0);
  check4(mid.length >= 2 && mid.every((l) => Math.abs(l.mesh.position.z - l.baseZ) > 0.5),
    '中门门叶真的位移', mid.length + ' 叶');
  check4(side.length >= 2 && side.every((l) => Math.abs(l.mesh.position.z - l.baseZ) < 1e-9),
    '其它车门保持原位（没跟着乱开）', side.length + ' 叶');
  check4(l4.colliders.filter((c) => c.doorZ === 0).every((c) => c.y1 >= 900),
    '中门门洞碰撞抬到不可达（可通行）');
  const sealed = l4.colliders.filter((c) => c.carDoor && c.doorZ !== 0);
  check4(sealed.length === 2 && sealed.every((c) => c.sealed === true && c.y1 === 0),
    '另两扇车门保持锁死', sealed.length + ' 个门洞');
  check4(l4.getHint() !== '', '准星提示非空', l4.getHint());
});

T4('E 真实 WASD 下车：从车内走到门外步道', () => {
  setPose(0, 0, Math.PI / 2, 0);
  const w = wasdTo(-2.75, 0, { maxFrames: 3000 });
  check4(w.lx <= -1.95, '人真的走出到门外（本地 x<=-1.95）', f2(w.lx));
  check4(Math.abs(w.y - 0) < 1e-6, '站在步道面 y=0', f2(w.y));
  check4(w.maxStep < 0.30, '全程无瞬移（单帧最大位移 < 0.30m）', f3(w.maxStep));
  check4(w.camErrXZ < 1e-9, '相机与人水平同步', f3(w.camErrXZ));
  check4(w.camErrY < 0.12, '相机与人竖直同步（含走路 bob）', f3(w.camErrY));
  check4(l4.groundAt(player.x, player.z) === 0, '宿主 groundAt 与网格一致（步道 0m）');
});

T4('F 手电：距离门槛 / 准星朝向 / 拾取后 F 生效', () => {
  // 太远：距离门槛挡下
  setPose(-2.62, -7.2, 0, 0);
  const tp = item4('torch').pos();
  const far = Math.hypot(tp.x - camera.position.x, tp.z - camera.position.z);
  aimAt(tp.x, tp.y, tp.z);
  check4(far > 2.7, '先站到 2.6m 之外', f2(far) + 'm');
  check4(l4.interact() === false, '超出拾取距离按 E 不生效');
  check4(l4.torchOwned === false, '仍未被拾取');
  // 背对目标：朝向门槛挡下
  setPose(-2.62, -4.0, 0, 0);
  yaw = Math.PI;                                  // 背对手电
  syncCameraToPlayer();
  camera.updateMatrixWorld(true);
  check4(l4.interact() === false, '背对手电按 E 不生效（准星门槛）');
  // 走近 + 对准
  const w = wasdTo(-2.62, -3.6, { maxFrames: 900 });
  check4(w.dist < 0.5, '真实走到手电旁', f2(w.dist) + 'm');
  const dot = aimItem('torch');
  check4(dot > 0.9, '准星对准手电', f3(dot));
  check4(l4.interact() === true, '按 E 拾起手电');
  check4(l4.torchOwned === true && l4.torchOn === true, '拾到即拥有并点亮');
  check4(l4.anchors.torch.visible === false, '地上的手电模型已消失（真的被捡走）');
  check4(Math.abs(l4.torchCharge - 1) < 1e-9, '初始电量 100%');
  toggleFlash();
  check4(l4.torchOn === false, 'F 关灯');
  toggleFlash();
  check4(l4.torchOn === true && l4.beamFactor() === 1, 'F 开灯且光束系数 1');
  check4(l4.getHint() !== undefined, '提示接口可用');
});

T4('G 电耗与暂停冻结', () => {
  check4(l4.torchOn === true, '此时手电开着');
  const c0 = l4.torchCharge;
  for (let i = 0; i < 60; i++) l4.update(1 / 60);
  const c1 = l4.torchCharge;
  check4(c1 < c0, '开着会耗电', f3(c0) + ' → ' + f3(c1));
  check4(Math.abs((c0 - c1) - 1 / 260) < 1e-6, '1 秒 ≈ 1/260 电量（TORCH_BURN=260s）', f3(c0 - c1));
  l4.setPaused(true);
  const c2 = l4.torchCharge;
  for (let i = 0; i < 120; i++) l4.update(1 / 60);
  check4(l4.torchCharge === c2, '暂停时完全不耗电');
  check4(l4.paused === true && l4.focus === null, '暂停时准星焦点清空');
  check4(l4.interact() === false, '暂停时按 E 无效');
  check4(l4.getHint() === '', '暂停时不显示提示');
  l4.setPaused(false);
  check4(l4.paused === false, '恢复后继续可交互');
});

T4('H 沿隧道持续前进 → 第一次正向跨缝（同朝向、无黑屏/停步）', () => {
  check4(l4.aged === false, '跨缝前还是正常车厢');
  // 监听跨缝音效：接缝必须完全安静，否则玩家靠耳朵就能发现回环
  let windCalls = 0;
  const __wind0 = L4_SFX['l4-wind'];
  if (__wind0) L4_SFX['l4-wind'] = function (o) { windCalls++; return __wind0(o); };
  const before = snap4();
  // 一直往前走，跨过 -48 的接缝面就停（否则会一圈一圈走下去）
  const w = wasdTo(-2.62, -49, { maxFrames: 6000, stopOnSeam: true });
  check4(w.crossings === 1 && w.forward === 1, '第一次正向跨缝只触发一次', 'crossings=' + w.crossings + ' forward=' + w.forward);
  check4(w.seamFrames === 1, '接缝只发生在一帧上', String(w.seamFrames));
  check4(w.stuck === 0, '跨缝时没有卡死/停步');
  check4(w.zAtSeam !== null && Math.abs(w.z - (SEAM.forward + SEAM.wrap)) < 0.25,
    '落点在同一朝向的隧道里（-48+84=36）', f2(w.z));
  check4(w.maxStep < 0.30, '除接缝帧外无跳变', f3(w.maxStep));
  check4(w.camErrXZ < 1e-9, '接缝帧相机水平同步（没留下错位机位）', f3(w.camErrXZ));
  check4(w.camErrY < 0.12, '接缝帧相机竖直同步', f3(w.camErrY));
  check4(w.seamCamYDelta === 0, '接缝帧不动相机高度（步态 bob 完整保留）', f3(w.seamCamYDelta));
  check4(w.seamRotDelta === 0, '接缝帧不改朝向/俯仰/滚转', f3(w.seamRotDelta));
  check4(w.seamZShift === SEAM.wrap, '接缝帧相机沿 z 同步平移 84m', f2(w.seamZShift));
  check4(Math.abs(w.lx + 2.62) < 0.35, '横向偏移保留（仍在同一条步道）', f2(w.lx));
  const after = snap4();
  check4(after.r.meshes === before.r.meshes && after.r.triangles === before.r.triangles && after.r.materials === before.r.materials,
    '回环不新建几何/材质', after.r.meshes + '/' + after.r.triangles);
  check4(after.light === 8 && after.cols === before.cols && after.kids === before.kids, '回环不增灯、不改碰撞表');
  check4(windCalls === 0, '跨缝瞬间没有任何音效（接缝不靠声音暴露）', String(windCalls));
});

T4('I 一次性异变：材质与几何都变、资源数量不变', () => {
  const mesh0 = l4.renderInfo.meshes;
  check4(l4.aged === true, '首次正向回返已触发异变');
  check4(l4.anchors.carNormal.visible === false && l4.anchors.carAged.visible === true, '切成锈蚀老旧版本（只切 visible）');
  check4(l4.anchors.lightCarA.intensity === 0 && l4.anchors.lightAged.intensity > 0, '灯池只改强度/颜色，不增删');
  check4(l4.lightCount === 8, '异变后仍是 8 盏灯');
  check4(l4.renderInfo.meshes === mesh0, '异变没有重建网格', String(l4.renderInfo.meshes));
  const box = l4.anchors.agedBox;
  check4(!!box && !!box.min && !!box.max, '异常车厢有真实包围盒（用于穿模检查）');
  if (box) {
    check4(box.min.x >= -2.02 && box.max.x <= 2.02, '异常车厢横向不穿模', f2(box.min.x) + '..' + f2(box.max.x));
    check4(box.min.y >= -0.75 && box.max.y <= 2.85, '异常车厢纵向不穿模', f2(box.min.y) + '..' + f2(box.max.y));
    check4(box.min.z >= -10.5 && box.max.z <= 10.5, '异常车厢纵向不超出车体', f2(box.min.z) + '..' + f2(box.max.z));
  }
  check4(l4.state.batteryTaken === false && l4.anchors.battery.visible === true, '电池在异变后才出现');
  check4(l4.anchors.key.visible === true, '钥匙在异变后才出现');
});

T4('J 走回车内：真实 WASD 进车厢并测净空', () => {
  // 从 z≈36 走回车厢（26m 外，手电有效距离 19m，走近才看得见）
  const w = wasdTo(-2.62, 0, { maxFrames: 6000 });
  check4(Math.abs(w.z) < 0.4, '走回车门旁', f2(w.z));
  check4(w.stuck === 0 && w.maxStep < 0.30, '一路连续无卡顿', f3(w.maxStep));
  check4(Math.abs(l4.state.door - 1) < 1e-6, '车门仍是之前打开的（没被接缝复位）');
  // 真实进车厢：穿过中门到过道
  const e = wasdTo(0.30, 0, { maxFrames: 3000 });
  check4(e.lx >= -0.2, '真实走进车厢内部', f2(e.lx));
  check4(Math.abs(e.y - CAR.floor) < 1e-6, '站在车内地板 0.04m', f3(e.y));
  check4(Math.abs(e.y - l4.groundAt(player.x, player.z)) < 1e-6, '宿主 groundAt 与车内地板一致');
  check4(l4.ceilingAt(player.x, player.z) - l4.groundAt(player.x, player.z) >= 2.15,
    '过道净高 >= 2.15m', f2(l4.ceilingAt(player.x, player.z) - l4.groundAt(player.x, player.z)));
  check4(l4.ceilingAt(LX(0), CAR.sagZ) - CAR.floor >= 2.15, '车顶下垂段仍可通行', f2(l4.ceilingAt(LX(0), CAR.sagZ) - CAR.floor));
  const fs = freeSpan(0, 0.9);
  check4(fs.w >= 1.0, '中心过道净宽 >= 1.0m（实测自由宽度）', f2(fs.w) + 'm [' + f2(fs.lo) + '..' + f2(fs.hi) + ']');
  const fd = freeSpan(-2.0, 0, 1.2);
  check4(fd.w >= 1.1, '门洞本身可通行', f2(fd.w) + 'm');
  // 松脱吊板：跳跃头顶不能穿板（独立验收实测板低边 y=2.327）
  setPose(0.23, 2.15, 0, 0);
  let maxHead = -Infinity;
  keys.clear();
  keys.add('Space');
  for (let i = 0; i < 45; i++) {
    if (i >= 1) keys.delete('Space');
    updatePlayer(1 / 60);
    l4.update(1 / 60);
    maxHead = Math.max(maxHead, player.y + EYE * crouchH);
  }
  keys.clear();
  check4(maxHead < 2.30, '跳跃头顶不穿进松脱吊板（板低边 2.327m）', f3(maxHead));
  check4(l4.ceilingAt(LX(0.23), 2.15) <= 2.30, '吊板下方净高按真实板低边给出', f3(l4.ceilingAt(LX(0.23), 2.15)));
  check4(l4.ceilingAt(LX(0.35), 2.15) <= 2.30, '吊板另一侧同样被覆盖', f3(l4.ceilingAt(LX(0.35), 2.15)));
  setPose(0.30, 0, 0, 0);
});

T4('K 舱内拾电池与钥匙（真实准星 + 一次性）', () => {
  // 电池：座椅旁应急收纳架
  setPose(0.35, 3.05, 0, 0);
  const bp = item4('battery').pos();
  check4(Math.hypot(bp.x - player.x, bp.z - player.z) < 2.3, '电池在拾取可达距离内', f2(Math.hypot(bp.x - player.x, bp.z - player.z)));
  const dot = aimItem('battery');
  check4(dot > 0.9, '准星对准电池', f3(dot));
  check4(l4.interact() === true, '拾起电池');
  check4(l4.state.batteryTaken === true && l4.spareBattery === 1, '留下一节备用电池');
  check4(l4.torchCharge === 1, '电量补满（min(1, +0.55)）', f3(l4.torchCharge));
  check4(l4.anchors.battery.visible === false, '电池模型已隐藏');
  check4(l4.interact() === false, '同一块电池不能重复拾取');
  // 钥匙：驾驶端设备托盘
  setPose(0.15, -8.55, 0, 0);
  const kp = item4('key').pos();
  check4(Math.hypot(kp.x - player.x, kp.z - player.z) < 2.3, '钥匙在拾取可达距离内', f2(Math.hypot(kp.x - player.x, kp.z - player.z)));
  check4(aimItem('key') > 0.9, '准星对准钥匙');
  check4(l4.interact() === true, '拾起应急通行钥匙');
  check4(l4.hasKey === true && l4.anchors.key.visible === false, '钥匙已入账且模型隐藏');
  check4(l4.interact() === false, '钥匙不能重复拾取');
});

T4('L 电量耗尽：自动换上备用电池 → 不永久卡关', () => {
  l4.state.torchCharge = 0.002;
  l4.state.torchOn = true;
  for (let i = 0; i < 60; i++) l4.update(1 / 60);
  check4(l4.spareBattery === 0, '备用电池被一次性消耗');
  check4(l4.torchCharge > 0.5 && l4.torchOn === true, '自动换上后手电又亮', f3(l4.torchCharge));
  l4.state.torchCharge = 0.001;
  for (let i = 0; i < 60; i++) l4.update(1 / 60);
  check4(l4.torchCharge === 0 && l4.torchOn === false, '没有备用电池时灯灭');
  check4(l4.setTorch(true) === false, '没电时 F 点不亮（有提示）');
  check4(l4.aged === true && l4.hasKey === true, '关键进程仍在，未被锁死');
  check4(l4.beamFactor() === 0, '灯灭时 beamFactor = 0');
});

T4('M 正逆多圈 / 贴墙 / 奔跑：接缝连续且不重复异变', () => {
  const mesh0 = l4.renderInfo.meshes, tris0 = l4.renderInfo.triangles;
  // 正向第二圈：从隧道深处再走一次
  setPose(-2.62, -20, 0, 0);
  const a = wasdTo(-2.62, -60, { maxFrames: 4000, stopOnSeam: true });
  check4(a.forward === 2 && a.crossings === 2, '第二次正向跨缝', 'forward=' + a.forward + ' crossings=' + a.crossings);
  check4(l4.lightCount === 8 && l4.renderInfo.meshes === mesh0, '第二圈没有复制资源');
  // 逆向穿回：z 减 84，落回隧道深处
  setPose(-2.62, 20, 0, 0);
  const b = wasdTo(-2.62, 60, { maxFrames: 4000, stopOnSeam: true });
  check4(b.back === 1, '逆向跨缝计数', 'back=' + b.back);
  check4(Math.abs(b.zAtSeam - (SEAM.back - SEAM.wrap)) < 0.25, '逆向落点 z-84', f2(b.zAtSeam));
  check4(b.maxStep < 0.30 && b.camErrXZ < 1e-9 && b.camErrY < 0.12, '逆向跨缝同样连续且相机同步', f3(b.maxStep) + '/' + f3(b.camErrY));
  check4(b.seamCamYDelta === 0 && b.seamRotDelta === 0 && b.seamZShift === -SEAM.wrap,
    '逆向接缝只平移相机 z，高度/朝向不动', f2(b.seamZShift));
  // 贴墙 + 奔跑跨越
  setPose(-3.80, 20, 0, 0);
  const c = wasdTo(-3.80, 60, { maxFrames: 4000, run: true, stopOnSeam: true });
  check4(c.crossings === b.crossings + 1, '贴墙奔跑也能跨缝', 'crossings=' + c.crossings);
  check4(Math.abs((player.x - L4_OX) + 3.80) < 0.45, '贴墙不穿墙、不被弹开', f2(player.x - L4_OX));
  check4(c.maxStep < 0.40, '奔跑跨缝无跳变', f3(c.maxStep));
  check4(l4.renderInfo.triangles === tris0 && l4.lightCount === 8, '多圈后三角数/灯数稳定');
  check4(l4.aged === true, '逆向不会把异变刷回去');
});

T4('N 阶段结束：不结算、不写存档', () => {
  check4(typeof endScreenOpen === 'undefined' || endScreenOpen === false, '没有弹出结算屏');
  check4(l4Completed === false, 'l4Completed 仍为 false');
  check4(typeof completeLevel4 === 'function', 'completeLevel4 存在但本关不调用');
  const rec = localStorage.getItem('poolrooms.records.v1');
  check4(rec === null || rec === 'null' || rec === undefined, '没有写 poolrooms.records.v1', String(rec).slice(0, 24));
  check4(l4.getHint() !== undefined, '提示接口可用（阶段完成仍可继续探索）');
  check4(l4.state.aged && l4.state.batteryTaken && l4.state.keyTaken, '两件物品都在，剧情停在此处');
});

T4('O R 键复位：完整回到本关起点', () => {
  respawnToLevelStart();
  check4(Math.abs(player.x - LX(0)) < 1e-6 && Math.abs(player.z) < 1e-6, '回到车厢内出生点', f2(player.x - L4_OX) + ',' + f2(player.z));
  check4(Math.abs(player.y - CAR.floor) < 1e-6, '落在地板上', f3(player.y));
  check4(Math.abs(yaw - Math.PI / 2) < 1e-6 && Math.abs(pitch) < 1e-6, '朝向复位（面朝车门）');
  check4(l4.aged === false && l4.anchors.carNormal.visible === true, '车厢回到正常版本');
  check4(l4.torchOwned === false && l4.torchOn === false && Math.abs(l4.torchCharge - 1) < 1e-9, '手电清空并满电');
  check4(l4.spareBattery === 0 && l4.hasKey === false, '电池/钥匙清空');
  check4(l4.state.door === 0 && l4.state.doorTarget === 0, '车门重新关上');
  check4(!!l4.anchors.torch && l4.anchors.torch.visible === true, '地面手电回来了');
  check4(!!l4.anchors.battery && l4.anchors.battery.visible === false, '电池收回');
  check4(l4.seamState.crossings === 0 && l4.seamState.forward === 0 && l4.seamState.back === 0, '接缝计数清零');
  check4(l4.lightCount === 8, '复位不重建灯');
  // 复位后仍能从零再走一遍：开门 → 出门
  setPose(0, 0, Math.PI / 2, 0);
  check4(l4.interact() === true, '复位后仍能真实开门');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  const w = wasdTo(-2.7, 0, { maxFrames: 3000 });
  check4(w.lx <= -1.95, '复位后仍能真实走出车门', f2(w.lx));
});

T4('P 反复进入/离开不积累资源', () => {
  const base = snap4();
  for (let i = 0; i < 3; i++) {
    enterLevel4({ instant: true, mode: 'preview' });
    l4.leave();
  }
  enterLevel4({ instant: true, mode: 'preview' });
  const now = snap4();
  check4(now.r.meshes === base.r.meshes && now.r.materials === base.r.materials &&
    now.r.triangles === base.r.triangles && now.r.colliders === base.r.colliders,
    '网格/材质/三角/碰撞数量稳定', now.r.meshes + '/' + now.r.materials + '/' + now.r.triangles);
  check4(now.light === 8, '灯数仍是 8');
  check4(now.kids === base.kids, '场景子节点没有越进越多', String(now.kids));
  check4(l4.state.entered === true && l4.state.aged === false, '重新进入是干净状态');
});

T4('Q 检修门与维修间：真实开洞、无钥匙拒绝、开关更新碰撞、电闸可反复扳动', () => {
  enterLevel4({ instant: true, mode: 'preview' });
  const M = LAY.maint;
  // 门洞尺度：与真实墙体/碰撞一致（净宽 ≥1.1m、净高 ≥2.15m）
  check4(!!M, 'L4_LAYOUT 暴露维修间数据');
  check4(M.gapHalf * 2 >= 1.1, '检修门净宽 >= 1.1m', f2(M.gapHalf * 2));
  check4(M.doorH >= 2.15, '检修门净高 >= 2.15m', f2(M.doorH));
  check4(Math.min(Math.abs(M.cz - SEAM.forward), Math.abs(M.cz - SEAM.back)) >= 12, '维修间离两端接缝都 >= 12m（不在接缝可视范围）', f2(Math.min(Math.abs(M.cz - SEAM.forward), Math.abs(M.cz - SEAM.back))));
  check4(Math.abs((M.z1 + M.z2) / 2 % LAY.module) < 1e-9, '维修间中心落在 6m 模数上', f2((M.z1 + M.z2) / 2));

  // 左墙真实分段：门洞之外必须有墙，门洞之内没有墙
  const wallAt = (z) => l4.colliders.some((c) => c.kind === 'tunnelWall' && z > c.z1 + 0.01 && z < c.z2 - 0.01);
  check4(wallAt(M.cz - 6) && wallAt(M.cz + 6), '门洞两侧左墙是真实墙体');
  check4(!wallAt(M.cz), '门洞位置左墙真的开洞了');
  check4(l4.colliders.some((c) => c.kind === 'tunnelLintel'), '门洞上方有过梁碰撞');
  check4(l4.groundAt(LX(M.x1 + 0.8), M.cz) === 0, '维修间地面与步道同高（groundAt 一致）', f3(l4.groundAt(LX(M.x1 + 0.8), M.cz)));
  check4(l4.ceilingAt(LX(M.x1 + 0.8), M.cz) <= M.ceilH + 1e-6, '维修间净高按房顶给', f2(l4.ceilingAt(LX(M.x1 + 0.8), M.cz)));

  // 真实走到门外（此时还没钥匙）
  setPose(0, 0, Math.PI / 2, 0);
  if (l4.state.doorTarget < 0.5) check4(pressE('door') === true, '开中门');
  else check4(true, '中门本来就是开的（沿用前段状态）');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  check4(l4.state.door > 0.99, '车门确实全开（后续走位才有意义）', f2(l4.state.door));
  const w0 = wasdTo(-2.7, 0, { maxFrames: 3000 });
  check4(w0.lx <= -1.95, '真实走出车门', f2(w0.lx));
  const tp = item4('torch').pos();
  check4(isFinite(tp.x) && isFinite(tp.z), '手电定位点有效', f2(tp.x - L4_OX) + ',' + f2(tp.z));
  wasdTo(tp.x - L4_OX, tp.z, { maxFrames: 4000, tol: 0.30 });
  check4(pressE('torch') === true && l4.torchOwned === true, '拾起手电（真实准星）');
  // 首次回返
  const f1 = wasdTo(-2.7, SEAM.forward - 6, { maxFrames: 6000, stopOnSeam: true });
  check4(f1.forward === 1 && l4.aged === true, '首次正向跨缝完成老化', 'forward=' + f1.forward);
  const noKey = wasdTo(-2.7, M.cz, { maxFrames: 6000 });
  check4(Math.abs(noKey.z - M.cz) < 0.4, '走到检修门外', f2(noKey.lx) + ',' + f2(noKey.z));
  check4(aimItem('maintdoor') > 0.9, '准星对准检修门');
  check4(l4.interact() === false, '没有钥匙时开不了（动作返回 false）');
  check4(l4.state.maint.unlocked === false && l4.state.maint.door === 0, '门仍是锁着的状态');
  check4(l4.getHint().indexOf('钥匙') >= 0, '提示明确要求应急钥匙', l4.getHint());

  // 回车取电池与钥匙（真实进出 + 拾取）
  const back = wasdTo(-2.7, 0, { maxFrames: 6000 });
  check4(Math.abs(back.z) < 0.5, '回到中门附近', f2(back.z));
  wasdTo(0, 0, { maxFrames: 3000 });
  check4((player.x - L4_OX) > -1.6, '真实走进车厢（门洞可通行）', f2(player.x - L4_OX));
  setPose(0.35, 3.05, 0, 0);
  check4(pressE('battery') === true && l4.state.batteryTaken === true, '拾起电池');
  setPose(0.15, -8.55, 0, 0);
  check4(pressE('key') === true && l4.hasKey === true, '拾起应急通行钥匙');
  check4(l4.state.maint.unlocked === false, '拿到钥匙不会自动开门（要玩家自己按 E）');

  // 回到门外 → 用钥匙解锁
  // 回到门外 → 用钥匙解锁（先从车厢里沿过道走到中门，再穿门下车；斜穿会被车壁挡住）
  wasdTo(0.15, 0, { maxFrames: 4000 });
  wasdTo(-2.7, 0, { maxFrames: 4000 });
  wasdTo(-2.7, M.cz, { maxFrames: 6000 });
  check4(pressE('maintdoor') === true, '用钥匙开门成功');
  check4(l4.state.maint.unlocked === true && l4.state.maint.doorTarget === 1, '门开始开');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  check4(Math.abs(l4.state.maint.door - 1) < 1e-6, '门滑到全开', f3(l4.state.maint.door));
  const barrier = l4.colliders.find((c) => c.maintDoor);
  check4(!!barrier && barrier.y1 >= 900, '门开时门洞碰撞抬到不可达', barrier ? String(barrier.y1) : 'none');

  // 真实走进维修间
  const inRoom = wasdTo(M.x1 + 1.0, M.cz, { maxFrames: 4000 });
  check4(inRoom.lx <= LAY.walkway.x1 - 0.5, '真实穿过门洞进入维修间', f2(inRoom.lx));
  check4(l4.state.maint.entered === true, '维修间“已进入”记一次事实');
  check4(l4.ceilingAt(player.x, player.z) > 1.6, '房内可站直（净高够）', f2(l4.ceilingAt(player.x, player.z)));
  // 只进门、还没送电 → 不满足第二次回返资格（否则目标链会被跳过）
  check4(l4.readyForSecond() === false, '仅进入维修间还不算完成供电（不推进第二次回返）');

  // 侧室里用真实走动验证净空：贴后墙与南北两墙停下时仍保留玩家半径
  // （旧的矩形边界断言只覆盖主步道，新增侧室后改在这里用实际位移验证，约束不放宽）
  const backW = wasdTo(M.x1 - 1.2, M.cz, { maxFrames: 1200 });
  check4(backW.lx >= M.x1 + RADIUS - 0.02 && backW.lx <= M.x1 + RADIUS + 0.35,
    '侧室内贴后墙停下时保留玩家半径', f3(backW.lx - M.x1));
  const northW = wasdTo(-5.4, M.z1 - 2.0, { maxFrames: 1200 });
  check4(northW.z >= M.z1 + RADIUS - 0.02 && northW.z <= M.z1 + RADIUS + 0.35,
    '侧室内贴北墙停下时保留玩家半径', f3(northW.z - M.z1));
  const southW = wasdTo(-5.4, M.z2 + 2.0, { maxFrames: 1200 });
  check4(southW.z <= M.z2 - RADIUS + 0.02 && southW.z >= M.z2 - RADIUS - 0.35,
    '侧室内贴南墙停下时保留玩家半径', f3(southW.z - M.z2));
  // 主步道一侧仍由实心土层拦住：从房间外贴左墙走，不能穿到房间所在的 x
  setPose(-2.70, M.cz - 3.0, Math.PI / 2, 0);   // 先站到步道上（房间 z 段以外），再朝左墙走
  const laneW = wasdTo(LAY.walkway.x1 - 2.0, M.cz - 3.0, { maxFrames: 1200 });
  check4(laneW.lx >= LAY.walkway.x1 - 0.02, '步道段贴左墙时仍被实心墙拦住（未到门洞高度）',
    f3(laneW.lx - LAY.walkway.x1));

  // 电闸：距离外拒绝 → 近距离扳动 → 反复扳动不重复刷阶段
  setPose(LAY.walkway.x1 - 0.30, M.cz, 0, 0);
  check4(l4.interact() === false, '离电闸太远时不能操作');
  setPose(M.breaker.x + 0.95, M.cz, Math.PI / 2, 0);
  check4(aimItem('breaker') > 0.9, '准星对准电闸');
  check4(l4.interact() === true && l4.state.maint.breaker === 1, '合上电闸');
  check4(l4.state.maint.powerDone === true, '“已恢复供电”作为单次事实');
  check4(l4.anchors.lightRoom.intensity > 2, '配电箱顶灯亮起（同一盏灯改强度）', f2(l4.anchors.lightRoom.intensity));
  check4(l4.lightCount === 8, '灯池仍是建关时的 8 盏（不新增）', String(l4.lightCount));
  check4(l4.interact() === true && l4.state.maint.breaker === 0, '再扳一次断开（可反复）');
  check4(l4.state.maint.powerDone === true, '断开不会撤销“已恢复供电”事实（不软锁）');
  check4(l4.state.maint.secondReturn === false, '此时还没有第二次回返');
  check4(l4.readyForSecond() === true, '送电之后才满足第二次回返资格');
  check4(l4.interact() === true && l4.state.maint.breaker === 1, '再扳回合上');
  check4(l4.state.maint.entered === true && l4.state.maint.powerDone === true, '重复扳动不重复刷阶段');

  // 关门：从门内也能开关；关门后碰撞恢复、外面进不来
  setPose(LAY.walkway.x1 - 0.55, M.cz, 0, 0);
  check4(aimItem('maintdoor') > 0.6, '门内也能瞄准门');
  check4(pressE('maintdoor') === true && l4.state.maint.doorTarget === 0, '门内可以关门');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  const b2 = l4.colliders.find((c) => c.maintDoor);
  check4(b2.y1 === 0, '关门后门洞碰撞恢复为实体');
  setPose(LAY.walkway.x1 + 1.4, M.cz, -Math.PI / 2, 0);
  const blocked = wasdTo(M.x1 + 1.2, M.cz, { maxFrames: 600 });
  check4(blocked.lx > LAY.walkway.x1 - 0.40, '门关着时走不进维修间（不穿墙）', f2(blocked.lx));
  setPose(LAY.walkway.x1 - 0.55, M.cz, 0, 0);
  check4(pressE('maintdoor') === true, '门内再开一次（不会被关在里面）');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  check4(l4.state.maint.door > 0.99, '门重新全开');
});

/* 从局外一点沿 +x/−x 打一条射线，返回穿过该窗后落点的 x（局部坐标，米） */
const shootX = (ox, oy, oz, dirX) => {
  const grp = l4.secondCar.group();
  grp.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(
    new THREE.Vector3(LX(ox), oy, oz),
    new THREE.Vector3(dirX, 0, 0), 0, 40);
  rc.layers.set(TUNNEL_LAYER);
  const hits = rc.intersectObject(grp, true);
  return hits.map((h) => h.point.x - L4_OX);
};
const shootY = (ox, oy, oz, dirY) => {
  const grp = l4.secondCar.group();
  grp.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(
    new THREE.Vector3(LX(ox), oy, oz),
    new THREE.Vector3(0, dirY, 0), 0, 40);
  rc.layers.set(TUNNEL_LAYER);
  return rc.intersectObject(grp, true).map((h) => h.point.y);
};

T4('R 第二次回返：整车切到第二形态，且只有真的进车看清全貌才算检查', () => {
  const M = LAY.maint;
  check4(l4.state.maint.secondReturn === false && l4.carVisible().second === false, '资格够了但还没回返（第二形态未显示）');
  // 先真实走出维修间回到步道（否则斜着走会被房墙挡住）
  wasdTo(-2.7, M.cz, { maxFrames: 4000 });
  // 反向穿缝不该触发
  const rv = wasdTo(-2.7, SEAM.back + 6, { maxFrames: 5000, stopOnSeam: true });
  check4(rv.back >= 1, '真实反向跨缝', 'back=' + rv.back);
  check4(l4.state.maint.secondReturn === false, '反向穿缝不推进剧情');
  // 原地抖动：贴着前方接缝来回也不该触发
  setPose(-2.7, SEAM.forward + 0.6, 0, 0);
  for (let i = 0; i < 24; i++) {
    const dz = (i % 2 === 0) ? 0.12 : -0.12;
    yaw = dz > 0 ? Math.PI : 0;
    updatePlayer(1 / 60);
    l4.update(1 / 60);
  }
  check4(l4.state.maint.secondReturn === false, '接缝前原地抖动不推进剧情');

  // 正向跨缝 → 第二次回返（仅一次）
  const f2r = wasdTo(-2.7, SEAM.forward - 6, { maxFrames: 6000, stopOnSeam: true });
  check4(f2r.forward >= 2, '再次正向跨缝', 'forward=' + f2r.forward);
  check4(l4.state.maint.secondReturn === true, '第二次回返推进一次');
  const cv = l4.carVisible();
  check4(cv.second === true && cv.aged === false && cv.normal === false,
    '三态车体互斥：只剩第二形态可见', JSON.stringify(cv));
  check4(l4.anchors.lightSrA.intensity > 2 && l4.anchors.lightCarA.intensity === 0,
    '车灯切到第二形态（同一灯池只改强度）', f2(l4.anchors.lightSrA.intensity));
  check4(l4.steps.active === true, '延迟脚步机制激活');
  check4(l4.lightCount === 8, '回返不新增灯', String(l4.lightCount));

  // 整车几何：不是 0.41m 浅盒，而是贯通全车的内景
  const sb = l4.secondCar.box();
  check4(sb && (sb.max.z - sb.min.z) > 19.5 && (sb.max.x - sb.min.x) > 3.70,
    '第二形态覆盖整节车厢尺寸（长 >19.5m / 宽 >3.70m）',
    sb ? f2(sb.max.z - sb.min.z) + '×' + f2(sb.max.x - sb.min.x) : 'no box');

  // 车外每一扇站台侧窗射进去，都要穿透到车厢另一侧（浅盒会在 0.41m 处被挡住）
  const wins = l4.secondCar.windows();
  let deepMin = 1e9, shallow = 0;
  for (let i = 0; i < wins.station.length; i++) {
    const w = wins.station[i];
    const xs = shootX(LAY.car.xin - 0.60, (w.y1 + w.y2) / 2, w.zc, 1);
    const deep = xs.length ? Math.max.apply(null, xs) : -99;
    if (deep < deepMin) deepMin = deep;
    for (let k = 0; k < xs.length; k++) if (xs[k] < LAY.car.xin + 0.55 && xs[k] > LAY.car.xin + 0.20) shallow++;
  }
  check4(wins.station.length >= 4 && deepMin > LAY.car.xin + 2.0,
    '从车外每扇窗都能看进车厢深处（无浅腔背板）', 'deepest=' + f2(deepMin));
  check4(shallow === 0, '窗前 0.2–0.55m 内没有任何遮挡面（旧浅盒特征）', String(shallow));

  // 车厢内部是连续空间：沿过道纵向射线一路无阻，端头才有墙。
  // 车体网格在 TUNNEL_LAYER，射线必须先设层，否则默认 layer 0 会空命中（空结果不能算通过）。
  const aisleOrigin = (z0, dz) => new THREE.Raycaster(
    new THREE.Vector3(LX(0), 1.20, z0), new THREE.Vector3(0, 0, dz), 0, 40);
  l4.secondCar.group().updateMatrixWorld(true);
  const sbEnd = l4.secondCar.box();
  const rcA = aisleOrigin(-8.60, 1); rcA.layers.set(TUNNEL_LAYER);
  const rcB = aisleOrigin(8.60, -1); rcB.layers.set(TUNNEL_LAYER);
  const hitA = rcA.intersectObject(l4.secondCar.group(), true);
  const hitB = rcB.intersectObject(l4.secondCar.group(), true);
  check4(hitA.length > 0 && hitB.length > 0, '过道射线真的打到车体（不是空命中）',
    hitA.length + '/' + hitB.length);
  const zA = hitA.length ? hitA[0].point.z : NaN;
  const zB = hitB.length ? hitB[0].point.z : NaN;
  check4(Math.abs(zA - sbEnd.max.z) < 0.20 && Math.abs(zB - sbEnd.min.z) < 0.20,
    '命中点落在真实端墙坐标范围（车头/车尾端墙内表面）',
    f2(zA) + ' vs ' + f2(sbEnd.max.z) + ' / ' + f2(zB) + ' vs ' + f2(sbEnd.min.z));
  check4(hitA[0].distance > 17.8 && hitB[0].distance > 17.8,
    '中过道纵向连续贯通到端头（无隔断/无背板）',
    f2(hitA[0].distance) + 'm / ' + f2(hitB[0].distance) + 'm');
  // 负对照：不设图层时同一条射线会空命中——说明上面那条"有命中"的断言确实依赖正确设层
  const rcBad = aisleOrigin(-8.60, 1);
  const badHits = rcBad.intersectObject(l4.secondCar.group(), true);
  check4(badHits.length === 0, '负对照：不设 TUNNEL_LAYER 时射线空命中（空结果必须判失败）',
    String(badHits.length));

  // 顶棚：远端三段更低，最低可走净高 >= 2.15m，且 ceilingRaw 与几何同源
  const ceil = l4.secondCar.ceiling();
  let minHead = 99;
  for (let z = -9.8; z <= 9.8; z += 0.2) minHead = Math.min(minHead, l4.secondCar.ceilYAt(z));
  check4(minHead >= l4.secondCar.minHead - 1e-6, '最低可走净高 ≥ 2.15m', f2(minHead));
  let sagOk = true, sagMin = 99;
  for (let z = -9; z <= 9; z += 1.5) {
    const ys = shootY(0, 1.20, z, 1);
    const hitY = ys.length ? ys[0] : -99;
    const want = l4.secondCar.ceilYAt(z);
    if (Math.abs(hitY - want) > 0.14) sagOk = false;
    const drop = want - l4.secondCar.ceilYAt(0);
    if (drop < sagMin) sagMin = drop;
  }
  check4(sagOk, '顶棚网格高度 = ceilYAt（跳跃头顶与几何同源）');
  check4(sagMin < -0.20, '远端三段顶棚明显压低', f2(sagMin));
  check4(ceil.length === 4 && ceil[0].y < ceil[3].y, '顶棚按四段逐级压低', String(ceil.length));

  // 扶手整排向同向偏斜：同一 x 上沿车长取两点，高度差应 ≈ 倾角 × 距离
  const yA = shootY(0.99, 2.18, 2.0, -1)[0];
  const yB = shootY(0.99, 2.18, -4.0, -1)[0];
  check4(isFinite(yA) && isFinite(yB) && Math.abs(Math.abs(yA - yB) - 0.030 * 6) < 0.06,
    '扶手/吊环整排同向偏斜（倾角 0.030）', f2(Math.abs(yA - yB)));

  // 中过道净宽 ≥1.0m：两侧座椅碰撞内缘至少留 1.0m
  const seat2 = l4.colliders.filter((c) => c.srSeat);
  let aisleHalf = 99;
  for (let i = 0; i < seat2.length; i++) {
    const c = seat2[i];
    const inner = (c.x1 - L4_OX > 0) ? (c.x1 - L4_OX) : (c.x2 - L4_OX);
    aisleHalf = Math.min(aisleHalf, Math.abs(inner));
  }
  check4(seat2.length >= 4 && aisleHalf * 2 >= 1.0, '中过道净宽 ≥ 1.0m（两侧座椅内缘）',
    f2(aisleHalf * 2));
  check4(seat2.every((c) => c.y1 === 0), '第二形态的座椅碰撞已生效', String(seat2.filter((c) => c.y1 === 0).length));

  // 负对照：站在车外隔着车窗看，不算"检查完成"
  setPose(-2.7, wins.station[0].zc, Math.PI / 2, 0);
  aimAt(LX(LAY.car.xin), 1.70, wins.station[0].zc);
  for (let i = 0; i < 20; i++) l4.update(1 / 60);
  check4(l4.state.maint.carInspected === false, '车外隔着窗看不判“检查完成”（负对照）');
  check4(l4.stage() === 'witness', '此时目标仍是“进入车厢检查变化”', l4.stage());

  // 真实流程：按 E 开中门 → 连续 WASD 进车厢 → 走到车头 → 走到车尾 → 出车
  setPose(-2.70, 0, Math.PI / 2, 0);
  check4(aimItem('door') > 0.6, '中门在准星里');
  if (l4.state.doorTarget < 0.5) check4(pressE('door') === true, '按 E 打开中门');
  else check4(l4.state.doorTarget > 0.5, '中门此前已开着');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  const midLeaf = l4.doorLeaves.find((d) => d.doorZ === 0 && d.kind === 'second');
  check4(midLeaf && Math.abs(midLeaf.mesh.position.z - midLeaf.baseZ) > 0.6, '中门真的滑开了',
    midLeaf ? f2(midLeaf.mesh.position.z - midLeaf.baseZ) : 'no leaf');
  const inCar = wasdTo(0.20, 0, { maxFrames: 1600, tol: 0.30 });
  check4(inCar.lx > LAY.car.xin + 0.30, '真实走进车厢内部', f2(inCar.lx));
  const fwdEnd = wasdTo(0.20, -9.55, { maxFrames: 7000, tol: 0.12 });
  check4(fwdEnd.z <= -9.30, '沿过道走到车头端（距端墙 0.7m 内）', f2(fwdEnd.z));
  check4(fwdEnd.z >= sbEnd.min.z + RADIUS - 0.03, '没有穿进车头端墙',
    f2(fwdEnd.z) + ' vs 端墙 ' + f2(sbEnd.min.z));
  check4(l4.state.maint.carInspected === true, '进车看清后才记录“检查完成”');
  check4(l4.stage() === 'beyond', '阶段推进到见证之后', l4.stage());
  const aftEnd = wasdTo(0.20, 9.55, { maxFrames: 8000, tol: 0.12 });
  check4(aftEnd.z >= 9.30, '沿过道走到车尾端（距端墙 0.7m 内）', f2(aftEnd.z));
  check4(aftEnd.z <= sbEnd.max.z - RADIUS + 0.03, '没有穿进车尾端墙',
    f2(aftEnd.z) + ' vs 端墙 ' + f2(sbEnd.max.z));
  check4(Math.abs(l4.groundAt(LX(0.20), 7.0) - LAY.car.floor) < 1e-6, '车内地板高度与 groundAt 一致');
  // 出车分两段走（先回到中门过道，再横着出门），避免斜切蹭到座椅
  wasdTo(0.20, 0, { maxFrames: 6000, tol: 0.40 });
  const outCar = wasdTo(-2.70, 0, { maxFrames: 6000, tol: 0.40 });
  check4(outCar.lx < LAY.walkway.x2, '正常走出车厢回到步道', f2(outCar.lx));

  const f3r = wasdTo(-2.7, SEAM.forward - 90, { maxFrames: 8000, stopOnSeam: true });
  check4(f3r.forward >= 3 && l4.state.maint.secondReturn === true, '再跨一次仍是同一个阶段（不重复刷）');
  // 仍然可以真实走回车旁
  const near = wasdTo(-2.7, 3.5, { maxFrames: 8000, tol: 0.20 });
  check4(Math.abs(near.z - 3.5) < 0.6, '真实走回车旁', f2(near.z));
});

T4('W 车体外部做旧：前后端面与六片门叶外旧内新，UV 与侧墙同尺度', () => {
  const grp = l4.secondCar.group();
  grp.updateMatrixWorld(true);
  const mats = l4.secondCar.mats();
  const cast = (ox, oy, oz, dx, dy, dz) => {
    grp.updateMatrixWorld(true);   // 门叶会滑动：每次射线前必须刷新世界矩阵
    const rc = new THREE.Raycaster(
      new THREE.Vector3(LX(ox), oy, oz),
      new THREE.Vector3(dx, dy, dz).normalize(), 0, 40);
    rc.layers.set(TUNNEL_LAYER);
    const hits = rc.intersectObject(grp, true);
    return hits.length ? hits[0] : null;
  };
  const matOf = (h) => {
    if (!h) return null;
    const m = h.object.material;
    return Array.isArray(m) ? m[h.face.materialIndex] : m;
  };
  // 每米 uv 跨度：同一套 uvBox 生成的面，比值应接近 1
  const uvPerMeter = (h) => {
    const g = h.object.geometry;
    const p = g.attributes.position, u = g.attributes.uv;
    const ia = h.face.a, ib = h.face.b;
    const p0 = new THREE.Vector3().fromBufferAttribute(p, ia);
    const p1 = new THREE.Vector3().fromBufferAttribute(p, ib);
    const u0 = new THREE.Vector2().fromBufferAttribute(u, ia);
    const u1 = new THREE.Vector2().fromBufferAttribute(u, ib);
    return u0.distanceTo(u1) / Math.max(1e-6, p0.distanceTo(p1));
  };

  // 侧墙外表面的 uv 尺度作为基准
  const sideHit = cast(3.60, 1.50, 3.60, -1, 0, 0);
  const endDbg = cast(0, 1.50, -11.60, 0, 0, 1);
  check4(matOf(sideHit) === mats.shell, '侧墙外表面仍是锈蚀旧漆（基准面）');
  const sideUv = sideHit ? uvPerMeter(sideHit) : NaN;

  for (const sz of [-1, 1]) {
    const tag = sz < 0 ? '车头' : '车尾';
    const outHit = cast(0, 1.50, sz * 11.60, 0, 0, -sz);
    check4(matOf(outHit) === mats.shell, tag + '外端面是锈蚀旧漆（不再是新白板）',
      outHit ? f2(outHit.point.z) : 'miss');
    const inHit = cast(1.20, 1.50, sz * 8.00, 0, 0, sz);
    check4(matOf(inHit) === mats.liner, tag + '内端面是整洁内饰衬板',
      inHit ? f2(inHit.point.z) : 'miss');
    // 外锈层按车体全宽收口：侧墙厚度带（1.75–1.89）在端面处也必须是旧漆，不能露白
    const cornerHit = cast(1.84, 1.50, sz * 11.60, 0, 0, -sz);
    check4(matOf(cornerHit) === mats.shell, tag + '转角收口不外露内饰白边',
      cornerHit ? f2(cornerHit.point.z) : 'miss');
    // 锈纹物理尺度与侧墙一致（同一套 uvBox/覆盖 2.4m）
    const endUv = outHit ? uvPerMeter(outHit) : NaN;
    check4(isFinite(endUv) && isFinite(sideUv) && Math.abs(endUv / sideUv - 1) < 0.12,
      tag + '端面锈纹 uv 尺度与侧墙一致', f2(endUv) + ' / ' + f2(sideUv));
    // 端面外表面整片取样：不允许有任何一块内饰面朝外
    let clean = 0, sampled = 0;
    for (let x = -1.60; x <= 1.61; x += 0.40) {
      for (let y = 0.30; y <= 2.21; y += 0.45) {
        const h = cast(x, y, sz * 11.60, 0, 0, -sz);
        sampled++;
        if (!h || matOf(h) !== mats.shell) clean++;
      }
    }
    check4(clean === 0, tag + '外端面整片取样全部是旧漆（' + sampled + ' 点）', String(clean));
  }

  // 顶部端头收边：顶棚板顶面/端头/侧收边在车外都看得见，必须同样是旧漆；
  // 同一块板朝车内的底面才是内饰（这块板逐面给材质，不能整块刷成内饰）。
  for (const sz of [-1, 1]) {
    const tag = sz < 0 ? '车头' : '车尾';
    const bandHit = cast(0, 2.62, sz * 11.60, 0, 0, -sz);
    check4(matOf(bandHit) === mats.shell, tag + '顶部端头收边（原浅白盖边）是旧漆',
      bandHit ? f2(bandHit.point.y) : 'miss');
    const bandUv = bandHit ? uvPerMeter(bandHit) : NaN;
    check4(isFinite(bandUv) && isFinite(sideUv) && Math.abs(bandUv / sideUv - 1) < 0.25,
      tag + '顶盖收边锈纹尺度与侧墙接近', f2(bandUv) + ' / ' + f2(sideUv));
  }
  const roofTop = cast(0, 2.80, 9.60, 0, -1, 0);
  check4(matOf(roofTop) === mats.shell, '从车外上方看顶棚顶面也是旧漆',
    roofTop ? f2(roofTop.point.y) : 'miss');
  const roofSide = cast(3.60, 2.62, 9.60, -1, 0, 0);
  check4(matOf(roofSide) === mats.shell, '顶棚侧收边（车外可见）也是旧漆',
    roofSide ? f2(roofSide.point.y) : 'miss');
  const roofUnder = cast(0, 2.10, 9.60, 0, 1, 0);
  check4(matOf(roofUnder) === mats.ceilLiner, '车内仰视顶棚仍是整洁内饰',
    roofUnder ? f2(roofUnder.point.y) : 'miss');
  check4(Array.isArray(roofUnder && roofUnder.object.material)
    && roofUnder.object.material.length === 6
    && roofUnder.object.material[3] === mats.ceilLiner
    && roofUnder.object.material.filter((m, i) => i !== 3).every((m) => m === mats.shell),
    '顶棚板 6 个面一次给对（仅底面内饰 + 五面旧漆）');

  // 车门六片叶：外侧 4 边旧漆、内侧内饰；门叶是薄板，只能是逐面材质。
  // 顺序很重要：R 段结束中门是开着的，先验证"开着能直接看出去"，再关门做内外对照。
  const doorZ = -0.40;                       // 中门南片叶中心
  setPose(-2.70, 0, Math.PI / 2, 0);
  if (l4.state.doorTarget < 0.5) { aimItem('door'); pressE('door'); for (let i = 0; i < 90; i++) l4.update(1 / 60); }
  const openRay = cast(1.20, 1.20, doorZ, -1, 0, 0);
  check4(!openRay || !Array.isArray(openRay.object.material), '中门开着时车内视线直接穿门洞（不命中门叶）',
    openRay ? f2(openRay.distance) : 'miss');
  aimItem('door');
  check4(pressE('door') === true, '按 E 关门（做门叶内外材质对照）');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);

  const wayOut = cast(-3.20, 1.20, doorZ, 1, 0, 0);
  check4(Array.isArray(wayOut && wayOut.object.material) && matOf(wayOut) === mats.shell,
    '门扇朝步道一面是锈蚀旧漆', wayOut ? String(wayOut.face.materialIndex) : 'miss');
  const leafTop = cast(-3.20, 2.24, doorZ, 1, 0, 0);
  check4(matOf(leafTop) === mats.shell, '门扇外露上边也是旧漆',
    leafTop ? String(leafTop.face.materialIndex) : 'miss');
  const closedIn = cast(1.20, 1.20, doorZ, -1, 0, 0);
  check4(matOf(closedIn) === mats.liner, '关门后车内看到门内侧整洁内饰',
    closedIn ? String(closedIn.face.materialIndex) : 'miss');
  const leafMesh = closedIn && Array.isArray(closedIn.object.material) ? closedIn.object : null;
  check4(!!leafMesh && leafMesh.material.length === 6 && leafMesh.material[0] === mats.liner
    && leafMesh.material.slice(1).every((m) => m === mats.shell),
    '门叶 6 个面一次给对（内饰 + 五面旧漆）');
  const closedOut = cast(-3.20, 1.20, doorZ, 1, 0, 0);
  check4(matOf(closedOut) === mats.shell, '关门后车外看到门扇外侧旧漆',
    closedOut ? String(closedOut.face.materialIndex) : 'miss');
  // 恢复通关状态：中门重新打开
  aimItem('door');
  pressE('door');
  for (let i = 0; i < 90; i++) l4.update(1 / 60);
  check4(l4.state.doorTarget > 0.5, '中门恢复开启状态');
});

T4('S 延迟脚步：来自真实落脚、延时 0.62–0.92s、停步最多两次、暂停/离关清队列并取消声源', () => {
  const steps = l4.steps;
  check4(steps.active === true, '第二次回返后激活');
  const oldRand = Math.random;
  l4._rand(() => 0.5);
  // 暂停 → 恢复：恢复时以当前真实位置为基线（这是实现里的真实分支，不是测试后门）
  l4.setPaused(true);
  l4.setPaused(false);
  steps.queue.length = 0; steps.emitted = 0; steps.rejected = 0;
  check4(steps.last.valid === true, '激活/恢复时以真实位置建立基线');
  const pos = { x: player.x, y: player.y, z: player.z, grounded: true };
  const rej0 = steps.rejected;
  check4(l4.onFootstep(pos) === false, '基线处原地通知被拒（第一次通知不免费放行）');
  check4(steps.rejected === rej0 + 1, '被拒通知计入过滤计数');
  check4(l4.onFootstep({ x: pos.x, y: pos.y, z: pos.z + 0.10, grounded: true }) === false, '只挪 10cm（撞墙）不新增');
  check4(l4.onFootstep({ x: pos.x, y: pos.y, z: pos.z + 0.30, grounded: true }) === true, '真正迈出 0.30m 才入队');
  check4(steps.queue.length === 1, '队列里只有一次脚步', String(steps.queue.length));
  check4(l4.onFootstep({ x: pos.x, y: pos.y, z: pos.z + 0.70, grounded: true }) === true, '第二次入队');
  check4(l4.onFootstep({ x: pos.x, y: pos.y, z: pos.z + 1.10, grounded: true }) === false,
    '超过上限后丢弃（停步最多两次）');
  check4(steps.queue.length === steps.maxPending, '队列上限 2', String(steps.queue.length));
  check4(l4.onFootstep({ x: pos.x, y: pos.y + 0.9, z: pos.z + 1.6, grounded: false }) === false, '腾空不算落脚');
  // 延时：随机固定 0.5 → t = 0.77s；按真实帧推进量到第一声
  let framesToFirst = 0;
  const emit0 = steps.emitted;
  while (steps.emitted === emit0 && framesToFirst < 240) { l4.update(1 / 60); framesToFirst++; }
  check4(framesToFirst >= 30 && framesToFirst <= 62, '第一声延迟落在 0.62–0.92s', (framesToFirst / 60).toFixed(2) + 's');
  for (let i = 0; i < 120; i++) l4.update(1 / 60);
  check4(steps.emitted === 2, '两次待播都播完，不重复', String(steps.emitted));

  // 连续行走时也要有回声（不是只有停下才响）：边走边踩，队列不断被填充与消费
  const oldEcho = L4_SFX['l4-step-echo'];
  let echoCalls = 0;
  L4_SFX['l4-step-echo'] = (o) => { echoCalls++; if (oldEcho) oldEcho(o); };
  steps.queue.length = 0; steps.emitted = 0;
  let walkZ = pos.z + 2.0;
  for (let i = 0; i < 150; i++) {
    if (i % 14 === 0) { walkZ += 0.65; l4.onFootstep({ x: pos.x, y: pos.y, z: walkZ, grounded: true }); }
    l4.update(1 / 60);
  }
  check4(steps.emitted >= 2, '连续行走时仍有延迟声（边走边响）', String(steps.emitted));
  check4(echoCalls === steps.emitted,
    '每个队列事件正好触发一组回声（不叠加音频层的二次延时）',
    echoCalls + '/' + steps.emitted);
  L4_SFX['l4-step-echo'] = oldEcho;

  // 暂停：队列不推进、不再新增，并取消已排出的声源
  l4.onFootstep({ x: pos.x, y: pos.y, z: walkZ + 0.6, grounded: true });
  const pending0 = steps.queue.length;
  const cancel0 = l4EchoCancelCount;
  l4.setPaused(true);
  check4(steps.queue.length === 0 && pending0 > 0, '暂停清空待播队列', pending0 + '→0');
  check4(l4EchoCancelCount === cancel0 + 1, '暂停调用一次声源取消', String(l4EchoCancelCount - cancel0));
  for (let i = 0; i < 120; i++) l4.update(1 / 60);
  check4(steps.queue.length === 0 && steps.emitted >= 2, '暂停时不推进待播队列（游戏时间驱动）');
  check4(l4.onFootstep({ x: pos.x, y: pos.y, z: walkZ + 1.2, grounded: true }) === false, '暂停时不新增脚步');
  l4.setPaused(false);
  l4.leave();
  check4(steps.queue.length === 0, '离关清空待播');
  enterLevel4({ instant: true, mode: 'preview' });
  check4(l4.steps.queue.length === 0, '重新进入时队列是空的（不带残留待播）');
  check4(l4.steps.active === l4.state.maint.secondReturn, '重进后延迟脚步开关跟随已完成事实', String(l4.steps.active));
  l4._rand(oldRand);
});

T4('T 操作痕迹跨回环保留 + R 完全复位 + 不复制拾取', () => {
  // 重新走一遍状态（enter 之后是干净状态）
  const M = LAY.maint;
  l4.debugState({ unlock: true, open: true, enterRoom: true, power: true });
  check4(l4.state.maint.door === 1 && l4.state.maint.breaker === 1, '准备：门开、电闸合上');
  const mesh0 = l4.renderInfo.meshes, kids0 = l4.group.children.length;
  // 正反穿缝后痕迹仍在
  setPose(-2.7, 20, 0, 0);
  wasdTo(-2.7, SEAM.forward - 6, { maxFrames: 6000, stopOnSeam: true });
  wasdTo(-2.7, SEAM.back + 6, { maxFrames: 6000, stopOnSeam: true });
  check4(l4.state.maint.door === 1 && l4.state.maint.breaker === 1 && l4.state.maint.powerDone === true,
    '跨回环回来后门/电闸/已完成事实都保留');
  check4(l4.anchors.maintLeaf.rotation.y !== 0, '门叶模型仍是开的位置');
  check4(l4.renderInfo.meshes === mesh0, '多圈回环不复制网格', String(mesh0));
  // R 复位：完整清回初始
  respawnToLevelStart();
  const m = l4.state.maint;
  check4(m.unlocked === false && m.door === 0 && m.doorTarget === 0, 'R 后门重新锁上并关闭');
  check4(m.entered === false && m.powerDone === false && m.breaker === 0, 'R 后进入/供电/电闸全部清空');
  check4(m.secondReturn === false && m.carInspected === false, 'R 后第二次回返与检查记录清空');
  check4(l4.steps.active === false && l4.steps.queue.length === 0 && l4.steps.emitted === 0, 'R 后延迟脚步清空');
  check4(l4.carVisible().second === false && l4.anchors.lightSrA.intensity === 0, 'R 后第二形态隐藏、灯灭');
  check4(l4.anchors.lightRoom.intensity === 0 && l4.anchors.lever.rotation.x > 0.3, 'R 后房灯灭、电闸回到断开位');
  check4(l4.renderInfo.meshes === mesh0 && l4.group.children.length === kids0, 'R 不重建资源');
  check4(l4.state.batteryTaken === false && l4.state.keyTaken === false && l4.hasKey === false, 'R 后钥匙/电池未拾取状态复位');
  check4(l4.interact() === false || l4.state.maint.unlocked === false, 'R 后不会凭残留状态自动开门');
});

T4('U 阶段表：目标与异常来自同一张有限阶段定义，重复互动不倒退', () => {
  const ids = l4.flowIds();
  check4(ids.length === 7, '阶段表长度有限（7 段）', String(ids.length));
  check4(ids[ids.length - 1] === 'witness', '最后一段是“进入车厢检查变化”', ids[ids.length - 1]);
  // R 复位后回到第一段
  check4(l4.stage() === 'approach', '复位后回到第一段', l4.stage());
  l4.setAge(true);
  check4(l4.stage() === 'salvage', '老化后进入“上车清点”段', l4.stage());
  l4.debugState({ items: true });
  check4(l4.stage() === 'unlock', '拿到钥匙电池后进入“用钥匙开门”段', l4.stage());
  l4.debugState({ unlock: true, open: true });
  check4(l4.stage() === 'enter', '门解锁后进入“进入维修间”段', l4.stage());
  l4.debugState({ enterRoom: true });
  check4(l4.stage() === 'power', '只进门没送电：阶段停在“恢复配电箱供电”', l4.stage());
  l4.debugState({ power: true });
  check4(l4.stage() === 'return2', '送电后推进到“沿亮起的应急灯查看隧道”', l4.stage());
  // 反复扳动电闸不倒退、也不跳过
  l4.debugState({ powerOff: true });
  check4(l4.stage() === 'return2', '电闸断开不倒退阶段', l4.stage());
  l4.debugState({ power: true });
  check4(l4.stage() === 'return2', '再次合闸仍是同一阶段', l4.stage());
  l4.debugState({ secondReturn: true });
  check4(l4.stage() === 'witness', '第二次回返推进到“进入车厢检查变化”', l4.stage());
  // 复位清回
  respawnToLevelStart();
  check4(l4.stage() === 'approach', 'R 之后阶段表回到第一段', l4.stage());
});

T4('V 两端回返瞬间：维修间实际几何/发光件都在手电射程外（门/电闸各状态，旧 cz=18 负对照）', () => {
  const M = LAY.maint;
  const reach = l4.artLighting.flashlightDistance;
  const dens = l4.artLighting.fogDensity;
  check4(reach === 19 && Math.abs(dens - 0.078) < 1e-9, '射程与雾密度取自美术常量', reach + ' / ' + dens);

  // 维修间实体：直接取建造时登记的真实盒子（不是按 ROOM 数字另算）
  const boxes = (l4.anchors.maintBoxes || []).map((b) => ({
    x1: b.x1 + L4_OX, x2: b.x2 + L4_OX, y1: b.y1, y2: b.y2, z1: b.z1, z2: b.z2,
  }));
  check4(boxes.length >= 15, '维修间实体几何来自实际建造过程', String(boxes.length));

  const box3 = (o) => {
    const b = new THREE.Box3().setFromObject(o);
    return { x1: b.min.x, x2: b.max.x, y1: b.min.y, y2: b.max.y, z1: b.min.z, z2: b.max.z };
  };
  const lightBox = (l) => ({
    x1: l.position.x + L4_OX, x2: l.position.x + L4_OX,
    y1: l.position.y, y2: l.position.y, z1: l.position.z, z2: l.position.z,
  });
  const camP = () => {
    camera.updateMatrixWorld(true);
    return { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  };
  const gapTo = (p, b) => Math.hypot(
    Math.max(b.x1 - p.x, 0, p.x - b.x2),
    Math.max(b.y1 - p.y, 0, p.y - b.y2),
    Math.max(b.z1 - p.z, 0, p.z - b.z2));
  // 门扇/拉杆是实时变换的实体 → 用真实 Box3 量；灯用真实灯位与真实射程
  const solidsNow = () => boxes.concat([box3(l4.anchors.maintLeaf), box3(l4.anchors.lever),
    lightBox(l4.anchors.lightRoom), lightBox(l4.anchors.lightEmerg)]);
  const nearestNow = (p) => solidsNow().reduce((m, b) => Math.min(m, gapTo(p, b)), Infinity);
  const trans = (d) => Math.exp(-(d * dens) * (d * dens));   // FogExp2 透射率

  respawnToLevelStart();
  l4.setAge(true);
  l4.debugState({ items: true, unlock: true });

  // 状态组合：门开/关 × 电闸断/合，四种都要满足
  const states = [
    ['门关·闸断', { close: true, powerOff: true }],
    ['门开·闸断', { open: true, powerOff: true }],
    ['门开·闸合', { open: true, enterRoom: true, power: true }],
    ['门关·闸合', { close: true }],
  ];

  // 真实走到前接缝并穿过：落点就是"第二次回返瞬间"的相机
  setPose(-2.7, M.cz + 8, 0, 0);
  const fwd = wasdTo(-2.7, SEAM.forward - 6, { maxFrames: 9000, stopOnSeam: true });
  check4(fwd.forward >= 1, '真实走动穿过前接缝', 'forward=' + fwd.forward + ' z=' + f2(fwd.z));
  const pF = camP();
  const nF = nearestNow(pF);
  check4(nF > reach, '正向回返落点：最近维修间实体在手电 19m 之外', '+x ' + f2(nF));
  check4(trans(nF) < 0.01, '正向回返落点：雾透射率低到看不见', f3(trans(nF)));

  // 落点之后继续沿步道走 12m，全程都不能进入射程
  let minWalk = nF;
  for (let s = 2; s <= 12; s += 2) {
    wasdTo(-2.7, pF.z - s, { maxFrames: 900 });   // 往隧道内侧走（离开接缝）
    minWalk = Math.min(minWalk, nearestNow(camP()));
  }
  check4(minWalk > reach, '回返后沿步道走 12m 全程仍在射程外', 'min ' + f2(minWalk));

  // 再真实穿过后接缝，量另一端的落点
  const back = wasdTo(-2.7, SEAM.back + 6, { maxFrames: 14000, stopOnSeam: true });
  check4(back.back >= 1, '真实走动穿过后接缝', 'back=' + back.back + ' z=' + f2(back.z));
  const pB = camP();
  const nB = nearestNow(pB);
  check4(nB > reach, '逆向回返落点：最近维修间实体在手电 19m 之外', '+x ' + f2(nB));
  check4(trans(nB) < 0.01, '逆向回返落点：雾透射率低到看不见', f3(trans(nB)));

  let minWalkB = nB;
  for (let s = 2; s <= 12; s += 2) {
    wasdTo(-2.7, pB.z + s, { maxFrames: 900 });   // 从后接缝落点往隧道内侧走（离开接缝）
    minWalkB = Math.min(minWalkB, nearestNow(camP()));
  }
  check4(minWalkB > reach, '逆向回返后沿步道走 12m 全程仍在射程外', 'min ' + f2(minWalkB));

  // 四种门/闸状态都要满足（门扇与拉杆的实时位置不改变结论）
  const worst = [];
  for (const [tag, opt] of states) {
    l4.debugState(opt);
    const dF = nearestNow(pF), dB = nearestNow(pB);
    worst.push(tag + ':' + f2(Math.min(dF, dB)));
    check4(dF > reach && dB > reach, '门/闸状态「' + tag + '」两端落点都在射程外', f2(dF) + ' / ' + f2(dB));
  }
  // 电闸合上时房灯真的亮着（说明覆盖的是"亮着"的状态，不是被关掉的灯）
  check4(l4.anchors.lightRoom.intensity > 0 && l4.state.maint.breaker > 0.5, '门关·闸合状态下房灯确实亮着');
  check4(l4.anchors.lightRoom.distance <= 8 && l4.anchors.lightEmerg.distance <= 8,
    '维修间灯的实际照射半径远小于落点距离',
    l4.anchors.lightRoom.distance + ' / ' + l4.anchors.lightEmerg.distance);

  // 负对照：把同一批实体平移回旧 cz=18，同样两个落点必须被拦下
  const shift = 18 - M.cz;
  const oldBoxes = solidsNow().map((b) => ({ x1: b.x1, x2: b.x2, y1: b.y1, y2: b.y2, z1: b.z1 + shift, z2: b.z2 + shift }));
  const oldNearest = (p) => oldBoxes.reduce((m, b) => Math.min(m, gapTo(p, b)), Infinity);
  const oF = oldNearest(pF), oB = oldNearest(pB);
  check4(Math.min(oF, oB) < reach, '负对照：旧 cz=18 的正向落点会落进手电射程（这条检查能拦下）', f2(oF) + ' / ' + f2(oB));
  check4(trans(oF) > 0.05, '负对照：旧 cz=18 在雾里仍明显可见', f3(trans(oF)));
});

const preparationErrors = [];
const originalShowErr = showErr;
showErr = (message) => { preparationErrors.push(message); originalShowErr(message); };
try {
  prepareLevelRendering();
  await renderPreparation;
  check4(renderReady === true && preparationErrors.length === 0, '实际等待 art.ready 与异步预热完成，且无错误反馈', preparationErrors.join(';'));
} catch (error) {
  check4(false, '贴图与异步预热失败', error.message);
} finally {
  showErr = originalShowErr;
}

/* ---------------------------------------------------------------- 汇总 */
console.log(__R4.join('\n'));
const __pass4 = __R4.filter((l) => l.startsWith('✓')).length;
const __all4 = __R4.filter((l) => l.startsWith('✓') || l.startsWith('✗')).length;
console.log('\n第四关 Node 断言：' + __pass4 + ' / ' + __all4 + ' 通过，失败 ' + __fail4);
if (__fail4 > 0) {
  console.log('L4-NODE-TESTS-FAILED');
  process.exit(1);
}
console.log('L4-NODE-TESTS-OK');
