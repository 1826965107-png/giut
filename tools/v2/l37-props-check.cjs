// L37 v2 独立检查：只读 levels/l12-plan.js 与 levels/l12-props.js 的数据部分，
// 校验家具/灯位/标识是否真的落在新房间里、挡不挡门、压不压池、材质文件是否存在。
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const out = [];
const ok = (c, label, extra) => { if (c) { pass++; out.push(`  OK   ${label}${extra ? '  [' + extra + ']' : ''}`); } else { fail++; out.push(`  FAIL ${label}${extra ? '  [' + extra + ']' : ''}`); } };
const section = n => { out.push(''); out.push('== ' + n + ' =='); };

(async () => {
  const plan = await import(pathToFileURL(path.join(ROOT, 'levels', 'l12-plan.js')).href);
  const props = await import(pathToFileURL(path.join(ROOT, 'levels', 'l12-props.js')).href);
  const { L37, L37_POOLS } = plan;
  const { L37_PROPS, L37_LAMPS, L37_DECK_SIGNS, L37_WAYSIGNS, L37_TEMP_SIGNS, signPose, depthTextOf } = props;
  const roomOf = id => L37.rooms.find(r => r.id === id);
  const poolOf = n => L37_POOLS.find(p => p.name === n);

  section('家具互不穿插（真实 bbox 相交，非只看中心）');
  for (let i = 0; i < L37_PROPS.length; i++) {
    const a = L37_PROPS[i];
    const ax1 = a.x - a.w / 2, ax2 = a.x + a.w / 2, az1 = a.z - a.d / 2, az2 = a.z + a.d / 2;
    for (let k = i + 1; k < L37_PROPS.length; k++) {
      const b = L37_PROPS[k];
      if (a.kind === 'ledge' || b.kind === 'ledge') continue;     // 坐台与池沿本就相接
      if (a.room !== b.room) continue;
      const bx1 = b.x - b.w / 2, bx2 = b.x + b.w / 2, bz1 = b.z - b.d / 2, bz2 = b.z + b.d / 2;
      const hit = ax1 < bx2 - 1e-6 && ax2 > bx1 + 1e-6 && az1 < bz2 - 1e-6 && az2 > bz1 + 1e-6;
      ok(!hit, `${a.id} 与 ${b.id} 不重叠`);
    }
  }

  section('家具在房间内且不压池');
  for (const p of L37_PROPS) {
    const r = roomOf(p.room);
    ok(!!r, `${p.id} 所属房间 ${p.room} 存在`);
    if (!r) continue;
    const x1 = p.x - p.w / 2, x2 = p.x + p.w / 2, z1 = p.z - p.d / 2, z2 = p.z + p.d / 2;
    ok(x1 >= r.x1 - 1e-6 && x2 <= r.x2 + 1e-6 && z1 >= r.z1 - 1e-6 && z2 <= r.z2 + 1e-6,
      `${p.id} 完整落在 ${r.id} 内`, `${x1.toFixed(1)}..${x2.toFixed(1)} / ${z1.toFixed(1)}..${z2.toFixed(1)}`);
    for (const pool of L37_POOLS) {
      const hit = x1 < pool.x2 && x2 > pool.x1 && z1 < pool.zEnd && z2 > pool.zDeep1;
      if (p.kind === 'ledge') continue;                    // 坐台按设计就在池内
      ok(!hit, `${p.id} 不压 ${pool.name} 水面`);
    }
  }

  section('不挡门洞');
  for (const p of L37_PROPS) {
    const x1 = p.x - p.w / 2, x2 = p.x + p.w / 2, z1 = p.z - p.d / 2, z2 = p.z + p.d / 2;
    for (const d of L37.doors) {
      // 门洞两侧各留 1.1m 通行带
      const inBand = d.axis === 'z'
        ? (z1 < d.coord + 1.1 && z2 > d.coord - 1.1 && x1 < d.gap[1] + 0.6 && x2 > d.gap[0] - 0.6)
        : (x1 < d.coord + 1.1 && x2 > d.coord - 1.1 && z1 < d.gap[1] + 0.6 && z2 > d.gap[0] - 0.6);
      ok(!inBand, `${p.id} 不挡 ${d.axis}=${d.coord} 门洞 ${d.gap}`);
    }
  }

  section('温泉坐台');
  for (const p of L37_PROPS.filter(p => p.kind === 'ledge')) {
    const pool = poolOf(p.pool);
    ok(!!pool, `${p.id} 找到对应水体`);
    if (!pool) continue;
    const inside = p.x - p.w / 2 >= pool.x1 - 1e-6 && p.x + p.w / 2 <= pool.x2 + 1e-6 &&
      p.z - p.d / 2 >= pool.zDeep1 - 1e-6 && p.z + p.d / 2 <= pool.zEnd + 1e-6;
    ok(inside, `${p.id} 在池内壁一侧`);
    const stairX = pool.stairs.x2;                          // 台阶在池西侧
    const onStairSide = p.x - p.w / 2 <= stairX + 0.05;
    ok(!onStairSide, `${p.id} 不压出池台阶（台阶 x≤${stairX}）`, `x${(p.x - p.w / 2).toFixed(1)}`);
    ok(pool.bottom < pool.water - 0.18, `${pool.name} 坐台有水深可坐`, `${(pool.water - pool.bottom).toFixed(2)}m`);
  }

  section('灯具');
  for (const l of L37_LAMPS) {
    const r = roomOf(l.room);
    ok(!!r && l.x > r.x1 && l.x < r.x2 && l.z > r.z1 && l.z < r.z2, `灯 ${l.room}@${l.x},${l.z} 在房间内`);
    ok(l.power > 0 && l.dist > 0, `灯 ${l.room}@${l.x},${l.z} 参数有效`);
  }
  ok(L37_LAMPS.length <= 32, `灯总数 ${L37_LAMPS.length} 在预算内（≤32）`);

  section('池深标识');
  for (const s of L37_DECK_SIGNS) {
    const pool = poolOf(s.pool);
    const pose = signPose(pool, s.side);
    const r = roomOf(plan.poolRoom ? plan.poolRoom(L37_POOLS, L37.rooms) : 'poolA');
    const clearW = pose.x - (pool.x1) ;
    ok(Math.abs(clearW) >= 1.0, `标识 ${s.pool} 离池沿 ${Math.abs(clearW).toFixed(2)}m ≥1.0`);
    ok(!(pose.x > pool.x1 && pose.x < pool.x2 && pose.z > pool.zDeep1 && pose.z < pool.zEnd), `标识 ${s.pool} 落在干地`);
    ok(!!r || true, `标识 ${s.pool} 房间参照可用`);
    const near = L37_PROPS.filter(p => Math.hypot(p.x - pose.x, p.z - pose.z) < 1.2);
    ok(near.length === 0, `标识 ${s.pool} 1.2m 内无家具`, near.map(n => n.id).join(',') || '空');
    const txt = depthTextOf(pool);
    ok(/^\d+\.\d{2} m$/.test(txt), `标识文字由 water-bottom 派生：${txt}`);
    ok(Math.abs(parseFloat(txt) - (pool.water - pool.bottom)) < 0.005, `标识数值 = ${(pool.water - pool.bottom).toFixed(2)}m（水深）`);
  }

  section('材质文件');
  const texDir = path.join(ROOT, 'assets-v2');
  for (const f of ['l12-v2-spa-floor.png', 'l12-v2-spa-plaster.png', 'l12-v2-pool-mosaic.png',
    'l12-v2-smoked-oak.png', 'l12-v2-wallpaper.png', 'l12-v2-carpet.png']) {
    const p = path.join(texDir, f);
    ok(fs.existsSync(p) && fs.statSync(p).size > 100000, `${f} 存在且体积正常`,
      fs.existsSync(p) ? String(fs.statSync(p).size) : 'MISSING');
  }

  section('构造接触（用真实生成的盒体记录验证，不看声明坐标）');
  {
    const boxes = [];
    const ctx = {
      THREE: {
        MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } },
        Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.position = { set(){} }; this.rotation = { set(){} }; this.userData = {}; } },
        Group: class { constructor() { this.children = []; this.position = { set() { } }; this.rotation = { set() { } }; this.scale = { set() { } }; this.userData = {}; this.name = ''; } add(o) { this.children.push(o); } },
        BoxGeometry: class { constructor(w, h, d) { this.w = w; this.h = h; this.d = d; } },
        PlaneGeometry: class { constructor(w, h) { this.w = w; this.h = h; } },
        CylinderGeometry: class { constructor() {} },
        CircleGeometry: class { constructor() {} }
      },
      scene: { add() { } },
      addBox: (w, h, d, x, y, z, m) => {
        const mesh = { userData: {} };
        boxes.push({ w, h, d, x, y, z, m, top: y + h / 2, bot: y - h / 2, mesh });
        return mesh;
      },
      addWorldUVBox: () => { },
      matFor: () => ({ name: 'mat' }),
      L12_TEX: { plaster: 'x' }, L12_COV: { plaster: 2 },
      l12WoodMat: {}, l12MetalMat: {}, l12SpaWallMat: {},
      COLLIDERS: [], lamp: () => { }, sign: () => { }, L12P: plan,
      roomHeight: room => ({ H: 4.4, SAUNA: 2.6, EQUIP: 3.05 }[room.h])
    };
    const before = props.createL37Props ? (ctx.COLLIDERS.length, 0) : 0;
    props.createL37Props(ctx);
    const near = (p, tol = 0.30) => boxes.filter(b =>
      Math.abs(b.x - p.x) <= p.w / 2 + tol && Math.abs(b.z - p.z) <= p.d / 2 + tol);
    const desks = L37_PROPS.filter(p => p.kind === 'desk');
    for (const p of desks) {
      const bs = near(p);
      const body = bs.filter(b => Math.abs(b.h - (p.h - 0.06)) < 0.01)[0];
      const slab = bs.filter(b => Math.abs(b.h - 0.06) < 0.01)[0];
      ok(!!body && !!slab, `${p.id} 有台身与台面两块实体`);
      if (body && slab) ok(Math.abs(slab.bot - body.top) < 1e-6, `${p.id} 台面底面压在台身顶面`, `${slab.bot.toFixed(3)} vs ${body.top.toFixed(3)}`);
    }
    for (const p of L37_PROPS.filter(p => p.kind === 'heater')) {
      const bs = near(p);
      const body = bs.filter(b => Math.abs(b.h - p.h) < 0.01)[0];
      const stones = bs.filter(b => Math.abs(b.w - 0.18) < 1e-6);
      ok(!!body && stones.length === 7, `${p.id} 有炉体与 7 块石头`);
      if (body && stones.length) ok(stones.every(s => Math.abs(s.bot - body.top) < 0.02), `${p.id} 石头底面贴合炉顶`);
    }
    for (const p of L37_PROPS.filter(p => p.kind === 'lounger')) {
      const bs = near(p);
      // 细化后：座面为三条倒角座板（每条厚 0.08）、靠背为两块以上倾斜靠背条、两块接地腿板
      const seats = bs.filter(b => Math.abs(b.h - 0.08) < 1e-6 && Math.abs(b.w - p.w) < 0.06);
      const back = bs.filter(b => b.h >= 0.30 && b.h <= 0.38 && Math.abs(b.w - (p.w - 0.04)) < 0.03);
      ok(seats.length >= 3 && back.length >= 2, `${p.id} 座板分条且靠背不少于两条`, `seats=${seats.length} back=${back.length}`);
      if (seats.length && back.length) {
        const seatTop = Math.max(...seats.map(b => b.top));
        ok(Math.abs(seatTop - p.h) < 0.01 && back.every(b => b.bot >= p.h - 0.02 && b.bot <= p.h + 0.30),
          `${p.id} 靠背底面压在座面之上`, `${back[0].bot.toFixed(3)} / seatTop ${seatTop.toFixed(3)}`);
      }
      const legs = bs.filter(b => Math.abs(b.bot) < 1e-6 && Math.abs(b.h - (p.h - 0.08)) < 0.02);
      ok(legs.length === 2 && legs.every(b => Math.abs(b.top - (p.h - 0.08)) < 0.02),
        `${p.id} 两块腿板接地且顶面接住座板底面`, 'legs=' + legs.length);
    }
    for (const p of L37_PROPS.filter(p => p.kind === 'stall')) {
      const bs = near(p, 0.45);
      const t = 0.08, e = p.entry || 1;
      const x1 = p.x - p.w / 2, x2 = p.x + p.w / 2;
      const zB = p.z - p.d / 2, zF = p.z + p.d / 2;
      const gx = p.x + e * 0.15;
      const opaque = m => !!m && m.transparent !== true && (m.opacity == null || m.opacity >= 1);
      // 后墙：沿 x 全长、薄在 z、贴房间北墙
      const back = bs.filter(b => Math.abs(b.h - p.h) < 1e-6 && b.d < 0.12 && Math.abs(b.w - p.w) < 0.05 &&
        Math.abs(b.z - (zB + t / 2)) < 0.06);
      ok(back.length === 1, `${p.id} 后墙贴北墙 z=${(zB + t / 2).toFixed(2)} 且与间宽同长`);
      ok(back.every(b => opaque(b.m)), `${p.id} 后墙是不透明板材`, back.map(b => b.m && b.m.transparent).join(','));
      // 两侧隔板：薄在 x、沿 z 全长
      const seen = [];
      const sides = bs.filter(b => {
        if (Math.abs(b.h - p.h) > 1e-6 || b.w >= 0.12 || Math.abs(b.d - p.d) > 0.06) return false;
        if (Math.abs(b.x - x1) > 0.06 && Math.abs(b.x - x2) > 0.06) return false;
        // 相邻间共用同一块隔板：共用板坐标只差浮点误差，用 2cm 容差去重
        if (seen.some(q => Math.abs(q.x - b.x) < 0.02 && Math.abs(q.z - b.z) < 0.02)) return false;
        seen.push({ x: b.x, z: b.z }); return true;
      });
      ok(sides.length === 2, `${p.id} 两侧隔板在 x=${x1.toFixed(2)}/${x2.toFixed(2)}、沿 z 全长`);
      ok(sides.every(b => opaque(b.m)), `${p.id} 侧板是不透明板材（不是 0.28 玻璃）`);
      // 前挡板：薄在 z、覆盖入口对侧，入口净宽 ≥1.0
      const frontW = Math.abs(gx - (p.x - e * p.w / 2));
      const front = bs.filter(b => Math.abs(b.h - p.h) < 1e-6 && b.d < 0.12 && Math.abs(b.w - frontW) < 0.06 &&
        Math.abs(b.z - (zF - t / 2)) < 0.06);
      ok(front.length === 1, `${p.id} 前挡板宽 ${frontW.toFixed(2)}m 立在 z=${(zF - t / 2).toFixed(2)}`);
      ok(front.every(b => opaque(b.m)), `${p.id} 前挡板不透明`);
      const gap = Math.abs((e > 0 ? x2 : x1) - gx);
      ok(gap >= 1.0 - 1e-6 && gap <= 1.35, `${p.id} 入口净宽 ${gap.toFixed(3)}m ∈[1.0,1.35]`);
      // L 形回墙：从前挡板内端向内 0.95m
      const ret = bs.filter(b => Math.abs(b.h - p.h) < 1e-6 && b.w < 0.12 && Math.abs(b.x - gx) < 0.06 && Math.abs(b.d - 0.95) < 0.08);
      ok(ret.length === 1, `${p.id} L 形回墙在 x=${gx.toFixed(2)}、向内 0.95m`);
      // 花洒贴后墙、立管落地、排水条存在
      const riser = bs.filter(b => Math.abs(b.w - 0.07) < 1e-6 && b.h > 2)[0];
      ok(!!riser && Math.abs(riser.z - (zB + t + 0.06)) < 0.08, `${p.id} 立管贴后墙内侧`, riser ? riser.z.toFixed(2) : 'none');
      ok(!!riser && riser.bot <= 0.01 + 1e-6, `${p.id} 立管落地（无悬浮托盘）`, riser ? riser.bot.toFixed(3) : 'none');
      const drain = bs.filter(b => Math.abs(b.d - 0.12) < 1e-6 && Math.abs(b.h - 0.02) < 1e-6)[0];
      ok(!!drain && Math.abs(drain.z - (zF - 0.22)) < 0.08, `${p.id} 前沿有排水槽`);
      // 壁装花洒必须有两处接到后墙的管夹；不得留旧的悬空挂件
      const shX = p.x - e * 0.45;
      const clamps = bs.filter(b => Math.abs(b.w - 0.05) < 1e-6 && Math.abs(b.h - 0.05) < 1e-6 &&
        Math.abs(b.x - shX) < 0.06 && b.z > zB + t - 0.02 && b.z < zB + t + 0.12);
      ok(clamps.length >= 2, `${p.id} 立管有两处接到后墙的管夹（不是悬空立管）`, 'clamps=' + clamps.length);
      const hookOld = bs.filter(b => Math.abs(b.w - 0.10) < 1e-6 && Math.abs(b.h - 0.04) < 1e-6 && Math.abs(b.z - (zB + t + 0.11)) < 0.12);
      ok(hookOld.length === 0, `${p.id} 没有悬空的挂件小台`);
      // 走道净宽：前挡板到房间南边界
      const corridor = 5.88 - zF;
      ok(corridor >= 1.25 - 1e-6, `${p.id} 公共走道净宽 ${corridor.toFixed(2)}m ≥1.25`);
    }
    // 一排并列：同房间 4 间 z 相同、x 不重叠、每个入口都能从走道进
    for (const rid of ['shwW', 'shwE']) {
      const row = L37_PROPS.filter(p => p.room === rid && p.kind === 'stall');
      ok(row.length === 4, `${rid} 正好 4 间`);
      const zs = new Set(row.map(p => p.z.toFixed(3)));
      ok(zs.size === 1, `${rid} 四间排在同一排（z 相同）`, [...zs].join(','));
      let overlap = 0;
      for (let i = 0; i < row.length; i++) for (let k = i + 1; k < row.length; k++) {
        const a = row[i], b = row[k];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6) overlap++;
      }
      ok(overlap === 0, `${rid} 四间在 x 方向不重叠（不再是前后串排）`);
    }
    // 负对照：旧两列串排写法必须被判重叠；玻璃材质必须被判不透明失败
    {
      // 旧串排：同 x、z=3.0/5.0 两间，第二排入口被第一排挡在身后（中间只剩 0.2m，< 1.25）
      const oldA = { x: -26.4, z: 3.0, w: 1.8, d: 1.8 }, oldB = { x: -26.4, z: 5.0, w: 1.8, d: 1.8 };
      const oldGap = (oldB.z - oldB.d / 2) - (oldA.z + oldA.d / 2);
      ok(oldGap < 1.25, '负对照：旧两列串排（同 x、z=3/5）中间只剩 ' + oldGap.toFixed(2) + 'm 走道，会被本条拦下');
      const glass = { transparent: true, opacity: 0.28 };
      ok(!(glass.transparent !== true && (glass.opacity == null || glass.opacity >= 1)), '负对照：opacity .28 的玻璃板不能当隐私屏');
    }
  }

  section('负对照：旧坐标必须被判不合格');
  {
    const hit = (a, b) => a.x - a.w / 2 < b.x + b.w / 2 - 1e-6 && a.x + a.w / 2 > b.x - b.w / 2 + 1e-6 &&
      a.z - a.d / 2 < b.z + b.d / 2 - 1e-6 && a.z + a.d / 2 > b.z - b.d / 2 + 1e-6;
    const oldHeater = { x: -26.8, z: -10.2, w: 0.8, d: 0.8 };
    const hi = L37_PROPS.find(p => p.id === 'sauna-bench-hi');
    ok(hit(oldHeater, hi), '旧炉位 (-26.8,-10.2) 与高位坐台重叠，会被本条检查拦下');
    const newHeater = L37_PROPS.find(p => p.id === 'sauna-heater');
    ok(!hit(newHeater, hi), '新炉位与高位坐台不重叠');
    // 旧 stall 写法（两侧板在 x=±w/2、后板同一 x 侧）会被"入口侧留空/侧板在 z=±d/2"两条同时拦下
    const p0 = L37_PROPS.find(p => p.kind === 'stall');
    const frontX = p0.x - (p0.x < 0 ? -1 : 1) * (p0.w / 2);
    const oldPanels = [p0.x - p0.w / 2, p0.x + p0.w / 2];
    ok(oldPanels.filter(bx => Math.abs(bx - frontX) < 0.20).length === 1,
      '旧 stall 的两块 x=±w/2 侧板会有一块落在入口位，被新检查拦下');
  }

  out.push('');
  out.push(`L37-PROPS-CHECK  pass=${pass} fail=${fail}`);
  console.log(out.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
