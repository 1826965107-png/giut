/* ============================================================ 地图数据 */
const H = 4.4;                 // 泳池层净高（原 4.2，抬高后柱头与筒灯不贴顶）
const L37_ECHO_H = 2.55;       // 北回声室低顶棚
const L37_EQUIP_H = 3.05;      // 设备间顶棚
const BOUNDS = { x1: -28, x2: 30, z1: -28, z2: 24 };

// 泳池（三水体）：
// main  25m×12m 六泳道竞赛池，四段台阶（每级 0.40m）
// train 8m×8m 训练池，两段台阶（每级约 0.38m）
// echo  8m×6m 浅水回声池（水深约 0.34m + 水下缓台），单级缓台
const POOLS = [
  { name: 'main', label: '主池', x1: -9, x2: 3, zDeep1: -14, zEnd: 11, bottom: -2.05, water: -0.30, lanes: 6,
    stairs: { x1: -9, x2: -6.9, steps: [
      { z1: 9.5, z2: 11.0, top: -0.44 },
      { z1: 8.4, z2: 9.5, top: -0.84 },
      { z1: 7.3, z2: 8.4, top: -1.24 },
      { z1: 6.2, z2: 7.3, top: -1.64 },
    ] } },
  { name: 'train', label: '训练池', x1: 16, x2: 24, zDeep1: -4, zEnd: 4, bottom: -1.15, water: -0.30, lanes: 4,
    stairs: { x1: 16, x2: 17.9, steps: [
      { z1: 2.6, z2: 4.0, top: -0.36 },
      { z1: 1.2, z2: 2.6, top: -0.74 },
    ] } },
  { name: 'echo', label: '浅水回声池', x1: -12, x2: -4, zDeep1: -25, zEnd: -19, bottom: -0.62, water: -0.14,
    stairs: { x1: -12, x2: -9, steps: [
      { z1: -25, z2: -19, top: -0.30 },        // 西侧水下缓台（可站立行走）
    ] } },
];
const POOL_BY_NAME = Object.fromEntries(POOLS.map(p => [p.name, p]));
function poolAt(x, z, pad = 0) {
  for (const p of POOLS) {
    if (x >= p.x1 - pad && x <= p.x2 + pad && z >= p.zDeep1 - pad && z <= p.zEnd + pad) return p;
  }
  return null;
}

// 浅反射池（保留旧名，指向回声池，兼容历史引用）
const BASIN = { x1: -12, x2: -4, z1: -25, z2: -19, bottom: -0.62, water: -0.14 };

const COLLIDERS = [];