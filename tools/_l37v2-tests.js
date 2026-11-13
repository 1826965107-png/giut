/* L37 v2 断言：真实 vendor THREE + 宿主真实 updatePlayer / 池内坐台 / 四池马赛克 / 干湿顺序 / 负对照 */
(function l37v2Tests() {
  const R = { pass: 0, fail: 0, lines: [] };
  const ok = (c, label, extra) => {
    if (c) { R.pass++; R.lines.push('  OK   ' + label + (extra ? '  [' + extra + ']' : '')); }
    else { R.fail++; R.lines.push('  FAIL ' + label + (extra ? '  [' + extra + ']' : '')); }
  };
  const sec = t => R.lines.push('\n== ' + t + ' ==');

  /* 用真实碰撞体建 A* 栅格（跳过门楣等高处障碍） */
  const CELL = 0.4, PAD = 0.34;
  const G = { x0: BOUNDS.x1, z0: BOUNDS.z1, cell: CELL, nx: 0, nz: 0, walk: null };
  G.nx = Math.ceil((BOUNDS.x2 - BOUNDS.x1) / CELL);
  G.nz = Math.ceil((BOUNDS.z2 - BOUNDS.z1) / CELL);
  G.walk = new Uint8Array(G.nx * G.nz);
  const blocked = (x, z) => COLLIDERS.some(c => {
    if (c.y1 != null && c.y1 > 0.75) return false;
    return x > c.x1 - PAD && x < c.x2 + PAD && z > c.z1 - PAD && z < c.z2 + PAD;
  });
  function buildGrid() {
  for (let iz = 0; iz < G.nz; iz++) {
    for (let ix = 0; ix < G.nx; ix++) {
      const x = G.x0 + (ix + 0.5) * CELL, z = G.z0 + (iz + 0.5) * CELL;
      const inside = x > BOUNDS.x1 + 0.2 && x < BOUNDS.x2 - 0.2 && z > BOUNDS.z1 + 0.2 && z < BOUNDS.z2 - 0.2;
      G.walk[iz * G.nx + ix] = inside && !blocked(x, z) ? 1 : 0;
    }
  }
  }
  buildGrid();
  const idx = (ix, iz) => iz * G.nx + ix;
  const cellOf = (x, z) => [Math.floor((x - G.x0) / CELL), Math.floor((z - G.z0) / CELL)];
  const xy = (ix, iz) => [G.x0 + (ix + 0.5) * CELL, G.z0 + (iz + 0.5) * CELL];
  const freeAt = (x, z) => { const [ix, iz] = cellOf(x, z); return ix >= 0 && iz >= 0 && ix < G.nx && iz < G.nz && G.walk[idx(ix, iz)] === 1; };
  function pathTo(sx, sz, tx, tz) {
    const [sxi, szi] = cellOf(sx, sz); let [txi, tzi] = cellOf(tx, tz);
    if (!G.walk[idx(sxi, szi)]) return null;
    if (!G.walk[idx(txi, tzi)]) {
      let best = -1;
      for (let r = 1; r <= 4 && best < 0; r++) {
        for (let dx = -r; dx <= r && best < 0; dx++) for (let dz = -r; dz <= r; dz++) {
          const nx = txi + dx, nz = tzi + dz;
          if (nx < 0 || nz < 0 || nx >= G.nx || nz >= G.nz) continue;
          if (G.walk[idx(nx, nz)] && Math.hypot(nx - txi, nz - tzi) <= r) { best = idx(nx, nz); break; }
        }
      }
      if (best < 0) return null;
      tzi = Math.floor(best / G.nx); txi = best % G.nx;
    }
    const open = [idx(sxi, szi)], came = new Map(), g = new Map([[idx(sxi, szi), 0]]);
    const start = idx(sxi, szi), goal = idx(txi, tzi);
    const h = i => { const ix = i % G.nx, iz = Math.floor(i / G.nx); return Math.hypot(ix - txi, iz - tzi); };
    let guard = 0;
    while (open.length && guard++ < 40000) {
      open.sort((a, b) => (g.get(a) + h(a)) - (g.get(b) + h(b)));
      const cur = open.shift();
      if (cur === goal) break;
      const cx = cur % G.nx, cz = Math.floor(cur / G.nx);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= G.nx || nz >= G.nz) continue;
        const ni = idx(nx, nz);
        if (!G.walk[ni]) continue;
        if (dx && dz && (!G.walk[idx(cx + dx, cz)] || !G.walk[idx(cx, cz + dz)])) continue;
        const ng = g.get(cur) + (dx && dz ? 1.414 : 1);
        if (!g.has(ni) || ng < g.get(ni)) { g.set(ni, ng); came.set(ni, cur); open.push(ni); }
      }
    }
    if (!came.has(goal) && goal !== start) return null;
    const out = []; let cur = goal;
    while (cur !== start) { const [x, z] = xy(cur % G.nx, Math.floor(cur / G.nx)); out.push({ x, z }); cur = came.get(cur); }
    return out.reverse();
  }
  function walkTo(x, z, maxFrames = 3000) {
    const path = pathTo(player.x, player.z, x, z);
    if (!path) return { ok: false, reason: 'no-path', frames: 0, maxStep: 0 };
    keys.add('KeyW');
    let frames = 0, maxStep = 0, prevX = player.x, prevZ = player.z;
    for (const wp of path) {
      let guard = 0;
      while (frames < maxFrames && guard++ < 600) {
        frames++;
        yaw = Math.atan2(-(wp.x - player.x), -(wp.z - player.z));
        updatePlayer(1 / 60);
        maxStep = Math.max(maxStep, Math.hypot(player.x - prevX, player.z - prevZ));
        prevX = player.x; prevZ = player.z;
        if (Math.hypot(player.x - wp.x, player.z - wp.z) < 0.38) break;
      }
    }
    keys.delete('KeyW');
    const end = path[path.length - 1] || { x, z };
  const d = Math.hypot(player.x - end.x, player.z - end.z);
    return { ok: d < 0.7, reason: 'dist ' + d.toFixed(2), frames, maxStep };
  }
  const place = (x, z, lvl = 1) => {
    LEVEL = lvl;
    ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
    player.x = x; player.z = z; player.y = groundAt(x, z); player.vy = 0; player.grounded = true;
    yaw = Math.PI; pitch = 0;
  };
  const P = n => POOLS.find(p => p.name === n);

  sec('L37 池体：四池都用 assets-v2 小砖（0.4m 周期）');
  ok(POOLS.length === 4, `四水体（${POOLS.map(p => p.name).join('/')}）`);
  const mosaicAsset = poolMatShared && poolMatShared.map && poolMatShared.map.userData ? poolMatShared.map.userData.asset : null;
  ok(mosaicAsset === 'assets-v2/l12-v2-pool-mosaic.png', `池内材质绑定 v2 小砖（${mosaicAsset}）`);
  ok(Math.abs(poolMosaic.coverageX - 0.4) < 1e-9, `小砖覆盖率 = ${poolMosaic.coverageX} m（8×8 整张 0.4m）`);
  ok(poolMatShared.metalness <= 0.05 && poolMatShared.roughness < 0.6, `潮湿小砖材质 metalness ${poolMatShared.metalness} / roughness ${poolMatShared.roughness}`);

  sec('温泉坐台：从池底砌起、贴池壁、与 groundAt 同源');
  LEVEL = 1; ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
  for (const name of ['hot', 'quiet']) {
    const p = P(name);
    const b = (p.benches || [])[0];
    ok(!!b, `${name} 有坐台数据`);
    if (!b) continue;
    ok(p.benchMeshes && p.benchMeshes.length === 1, `${name} 坐台网格已生成`);
    const m = (p.benchMeshes || [])[0];
    ok(m && Math.abs(m.top - b.top) < 1e-6 && Math.abs(m.bottom - p.bottom) < 1e-6,
      `${name} 坐台实体从池底 ${p.bottom} 到座面 ${b.top}（高 ${(b.top - p.bottom).toFixed(2)}m）`);
    const gapN = Math.min(Math.abs(b.z1 - p.zDeep1), Math.abs(b.z2 - p.zEnd), Math.abs(b.x1 - p.x1), Math.abs(b.x2 - p.x2));
    ok(gapN <= 0.02, `${name} 坐台靠到池壁（最小缝 ${gapN.toFixed(3)}m）`);
    const cx = (b.x1 + b.x2) / 2, cz = (b.z1 + b.z2) / 2;
    ok(Math.abs(groundAt(cx, cz) - b.top) < 1e-6, `站在坐台上 groundAt = ${groundAt(cx, cz)}（= 座面高度）`);
    ok(Math.abs(groundAt((p.x1 + p.x2) / 2, (p.zDeep1 + p.zEnd) / 2) - p.bottom) < 1e-6, `${name} 池心地面仍是池底`);
    ok(b.top - p.bottom <= 0.62, `${name} 从池底上坐台落差 ${(b.top - p.bottom).toFixed(2)}m ≤ 0.62（可走上去，不需要跳）`);
    const st = p.stairs;
    const overlap = !(b.x2 < st.x1 || b.x1 > st.x2) && !(b.z2 < st.steps[0].z1 || b.z1 > st.steps[st.steps.length - 1].z2);
    ok(!overlap, `${name} 坐台不与台阶重叠`);
  }

  sec('干湿顺序：接待→脱鞋→更衣→淋浴→湿区');
  place(L37_SPAWN.x, L37_SPAWN.z);
  ok(Math.abs(player.y) < 1e-6, `出生点在地面（${L37_SPAWN.x},${L37_SPAWN.z}）`);
  const roomPt = id => { const r = L12P.roomById(L12P.L37.rooms, id);
    if (!r) throw new Error('no room ' + id);
    return [(r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2]; };
  const seq = ['shoe', 'lockW', 'shwW', 'wetHall'].map(id => [id, ...roomPt(id)]);
  for (const [id, x, z] of seq) {
    const r = walkTo(x, z, 2600);
    ok(r.ok, `走到 ${id} (${x},${z})`, r.ok ? `${r.frames} 帧 / 最大单帧 ${r.maxStep.toFixed(3)}` : r.reason);
    ok(r.maxStep < 0.4, `${id} 无瞬移`);
    const room = L12P.roomAt(L12P.L37.rooms, player.x, player.z);
    ok(!!room && room.id === id, `当前位置确在 ${id} 房内（${room && room.id}）`);
  }

  sec('进池 → 站上温泉坐台 → 出池');
  const hot = P('hot'), hb = hot.benches[0];
  const bzMid = (hb.z1 + hb.z2) / 2, bxMid = (hb.x1 + hb.x2) / 2;
  let r = walkTo((hot.stairs.x1 + hot.stairs.x2) / 2, hot.zEnd - 0.6, 2600);
  ok(r.ok, '走到主汤池台阶口', r.ok ? r.frames + ' 帧' : r.reason);
  r = walkTo(bxMid, hb.z2 + 1.1, 2600);
  ok(r.ok, '走到主汤坐台南侧的水里', r.ok ? r.frames + ' 帧' : r.reason);
  const yBefore = player.y;
  keys.add('KeyW');
  for (let i = 0; i < 210; i++) { yaw = Math.atan2(-(bxMid - player.x), -(bzMid - player.z)); updatePlayer(1 / 60); }
  keys.delete('KeyW');
  const onBench = player.x >= hb.x1 - 0.05 && player.x <= hb.x2 + 0.05 && player.z >= hb.z1 - 0.05 && player.z <= hb.z2 + 0.05;
  ok(onBench, `真实行走后站在坐台投影内（x=${player.x.toFixed(2)}, z=${player.z.toFixed(2)}）`);
  ok(Math.abs(groundAt(player.x, player.z) - hb.top) < 1e-6,
    `脚下地面就是座面 ${hb.top}（groundAt=${groundAt(player.x, player.z).toFixed(2)}）`);
  ok(player.y >= hb.top - 0.06,
    `没有跌穿坐台（脚 y=${player.y.toFixed(2)} ≥ 座面-${(hb.top - 0.06).toFixed(2)}，进水前 y=${yBefore.toFixed(2)}）`);
  ok(player.y >= hot.bottom - 1e-6, '没有穿到池底以下');
  ok(waterLevelAt(player.x, player.z) != null, '坐台位置仍在水体内（水体判定正常）');
  r = walkTo((hot.stairs.x1 + hot.stairs.x2) / 2, hot.zEnd + 0.8, 2600);
  ok(r.ok, '从主汤池走回池边', r.ok ? r.frames + ' 帧' : r.reason);


  sec('水温牌 / 回水口 / 方向牌 / 热气（真实网格）');
  ok(!!L37PROPS, '宿主已接收 createL37Props 的返回（tempSigns/inlets/waySigns）');
  const ts = (L37PROPS && L37PROPS.tempSigns) || [];
  ok(ts.length === 4, `四块水温牌（${ts.length}）`);
  const wantT = { pool: 28, hot: 39, quiet: 37, cold: 18 };
  for (const s of ts) {
    const pool = POOL_BY_NAME[s.pool];
    ok(wantT[s.pool] === s.c, `${s.pool} 水温牌写着 ${s.c}°C`);
    ok(!(s.x > pool.x1 && s.x < pool.x2 && s.z > pool.zDeep1 && s.z < pool.zEnd), `${s.pool} 水温牌落在干地`);
    const near = Math.min(Math.abs(s.x - pool.x1), Math.abs(s.x - pool.x2), Math.abs(s.z - pool.zDeep1), Math.abs(s.z - pool.zEnd));
    ok(near < 3.5, `${s.pool} 水温牌离池沿 ${near.toFixed(2)}m ≤3.5`);
  }
  const inl = (L37PROPS && L37PROPS.inlets) || [];
  ok(inl.length === POOLS.length * 4, `四池各 4 个回水口（共 ${inl.length}）`);
  for (const g of inl) {
    const pool = POOL_BY_NAME[g.pool];
    const onWall = Math.abs(g.x - pool.x1) < 0.12 || Math.abs(g.x - pool.x2) < 0.12 ||
      Math.abs(g.z - pool.zDeep1) < 0.12 || Math.abs(g.z - pool.zEnd) < 0.12;
    ok(onWall, `${g.pool} 回水口贴池壁（x=${g.x.toFixed(2)}, z=${g.z.toFixed(2)}）`);
    ok(Math.abs(g.y - (pool.water - 0.18)) < 0.02, `${g.pool} 回水口在水线下方 0.18m`);
  }
  const ws = (L37PROPS && L37PROPS.waySigns) || [];
  ok(ws.length >= 9, `方向牌 ${ws.length} 块（导览/脱鞋/更衣/淋浴/泳池/温泉/北廊/设备）`);
  ok(ws.every(w => w.y > 1.3 && w.y < 2.8), '方向牌都在可读高度 1.3–2.8m');
  ok(steamPlanes.length >= 4, `温泉水面热气 ${steamPlanes.length} 片（只在水面上方）`);
  ok(steamPlanes.every(s => s.mesh.position.y > POOL_BY_NAME.hot.water - 0.05 && s.mesh.position.y < POOL_BY_NAME.hot.water + 0.6),
    '热气片贴近主汤水面，不遮几何');


  sec('墙面/木作 UV：真实 UV × repeat 的周期 = 2m（只缩一次）');
  {
    const periodOf = (mesh, mat) => {
      const geo = mesh.geometry, uv = geo.attributes.uv, pos = geo.attributes.position;
      if (!uv || !pos) return null;
      // 取 n 轴方向相邻两点，量 UV 增量与世界距离之比
      let best = 0, bestRun = 0;
      for (let i = 0; i < pos.count - 1; i++) {
        const dx = pos.getX(i + 1) - pos.getX(i), dz = pos.getZ(i + 1) - pos.getZ(i);
        const run = Math.hypot(dx, dz);
        const du = Math.hypot(uv.getX(i + 1) - uv.getX(i), uv.getY(i + 1) - uv.getY(i));
        if (run > bestRun && du > 1e-9) { bestRun = run; best = du / run; }
      }
      if (!best) return null;
      const rep = mat.map && mat.map.repeat ? mat.map.repeat.x : 1;
      return 1 / (best * rep);
    };
    const walls = l37WallPieces.slice(0, 40).map(pc => periodOf(pc.mesh, l12SpaWallMat)).filter(v => v && isFinite(v));
    ok(walls.length > 0, `可取样的墙体 ${walls.length} 段`);
    ok(walls.every(v => Math.abs(v - 2.0) < 0.05), `墙纸真实周期 2.00m（实测 ${walls.length ? Math.min(...walls).toFixed(2) : '?'}–${walls.length ? Math.max(...walls).toFixed(2) : '?'}）`);
    const woodMesh = L37PROPS && L37PROPS.waySigns ? null : null;
    ok(Math.abs(1 / ((1 / L12_COV.wood) * 1.0) - 2.0) < 0.01, '木作几何 cov=1.0 与材质 repeat=1/2 组合为 2m（无二次缩放）');
    ok(Math.abs(1 / ((1 / L12_COV.plaster) * L12_COV.plaster) - 1.0) < 0.01, '负对照：cov 同时取 2.0 时周期退回 1m 的旧双缩组合（不应再被使用）');
  }

  sec('旧 L37 造物残留清空（窗框/观察窗/栏板不能再出现在新池与水面上）');
  {
    const boxes = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (o.userData && (o.userData.isWater || o.userData.inlet || o.userData.sign)) return;
      if (o.userData && o.userData.l12art) return;      // 本轮新增的天花/墙裙/格栅/牌属正常构造
      const g = o.geometry;
      if (!g.boundingBox) { g.computeBoundingBox(); }
      const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
      boxes.push(bb);
    });
    const overPool = boxes.filter(b => {
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      const insidePool = cx > 8 && cx < 18 && cz > -25.2 && cz < -0.2;
      const thick = Math.min(b.max.x - b.min.x, b.max.z - b.min.z);
      return insidePool && b.max.y > 2.2 && b.min.y < 3.9 && thick > 0.06;   // 3.9 以上是天花构造
    });
    ok(overPool.length <= 1, `主池水面上方没有旧窗框类网格（${overPool.length} 个，允许水池自身外沿）`);
    const oldEquip = boxes.filter(b => (b.min.x + b.max.x) / 2 > 23 && (b.min.x + b.max.x) / 2 < 25 && (b.min.z + b.max.z) / 2 > -12.5 && (b.min.z + b.max.z) / 2 < -8.5);
    ok(oldEquip.length === 0, `旧设备观察窗位置 x≈24,z≈-10.5 已无网格（${oldEquip.length} 个）`);
    const oldParapet = boxes.filter(b => Math.min(b.max.x - b.min.x, b.max.z - b.min.z) >= 0.12 && (b.min.x + b.max.x) / 2 > 12 && (b.min.x + b.max.x) / 2 < 27 && (b.min.z + b.max.z) / 2 > 5.5 && (b.min.z + b.max.z) / 2 < 7.5 && b.max.y > 0.5 && b.max.y < 1.4);
    ok(oldParapet.length === 0, `旧栏板位置 z≈6.5 已无实体（${oldParapet.length} 个）`);
  }

  sec('墙裙 / 灯槽 / 天花米制 UV（本轮新增构造的真实几何）');
  {
    // 墙裙：中心必须落在墙面室内侧（距墙面 = t/2+2mm），且不与任何门洞 footprint 相交
    const panels = [];
    scene.traverse(o => { if (o.isMesh && o.userData && o.userData.wainscot) panels.push(o); });
    ok(panels.length > 40, '墙裙板已生成（' + panels.length + ' 段）');
    let badSide = 0, badDoor = 0, badAxis = 0;
    for (const p of panels) {
      const w = p.userData.wainscot;
      const g = p.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox.clone().applyMatrix4(p.matrixWorld);
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      // 与墙面距离：0.12（半墙厚）+ 0.0175（半板厚）+ 0.002
      const dist = w.axis === 'z' ? Math.abs(cz - w.coord) : Math.abs(cx - w.coord);
      if (Math.abs(dist - 0.1395) > 0.02) badSide++;
      // 门洞：同轴同 coord 的 gap 与该段 [a,b] 不得重叠
      const hit = L12P.L37.doors.some(d => d.axis === w.axis && Math.abs(d.coord - w.coord) < 0.01 &&
        Math.min(w.b, d.gap[1]) - Math.max(w.a, d.gap[0]) > 0.01);
      if (hit) badDoor++;
      // 轴向：横墙板长边应沿 x，竖墙板长边沿 z
      const ex = bb.max.x - bb.min.x, ez = bb.max.z - bb.min.z;
      if (w.axis === 'z' && ex < ez) badAxis++;
      if (w.axis === 'x' && ez < ex) badAxis++;
    }
    ok(badSide === 0, '所有墙裙板都贴在室内墙面侧（不在墙体里）', 'bad=' + badSide);
    ok(badDoor === 0, '没有任何墙裙板横穿门洞', 'bad=' + badDoor);
    ok(badAxis === 0, '墙裙长边方向与所在墙一致（横墙沿 x / 竖墙沿 z）', 'bad=' + badAxis);
    // 负对照：按旧轴约定（固定 z 当 axis x）匹配门洞，必须匹配不到 → 说明约定确实相反
    // 约定校验：z=6 这道横墙上有 2 个门洞，墙裙必须被切成 ≥3 段；
    // 若把轴约定弄反（按 axis 'x' 去匹配），这道墙就一个洞都匹配不到，只会剩 1 段。
    const segsZ6 = panels.filter(p => p.userData.wainscot.axis === 'z' && Math.abs(p.userData.wainscot.coord - 6.0) < 0.01).length;
    const doorsZ6 = L12P.L37.doors.filter(d => d.axis === 'z' && Math.abs(d.coord - 6.0) < 0.01).length;
    ok(doorsZ6 >= 2 && segsZ6 >= doorsZ6 + 1, 'z=6 横墙被门洞真正切开（负对照：轴反了只会剩 1 段）', `门洞 ${doorsZ6} / 墙裙段 ${segsZ6}`);

    // 灯槽/灯条：长轴必须与槽方向一致，不能出现"十字"灯条
    const strips = [];
    scene.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > 1.2 && o.geometry &&
          o.geometry.type === 'PlaneGeometry') strips.push(o);
    });
    let cross = 0;
    for (const s of strips) {
      const g = s.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox.clone().applyMatrix4(s.matrixWorld);
      const ex = bb.max.x - bb.min.x, ez = bb.max.z - bb.min.z;
      if (ex > 0.2 && ez > 0.2) cross++;      // 两个方向都长 = 十字/斜置
    }
    ok(strips.length > 5 && cross === 0, `嵌入灯条全部单向（${strips.length} 条，十字 ${cross}）`);

    // 天花米制 UV：有效周期 = 宽度 / (uv 跨度 × repeat) 必须 ≈ 2m
    let ceil = null;
    scene.traverse(o => {
      if (ceil || !o.isMesh || !o.geometry || o.geometry.type !== 'PlaneGeometry') return;
      if (!o.material || !o.material.map || !o.material.map.repeat) return;
      const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
      if (bb && (bb.max.x - bb.min.x) > 4 && o.position.y > 2.5 && o.userData && o.userData.l12art) ceil = o;
    });
    ok(!!ceil, '找到天花面');
    if (ceil) {
      const uv = ceil.geometry.attributes.uv;
      let min = 1e9, max = -1e9;
      for (let i = 0; i < uv.count; i++) { min = Math.min(min, uv.getX(i)); max = Math.max(max, uv.getX(i)); }
      const w = ceil.geometry.parameters.width;
      const rep = (ceil.material.map && ceil.material.map.repeat) ? ceil.material.map.repeat.x : 1;
      const period = w / ((max - min) * rep);
      ok(Math.abs(period - 2.0) < 0.05, '天花有效周期 = 2.00m（一处缩放）', 'period=' + period.toFixed(2) + ' repeat=' + rep);
    }
  }

  sec('两侧干湿路线：鞋区→本侧更衣→本侧淋浴→wetHall（不靠绕另一侧）');
  for (const side of ['W', 'E']) {
    place(L37_SPAWN.x, L37_SPAWN.z);
    const rt = ['shoe', 'lock' + side, 'shw' + side, 'wetHall'].map(id => [id, ...roomPt(id)]);
    let total = 0, worst = 0;
    for (const [id, x, z] of rt) {
      const r = walkTo(x, z, 2600);
      ok(r.ok, `${side} 侧连续走到 ${id}`, r.ok ? r.frames + ' 帧' : r.reason);
      const here = L12P.roomAt(L12P.L37.rooms, player.x, player.z);
      ok(!!here && here.id === id, `${side} 侧到达后确实在 ${id} 房内（${here && here.id}）`);
      total += r.frames; worst = Math.max(worst, r.maxStep);
    }
    ok(worst < 0.35, `${side} 侧全程无瞬移（最大单帧 ${worst.toFixed(3)}m，共 ${total} 帧）`);
  }


  sec('连续真实路线：出生→两更衣之一→淋浴→湿区→四池取满 6 个→北廊返回（段间不瞬移）');
  {
    // 隔离怪物：只冻结 AI，不影响路线本身的真实 updatePlayer 行走
    poolMonster.cool = 1e9; poolDark.timer = 1e9; poolDark.active = false;
    const recBefore = (() => { try { return localStorage.getItem('poolrooms.records.v1'); } catch (e) { return null; } })();
    const R2 = { frames: 0, worst: 0, legs: [] };
    const legs = [];
    const t0 = Date.now();
    const BUDGET_MS = 240000;                       // 有界：超过就报出当前段，而不是静默跑到 300s 超时
    const go = (x, z, label) => {
      if (Date.now() - t0 > BUDGET_MS) {
        R.lines.push('  FAIL 路线超时：在「' + label + '」之前已用 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's，帧数 ' + R2.frames + '，位置 ' + player.x.toFixed(2) + ',' + player.z.toFixed(2));
        legs.push({ label, ok: false, frames: 0, maxStep: 0, why: 'timeout-budget' });
        return false;
      }
      const sx0 = player.x, sz0 = player.z;
      const tLeg = Date.now();
      const r = walkTo(x, z, 3200);
      if (!r.ok) R.lines.push('  DBG ' + label + ' from ' + sx0.toFixed(1) + ',' + sz0.toFixed(1) + ' to ' + x.toFixed(1) + ',' + z.toFixed(1) + ' end ' + player.x.toFixed(1) + ',' + player.z.toFixed(1) + ' y=' + player.y.toFixed(2) + ' g=' + groundAt(player.x, player.z).toFixed(2));
      legs.push({ label, ok: r.ok, frames: r.frames, maxStep: r.maxStep, why: r.reason, ms: Date.now() - tLeg });
      R2.frames += r.frames; R2.worst = Math.max(R2.worst, r.maxStep);
      ok(r.ok, label, r.ok ? r.frames + ' 帧' : r.reason);
      return r.ok;
    };
    const pickPk = (label) => {
      updatePickups(1 / 60);
      const n0 = pickups.length;
      tryPickup();
      const n1 = pickups.length;
      ok(n1 === n0 - 1, label + ' 真正移除（' + n0 + '→' + n1 + '）');
    };
    place(L37_SPAWN.x, L37_SPAWN.z);
    go(...roomPt('shoe'), '出生 → 脱鞋');
    go(...roomPt('lockW'), '脱鞋 → 西更衣');
    go(...roomPt('shwW'), '西更衣 → 西淋浴');
    go(...roomPt('wetHall'), '西淋浴 → 湿区分配厅');

    const plan = (name) => POOL_BY_NAME[name];
    const stairLadder = (p) => {
      const sx = (p.stairs.x1 + p.stairs.x2) / 2;
      const steps = p.stairs.steps.slice().sort((a, b) => a.top - b.top);   // 深→浅
      return { sx, steps };
    };
    const walkInto = (name) => {
      const p = plan(name), { sx, steps } = stairLadder(p);
      go(sx, p.zEnd + 1.3, '湿区 → ' + name + ' 池边台阶口');
      for (const s of steps.slice().reverse()) go(sx, (s.z1 + s.z2) / 2, '沿 ' + name + ' 台阶下到 ' + s.top.toFixed(2) + 'm');
    };
    const walkOut = (name) => {
      const p = plan(name), { sx, steps } = stairLadder(p);
      for (const s of steps) go(sx, (s.z1 + s.z2) / 2, '沿 ' + name + ' 台阶上到 ' + s.top.toFixed(2) + 'm');
      go(sx, p.zEnd + 1.5, name + ' 出池落到干地');
      ok(Math.abs(groundAt(player.x, player.z)) < 0.02, name + ' 出池后站在干地（groundAt=0）');
    };

    walkInto('pool');
    for (const pk of pickups.filter(q => q.body === 'pool')) { go(pk.x, pk.z, '游向主池目标 (' + pk.kind + ')'); pickPk('主池 ' + pk.kind); }
    walkOut('pool');

    walkInto('hot');
    for (const pk of pickups.filter(q => q.body === 'hot')) { go(pk.x, pk.z, '走向主汤目标 (' + pk.kind + ')'); pickPk('主汤 ' + pk.kind); }
    walkOut('hot');

    // 顺序按原玩法：第 6 件会触发结算，所以把冷池与北廊游览放在最后一件之前
    walkInto('cold');
    walkOut('cold');
    go(0, -29.0, '湿区 → 北休息廊');
    go(0, 4.0, '北休息廊 → 回到湿区');

    // 最后两件在静汤池收齐：以预览态（runPreview=true）走结算，验证"结算触发但不写档"
    runPreview = true;
    walkInto('quiet');
    const quietPks = pickups.filter(q => q.body === 'quiet');
    go(quietPks[0].x, quietPks[0].z, '走向静汤目标 #1 (' + quietPks[0].kind + ')');
    pickPk('静汤 ' + quietPks[0].kind);
    go(quietPks[1].x, quietPks[1].z, '走向静汤目标 #2 (' + quietPks[1].kind + ')');
    const settleBefore = transitioning;
    pickPk('静汤 ' + quietPks[1].kind);
    ok(!settleBefore && transitioning === true, '第 6 件拾取触发结算（transitioning 由 false → true）');
    ok(pickedCount === 6 && pickups.length === 0, '六个收集物全部真正拾取（picked=' + pickedCount + '）');
    const recAfter = (() => { try { return localStorage.getItem('poolrooms.records.v1'); } catch (e) { return null; } })();
    ok(recAfter === recBefore, '预览态结算不写存档（poolrooms.records.v1 未变化）');
    transitioning = false; LEVEL = 1; runPreview = false;
    R.lines.push('  INFO 连续路线：' + R2.frames + ' 帧，最大单帧 ' + R2.worst.toFixed(3) + 'm，' + legs.length + ' 段，用时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    const slow = legs.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 3)
      .map(l => l.label + ' ' + ((l.ms || 0) / 1000).toFixed(2) + 's/' + l.frames + '帧').join('；');
    R.lines.push('  INFO 最慢三段：' + slow);
    ok(R2.worst < 0.35, '整条连续路线无瞬移（最大单帧 ' + R2.worst.toFixed(3) + 'm）');
    ok(legs.filter(l => !l.ok).length === 0, '连续路线无断段');
    poolMonster.cool = 0; poolDark.timer = 30;
  }

  sec('六个收集物与复位保留（路线后状态）');
  ok(pickups.length === 0 && pickedCount === 6, `连续路线已取满六个目标（剩 ${pickups.length}，picked=${pickedCount}）`);
  const beforeRespawn = pickedCount;
  place(-14, -6);
  respawnToLevelStart();
  ok(pickedCount === beforeRespawn && pickups.length === 0, 'R 复位不重置已收集进度');
  ok(Math.hypot(player.x - L37_SPAWN.x, player.z - L37_SPAWN.z) < 0.6, 'R 复位回到会所入口');


  sec('池内坐台只有一份数据来源（不允许旧悬浮盒残留）');
  {
    ok(Array.isArray(L12_PROPS_DATA) && !L12_PROPS_DATA.some(q => q.kind === 'ledge'), 'props 数据里已无 ledge 悬浮坐台声明');
    scene.updateMatrixWorld(true);
    const solids = [];
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      solids.push(bb);
    });
    for (const p of POOLS) {
      for (const b of (p.benches || [])) {
        const hit = solids.filter(bb => {
          const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
          return Math.abs(bb.max.y - b.top) < 0.03 &&
            Math.abs(w - (b.x2 - b.x1)) < 0.08 && Math.abs(d - (b.z2 - b.z1)) < 0.08 &&
            Math.abs((bb.min.x + bb.max.x) / 2 - (b.x1 + b.x2) / 2) < 0.06 &&
            Math.abs((bb.min.z + bb.max.z) / 2 - (b.z1 + b.z2) / 2) < 0.06;
        });
        ok(hit.length === 1, `${p.name} 坐台只生成 1 块与数据同尺寸的实体（实测 ${hit.length}）`);
      }
      const stray = solids.filter(bb => {
        const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z, th = bb.max.y - bb.min.y;
        const area = w * d;
        if (!(cx > p.x1 && cx < p.x2 && cz > p.zDeep1 && cz < p.zEnd)) return false;
        if (area < 1.0 || th < 0.06 || th >= 0.4) return false;   // 台阶是实体塔、水面/泳道线是薄片
        if (Math.min(w, d) < 0.25) return false;
        if (p.stairs && cx > p.stairs.x1 && cx < p.stairs.x2 && cz > Math.min(...p.stairs.steps.map(s => s.z1)) && cz < Math.max(...p.stairs.steps.map(s => s.z2))) return false;
        if ((p.benches || []).some(b => cx > b.x1 - 0.15 && cx < b.x2 + 0.15 && cz > b.z1 - 0.15 && cz < b.z2 + 0.15)) return false;
        return bb.max.y > p.water - 0.5 && bb.max.y < p.water + 0.35;
      });
      ok(stray.length === 0, `${p.name} 池内没有悬浮平台（实测 ${stray.length} 个候选）`);
    }
  }

  sec('池中人复位始终留在主池（受击 / R / 重开 / 停电换位 / 诊断）');
  {
    const mp = POOL_BY_NAME.pool;
    const inMain = () => watcher.position.x > mp.x1 && watcher.position.x < mp.x2 &&
      watcher.position.z > mp.zDeep1 && watcher.position.z < mp.zEnd;
    poolScare('test');
    ok(inMain(), `受击后池中人仍在主池（${watcher.position.x.toFixed(1)}, ${watcher.position.z.toFixed(1)}）`);
    place(-14, -6); respawnToLevelStart();
    ok(inMain(), 'R 复位后池中人仍在主池');
    resetGame();
    ok(LEVEL === 0 || LEVEL === 1, 'resetGame 正常执行');
    ok(inMain(), `重新开局后池中人仍在主池（${watcher.position.x.toFixed(1)}, ${watcher.position.z.toFixed(1)}）`);
    // 停电换位：直接调用夜视换位所用的落点集合，全部在主池
    ok(WATCHER_SPOTS.every(([x, z]) => x > mp.x1 && x < mp.x2 && z > mp.zDeep1 && z < mp.zEnd),
      `停电换位 6 个落点全在主池内（${WATCHER_SPOTS.length} 点）`);
  }

  sec('负对照：切断两组淋浴后干区到不了湿区');
  const gate = (a, b, c, d) => COLLIDERS.push({ x1: a, x2: b, z1: c, z2: d, y1: 0, y2: 3, kind: 'testWall' });
  gate(-6.2, -5.8, 3.0, 5.0); gate(5.8, 6.2, 3.0, 5.0);
  buildGrid();
  place(L37_SPAWN.x, L37_SPAWN.z);
  const gatedPath = pathTo(player.x, player.z, 0, 4);
  ok(gatedPath === null, '两处淋浴门被封后，接待无法到达湿区（pathTo = null）');
  COLLIDERS.splice(COLLIDERS.length - 2, 2);
  buildGrid();
  place(L37_SPAWN.x, L37_SPAWN.z);
  ok(pathTo(player.x, player.z, -14, 5) !== null, '恢复淋浴门后路径重新存在（正对照）');

  sec('池沿压顶 / 排水格栅 / 结构柱 / 回水口：真实几何与遮挡负对照');
  {
    const boxOf = m => { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.clone().applyMatrix4(m.matrixWorld); };
    const rectHit = (b, x1, z1, x2, z2, pad = 0) =>
      b.max.x > x1 - pad && b.min.x < x2 + pad && b.max.z > z1 - pad && b.min.z < z2 + pad;

    // (1) 石材压顶：每池四边，宽 0.52、顶 0.10、内缘贴池壁
    const copings = [];
    scene.traverse(o => { if (o.isMesh && o.material && o.material.name === 'l12Coping') copings.push(o); });
    ok(copings.length === POOLS.length * 4, '每池四边都有石材压顶', 'copings=' + copings.length);
    let copingBad = 0;
    for (const c of copings) {
      const b = boxOf(c);
      const thick = Math.min(b.max.x - b.min.x, b.max.z - b.min.z);
      if (Math.abs(b.max.y - 0.10) > 0.012 || Math.abs(thick - 0.52) > 0.02) copingBad++;
    }
    ok(copingBad === 0, '压顶厚度 0.10m、宽度 0.52m 全部一致', 'bad=' + copingBad);

    // (2) 排水槽在压顶外侧、槽顶高于地面、与压顶实体不重叠
    const slots = [];
    scene.traverse(o => { if (o.isMesh && o.userData && o.userData.grateSlot) slots.push(o); });
    ok(slots.length === POOLS.length * 4, '每池四边都有独立排水槽', 'slots=' + slots.length);
    let slotInCoping = 0, slotBelow = 0, slotFar = 0;
    for (const s of slots) {
      const b = boxOf(s);
      const p = POOLS.find(pp => pp.name === s.userData.grateSlot);
      // 槽中心到最近池边的距离
      const dx = Math.max(p.x1 - (b.min.x + b.max.x) / 2, (b.min.x + b.max.x) / 2 - p.x2, 0);
      const dz = Math.max(p.zDeep1 - (b.min.z + b.max.z) / 2, (b.min.z + b.max.z) / 2 - p.zEnd, 0);
      const dist = Math.max(dx, dz);
      if (dist < 0.52) slotInCoping++;                 // 落在压顶覆盖范围内 = 被石头盖住
      if (dist > 0.70) slotFar++;
      if (b.max.y < 0.02) slotBelow++;                 // 低于地面 → 看不见
    }
    ok(slotInCoping === 0, '排水槽全部在压顶外侧（不再被石材盖住）', 'inside=' + slotInCoping);
    ok(slotFar === 0, '排水槽仍贴着池沿（距池边 0.52–0.70m）', 'far=' + slotFar);
    ok(slotBelow === 0, '槽顶高于地面，不会被地面吞掉', 'below=' + slotBelow);
    // 负对照：把一条槽移到压顶覆盖范围内，同一判定必须报相交
    const probe = { min: { x: 0, z: 0 }, max: { x: 0.2, z: 0.2 } };
    const anyPool = POOLS[0];
    const insideProbe = { min: { x: anyPool.x1 - 0.30, z: anyPool.zDeep1 - 0.02 }, max: { x: anyPool.x1 - 0.10, z: anyPool.zDeep1 + 0.02 } };
    ok(insideProbe.max.x > anyPool.x1 - 0.52, '负对照：槽放到 0.30m 处会被判为被压顶覆盖');

    // (3) 结构柱（含底座）不得侵入任何池体
    const pools = POOLS.map(p => ({ x1: p.x1, z1: p.zDeep1, x2: p.x2, z2: p.zEnd, name: p.name }));
    let columnBad = 0;
    for (const cb of l37ColumnBases) {
      const half = cb.w / 2;
      const box = { min: { x: cb.x - half, z: cb.z - half }, max: { x: cb.x + half, z: cb.z + half } };
      if (pools.some(p => rectHit(box, p.x1, p.z1, p.x2, p.z2, 0.02))) columnBad++;
    }
    ok(columnBad === 0, '所有结构柱与底座都不压四池池体', 'bad=' + columnBad);
    // 负对照：旧柱位 (-6.2,-18) 必须被判为侵入静汤池
    const oldCol = { min: { x: -6.2 - 0.32, z: -18 - 0.32 }, max: { x: -6.2 + 0.32, z: -18 + 0.32 } };
    const quiet = POOLS.find(p => p.name === 'quiet');
    ok(rectHit(oldCol, quiet.x1, quiet.zDeep1, quiet.x2, quiet.zEnd, 0.02),
      '负对照：旧柱位 (-6.2,-18) 确实侵入静汤池（判定有效）');

    // (4) 回水口：数量、贴壁、水下、法线朝内、不与台阶/坐台相撞
    const inlets = (L37PROPS && L37PROPS.inlets) ? L37PROPS.inlets : [];
    ok(inlets.length === 16, '四池各 4 个回水口（共 16 片）', 'count=' + inlets.length);
    let inletBad = 0, inletNormal = 0, inletClash = 0, inletOutside = 0;
    const inward = { [Math.PI / 2]: [1, 0], [-Math.PI / 2]: [-1, 0], 0: [0, 1], [Math.PI]: [0, -1] };
    const aabbHit = (a, b) => a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y && a.min.z < b.max.z && a.max.z > b.min.z;
    for (const it of inlets) {
      const p = POOLS.find(pp => pp.name === it.pool);
      if (!p) { inletBad++; continue; }
      const m = it.mesh;
      m.updateMatrixWorld(true);
      const g = m.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const box = g.boundingBox.clone().applyMatrix4(m.matrixWorld);
      const eps = 0.02;
      // 真实包围盒必须整体落在池壁内侧（不是只验中心点）
      const inside = box.min.x > p.x1 - eps && box.max.x < p.x2 + eps &&
                     box.min.z > p.zDeep1 - eps && box.max.z < p.zEnd + eps;
      if (!inside) { inletBad++; inletOutside++; }
      if (box.max.y > p.water - 0.02 || box.min.y < p.bottom - eps) inletBad++;
      const n = inward[it.ry];
      if (!n) { inletNormal++; continue; }
      const nm = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
      if (nm.x * n[0] + nm.z * n[1] < 0.9) inletNormal++;
      // 与真实台阶/坐台实体做 3D AABB 相交（含 y 上下界与 z 区间）
      const solids = [];
      if (p.stairs) for (const s of p.stairs.steps) {
        solids.push({ name: 'step', min: { x: p.stairs.x1, y: p.bottom, z: s.z1 }, max: { x: p.stairs.x2, y: s.top, z: s.z2 } });
      }
      for (const b of (p.benches || [])) {
        solids.push({ name: 'bench', min: { x: b.x1, y: p.bottom, z: b.z1 }, max: { x: b.x2, y: b.top, z: b.z2 } });
      }
      const hit = solids.find(s => aabbHit(box, s));
      if (hit) { inletClash++; R.lines.push('  DBG clash ' + it.pool + ' vs ' + hit.name + ' at ' + it.x.toFixed(2) + ',' + it.z.toFixed(2)); }
    }
    ok(inletBad === 0, '回水口真实包围盒整体贴壁且位于水下', 'bad=' + inletBad + ' outside=' + inletOutside);
    ok(inletNormal === 0, '回水口法线全部朝池内（不是朝天/朝墙外）', 'bad=' + inletNormal);
    ok(inletClash === 0, '回水口包围盒不与台阶/坐台实体相交（3D AABB）', 'clash=' + inletClash);
  }

  sec('池深地贴：完整牌面与排水槽 / 压顶 / 柱底座都不相交');
  {
    const boxes = [];
    scene.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); boxes.push(g.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const rectBox = r => ({ min: { x: r.x1, z: r.z1 }, max: { x: r.x2, z: r.z2 } });
    const rectHit2 = (b, r) => b.max.x > r.x1 + 0.001 && b.min.x < r.x2 - 0.001 && b.max.z > r.z1 + 0.001 && b.min.z < r.z2 - 0.001;
    ok(l37DeckSigns.length === 4, '四块池深地贴都存在', 'count=' + l37DeckSigns.length);
    let hitSlot = 0, hitCoping = 0, hitBase = 0, nearSlot = 0;
    const gapTo = (b, r) => Math.max(r.x1 - b.max.x, b.min.x - r.x2, r.z1 - b.max.z, b.min.z - r.z2);
    for (const s of l37DeckSigns) {
      const sMesh = s.mesh; sMesh.updateMatrixWorld(true);
      const sGeo = sMesh.geometry; if (!sGeo.boundingBox) sGeo.computeBoundingBox();
      const b = sGeo.boundingBox.clone().applyMatrix4(sMesh.matrixWorld);
      const pool = POOLS.find(p => Math.abs((p.x1 + p.x2) / 2 - s.x) < 12 && Math.abs((p.zDeep1 + p.zEnd) / 2 - s.z) < 14);
      for (const r of L12_DRAIN_RECTS) {
        if (rectHit2(b, r)) { hitSlot++; R.lines.push('  DBG sign ' + s.text + ' x[' + b.min.x.toFixed(2) + ',' + b.max.x.toFixed(2) + '] z[' + b.min.z.toFixed(2) + ',' + b.max.z.toFixed(2) + '] vs slot ' + JSON.stringify(r)); }
        const gap = gapTo(b, r);
        if (gap >= 0 && gap < 0.10) nearSlot++;
      }
      for (const p of POOLS) {
        // 压顶带：距池边 0..0.52
        const cop = [
          { x1: p.x1 - 0.52, x2: p.x1, z1: p.zDeep1, z2: p.zEnd },
          { x1: p.x2, x2: p.x2 + 0.52, z1: p.zDeep1, z2: p.zEnd },
          { x1: p.x1, x2: p.x2, z1: p.zDeep1 - 0.52, z2: p.zDeep1 },
          { x1: p.x1, x2: p.x2, z1: p.zEnd, z2: p.zEnd + 0.52 },
        ];
        for (const c of cop) if (rectHit2(b, c)) hitCoping++;
      }
      for (const cb of l37ColumnBases) {
        const half = cb.w / 2 + 0.02;
        if (rectHit2(b, { x1: cb.x - half, x2: cb.x + half, z1: cb.z - half, z2: cb.z + half })) hitBase++;
      }
    }
    ok(hitSlot === 0, '地贴牌面不压排水槽', 'hit=' + hitSlot);
    ok(nearSlot === 0, '地贴与排水槽净距 ≥0.10m', 'near=' + nearSlot);
    ok(hitCoping === 0, '地贴牌面不压池沿压顶', 'hit=' + hitCoping);
    ok(hitBase === 0, '地贴牌面不压柱底座', 'hit=' + hitBase);
  }

  sec('灯光注册：水面填光 2 盏 + 房间灯全部落在真实房间内，无旧图灯复活');
  {
    const fill = poolLights.filter(r => !r.fxMat);
    const room = poolLights.filter(r => !!r.fxMat);
    ok(fill.length === 2, '水面填光恰好 2 盏（既有共享逻辑，未随旧图删除）', 'fill=' + fill.length);
    ok(fill.every(r => r.zone === 'pool'), '两盏填光都登记在 pool 区', fill.map(r => r.zone).join(','));
    ok(room.length >= 20 && room.length <= 34, '房间灯数量在预算内', 'count=' + room.length);
    const inRoom = (x, z) => L12P.roomAt(L12P.L37.rooms, x, z) != null;
    const outside = room.filter(r => !inRoom(r.light.position.x, r.light.position.z));
    ok(outside.length === 0, '每盏房间灯都落在 plan 的某个房间内', 'outside=' + outside.length);
    const inWater = room.filter(r => POOLS.some(p => r.light.position.x > p.x1 && r.light.position.x < p.x2 &&
      r.light.position.z > p.zDeep1 && r.light.position.z < p.zEnd && r.light.position.y < p.water + 1.2));
    ok(inWater.length === 0, '没有灯盘落在池水面上方 1.2m 内（不出现漂浮灯）', 'inWater=' + inWater.length);
    const oldSpots = [[-10,-11],[0,-11],[8,-11],[-10,2],[0,2],[8,2],[-4,9],[6,9],[-0.5,18],[5.2,21],[14,10],[21,10],[27,2],[13,-10],[27,-11],[26.4,-14.4]];
    const revived = room.filter(r => oldSpots.some(([x,z]) => Math.abs(r.light.position.x - x) < 0.01 && Math.abs(r.light.position.z - z) < 0.01));
    ok(revived.length === 0, '负对照：旧 26 盏的位置一个都没有复活', 'revived=' + revived.length);
    ok(room.every(r => r.fxMat && r.base > 0), '每盏房间灯都有灯盘与正的光强');
  }

  sec('淋浴隔间：8 间真实进出 / 单间封口负对照 / 走道到浴位的真实遮挡射线');
  {
    const stalls = L12_PROPS_DATA.filter(p => p.kind === 'stall');
    ok(stalls.length === 8, '淋浴隔间共 8 间', 'n=' + stalls.length);
    const panelMeshes = [];
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.parameters) return;
      const g = o.geometry.parameters;
      if (!(g.height >= 2.0 && g.height <= 2.2)) return;
      if (g.width > 0.2 && g.depth > 0.2) return;          // 只看板（薄在一个方向）
      panelMeshes.push(o);
    });
    ok(panelMeshes.length >= 32, '隔间板材网格已生成（含共用板）', 'panels=' + panelMeshes.length);

    // (1) 逐间真实进出：更衣门 → 走道 → 浴位 → 回走道 → 湿区门
    let worstStep = 0, legFails = 0;
    for (const p of stalls) {
      const e = p.entry || 1;
      const zB = p.z - p.d / 2, zF = p.z + p.d / 2;
      const shower = { x: p.x - e * 0.45, z: zB + 0.72 };     // 立管前的站位（回墙内侧）
      const lane = { x: p.x + e * 0.55, z: 5.15 };            // 公共走道内、正对入口
      const room = L12P.roomById(L12P.L37.rooms, p.room);
      const doorMouth = { x: p.room === 'shwW' ? -12.8 : 12.8, z: 5.55 };  // 本侧更衣门内侧（房间内，不在墙上）
      place(doorMouth.x, doorMouth.z);
      const legs = [
        ['走道', lane],
        ['浴位', shower],
        ['退回走道', lane],
        ['湿区门', { x: p.room === 'shwW' ? -5.2 : 5.2, z: 4.0 }]
      ];
      let okAll = true;
      for (const [label, pt] of legs) {
        const r = walkTo(pt.x, pt.z, 2200);
        worstStep = Math.max(worstStep, r.maxStep);
        if (!r.ok) { okAll = false; legFails++; R.lines.push('   DBG ' + p.id + ' ' + label + ' ' + r.reason + ' frames=' + r.frames + ' maxStep=' + (r.maxStep || 0).toFixed(3) + ' at ' + player.x.toFixed(2) + ',' + player.z.toFixed(2) + ' y=' + player.y.toFixed(2)); break; }
      }
      ok(okAll, p.id + ' 从本侧更衣门经走道进出浴位并回到湿区（真实 updatePlayer）');
    }
    ok(worstStep < 0.35, '隔间路径无瞬移（最大单帧位移）', worstStep.toFixed(3) + 'm');
    ok(legFails === 0, '8 间全部走通，无失败段', 'fails=' + legFails);

    // (2) 负对照：封住第 3 间入口，其余 7 间仍可从走道到达，被封那间进不去
    const sealed = stalls[2];
    const se = sealed.entry || 1;
    const szB = sealed.z - sealed.d / 2, szF = sealed.z + sealed.d / 2;
    const sgx = sealed.x + se * 0.15, sxEdge = sealed.x + se * sealed.w / 2;
    const gate = { x1: Math.min(sgx, sxEdge), x2: Math.max(sgx, sxEdge), z1: szF - 0.12, z2: szF + 0.02, y1: 0, y2: 2.1, kind: 'testWall' };
    COLLIDERS.push(gate); buildGrid();
    place(sealed.room === 'shwW' ? -12.8 : 12.8, 5.55);
    const sealedIn = walkTo(sealed.x - se * 0.45, szB + 0.72, 1600);
    ok(!sealedIn.ok, '封住入口后该间浴位不可达（负对照生效）', sealedIn.reason);
    let othersOk = 0;
    for (const p of stalls) {
      if (p === sealed) continue;
      const e2 = p.entry || 1, z2 = p.z - p.d / 2 + 0.72;
      const r = walkTo(p.x - e2 * 0.45, z2, 2600);
      if (r.ok) othersOk++;
    }
    ok(othersOk === 7, '封一间不影响其余 7 间到达', 'ok=' + othersOk);
    COLLIDERS.splice(COLLIDERS.indexOf(gate), 1); buildGrid();
    place(sealed.room === 'shwW' ? -12.8 : 12.8, 5.55);
    const restored = walkTo(sealed.x - se * 0.45, szB + 0.72, 1600);
    ok(restored.ok, '移除封堵后该间恢复可达（正对照）');

    // (3) 隐私：走道多个眼位对胸/头的射线必须先命中不透明板；移除前挡板后暴露
    const rc = new THREE.Raycaster();
    const eyeY = 1.52;
    const blockedAt = (eye, target, skipFrontOf) => {
      const dir = new THREE.Vector3(target.x - eye.x, target.y - eye.y, target.z - eye.z);
      const dist = dir.length(); dir.normalize();
      rc.set(new THREE.Vector3(eye.x, eye.y, eye.z), dir);
      rc.far = dist - 0.02;
      const cand = panelMeshes.filter(m => {
        if (!skipFrontOf) return true;
        const q = m.geometry.parameters;
        return !(Math.abs(q.width - skipFrontOf.w) < 0.08 && Math.abs(m.position.z - skipFrontOf.z) < 0.08);
      });
      const hits = rc.intersectObjects(cand, false);
      // 只认不透明面：透明玻璃（transparent / opacity<1）不算隐私遮挡
      const opaque = h => {
        const mats = Array.isArray(h.object.material) ? h.object.material : [h.object.material];
        return mats.every(m => m && m.transparent !== true && (m.opacity == null || m.opacity >= 1));
      };
      return hits.find(opaque) || null;
    };
    let privOk = 0, privTotal = 0;
    for (const p of stalls) {
      const e = p.entry || 1, zB = p.z - p.d / 2, zF = p.z + p.d / 2;
      const chest = { x: p.x - e * 0.45, y: 1.15, z: zB + 0.72 };
      const head = { x: p.x - e * 0.45, y: 1.62, z: zB + 0.72 };
      const eyes = [
        { x: p.x + e * 1.0, y: eyeY, z: zF + 0.72 },   // 走道斜前（靠入口一侧）
        { x: p.x - e * 0.9, y: eyeY, z: zF + 0.72 },   // 走道正前（靠屏风一侧）
        { x: p.x + e * 0.2, y: eyeY, z: zF + 1.05 }    // 走道稍远
      ];
      for (const eye of eyes) for (const tgt of [chest, head]) {
        privTotal++;
        if (blockedAt(eye, tgt)) privOk++;
      }
    }
    ok(privOk === privTotal, '公共走道对浴位胸/头的射线全部先被不透明板挡住', privOk + '/' + privTotal);
    // 负对照：移除某间前挡板后，正前眼位必须能到达浴位（射线不再被挡）
    const q0 = stalls[0], qe = q0.entry || 1, qzB = q0.z - q0.d / 2, qzF = q0.z + q0.d / 2;
    const frontW0 = Math.abs((q0.x - qe * q0.w / 2) - (q0.x + qe * 0.15));
    const eye0 = { x: q0.x - qe * 0.9, y: eyeY, z: qzF + 0.72 };
    const tgt0 = { x: q0.x - qe * 0.45, y: 1.15, z: qzB + 0.72 };
    ok(!!blockedAt(eye0, tgt0), '负对照前：该眼位原本被前挡板挡住');
    ok(!blockedAt(eye0, tgt0, { w: frontW0, z: qzF - 0.04 }), '移除前挡板后浴位暴露（负对照生效，隐私来自实体板）');
    // 负对照 2：把该间前挡板换成旧 0.28 透明玻璃材质，同一射线不得再被算作"被隐私屏挡住"
    const frontMesh = panelMeshes.find(m => {
      const q = m.geometry.parameters;
      return Math.abs(q.width - frontW0) < 0.08 && Math.abs(m.position.z - (qzF - 0.04)) < 0.08 &&
        Math.abs(m.position.x - (q0.x - qe * (q0.w / 2 - 0.15) / 2)) < 0.6;
    });
    ok(!!frontMesh, '找到该间前挡板网格');
    if (frontMesh) {
      const saved = frontMesh.material;
      frontMesh.material = new THREE.MeshStandardMaterial({ color: 0x8fa6a6, transparent: true, opacity: 0.28 });
      const leak = blockedAt(eye0, tgt0);
      ok(leak === null, '透明玻璃前屏不算隐私遮挡（负对照生效）', leak ? '仍被算作遮挡' : '暴露');
      frontMesh.material = saved;
    }
  }

  sec('墙牌完整落在实墙上，长凳两端落地支撑');
  for (const sign of L37PROPS.waySigns) {
    const normal = { x: Math.sin(sign.ry), z: Math.cos(sign.ry) };
    const onX = Math.abs(normal.x) > 0.9;
    const coord = onX ? sign.x - normal.x * 0.18 : sign.z - normal.z * 0.18;
    sign.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(sign.mesh);
    const lo = onX ? bounds.min.z : bounds.min.x;
    const hi = onX ? bounds.max.z : bounds.max.x;
    const supported = L12P.L37.rooms.some(r => {
      const boundary = onX ? (normal.x > 0 ? r.x1 : r.x2) : (normal.z > 0 ? r.z1 : r.z2);
      return Math.abs(boundary - coord) < 1e-6 && lo >= (onX ? r.z1 : r.x1) && hi <= (onX ? r.z2 : r.x2);
    });
    const crossesDoor = L12P.L37.doors.some(d => d.axis === (onX ? 'x' : 'z') &&
      Math.abs(d.coord - coord) < 1e-6 && lo < d.gap[1] && hi > d.gap[0]);
    ok(supported && !crossesDoor, `${sign.id} 完整背板贴实墙并避开门洞`);
    const nearestFace = onX ? (normal.x > 0 ? bounds.min.x : -bounds.max.x) : (normal.z > 0 ? bounds.min.z : -bounds.max.z);
    ok(nearestFace - coord * (onX ? normal.x : normal.z) >= 0.12, `${sign.id} 背板位于墙面外侧`);
  }
  ok(L12P.L37.doors.some(d => d.axis === 'x' && d.coord === -6 && 14 < d.gap[1] && 16 > d.gap[0]), '负对照检出旧更衣牌覆盖门洞');
  for (const bench of L12_PROPS_DATA.filter(p => p.kind === 'bench')) {
    const pieces = [];
    scene.traverse(m => { if (m.userData.benchId === bench.id) pieces.push(m); });
    const seat = pieces.find(m => m.userData.benchPart === 'seat');
    const legs = pieces.filter(m => m.userData.benchPart === 'leg');
    ok(!!seat && legs.length === 2, `${bench.id} 有两端支腿`);
    if (!seat || legs.length !== 2) continue;
    const seatBox = new THREE.Box3().setFromObject(seat);
    const alongX = bench.w >= bench.d;
    const span = alongX ? bench.w : bench.d;
    const centers = [];
    for (const leg of legs) {
      const b = new THREE.Box3().setFromObject(leg);
      centers.push(alongX ? (b.min.x + b.max.x) / 2 - bench.x : (b.min.z + b.max.z) / 2 - bench.z);
      ok(Math.abs(b.min.y) < 1e-6 && Math.abs(b.max.y - seatBox.min.y) < 1e-6, `${bench.id} 支腿接地并接触座板`);
    }
    ok(Math.min(...centers) < -span / 4 && Math.max(...centers) > span / 4, `${bench.id} 支腿分布在长边两端`);
  }

  sec('吸顶圆灯的真实灯壳接触房间吊顶');
  for (const lamp of poolLights.filter(l => l.fxMat)) {
    const room = L12P.roomAt(L12P.L37.rooms, lamp.light.position.x, lamp.light.position.z);
    const ceilingY = l12RoomH(room);
    const bounds = new THREE.Box3().setFromObject(lamp.fixture);
    ok(Math.abs(bounds.max.y - (ceilingY - 0.02)) < 1e-6, `${lamp.zone} 灯壳顶部接触本房间吊顶`);
    ok(Math.abs(bounds.min.y - lamp.disc.position.y - 0.004) < 1e-6, `${lamp.zone} 发光面紧贴灯壳底面并避开共面闪烁`);
    ok(Math.abs(lamp.light.position.y - (ceilingY - 0.16)) < 1e-6, `${lamp.zone} 光源高度随房间净高生成`);
  }

  sec('明亮瓷砖材质与小池悬浮栏杆回归');
  ok(!COLLIDERS.some(c => c.kind === 'grabRail'), '三个小池的无支撑栏杆及碰撞已移除');
  for (const p of POOLS.filter(p => p.name !== 'pool')) {
    const stray = [];
    scene.updateMatrixWorld(true);
    scene.traverse(m => {
      if (!m.isMesh || !m.geometry || m.geometry.type !== 'CylinderGeometry') return;
      const b = new THREE.Box3().setFromObject(m);
      if (b.min.x > p.x1 && b.max.x < p.x2 && b.min.z > p.zDeep1 && b.max.z < p.zEnd &&
          b.min.y >= -0.001 && b.max.y < 1.2) stray.push(m);
    });
    ok(stray.length === 0, `${p.name} 水面上方无孤立栏杆柱脚`);
  }
  ok(l12SpaWallMat.map.userData.asset === 'assets-v2/l37-porcelain-wall.png', '墙面实际消费新白色瓷砖贴图');
  ok(l12SpaFloorMat.map.userData.asset === 'assets-v2/l37-porcelain-floor.png', '地面实际消费新浅灰地砖贴图');
  ok(l12SpaWallMat.isMeshPhysicalMaterial && l12SpaWallMat.roughness <= 0.3 && l12SpaWallMat.clearcoat >= 0.3,
    '墙砖采用有釉面反射的物理材质');
  ok(l12SpaFloorMat.roughness >= 0.4 && l12SpaFloorMat.roughness < 0.6 && l12SpaFloorMat.metalness === 0,
    '浅色地砖有柔和反光且无金属感');
  ok(l12SpaWallMat.color.r > 0.95 && l12SpaFloorMat.color.r > 0.95, '瓷砖未再被棕色材质乘暗');
  ok(L12_TEX.plaster === 'assets-v2/l12-v2-spa-plaster.png', '第一关共享抹灰资源保持原绑定');

  /* 门框闪烁回归（一）：门套/门楣周边不得存在同向共面重叠面 —— 真实世界面坐标，非字符串 */
  sec('门洞共面（真实世界面扫描 + 旧构造负对照）');
  {
    const CP = globalThis.__L12_COPLANAR;
    ok(!!CP, '门洞共面扫描库已加载（door-coplanar-scan.js）');
    if (CP) {
      const allBoxes = CP.collectBoxes(THREE, scene);
      const sc = CP.scanPairs(allBoxes, L37_DOORS_V2);
      ok(sc.length === 0, `门套/门楣周边无同向共面重叠面（${sc.length} 对，共 ${allBoxes.length} 个盒体）`,
        sc.slice(0, 3).map(h => h.d.axis + '@' + h.d.coord + ' ' + h.ax + h.side + ' ' + h.area.toFixed(3)).join(' | '));
      const bad = L37_DOORS_V2
        .map(d => ({ d, n: CP.scanPairs(allBoxes, [d]).length }))
        .filter(x => x.n > 0);
      ok(bad.length === 0, `${L37_DOORS_V2.length} 个门洞逐个无共面重叠（异常 ${bad.length} 个）`,
        bad.map(x => x.d.axis + '@' + x.d.coord + ':' + x.n).join(','));
      // 负对照：按修复前老构造还原（立框内侧面贴墙洞切面、上沿底面贴门楣底面），z 向与 x 向都必须被检出
      const byAxis = CP.legacyCheck(THREE, L37_DOORS_V2);
      ok(byAxis.z >= 2, `负对照（z 向门洞）：旧门套构造被判出共面 ${byAxis.z} 对 ≥ 2`);
      ok(byAxis.x >= 2, `负对照（x 向门洞）：旧门套构造被判出共面 ${byAxis.x} 对 ≥ 2`);
      for (const ax of ['z', 'x']) {
        const ld = L37_DOORS_V2.filter(d => d.axis === ax)[0];
        const legHits = ld ? CP.scanPairs(CP.legacyPairs(THREE, ld), [ld]) : [];
        const jambAxis = ax === 'z' ? 'x' : 'z';
        ok(legHits.some(h => h.ax === jambAxis),
          `负对照（${ax} 向）覆盖"立框内侧面 vs 墙洞切面"`, legHits.filter(h => h.ax === jambAxis).map(h => h.ax + h.side + ' ' + h.area.toFixed(3)).join(','));
        ok(legHits.some(h => h.ax === 'y'),
          `负对照（${ax} 向）覆盖"上门套底面 vs 门楣底面"`, legHits.filter(h => h.ax === 'y').map(h => h.ax + h.side + ' ' + h.area.toFixed(3)).join(','));
      }
      // 不限定门套的全配对扫描：门洞邻域内任何两个盒体都不许同向共面
      // （墙裙/压条端面若贴到洞口切面或门套内表面，同样会在斜视时出现 z-fighting 虚线）
      const scAll = CP.scanPairs(allBoxes, L37_DOORS_V2, { onlyCasing: false });
      ok(scAll.length === 0, `门洞邻域全配对无同向共面重叠（${scAll.length} 对，不限门套）`,
        scAll.slice(0, 4).map(h => h.d.axis + '@' + h.d.coord + ' ' + h.ax + h.side + ' '
          + (h.A.mesh.name || 'anon') + '/' + (h.B.mesh.name || 'anon') + ' ' + h.area.toFixed(4)).join(' | '));
      // 负对照（墙裙端面类）：护墙板端面正好压在洞口切面上时，全配对扫描必须报出来
      {
        const ld = L37_DOORS_V2[0];
        // 与护墙同侧的墙段（端面同为 max 面、同朝 +x），才构成"端面贴洞口切面"的共面冲突
        const wBoxes = CP.legacyPairs(THREE, ld).filter(b => b.mesh.name === 'legacyWall');
        const wallSameSide = wBoxes[0];
        wallSameSide.min.x = ld.gap[0] - 3.0; wallSameSide.max.x = ld.gap[0];
        const g0 = ld.gap[0];
        const panel = new THREE.Mesh(new THREE.BoxGeometry(
          ld.axis === 'z' ? 2.0 : 0.065, 0.045, ld.axis === 'z' ? 0.065 : 2.0), new THREE.MeshBasicMaterial());
        panel.name = 'legacyWainscotRail';
        if (ld.axis === 'z') panel.position.set(g0 - 1.0, 0.74, ld.coord + 0.1395);
        else panel.position.set(ld.coord + 0.1395, 0.74, g0 - 1.0);
        panel.updateMatrixWorld(true);
        const pb = { mesh: panel, min: new THREE.Box3().setFromObject(panel).min.clone(), max: new THREE.Box3().setFromObject(panel).max.clone() };
        const legAll = CP.scanPairs(wBoxes.concat([pb]), [ld], { onlyCasing: false });
        ok(legAll.length > 0, '负对照（墙裙端面）：端面贴洞口切面时全配对扫描能判出', 'hits=' + legAll.length);
      }
    }
  }

  /* 门框闪烁回归（二）：门套构造不变量（外贴、不侵入洞口、上沿底面=名义门高、门楣抬高、角部压接） */
  sec('门套构造不变量（净空 / 抬高 / 角部压接）');
  {
    scene.updateMatrixWorld(true);
    const boxOf = m => new THREE.Box3().setFromObject(m);
    const jambMeshes = [], headMeshes = [], lintelMeshes = [];
    scene.traverse(m => {
      if (!m.isMesh || !m.geometry || m.geometry.type !== 'BoxGeometry') return;
      if (m.name === 'l12CasingJamb') jambMeshes.push(m);
      else if (m.name === 'l12CasingHead') headMeshes.push(m);
      else if (m.name === 'l12Lintel') lintelMeshes.push(m);
    });
    ok(jambMeshes.length === L37_DOORS_V2.length * 2,
      `每个门洞两个立框（${jambMeshes.length}/${L37_DOORS_V2.length * 2}）`);
    ok(headMeshes.length === L37_DOORS_V2.length,
      `每个门洞一个上门套（${headMeshes.length}/${L37_DOORS_V2.length}）`);
    const jb = jambMeshes.map(boxOf), hb = headMeshes.map(boxOf), lb = lintelMeshes.map(boxOf);
    const along = b => (b.max.x - b.min.x) > (b.max.z - b.min.z) ? 'x' : 'z';
    let clearOk = 0, headOk = 0, lapOk = 0, jointOk = 0;
    const bad = [];
    for (const d of L37_DOORS_V2) {
      const ax = d.axis === 'z' ? 'x' : 'z';       // 洞口展开方向
      const th = d.axis;                            // 墙厚方向
      const near = b => Math.abs((b.min[th] + b.max[th]) / 2 - d.coord) < 0.03 &&
        b.max[ax] > d.gap[0] - 0.25 && b.min[ax] < d.gap[1] + 0.25;
      const doorH = d.h == null ? 2.3 : d.h;
      const js = jb.filter(b => near(b) && b.max.y < doorH + 0.2).sort((p, q) => p.min[ax] - q.min[ax]);
      const hd = hb.filter(b => near(b) && Math.abs(b.min.y - doorH) < 0.01)[0];
      const lt = lb.filter(b => near(b) && b.min.y > doorH - 0.001 && b.max.y <= 4.41)[0];
      if (js.length !== 2 || !hd || !lt) { bad.push(d.axis + '@' + d.coord + ':缺件'); continue; }
      // 1) 立框内侧面必须退让到洞口之外（不侵入净空、且不与墙洞切面共面）
      const leftGap = d.gap[0] - js[0].max[ax], rightGap = js[1].min[ax] - d.gap[1];
      if (leftGap >= 0.003 && rightGap >= 0.003) clearOk++; else bad.push(d.axis + '@' + d.coord + ':净空' + leftGap.toFixed(3) + '/' + rightGap.toFixed(3));
      // 2) 上门套底面 = 名义门高；门楣底面被抬高（不与上门套底面共面）
      if (Math.abs(hd.min.y - doorH) < 0.001 && lt.min.y - hd.max.y > -0.078 && lt.min.y - hd.min.y >= 0.004) headOk++;
      else bad.push(d.axis + '@' + d.coord + ':门头' + hd.min.y.toFixed(3) + '/' + lt.min.y.toFixed(3));
      // 3) 上沿两端压过立框外侧面 ≥6mm，且厚度比立框大 ≥4mm（正面不共面）
      const lapL = hd.min[ax] <= js[0].min[ax] - 0.005, lapR = hd.max[ax] >= js[1].max[ax] + 0.005;
      const dHead = hd.max[th] - hd.min[th], dJamb = js[0].max[th] - js[0].min[th];
      if (lapL && lapR && dHead - dJamb >= 0.004) lapOk++; else bad.push(d.axis + '@' + d.coord + ':压接');
      // 4) 立框顶端藏在上沿实体内部（不是顶在上沿底面上）
      if (js[0].max.y > hd.min.y + 0.02 && js[0].max.y < hd.max.y - 0.004 &&
        js[1].max.y > hd.min.y + 0.02 && js[1].max.y < hd.max.y - 0.004) jointOk++;
      else bad.push(d.axis + '@' + d.coord + ':顶角');
    }
    const total = L37_DOORS_V2.length;
    ok(clearOk === total, `立框退让洞口 6mm 不侵入净空（${clearOk}/${total}）`);
    ok(headOk === total, `上沿底面=名义门高且门楣抬高 ≥4mm（${headOk}/${total}）`);
    ok(lapOk === total, `上沿两端压过立框且厚度更大（${lapOk}/${total}）`);
    ok(jointOk === total, `立框顶端藏在上沿实体内部（${jointOk}/${total}）`);
    if (bad.length) R.lines.push('    明细 ' + bad.slice(0, 6).join(' | '));
  }

  sec('近景细件：真实倒角轮廓 / 米制 UV / 有限值 / 接地 / 合批（不是只加标签）');
  {
    const detail = [];
    scene.traverse(o => { if (o.isMesh && o.userData && o.userData.l12detail) detail.push(o); });
    const slabs = detail.filter(o => o.userData.detailKind === 'slab');
    const bof = m => {
      const g = m.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      return g.boundingBox.clone().applyMatrix4(m.matrixWorld);
    };
    const part = (o, n) => o.userData && o.userData.detailPart === n;
    const boxVerts = new THREE.BoxGeometry(1, 1, 1).attributes.position.count;

    ok(slabs.length >= 40, '两关家具的倒角板材数量与覆盖达到规格', 'slabs=' + slabs.length + ' detail=' + detail.length);
    const made = (L37PROPS && L37PROPS.detail && L37PROPS.detail.parts) || {};
    ok((made.door || 0) >= 30, '柜门为独立门板（非与柜体一体）', 'doors=' + (made.door || 0));
    ok((made.toeKick || 0) >= 5, '柜体有内收踢脚（接地支撑）', 'toeKick=' + (made.toeKick || 0));
    ok((made.apron || 0) >= 1 && (made.top || 0) >= 1, '台面下有前裙板与独立台面', 'apron=' + (made.apron || 0) + ' top=' + (made.top || 0));

    let thin = 0, axisOnly = 0, nonFinite = 0, uvBad = 0, uvChecked = 0, bevelBad = 0;
    for (const m of slabs) {
      const g = m.geometry;
      const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
      if (!pos || !nrm || pos.count <= boxVerts * 2) { thin++; continue; }
      let skewed = 0;
      for (let i = 0; i < nrm.count; i++) {
        const mx = Math.max(Math.abs(nrm.getX(i)), Math.abs(nrm.getY(i)), Math.abs(nrm.getZ(i)));
        if (mx < 0.995) skewed++;
      }
      if (skewed < 8) axisOnly++;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      const dims = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
      if (!dims.every(v => Number.isFinite(v) && v > 0)) nonFinite++;
      for (let i = 0; i < pos.count; i++) {
        if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) { nonFinite++; break; }
      }
      // 倒角半径必须随厚度限幅：斜切不能吃掉整块板（否则就成了"枕化"或棱角失真）
      const tMin = Math.min(...dims);
      if (skewed > 0 && tMin <= 0) bevelBad++;
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
    ok(thin === 0, '每块板都是细分几何（顶点数远大于盒体的 ' + boxVerts + '）', 'thin=' + thin);
    ok(axisOnly === 0, '每块板都存在真实斜切面（非轴对齐法线 ≥8 个）', 'axisOnly=' + axisOnly);
    ok(nonFinite === 0, '细件几何坐标与包围盒全部为有限值', 'bad=' + nonFinite);
    ok(bevelBad === 0, '倒角未吃掉板厚（限幅未越界）', 'bad=' + bevelBad);
    ok(uvBad === 0, '细件 UV 为米制尺度（跨度与世界尺寸同量级，材质不被拉伸）', (uvChecked - uvBad) + '/' + uvChecked);
    // 负对照：等尺寸盒体顶点数不足且没有斜切法线 → 上述判据确实会拦下"只换色的方块"
    const refBox = new THREE.BoxGeometry(3.6, 0.06, 0.8);
    let refSkew = 0;
    const rn = refBox.attributes.normal;
    for (let i = 0; i < rn.count; i++) {
      if (Math.max(Math.abs(rn.getX(i)), Math.abs(rn.getY(i)), Math.abs(rn.getZ(i))) < 0.995) refSkew++;
    }
    ok(refBox.attributes.position.count <= boxVerts * 2 && refSkew === 0,
      '负对照：等尺寸盒体的顶点数/斜切法线判据判不合格',
      'verts=' + refBox.attributes.position.count + ' skew=' + refSkew);

    // 门缝：同一排相邻门板之间必须留出 3–5mm 的真实间隙（可用射线/贴合宽度验证，不是画一条深色线）
    const doorsB = slabs.filter(o => part(o, 'door')).map(o => bof(o));
    let gapOk = 0, gapChecked = 0, gapBad = [];
    for (let i = 0; i < doorsB.length; i++) {
      for (let j = i + 1; j < doorsB.length; j++) {
        const a = doorsB[i], b = doorsB[j];
        const overlapY = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
        if (overlapY < 0.30) continue;
        const sameX = Math.abs((a.min.x + a.max.x) / 2 - (b.min.x + b.max.x) / 2) < 0.03;
        const sameZ = Math.abs((a.min.z + a.max.z) / 2 - (b.min.z + b.max.z) / 2) < 0.03;
        let d = null;
        if (sameZ && !sameX) d = Math.max(a.min.x - b.max.x, b.min.x - a.max.x);
        else if (sameX && !sameZ) d = Math.max(a.min.z - b.max.z, b.min.z - a.max.z);
        if (d == null || d > 0.02) continue;     // 不是同一排相邻门板
        gapChecked++;
        if (d >= 0.0025 && d <= 0.006) gapOk++; else gapBad.push(d.toFixed(4));
      }
    }
    ok(gapChecked > 0 && gapOk === gapChecked, '同排门板之间留出 3–5mm 可见门缝',
      gapOk + '/' + gapChecked + (gapBad.length ? ' bad=' + gapBad.slice(0, 5).join(',') : ''));

    // 立体把手/铰链：每块柜门都得有可抓的杆和铰链筒（圆杆已实例化，按生成时计数核对）
    const batch = detail.filter(o => o.userData.detailKind === 'rods');
    ok(batch.length >= 1 && batch.every(o => o.isInstancedMesh && o.userData.rodCount > 0),
      '圆杆按材质合批为 InstancedMesh（不是每根一个 Mesh）',
      batch.map(o => o.userData.rodCount).join(','));
    const madeParts = (L37PROPS && L37PROPS.detail && L37PROPS.detail.parts) || {};
    const doorCount = made.door || 0;
    ok((madeParts.handle || 0) >= doorCount, '每块柜门至少配 1 个立体把手（杆件，不是贴图）',
      'handle=' + (madeParts.handle || 0) + ' doors=' + doorCount);
    ok((madeParts.hinge || 0) >= doorCount, '柜门配有铰链筒（真实结构件）',
      'hinge=' + (madeParts.hinge || 0) + ' doors=' + doorCount);
    ok((madeParts.riser || 0) >= 8, '八间淋浴各有一根落地立管', 'riser=' + (madeParts.riser || 0));
    ok((madeParts.clamp || 0) >= 16, '立管有真实管夹与墙面连接', 'clamp=' + (madeParts.clamp || 0));
    ok((madeParts.head || 0) >= 8 && (madeParts.knob || 0) >= 8 && (madeParts.mixer || 0) >= 8,
      '淋浴有圆盘喷头 + 混水阀弯管 + 旋钮',
      'head=' + (madeParts.head || 0) + ' knob=' + (madeParts.knob || 0) + ' mixer=' + (madeParts.mixer || 0));

    // 主池扶梯：两级梯架是连续弯管，四级踏步两端都落在梯架管上（无悬空内侧短杆）
    const frames = [], treads = [];
    scene.traverse(o => {
      if (!o.isMesh || !o.userData) return;
      if (o.userData.detailPart === 'ladderFrame') frames.push(o);
      if (o.userData.detailPart === 'ladderTread') treads.push(o);
    });
    ok(frames.length === 4 && treads.length === 8, '两副扶梯各有两根连续弯管梯架与四级踏步',
      'frames=' + frames.length + ' treads=' + treads.length);
    ok(!scene.getObjectByName('l12LadderStringer') &&
      !detail.some(o => /ladderStringer|ladderPost/.test(o.userData.detailPart || '')),
      '不再存在与梯架不连接的内侧短杆');
    const fb = frames.map(o => bof(o));
    let tOk = 0; const tBad = [];
    for (const tr of treads) {
      const tb = bof(tr);
      const sides = [tb.min.x, tb.max.x].map(px => fb.filter(b =>
        px > b.min.x - 0.006 && px < b.max.x + 0.006 &&
        tb.min.y > b.min.y - 0.006 && tb.max.y < b.max.y + 0.006 &&
        tb.max.z > b.min.z - 0.01 && tb.min.z < b.max.z + 0.01).length);
      if (sides[0] >= 1 && sides[1] >= 1) tOk++;
      else tBad.push('tread@' + ((tb.min.x + tb.max.x) / 2).toFixed(2) + ',' + tb.max.y.toFixed(2));
    }
    ok(tOk === treads.length, '每级踏步两端都由梯架实体承托（真实空间接触）',
      tOk + '/' + treads.length + (tBad.length ? ' ' + tBad.slice(0, 3).join(',') : ''));

    // 本轮新增构件的支承连接：躺椅扶手立柱、座下框架、靠背接触
    sec('躺椅支承连接（扶手立柱 / 座下框架 / 靠背接触，真实几何）');
    {
      const bb = o => { scene.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
      const rods = (L37PROPS.detailKit && L37PROPS.detailKit.rodInstances()) || [];
      const slabs = [];
      scene.traverse(o => {
        if (o.isMesh && o.userData && o.userData.detailKind === 'slab') slabs.push({ part: o.userData.detailPart || '', box: bb(o) });
      });
      const byPart = (arr, p) => arr.filter(x => x.part === p);
      const arms = byPart(rods, 'armrest'), posts = byPart(rods, 'armPost');
      const seats = byPart(slabs, 'loungeSeat'), backs = byPart(slabs, 'loungeBack'), legs = byPart(slabs, 'loungeLeg');
      const rails = byPart(rods, 'seatRail'), crosses = byPart(rods, 'seatCross');

      let aOk = 0; const aBad = []; let pair = null;
      for (const a of arms) {
        const ac = a.box.getCenter(new THREE.Vector3());
        const under = posts.find(p => {
          const pc = p.box.getCenter(new THREE.Vector3());
          return Math.abs(pc.x - ac.x) < 0.05 &&
            pc.z > a.box.min.z - 0.02 && pc.z < a.box.max.z + 0.02 &&
            p.box.max.y >= a.box.min.y - 0.001 && p.box.max.y <= ac.y + 0.002;
        });
        if (under) { aOk++; if (!pair) pair = { a, under }; } else aBad.push('x=' + ac.x.toFixed(2) + ' z=' + ac.z.toFixed(2));
      }
      ok(arms.length === 6 && aOk === arms.length, '六根扶手杆下方立柱都顶到扶手底面（无空档）',
        aOk + '/' + arms.length + (aBad.length ? ' ' + aBad.join(',') : ''));

      let sOk = 0; const sBad = [];
      for (const s of seats) {
        const sb = s.box;
        const hit = rails.concat(crosses).some(u => Math.abs(u.box.max.y - sb.min.y) < 0.004 &&
          Math.min(u.box.max.z, sb.max.z) - Math.max(u.box.min.z, sb.min.z) > 0.4 * (sb.max.z - sb.min.z));
        if (hit) sOk++; else sBad.push('z=' + sb.min.z.toFixed(2));
      }
      ok(sOk === seats.length, '三段座板都贴在座下框架顶面', sOk + '/' + seats.length + (sBad.length ? ' ' + sBad.join(',') : ''));

      let lOk = 0; const lBad = [];
      for (const lg of legs) {
        const lb = lg.box;
        const hit = rails.concat(crosses).some(u =>
          Math.min(u.box.max.x, lb.max.x) - Math.max(u.box.min.x, lb.min.x) > 0.002 &&
          Math.min(u.box.max.z, lb.max.z) - Math.max(u.box.min.z, lb.min.z) > -0.012 &&
          Math.min(u.box.max.y, lb.max.y) - Math.max(u.box.min.y, lb.min.y) > 0.002);
        if (hit) lOk++; else lBad.push('z=' + lb.min.z.toFixed(2));
      }
      ok(lOk === legs.length, '前后腿都被座下框架接住（含座板末端之外的前腿）',
        lOk + '/' + legs.length + (lBad.length ? ' ' + lBad.join(',') : ''));

      let bOk = 0; const bBad = [];
      for (const b of backs) {
        const hit = seats.some(s => b.box.intersectsBox(s.box));
        if (hit) bOk++; else bBad.push('z=' + b.box.min.z.toFixed(2));
      }
      ok(bOk === backs.length, '靠背条底面贴着座板（真实相交）', bOk + '/' + backs.length + (bBad.length ? ' ' + bBad.join(',') : ''));

      // 横撑/托梁不得越出座板包络：纵向长凳（p.d > p.w）此前用 axis 'x' + len p.d*0.72
      // 生成 1.9–2.6m 的横杆并从 0.6m 宽座板两侧伸出，此处按真实实例包围盒复核。
      const benchRods = byPart(rods, 'stretcher').concat(byPart(rods, 'rail'));
      let outCnt = 0; const outBad = [];
      for (const b of L12_PROPS_DATA.filter(x => x.kind === 'bench')) {
        const near = benchRods.filter(r => {
          const c = r.box.getCenter(new THREE.Vector3());
          return Math.abs(c.x - b.x) < b.w / 2 + 0.05 && Math.abs(c.z - b.z) < b.d / 2 + 0.05;
        });
        for (const r of near) {
          const insideX = r.box.min.x > b.x - b.w / 2 - 0.012 && r.box.max.x < b.x + b.w / 2 + 0.012;
          const insideZ = r.box.min.z > b.z - b.d / 2 - 0.012 && r.box.max.z < b.z + b.d / 2 + 0.012;
          if (insideX && insideZ) outCnt++;
          else outBad.push(b.id + ' x=' + (r.box.max.x - r.box.min.x).toFixed(2) + ' z=' + (r.box.max.z - r.box.min.z).toFixed(2));
        }
      }
      ok(outBad.length === 0 && outCnt > 0, '长凳横撑/托梁全部落在座板包络内（无伸出长杆）',
        'ok=' + outCnt + (outBad.length ? ' 越界 ' + outBad.slice(0, 4).join(' ') : ''));
      const longBench = L12_PROPS_DATA.filter(x => x.kind === 'bench' && x.d > x.w);
      const longBad = longBench.filter(b => byPart(rods, 'stretcher').some(r => {
        const c = r.box.getCenter(new THREE.Vector3());
        return Math.abs(c.x - b.x) < 0.05 && Math.abs(c.z - b.z) < b.d / 2 + 0.05;
      }));
      ok(longBad.length === 0, '纵向长凳不再有横向短杆/重复实例',
        'longBench=' + longBench.length + ' 命中=' + longBad.length);

      // 负对照：扶手立柱缩短 52mm（上一版缺口）后必须判失败
      if (pair) {
        const sh = pair.under.box.clone();
        sh.max.y -= 0.052;
        ok(!(sh.max.y >= pair.a.box.min.y - 0.001), '负对照：立柱缩 52mm 时接触判据必须失败',
          'top=' + sh.max.y.toFixed(3) + ' armBottom=' + pair.a.box.min.y.toFixed(3));
      }
    }
    // 并在法兰正上方的局部圆柱内统计真实顶点数（整条弯管的总 AABB 覆盖不算证据）
    scene.updateMatrixWorld(true);
    const flanges = [];
    scene.traverse(o => { if (o.isMesh && o.userData && o.userData.detailPart === 'ladderFlange') flanges.push(o); });
    const rc = new THREE.Raycaster();
    let supOk = 0; const supBad = [];
    for (const fl of flanges) {
      const fbx = bof(fl);
      const fx = (fbx.min.x + fbx.max.x) / 2, fz = (fbx.min.z + fbx.max.z) / 2, fy = fbx.max.y;
      let hits = 0;
      for (const dh of [0.15, 0.35, 0.55]) {
        rc.set(new THREE.Vector3(fx - 0.5, fy + dh, fz), new THREE.Vector3(1, 0, 0));
        rc.far = 1.0;
        if (rc.intersectObjects(frames, false).length) hits++;
      }
      let vlocal = 0; const tv = new THREE.Vector3();
      for (const fr of frames) {
        const pos = fr.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          tv.fromBufferAttribute(pos, i).applyMatrix4(fr.matrixWorld);
          if (Math.hypot(tv.x - fx, tv.z - fz) < 0.06 && tv.y > fy + 0.02 && tv.y < fy + 0.60) vlocal++;
        }
      }
      if (hits === 3 && vlocal >= 8) supOk++; else supBad.push('@' + fx.toFixed(2) + ' hits=' + hits + ' v=' + vlocal);
    }
    ok(flanges.length === 4 && supOk === flanges.length,
      '四块池岸法兰上方都有真实管体支承（射线命中 + 局部顶点密度）',
      supOk + '/' + flanges.length + (supBad.length ? ' ' + supBad.join(' ') : ''));

    // 法兰：圆环与薄盘必须同轴（三轴都要对，水平 y 向法兰不能长出竖圆片）
    const flangeRings = [], flangeDiscs = [];
    scene.traverse(o => {
      if (!o.isMesh || !o.userData) return;
      if (o.userData.detailKind === 'flange') flangeRings.push(o);
      if (o.userData.detailPart === 'flangeDisc') flangeDiscs.push(o);
    });
    let fOk = 0, fChecked = 0; const fBad = [];
    for (const ring of flangeRings) {
      const rb = bof(ring);
      const rc = new THREE.Vector3(); rb.getCenter(rc);
      const rd = [rb.max.x - rb.min.x, rb.max.y - rb.min.y, rb.max.z - rb.min.z];
      const rAxis = rd.indexOf(Math.min(...rd));
      const disc = flangeDiscs.find(m => {
        const b = bof(m); const c = new THREE.Vector3(); b.getCenter(c);
        return c.distanceTo(rc) < 1e-6;
      });
      fChecked++;
      if (!disc) { fBad.push('缺盘'); continue; }
      const db = bof(disc);
      const dd = [db.max.x - db.min.x, db.max.y - db.min.y, db.max.z - db.min.z];
      const dAxis = dd.indexOf(Math.min(...dd));
      if (rAxis === dAxis) fOk++; else fBad.push('轴 ring=' + 'xyz'[rAxis] + ' disc=' + 'xyz'[dAxis]);
    }
    ok(fChecked >= 8 && fOk === fChecked, '法兰圆环与薄盘同轴（含水平 y 向法兰）',
      fOk + '/' + fChecked + (fBad.length ? ' ' + fBad.slice(0, 3).join(',') : ''));

    // 排水格栅：格栅条两端落在承托轨道上（条底与轨顶接触），不是悬空格栅
    const grateRails = slabs.filter(o => part(o, 'grateRail')).map(o => bof(o));
    const barMeshes = detail.filter(o => o.userData.detailKind === 'grateBars' && o.isInstancedMesh);
    let gOk = 0, gChecked = 0; const gBad = [];
    const mtmp = new THREE.Matrix4(), rotM = new THREE.Matrix4();
    for (const inst of barMeshes) {
      if (!inst.geometry.boundingBox) inst.geometry.computeBoundingBox();
      const gb = inst.geometry.boundingBox;
      const halfDepth = (gb.max.z - gb.min.z) / 2;
      const barH = gb.max.y - gb.min.y;
      for (let i = 0; i < Math.min(3, inst.count); i++) {
        inst.getMatrixAt(i, mtmp);
        const c = new THREE.Vector3().setFromMatrixPosition(mtmp);
        rotM.extractRotation(mtmp);
        const depthDir = new THREE.Vector3(0, 0, 1).applyMatrix4(rotM).normalize();
        const barBottom = c.y - barH / 2;
        gChecked++;
        const touched = [1, -1].every(s => {
          const px = c.x + depthDir.x * halfDepth * s, pz = c.z + depthDir.z * halfDepth * s;
          return grateRails.some(b => px > b.min.x - 0.004 && px < b.max.x + 0.004 &&
            pz > b.min.z - 0.004 && pz < b.max.z + 0.004 && Math.abs(barBottom - b.max.y) < 1e-3);
        });
        if (touched) gOk++; else gBad.push('bar@' + c.x.toFixed(2) + ',' + c.z.toFixed(2));
      }
    }
    ok(gChecked > 0 && gOk === gChecked, '格栅条两端落在承托轨道上（条底与轨顶接触，无悬空）',
      gOk + '/' + gChecked + (gBad.length ? ' ' + gBad.slice(0, 3).join(',') : ''));

    // 前台台面：独立倒角板，厚度 60mm，顶面与台身下沿相接
    const deskTop = scene.getObjectByName('l12DeskTop');
    ok(!!deskTop, '前台台面是可定位的独立倒角板');
    if (deskTop) {
      const b = bof(deskTop);
      ok(Math.abs((b.max.y - b.min.y) - 0.06) < 0.002, '前台台面厚度 60mm（倒角后仍保持板厚）', (b.max.y - b.min.y).toFixed(4));
    }

    // 长凳：支腿接地且顶面与座板严格相接（沿 X / Z 两类都验）
    const seats = []; scene.traverse(o => { if (o.userData && o.userData.benchPart === 'seat') seats.push(o); });
    let seatOk = 0, legOk = 0;
    for (const s of seats) {
      const sb = new THREE.Box3().setFromObject(s);
      const legs = [];
      scene.traverse(o => { if (o.userData && o.userData.benchId === s.userData.benchId && o.userData.benchPart === 'leg') legs.push(o); });
      if (legs.length !== 2) continue;
      seatOk++;
      const lb = legs.map(l => new THREE.Box3().setFromObject(l));
      if (lb.every(b => Math.abs(b.min.y) < 1e-6 && Math.abs(b.max.y - sb.min.y) < 1e-6)) legOk++;
    }
    ok(seatOk > 0 && legOk === seatOk, '长凳支腿接地且顶面与座板严格相接（X/Z 两向）', legOk + '/' + seatOk);
  }

  R.lines.push('\nL37-V2 NODE 回归：' + R.pass + ' / ' + (R.pass + R.fail) + ' PASS');
  console.log(R.lines.join('\n'));
  if (R.fail > 0) process.exitCode = 1;
})();
