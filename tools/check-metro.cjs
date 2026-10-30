// 生成隔离的浏览器检查页；运行后打开 /test-metro.html?level=3。
// 断言直接驱动真实行走和乘车更新函数，拦截结算存档以免污染通关记录。
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');
const online = fs.readFileSync(path.join(root, 'backrooms-pool-online.html'), 'utf8');
assert.equal(online, html
  .replace('"three": "./vendor/three/three.module.js"', '"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"')
  .replace('"three/addons/": "./vendor/three/jsm/"', '"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"'), 'CDN 版未同步');

const smoke = `
{
  const results = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const out = document.createElement('pre');
  out.id = 'metro-check-results';
  out.style.cssText = 'position:fixed;inset:12px;z-index:300;background:#07161a;color:#d7ece4;padding:20px;overflow:auto;white-space:pre-wrap;font:15px monospace';
  document.body.appendChild(out);
  const originalSaveRecords = saveRecords;
  const originalPointerLock = renderer.domElement.requestPointerLock;
  let saveAttempts = 0, error = null;
  let recordsBefore;
  const cx = L3_OX + L3_METRO.centerX;
  const place = (x, z, y = L3_METRO.floor, facing = 0) => {
    keys.clear(); player.x = x; player.z = z; player.y = y;
    player.vy = 0; player.grounded = true; crouchH = 1; yaw = facing; pitch = 0;
    camera.position.set(x, y + EYE, z);
  };
  const walk = (frames, facing, ride = false) => {
    yaw = facing; keys.add('KeyW');
    for (let i = 0; i < frames; i++) { updatePlayer(1 / 60); if (ride) updateLevel3(1 / 60); }
    keys.clear();
  };
  const tickRide = frames => { for (let i = 0; i < frames; i++) { updatePlayer(1 / 60); updateLevel3(1 / 60); } };
  const jumpPeak = () => {
    let peak = player.y + EYE;
    keys.add('Space'); updatePlayer(1 / 60); keys.clear();
    for (let i = 0; i < 90; i++) { updatePlayer(1 / 60); peak = Math.max(peak, player.y + EYE * crouchH); }
    return peak;
  };
  const watchWrites = (target, property) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, property);
    if (!descriptor || !descriptor.configurable || !('value' in descriptor)) throw new Error('无法监测属性：' + property);
    let value = target[property], writes = 0;
    Object.defineProperty(target, property, {
      configurable: true, enumerable: descriptor.enumerable,
      get: () => value,
      set: next => { value = next; writes++; }
    });
    return {
      count: () => writes,
      restore: () => Object.defineProperty(target, property, { ...descriptor, value })
    };
  };
  try {
    recordsBefore = localStorage.getItem(REC_KEY);
    saveRecords = () => { saveAttempts++; };
    // 指针锁依赖真实手势；只隔离该浏览器 API，仍执行完整 hideEndScreen。
    renderer.domElement.requestPointerLock = () => Promise.resolve();
    enterLevel3(true);
    const baseColliderCount = COLLIDERS_L3.length;
    check(LEVEL === 2 && player.x > L3_OX - 13, '第三关以世界坐标进入');
    const dimensions = l3Train.userData.dimensions;
    check(dimensions && dimensions.interiorWidth > RADIUS * 2 + 1 && dimensions.ceilingY - dimensions.floorY > EYE + .7 && dimensions.doorWidth > RADIUS * 2 + .7, '车厢宽度、净高和门宽容纳玩家');
    check(l3Train.getObjectByName('metro-interior-floor') && l3Train.getObjectByName('metro-interior-ceiling'), '车厢有独立地板和天花');

    l3State.breakerOn = true; l3State.leverOn = true; l3TicketCount = 3;
    l3State.trainArrived = true; l3State.trainT = 0;
    for (let i = 0; i < 420; i++) updateLevel3(1 / 60);
    check(l3Train.position.z === 0 && l3State.trainT === 1 && metroReady(), '列车停稳并安装碰撞');
    check(l3State.doorsT > .95, '停稳后车门完全开启');
    const trainColliders = COLLIDERS_L3.filter(c => c.train);
    check(trainColliders.length > 20 && trainColliders.every(c => c.x1 > L3_OX + 5 && c.x2 < L3_OX + 11), '全部车厢碰撞对齐世界坐标');
    installMetroColliders();
    check(COLLIDERS_L3.filter(c => c.train).length === trainColliders.length, '重复安装碰撞保持幂等');
    check(l3TrainColliders.length === trainColliders.length && l3TrainColliders.every((c, i) => c === trainColliders[i]), '独立车厢碰撞列表与全图动态项一致');
    const doorWatches = [], colliderWatches = [];
    const originalTrainX = l3Train.position.x, originalTrainZ = l3Train.position.z, originalDoors = l3State.doorsT;
    try {
      for (const leaf of l3Train.userData.doorLeaves) doorWatches.push(watchWrites(leaf.mesh.position, 'z'));
      for (const c of l3TrainColliders) colliderWatches.push(watchWrites(c, 'x1'));
      for (let i = 0; i < 180; i++) { setMetroDoors(originalDoors); syncMetroColliders(); }
      check(doorWatches.every(w => w.count() === 0), '静止开门状态连续更新不重复写入门模型');
      check(colliderWatches.every(w => w.count() === 0), '静止车厢连续更新不重复写入碰撞');
      const movingDoorCollider = l3TrainColliders.find(c => c.metroDoor);
      const originalDoorColliderZ = movingDoorCollider.z1;
      setMetroDoors(.5);
      check(doorWatches.some(w => w.count() > 0) && l3Train.userData.doorLeaves.every(leaf => Math.abs(leaf.mesh.position.z - leaf.baseZ - (leaf.platformSide ? leaf.direction * .45 : 0)) < .0001), '门值变化时更新实际滑门位置');
      check(Math.abs(movingDoorCollider.z1 - originalDoorColliderZ + movingDoorCollider.metroDoor.direction * .45) < .0001, '门值变化时同步实际滑门碰撞位置');
      const doorWritesAfterChange = doorWatches.map(w => w.count());
      const initialColliderZ = l3TrainColliders[0].z1, initialColliderX = l3TrainColliders[0].x1;
      l3Train.position.z -= 2; setMetroDoors(.5);
      check(Math.abs(l3TrainColliders[0].z1 - initialColliderZ + 2) < .0001, '门值不变而列车纵移时仍同步碰撞');
      check(doorWatches.every((w, i) => w.count() === doorWritesAfterChange[i]), '列车纵移不重复写入相同门值');
      l3Train.position.x += .25; setMetroDoors(.5);
      check(Math.abs(l3TrainColliders[0].x1 - initialColliderX - .25) < .0001, '门值不变而列车横移时仍同步碰撞');
    } finally {
      try {
        l3Train.position.x = originalTrainX; l3Train.position.z = originalTrainZ; setMetroDoors(originalDoors);
      } finally {
        for (const watch of [...doorWatches, ...colliderWatches]) watch.restore();
      }
    }
    place(cx, 0);
    check(metroFloorAt(cx, 0) === L3_METRO.floor && groundAt(cx, 0) === L3_METRO.floor && insideMetro(), '世界坐标下车内判定和地板高度正确');
    place(L3_OX + 4.8, 0, 0);
    check(!startMetroRide(), '站台上无法触发发车');

    for (const door of L3_METRO.doorCenters) {
      place(L3_OX + 4.8, door, 0);
      walk(48, -Math.PI / 2);
      check(insideMetro() && player.x > L3_OX + 6.7 && Math.abs(player.y - L3_METRO.floor) < .02, '从站台步行进入车门 z=' + door);
      walk(48, Math.PI / 2);
      check(player.x < L3_OX + 5.4 && Math.abs(player.y) < .02, '从车门步行返回站台 z=' + door);
    }
    scene.updateMatrixWorld(true);
    check(new THREE.Box3().setFromObject(l3Train).min.x >= L3_OX + 6 - .001, '完整车体与门槛不侵入站台及维修间');
    const ray = new THREE.Raycaster();
    ray.layers.set(STATION_LAYER);
    const opaqueHit = hit => {
      const mats = hit.object.material;
      const material = Array.isArray(mats) ? mats[hit.face.materialIndex] : mats;
      return material && !material.transparent && material.opacity > .95;
    };
    for (const side of [-1, 1]) {
      ray.set(new THREE.Vector3(cx, 1.4, side * 34), new THREE.Vector3(0, 0, side));
      const hit = ray.intersectObject(l3Group, true).find(opaqueHit);
      check(hit && Math.abs(hit.point.z) > 100, '出站隧道有真实开口，没有端墙或黑幕横切车厢 side=' + side);
    }
    for (const door of L3_METRO.doorCenters) {
      for (const height of [.35, 1.4]) {
        ray.set(new THREE.Vector3(L3_OX + 5, height, door), new THREE.Vector3(1, 0, 0));
        const hit = ray.intersectObject(l3Train, true).find(opaqueHit);
        check(hit && hit.point.x > L3_OX + 7, '实际门洞网格无壁板或裙板阻挡 z=' + door + ', y=' + height);
      }
    }

    setMetroDoors(0);
    place(cx, 0);
    walk(90, Math.PI / 2);
    check(player.x > L3_OX + 6.2 && player.y >= 0, '关闭车门阻止走出车厢');
    setMetroDoors(1);
    place(cx, 3);
    walk(90, Math.PI / 2);
    check(player.x >= L3_OX + 6.44 && player.x < cx - .5, '门外侧的实心车壁阻止穿出');
    place(cx, 0);
    walk(200, Math.PI);
    check(player.z <= L3_METRO.halfLength - RADIUS + .01 && player.z > 8, '端墙阻止走出车尾');
    place(cx, -7.65);
    walk(90, -Math.PI / 2);
    check(player.x > cx + 1.1 && player.x <= cx + METRO_IX - RADIUS + .01, '远侧车窗与车壁阻止玩家穿出');

    const seat = COLLIDERS_L3.find(c => c.train && c.kind === 'seat');
    check(!!seat, '座椅有独立碰撞');
    place(cx, (seat.z1 + seat.z2) / 2);
    walk(60, -Math.PI / 2);
    check(player.x <= seat.x1 - RADIUS + .015 && player.x > cx + .2, '横向靠近座椅时被椅沿挡住');
    const pole = COLLIDERS_L3.find(c => c.train && c.kind === 'pole' && c.x2 < cx);
    check(!!pole, '扶手立柱有独立碰撞');
    place(cx, (pole.z1 + pole.z2) / 2);
    walk(60, Math.PI / 2);
    check(player.x >= pole.x2 + RADIUS - .015 && player.x < cx - .2, '扶手立柱阻止玩家穿过');

    place(cx, 0);
    const ceilingPeak = jumpPeak();
    check(ceilingPeak > L3_METRO.floor + EYE + .4 && ceilingPeak < L3_METRO.ceiling - .08, '车内跳跃有动作且头部不穿天花');
    place(L3_OX + L3_METRO.centerX - METRO_IX + .15, 0);
    const doorPeak = jumpPeak();
    check(doorPeak > L3_METRO.floor + EYE + .2 && doorPeak < L3_METRO.doorHeight - .08, '门口跳跃不穿门楣');

    place(cx, 0);
    check(startMetroRide() && l3State.boarded, '在车厢内触发关门发车');
    tickRide(78);
    check(l3State.doorsT === 0, '发车前双扇车门关闭到位');
    tickRide(36);
    const trainZ = l3Train.position.z, localZ = player.z - trainZ;
    tickRide(24);
    check(l3Train.position.z < trainZ - 1 && Math.abs(player.z - l3Train.position.z - localZ) < .02, '加速时列车携带玩家并保持相对位置');
    const beforeWalk = player.z - l3Train.position.z;
    walk(30, Math.PI, true);
    check(player.z - l3Train.position.z > beforeWalk + 1.5, '列车行驶中仍可沿过道走动');
    check(Math.abs(camera.position.z - player.z) < .04 && Math.abs(player.y - L3_METRO.floor) < .02, '行驶时相机、玩家和车厢地板同步');
    tickRide(260);
    check(l3State.rideDone && l3Train.position.z < -40 && player.z < BOUNDS_L3.z1, '列车驶出站台边界后玩家仍留在车内');
    // 第四关衔接：两种乘车选择都在原 6.4s 后进入故障区间，旧的三关最终结算不再出现。
    check(l4RideHandoff && transitioning, '坐到底在 6.4s 后衔接到第四关故障区间（黑场过场已开始）', 'handoff=' + l4RideHandoff);
    check(l3Ending.includes('下一站'), '坐到底保留原车站收尾台词（差异台词未丢）');
    check(!endScreenOpen && document.getElementById('end-overlay').style.display !== 'flex', 'L4 衔接路径不再弹出旧的三关结算层');
    check(document.getElementById('level-fade').style.opacity === '1', '衔接走真实过场淡入而非瞬切');
    hideEndScreen();
    check(!endScreenOpen && document.getElementById('end-overlay').style.display === 'none', '隐藏结算层保持幂等（L4 路径不应再见到结算层）');

    // 过场未走完（同步测试里 setTimeout 不跑）→ LEVEL 仍是 2，R 回到站台；同时放开衔接闸门以便复测
    respawnToLevelStart(); l4RideHandoff = false;
    check(!l3State.boarded && !l3State.rideDone && player.x === L3_SPAWN.x && player.z === L3_SPAWN.z && l3Train.position.z === 0 && l3State.doorsT === 1, 'R 复位恢复站台、到站列车和开门状态');
    updateLevel3(1 / 60);
    check(player.x === L3_SPAWN.x && player.z === L3_SPAWN.z && l3TicketCount === 3 && l3State.breakerOn && l3State.leverOn, '复位后保持任务进度且不被乘车状态拉回');

    place(cx, 0);
    check(startMetroRide(), '复位后可再次乘车');
    tickRide(138);
    keys.add('KeyE'); tickRide(1); keys.clear();
    check(l3State.rideChoice, '行驶中 E 触发紧急制动');
    document.getElementById('play-overlay').style.display = 'none';
    tickRide(260);
    check(l4RideHandoff && l3Ending.includes('紧急制动'), '紧急制动同样衔接到第四关，并保留制动台词差异');
    check(!endScreenOpen && document.getElementById('end-overlay').style.display !== 'flex' && document.getElementById('level-fade').style.opacity === '1', '紧急制动分支走过渡而非旧结算层');
    respawnToLevelStart(); l4RideHandoff = false;
    check(!endScreenOpen && document.getElementById('end-overlay').style.display === 'none' && document.getElementById('play-overlay').style.display === 'flex', 'L4 衔接后 R 仍恢复点击进入入口');
    l3PassTrain.visible = true; l3PassTrain.position.z = 23;
    resetL3State(); resetL3State();
    check(!l3PassTrain.visible && l3PassTrain.position.z === -170, '重玩隐藏并归位过站列车');
    check(!l3State.trainCols && !COLLIDERS_L3.some(c => c.train) && COLLIDERS_L3.length === baseColliderCount && l3Train.position.z === -110 && l3State.doorsT === 0, '重复重置移除全部列车碰撞并归还初始位置');
    check(l3TrainColliders.length === 0, '重复重置清空独立车厢碰撞列表');
    installMetroColliders();
    check(l3TrainColliders.length > 20 && l3TrainColliders.length === COLLIDERS_L3.filter(c => c.train).length && l3TrainColliders.every(c => COLLIDERS_L3.includes(c)), '重置后重新安装保持两份碰撞列表一致');
    resetL3State();
    check(l3TrainColliders.length === 0 && !COLLIDERS_L3.some(c => c.train), '重新安装后的重置不残留车厢碰撞');
    check(l3TicketCount === 0 && l3Tickets.length === 2 && !l3State.boarded && !l3State.rideDone, '重复重置恢复票据与乘车状态');
    check(saveAttempts === 0, '两种乘车选择都不写全游记录（乘车不再触发三关存档结算）');
  } catch (e) { error = e; }
  finally {
    keys.clear(); saveRecords = originalSaveRecords;
    renderer.domElement.requestPointerLock = originalPointerLock;
    try {
      check(saveRecords === originalSaveRecords, '检查结束恢复原存档函数');
      check(localStorage.getItem(REC_KEY) === recordsBefore, '浏览器通关记录保持原值');
    } catch (e) { if (!error) error = e; }
  }
  if (error) {
    document.title = 'FAIL: ' + error.message;
    out.textContent = document.title + '\\n\\n' + results.map(s => '✓ ' + s).join('\\n') + '\\n\\n' + error.stack;
  } else {
    document.title = 'PASS: ' + results.length + ' metro checks';
    out.textContent = document.title + '\\n\\n' + results.map(s => '✓ ' + s).join('\\n');
  }
}
`;
const testHtml = html.replace(/updateOverlayRecord\(\);\s*<\/script>/, smoke + '\nupdateOverlayRecord();\n</script>');
assert.ok(testHtml.includes("out.id = 'metro-check-results'"), '未注入断言');
const moduleSource = testHtml.split('<script type="module">')[1].split('</script>')[0];
const checkPath = path.join(__dirname, '.tmp-metro-check.mjs');
fs.writeFileSync(checkPath, moduleSource);
execFileSync(process.execPath, ['--check', checkPath], { stdio: 'inherit' });
fs.writeFileSync(path.join(root, 'test-metro.html'), testHtml);
console.log('注入模块语法 / CDN 一致性：PASS。浏览器行走与乘车断言：/test-metro.html?level=3');
