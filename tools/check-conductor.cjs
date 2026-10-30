// 生成隔离的检票员行为检查页；不写通关记录，也不需要指针锁。
// node tools/check-conductor.cjs，然后打开 /test-conductor.html?level=3。
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');

const smoke = `
{
  const results = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const out = document.createElement('pre'); out.id = 'conductor-check-results';
  out.style.cssText = 'position:fixed;inset:12px;z-index:350;background:#07161a;color:#d7ece4;padding:22px;overflow:auto;white-space:pre-wrap;font:15px monospace';
  document.body.appendChild(out);
  const originalRandom = Math.random, recordsBefore = localStorage.getItem(REC_KEY);
  let error = null, laneX = L3_OX - 3.35;
  const suppressEvents = () => {
    l3State.nextFlicker = l3State.nextPass = l3State.nextTrainSound = l3State.nextScreen = 1000;
    l3State.nextDrip = l3State.nextClank = l3State.nextPA = 1000;
    l3State.dark = false; l3State.passing = false;
  };
  const place = (x, z, y = 0) => {
    keys.clear(); player.x = x; player.z = z; player.y = y;
    player.vy = 0; player.grounded = true; crouchH = 1; playerCrouch = false;
    camera.position.set(x, y + EYE, z);
  };
  const look = away => {
    const dx = l3Entity.position.x - player.x, dz = l3Entity.position.z - player.z;
    camera.position.set(player.x, player.y + EYE, player.z);
    camera.lookAt(camera.position.x + dx * (away ? -1 : 1), camera.position.y, camera.position.z + dz * (away ? -1 : 1));
    camera.updateMatrixWorld(true); camera.getWorldDirection(_look);
  };
  const tick = (frames, away = false) => {
    for (let i = 0; i < frames; i++) { look(away); updateLevel3(1 / 60); }
    updateConductorLight();
  };
  const activeLightCount = () => {
    let count = 0; scene.traverseVisible(o => { if (o.isLight && o.layers.test(camera.layers)) count++; }); return count;
  };
  const actor = (mode, count = 1, z = 0) => {
    resetL3State(); suppressEvents(); l3TicketCount = count;
    Object.assign(l3State, { entityOn: true, entityT: 0, lookT: 0, mode, patrolDir: 1, patrolX: laneX, chaseT: 9, inspectT: 0, stepT: 10 });
    l3Entity.position.set(laneX, 0, z); l3Entity.visible = true;
    place(laneX, z + 8); look(false);
  };
  try {
    enterLevel3(true); suppressEvents();
    check(camera.layers.mask === (1 << STATION_LAYER), '检票员检查使用第三关渲染层');
    Math.random = () => 0;
    updateLevel3(1 / 60);
    check(!l3State.entityOn && !l3Entity.visible, '没有车票时不生成检票员');

    const ticket = L3_TICKET_DEFS[0]; place(ticket[0], ticket[1], ticket[2] - .75);
    updateL3Proximity(); tryInteract();
    check(l3TicketCount === 1 && l3PickedDefs.includes(0), '通过真实拾票交互解锁检票员');
    updateLevel3(1 / 60); Math.random = () => .99;
    check(l3State.entityOn && l3Entity.visible, '首票后随机判定能生成检票员');
    laneX = l3Entity.position.x;
    check(laneX > L3_OX - 5.5 && laneX < L3_OX + 5.5 && Math.abs(l3Entity.position.z) <= 22.1, '检票员出生点在真实世界坐标的站台内');
    check(l3Entity.parent === scene && Math.abs(l3Entity.position.y) < .01, '独立场景节点以站台地面为脚下高度');
    check(Math.abs(laneX - L3_OX) > 2.4, '巡逻车道避开中央楼梯');

    place(laneX, l3Entity.position.z + 7); look(false); scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(l3Entity);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    check(bounds.min.x > L3_OX - 6 && bounds.max.x < L3_OX + 6 && frustum.intersectsBox(bounds), '实际检票员模型包围盒在站台与相机视锥内');
    const target = new THREE.Vector3(laneX, 1.4, l3Entity.position.z);
    const ray = new THREE.Raycaster(camera.position, target.sub(camera.position).normalize()); ray.layers.set(STATION_LAYER);
    const hit = ray.intersectObject(l3Entity, true)[0];
    check(!!hit && hit.point.x > L3_OX - 6, '射线命中真实检票员网格，而非仅设置可见标记');
    let meshCount = 0; l3Entity.traverse(o => { if (o.isMesh && o.layers.test(camera.layers)) meshCount++; });
    check(meshCount > 12, '检票员身体部件均可由第三关相机渲染');

    const lightCount = activeLightCount(), light = l3Entity.userData.llight;
    updateConductorLight();
    check(light.parent === scene && light.intensity > 0, '提灯仍留在固定灯池并在出现时点亮');
    check(Math.hypot(l3Entity.userData.armR.position.x + l3Entity.userData.lantern.position.x, l3Entity.userData.lantern.position.z) > .50, '提灯伸出外套轮廓，不会被衣身遮住');
    const lanternWorld = new THREE.Vector3(); l3Entity.userData.lantern.getWorldPosition(lanternWorld);
    check(light.position.distanceTo(lanternWorld) < .00001, '提灯光源跟随检票员的真实世界位置');
    const bulb = l3Entity.userData.lantern.userData.bulb, bulbWorld = new THREE.Vector3(); bulb.getWorldPosition(bulbWorld);
    ray.set(camera.position, bulbWorld.sub(camera.position).normalize());
    check(ray.intersectObject(l3Entity, true)[0]?.object === bulb, '提灯发光球可从玩家位置直接看见，不被实心灯罩遮住');
    l3Entity.position.x += .2; updateConductorLight(); l3Entity.userData.lantern.getWorldPosition(lanternWorld);
    check(light.position.distanceTo(lanternWorld) < .00001, '检票员移动后提灯位置同步');
    l3Entity.position.x = laneX;

    actor('patrol'); tick(1);
    check(l3State.mode === 'inspect', '近距离巡逻会进入查票状态');
    l3State.entityT = 3.1;
    tick(60);
    check(l3State.entityOn && l3Entity.visible && l3State.lookT === 0, '正视检票员一秒仍可见，不会误判背对');

    actor('patrol'); place(laneX, 14); tick(60, true);
    check(l3State.entityOn && l3State.lookT === 0, '出现初期背对也保留转头查看的时间');
    l3State.entityT = 3.1; tick(50, true);
    check(!l3State.entityOn && !l3Entity.visible, '同层背对超过零点七秒才退场');
    updateConductorLight();
    check(light.intensity === 0 && activeLightCount() === lightCount, '退场只熄提灯，不改变参与渲染的灯光数量');

    actor('patrol'); l3State.entityT = 3.1; player.y = 5; tick(60, true);
    check(l3State.entityOn && l3Entity.visible && l3State.lookT === 0, '夹层玩家不会因隔层注视方向让地下检票员误退场');

    actor('inspect', 1); tick(100);
    check(l3State.mode === 'chase' && l3Entity.visible, '车票不足时查票结束进入追逐');
    const distanceBefore = Math.hypot(player.x - l3Entity.position.x, player.z - l3Entity.position.z);
    tick(60);
    check(Math.hypot(player.x - l3Entity.position.x, player.z - l3Entity.position.z) < distanceBefore - 1, '追逐实际接近玩家，使用同一世界坐标');
    tick(30, true);
    check(l3State.entityOn && l3State.mode === 'chase', '追逐中背对不会触发巡逻退场');

    actor('inspect', 3);
    for (let i = 0; i < 110 && l3State.mode === 'inspect'; i++) tick(1);
    // 新流程：inspect → yield（0.55s 平滑侧移让行）→ patrol，不再瞬间跳回巡逻
    check(l3State.mode === 'yield' && l3State.entityOn && l3TicketCount === 3, '三张车票查验通过后进入平滑让行');
    tick(60);
    check(l3State.mode === 'patrol' && l3State.entityOn && l3TicketCount === 3, '让行结束后继续巡逻且不扣票');
    actor('inspect', 3); place(laneX, 1); const scaresBefore = stats.scares; tick(110);
    check(l3TicketCount === 3 && stats.scares === scaresBefore && Math.abs(player.z - 1) < .01, '近距离持有三张车票的玩家正常放行，不会无条件被抓');
    actor('chase', 1); place(laneX, 1); tick(1);
    check(!l3State.entityOn && !l3Entity.visible && stats.scares === scaresBefore + 1 && player.x === L3_SPAWN.x && player.z === L3_SPAWN.z, '追逐中接触玩家仍会触发惊吓并送回站台起点');

    actor('patrol', 1, 6); place(L3_OX + 4.8, -20); tick(750);
    check(l3State.entityOn && l3Entity.position.z > 16 && l3Entity.position.x < L3_OX - 2.4 && Math.abs(l3Entity.position.y) < .01, '实际巡逻经过楼梯区时始终走站台侧道');

    actor('patrol', 1, 0); l3State.entityT = 40.01; tick(1);
    check(!l3State.entityOn && !l3Entity.visible, '非追逐状态四十秒后正常退回隧道');
    resetL3State(); updateConductorLight();
    check(!l3State.entityOn && !l3Entity.visible && light.intensity === 0, '重置隐藏检票员并熄灭提灯');

    l3TicketCount = 1; l3State.boarded = true; l3State.rideDone = true; Math.random = () => 0;
    updateLevel3(1 / 60);
    check(!l3State.entityOn && !l3Entity.visible, '乘车结束后不会再生成站台检票员');
    check(activeLightCount() === lightCount, '全部行为阶段保持固定灯光数量');
  } catch (e) { error = e; }
  finally {
    Math.random = originalRandom; keys.clear(); resetL3State(); updateConductorLight();
    try {
      check(Math.random === originalRandom, '检查结束恢复原随机函数');
      check(localStorage.getItem(REC_KEY) === recordsBefore, '检查不会更改通关记录');
    } catch (e) { if (!error) error = e; }
  }
  document.title = error ? 'FAIL: ' + error.message : 'PASS: ' + results.length + ' conductor checks';
  out.textContent = document.title + '\\n\\n' + results.map(s => '✓ ' + s).join('\\n') + (error ? '\\n\\n' + error.stack : '');
}
`;
const testHtml = html.replace(/updateOverlayRecord\(\);\s*<\/script>/, smoke + '\nupdateOverlayRecord();\n</script>');
assert.ok(testHtml.includes("out.id = 'conductor-check-results'"), '未注入检票员检查');
const moduleSource = testHtml.split('<script type="module">')[1].split('</script>')[0];
const checkPath = path.join(__dirname, '.tmp-conductor-check.mjs');
fs.writeFileSync(checkPath, moduleSource);
execFileSync(process.execPath, ['--check', checkPath], { stdio: 'inherit' });
fs.writeFileSync(path.join(root, 'test-conductor.html'), testHtml);
console.log('注入模块语法 PASS。浏览器行为检查：/test-conductor.html?level=3');
