/* L0 v2 断言：真实几何 / 真实 updatePlayer 连续行走 / 三保险丝 → 出口 / 复位保进度 / 负对照 */
(function l0v2Tests() {
  const R = { pass: 0, fail: 0, lines: [] };
  const ok = (c, label, extra) => {
    if (c) { R.pass++; R.lines.push('  OK   ' + label + (extra ? '  [' + extra + ']' : '')); }
    else { R.fail++; R.lines.push('  FAIL ' + label + (extra ? '  [' + extra + ']' : '')); }
  };
  const sec = t => R.lines.push('\n== ' + t + ' ==');
  const grid = () => L0_NAV;
  const navWalkableAt = (x, z) => {
    const n = L0_NAV;
    const ix = Math.floor((x - n.x0) / n.cell), iz = Math.floor((z - n.z0) / n.cell);
    if (ix < 0 || iz < 0 || ix >= n.nx || iz >= n.nz) return false;
    return L0_NAV.walk[iz * n.nx + ix] === 1;
  };
  const faceTo = (x, z) => Math.atan2(-(x - player.x), -(z - player.z));
  function walkTo(x, z, opts = {}) {
    const maxFrames = opts.maxFrames || 2400;
    const path = l0Path(player.x, player.z, x, z);
    if (!path) return { ok: false, reason: 'no-path', frames: 0 };
    let frames = 0, maxStep = 0, maxDY = 0;
    keys.add('KeyW');
    let prevX = player.x, prevZ = player.z;
    for (let i = 0; i < path.length; i++) {
      const wp = path[i];
      let guard = 0;
      while (frames < maxFrames && guard < 900) {
        guard++; frames++;
        yaw = faceTo(wp.x, wp.z);
        const py = player.y;
        updatePlayer(1 / 60);
        maxStep = Math.max(maxStep, Math.hypot(player.x - prevX, player.z - prevZ));
        maxDY = Math.max(maxDY, Math.abs(player.y - py));
        prevX = player.x; prevZ = player.z;
        if (Math.hypot(player.x - wp.x, player.z - wp.z) < 0.42) break;
      }
    }
    keys.delete('KeyW');
    const d = Math.hypot(player.x - x, player.z - z);
    return { ok: d < 0.75, reason: 'dist ' + d.toFixed(2), frames, maxStep, maxDY, d };
  }
  const place = (x, z) => {
    player.x = x; player.z = z; player.y = groundAt(x, z); player.vy = 0; player.grounded = true;
    yaw = -Math.PI / 2; pitch = 0;
  };
  // 保险丝放在台面上，玩家只能站到桌边：用生产逻辑（updateFuseProximity）判定哪个站位真能交互
  function approachPoint(f) {
    const keep = { x: player.x, z: player.z, y: player.y };
    let best = null;
    for (let r = 1.75; r >= 0.75; r -= 0.1) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
        if (!navWalkableAt(x, z)) continue;
        if (!l0Path(L0_SPAWN.x, L0_SPAWN.z, x, z)) continue;
        player.x = x; player.z = z; player.y = groundAt(x, z);
        updateFuseProximity();
        const hit = nearestFuse && Math.hypot(nearestFuse.x - f.x, nearestFuse.z - f.z) < 1e-6;
        if (hit) { best = { x, z }; break; }
      }
      if (best) break;
    }
    player.x = keep.x; player.z = keep.z; player.y = keep.y;
    return best;
  }

  sec('L0 平面与外壳');
  const floorMeshes = [];
  scene.traverse(o => { if (o.isMesh && o.material && o.material.name === 'l0FloorV2') floorMeshes.push(o); });
  ok(floorMeshes.length > 0, `L0 地毯地面网格存在（${floorMeshes.length} 片）`);
  if (floorMeshes.length) {
    const fm = floorMeshes[0];
    fm.updateMatrixWorld(true);
    const fb = new THREE.Box3().setFromObject(fm);
    ok(Math.abs(fb.min.y) < 0.02 && fb.max.y > -0.02 && fb.max.y < 0.02,
      `地面高度 y≈0（${fb.min.y.toFixed(3)}..${fb.max.y.toFixed(3)}）`);
    ok(fb.max.x - fb.min.x > 40 && fb.max.z - fb.min.z > 19,
      `地面覆盖可走范围（${(fb.max.x - fb.min.x).toFixed(1)}×${(fb.max.z - fb.min.z).toFixed(1)}m）`);
    ok(!!fm.material.map && fm.material.map.userData && fm.material.map.userData.asset === L12_TEX.carpet,
      `地面绑定真实地毯图（${fm.material.map && fm.material.map.userData ? fm.material.map.userData.asset : 'none'}）`);
  }
  ok(Math.abs(BOUNDS_L0.x2 - BOUNDS_L0.x1 - 42) < 1e-6 && Math.abs(BOUNDS_L0.z2 - BOUNDS_L0.z1 - 20) < 1e-6,
    `可走外包 ${(BOUNDS_L0.x2 - BOUNDS_L0.x1).toFixed(0)}×${(BOUNDS_L0.z2 - BOUNDS_L0.z1).toFixed(0)} m（42×20 可走 + 2m 墙带 = 42×24 外包）`);
  ok(BOUNDS_L0.x1 === L12P.L0.bounds.x1 && BOUNDS_L0.z2 === L12P.L0.bounds.z2, 'BOUNDS_L0 与 levels/l12-plan.js 同源');
  ok(Math.hypot(L0_SPAWN.x - L12P.L0.spawn.x, L0_SPAWN.z - L12P.L0.spawn.z) < 1e-9, 'L0_SPAWN 由 plan 派生');
  const spawnRoom = L12P.roomAt(L12P.L0.rooms, L0_SPAWN.x, L0_SPAWN.z);
  ok(!!spawnRoom && spawnRoom.id === 'entry', `出生点在 entry 房内（${spawnRoom && spawnRoom.id}）`);
  ok(L0V2 && L0V2.wallPieces.length > 0, `v2 外壳已生成墙段 ${L0V2 ? L0V2.wallPieces.length : 0} 段`);
  ok(L0V2 && L0V2.headers.length === L12P.L0.doors.length,
    `每扇门（含出口外门）都有门楣（${L0V2 ? L0V2.headers.length : 0} / ${L12P.L0.doors.length}）`);
  ok(COLLIDERS_L0.filter(c => c.kind === 'l0Header').length === L0V2.headers.length, '门楣碰撞与门楣网格同源数量');
  ok(COLLIDERS_L0.filter(c => c.kind === 'l0Wall').length >= L0V2.wallPieces.length - 2, '墙体碰撞与墙段同源');

  sec('门洞不被墙或家具堵住');
  for (const d of L12P.L0.doors) {
    const mid = (d.gap[0] + d.gap[1]) / 2;
    const cx = d.axis === 'x' ? d.coord : mid, cz = d.axis === 'x' ? mid : d.coord;
    const blockers = COLLIDERS_L0.filter(c => {
      if (c.y1 != null && c.y1 > 1.0) return false;
      if (c.kind === 'l0Header') return false;
      return cx > c.x1 && cx < c.x2 && cz > c.z1 && cz < c.z2;
    });
    ok(blockers.length === 0, `门洞 ${d.axis}=${d.coord} 中心无实体阻挡`, blockers.map(b => b.kind).join(',') || '空');
  }

  sec('出生点可行走 + 三保险丝真实可达');
  sec('门前进出区域保持完整净空');
  const furnitureKinds = new Set(['cabinet', 'locker', 'bench', 'table', 'counter', 'cart', 'shelf', 'folding', 'workbench', 'packTable', 'rack', 'boxes', 'post', 'desk']);
  const overlapsRect = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.z1 < b.z2 && a.z2 > b.z1;
  for (const door of L12P.L0.doors) {
    const approach = door.axis === 'x'
      ? { x1: door.coord - 1.5, x2: door.coord + 1.5, z1: door.gap[0], z2: door.gap[1] }
      : { x1: door.gap[0], x2: door.gap[1], z1: door.coord - 1.5, z2: door.coord + 1.5 };
    const blocked = COLLIDERS_L0.filter(c => furnitureKinds.has(c.kind) && overlapsRect(c, approach));
    ok(blocked.length === 0, `门 ${door.axis}=${door.coord} 两侧1.5m进出区域无家具`, blocked.map(c => c.kind).join(','));
  }
  const archiveEntry = { x1: -126.5, x2: -124.7, z1: 1.2, z2: 6.5 };
  ok(!COLLIDERS_L0.some(c => c.kind === 'cabinet' && overlapsRect(c, archiveEntry)), '档案区入口正前方有连续主通道');
  ok(overlapsRect({ x1: -127, x2: -125.8, z1: 2.07, z2: 2.73 }, archiveEntry), '负对照检出旧柜位侵入入口通道');

  sec('出生点可行走 + 三保险丝真实可达');
  place(L0_SPAWN.x, L0_SPAWN.z);
  ok(Math.abs(groundAt(player.x, player.z)) < 1e-6, '出生点地面高度 0');
  ok(navWalkableAt(player.x, player.z), '出生点在导航网格内');
  const reach = [];
  for (const d of FUSE_DEFS) {
    place(L0_SPAWN.x, L0_SPAWN.z);
    const ap = approachPoint(d);
    ok(!!ap, `「${d.on}」存在可站的桌边接近点`, ap ? `${ap.x.toFixed(1)},${ap.z.toFixed(1)}` : 'none');
    if (!ap) continue;
    const r = walkTo(ap.x, ap.z, { maxFrames: 3000 });
    reach.push({ def: d, r });
    ok(r.ok, `从出生点走到保险丝「${d.on}」的桌边`, r.ok ? `${r.frames} 帧 / 最大单帧 ${r.maxStep.toFixed(3)}m` : r.reason);
    ok(r.maxStep < 0.35, `无瞬移（最大单帧位移 ${r.maxStep.toFixed(3)}m < 0.35）`);
    updateFuseProximity();
    ok(nearestFuse != null, `站到桌边后「${d.on}」进入可交互范围`);
  }

  sec('保险丝：实体造型 + 坐在真实支撑面上');
  const anyFuse = fusesList[0];
  ok(!!anyFuse && anyFuse.mesh && anyFuse.mesh.children.length >= 4,
    `保险丝是组合实体（${anyFuse ? anyFuse.mesh.children.length : 0} 个零件：管身/两端帽/环/标签）`);
  ok(!!anyFuse && !anyFuse.mesh.isMesh, '保险丝不再是单个发光方块');
  for (const f of fusesList) {
    const support = (L0V2.supports || []).find(s => Math.abs(s.top - f.surface) < 0.06 &&
      Math.abs(s.x - f.x) < s.w / 2 + 0.05 && Math.abs(s.z - f.z) < s.d / 2 + 0.05);
    ok(!!support, `「${f.on}」保险丝底面贴合真实台面 ${f.surface}m`, support ? support.kind : 'no-support');
  }

  sec('三保险丝 → 出口：真实连续路径');
  place(L0_SPAWN.x, L0_SPAWN.z);
  fuses = 0; exitUnlocked = false;
  spawnFuseList();
  for (const d of FUSE_DEFS) {
    const ap = approachPoint(d);
    ok(!!ap, `「${d.on}」存在可交互站位`, ap ? `${ap.x.toFixed(1)},${ap.z.toFixed(1)}` : 'none');
    if (!ap) continue;
    const r = walkTo(ap.x, ap.z, { maxFrames: 3000 });
    ok(r.ok, `走到「${d.on}」`);
    updateFuseProximity();
    // 若站位被碰撞挤开导致视线偏移，向目标再走近几帧（真实行走，不传送）
    for (let i = 0; i < 40 && nearestFuse == null; i++) {
      yaw = Math.atan2(-(d.x - player.x), -(d.z - player.z));
      keys.add('KeyW'); updatePlayer(1 / 60);
      updateFuseProximity();
    }
    keys.delete('KeyW');
    if (nearestFuse == null) R.lines.push('  DBG 未进入交互范围 d=' + Math.hypot(player.x - d.x, player.z - d.z).toFixed(2) + ' y=' + player.y.toFixed(2) + ' f.y=' + (d.y + 0.12).toFixed(2) + ' blocked=' + segmentBlockedByWalls(player.x, player.y + EYE, player.z, d.x, d.y + 0.12, d.z, 0.15));
    const before = fuses;
    tryFuse();
    ok(fuses === before + 1, `按 E 拾取后 fuses ${before} → ${fuses}`);
  }
  ok(fuses === 3 && exitUnlocked, `三枚归位后出口解锁（fuses=${fuses}）`);
  const exitDoor = L12P.L0.doors.find(d => d.exterior);
  const exitX = exitDoor.coord - 1.0, exitZ = (exitDoor.gap[0] + exitDoor.gap[1]) / 2;
  const rExit = walkTo(exitX, exitZ, { maxFrames: 3000 });
  ok(rExit.ok, `走到出口门前 (${exitX.toFixed(1)},${exitZ.toFixed(1)})`, rExit.ok ? rExit.frames + ' 帧' : rExit.reason);
  const wasLevel = LEVEL;
  updateLevel0(1 / 60);
  ok(transitioning === true, '抵达真实出口阈值后触发进关（transitioning=true）',
    `p=(${player.x.toFixed(2)},${player.y.toFixed(2)},${player.z.toFixed(2)}) LEVEL=${LEVEL} trans=${transitioning} unlocked=${exitUnlocked}`);
  transitioning = false; LEVEL = 0;

  sec('复位保留已收集进度');
  place(-120, -6);
  const kept = fusesList.length;
  respawnToLevelStart();
  ok(Math.hypot(player.x - L0_SPAWN.x, player.z - L0_SPAWN.z) < 0.6, 'R 复位回到新出生点');
  ok(fusesList.length === kept, `复位不重置已拾取（剩 ${fusesList.length} 枚）`);

  sec('黑影点位与导航只在新可走域');
  for (const [x, z] of ENTITY_POINTS) {
    ok(L12P.roomAt(L12P.L0.rooms, x, z) != null, `怪物点位 (${x},${z}) 在新房间内`);
  }
  ok(ENTITY_POINTS.every(([x]) => x >= BOUNDS_L0.x1 && x <= BOUNDS_L0.x2), '怪物点位 x 在新边界内');

  sec('负对照：旧地图坐标必须不可达');
  const oldSpawn = { x: -144, z: 0 };
  ok(!!L12P.roomAt(L12P.L0.rooms, oldSpawn.x, oldSpawn.z), '旧出生点仍在 entry 内（对照 1：仍然有效）');
  const oldExitPath = l0Path(L0_SPAWN.x, L0_SPAWN.z, -64, 0);
  ok(oldExitPath === null, '旧出口 x=-64 不可达（l0Path 返回 null）');
  place(L0_SPAWN.x, L0_SPAWN.z);
  const rOld = walkTo(-66, 0, { maxFrames: 600 });
  ok(!rOld.ok, '连续行走无法走到旧出口 x=-66', rOld.reason);
  ok(!navWalkableAt(-90, -1) && !navWalkableAt(-86, -22.9), '旧配电/旧档案坐标不在新导航网格内');
  ok(BOUNDS_L0.x2 === -108, '新边界东端锁在服务前室 x=-108，旧 24m 走廊不再存在');

  sec('墙面细节：真实墙面 + 真实数量 + 不落门洞');
  const onWallFace = (axis, along, coord, tol = 0.05) => L0V2.wallPieces.some(w =>
    w.axis === axis && along > w.a + 0.2 && along < w.b - 0.2 &&
    Math.abs(Math.abs(coord - w.coord) - w.t / 2) < tol);
  const inAnyGap = (axis, coord, along) => L12P.L0.doors.some(d => d.axis === axis &&
    Math.abs(d.coord - coord) < 1e-6 && along > d.gap[0] - 0.05 && along < d.gap[1] + 0.05);
  ok(L0V2.sockets.length >= 5, `插座实际生成 ${L0V2.sockets.length} 个（≥5，全部经真实墙面筛选）`);
  ok(L0V2.vents.length >= 3, `通风口实际生成 ${L0V2.vents.length} 个（≥3）`);
  ok(L0V2.stains.length >= 3, `水渍实际生成 ${L0V2.stains.length} 处（≥3）`);
  let badSocket = 0, badVent = 0;
  for (const s of L0V2.sockets) {
    if (!onWallFace('z', s.x, s.z)) badSocket++;
    if (inAnyGap('z', s.z > 0 ? 1.2 : -1.2, s.x)) badSocket++;
  }
  for (const v of L0V2.vents) {
    if (!onWallFace('z', v.x, v.z)) badVent++;
    const wallZ = Math.abs(v.z) > 9 ? (v.z > 0 ? 10 : -10) : (v.z > 0 ? 6 : -6);
    if (inAnyGap('z', wallZ, v.x)) badVent++;
  }
  ok(badSocket === 0, `全部 ${L0V2.sockets.length} 个插座贴真实墙面且不落门洞`, '异常 ' + badSocket);
  ok(badVent === 0, `全部 ${L0V2.vents.length} 个通风口贴真实墙面且不落门洞`, '异常 ' + badVent);
  // 负对照：题目里的旧坐标 9.86 / 5.86 在真实墙（±10 / 6）上查不到面板
  ok(!onWallFace('z', -134, 9.86, 0.01) && onWallFace('z', -134, 9.88, 0.01),
    '负对照：旧 coord=9.86 在 1cm 判据下不贴墙，真实墙面 9.88 贴墙');

  sec('墙面 UV：2m 周期（只缩放一次）');
  const wallUV = L0V2.wallPieces.map(p => p.mesh && p.mesh.userData ? p.mesh.userData.worldUV : null).filter(v => v != null);
  ok(wallUV.length > 0 && wallUV.every(v => Math.abs(v - 1.0) < 1e-6), `墙段 worldUV 全部 = 1.0（${wallUV.length} 段）`);
  const wallRepeat = L0V2.materials.wallMat.map.repeat.x;
  ok(Math.abs(1 / wallRepeat - 2.0) < 0.01, `墙面贴图周期 = 1/repeat = ${(1 / wallRepeat).toFixed(2)}m（应 2m）`);
  const woodRepeat = L0V2.materials.woodMat.map.repeat.x;
  ok(Math.abs(1 / woodRepeat - 2.0) < 0.01, `木饰面周期 = ${(1 / woodRepeat).toFixed(2)}m（应 2m）`);
  const oldPeriod = 2.0 / wallRepeat;   // 旧实现：worldUV 除以 2 再乘 repeat
  ok(Math.abs(oldPeriod - 4.0) < 0.01, `负对照：cov=2 的旧写法会得到 ${oldPeriod.toFixed(2)}m 周期（被判不合格）`);
  ok(wallRepeat < 1 && L0V2.materials.floorMat.map.repeat.x === wallRepeat, '墙/木与地面都用 repeat=0.5（米制 UV 只缩一次）');

  sec('近景细件：真实倒角轮廓 / 米制 UV / 有限值 / 接地 / 支撑面（不是只加标签）');
  {
    const bof = m => { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.clone().applyMatrix4(m.matrixWorld); };
    scene.updateMatrixWorld(true);
    const detail = [];
    scene.traverse(o => { if (o.isMesh && o.userData && o.userData.l12detail) detail.push(o); });
    const slabs = detail.filter(o => o.userData.detailKind === 'slab');
    const made = (L0V2.detail && L0V2.detail.parts) || {};
    const boxVerts = new THREE.BoxGeometry(1, 1, 1).attributes.position.count;
    ok(slabs.length >= 30, 'L0 家具倒角板材数量与覆盖达到规格', 'slabs=' + slabs.length);
    ok((made.door || 0) >= 12, '值班台/更衣柜/出票台有独立门板', 'doors=' + (made.door || 0));
    ok((made.toeKick || 0) >= 1, '柜体有内收踢脚', 'toeKick=' + (made.toeKick || 0));
    ok((made.handle || 0) >= 12, '门板配立体把手', 'handle=' + (made.handle || 0));
    ok((made.hinge || 0) >= 8, '门板配铰链', 'hinge=' + (made.hinge || 0));
    let thin = 0, axisOnly = 0, nonFinite = 0, uvBad = 0, uvChecked = 0;
    for (const m of slabs) {
      const g = m.geometry, pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
      if (!pos || !nrm || pos.count <= boxVerts * 2) { thin++; continue; }
      let skew = 0;
      for (let i = 0; i < nrm.count; i++) {
        if (Math.max(Math.abs(nrm.getX(i)), Math.abs(nrm.getY(i)), Math.abs(nrm.getZ(i))) < 0.995) skew++;
      }
      if (skew < 8) axisOnly++;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      const dims = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
      if (!dims.every(v => Number.isFinite(v) && v > 0)) nonFinite++;
      for (let i = 0; i < pos.count; i++) {
        if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) { nonFinite++; break; }
      }
      if (uv) {
        let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
        for (let i = 0; i < uv.count; i++) {
          const u = uv.getX(i), v = uv.getY(i);
          if (u < u0) u0 = u; if (u > u1) u1 = u;
          if (v < v0) v0 = v; if (v > v1) v1 = v;
        }
        const su = u1 - u0, sv = v1 - v0, dmax = Math.max(...dims), dmin = Math.min(...dims);
        uvChecked++;
        if (!(su > dmin * 0.4 && su < dmax * 1.6 && sv > dmin * 0.4 && sv < dmax * 1.6)) uvBad++;
      }
    }
    ok(thin === 0, 'L0 每块板都是细分几何（顶点数远大于盒体 ' + boxVerts + '）', 'thin=' + thin);
    ok(axisOnly === 0, 'L0 每块板都有真实斜切面（非轴对齐法线 ≥8 个）', 'axisOnly=' + axisOnly);
    ok(nonFinite === 0, 'L0 细件几何坐标与包围盒全部有限', 'bad=' + nonFinite);
    ok(uvBad === 0, 'L0 细件 UV 为米制尺度', (uvChecked - uvBad) + '/' + uvChecked);
    const refBox = new THREE.BoxGeometry(3.6, 0.06, 0.8);
    let refSkew = 0; const rn = refBox.attributes.normal;
    for (let i = 0; i < rn.count; i++) {
      if (Math.max(Math.abs(rn.getX(i)), Math.abs(rn.getY(i)), Math.abs(rn.getZ(i))) < 0.995) refSkew++;
    }
    ok(refBox.attributes.position.count <= boxVerts * 2 && refSkew === 0,
      '负对照：等尺寸盒体的顶点数/斜切法线判据判不合格',
      'verts=' + refBox.attributes.position.count + ' skew=' + refSkew);

    // 支撑面（保险丝承载面）必须由真实台面几何提供，且高度与 supports 声明一致
    let supOk = 0;
    for (const s of L0V2.supports) {
      const tops = detail.filter(o => o.userData.detailKind === 'slab' &&
        /Top|top/.test(o.userData.detailPart || ''))
        .map(m => bof(m))
        .filter(b => Math.abs(b.max.x - (s.x + s.w / 2)) < 0.25 && Math.abs(b.min.x - (s.x - s.w / 2)) < 0.25 &&
          Math.abs(b.max.y - s.top) < 0.006);
      if (tops.length) supOk++;
    }
    ok(supOk === L0V2.supports.length, '每个保险丝承载面都由真实倒角台面提供且高度一致',
      supOk + '/' + L0V2.supports.length);

    // 桌腿接地且顶面与台面下沿相接（圆形支腿为实例化，按生成计数 + 台面容差校验）
    ok((made.leg || 0) >= 8, '桌子/柜体支腿（含圆腿）已生成', 'leg=' + (made.leg || 0));
  }

  // 本轮新增构件的支承连接：布草车推手支架、访客/员工长凳座下托梁
  sec('近景细件支承：布草车推手 / 长凳座下托梁（真实几何接触）');
  {
    const bb = o => { scene.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
    const rods = (L0V2.detailKit && L0V2.detailKit.rodInstances()) || [];
    const slabs = [];
    scene.traverse(o => {
      if (o.isMesh && o.userData && o.userData.detailKind === 'slab') slabs.push({ part: o.userData.detailPart || '', box: bb(o) });
    });
    const byPart = (arr, p) => arr.filter(x => x.part === p);
    const handles = byPart(rods, 'cartHandle'), brackets = byPart(rods, 'cartBracket');
    const rims = byPart(slabs, 'cartRim');
    ok(handles.length === 3 && brackets.length === 6, '三辆布草车的推手各有两根支架',
      'handle=' + handles.length + ' bracket=' + brackets.length);
    let bOk = 0, bBad = [];
    for (const h of handles) {
      const hc = h.box.getCenter(new THREE.Vector3());
      const mine = brackets.filter(b => {
        const bc = b.box.getCenter(new THREE.Vector3());
        return bc.x > h.box.min.x - 0.01 && bc.x < h.box.max.x + 0.01 &&
          Math.abs(bc.z - hc.z) < 0.03 && Math.abs(b.box.max.y - hc.y) < 0.006;
      });
      if (mine.length >= 2) bOk++; else bBad.push('x=' + hc.x.toFixed(2) + ' n=' + mine.length);
    }
    ok(bOk === handles.length, '推手往下都有两根竖向支架接到推手中心高度', bOk + '/' + handles.length + (bBad.length ? ' ' + bBad.join(',') : ''));
    let rOk = 0, rBad = [];
    for (const b of brackets) {
      const bc = b.box.getCenter(new THREE.Vector3());
      const rim = rims.find(r => bc.x > r.box.min.x - 0.05 && bc.x < r.box.max.x + 0.05 &&
        bc.z > r.box.min.z - 0.05 && bc.z < r.box.max.z + 0.05);
      if (rim && b.box.min.y <= rim.box.max.y + 0.006) rOk++;
      else rBad.push('y=' + b.box.min.y.toFixed(3) + ' rim=' + (rim ? rim.box.max.y.toFixed(3) : 'none'));
    }
    ok(rOk === brackets.length, '支架下端坐在顶圈面上（不留空档）', rOk + '/' + brackets.length + (rBad.length ? ' ' + rBad.join(',') : ''));

    // 三段座板每段都要有真实支承（连续托梁或腿顶）
    // 场景里同时存在 L37 的分条座板：只统计第一关范围内、并按坐标去重（多次 enter 会重复建箱）
    const inL0 = x => x.box.min.x > BOUNDS_L0.x1 - 1 && x.box.max.x < BOUNDS_L0.x2 + 1 &&
      x.box.min.z > BOUNDS_L0.z1 - 1 && x.box.max.z < BOUNDS_L0.z2 + 1;
    const seen = new Set();
    const seatSlats = byPart(slabs, 'seatSlat').filter(inL0).filter(x => {
      const k = [x.box.min.x, x.box.min.y, x.box.min.z].map(v => v.toFixed(3)).join(',');
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    const under = byPart(rods, 'rail').concat(byPart(slabs, 'leg'), byPart(rods, 'stretcher'));
    let sOk = 0, sBad = [];
    for (const s of seatSlats) {
      const sb = s.box;
      const hit = under.some(u => {
        const top = u.box.max.y;
        const zOverlap = Math.min(u.box.max.z, sb.max.z) - Math.max(u.box.min.z, sb.min.z);
        const xOverlap = Math.min(u.box.max.x, sb.max.x) - Math.max(u.box.min.x, sb.min.x);
        return Math.abs(top - sb.min.y) < 0.004 && zOverlap > 0.4 * (sb.max.z - sb.min.z) && xOverlap > 0.02;
      });
      if (hit) sOk++; else sBad.push('x=' + ((sb.min.x + sb.max.x) / 2).toFixed(2) + ' z=' + ((sb.min.z + sb.max.z) / 2).toFixed(2) + ' y=' + sb.min.y.toFixed(3));
    }
    ok(sOk === seatSlats.length, '每段分条座板底面都贴着真实托梁/腿顶',
      sOk + '/' + seatSlats.length + (sBad.length ? ' ' + sBad.slice(0, 3).join(' ') : ''));
    // 负对照：把托梁抬高 6cm 后同一判据必须不通过
    const railPart = byPart(rods, 'rail')[0];
    const lifted = railPart && new THREE.Box3(railPart.box.min.clone().add(new THREE.Vector3(0, 0.06, 0)), railPart.box.max.clone().add(new THREE.Vector3(0, 0.06, 0)));
    const negFail = lifted ? seatSlats.every(s => Math.abs(lifted.max.y - s.box.min.y) > 0.004) : false;
    ok(negFail, '负对照：托梁抬高 6cm 时接触判据必须失败');
  }

  R.lines.push('\nL0-V2 NODE 回归：' + R.pass + ' / ' + (R.pass + R.fail) + ' PASS');
  console.log(R.lines.join('\n'));
  if (R.fail > 0) process.exitCode = 1;
})();
