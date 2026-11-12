export const L37_PROPS = [
  // —— 接待：值班前台 + 候客长椅 + 旧导览牌（形成视线转折）——
  { id: 'desk-lobby', kind: 'desk', room: 'lobby', x: -4.2, z: 21.4, w: 3.6, d: 0.8, h: 1.02, rot: 0 },
  { id: 'bench-lobby-a', kind: 'bench', room: 'lobby', x: 5.6, z: 20.4, w: 2.4, d: 0.56, h: 0.44, rot: 0 },
  { id: 'bench-lobby-b', kind: 'bench', room: 'lobby', x: 5.6, z: 18.4, w: 2.4, d: 0.56, h: 0.44, rot: 0 },
    // —— 脱鞋储物：矮凳两排 ——
  { id: 'shoe-bench-a', kind: 'bench', room: 'shoe', x: -3.0, z: 13.4, w: 1.8, d: 0.5, h: 0.42, rot: 0 },
  { id: 'shoe-bench-b', kind: 'bench', room: 'shoe', x: 3.0, z: 13.4, w: 1.8, d: 0.5, h: 0.42, rot: 0 },
  // —— 两组更衣：柜岛（沿南北向，背面相对）+ 两条长凳 ——
  { id: 'lockW-island-a', kind: 'locker', room: 'lockW', x: -17.0, z: 11.0, w: 0.9, d: 4.4, h: 1.95, rot: 0 },
  { id: 'lockW-island-b', kind: 'locker', room: 'lockW', x: -15.2, z: 11.0, w: 0.9, d: 4.4, h: 1.95, rot: 0 },
  { id: 'lockW-bench', kind: 'bench', room: 'lockW', x: -19.6, z: 11.0, w: 0.6, d: 3.6, h: 0.44, rot: 0 },
  { id: 'lockE-island-a', kind: 'locker', room: 'lockE', x: 15.2, z: 11.0, w: 0.9, d: 4.4, h: 1.95, rot: 0 },
  { id: 'lockE-island-b', kind: 'locker', room: 'lockE', x: 17.0, z: 11.0, w: 0.9, d: 4.4, h: 1.95, rot: 0 },
  { id: 'lockE-bench', kind: 'bench', room: 'lockE', x: 19.6, z: 11.0, w: 0.6, d: 3.6, h: 0.44, rot: 0 },
  // —— 两组淋浴：隔板 + 花洒贴墙（西侧贴 x=-28 内表面，东侧贴 x=28）——
  { id: 'shwW-stall-1', kind: 'stall', room: 'shwW', x: -26.3, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: 1 },
  { id: 'shwW-stall-2', kind: 'stall', room: 'shwW', x: -23.65, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: 1 },
  { id: 'shwW-stall-3', kind: 'stall', room: 'shwW', x: -21, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: 1 },
  { id: 'shwW-stall-4', kind: 'stall', room: 'shwW', x: -18.35, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: 1 },
  { id: 'shwE-stall-1', kind: 'stall', room: 'shwE', x: 26.3, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: -1 },
  { id: 'shwE-stall-2', kind: 'stall', room: 'shwE', x: 23.65, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: -1 },
  { id: 'shwE-stall-3', kind: 'stall', room: 'shwE', x: 21, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: -1 },
  { id: 'shwE-stall-4', kind: 'stall', room: 'shwE', x: 18.35, z: 3.34, w: 2.65, d: 2.40, h: 2.1, entry: -1 },
  // —— 桑拿：两级坐台沿西墙，面向室内；炉体靠北墙 ——
  { id: 'sauna-bench-hi', kind: 'saunaBench', room: 'sauna', x: -26.6, z: -8.0, w: 2.2, d: 6.0, h: 0.98, rot: 0 },
  { id: 'sauna-bench-lo', kind: 'saunaBench', room: 'sauna', x: -25.0, z: -8.0, w: 1.0, d: 6.0, h: 0.58, rot: 0 },
  { id: 'sauna-heater', kind: 'heater', room: 'sauna', x: -23.1, z: -11.0, w: 0.8, d: 0.8, h: 0.9, rot: 0 },
  // —— 温泉：坐台沿池内侧非台阶边，面向水面（北、东侧），不压出池台阶 ——
  { id: 'spa-lounger-a', kind: 'lounger', room: 'spaA', x: -8.0, z: -26.0, w: 0.8, d: 2.0, h: 0.42, rot: 0 },
  { id: 'spa-lounger-b', kind: 'lounger', room: 'spaA', x: -6.4, z: -26.0, w: 0.8, d: 2.0, h: 0.42, rot: 0 },
  { id: 'spa-lounger-c', kind: 'lounger', room: 'spaA', x: -4.8, z: -26.0, w: 0.8, d: 2.0, h: 0.42, rot: 0 },
  // —— 北静休廊：长椅靠南墙、面向温泉/泳池 ——
  { id: 'rest-bench-a', kind: 'bench', room: 'restLink', x: -22.5, z: -28.9, w: 3.0, d: 0.6, h: 0.44, rot: 0 },
  { id: 'rest-bench-b', kind: 'bench', room: 'restLink', x: -6.0, z: -28.9, w: 3.0, d: 0.6, h: 0.44, rot: 0 },
  { id: 'rest-bench-c', kind: 'bench', room: 'restLink', x: 8.0, z: -28.9, w: 3.0, d: 0.6, h: 0.44, rot: 0 },
  { id: 'rest-bench-d', kind: 'bench', room: 'restLink', x: 24.0, z: -28.9, w: 3.0, d: 0.6, h: 0.44, rot: 0 },
  // —— 设备间：泵组 ×2 + 立管 + 控制柜（靠墙，不占通道）——
  { id: 'equip-pump-a', kind: 'pump', room: 'equip', x: 25.4, z: -26.2, w: 1.4, d: 1.4, h: 1.1, rot: 0 },
  { id: 'equip-pump-b', kind: 'pump', room: 'equip', x: 25.4, z: -23.6, w: 1.4, d: 1.4, h: 1.1, rot: 0 },
  { id: 'equip-panel', kind: 'cabinet', room: 'equip', x: 27.2, z: -21.2, w: 0.7, d: 2.2, h: 1.9, rot: 0 },
  // —— 泳池厅：池沿坐凳与毛巾架，避开出发台与台阶 ——
  { id: 'pool-bench-a', kind: 'bench', room: 'poolA', x: 4.4, z: -22.0, w: 0.6, d: 2.6, h: 0.44, rot: 0 },
  { id: 'pool-bench-b', kind: 'bench', room: 'poolA', x: 20.4, z: -16.0, w: 0.6, d: 2.6, h: 0.44, rot: 0 }
];

// 灯具：按房间分区布置，固定数量（不逐帧新增），全部有灯壳
export const L37_LAMPS = [
  { room: 'lobby', zone: 'entry', x: -5.0, z: 19.0, power: 2.6, dist: 9 },
  { room: 'lobby', zone: 'entry', x: 5.0, z: 19.0, power: 2.6, dist: 9 },
  { room: 'lobby', zone: 'entry', x: 0.0, z: 22.6, power: 2.2, dist: 8 },
  { room: 'shoe', zone: 'entry', x: 0.0, z: 14.0, power: 2.0, dist: 7 },
  { room: 'lockW', zone: 'locker', x: -21.0, z: 8.0, power: 2.2, dist: 9, locker: true },
  { room: 'lockW', zone: 'locker', x: -11.0, z: 13.4, power: 2.2, dist: 9, locker: true },
  { room: 'lockE', zone: 'locker', x: 11.0, z: 13.4, power: 2.2, dist: 9, locker: true },
  { room: 'lockE', zone: 'locker', x: 21.0, z: 8.0, power: 2.2, dist: 9, locker: true },
  { room: 'shwW', zone: 'shower', x: -22.0, z: 4.0, power: 1.9, dist: 7 },
  { room: 'shwE', zone: 'shower', x: 22.0, z: 4.0, power: 1.9, dist: 7 },
  { room: 'wetHall', zone: 'wet', x: 0.0, z: 4.0, power: 2.1, dist: 8 },
  { room: 'spaA', zone: 'spa', x: -20.0, z: -20.0, power: 2.4, dist: 10, color: 0xf1faff },
  { room: 'spaA', zone: 'spa', x: -9.0, z: -19.0, power: 2.2, dist: 9, color: 0xf1faff },
  { room: 'spaA', zone: 'spa', x: -24.0, z: -26.0, power: 1.8, dist: 8, color: 0xf1faff },
  { room: 'spaB', zone: 'spa', x: -16.0, z: -6.0, power: 2.0, dist: 9, color: 0xf1faff },
  { room: 'sauna', zone: 'spa', x: -25.0, z: -8.0, power: 1.5, dist: 6, color: 0xffb877 },
  { room: 'wetSpine', zone: 'wet', x: 0.0, z: -12.0, power: 2.0, dist: 9 },
  { room: 'wetSpine', zone: 'wet', x: 0.0, z: -24.0, power: 2.0, dist: 9 },
  { room: 'poolA', zone: 'pool', x: 6.4, z: -18.0, power: 2.6, dist: 11 },
  { room: 'poolA', zone: 'pool', x: 19.6, z: -18.0, power: 2.6, dist: 11 },
  { room: 'poolA', zone: 'pool', x: 6.4, z: -5.0, power: 2.6, dist: 11 },
  { room: 'poolA', zone: 'pool', x: 19.6, z: -5.0, power: 2.6, dist: 11 },
  { room: 'poolB', zone: 'pool', x: 25.0, z: -4.0, power: 2.0, dist: 8 },
  { room: 'equip', zone: 'equip', x: 25.0, z: -24.0, power: 2.0, dist: 7 },
  { room: 'restLink', zone: 'corridor', x: -16.0, z: -30.0, power: 1.7, dist: 8 },
  { room: 'restLink', zone: 'corridor', x: 0.0, z: -30.0, power: 1.7, dist: 8 },
  { room: 'restLink', zone: 'corridor', x: 16.0, z: -30.0, power: 1.7, dist: 8 }
];

// 池深标识：文字不再写死，统一从 water - bottom 派生（主池 1.72 / 温热 0.84 / 静汤 0.48 / 冷池 1.19）
export const L37_DECK_SIGNS = [
  { pool: 'pool', sub: '游泳主池 · 5 泳道', side: 'west' },
  { pool: 'hot', sub: '温热主汤池 · 39°C', side: 'west' },
  { pool: 'quiet', sub: '静汤池 · 37°C · 浅水坐台', side: 'east' },   // 东西两池间距仅 3.2m，西侧放不下 1.9m 牌面
  { pool: 'cold', sub: '冷水池 · 18°C', side: 'west' }
];
export function depthTextOf(pool) {
  return (pool.water - pool.bottom).toFixed(2) + ' m';
}

// 方向牌：真实墙面上（不入池、不压柱脚/门洞），由 createL37Props 用 canvas 文字牌生成
export const L37_WAYSIGNS = [
  { id: 'way-shoe', text: '脱鞋储物', sub: '← 更衣 A    更衣 B →', meta: '00 / SHOE STORAGE', room: 'shoe', x: 0, y: 1.70, z: 12.18, ry: 0, w: 1.25, h: 0.39 },
  { id: 'way-lockW', text: '更衣 A', sub: '更衣与储物', meta: 'A1 / CHANGING', room: 'lockW', x: -6.18, y: 1.65, z: 11.4, ry: -Math.PI / 2, w: 0.98, h: 0.31 },
  { id: 'way-lockE', text: '更衣 B', sub: '更衣与储物', meta: 'B1 / CHANGING', room: 'lockE', x: 6.18, y: 1.65, z: 11.4, ry: Math.PI / 2, w: 0.98, h: 0.31 },
  { id: 'way-shwW', text: '淋浴 A', sub: '冲洗后前往湿区', meta: 'A2 / SHOWERS', arrow: '→', room: 'shwW', x: -15.5, y: 1.65, z: 2.18, ry: 0, w: 1.02, h: 0.32 },
  { id: 'way-shwE', text: '淋浴 B', sub: '冲洗后前往湿区', meta: 'B2 / SHOWERS', arrow: '←', room: 'shwE', x: 15.5, y: 1.65, z: 2.18, ry: 0, w: 1.02, h: 0.32 },
  { id: 'way-pool', text: '游泳厅', sub: '25 m · 5 泳道', meta: '01 / SWIMMING', arrow: '↙', room: 'wetHall', x: 2.6, y: 1.70, z: 5.82, ry: Math.PI, w: 1.30, h: 0.41 },
  { id: 'way-spa', text: '温泉厅', sub: '主汤 · 静汤 · 冷池', meta: '02 / THERMAL', arrow: '↘', room: 'wetHall', x: -2.6, y: 1.70, z: 5.82, ry: Math.PI, w: 1.30, h: 0.41 },
  { id: 'way-rest', text: '北休息廊', sub: '游泳厅 · 温泉厅', meta: '03 / RELAXATION', arrow: '↔', room: 'restLink', x: 5.0, y: 1.65, z: -28.18, ry: Math.PI, w: 1.05, h: 0.33 },
  { id: 'way-equip', text: '设备间', sub: '员工专用', meta: 'S / STAFF', room: 'poolB', x: 26.65, y: 1.65, z: -19.82, ry: 0, w: 0.95, h: 0.30 }
];

// 池深标识落位：池西侧步道、与池沿/柱脚/门洞都留净距
export const L37_TEMP_SIGNS = [
  { pool: 'pool', c: 28, sub: '游泳主池', side: 'w', off: -4.4, ry: -Math.PI / 2 },
  { pool: 'hot', c: 39, sub: '温热主汤', side: 'w', off: -2.6, ry: -Math.PI / 2 },
  { pool: 'quiet', c: 37, sub: '静汤', side: 'east', off: -1.9, ry: -Math.PI / 2 },
  { pool: 'cold', c: 18, sub: '冷水池', side: 'w', off: -1.5, ry: -Math.PI / 2 }
];

export function signPose(pool, side, w) {
  // 排水槽在距池边 0.52–0.70m 处；地贴牌面中心需再让出半个牌宽 + 0.10m 净距。
  // 支持四面：西/东按 x 让位，南/北按 z 让位（牌仍横放）。
  const half = (w == null ? 1.9 : w) / 2;
  const off = 0.70 + half + 0.10;
  const cx = (pool.x1 + pool.x2) / 2, cz = (pool.zDeep1 + pool.zEnd) / 2;
  if (side === 'east') return { x: pool.x2 + off, z: cz, off };
  if (side === 'south') return { x: cx, z: pool.zEnd + off, off };
  if (side === 'north') return { x: cx, z: pool.zDeep1 - off, off };
  return { x: pool.x1 - off, z: cz, off };
}

export function createL37Props(ctx) {
  const { THREE, scene, addBox, addWorldUVBox, matFor, L12_TEX, L12_COV,
    l12WoodMat, l12MetalMat, l12SpaWallMat, COLLIDERS, lamp, sign, L12P } = ctx;
  const out = { waySigns: [], tempSigns: [], inlets: [] };
  const P = L12P.L37;
  const roomOf = id => P.rooms.find(r => r.id === id);
  const poolOf = n => L12P.L37_POOLS.find(p => p.name === n);
  const stoneMat = l12SpaWallMat;
  const waterStoneMat = l12SpaWallMat;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x8fa6a6, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.28 });

  const box = (w, h, d, x, y, z, m, cov) => addBox(w, h, d, x, y, z, m, cov);
  for (const p of L37_PROPS) {
    const r = roomOf(p.room);
    if (!r) continue;
    const baseY = 0;
    switch (p.kind) {
      case 'desk': {
        // 台身顶面 = p.h - 0.06；台面厚 0.06，中心取 p.h - 0.03，底面正好压在台身顶面上
        box(p.w, p.h - 0.06, p.d, p.x, baseY + (p.h - 0.06) / 2, p.z, l12WoodMat, 1.0);
        box(p.w + 0.1, 0.06, p.d + 0.1, p.x, baseY + p.h - 0.03, p.z, stoneMat, 1.0);
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'desk' });
        break;
      }
      case 'bench': {
        const seat = box(p.w, 0.08, p.d, p.x, baseY + p.h, p.z, l12WoodMat, 1.0);
        seat.userData.benchId = p.id;
        seat.userData.benchPart = 'seat';
        const alongX = p.w >= p.d;
        const span = alongX ? p.w : p.d;
        const legHeight = p.h - 0.04;
        for (const end of [-1, 1]) {
          const offset = end * (span / 2 - 0.18);
          const leg = box(alongX ? 0.10 : p.w * 0.8, legHeight, alongX ? p.d * 0.8 : 0.10,
            p.x + (alongX ? offset : 0), baseY + legHeight / 2,
            p.z + (alongX ? 0 : offset), l12MetalMat);
          leg.userData.benchId = p.id;
          leg.userData.benchPart = 'leg';
        }
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h + 0.04, kind: 'bench' });
        break;
      }
      case 'locker': {
        box(p.w, p.h, p.d, p.x, baseY + p.h / 2, p.z, l12WoodMat, 1.0);
        for (let i = 0; i < 4; i++) {
          const dz = p.z - p.d / 2 + (i + 0.5) * (p.d / 4);
          box(0.03, 0.06, 0.12, p.x + p.w / 2 + 0.015, baseY + 1.1, dz, l12MetalMat);
        }
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'locker' });
        break;
      }
      case 'stall': {
        // 单排并列的湿区淋浴隔间：后墙贴房间北墙，入口开在南侧共享走道；
        // 入口只留一侧、前挡板 + L 形回墙把浴位挡在里侧（固定屏风，不是可交互门）。
        const t = 0.08, H = p.h;
        const e = p.entry || 1;                       // +1：入口在 +x 侧；-1：镜像
        const x1 = p.x - p.w / 2, x2 = p.x + p.w / 2;
        const zB = p.z - p.d / 2, zF = p.z + p.d / 2;  // 后墙 / 前挡板
        const gx = p.x + e * 0.15;                    // 前挡板内端 = 回墙所在 x
        // (1) 后墙：整幅贴北墙，与网格/碰撞同源
        box(p.w, H, t, p.x, baseY + H / 2, zB + t / 2, waterStoneMat, 1.0);
        COLLIDERS.push({ x1, x2, z1: zB, z2: zB + t, y1: 0, y2: H, kind: 'stall' });
        // (2) 两块侧板：沿 z 全长（相邻隔间共用同一板位）
        for (const sg of [-1, 1]) {
          const sx = p.x + sg * p.w / 2;
          box(t, H, p.d, sx, baseY + H / 2, p.z, stoneMat, 1.0);
          COLLIDERS.push({ x1: sx - t / 2, x2: sx + t / 2, z1: zB, z2: zF, y1: 0, y2: H, kind: 'stall' });
        }
        // (3) 前挡板：从入口对侧一直盖到 gx，留下 1.175m 的入口
        const fx1 = p.x - e * p.w / 2, fx2 = gx;
        const fw = Math.abs(fx2 - fx1), fc = (fx1 + fx2) / 2;
        box(fw, H, t, fc, baseY + H / 2, zF - t / 2, stoneMat, 1.0);
        COLLIDERS.push({ x1: Math.min(fx1, fx2), x2: Math.max(fx1, fx2), z1: zF - t, z2: zF, y1: 0, y2: H, kind: 'stall' });
        // (4) L 形回墙：从前挡板内端向里 0.95m，挡住走道斜视
        const rd = 0.95;
        box(t, H, rd, gx, baseY + H / 2, zF - rd / 2, stoneMat, 1.0);
        COLLIDERS.push({ x1: gx - t / 2, x2: gx + t / 2, z1: zF - rd, z2: zF, y1: 0, y2: H, kind: 'stall' });
        // (5) 地面连续（不抬高浅盘），只在前沿做一条窄排水槽
        box(p.w - 2 * t, 0.02, 0.12, p.x, baseY + 0.01, zF - 0.22, l12MetalMat, 1.0);
        // (6) 花洒贴后墙，位于回墙遮住的内侧；立管落地、横臂朝 +z、末端花洒头 + 阀门
        const shX = p.x - e * 0.45;
        const rz = zB + t + 0.06;
        box(0.07, 2.09, 0.07, shX, baseY + 2.09 / 2, rz, l12MetalMat);
        box(0.06, 0.06, 0.34, shX, baseY + 2.10, rz + 0.17, l12MetalMat);
        box(0.20, 0.05, 0.20, shX, baseY + 2.07, rz + 0.34, l12MetalMat);
        box(0.10, 0.08, 0.10, shX, baseY + 1.15, rz + 0.05, l12MetalMat);
        // (7) 壁装花洒的两处管夹：从后墙内表面接到立管，确保不是悬空立管
        for (const cy of [1.05, 1.92]) box(0.05, 0.05, t + 0.06, shX, baseY + cy, zB + t + 0.03, l12MetalMat);
        break;
      }
      case 'saunaBench': {
        box(p.w, 0.10, p.d, p.x, baseY + p.h, p.z, l12WoodMat, 1.0);
        for (const dz of [-p.d / 2 + 0.2, p.d / 2 - 0.2]) box(p.w, p.h, 0.10, p.x, baseY + p.h / 2, p.z + dz, l12WoodMat, 1.0);
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'bench' });
        break;
      }
      case 'heater': {
        box(p.w, p.h, p.d, p.x, baseY + p.h / 2, p.z, l12MetalMat);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          box(0.18, 0.18, 0.18, p.x + Math.cos(a) * 0.22, baseY + p.h + 0.09, p.z + Math.sin(a) * 0.22, stoneMat, 1.0);
        }
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'heater' });
        break;
      }
      case 'ledge': {   // 已废弃：坐台统一由 l12-plan 的 p.benches + buildPool 生成，这里不再造盒体
      break;
    }
    case 'ledge-unused': {
        // 池内坐台：贴水面下 2cm，沿池内壁（非台阶侧），面朝水面
        const pool = poolOf(p.pool);
        const y = pool.water - 0.16;
        box(p.w, 0.3, p.d, p.x, y - 0.15, p.z, waterStoneMat, 1.0);
        box(p.w, 0.06, p.d - 0.06, p.x, y + 0.02, p.z, waterStoneMat, 1.0);
        break;
      }
      case 'lounger': {
        // 座面 top = p.h；靠背底面压在座面上（中心 p.h+0.17、高 0.40 → 底面 p.h-0.03），两侧框与座面同高接触
        box(p.w, 0.08, p.d, p.x, baseY + p.h - 0.04, p.z, l12WoodMat, 1.0);
        box(p.w, 0.40, 0.07, p.x, baseY + p.h + 0.17, p.z - p.d / 2 + 0.10, l12WoodMat, 1.0);
        for (let i = 1; i <= 2; i++) {
          box(p.w, 0.07, 0.30, p.x, baseY + p.h + 0.06 + i * 0.13, p.z - p.d / 2 + 0.10 + i * 0.10, l12WoodMat, 1.0);
        }
        for (const sx of [-1, 1]) box(0.07, 0.40, 0.40, p.x + sx * (p.w / 2 - 0.05), baseY + p.h + 0.14, p.z - p.d / 2 + 0.24, l12MetalMat);
        for (const dz of [-p.d / 2 + 0.15, p.d / 2 - 0.15]) box(p.w - 0.1, p.h, 0.08, p.x, baseY + p.h / 2, p.z + dz, l12MetalMat);
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'lounger' });
        break;
      }
      case 'pump': {
        box(p.w, 0.3, p.d, p.x, baseY + 0.15, p.z, l12MetalMat);
        box(p.w * 0.7, 0.7, p.d * 0.7, p.x, baseY + 0.65, p.z, l12MetalMat);
        box(0.12, 1.6, 0.12, p.x - p.w / 2 + 0.1, baseY + 1.2, p.z, l12MetalMat);
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'pump' });
        break;
      }
      case 'cabinet': {
        box(p.w, p.h, p.d, p.x, baseY + p.h / 2, p.z, l12MetalMat);
        COLLIDERS.push({ x1: p.x - p.w / 2, x2: p.x + p.w / 2, z1: p.z - p.d / 2, z2: p.z + p.d / 2, y1: 0, y2: p.h, kind: 'cabinet' });
        break;
      }
      case 'panel': {
        box(p.w, p.h, 0.06, p.x, baseY + 1.55, p.z, l12WoodMat, 1.0);
        break;
      }
      default: break;
    }
  }
  // 灯：全部经 host 的 l37Lamp（有灯壳、登记 poolLights，供停电循环用）
  for (const l of L37_LAMPS) {
    const room = roomOf(l.room);
    const ceilingY = ctx.roomHeight(room);
    const y = ceilingY - 0.16;
    lamp(l.x, l.z, l.zone, { power: l.power, dist: l.dist, color: l.color, y, ceilingY, locker: l.locker });
  }
  // 池深标识：文字由 water - bottom 派生（不写死），落位在池西侧步道，避开柱脚与门洞
  for (const s of L37_DECK_SIGNS) {
    const pool = poolOf(s.pool);
    const pose = signPose(pool, s.side, 1.05);
    sign(depthTextOf(pool), s.sub, pose.x, pose.z, 0, 1.05, 0.56);
  }

  // 方向牌：薄金属背板与瓷白哑光面板，主名称、区域编号和箭头分层排版。
  for (const w of L37_WAYSIGNS) {
    if (!ctx.boardTexture) break;
    const tex = ctx.boardTexture(w.text, [w.sub], { px: 1024, py: 320, meta: w.meta, arrow: w.arrow,
      variant: w.room === 'wetHall' ? 'direction' : 'room' });
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(w.w + 0.025, w.h + 0.025, 0.05), l12MetalMat);
    back.position.z = -0.03; g.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94, metalness: 0, envMapIntensity: 0.1 }));
    face.position.z = 0.002; g.add(face);
    g.position.set(w.x, w.y, w.z); g.rotation.y = w.ry;
    scene.add(g);
    out.waySigns.push({ id: w.id, x: w.x, y: w.y, z: w.z, ry: w.ry, w: w.w, h: w.h, mesh: g });
  }

  // 水温牌：立在池边步道的小立柱牌（真实几何 + 可读数字），只作示意，不做温度伤害
  for (const t of L37_TEMP_SIGNS) {
    const pool = poolOf(t.pool);
    if (!pool || !ctx.boardTexture) continue;
    const pose = signPose(pool, t.side, 0.5);
    // 与池深标识错开 1.5m，避免两块牌互相遮挡
    const px = pose.x + (t.side === 'w' ? -0.1 : 0.1), pz = pose.z + (t.off || 0);
    if (L37_PROPS.some(q => Math.abs(q.x - px) < 0.5 + (q.w || 0) / 2 && Math.abs(q.z - pz) < 0.5 + (q.d || 0) / 2)) continue;
    addBox(0.06, 0.92, 0.06, px, 0.46, pz, l12MetalMat, 1.0);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04), l12MetalMat);
    const ry = t.side === 'east' ? Math.PI / 2 : -Math.PI / 2;
    plate.position.set(px, 0.92, pz); plate.rotation.y = ry; scene.add(plate);
    const tex = ctx.boardTexture(`${t.c}°C`, [t.sub], { px: 512, py: 320, meta: 'WATER TEMPERATURE' });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.26),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94, metalness: 0, envMapIntensity: 0.1 }));
    face.position.set(px + Math.sin(ry) * 0.023, 0.92, pz + Math.cos(ry) * 0.023); face.rotation.y = ry;
    scene.add(face);
    COLLIDERS.push({ x1: px - 0.05, x2: px + 0.05, z1: pz - 0.05, z2: pz + 0.05, y1: 0, y2: 0.98, kind: 'tempSign' });
    out.tempSigns.push({ pool: t.pool, c: t.c, x: px, z: pz, mesh: face });
  }

  // 池壁回水口：每池 4 片（东西长边 + 南北短边），法线朝池内、完整落在对应池壁内、水下
  for (const pp of L12P.L37_POOLS) {
    const yy = pp.water - 0.18;
    const zc = (pp.zDeep1 + pp.zEnd) / 2, xc = (pp.x1 + pp.x2) / 2;
    const st = pp.stairs || null;
    const blockedByStair = u => !!(st && u > st.x1 - 0.35 && u < st.x2 + 0.35);
    const benchAt = (x, z) => (pp.benches || []).some(b => x > b.x1 - 0.3 && x < b.x2 + 0.3 && z > b.z1 - 0.3 && z < b.z2 + 0.3);
    const slideX = blockedByStair(xc) ? (st.x2 + (pp.x2 - st.x2) / 2) : xc;
    // 台阶在 z 方向也占一段：东西壁的格栅要避开它，否则会与台阶实体相交
    const stairZ = st ? [Math.min(...st.steps.map(s => s.z1)), Math.max(...st.steps.map(s => s.z2))] : null;
    const clampZ = z => Math.max(pp.zDeep1 + 0.45, Math.min(pp.zEnd - 0.45, z));
    let slideZ = zc;
    if (stairZ && zc > stairZ[0] - 0.25 && zc < stairZ[1] + 0.25) {
      slideZ = clampZ(stairZ[0] > (pp.zDeep1 + pp.zEnd) / 2 ? (pp.zDeep1 + stairZ[0]) / 2 : (stairZ[1] + pp.zEnd) / 2);
    }
    const faces = [
      { x: pp.x1 + 0.02, z: slideZ, ry: Math.PI / 2 },   // 西壁，法线 +X
      { x: pp.x2 - 0.02, z: slideZ, ry: -Math.PI / 2 },  // 东壁，法线 -X
      { x: slideX, z: pp.zDeep1 + 0.02, ry: 0 },       // 北壁，法线 +Z
      { x: slideX, z: pp.zEnd - 0.02, ry: Math.PI },   // 南壁，法线 -Z
    ];
    const extra = [];
    for (const c of faces) {
      if (benchAt(c.x, c.z)) {
        // 坐台占用了这一面：改到同池长墙上补一片（仍在水下、避开坐台与台阶）
        const halfZ = (pp.zEnd - pp.zDeep1) / 2;
        const dz = Math.min(1.6, Math.max(0.8, halfZ - 0.6));
        const hitStair = z => !!(stairZ && z > stairZ[0] - 0.3 && z < stairZ[1] + 0.3);
        const zA = clampZ(zc + dz), zB = clampZ(zc - dz);
        extra.push({ x: pp.x1 + 0.02, z: hitStair(zA) ? zB : zA, ry: Math.PI / 2 });
        continue;
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.24), l12MetalMat);
      m.position.set(c.x, yy, c.z);
      m.rotation.set(0, c.ry, 0);
      m.userData.inlet = pp.name;
      scene.add(m);
      out.inlets.push({ pool: pp.name, x: c.x, y: yy, z: c.z, ry: c.ry, mesh: m });
    }
    for (const c of extra) {
      if (benchAt(c.x, c.z)) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.24), l12MetalMat);
      m.position.set(c.x, yy, c.z);
      m.rotation.set(0, c.ry, 0);
      m.userData.inlet = pp.name;
      scene.add(m);
      out.inlets.push({ pool: pp.name, x: c.x, y: yy, z: c.z, ry: c.ry, mesh: m });
    }
  }

  // 温泉局部热气：接入宿主 steamPlanes（随帧缓慢上浮），只在主汤/静汤水面上方少量
  if (ctx.addSteam) {
    const hotW = (poolOf('hot') || {}).water || 0;
    for (const [sx, sz, sr] of [[-20.0, -20.4, 1.5], [-17.2, -18.6, 1.1], [-9.4, -19.0, 1.0], [-7.2, -20.6, 0.8]]) {
      ctx.addSteam(sx, hotW + 0.05, sz, sr);
    }
  }
  return out;
}
