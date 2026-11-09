/* 临时探针 3：对比安全高度表与运行时真实姿态（不属于正式回归） */
(function probeSwim3() {
  const mp = POOLS[0];
  try { enterPoolroomsPreview(0, 8.5); } catch (e) { console.log('enter err', e.message); }
  poolDark.active = false; poolDark.timer = 900;
  poolMonster.cool = 999;
  watcher.position.set(0, mp.bottom + DROWNED_FOOT_LIFT, -12.5);
  watcher.rotation.set(0, 0, 0, 'YXZ');
  watcher.userData.anim.blend = 0;
  poolMonster.swim = false; poolMonster.phase = 'stand';
  for (let i = 0; i < 60; i++) updatePoolHorror(1 / 30);   // 先站一会儿，留下站立残余姿态
  player.y = mp.water - 1.2;
  let worst = -99, worstTop = 0, worstY = 0, worstT = 0;
  for (let i = 0; i < 240; i++) {
    updatePoolHorror(1 / 30);
    watcher.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(watcher);
    const above = b.max.y - mp.water;
    if (above > worst) { worst = above; worstTop = b.max.y; worstY = watcher.position.y; worstT = watcher.userData.anim.t; }
  }
  console.log('worst above=' + worst.toFixed(4) + ' boxMax=' + worstTop.toFixed(4)
    + ' posY=' + worstY.toFixed(4) + ' relTop=' + (worstTop - worstY).toFixed(4) + ' t=' + worstT.toFixed(2));
  console.log('table(1.15)=' + DROWNED_TOP_TABLE[DROWNED_TOP_TABLE.length - 1].toFixed(4)
    + ' drownedSwimY=' + drownedSwimY(DROWNED_SWIM_ROT, mp.water).toFixed(4));
  // 用当前运行时状态再量一次表内相位
  const keepT = watcher.userData.anim.t, keepY = watcher.position.y, keepX = watcher.rotation.x;
  watcher.position.set(0, 0, 0); watcher.rotation.set(DROWNED_SWIM_ROT, 0, 0);
  let reMax = -99;
  for (let k = 0; k < 64; k++) {
    watcher.userData.anim.blend = 1; watcher.userData.anim.t = (k / 64) * 2.6;
    animateDrowned(watcher, 0.0001, 'swim');
    watcher.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(watcher);
    reMax = Math.max(reMax, b.max.y);
  }
  console.log('re-measured table(1.15)=' + reMax.toFixed(4));
  watcher.userData.anim.t = keepT; watcher.position.y = keepY; watcher.rotation.x = keepX;
  console.log('PROBE3-DONE');
})();
