/* ============================================================================
   L12 行为回归（统一入口追加）：黑影 AI（出生点/视线/最后目击/不穿墙）、
   交互二次校验（距离/高度/遮挡）、池中人（受击/复位/重开/停电后仍在主池且不登岸）、
   第二关直达预览不写档。
   真实 vendor THREE + 真实宿主函数；仅渲染器/画布/音频/图片/DOM 是桩。
   ============================================================================ */
(function l12BehaviorTests() {
  const R = { pass: 0, fail: 0, lines: [] };
  const ok = (c, label, extra) => {
    if (c) { R.pass++; R.lines.push('  OK   ' + label + (extra != null ? '  [' + extra + ']' : '')); }
    else { R.fail++; R.lines.push('  FAIL ' + label + (extra != null ? '  [' + extra + ']' : '')); }
  };
  const sec = t => R.lines.push('\n== ' + t + ' ==');
  const place = (x, z, y) => {
    player.x = x; player.z = z; player.y = y == null ? groundAt(x, z) : y;
    player.vy = 0; player.grounded = y == null; yaw = 0; pitch = 0;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const finite = () => Number.isFinite(entity.position.x) && Number.isFinite(entity.position.y) && Number.isFinite(entity.position.z);

  /* ---------------- A. L0 黑影 AI ---------------- */
  sec('L0 黑影 AI：出生点有效性 / 视线 / 最后目击 / 不穿墙 / 不 NaN');
  LEVEL = 0; ACTIVE_COLLIDERS = COLLIDERS_L0; ACTIVE_BOUNDS = BOUNDS_L0;
  place(L0_SPAWN.x, L0_SPAWN.z);
  endChase(); entityChasing = false; entityState = 'idle'; entity.visible = false; entity.position.set(0, 0, 0);
  startChase(3.0, 12);
  ok(entity.visible && entityState === 'chase', 'startChase 让隐藏实体进入追逐');
  const inB = entity.position.x > BOUNDS_L0.x1 && entity.position.x < BOUNDS_L0.x2 &&
              entity.position.z > BOUNDS_L0.z1 && entity.position.z < BOUNDS_L0.z2;
  ok(inB, '追逐落点在新可走域内', `${entity.position.x.toFixed(1)},${entity.position.z.toFixed(1)}`);
  const d0 = dist(entity.position, player);
  ok(d0 >= 5.0, '落点与玩家保持反应距离', d0.toFixed(2) + 'm');
  // 设计允许在墙后/视野外刷新，但不允许"在玩家眼前 7m 内凭空出现"
  ok(!(entityLOS() && d0 < 7.0), '落点不会在玩家视野内 7m 处凭空出现',
    entityLOS() ? 'visible ' + d0.toFixed(1) + 'm' : 'occluded');
  ok(horrorCoolUntil - performance.now() > 500, '进场后有反应窗口', Math.round(horrorCoolUntil - performance.now()) + 'ms');
  ok(l0Path(entity.position.x, entity.position.z, player.x, player.z) != null, '落点能寻路到玩家');

  // 视线：空场可见；midway 插入实体墙后不可见（负对照）
  const ex = player.x + 2.6, ez = player.z;
  entity.position.set(ex, 0, ez); entityState = 'chase'; entityChasing = true;
  ok(entityLOS(), '同房间无遮挡时能看见玩家');
  const testWall = { x1: (ex + player.x) / 2 - 0.15, x2: (ex + player.x) / 2 + 0.15, z1: player.z - 1.2, z2: player.z + 1.2, y1: 0, y2: 3.0, kind: 'testWall' };
  COLLIDERS_L0.push(testWall);
  ok(!entityLOS(), '负对照：中间加实体墙后视线被挡');
  COLLIDERS_L0.splice(COLLIDERS_L0.indexOf(testWall), 1);
  ok(entityLOS(), '移除测试墙后视线恢复');

  // 丢失视线后转向"最后目击点"，并在 5s 内结束追逐（不再按玩家当前位置穿墙逼近）
  entityChasing = true; entityState = 'chase'; entity.chasePath = null;
  lastSeen.valid = false; lostT = 0;
  const seenX = player.x, seenZ = player.z;
  entity.position.set(seenX + 3.0, 0, seenZ + 0.4);
  updateLevel0(1 / 30);
  ok(lastSeen.valid, '看到玩家时记录最后目击点');
  // 把玩家挪到墙后远处，让视线持续被挡
  place(-136.0, 6.0);
  const wall2 = { x1: -133.0, x2: -132.7, z1: -1, z2: 9, y1: 0, y2: 3.0, kind: 'testWall' };
  COLLIDERS_L0.push(wall2);
  const startD = dist(entity.position, player);
  let minSeenD = 1e9, ended = false;
  for (let i = 0; i < 200; i++) {
    updateLevel0(1 / 30);
    if (!finite()) break;
    if (entityChasing) minSeenD = Math.min(minSeenD, Math.hypot(entity.position.x - seenX, entity.position.z - seenZ));
    if (!entityChasing) { ended = true; break; }
  }
  ok(finite(), '失视阶段坐标保持有限（无 NaN）');
  ok(!entityLOS(), '玩家在墙后时确实不可见（负对照成立）');
  ok(minSeenD < 1.2, '失去视线后朝最后目击点移动，而不是追踪墙后玩家', 'reached ' + minSeenD.toFixed(2) + 'm');
  ok(ended, '失视 5s 内结束追逐');
  ok(dist(entity.position, player) > 1.5, '结束追逐时没有隔墙抓到玩家', dist(entity.position, player).toFixed(2) + 'm');
  COLLIDERS_L0.splice(COLLIDERS_L0.indexOf(wall2), 1);

  // 寻路缓存：0.45s 内复用同一份路径；失视且目标改变后，重规划必须指向最后目击点
  place(-136.0, 0.0);
  entity.visible = true; entityChasing = true; entityState = 'chase';
  entity.position.set(-133.0, 0, 0.0);
  lastSeen.valid = false; lostT = 0; replanT = 0; entityPath = null;
  chaseLeft = 12;   // 前面的长追逐已把计时耗尽，这里显式给足追逐时间
  updateLevel0(1 / 30);
  const pathA = entityPath;
  ok(!!pathA, '看得见玩家时建立了追逐路径');
  updateLevel0(1 / 30);
  ok(entityPath === pathA && replanT > 0, '0.45s 内复用缓存路径（未每帧重算）',
    'same=' + (entityPath === pathA) + ' replanT=' + replanT.toFixed(2));
  // 玩家躲到墙后，最后目击点设到远处另一点：重规划后终点必须指向它
  place(-136.0, 6.0);
  const wall3 = { x1: -133.4, x2: -133.1, z1: -2, z2: 10, y1: 0, y2: 3.0, kind: 'testWall' };
  COLLIDERS_L0.push(wall3);
  lastSeen.x = -120.0; lastSeen.z = 0.0; lastSeen.valid = true;
  replanT = 0; lostT = 0;
  let replanned = 0;
  for (let i = 0; i < 24; i++) {
    updateLevel0(1 / 30);
    if (replanT > 0.40) replanned++;
    if (!entityChasing) break;
  }
  const pathB = entityPath;
  const targetB = pathB && pathB.length ? pathB[pathB.length - 1] : null;
  ok(replanned > 0, '失视目标改变后发生重规划（replanT 被重置为 0.45）', 'replans=' + replanned);
  ok(targetB && Math.hypot(targetB.x - lastSeen.x, targetB.z - lastSeen.z) < 1.8,
    '重算后的路径终点指向最后目击点而不是墙后玩家',
    targetB ? 'seen ' + lastSeen.x.toFixed(1) + ',' + lastSeen.z.toFixed(1) + ' → ' + targetB.x.toFixed(1) + ',' + targetB.z.toFixed(1) : 'null');
  COLLIDERS_L0.splice(COLLIDERS_L0.indexOf(wall3), 1);

  // 定向长追逐：固定起点（走廊内、有视线），验证沿路逼近且从不穿墙
  place(-136.0, 0.0);
  entityChasing = false; entity.visible = false;
  startChase(3.0, 40);
  entity.visible = true; entityChasing = true; entityState = 'chase';
  entity.position.set(-129.5, 0, 0.6);
  chaseLeft = 20; replanT = 0; entityPath = null; lastSeen.valid = false; lostT = 0;
  const penAt = (x, z) => COLLIDERS_L0.some(c => {
    if (c.y1 != null && c.y1 > 0.75) return false;
    return x > c.x1 + 0.02 && x < c.x2 - 0.02 && z > c.z1 + 0.02 && z < c.z2 - 0.02;
  });
  let pen = 0, nan = 0, travel = 0, rearmN = 0;
  let px0 = entity.position.x, pz0 = entity.position.z;
  const dStart = dist(entity.position, player);
  for (let i = 0; i < 150; i++) {
    updateLevel0(1 / 30);
    if (!finite()) { nan++; break; }
    if (penAt(entity.position.x, entity.position.z)) pen++;
    travel += Math.hypot(entity.position.x - px0, entity.position.z - pz0);
    px0 = entity.position.x; pz0 = entity.position.z;
    if (!entityChasing) { startChase(3.0, 40); entity.visible = true; entityChasing = true; entity.position.set(-129.5, 0, 0.6); chaseLeft = 20; rearmN++; }
  }
  const dEnd = dist(entity.position, player);
  ok(nan === 0, '150 帧追逐无 NaN');
  ok(pen === 0, '150 帧追逐实体中心从不落在墙体内', 'penetrations=' + pen);
  ok(travel > 1.5, '追逐中实体沿路移动（累计位移，不是原地卡住）', travel.toFixed(2) + 'm / 重新起追 ' + rearmN);
  ok(dEnd < dStart - 1.0, '追逐确实缩短了与玩家的距离', dStart.toFixed(2) + '→' + dEnd.toFixed(2) + 'm');

  /* ---------------- B. 交互二次校验 ---------------- */
  sec('交互：先取得可交互目标，再只改「距离 / 高度 / 遮挡」其一，执行时必须重验并拒绝');
  LEVEL = 0; ACTIVE_COLLIDERS = COLLIDERS_L0; ACTIVE_BOUNDS = BOUNDS_L0;
  fuses = 0; exitUnlocked = false; fusesList.length = 0; spawnFuseList();
  const f0 = fusesList[0];
  place(f0.x + 1.0, f0.z);
  updateFuseProximity();
  ok(nearestFuse === f0, '正对照：近距离能取得可交互保险丝', 'nearest=' + (nearestFuse ? nearestFuse.on : 'null'));
  // 1) 只改距离（缓存仍是刚才那枚，执行时必须自己重验）
  place(f0.x + 3.4, f0.z);
  tryFuse();
  ok(fuses === 0, '缓存命中但距离不足：执行时被拒，计数不变', 'fuses=' + fuses);
  ok(nearestFuse === null, '被拒后清空缓存，避免继续按 E 远程拾取');
  // 2) 只改高度
  place(f0.x + 1.0, f0.z);
  updateFuseProximity();
  const gotHeight = nearestFuse === f0;
  player.y = -3.0;
  tryFuse();
  ok(gotHeight && fuses === 0, '缓存命中但高度不符：执行时被拒', 'got=' + gotHeight + ' fuses=' + fuses);
  // 3) 只加遮挡
  place(f0.x + 1.0, f0.z); player.y = 0; updateFuseProximity();
  const gotOcc = nearestFuse === f0;
  const fWall = { x1: f0.x + 0.45, x2: f0.x + 0.70, z1: f0.z - 1.0, z2: f0.z + 1.0, y1: 0, y2: 3.0, kind: 'testWall' };
  COLLIDERS_L0.push(fWall);
  tryFuse();
  ok(gotOcc && fuses === 0, '负对照：隔墙时候选被挡住，执行时被拒', 'got=' + gotOcc);
  COLLIDERS_L0.splice(COLLIDERS_L0.indexOf(fWall), 1);
  // 4) 恢复所有条件后确实能取（证明前面的拒绝不是因为对象本身不可用）
  place(f0.x + 1.0, f0.z); player.y = 0;
  updateFuseProximity();
  tryFuse();
  ok(fuses === 1, '恢复条件后同一个保险丝可以正常拾取', 'fuses=' + fuses);

  // 拾取物：同一套"缓存 + 执行时重验"，避免只有保险丝被覆盖
  LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
  const pk = pickups[0];
  place(pk.x + 1.0, pk.z, pk.waterY - 0.4);
  updatePickups(1 / 60);
  ok(nearestPickup === pk, '正对照：水面近处能取得可交互拾取物', 'nearest=' + (nearestPickup ? nearestPickup.kind : 'null'));
  const beforePicked = pickedCount, beforeLen = pickups.length;
  place(pk.x + 3.2, pk.z, pk.waterY - 0.4);
  tryPickup();
  ok(pickups.length === beforeLen && pickedCount === beforePicked, '缓存命中但距离不足：tryPickup 执行时被拒');
  place(pk.x + 1.0, pk.z, pk.waterY - 0.4);
  updatePickups(1 / 60);
  const gotPk = nearestPickup === pk;
  tryPickup();
  ok(gotPk && pickups.length === beforeLen - 1 && pickedCount === beforePicked + 1, '恢复距离后同一件可以正常拾取');

  /* ---------------- C. 池中人：受击 / 复位 / 重开 / 停电 ---------------- */
  sec('L37 池中人：受击 / R 复位 / 重开 / 停电后仍在主池，且不登岸追人');
  LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
  const mp = POOLS[0];
  const inMainPool = (p, pad = 0) => p.x > mp.x1 + pad && p.x < mp.x2 - pad && p.z > mp.zDeep1 + pad && p.z < mp.zEnd - pad;
  const home = watcherHome();
  watcher.position.set(home.x, home.y, home.z);
  markHorrorCooldown(0);
  poolMonster.cool = 0;
  const s0 = stats.scares;
  poolScare('测试受击');
  const s1 = stats.scares;
  ok(s1 === s0 + 1, '受击计数一次', `${s0}→${s1}`);
  ok(inMainPool(watcher.position), '受击后池中人仍在主池内');
  ok(watcher.position.y <= mp.water + 0.02, '受击后仍在水面以下（不站上岸）');
  poolScare('冷却内第二次');
  ok(stats.scares === s1, '冷却窗口内不会重复结算受击');

  respawnToLevelStart();
  ok(inMainPool(watcher.position), 'R 复位后池中人仍在主池内');
  ok(Math.hypot(player.x - L37_SPAWN.x, player.z - L37_SPAWN.z) < 0.6, 'R 复位把玩家送回接待出生点');

  resetGame();
  ok(inMainPool(watcher.position), '重开游戏后池中人回到主池内');
  ok(watcher.position.y <= mp.water + 0.02, '重开后仍在水面以下');

  // 停电迁移：真实分支是 active===false && timer<=0（熄灭那一刻换位），不是 active===true
  LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
  watcher.position.set(home.x, home.y, home.z);
  place(mp.x1 + 1.2, mp.zEnd - 1.2, mp.water - 1.0);   // 玩家在池内一角，远离多数候选点
  markHorrorCooldown(0); poolMonster.cool = 0;
  let mig = 0, near = 0, outside = 0, bboxBad = 0;
  const spots = new Set();
  for (let i = 0; i < 40; i++) {
    const bx0 = watcher.position.x, bz0 = watcher.position.z;
    poolDark.active = false; poolDark.timer = 0;
    updatePoolHorror(1 / 20);
    const moved = Math.hypot(watcher.position.x - bx0, watcher.position.z - bz0);
    if (moved > 0.2) mig++;
    if (Math.hypot(watcher.position.x - player.x, watcher.position.z - player.z) < 4.2) near++;   // 容差 0.4m：迁移当帧仍会朝玩家游动数厘米
    if (!inMainPool(watcher.position, 0.75)) outside++;
    const bb = new THREE.Box3().setFromObject(watcher);
    if (bb.min.x < mp.x1 - 0.05 || bb.max.x > mp.x2 + 0.05 || bb.min.z < mp.zDeep1 - 0.05 || bb.max.z > mp.zEnd + 0.05) bboxBad++;
    spots.add(watcher.position.x.toFixed(2) + ',' + watcher.position.z.toFixed(2));
  }
  poolDark.active = false; poolDark.timer = 40;
  ok(mig > 0, '停电迁移分支确实触发（active=false + timer<=0）', 'migrations=' + mig);
  ok(near === 0, '每次迁移都不会闪到玩家身边（≥4.2m，含同帧游动容差）', 'near=' + near);
  ok(outside === 0, '迁移点都在主池有效水域内', 'outside=' + outside);
  ok(bboxBad === 0, '迁移后完整模型边界不越池壁（非仅中心点）', 'bboxBad=' + bboxBad);
  ok(spots.size >= 2, '候选点确实在多个水下点之间轮换', 'spots=' + spots.size);

  // 负对照：把玩家放在某候选点上，迁移必须避开它
  const nearSpot = WATCHER_SPOTS[0];
  place(nearSpot[0], nearSpot[1], mp.water - 1.0);
  markHorrorCooldown(0); poolMonster.cool = 0;
  let landedOnNear = 0;
  for (let i = 0; i < 24; i++) {
    poolDark.active = false; poolDark.timer = 0;
    updatePoolHorror(1 / 20);
    if (Math.hypot(watcher.position.x - player.x, watcher.position.z - player.z) < 4.2) landedOnNear++;
  }
  poolDark.active = false; poolDark.timer = 40;
  ok(landedOnNear === 0, '负对照：玩家就站在候选点上时也不会闪到身边（≥4.2m）', 'near=' + landedOnNear);

  // 玩家在岸上：池中人不得登岸
  place(19.0, -14.0);
  markHorrorCooldown(0); poolMonster.cool = 0;
  let onDeck = 0;
  for (let i = 0; i < 240; i++) {
    updatePoolHorror(1 / 30);
    if (!inMainPool(watcher.position, 0.02)) onDeck++;
    if (watcher.position.y > mp.water + 0.02) onDeck++;
  }
  ok(onDeck === 0, '玩家在干地 240 帧内池中人没有上岸/出水', 'violations=' + onDeck);

  /* ---------------- D. 预览不写档 ---------------- */
  sec('第二关直达预览：建关到位但不写存档');
  const REC = 'poolrooms.records.v1';
  const beforeRec = localStorage.getItem(REC);
  enterPoolroomsPreview();
  const afterRec = localStorage.getItem(REC);
  ok(beforeRec === afterRec, '预览不写存档（REC_KEY 未变化）', beforeRec === afterRec ? 'unchanged' : 'changed');
  ok(LEVEL === 1, '预览直接进入第二关');
  ok(Math.hypot(player.x - L37_SPAWN.x, player.z - L37_SPAWN.z) < 0.6, '预览出生点与 L37_SPAWN 一致');
  ok(ACTIVE_COLLIDERS === COLLIDERS && ACTIVE_BOUNDS === BOUNDS, '预览使用第二关碰撞与边界');

  sec('恢复点朝向：初始化 / 被抓 / R 复位 / 再玩 都取 plan 的 spawn.yaw');
  {
    const wantL0 = L12P.L0.spawn.yaw, wantL37 = L12P.L37.spawn.yaw;
    ok(Number.isFinite(wantL0) && Number.isFinite(wantL37), 'plan 里两关都有有限数值的出生朝向', 'L0=' + wantL0 + ' L37=' + wantL37);
    LEVEL = 0; ACTIVE_COLLIDERS = COLLIDERS_L0; ACTIVE_BOUNDS = BOUNDS_L0;
    const y0 = yaw;
    safeRespawn(0);
    ok(Number.isFinite(yaw) && Math.abs(yaw - wantL0) < 1e-6, 'safeRespawn(0) 后朝向 = plan L0 yaw', 'yaw=' + yaw);
    yaw = 1.234;
    respawnToLevelStart();
    ok(Math.abs(yaw - wantL0) < 1e-6, 'R 复位后朝向 = plan L0 yaw', 'yaw=' + yaw);
    yaw = -0.777;
    resetGame();
    ok(Math.abs(yaw - wantL0) < 1e-6, 'resetGame 后朝向 = plan L0 yaw', 'yaw=' + yaw);
    ok(Number.isFinite(L0_SPAWN.yaw) && Math.abs(L0_SPAWN.yaw - wantL0) < 1e-6, 'L0_SPAWN.yaw 由 plan 派生（不是 undefined）');
    LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
    yaw = 0;
    safeRespawn(1);
    ok(Math.abs(yaw - wantL37) < 1e-6, 'L37 safeRespawn 朝向 = plan L37 yaw（未被 L0 逻辑覆盖）', 'yaw=' + yaw);
    LEVEL = 0; ACTIVE_COLLIDERS = COLLIDERS_L0; ACTIVE_BOUNDS = BOUNDS_L0;
    void y0;
  }

  sec('毛发：锥体方向（发根粗、发梢细且朝下）');
  {
    const radiusProfile = geo => {
      const pos = geo.attributes.position;
      let rootR = 0, tipR = 0, maxY = -1e9, minY = 1e9;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i));
        maxY = Math.max(maxY, y); minY = Math.min(minY, y);
        if (y > -0.02) rootR = Math.max(rootR, r);
        if (y < (minY + (maxY - minY) * 0.25)) tipR = Math.max(tipR, r);
      }
      return { rootR, tipR, maxY, minY };
    };
    const ex = entity.userData.rig.strands[0];
    const pr = radiusProfile(ex.geometry);
    ok(pr.maxY <= 0.002, '黑影发束几何顶端在发根（不向上伸）', 'maxY=' + pr.maxY.toFixed(3));
    ok(pr.rootR > pr.tipR * 1.4, '黑影发束发根比发梢粗（锥尖朝下）', 'root=' + pr.rootR.toFixed(3) + ' tip=' + pr.tipR.toFixed(3));
    const dl = watcher.userData.rig.strands[0];
    const lockMesh = dl.isMesh ? dl : dl.children.find(c => c.isMesh);
    const pr2 = radiusProfile(lockMesh.geometry);
    ok(pr2.maxY <= 0.002, '池中人发绺几何顶端在发根', 'maxY=' + pr2.maxY.toFixed(3));
    ok(pr2.rootR > pr2.tipR * 1.3, '池中人发绺发根比发梢粗（锥尖朝下）', 'root=' + pr2.rootR.toFixed(3) + ' tip=' + pr2.tipR.toFixed(3));
  }

  sec('黑影眼部：真实射线必须先在眼表面命中（不能"存在但埋在头里"）');
  {
    entity.visible = true; entity.rotation.set(0, 0, 0); entity.scale.setScalar(ENTITY_SCALE);
    entity.updateMatrixWorld(true);
    const head = entity.userData.rig.head, eyes = entity.userData.rig.eyeMeshes || [];
    ok(eyes.length === 2, '头脸挂了两枚眼缝网格', 'eyes=' + eyes.length);
    // (1) 数值：眼中心 + 半深必须在头壳解析曲面之外
    const skullZ = (x, y) => {
      const rx = 0.148 * 0.86, ry = 0.148 * 1.02, rz = 0.148 * 1.04;
      const nx = x / rx, ny = (y - 0.02) / ry;
      const k = 1 - nx * nx - ny * ny;
      return k > 0 ? 0.005 + rz * Math.sqrt(k) : -Infinity;
    };
    const halfDepth = 0.019 * 0.28;
    let proud = 0;
    for (const e of eyes) {
      const p = e.position, surf = skullZ(p.x, p.y);
      if (p.z + halfDepth > surf) proud++;
    }
    ok(proud === eyes.length, '两眼前表面都在头壳解析曲面之外', 'proud=' + proud);
    // (2) 真实 THREE 射线：从脸前方沿 -forward 射向眼中心，首个命中必须是眼
    const rc = new THREE.Raycaster();
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(entity.quaternion).normalize();
    let eyeFirst = 0;
    for (const e of eyes) {
      const wp = new THREE.Vector3(); e.getWorldPosition(wp);
      rc.set(wp.clone().addScaledVector(fwd, 0.35), fwd.clone().negate());
      rc.far = 0.5;
      const hits = rc.intersectObject(entity, true).filter(h => h.object.visible);
      if (hits.length && hits[0].object === e) eyeFirst++;
    }
    ok(eyeFirst >= 1, '至少一只眼是"脸前方射线"的首个命中（未被头壳/发束挡住）', 'eyeFirst=' + eyeFirst);
    // 负对照：把一只眼压回头壳内 1cm，同一射线必须不再以眼为首个命中
    const victim = eyes[0], savedZ = victim.position.z;
    victim.position.z = 0.10; entity.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); victim.getWorldPosition(wp);
    rc.set(wp.clone().addScaledVector(fwd, 0.35), fwd.clone().negate()); rc.far = 0.5;
    const buried = rc.intersectObject(entity, true).filter(h => h.object.visible);
    ok(!(buried.length && buried[0].object === victim), '负对照：眼埋进头壳后不再被射线首先命中',
      buried.length ? buried[0].object.name || buried[0].object.type : 'no-hit');
    victim.position.z = savedZ; entity.updateMatrixWorld(true);
  }

  R.lines.push('\nL12-BEHAVIOR 回归：' + R.pass + ' / ' + (R.pass + R.fail) + ' PASS');
  console.log(R.lines.join('\n'));
  if (R.fail > 0) process.exitCode = 1;
})();
