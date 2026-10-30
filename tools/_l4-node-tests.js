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
  check4(l4.bounds.x1 === LX(LAY.walkway.x1) && l4.bounds.x2 === LX(LAY.trough.x2),
    'bounds 取侧壁内表面（宿主会再减半径，不重复扣）', f2(l4.bounds.x1) + '..' + f2(l4.bounds.x2));
  check4(Math.abs(scene.fog.density - l4.artLighting.fogDensity) < 1e-9,
    '雾密度 = art.lighting.fogDensity', String(scene.fog.density));
  check4(scene.fog.color.getHex() === l4.artPalette.fog, '雾色 = art.palette.fog');
  check4(scene.background.getHex() === l4.artPalette.background, '背景色 = art.palette.background');
  check4(scene.environment === null, '第四关不套站台环境图');
  check4(Math.abs(hemi.intensity - l4.artLighting.hemi) < 1e-9, '半球光 = art.lighting.hemi');
  check4(l4.lightCount === 4, '固定灯池 4 盏（不随异变增删）', String(l4.lightCount));
  check4(l4.lights.every((L) => (L.layers.mask & (1 << TUNNEL_LAYER)) !== 0), '4 盏灯都在本关图层');
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
  check4(after.light === 4 && after.cols === before.cols && after.kids === before.kids, '回环不增灯、不改碰撞表');
  check4(windCalls === 0, '跨缝瞬间没有任何音效（接缝不靠声音暴露）', String(windCalls));
});

T4('I 一次性异变：材质与几何都变、资源数量不变', () => {
  const mesh0 = l4.renderInfo.meshes;
  check4(l4.aged === true, '首次正向回返已触发异变');
  check4(l4.anchors.carNormal.visible === false && l4.anchors.carAged.visible === true, '切成锈蚀老旧版本（只切 visible）');
  check4(l4.anchors.lightCarA.intensity === 0 && l4.anchors.lightAged.intensity > 0, '灯池只改强度/颜色，不增删');
  check4(l4.lightCount === 4, '异变后仍是 4 盏灯');
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
  check4(l4.lightCount === 4 && l4.renderInfo.meshes === mesh0, '第二圈没有复制资源');
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
  check4(l4.renderInfo.triangles === tris0 && l4.lightCount === 4, '多圈后三角数/灯数稳定');
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
  check4(l4.lightCount === 4, '复位不重建灯');
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
  check4(now.light === 4, '灯数仍是 4');
  check4(now.kids === base.kids, '场景子节点没有越进越多', String(now.kids));
  check4(l4.state.entered === true && l4.state.aged === false, '重新进入是干净状态');
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
