/* =====================================================================
   第四关 · 第一次回返（2026-10-30 重做版）
   ---------------------------------------------------------------------
   玩法（对应 docs/level4-rework-brief.md）：
   1. 承接第三关故障停车：玩家在正常地铁车厢里，按 E 打开步道侧中门，真实下车。
   2. 门外检修步道上有一只实体旧手电（靠近门口、有微弱定位灯）。拾取后才可 F 开关，
      拥有本关独立电量；未拾取时 F 不能凭空照明。
   3. 顺同一条宽检修步道一直向 -z 前进。隧道是按 6m 模数周期重复的同一条隧道，
      穿缝只做世界坐标平移（保留朝向/眼高/速度/横向偏移），没有黑屏、转镜、停步。
   4. 第一次正向穿缝后，落点在起点前方 24m 的同款隧道里：车厢在手电射程与雾之外，
      继续走近才发现列车已经老旧锈蚀（两版车厢同层预建，只切 visible，不在眼前换模）。
   5. 异常车厢仍有一条可实际进入的中门和宽敞过道，里面能拾到备用电池与「应急通行钥匙」。
   6. 本次到此为止：不结算、不写档、不调用 completeLevel4、不补后续剧情。

   接缝连续性为什么成立（不是靠位置断言）：
   · 隧道全部构件按 MOD=6 的整数倍复制，WRAP=84=14×MOD，平移后模数相位不变；
   · 所有长条构件的 UV 以构件自身起点为锚、cov=TILE=3，84/TILE=28 为偶数格，
     源美术使用 MirroredRepeatWrapping 时位移仍是同一张图的同一周期，不会跳纹理；
   · 灯光数量在出生前定死（固定灯池），运行时只改强度/颜色，不增删灯，不重编译 shader。
   ===================================================================== */
import { createLevel4Art, L4_ART } from './level4-art.js';

export const L4_OX = 360;      // 整关整体世界偏移
export const L4_LEVEL = 3;     // 关卡编号（沿用宿主既有约定）
export const TUNNEL_LAYER = 3; // 渲染层

/* ---------------------------------------------------------------- 尺度 */
const MOD = 6.0;               // 隧道模数（周期）
const TILE = 3.0;              // 贴图一格的米数；WRAP/TILE = 28，偶数格
const Z_FAR = -96.0;           // 接缝前后各留48m缓冲，端面完全藏在手电/雾视距之外
const Z_NEAR = 84.0;
const Z_SEAM_F = -48.0;        // 前进（向 -z）方向的回环面
const Z_SEAM_B = 36.0;         // 倒退（向 +z）方向的回环面
const WRAP = Z_SEAM_B - Z_SEAM_F;   // 84
const SEAM_BAND = 1.2;         // 离开这个带才重新上膛，避免每帧刷圈

const WALK_X1 = -4.20;         // 左墙内表面
const WALK_X2 = -1.89;         // 步道靠车侧边缘（= 车体站台侧外表面）
const WALK_Y = 0;              // 步道面高
const TROUGH_X = 2.80;         // 轨槽右壁
const TROUGH_Y = -0.55;        // 轨槽面（与步道落差 0.55 < 0.62 台阶上限）
const CEIL_Y = 3.05;           // 拱顶内表面

const TORCH_BURN = 260;        // 秒：满电足够一次回环 + 异常车厢探索
const TORCH_REACH = 2.6;       // 手电拾取距离
const PICK_REACH = 2.3;        // 电池/钥匙拾取距离
const AIM_MIN_DOT = 0.62;      // 准星与目标的最小夹角余弦

/* ---------------------------------------------------------------- 车体 */
const CAR = {
  halfW: 1.75, len: 10, wall: 0.14, floor: 0.04, ceil: 2.60,
  sagZ: 1.4, sagHalf: 1.7, sagDrop: 0.10,
  doors: [-6.1, 0, 6.1], doorW: 1.65, doorH: 2.28,
};
CAR.xin = -CAR.halfW;             // -1.75 站台侧内表面
CAR.xout = CAR.halfW;             // +1.75 外侧内表面
CAR.faceIn = CAR.xin - CAR.wall;  // -1.89 站台侧外表面
CAR.faceOut = CAR.xout + CAR.wall; // +1.89
CAR.ceilSag = CAR.ceil - CAR.sagDrop; // 2.50（>=2.15）
CAR.gapHalf = CAR.doorW / 2 + 0.06;   // 0.885 门洞半宽（含框）

const TORCH_POS = { x: -2.62, y: 0.055, z: -3.20 };
const BAT_POS = { x: 1.00, y: 0.70, z: 3.05 };
const KEY_POS = { x: 0.82, y: 1.04, z: -9.55 };

/* 维修间（侧向凹室）：左侧步道墙在 z=-6（6m 模数线上）真实开洞，
   门净宽 1.2m、净高 2.20m，房内 2.9m×2.9m 可转身。房体、门、灯、碰撞、净高场
   与导航边界共用这一份数据；不在实体墙上贴假门，也不允许穿墙交互。
   位置取两接缝（-48 / 36）正中：正向穿缝后落点距房体最近处仍约 42m，
   远在 L4_ART.flashlightDistance=19 与雾的可读范围之外，回返瞬间不会把它闪进画面。 */
const ROOM = {
  cz: -6.0,                 // 洞口中心（MOD 的整数倍，也是两接缝中点）
  gapHalf: 0.60,            // 净宽 1.20m
  doorH: 2.20,              // 净高 2.20m
  depth: 1.45,              // 房内进深 2.90m（半深）
  x1: -7.10,                // 后墙内表面（房内宽 2.90m）
  ceilH: 2.55,
  wall: 0.22,
};
ROOM.z1 = ROOM.cz - ROOM.depth;
ROOM.z2 = ROOM.cz + ROOM.depth;
ROOM.gapZ1 = ROOM.cz - ROOM.gapHalf;
ROOM.gapZ2 = ROOM.cz + ROOM.gapHalf;
ROOM.doorZ = ROOM.gapZ1 + 0.04;     // 门轴（靠北侧洞边）
ROOM.breaker = { x: -6.86, y: 1.42, z: ROOM.cz };
ROOM.lamp = { x: -5.60, y: 2.34, z: ROOM.cz };
ROOM.emerg = { x: -4.02, y: 1.86, z: ROOM.gapZ1 - 0.30 };
/* 房体最靠接缝的一点（用于"回返瞬间不可见"的几何覆盖断言） */
ROOM.zMin = ROOM.z1 - ROOM.wall;
ROOM.zMax = ROOM.z2 + ROOM.wall;

/* 车窗洞口：站台侧（门洞之间）与外侧（固定 6 窗）的窗带高度、窗宽。
   正常/老化/第二次回返三套车体共用这份洞口数据——窗是真的洞，往里就是同一节车厢内景。 */
const CAR_WIN_IN_Y1 = 1.30, CAR_WIN_IN_Y2 = 2.10;   // 站台侧窗带
const CAR_WIN_OUT = [-7.8, -5.0, -2.2, 2.2, 5.0, 7.8];
const CAR_WIN_OUT_HW = 0.95, CAR_WIN_OUT_Y1 = 1.28, CAR_WIN_OUT_Y2 = 2.12;

/* 第二次回返的整车内景：远端（驾驶端 -z）三段逐渐压低并轻微偏斜的顶棚。
   这是唯一几何来源——buildSecondCar 按它建盒子，ceilingRaw 按它给跳跃头顶高度。 */
const SR_CEIL = [
  { z1: -CAR.len, z2: -8.40, y: 2.24, tilt: 0.022 },
  { z1: -8.40, z2: -6.90, y: 2.33, tilt: 0.016 },
  { z1: -6.90, z2: -5.40, y: 2.43, tilt: 0.010 },
  { z1: -5.40, z2: CAR.len, y: 2.56, tilt: 0 },
];
const SR_FLOOR_HEAD = 2.15;               // 最低可走净高要求（相对车厢地板）

/* 同一份分段数据的查表入口：建盒子、查净高、放吊杆、立柱子都用它。
   每段顶棚是绕自身中心转了 tilt 的板，所以真实下表面随 z 线性变化，
   这里返回的就是下表面高度（不是段心高度），避免"几何一处、数据另一处"。 */
function srCeilUnder(i, z) {
  const s = SR_CEIL[i];
  const zc = (s.z1 + s.z2) / 2;
  return s.y - (z - zc) * (s.tilt || 0);
}

function srCeilYAt(z) {
  for (let i = 0; i < SR_CEIL.length; i++) {
    if (z >= SR_CEIL[i].z1 && z <= SR_CEIL[i].z2) return srCeilUnder(i, z);
  }
  return SR_CEIL[SR_CEIL.length - 1].y;
}

/* 站台侧一段窗带怎么排窗：窗间柱 >= 0.36m，窗宽 <= 1.24m。
   老化车体与第二次回返车体都调用它，洞口位置天然一致。 */
function stationPlan(a, b) {
  const len = b - a;
  const n = Math.max(1, Math.round((len - 0.36) / 1.60));
  const step = len / n;
  const hw = Math.min(0.62, step / 2 - 0.18);
  return { len: len, n: n, step: step, hw: hw };
}

/* 站台侧窗洞清单（两种车体共用）：{ zc, hw, y1, y2 }，门洞之间按段排布。 */
function stationWindows() {
  const zEdges = [-CAR.len];
  for (let i = 0; i < CAR.doors.length; i++) zEdges.push(CAR.doors[i] - CAR.gapHalf, CAR.doors[i] + CAR.gapHalf);
  zEdges.push(CAR.len);
  const out = [];
  for (let i = 0; i < zEdges.length; i += 2) {
    const a = zEdges[i], b = zEdges[i + 1];
    if (b - a <= 0.02) continue;
    const sp = stationPlan(a, b);
    for (let k = 0; k < sp.n; k++) {
      out.push({ zc: a + (k + 0.5) * sp.step, hw: sp.hw, y1: CAR_WIN_IN_Y1, y2: CAR_WIN_IN_Y2 });
    }
  }
  return out;
}

/* 第二形态的座椅排距：统一从门洞让开（含座椅半长 + 玩家半径），
   这样中门、前后门都是通的，座椅也不会和门框/立柱叠在一起。
   视觉与碰撞共用同一份数据。 */
function secondSeatZ() {
  const out = [];
  const halfLen = 0.78;
  const keepOut = halfLen + CAR.gapHalf + 0.04;
  for (let z = -8.90; z <= 8.9001; z += 1.62) {
    let ok = true;
    for (let i = 0; i < CAR.doors.length; i++) {
      if (Math.abs(z - CAR.doors[i]) < keepOut) { ok = false; break; }
    }
    if (ok) out.push(Math.round(z * 100) / 100);
  }
  return out;
}

/* 松脱吊板（车顶垂下的锈板）：几何与净高场共用同一份数据。
   净高按"板最低边 - 板厚 - 安全余量"给出，并按板尺寸/旋转 + 玩家半径外扩，
   这样跳起来头顶也不会穿进板边（宿主只按 ceilingAt 夹脚底高度）。 */
const LOOSE_PANEL = { w: 0.70, h: 0.03, d: 1.05, x: 0.52, y: 2.42, z: 2.15, rz: 0.26 };
LOOSE_PANEL.lowY = LOOSE_PANEL.y - (LOOSE_PANEL.w / 2) * Math.sin(LOOSE_PANEL.rz)
  - LOOSE_PANEL.h / 2 - 0.02;                                  // ≈2.295 板下净高
LOOSE_PANEL.x1 = LOOSE_PANEL.x - (LOOSE_PANEL.w / 2) * Math.cos(LOOSE_PANEL.rz) - 0.35;
LOOSE_PANEL.x2 = LOOSE_PANEL.x + (LOOSE_PANEL.w / 2) * Math.cos(LOOSE_PANEL.rz) + 0.35;
LOOSE_PANEL.z1 = LOOSE_PANEL.z - LOOSE_PANEL.d / 2 - 0.35;
LOOSE_PANEL.z2 = LOOSE_PANEL.z + LOOSE_PANEL.d / 2 + 0.35;

export const L4_LAYOUT = {
  module: MOD, tile: TILE, wrap: WRAP, seamBand: SEAM_BAND,
  zFar: Z_FAR, zNear: Z_NEAR,
  walkway: { x1: WALK_X1, x2: WALK_X2, y: WALK_Y },
  trough: { x1: WALK_X2, x2: TROUGH_X, y: TROUGH_Y },
  tunnel: { ceil: CEIL_Y, wallX1: WALK_X1, wallX2: TROUGH_X },
  car: CAR,
  carWindows: {
    station: { y1: CAR_WIN_IN_Y1, y2: CAR_WIN_IN_Y2 },
    outer: { z: CAR_WIN_OUT, hw: CAR_WIN_OUT_HW, y1: CAR_WIN_OUT_Y1, y2: CAR_WIN_OUT_Y2 },
  },
  secondCeil: SR_CEIL, secondMinHead: SR_FLOOR_HEAD,
  doorZ: 0,
  torch: TORCH_POS,
  battery: BAT_POS,
  key: KEY_POS,
  maint: ROOM,
};

export const L4_SEAM = {
  forward: Z_SEAM_F, back: Z_SEAM_B, wrap: WRAP, band: SEAM_BAND, module: MOD, tile: TILE,
};

/* ===================================================================== */
export function createLevel4(ctx) {
  if (!ctx || !ctx.THREE || !ctx.scene || !ctx.player) {
    throw new Error('createLevel4: 宿主上下文缺少 THREE / scene / player');
  }
  if (typeof ctx.mergeGeoList !== 'function') {
    throw new Error('createLevel4: 宿主上下文缺少 mergeGeoList');
  }
  const THREE = ctx.THREE;
  const tmpDir = new THREE.Vector3();

  const group = new THREE.Group();
  group.name = 'level4-return';
  group.position.set(L4_OX, 0, 0);
  group.visible = false;

  const buckets = new Map();      // material -> geometry[]
  const colliders = [];           // 世界坐标（x 已 +L4_OX）
  const lights = [];              // 固定灯池
  const interactables = [];
  const anchors = {};
  const doorLeaves = [];          // { mesh, baseZ, direction, doorZ, kind }
  const doorBlockers = [];        // 门洞碰撞盒（供瞄准/视线做“自身排除”）
  const M = {};                   // 材质表（来自 createLevel4Art）

  let built = false;
  let art = null;
  let artReady = null;
  let focus = null;

  const state = {
    entered: false, paused: false,
    aged: false,
    torchOwned: false, torchOn: false, torchCharge: 1,
    spareBattery: 0, hasKey: false,
    batteryTaken: false, keyTaken: false,
    door: 0, doorTarget: 0,
    task: '',
    carSeen: false,
    itemHintShown: false,
    /* 维修间 / 电闸 / 第二次回返：全部是本 run 内的“操作事实” */
    maint: {
      unlocked: false,        // 钥匙开锁（一次性事实）
      door: 0, doorTarget: 0, // 门扇当前开度（可反复开关）
      entered: false,         // 进过维修间（一次性事实）
      powerDone: false,       // 恢复过供电（一次性事实）
      breaker: 0,             // 电闸实际状态 0 断 / 1 通（可反复扳动）
      secondReturn: false,    // 第二次回返已发生（一次性事实）
      carInspected: false,    // 已真的走进异变车厢、看清整节车厢（一次性事实）
      lookHint: false,        // 进车但没顺着车长看的一次轻提示（只给一次）
      humT: 0,
    },
  };
  /* 旧名兼容：上一轮叫 windowSeen（"在窗外看清"）。现在语义是"进车厢检查变化"，
     内部与测试都统一用 carInspected；保留别名只为不打断既有调用点。 */
  Object.defineProperty(state.maint, 'windowSeen', {
    get: function () { return this.carInspected; },
    set: function (v) { this.carInspected = !!v; },
    configurable: true,
  });

  const seamState = {
    prevZ: 0, armedF: true, armedB: true, skip: true,
    crossings: 0, forward: 0, back: 0, lastShift: 0,
  };

  /* 延迟脚步队列：只在第二次回返后激活。
     由宿主真实落脚事件（onFootstep）派生，按实际位移过滤，不用计时器凭空响。
     pan/gain 在入队时就算好（与坐标系无关），所以接缝平移不需要重定位。 */
  const steps = {
    active: false,
    queue: [],                                  // [{ t, pan, gain }]
    last: { x: 0, z: 0, valid: false },
    emitted: 0, rejected: 0,
    maxPending: 2,                              // 停步后最多留两次余步
    minMove: 0.25,                              // 单步实际位移下限（推墙/原地不新增）
    delayMin: 0.62, delayMax: 0.92,
  };
  let rand = Math.random;   // 测试可替换（debugState 之外唯一的随机来源）
  // 维修间几何登记表：buildMaintRoom → buildBreakerLever 期间记录实际建出的盒子包围盒
  let maintCapture = null;

  /* ------------------------------------------------------------ 小工具 */
  function flashMsg(text) { if (ctx.onFlash) ctx.onFlash(text); }
  function sfx(name, opts) { if (ctx.sfx) ctx.sfx(name, opts); }
  function setTask(text) {
    if (state.task === text) return;
    state.task = text;
    if (ctx.onTask) ctx.onTask(text);
  }

  function uvBox(geo, w, h, d, cov) {
    const uv = geo.attributes.uv;
    const s = 1 / (cov || TILE);
    // BoxGeometry 面序：+x -x +y -y +z -z，每面 4 个顶点
    const fw = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const su = fw[f][0] * s, sv = fw[f][1] * s;
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  function push(mat, geo) {
    if (!mat || !geo) return;
    let list = buckets.get(mat);
    if (!list) { list = []; buckets.set(mat, list); }
    list.push(geo);
  }

  function geoBox(w, h, d, x, y, z, cov, rx, ry, rz) {
    const geo = new THREE.BoxGeometry(w, h, d);
    uvBox(geo, w, h, d, cov == null ? TILE : cov);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    if (rz) geo.rotateZ(rz);
    geo.translate(x, y, z);
    // 维修间几何登记：把"实际建出来的盒子"的包围盒记下来（本地坐标），
    // 供回归检查"回返瞬间这些非周期几何是否都在手电射程外"。不是另算一套数。
    if (maintCapture) {
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      maintCapture.push({ x1: bb.min.x, x2: bb.max.x, y1: bb.min.y, y2: bb.max.y, z1: bb.min.z, z2: bb.max.z });
    }
    return geo;
  }

  function bx(matKey, w, h, d, x, y, z, cov, rx, ry, rz) {
    push(M[matKey], geoBox(w, h, d, x, y, z, cov, rx, ry, rz));
  }

  function span(matKey, x1, x2, y1, y2, z1, z2, cov) {
    bx(matKey, x2 - x1, y2 - y1, z2 - z1, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, cov);
  }

  function slab(matKey, x1, y1, x2, y2, zc, len, thick, cov) {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx);
    const geo = new THREE.BoxGeometry(L, thick, len);
    uvBox(geo, L, thick, len, cov == null ? TILE : cov);
    geo.rotateZ(ang);
    geo.translate((x1 + x2) / 2, (y1 + y2) / 2, zc);
    push(M[matKey], geo);
  }

  function cyl(matKey, r, h, x, y, z, axis, cov, seg) {
    const geo = new THREE.CylinderGeometry(r, r, h, seg || 10, 1, false);
    const uv = geo.attributes.uv;
    const su = (2 * Math.PI * r) / (cov || TILE), sv = h / (cov || TILE);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    uv.needsUpdate = true;
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    else if (axis === 'x') geo.rotateZ(Math.PI / 2);
    geo.translate(x, y, z);
    push(M[matKey], geo);
  }

  function addCollider(x1, x2, z1, z2, y1, y2, extra) {
    const c = { x1: x1 + L4_OX, x2: x2 + L4_OX, z1: z1, z2: z2, y1: y1, y2: y2 };
    if (extra) for (const k in extra) c[k] = extra[k];
    colliders.push(c);
    return c;
  }

  function addLight(color, intensity, dist, x, y, z, name) {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.set(x, y, z);
    l.name = name || 'l4-light';
    group.add(l);
    lights.push(l);
    return l;
  }

  function flushBuckets() {
    for (const entry of buckets) {
      const mat = entry[0], list = entry[1];
      if (!list.length) continue;
      const geo = ctx.mergeGeoList(list);
      for (let i = 0; i < list.length; i++) list[i].dispose();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'l4-shell';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    }
    buckets.clear();
  }

  /* ------------------------------------------------------------ 材质 */
  function buildMaterials() {
    art = createLevel4Art({ THREE });
    artReady = art.ready;
    const src = art.materials;
    for (const key in src) M[key] = src[key];
    // 隧道里没有环境光可用：把 IBL 权重压到 0，避免站台环境图把黑暗隧道照亮。
    for (let i = 0; i < art.prewarmMaterials.length; i++) {
      const m = art.prewarmMaterials[i];
      if (m && 'envMapIntensity' in m) m.envMapIntensity = 0;
    }
    // 旧玻璃：同一张玻璃贴图的低透明变体（只在本关做材质变体，不改美术文件与调色）
    if (M.glass) {
      M.glassOld = M.glass.clone();
      M.glassOld.name = 'l4-glass-old';
      M.glassOld.transparent = true;
      M.glassOld.opacity = 0.24;
      M.glassOld.depthWrite = false;
      if ('envMapIntensity' in M.glassOld) M.glassOld.envMapIntensity = 0;
    }
    /* 第二次回返的整洁内饰：不新造贴图，沿用同一套搪瓷/乙烯基贴图换色，
       与锈蚀外壳形成反差；只有灯带是自发光，墙板与座椅都不发光。
       注意：内衬**不能**用老化搪瓷贴图（那套图本身就是锈斑），只借它的凹凸。 */
    const rustBump = M.agedEnamel && M.agedEnamel.map;
    const ceilBump = (M.concrete && M.concrete.map) || rustBump;
    const vinylMap = M.agedVinyl && M.agedVinyl.map;
    M.srPanel = new THREE.MeshStandardMaterial({
      color: 0x9aa9a0, roughness: 0.54, metalness: 0.16,
    });
    M.srPanel.bumpMap = ceilBump; M.srPanel.bumpScale = 0.0035;
    M.srCeil = new THREE.MeshStandardMaterial({
      color: 0xa8b7ac, roughness: 0.44, metalness: 0.08,
    });
    M.srCeil.bumpMap = ceilBump; M.srCeil.bumpScale = 0.003;
    M.srFloor = new THREE.MeshStandardMaterial({
      color: 0x6f7d75, roughness: 0.86, metalness: 0.04, map: vinylMap,
    });
    M.srWalk = new THREE.MeshStandardMaterial({
      color: 0x3d4f4b, roughness: 0.92, metalness: 0.02,
    });
    M.srSeat = new THREE.MeshStandardMaterial({
      color: 0x3f635d, roughness: 0.74, metalness: 0.03, map: vinylMap,
    });
    M.srSeat.bumpMap = vinylMap; M.srSeat.bumpScale = 0.005;
    // 冷白偏绿的顶灯灯带：低亮度自发光，只负责"看得出在亮"，不把窗内烤成白板
    M.srStrip = new THREE.MeshStandardMaterial({
      color: 0xdff0e6, emissive: 0xc9e8d6, emissiveIntensity: 0.85, roughness: 0.45, metalness: 0.0,
    });
    M.srTrim = new THREE.MeshStandardMaterial({
      color: 0x2c3a38, roughness: 0.55, metalness: 0.45,
    });
  }

  /* ------------------------------------------------------------ 隧道 */
  function buildTunnelShell() {
    const z1 = Z_FAR, z2 = Z_NEAR, len = z2 - z1, zc = (z1 + z2) / 2;
    // 洞口两侧让出的范围（洞宽 + 门框），长条构件在这里断开，避免横穿门洞
    const cut1 = ROOM.gapZ1 - 0.16, cut2 = ROOM.gapZ2 + 0.16;

    // 检修步道 + 轨槽（连续长条：UV 以自身起点为锚，位移 84/3=28 格仍同相）
    span('walkway', WALK_X1, WALK_X2, -0.62, WALK_Y, z1, z2, TILE);
    span('concrete', WALK_X2, TROUGH_X, -1.02, TROUGH_Y, z1, z2, TILE);

    // 排水沟（沿墙，略低于步道面；在门洞处断开，门槛下不留槽）
    span('steel', -3.88, -3.60, -0.06, -0.004, z1, cut1, TILE);
    span('steel', -3.88, -3.60, -0.06, -0.004, cut2, z2, TILE);

    // 侧墙：左墙在维修间门洞处真实断开（门洞以上留过梁），右墙连续
    span('concrete', WALK_X1 - 0.22, WALK_X1, -0.62, 2.45, z1, cut1, TILE);
    span('concrete', WALK_X1 - 0.22, WALK_X1, -0.62, 2.45, cut2, z2, TILE);
    span('concrete', WALK_X1 - 0.22, WALK_X1, ROOM.doorH, 2.45, cut1, cut2, TILE);
    span('concrete', TROUGH_X, TROUGH_X + 0.22, TROUGH_Y, 2.45, z1, z2, TILE);

    // 拱形衬砌：两侧起拱 + 平顶
    slab('concrete', WALK_X1, 2.45, -2.86, CEIL_Y, zc, len, 0.24, TILE);
    slab('concrete', -2.86, CEIL_Y, 1.46, CEIL_Y, zc, len, 0.24, TILE);
    slab('concrete', 1.46, CEIL_Y, TROUGH_X, 2.45, zc, len, 0.24, TILE);

    // 电缆托架 + 线束（沿全程，门洞处断开并各加一个断口夹）
    for (const seg of [[z1, cut1], [cut2, z2]]) {
      const a = seg[0], b = seg[1], l = b - a, c = (a + b) / 2;
      span('steel', WALK_X1 + 0.02, WALK_X1 + 0.32, 1.99, 2.04, a, b, TILE);
      span('steel', WALK_X1 + 0.02, WALK_X1 + 0.32, 2.36, 2.41, a, b, TILE);
      cyl('rubber', 0.048, l, WALK_X1 + 0.15, 2.10, c, 'z', TILE, 8);
      cyl('rubber', 0.040, l, WALK_X1 + 0.25, 2.14, c, 'z', TILE, 8);
      cyl('rubber', 0.032, l, WALK_X1 + 0.08, 2.18, c, 'z', TILE, 8);
      cyl('rubber', 0.030, l, WALK_X1 + 0.18, 2.47, c, 'z', TILE, 8);
      bx('steel', 0.36, 0.10, 0.10, WALK_X1 + 0.18, 1.995, a + 0.05, 2);
      bx('steel', 0.36, 0.10, 0.10, WALK_X1 + 0.18, 1.995, b - 0.05, 2);
      bx('steel', 0.36, 0.10, 0.10, WALK_X1 + 0.18, 2.365, a + 0.05, 2);
      bx('steel', 0.36, 0.10, 0.10, WALK_X1 + 0.18, 2.365, b - 0.05, 2);
    }

    // 钢轨（视觉；轨槽面才是碰撞地面）
    span('steel', -0.82, -0.74, -0.46, -0.30, z1, z2, TILE);
    span('steel', 0.74, 0.82, -0.46, -0.30, z1, z2, TILE);

    // 按模数重复的细节：环肋 / 托架 / 篦子 / 反光片 / 枕木 / 扣件
    for (let z0 = z1; z0 < z2 - 0.01; z0 += MOD) {
      const nearDoor = Math.abs(z0 - ROOM.cz) < 1.0;
      if (!nearDoor) bx('concrete', 0.12, 3.07, 0.18, WALK_X1 + 0.06, 0.915, z0, 2);
      bx('concrete', 0.12, 3.00, 0.18, TROUGH_X - 0.06, 0.95, z0, 2);
      slab('concrete', WALK_X1, 2.45, -2.86, CEIL_Y, z0, 0.18, 0.22, 2);
      slab('concrete', -2.86, CEIL_Y, 1.46, CEIL_Y, z0, 0.18, 0.22, 2);
      slab('concrete', 1.46, CEIL_Y, TROUGH_X, 2.45, z0, 0.18, 0.22, 2);

      if (!nearDoor) {
        bx('steel', 0.34, 0.05, 0.10, WALK_X1 + 0.17, 1.965, z0, 2);
        bx('steel', 0.05, 0.30, 0.06, WALK_X1 + 0.03, 2.20, z0, 2);
        bx('emergency', 0.02, 0.09, 0.22, WALK_X1 + 0.02, 1.06, z0 + 3.00, 2);
      }
      bx('steel', 0.30, 0.02, 0.56, -3.74, 0.006, z0 + 1.20, 2);

      bx('steel', 2.80, 0.10, 0.24, 0.20, -0.50, z0 + 3.00, 2);
      bx('rust', 0.16, 0.06, 0.10, -0.78, -0.47, z0 + 3.00, 2);
      bx('rust', 0.16, 0.06, 0.10, 0.78, -0.47, z0 + 3.00, 2);
    }

    // 车厢底下：深色裙板，既遮住车底穿模，也当碰撞体（见 buildCarUnderBlock）
    span('steel', CAR.faceIn, CAR.faceOut + 0.02, TROUGH_Y, 0.03, -CAR.len - 0.2, CAR.len + 0.2, TILE);
  }

  /* ------------------------------------------------------------ 维修间凹室 */
  function buildMaintRoom() {
    const W = ROOM.wall;
    maintCapture = [];
    // 地面（与步道同高，门槛处平接；groundAt 仍返回 0）
    span('concrete', ROOM.x1 - W, WALK_X1, -0.12, 0.0, ROOM.z1, ROOM.z2, TILE);
    // 后墙 / 南北侧墙 / 顶棚
    span('concrete', ROOM.x1 - W, ROOM.x1, -0.12, ROOM.ceilH, ROOM.z1, ROOM.z2, TILE);
    span('concrete', ROOM.x1 - W, WALK_X1, -0.12, ROOM.ceilH, ROOM.z1 - W, ROOM.z1, TILE);
    span('concrete', ROOM.x1 - W, WALK_X1, -0.12, ROOM.ceilH, ROOM.z2, ROOM.z2 + W, TILE);
    span('concrete', ROOM.x1 - W, WALK_X1, ROOM.ceilH, ROOM.ceilH + 0.20, ROOM.z1 - W, ROOM.z2 + W, TILE);
    // 后墙贴一层旧瓷砖，和隧道混凝土区分开；地面一条防滑条
    span('agedEnamel', ROOM.x1, ROOM.x1 + 0.02, 0.0, 1.35, ROOM.z1 + 0.06, ROOM.z2 - 0.06, 2.4);
    span('steel', ROOM.x1, ROOM.x1 + 1.10, 0.0, 0.012, ROOM.z1 + 0.06, ROOM.z1 + 0.20, 2);
    // 门框（两侧立框 + 上槛），贴洞口内侧，宽度按真实墙厚
    bx('steel', 0.10, ROOM.doorH + 0.06, 0.08, WALK_X1 - W * 0.5, (ROOM.doorH + 0.06) / 2, ROOM.gapZ1 - 0.04, 2);
    bx('steel', 0.10, ROOM.doorH + 0.06, 0.08, WALK_X1 - W * 0.5, (ROOM.doorH + 0.06) / 2, ROOM.gapZ2 + 0.04, 2);
    bx('steel', 0.10, 0.08, ROOM.gapHalf * 2 + 0.16, WALK_X1 - W * 0.5, ROOM.doorH + 0.02, ROOM.cz, 2);
    // 门槛压条（薄，不参与净高）
    bx('steel', W + 0.06, 0.012, ROOM.gapHalf * 2 - 0.04, WALK_X1 - W * 0.5, 0.006, ROOM.cz, 2);
    // 门侧应急光：常亮小灯箱 + 灯罩（电量耗尽也能找到门）
    bx('steel', 0.06, 0.16, 0.34, WALK_X1 + 0.03, ROOM.emerg.y, ROOM.emerg.z, 2);
    bx('emergency', 0.02, 0.10, 0.26, WALK_X1 + 0.055, ROOM.emerg.y, ROOM.emerg.z, 2);
    // 配电箱：箱体 + 箱门 + 仪表 + 拉杆基座（拉杆本体在 buildBreakerLever 里单独建）
    const bk = ROOM.breaker;
    bx('steel', 0.26, 1.10, 0.86, bk.x + 0.13, 1.42, bk.z, 2);
    bx('rust', 0.03, 0.96, 0.74, bk.x + 0.275, 1.42, bk.z, 2);
    for (const gz of [-0.20, 0.0, 0.20]) {
      bx('steel', 0.05, 0.16, 0.16, bk.x + 0.30, 1.86, bk.z + gz, 2);
      bx('emergency', 0.02, 0.05, 0.05, bk.x + 0.33, 1.86, bk.z + gz, 2);
    }
    bx('steel', 0.10, 0.30, 0.30, bk.x + 0.30, bk.y - 0.12, bk.z, 2);

    // 真实门扇：绕北侧洞边铰链向内开（开到位时贴在房内侧墙后面，不挡过道）
    const hinge = new THREE.Group();
    hinge.name = 'l4-maint-door-hinge';
    hinge.position.set(WALK_X1 - 0.06, 0, ROOM.doorZ);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, ROOM.doorH - 0.04, ROOM.gapHalf * 2 - 0.04), M.agedEnamel);
    leaf.position.set(0, (ROOM.doorH - 0.04) / 2, (ROOM.gapHalf * 2) / 2);
    hinge.add(leaf);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, 0.90), M.steel);
    brace.position.set(-0.03, 1.10, (ROOM.gapHalf * 2) / 2);
    hinge.add(brace);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), M.steel);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(-0.05, 1.05, ROOM.gapHalf * 2 - 0.16);
    hinge.add(handle);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.20), M.emergency);
    plate.position.set(-0.045, 1.62, ROOM.gapHalf * 2 - 0.22);
    hinge.add(plate);
    group.add(hinge);
    anchors.maintLeaf = hinge;
  }

  /* 电闸拉杆：可反复扳动的实体（旋转轴在箱体下缘）+ 状态灯 */
  function buildBreakerLever() {
    const bk = ROOM.breaker;
    const g = new THREE.Group();
    g.name = 'l4-breaker-lever';
    g.position.set(bk.x + 0.30, bk.y - 0.22, bk.z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.07), M.steel);
    arm.position.y = 0.17;
    g.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.emergency);
    knob.position.y = 0.35;
    g.add(knob);
    group.add(g);
    anchors.lever = g;
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x201a14, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.7, metalness: 0.1,
    });
    // 供电状态灯：放在拉杆右上方、避开三只仪表所在的 y=1.86 一行，否则会被仪表挡掉
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 12), M.steel);
    lampHousing.rotation.z = Math.PI / 2;
    lampHousing.position.set(bk.x + 0.29, bk.y + 0.26, bk.z + 0.30);
    group.add(lampHousing);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), lampMat);
    lamp.position.set(bk.x + 0.315, bk.y + 0.26, bk.z + 0.30);
    group.add(lamp);
    anchors.breakerLamp = lampMat;
    // 配电箱顶灯（固定灯池成员，断电/通电只改强度）
    anchors.lightRoom = addLight(0xd8e6ea, 0, 5.6, ROOM.lamp.x, ROOM.lamp.y - 0.06, ROOM.z1 + 1.45, 'l4-room-light');
    anchors.lightEmerg = addLight(0xb8935d, 0.30, 5.2, ROOM.emerg.x - 0.06, ROOM.emerg.y, ROOM.emerg.z, 'l4-emerg-light');
    anchors.maintBoxes = maintCapture;   // 本地坐标的实体包围盒（门扇/拉杆另用 Box3 实测）
    maintCapture = null;
  }

  /* ------------------------------------------------------------ 第二次回返：整节车厢
     预建一整套完整内景（整幅地板 / 两侧带窗内衬 / 分段压低顶棚 / 两侧座椅与支架 /
     端墙与贯通道 / 偏斜扶手与吊环 / 三扇车门），车体位置与尺寸沿用同一份 CAR 数据。
     运行时只在 applyCarState 里切 visible 与灯强度，不在玩家面前重建，
     也不把旧外壳与新内饰叠放——老化车体在同一刻整体隐藏。 */
  function buildSecondCar() {
    const g = new THREE.Group();
    g.name = 'l4-car-second';
    const local = new Map();
    const put = (matKey, geo) => {
      const mat = M[matKey];
      let list = local.get(mat);
      if (!list) { list = []; local.set(mat, list); }
      list.push(geo);
    };
    const box = (matKey, w, h, d, x, y, z, rx, ry, rz, cov) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      uvBox(geo, w, h, d, cov == null ? 2.4 : cov);
      if (rx) geo.rotateX(rx);
      if (ry) geo.rotateY(ry);
      if (rz) geo.rotateZ(rz);
      geo.translate(x, y, z);
      put(matKey, geo);
      return geo;
    };
    const bar = (matKey, r, h, x, y, z, rx, rz, seg) => {
      const geo = new THREE.CylinderGeometry(r, r, h, seg || 10, 1, false);
      uvBox(geo, r * 2, h, r * 2, 2.4);
      if (rx) geo.rotateX(rx);
      if (rz) geo.rotateZ(rz);
      geo.translate(x, y, z);
      put(matKey, geo);
      return geo;
    };
    const ring = (matKey, r, tube, x, y, z) => {
      const geo = new THREE.TorusGeometry(r, tube, 8, 20);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (r / 1.2), uv.getY(i) * (r / 1.2));
      uv.needsUpdate = true;
      geo.translate(x, y, z);
      put(matKey, geo);
      return geo;
    };

    /* 顶棚板：底面（朝车内）是合格内饰，其余五面——包括车外看得见的顶部端头、
       顶面与两侧收边——一律沿用侧墙那套锈蚀旧漆，避免车外露出一条浅白新盖边。
       BoxGeometry 的材质顺序是 +X,-X,+Y,-Y,+Z,-Z。 */
    const ceilMats = [M.agedEnamel, M.agedEnamel, M.agedEnamel, M.srCeil, M.agedEnamel, M.agedEnamel];
    const roofBox = (w, h, d, x, y, z, rx, cov) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      uvBox(geo, w, h, d, cov == null ? 2.6 : cov);   // 与侧墙同一套物理尺度 UV
      if (rx) geo.rotateX(rx);
      geo.translate(x, y, z);
      const mesh = new THREE.Mesh(geo, ceilMats);
      mesh.name = 'l4-second-roof';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      g.add(mesh);
      return mesh;
    };

    const HW = CAR.halfW, L = CAR.len, W = CAR.wall, FL = CAR.floor;
    const DH = CAR.doorH, DW = CAR.doorW;
    const SKIN = 0.06, LIN = W - SKIN;                       // 外壳锈层 / 内侧洁净衬板
    const CEIL_TOP = SR_CEIL[SR_CEIL.length - 1].y;          // 靠门一侧的顶棚高度

    /* 侧墙：外壳锈板 + 洁净内衬，两块叠合成整面墙；窗带与门洞处按洞口留空。
       side='in' 是步道侧（内表面 x=CAR.xin），side='out' 是外侧（内表面 x=CAR.xout）。 */
    const wallPanel = (side, y1, y2, z1, z2) => {
      const len = z2 - z1, h = y2 - y1;
      if (len <= 0.02 || h <= 0.005) return;
      const zc = (z1 + z2) / 2, yc = (y1 + y2) / 2;
      if (side === 'in') {
        box('agedEnamel', SKIN, h, len, CAR.faceIn + SKIN / 2, yc, zc, 0, 0, 0, 2.4);
        box('srPanel', LIN, h, len, CAR.xin - LIN / 2, yc, zc, 0, 0, 0, 2.4);
      } else {
        box('srPanel', LIN, h, len, CAR.xout + LIN / 2, yc, zc, 0, 0, 0, 2.4);
        box('agedEnamel', SKIN, h, len, CAR.faceOut - SKIN / 2, yc, zc, 0, 0, 0, 2.4);
      }
    };

    /* ---- 地板：两侧座椅平台（顶面 = FL）+ 中间走道槽 + 走道面板（顶面严格 = FL）
       走道板不是"贴在整幅地板上再埋进去"，而是槽里铺板、平台与板同高、彼此不重叠。 */
    const AISLE_HW = 1.10;                                    // 走道半宽 => 净宽 2.20m
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? AISLE_HW : -(HW + W);
      const x1 = s > 0 ? (HW + W) : -AISLE_HW;
      box('srFloor', x1 - x0, 0.18, L * 2, (x0 + x1) / 2, FL - 0.09, 0, 0, 0, 0, 3.0);
    }
    box('srWalk', AISLE_HW * 2, 0.16, L * 2, 0, FL - 0.10, 0, 0, 0, 0, 2.4);          // 槽底
    box('srWalk', AISLE_HW * 2 - 0.02, 0.02, L * 2 - 0.10, 0, FL - 0.01, 0, 0, 0, 0, 2.4); // 走道板
    for (let i = 0; i < CAR.doors.length; i++) {
      box('steel', 0.46, 0.02, DW + 0.10, CAR.faceIn + 0.24, FL - 0.012, CAR.doors[i], 0, 0, 0, 2);
    }
    for (const side of [-1, 1]) {
      box('srTrim', 0.07, 0.07, L * 2 - 0.40, side > 0 ? CAR.xout - 0.62 : CAR.xin + 0.62,
        FL + 0.055, 0, 0, 0, 0, 2);
    }

    /* ---- 顶棚：远端三段逐渐压低/偏斜 + 横肋 + 两条冷白灯带。
       所有部件的高度都取 srCeilYAt(z)（同一份几何来源）。 */
    for (let si = 0; si < SR_CEIL.length; si++) {
      const s = SR_CEIL[si];
      const len = s.z2 - s.z1, zc = (s.z1 + s.z2) / 2, tilt = s.tilt || 0;
      roofBox(HW * 2 + W * 2, 0.10, len, 0, s.y + 0.05, zc, tilt, 2.6);
      for (let z = s.z1 + 0.8; z < s.z2 - 0.25; z += 1.6) {
        box('srTrim', HW * 2 - 0.10, 0.05, 0.07, 0, srCeilYAt(z) - 0.025, z, tilt, 0, 0, 2);
      }
      // 灯带顶面贴住该段下表面（沿同一坡度），不额外加 zc 偏移
      for (const sx of [-0.58, 0.58]) {
        box('srStrip', 0.14, 0.03, Math.max(0.2, len - 0.24), sx, s.y - 0.015, zc, tilt, 0, 0, 2);
      }
      // 段与段之间的竖直收口：斜板端头差一截，这里补板封住，避免透光缝
      if (si + 1 < SR_CEIL.length) {
        const zb = s.z2;
        const a = srCeilUnder(si, zb), b = srCeilUnder(si + 1, zb);
        const h = Math.abs(a - b) + 0.12;
        roofBox(HW * 2 + W * 2, h, 0.06, 0, (a + b) / 2, zb, 0, 2.6);
      }
    }

    /* ---- 步道侧：窗间柱 + 窗框 + 玻璃（洞口与老化车体同一套 stationPlan 数据） */
    const zEdges = [-L];
    for (let i = 0; i < CAR.doors.length; i++) zEdges.push(CAR.doors[i] - CAR.gapHalf, CAR.doors[i] + CAR.gapHalf);
    zEdges.push(L);
    for (let i = 0; i < zEdges.length; i += 2) {
      const a = zEdges[i], b = zEdges[i + 1];
      if (b - a <= 0.02) continue;
      const sp = stationPlan(a, b);
      // 窗台以下 / 窗楣以上
      wallPanel('in', FL, CAR_WIN_IN_Y1, a, b);
      wallPanel('in', CAR_WIN_IN_Y2, CEIL_TOP, a, b);
      // 端柱与中间窗间柱
      const pw = sp.step / 2 - sp.hw;
      wallPanel('in', CAR_WIN_IN_Y1, CAR_WIN_IN_Y2, a, a + pw);
      wallPanel('in', CAR_WIN_IN_Y1, CAR_WIN_IN_Y2, b - pw, b);
      const midW = sp.step - 2 * sp.hw;
      for (let k = 1; k < sp.n; k++) {
        const c0 = a + k * sp.step - midW / 2;
        wallPanel('in', CAR_WIN_IN_Y1, CAR_WIN_IN_Y2, c0, c0 + midW);
      }
      const midY = (CAR_WIN_IN_Y1 + CAR_WIN_IN_Y2) / 2;
      for (let k = 0; k < sp.n; k++) {
        const wc = a + (k + 0.5) * sp.step;
        box('srTrim', 0.03, 0.05, sp.hw * 2 + 0.04, CAR.xin - 0.012, CAR_WIN_IN_Y1 + 0.02, wc, 0, 0, 0, 2);
        box('srTrim', 0.03, 0.05, sp.hw * 2 + 0.04, CAR.xin - 0.012, CAR_WIN_IN_Y2 - 0.02, wc, 0, 0, 0, 2);
        box('srTrim', 0.03, CAR_WIN_IN_Y2 - CAR_WIN_IN_Y1, 0.04, CAR.xin - 0.012, midY, wc - sp.hw, 0, 0, 0, 2);
        box('srTrim', 0.03, CAR_WIN_IN_Y2 - CAR_WIN_IN_Y1, 0.04, CAR.xin - 0.012, midY, wc + sp.hw, 0, 0, 0, 2);
        box('glass', 0.02, CAR_WIN_IN_Y2 - CAR_WIN_IN_Y1 - 0.06, sp.hw * 2 - 0.06,
          CAR.faceIn + W / 2, midY, wc, 0, 0, 0, 2);
      }
    }

    /* ---- 外侧：窗下/窗上壁板 + 窗框 + 玻璃（6 窗，与老化车体同位置） */
    const wEdges = [-L];
    for (let i = 0; i < CAR_WIN_OUT.length; i++) {
      wEdges.push(CAR_WIN_OUT[i] - CAR_WIN_OUT_HW, CAR_WIN_OUT[i] + CAR_WIN_OUT_HW);
    }
    wEdges.push(L);
    for (let i = 0; i < wEdges.length; i += 2) {
      const a = wEdges[i], b = wEdges[i + 1];
      if (b - a <= 0.02) continue;
      wallPanel('out', FL, CEIL_TOP, a, b);
    }
    for (let i = 0; i < CAR_WIN_OUT.length; i++) {
      const w = CAR_WIN_OUT[i], hw = CAR_WIN_OUT_HW;
      wallPanel('out', FL, CAR_WIN_OUT_Y1, w - hw, w + hw);
      wallPanel('out', CAR_WIN_OUT_Y2, CEIL_TOP, w - hw, w + hw);
      const midY = (CAR_WIN_OUT_Y1 + CAR_WIN_OUT_Y2) / 2;
      box('srTrim', 0.03, 0.06, hw * 2 + 0.10, CAR.xout + 0.012, CAR_WIN_OUT_Y1 + 0.02, w, 0, 0, 0, 2);
      box('srTrim', 0.03, 0.06, hw * 2 + 0.10, CAR.xout + 0.012, CAR_WIN_OUT_Y2 - 0.02, w, 0, 0, 0, 2);
      box('srTrim', 0.03, CAR_WIN_OUT_Y2 - CAR_WIN_OUT_Y1, 0.06, CAR.xout + 0.012, midY, w - hw, 0, 0, 0, 2);
      box('srTrim', 0.03, CAR_WIN_OUT_Y2 - CAR_WIN_OUT_Y1, 0.06, CAR.xout + 0.012, midY, w + hw, 0, 0, 0, 2);
      box('glass', 0.02, CAR_WIN_OUT_Y2 - CAR_WIN_OUT_Y1 - 0.06, hw * 2 - 0.06,
        CAR.xout + W / 2, midY, w, 0, 0, 0, 2);
    }

    /* ---- 门洞过梁与侧框（三扇门都有真实门框） */
    for (let i = 0; i < CAR.doors.length; i++) {
      const d = CAR.doors[i];
      box('srTrim', W + 0.03, 0.10, DW + 0.20, CAR.faceIn + W / 2, DH + 0.05, d, 0, 0, 0, 2);
      box('srTrim', W + 0.03, DH - FL, 0.07, CAR.faceIn + W / 2, (DH + FL) / 2, d - DW / 2 - 0.05, 0, 0, 0, 2);
      box('srTrim', W + 0.03, DH - FL, 0.07, CAR.faceIn + W / 2, (DH + FL) / 2, d + DW / 2 + 0.05, 0, 0, 0, 2);
    }

    /* ---- 两侧座椅：座垫前后两块、靠背贴墙、座下箱体、支架与托梁都真实落地/贴墙 */
    const seatZ = secondSeatZ();
    for (const side of [-1, 1]) {
      // 外侧（+x）没有门洞，直接用共享那一排；步道侧（-x）让开门洞
      const seatZs = side > 0 ? [-8.9, -6.4, -3.6, -0.9, 0.9, 3.6, 6.4, 8.9] : seatZ;
      const xSeat = side > 0 ? CAR.xout - 0.31 : CAR.xin + 0.31;
      const xBack = side > 0 ? CAR.xout - 0.055 : CAR.xin + 0.055;
      const xLeg = side > 0 ? CAR.xout - 0.60 : CAR.xin + 0.60;
      for (let i = 0; i < seatZs.length; i++) {
        const sz = seatZs[i];
        box('srSeat', 0.52, 0.10, 0.62, xSeat, FL + 0.44, sz - 0.34, 0, 0, 0.008, 2);
        box('srSeat', 0.52, 0.10, 0.62, xSeat, FL + 0.44, sz + 0.34, 0, 0, 0.008, 2);
        box('srSeat', 0.10, 0.52, 1.32, xBack, FL + 0.76, sz, 0, 0, side > 0 ? -0.04 : 0.04, 2);
        box('srTrim', 0.44, 0.38, 1.30, xSeat, FL + 0.21, sz, 0, 0, 0, 2);
        for (const oz of [-0.54, 0.54]) {
          box('srTrim', 0.06, 0.40, 0.06, xLeg, FL + 0.20, sz + oz, 0, 0, 0, 2);
        }
      }
    }

    /* ---- 立柱：随顶棚高度取长，落地且顶到顶棚（不是悬空管） */
    for (const d of CAR.doors) {
      for (const s of [-1, 1]) {
        const pz = d + s * (DW / 2 + 0.34);
        const cy = srCeilYAt(pz);
        for (const sx of [-1.16, 1.16]) {
          bar('srTrim', 0.026, cy - FL, sx, (cy + FL) / 2, pz, 0, 0, 10);
        }
      }
    }

    /* ---- 整排扶手：两侧各一根，向驾驶端（-z，低顶棚那头）同向下倾；
       横杆、吊杆、吊环、吊带都从同一个 railAt(z) 取高，不会各自算反号。 */
    const railY = 1.98, railX = 0.99, railTilt = 0.030;
    const railAt = (z) => railY + z * railTilt;      // 世界高度：+z 略高，-z 略低
    for (const sx of [-railX, railX]) {
      // 绕 X 转 π/2 - tilt：轴向 (0, +sin t, cos t)，正好与 railAt 一致
      bar('srTrim', 0.022, L * 2 - 1.20, sx, railY, 0, Math.PI / 2 - railTilt, 0, 8);
      for (let z = -8.8; z <= 8.81; z += 2.2) {
        const yRailTop = railAt(z) + 0.022;                 // 横杆顶面
        const yCeil = srCeilYAt(z) - 0.004;                 // 顶棚下表面（略吃进去一点，保证接实）
        const lenRod = yCeil - yRailTop;
        if (lenRod > 0.05) {
          bar('srTrim', 0.014, lenRod, sx, (yRailTop + yCeil) / 2, z, 0, 0, 6);
        }
      }
      for (let z = -8.4; z <= 8.41; z += 1.1) {
        const yRail = railAt(z);
        box('srTrim', 0.02, 0.16, 0.03, sx, yRail - 0.09, z, 0, 0, 0, 2);
        ring('srTrim', 0.072, 0.011, sx, yRail - 0.245, z);
      }
    }

    /* ---- 端墙 + 贯通道门框（几何完整，不开）
       与侧墙同一套分层：外侧（朝车外）是锈蚀旧漆，内侧是洁净内饰衬板；
       外锈层按车体外宽收口，转角处不会露出内衬的白边。 */
    for (const sz of [-1, 1]) {
      const zc = sz * (L + W / 2);
      const zLin = sz * (L + LIN / 2);
      const zSkin = sz * (L + W - SKIN / 2);
      box('srPanel', HW * 2, CEIL_TOP - FL, LIN, 0, (CEIL_TOP + FL) / 2, zLin, 0, 0, 0, 2.4);
      box('agedEnamel', (HW + W) * 2, CEIL_TOP - FL, SKIN, 0, (CEIL_TOP + FL) / 2, zSkin, 0, 0, 0, 2.4);
      box('srTrim', 0.90, 1.98, 0.05, 0, FL + 0.99, zc - sz * (W / 2 + 0.02), 0, 0, 0, 2);
      box('srTrim', 1.14, 0.07, 0.09, 0, FL + 2.02, zc - sz * (W / 2 + 0.02), 0, 0, 0, 2);
    }

    /* ---- 三扇车门：中门可开，另两扇锁死（加斜撑），与老化车体共用门叶接口。
       门扇是薄板，外表面朝步道：用逐面材质（BoxGeometry 顺序 +X,-X,+Y,-Y,+Z,-Z），
       只有朝车内（局部 +X）是整洁内饰，外面与四道外露边沿用锈蚀旧漆——薄板没有
       厚度可用真实分层，贴片会与门叶共面，因此必须逐面给材质，开合时随门叶一起动。 */
    const leafMats = [M.srPanel, M.agedEnamel, M.agedEnamel, M.agedEnamel, M.agedEnamel, M.agedEnamel];
    for (let di = 0; di < CAR.doors.length; di++) {
      const d = CAR.doors[di];
      for (const s of [-1, 1]) {
        const baseZ = d + s * (DW / 4 + 0.005);
        const leaf = new THREE.Group();
        leaf.position.set(CAR.faceIn - 0.02, 0, baseZ);
        const lw = DW / 2 - 0.02;
        const panel = (h, y) => {
          const geo = new THREE.BoxGeometry(0.07, h, lw);
          uvBox(geo, 0.07, h, lw, 2.4);          // 与侧墙同一套物理尺度 UV
          const m = new THREE.Mesh(geo, leafMats);
          m.position.set(0, y, 0);
          return m;
        };
        leaf.add(panel(0.87, FL + 0.435));
        leaf.add(panel(0.14, DH - 0.07));
        leaf.add(panel(1.30, 1.20));
        const gl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.10, lw - 0.06), M.glass);
        gl.position.set(0.005, 1.52, 0);
        leaf.add(gl);
        leaf.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        g.add(leaf);
        doorLeaves.push({ mesh: leaf, baseZ: baseZ, direction: s, doorZ: d, kind: 'second' });
      }
      if (di !== 1) {
        bar('srTrim', 0.032, DW * 1.15, CAR.faceIn - 0.06, (DH + FL) / 2 + 0.1, d, 1.10, 0, 8);
      }
    }

    /* ---- 合并 + 车体轮廓自检（任何部件穿出车体都在建关时当场报错） */
    for (const entry of local) {
      const geo = ctx.mergeGeoList(entry[1]);
      for (let i = 0; i < entry[1].length; i++) entry[1][i].dispose();
      const mesh = new THREE.Mesh(geo, entry[0]);
      mesh.name = 'l4-second-shell';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      g.add(mesh);
    }
    const bb = new THREE.Box3().setFromObject(g);
    const lim = { x1: -2.02, x2: 2.02, y1: -0.75, y2: 2.85, z1: -10.5, z2: 10.5 };
    if (bb.min.x < lim.x1 || bb.max.x > lim.x2 || bb.min.y < lim.y1 || bb.max.y > lim.y2 ||
        bb.min.z < lim.z1 || bb.max.z > lim.z2) {
      throw new Error('L4 第二回返车厢几何超出车体轮廓: [' + bb.min.x.toFixed(2) + ',' + bb.min.y.toFixed(2)
        + ',' + bb.min.z.toFixed(2) + '] .. [' + bb.max.x.toFixed(2) + ',' + bb.max.y.toFixed(2)
        + ',' + bb.max.z.toFixed(2) + ']');
    }
    anchors.srBox = bb;
    anchors.srWindows = {
      station: stationWindows(),
      outer: CAR_WIN_OUT.map(function (w) {
        return { zc: w, hw: CAR_WIN_OUT_HW, y1: CAR_WIN_OUT_Y1, y2: CAR_WIN_OUT_Y2 };
      }),
    };
    g.visible = false;
    group.add(g);
    anchors.carSecond = g;
  }

  /* ------------------------------------------------------------ 门外手电 */
  function buildTorch() {
    const g = new THREE.Group();
    g.name = 'l4-torch';
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.038, 0.24, 12), M.rubber);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.07, 12), M.steel);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.14;
    g.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), M.glass);
    lens.position.z = -0.178;
    lens.rotation.y = Math.PI;
    g.add(lens);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.007, 6, 14), M.emergency);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.10;
    g.add(ring);
    g.position.set(TORCH_POS.x, TORCH_POS.y, TORCH_POS.z);
    g.rotation.y = 0.36;
    group.add(g);
    anchors.torch = g;
    anchors.torchRing = ring;
  }

  /* ------------------------------------------------------------ 正常车厢（复用宿主建模） */
  function buildNormalCar() {
    const car = ctx.buildMetroCar({ passing: false });
    car.name = 'l4-car-normal';
    car.position.set(0, 0, 0);
    // 宿主车厢自带 3 盏灯；灯池由本关统一管理，这里只留几何。
    const own = (car.userData && car.userData.metroLights) || [];
    for (let i = 0; i < own.length; i++) {
      if (own[i].parent) own[i].parent.remove(own[i]);
    }
    // 灯带改成低亮度自发光，避免 26m 外还能看见一条白光（雾里会露馅）
    const led = car.userData && car.userData.ledMesh;
    if (led) {
      led.material = new THREE.MeshStandardMaterial({
        color: 0x0b1012, roughness: 0.62, metalness: 0.1,
        emissive: 0xd6e2e8, emissiveIntensity: 0.42,
      });
    }
    const leaves = (car.userData && car.userData.doorLeaves) || [];
    for (let i = 0; i < leaves.length; i++) {
      const lf = leaves[i];
      doorLeaves.push({
        mesh: lf.mesh, baseZ: lf.baseZ, direction: lf.direction,
        doorZ: Math.abs(lf.baseZ) < 0.5 ? 0 : Math.abs(lf.baseZ - 6.1) < 0.5 ? 6.1 : -6.1,
        kind: 'normal',
      });
    }
    group.add(car);
    anchors.carNormal = car;
  }

  /* ------------------------------------------------------------ 异常车厢（材质与几何都有证据） */
  function buildAgedCar() {
    const g = new THREE.Group();
    g.name = 'l4-car-aged';
    const local = new Map();
    const put = (matKey, geo) => {
      const mat = M[matKey];
      let list = local.get(mat);
      if (!list) { list = []; local.set(mat, list); }
      list.push(geo);
    };
    const box = (matKey, w, h, d, x, y, z, rx, ry, rz, cov) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      uvBox(geo, w, h, d, cov == null ? 2.4 : cov);
      if (rx) geo.rotateX(rx);
      if (ry) geo.rotateY(ry);
      if (rz) geo.rotateZ(rz);
      geo.translate(x, y, z);
      put(matKey, geo);
      return geo;
    };
    const bar = (matKey, r, h, x, y, z, rx, rz, seg) => {
      const geo = new THREE.CylinderGeometry(r, r, h, seg || 10, 1, false);
      uvBox(geo, r * 2, h, r * 2, 2.4);
      if (rx) geo.rotateX(rx);
      if (rz) geo.rotateZ(rz);
      geo.translate(x, y, z);
      put(matKey, geo);
    };
    const plane = (matKey, w, h, x, y, z, ry) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2.4, uv.getY(i) * h / 2.4);
      uv.needsUpdate = true;
      if (ry) geo.rotateY(ry);
      geo.translate(x, y, z);
      put(matKey, geo);
    };

    const HW = CAR.halfW, L = CAR.len, W = CAR.wall;
    const FL = CAR.floor, CL = CAR.ceil, DH = CAR.doorH, DW = CAR.doorW;
    const XI = CAR.xin + 0.06, XO = CAR.xout - 0.06;

    /* 地板 / 天花 */
    box('agedVinyl', HW * 2 + W * 2, 0.20, L * 2 + 0.3, 0, FL - 0.10, 0, 0, 0, 0, 3.0);
    // 走道面：低反光深灰橡胶（亚光防滑），金属只保留门槛压条与走道压条
    box('rubber', HW * 2 - 0.42, 0.03, L * 2 - 0.4, 0, FL - 0.008, 0, 0, 0, 0, 2.6);
    for (let i = 0; i < CAR.doors.length; i++) {
      box('steel', 0.44, 0.036, DW + 0.12, CAR.faceIn + 0.22, FL + 0.006, CAR.doors[i], 0, 0, 0, 2);
    }
    box('steel', 0.05, 0.030, L * 2 - 0.8, -0.86, FL + 0.004, 0, 0, 0, 0, 2);
    box('steel', 0.05, 0.030, L * 2 - 0.8, 0.86, FL + 0.004, 0, 0, 0, 0, 2);
    // 天花：中间一块下垂（几何证据之一），其余基本平整
    const sagA = CAR.sagZ - CAR.sagHalf, sagB = CAR.sagZ + CAR.sagHalf;
    const segs = [[-L, sagA], [sagA, sagB], [sagB, L]];
    for (let i = 0; i < segs.length; i++) {
      const a = segs[i][0], b = segs[i][1];
      const drop = (i === 1) ? CAR.sagDrop : 0;
      box('agedCeiling', HW * 2 + W * 2, 0.16, b - a, 0, CL + 0.08 - drop, (a + b) / 2, 0, 0,
        (i === 1) ? 0.012 : 0, 2.4);
    }
    // 天花横肋 + 一条松脱吊板（低于天花、高于头顶，不参与碰撞）
    for (let z = -L + 1.25; z < L; z += 2.5) {
      box('steel', HW * 2 - 0.12, 0.07, 0.10, 0, CL - 0.03, z, 0, 0, 0.004, 2);
    }
    box('rust', LOOSE_PANEL.w, LOOSE_PANEL.h, LOOSE_PANEL.d,
      LOOSE_PANEL.x, LOOSE_PANEL.y, LOOSE_PANEL.z, 0, 0, LOOSE_PANEL.rz, 2);
    // 应急灯槽 + 一小段仍在工作的暖色灯带
    box('steel', 0.74, 0.09, L * 2 - 1.2, 0, CL - 0.05, 0, 0, 0, 0, 2);
    box('emergency', 0.46, 0.04, 2.60, 0, CL - 0.10, 0.20, 0, 0, 0, 2);

    /* 站台侧壁板：门洞之外的段落保留原车的乘客窗——下壁板 + 上壁板 + 竖向窗间柱
       围出真正的窗洞，窗框错位歪斜，玻璃用低透明旧玻璃（不贴在实心墙面外）。 */
    const zEdges = [-L];
    for (let i = 0; i < CAR.doors.length; i++) {
      zEdges.push(CAR.doors[i] - CAR.gapHalf, CAR.doors[i] + CAR.gapHalf);
    }
    zEdges.push(L);
    const winY1 = CAR_WIN_IN_Y1, winY2 = CAR_WIN_IN_Y2;   // 与第二回返车体共用同一窗带
    for (let i = 0; i < zEdges.length; i += 2) {
      const a = zEdges[i], b = zEdges[i + 1];
      const len = b - a;
      if (len <= 0.02) continue;
      const bulge = (i === 2) ? -0.035 : 0;   // 其中一段板材轻微鼓曲
      // 窗台以下 / 窗楣以上（不是整面实心墙）
      box('agedEnamel', W, winY1 - FL, len, CAR.faceIn + W / 2 + bulge, (winY1 + FL) / 2,
        (a + b) / 2, 0, 0, 0, 2.4);
      box('agedEnamel', W, CL - winY2, len, CAR.faceIn + W / 2 + bulge * 0.5, (winY2 + CL) / 2,
        (a + b) / 2, 0, 0, 0, 2.4);
      // 均分窗洞：窗间柱 >= 0.36m（与第二回返车体共用同一套排窗数据）
      const sp = stationPlan(a, b);
      const n = sp.n, step = sp.step, hw = sp.hw;
      const midY = (winY1 + winY2) / 2;
      // 两端窗间柱 + 中间窗间柱（只在窗带高度补实）
      box('agedEnamel', W, winY2 - winY1, step / 2 - hw, CAR.faceIn + W / 2, midY,
        a + (step / 2 - hw) / 2, 0, 0, 0, 2.4);
      box('agedEnamel', W, winY2 - winY1, step / 2 - hw, CAR.faceIn + W / 2, midY,
        b - (step / 2 - hw) / 2, 0, 0, 0, 2.4);
      for (let k = 1; k < n; k++) {
        box('agedEnamel', W, winY2 - winY1, step - 2 * hw, CAR.faceIn + W / 2, midY,
          a + k * step, 0, 0, 0, 2.4);
      }
      for (let k = 0; k < n; k++) {
        const wc = a + (k + 0.5) * step;
        const fy = ((k + i) % 2 ? 0.050 : -0.045), tilt = ((k + i) % 3 === 0 ? 0.018 : -0.015);
        // 错位窗框（几何证据之二）
        box('steel', 0.05, 0.05, hw * 2 + 0.06, CAR.faceIn + W / 2, winY1 + fy, wc, tilt, 0, 0, 2);
        box('steel', 0.05, 0.05, hw * 2 + 0.06, CAR.faceIn + W / 2, winY2 + fy, wc, tilt, 0, 0, 2);
        box('steel', 0.05, winY2 - winY1, 0.05, CAR.faceIn + W / 2, midY + fy * 0.4, wc - hw, 0, 0, tilt, 2);
        box('steel', 0.05, winY2 - winY1, 0.05, CAR.faceIn + W / 2, midY + fy * 0.4, wc + hw, 0, 0, tilt, 2);
        if (i === 2 && k === 1) {
          // 一整块玻璃没了，只剩锈边
          box('rust', 0.04, 0.09, hw * 2, CAR.faceIn + W / 2, winY1 + 0.03, wc, 0, 0, 0, 2);
          box('rust', 0.04, 0.09, hw * 2, CAR.faceIn + W / 2, winY2 - 0.03, wc, 0, 0, 0, 2);
        } else {
          plane('glassOld', hw * 2 - 0.04, winY2 - winY1 - 0.04,
            CAR.faceIn + W / 2, midY, wc, Math.PI / 2);
          if (i === 4 && k === 0) {
            // 斜裂缝
            box('rust', 0.02, 0.02, hw * 1.7, CAR.faceIn + W / 2, midY, wc, 0.42, 0, 0, 2);
          }
        }
      }
      // 底部锈蚀裙板（间歇）
      if (i === 2 || i === 4) {
        box('rust', 0.03, 0.46, len - 0.06, CAR.faceIn - 0.015, FL + 0.26, (a + b) / 2, 0, 0, 0, 2);
      }
    }
    // 门洞过梁 + 侧框
    for (let i = 0; i < CAR.doors.length; i++) {
      const d = CAR.doors[i];
      box('steel', W + 0.03, 0.10, DW + 0.20, CAR.faceIn + W / 2, DH + 0.05, d, 0, 0, 0.01, 2);
      box('steel', W + 0.03, DH - FL, 0.07, CAR.faceIn + W / 2, (DH + FL) / 2, d - DW / 2 - 0.05, 0, 0, 0, 2);
      box('steel', W + 0.03, DH - FL, 0.07, CAR.faceIn + W / 2, (DH + FL) / 2, d + DW / 2 + 0.05, 0, 0, 0, 2);
    }

    /* 外侧壁：窗洞 + 错位窗框（几何证据之二） */
    const winC = CAR_WIN_OUT, winHW = CAR_WIN_OUT_HW;
    const wy1 = CAR_WIN_OUT_Y1, wy2 = CAR_WIN_OUT_Y2;
    const wEdges = [-L];
    for (let i = 0; i < winC.length; i++) wEdges.push(winC[i] - winHW, winC[i] + winHW);
    wEdges.push(L);
    for (let i = 0; i < wEdges.length; i += 2) {
      const a = wEdges[i], b = wEdges[i + 1];
      if (b - a <= 0.02) continue;
      box('agedEnamel', W, CL - FL, b - a, CAR.xout + W / 2, (CL + FL) / 2, (a + b) / 2, 0, 0, 0, 2.4);
    }
    for (let i = 0; i < winC.length; i++) {
      const w = winC[i];
      // 窗上下的壁板（鼓一点点）
      box('agedEnamel', W, wy1 - FL, winHW * 2, CAR.xout + W / 2, (wy1 + FL) / 2, w, 0, 0, 0, 2.4);
      box('agedEnamel', W, CL - wy2, winHW * 2, CAR.xout + W / 2, (wy2 + CL) / 2, w, 0, 0, 0, 2.4);
      // 错位窗框：整体偏 5cm、再歪 1.2°
      const fy = (i % 2 ? 0.055 : -0.048), tilt = (i % 3 === 0 ? 0.020 : -0.016);
      box('steel', 0.09, 0.06, winHW * 2 + 0.10, CAR.xout + W / 2, wy1 + fy, w, tilt, 0, 0, 2);
      box('steel', 0.09, 0.06, winHW * 2 + 0.10, CAR.xout + W / 2, wy2 + fy, w, tilt, 0, 0, 2);
      box('steel', 0.09, wy2 - wy1, 0.06, CAR.xout + W / 2, (wy1 + wy2) / 2 + fy * 0.4, w - winHW, 0, 0, tilt, 2);
      box('steel', 0.09, wy2 - wy1, 0.06, CAR.xout + W / 2, (wy1 + wy2) / 2 + fy * 0.4, w + winHW, 0, 0, tilt, 2);
      if (i === 1) {
        // 一整块玻璃没了，只剩锈边
        box('rust', 0.05, 0.10, winHW * 2, CAR.xout + W / 2, wy1 + 0.02, w, 0, 0, 0, 2);
        box('rust', 0.05, 0.10, winHW * 2, CAR.xout + W / 2, wy2 - 0.02, w, 0, 0, 0, 2);
      } else {
        plane('glass', winHW * 2 - 0.06, wy2 - wy1 - 0.06, CAR.xout + W / 2, (wy1 + wy2) / 2, w, Math.PI / 2);
      }
      if (i === 4) {
        // 斜裂缝
        box('rust', 0.02, 0.02, 1.9, CAR.xout + W / 2, (wy1 + wy2) / 2, w, 0.42, 0, 0, 2);
      }
    }

    /* 座椅（暗青乙烯基，局部磨损/塌陷） */
    const seatZ = [-8.9, -6.4, -3.6, -0.9, 0.9, 3.6, 6.4, 8.9];
    for (let i = 0; i < seatZ.length; i++) {
      const sz = seatZ[i];
      const worn = (i === 2 || i === 6);
      box('agedVinyl', 0.42, 0.40, 1.40, XO - 0.31, FL + 0.20, sz, 0, 0, 0, 2);
      box('agedVinyl', 0.52, 0.10, worn ? 0.62 : 1.40, XO - 0.36, FL + 0.45, worn ? sz - 0.36 : sz, 0, 0, 0.02, 2);
      box('agedVinyl', 0.10, 0.48, 1.40, XO - 0.12, FL + 0.70, sz, 0, 0, worn ? 0.11 : 0.05, 2);
      if (worn) box('rust', 0.44, 0.04, 0.44, XO - 0.34, FL + 0.42, sz + 0.44, 0, 0, 0.03, 2);
    }

    /* 立柱（倾斜）与纵向扶手（倾斜） */
    for (let i = 0; i < CAR.doors.length; i++) {
      const d = CAR.doors[i];
      for (const s of [-1, 1]) {
        const pz = d + s * (DW / 2 + 0.34);
        const tiltX = (i % 2 ? 0.045 : -0.055), tiltZ = (s > 0 ? 0.052 : -0.048);
        bar('steel', 0.026, CL - FL - 0.02, -1.16, (CL + FL) / 2, pz, tiltX, tiltZ, 10);
        bar('steel', 0.026, CL - FL - 0.02, 1.16, (CL + FL) / 2, pz, -tiltX, -tiltZ, 10);
      }
    }
    // 纵向扶手：长轴必须沿 z（先 rotateX(π/2)），否则会变成贯穿地板与顶棚的 18.8m 竖杆
    bar('steel', 0.020, L * 2 - 1.2, -1.05, CL - 0.16, 0, Math.PI / 2 + 0.006, 0, 8);
    bar('steel', 0.020, L * 2 - 1.2, 1.05, CL - 0.20, 0, Math.PI / 2 - 0.008, 0, 8);
    // 几根断掉的吊环
    for (let z = -7.2; z <= 7.2; z += 3.6) {
      bar('rubber', 0.012, 0.22, -1.05, CL - 0.28, z, 0.05, 0.06, 6);
      bar('rubber', 0.012, 0.30, 1.05, CL - 0.32, z + 1.2, -0.04, -0.05, 6);
    }

    /* 端墙 + 贯通道 */
    for (const sz of [-1, 1]) {
      const zc = sz * (L + W / 2);
      box('agedEnamel', HW * 2, CL - FL, W, 0, (CL + FL) / 2, zc, 0, 0, 0, 2.4);
      box('steel', 0.82, 2.02, 0.06, 0, FL + 1.01, zc - sz * 0.07, 0, 0, 0, 2);
      box('rust', 1.10, 0.08, 0.10, 0, FL + 2.06, zc - sz * 0.06, 0, 0, 0, 2);
    }

    /* 三扇门（中门可开；另两扇加了斜撑，锁死） */
    for (let di = 0; di < CAR.doors.length; di++) {
      const d = CAR.doors[di];
      for (const s of [-1, 1]) {
        const baseZ = d + s * (DW / 4 + 0.005);
        const leaf = new THREE.Group();
        leaf.position.set(CAR.faceIn - 0.02, 0, baseZ);
        const lw = DW / 2 - 0.02;
        const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.87, lw), M.agedEnamel);
        f1.position.set(0, FL + 0.435, 0);
        leaf.add(f1);
        const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, lw), M.agedEnamel);
        f2.position.set(0, DH - 0.07, 0);
        leaf.add(f2);
        const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.30, lw), M.agedEnamel);
        f3.position.set(0, 1.20, 0);
        f3.rotation.x = 0.006;
        leaf.add(f3);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.05, 1.10), M.glass);
        gl.rotation.y = Math.PI / 2;
        gl.position.set(0.005, 1.52, 0);
        leaf.add(gl);
        if (di === 1 && s > 0) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.10, lw), M.rust);
          band.position.set(0, FL + 0.62, 0);
          leaf.add(band);
        }
        leaf.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        g.add(leaf);
        doorLeaves.push({ mesh: leaf, baseZ: baseZ, direction: s, doorZ: d, kind: 'aged' });
      }
      if (di !== 1) {
        // 锁死的门：加一道斜撑
        // 斜撑跨过门洞：绕 x 倾斜，落在门的 y-z 平面里
        bar('rust', 0.035, DW * 1.15, CAR.faceIn - 0.06, (DH + FL) / 2 + 0.1, d, 1.10, 0, 8);
      }
    }

    /* 驾驶端设备托盘（钥匙放在上面）—— 在最后一张座椅前方、不挡通道 */
    box('steel', 0.55, 0.88, 0.40, 0.82, FL + 0.44, -9.55, 0, 0, 0, 2);
    box('steel', 0.52, 0.04, 0.36, 0.82, 0.98, -9.55, 0, 0, 0, 2);
    box('emergency', 0.05, 0.03, 0.05, 0.60, 1.01, -9.42, 0, 0, 0, 2);

    /* 座椅旁应急收纳架（电池放在上面） */
    box('steel', 0.30, 0.05, 0.50, 0.98, 0.60, 3.05, 0, 0, 0, 2);
    box('steel', 0.04, 0.56, 0.04, 0.85, 0.32, 2.82, 0, 0, 0, 2);
    box('steel', 0.04, 0.56, 0.04, 0.85, 0.32, 3.28, 0, 0, 0, 2);
    box('emergency', 0.04, 0.03, 0.06, 1.02, 0.63, 2.74, 0, 0, 0, 2);

    /* 合并 */
    for (const entry of local) {
      const geo = ctx.mergeGeoList(entry[1]);
      for (let i = 0; i < entry[1].length; i++) entry[1][i].dispose();
      const mesh = new THREE.Mesh(geo, entry[0]);
      mesh.name = 'l4-aged-shell';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      g.add(mesh);
    }
    /* 真实网格包围盒检查：任何部件穿出车体轮廓 / 地板 / 顶棚都在这里当场报错 */
    const bb = new THREE.Box3().setFromObject(g);
    const lim = { x1: -2.02, x2: 2.02, y1: -0.75, y2: 2.85, z1: -10.5, z2: 10.5 };
    if (bb.min.x < lim.x1 || bb.max.x > lim.x2 || bb.min.y < lim.y1 || bb.max.y > lim.y2 ||
        bb.min.z < lim.z1 || bb.max.z > lim.z2) {
      throw new Error('L4 异常车厢几何超出车体轮廓: [' + bb.min.x.toFixed(2) + ',' + bb.min.y.toFixed(2)
        + ',' + bb.min.z.toFixed(2) + '] .. [' + bb.max.x.toFixed(2) + ',' + bb.max.y.toFixed(2)
        + ',' + bb.max.z.toFixed(2) + ']');
    }
    anchors.agedBox = bb;

    g.visible = false;
    group.add(g);
    anchors.carAged = g;
  }

  /* ------------------------------------------------------------ 车厢里的两件东西 */
  function buildPickups() {
    const bat = new THREE.Group();
    bat.name = 'l4-pickup-battery';
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.22, 12), M.battery);
    b1.rotation.x = Math.PI / 2;
    bat.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.05, 12), M.emergency);
    b2.rotation.x = Math.PI / 2;
    b2.position.z = 0.10;
    bat.add(b2);
    bat.position.set(BAT_POS.x, BAT_POS.y, BAT_POS.z);
    bat.rotation.y = 0.5;
    bat.visible = false;
    group.add(bat);
    anchors.battery = bat;

    const key = new THREE.Group();
    key.name = 'l4-pickup-key';
    const k1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.075, 0.20), M.key);
    key.add(k1);
    const k2 = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.055, 0.055), M.key);
    k2.position.z = -0.12;
    key.add(k2);
    const k3 = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.007, 6, 12), M.key);
    k3.position.z = 0.115;
    key.add(k3);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.030, 0.050), M.emergency);
    tag.position.set(0.0, 0.052, 0.05);
    key.add(tag);
    key.position.set(KEY_POS.x, KEY_POS.y, KEY_POS.z);
    key.rotation.y = -0.32;
    key.visible = false;
    group.add(key);
    anchors.key = key;
  }

  /* ------------------------------------------------------------ 碰撞表（两版车厢共用一套） */
  function buildColliders() {
    // 站台侧墙（跳过三个门洞）
    const zEdges = [-CAR.len];
    for (let i = 0; i < CAR.doors.length; i++) {
      zEdges.push(CAR.doors[i] - CAR.gapHalf, CAR.doors[i] + CAR.gapHalf);
    }
    zEdges.push(CAR.len);
    for (let i = 0; i < zEdges.length; i += 2) {
      const a = zEdges[i], b = zEdges[i + 1];
      if (b - a > 0.02) addCollider(CAR.faceIn, CAR.xin, a, b, 0, CAR.ceil, { carWall: true });
    }
    // 外侧墙 / 端墙
    addCollider(CAR.xout, CAR.faceOut, -CAR.len, CAR.len, 0, CAR.ceil, { carWall: true });
    addCollider(CAR.xin, CAR.xout, -CAR.len - CAR.wall, -CAR.len, 0, CAR.ceil, { carWall: true });
    addCollider(CAR.xin, CAR.xout, CAR.len, CAR.len + CAR.wall, 0, CAR.ceil, { carWall: true });
    // 座椅
    const seatZ = [-8.9, -6.4, -3.6, -0.9, 0.9, 3.6, 6.4, 8.9];
    for (let i = 0; i < seatZ.length; i++) {
      addCollider(CAR.xout - 0.64, CAR.xout, seatZ[i] - 0.78, seatZ[i] + 0.78, 0, 1.06, { kind: 'seat' });
    }
    // 立柱
    for (let i = 0; i < CAR.doors.length; i++) {
      const d = CAR.doors[i];
      for (const s of [-1, 1]) {
        const pz = d + s * (CAR.doorW / 2 + 0.34);
        addCollider(-1.19, -1.13, pz - 0.03, pz + 0.03, 0, CAR.ceil, { kind: 'pole' });
        addCollider(1.13, 1.19, pz - 0.03, pz + 0.03, 0, CAR.ceil, { kind: 'pole' });
      }
    }
    // 驾驶端设备托盘（只在老化车体里存在；第二回返车厢该位置要能走到车头）
    addCollider(0.55, 1.10, -9.75, -9.35, 0, 0.98, { kind: 'console', agedOnly: true });
    // 车底：只挡“站在轨槽里”的玩家（y=-0.55）。上界必须低于步道脚面 y=0，
    // 否则从步道回中门时会被这个盒在 x=-1.89 边界顶回去，永远进不了车。
    addCollider(CAR.faceIn, CAR.faceOut + 0.02, -CAR.len - 0.2, CAR.len + 0.2, TROUGH_Y, -0.06, { kind: 'under' });
    // 三个门洞：中门可开，另两扇锁死
    for (let i = 0; i < CAR.doors.length; i++) {
      const d = CAR.doors[i];
      const c = addCollider(CAR.faceIn, CAR.xin, d - CAR.doorW / 2, d + CAR.doorW / 2, 0, CAR.doorH,
        { carDoor: true, doorZ: d, middle: Math.abs(d) < 0.01 });
      if (Math.abs(d) > 0.01) c.sealed = true;
      doorBlockers.push(c);
    }

    /* 维修间：真实墙体与门洞碰撞（左墙不再只靠 bounds 兜底） */
    const cut1 = ROOM.gapZ1 - 0.16, cut2 = ROOM.gapZ2 + 0.16;
    // 步道左墙以外到维修间后墙之间是实心土层：用"从 ROOM.x1 到 WALK_X1"的实心块表示，
    // 而不是只贴一层薄墙皮——这样即使被击退/瞬移进这片区域，推出方向仍是回到步道
    // （推到 WALK_X1 + RADIUS = -3.85，与关卡边界一致），也不会被高速穿过。
    // 维修间所在 z 段以外才是实心土层（这一段不能盖住房间内部）
    addCollider(ROOM.x1, WALK_X1, Z_FAR, ROOM.z1 - ROOM.wall, 0, 2.45, { kind: 'tunnelWall' });
    addCollider(ROOM.x1, WALK_X1, ROOM.z2 + ROOM.wall, Z_NEAR, 0, 2.45, { kind: 'tunnelWall' });
    // 房间 z 段内只剩洞口两侧的墙皮（薄），洞口本身留给门
    addCollider(WALK_X1 - 0.24, WALK_X1, ROOM.z1 - ROOM.wall, cut1, 0, 2.45, { kind: 'tunnelWall' });
    addCollider(WALK_X1 - 0.24, WALK_X1, cut2, ROOM.z2 + ROOM.wall, 0, 2.45, { kind: 'tunnelWall' });
    addCollider(WALK_X1 - 0.24, WALK_X1, cut1, cut2, ROOM.doorH, 2.45, { kind: 'tunnelLintel' });
    addCollider(ROOM.x1 - ROOM.wall, ROOM.x1, ROOM.z1 - ROOM.wall, ROOM.z2 + ROOM.wall, 0, ROOM.ceilH, { kind: 'roomWall' });
    addCollider(ROOM.x1 - ROOM.wall, WALK_X1, ROOM.z1 - ROOM.wall, ROOM.z1, 0, ROOM.ceilH, { kind: 'roomWall' });
    addCollider(ROOM.x1 - ROOM.wall, WALK_X1, ROOM.z2, ROOM.z2 + ROOM.wall, 0, ROOM.ceilH, { kind: 'roomWall' });
    // 后墙脚的压条只是地面收口，不加碰撞：2cm 高的盒子会在贴墙处变成一堵看不见的墙
    const barrier = addCollider(WALK_X1 - 0.26, WALK_X1 + 0.02, ROOM.gapZ1, ROOM.gapZ2, 0, ROOM.doorH,
      { maintDoor: true });
    barrier.maintDoor = true;

    /* 第二回返车厢：步道侧（-x）也有一排座椅，只在那种车体下才实心；
       老化车体那侧是站台侧窗墙，不能凭空多出一堵看不见的墙。
       座位位置与视觉共用 secondSeatZ()，门洞是通的。 */
    const s2z = secondSeatZ();
    for (let i = 0; i < s2z.length; i++) {
      const c = addCollider(CAR.faceIn, CAR.xin + 0.64, s2z[i] - 0.78, s2z[i] + 0.78, 0, 1.06,
        { kind: 'seat2', srSeat: true });
      c.y1 = 900;
    }
  }

  /* ------------------------------------------------------------ 地面 / 净高 */
  function groundAt(x, z) {
    const lx = x - L4_OX;
    if (Math.abs(z) <= CAR.len && lx >= CAR.faceIn && lx <= CAR.xout + 0.02) return CAR.floor;
    if (lx >= WALK_X1 && lx < WALK_X2) return WALK_Y;
    if (lx >= WALK_X2 && lx <= TROUGH_X + 0.02) return TROUGH_Y;
    return WALK_Y;
  }

  function ceilingRaw(x, z) {
    const lx = x - L4_OX;
    if (Math.abs(z) <= CAR.len && lx >= CAR.faceIn && lx <= CAR.xout) {
      // 第二回返车体：净高直接查 SR_CEIL（建盒子与判跳跃读同一份数据）
      if (state.maint.secondReturn) {
        return srCeilYAt(z) - 0.02;
      }
      // 松脱吊板下方按板下净高给（含玩家半径余量），否则跳跃会穿进板边
      if (z >= LOOSE_PANEL.z1 && z <= LOOSE_PANEL.z2 && lx >= LOOSE_PANEL.x1 && lx <= LOOSE_PANEL.x2) {
        return LOOSE_PANEL.lowY;
      }
      if (Math.abs(z - CAR.sagZ) <= CAR.sagHalf) return CAR.ceilSag;
      return CAR.ceil;
    }
    // 维修间：房内按房顶，门洞里按门高（过梁下沿）
    if (lx < WALK_X1 + 0.02 && lx > ROOM.x1 - ROOM.wall && z > ROOM.z1 - ROOM.wall && z < ROOM.z2 + ROOM.wall) {
      if (z > ROOM.gapZ1 && z < ROOM.gapZ2 && lx > WALK_X1 - ROOM.wall) return ROOM.doorH;
      return ROOM.ceilH;
    }
    return CEIL_Y;
  }

  function ceilingAt(x, z) {
    let h = ceilingRaw(x, z);
    const lx = x - L4_OX;
    if (Math.abs(z) <= CAR.len && lx >= CAR.faceIn && lx <= CAR.xout) {
      for (let i = 0; i < CAR.doors.length; i++) {
        if (Math.abs(z - CAR.doors[i]) <= CAR.doorW / 2 + 0.02) h = Math.min(h, CAR.doorH);
      }
    }
    return h;
  }

  /* ------------------------------------------------------------ 状态应用 */
  /* 维修间门 + 电闸 + 窗内异常：唯一的状态应用入口（模型/碰撞/灯/任务同源） */
  function applyMaint() {
    const m = state.maint;
    if (anchors.maintLeaf) {
      anchors.maintLeaf.rotation.y = -Math.PI / 2 * 0.94 * m.door;
      anchors.maintLeaf.visible = true;
    }
    const barrier = colliders.find((c) => c.maintDoor);
    if (barrier) barrier.y1 = m.door > 0.82 ? 900 : 0;
    if (anchors.lever) anchors.lever.rotation.x = m.breaker > 0.5 ? -0.62 : 0.62;
    if (anchors.breakerLamp) {
      anchors.breakerLamp.emissive.setHex(m.breaker > 0.5 ? 0x2bff9d : 0x000000);
      anchors.breakerLamp.emissiveIntensity = m.breaker > 0.5 ? 1.5 : 0;
    }
    if (anchors.lightRoom) anchors.lightRoom.intensity = m.breaker > 0.5 ? 4.2 : 0;
  }

  /* 延迟脚步的"位置基线"：激活/恢复/复位时都用玩家**当前真实位置**建立，
     这样激活后的第一次通知（哪怕玩家正贴着墙原地踏步）也不会被当成一脚；
     真正走出一段（≥ minMove）之后才开始攒回声。 */
  function resetStepBaseline() {
    const p = ctx.player;
    if (p && isFinite(p.x) && isFinite(p.z)) {
      steps.last.x = p.x; steps.last.z = p.z; steps.last.valid = true;
    } else {
      steps.last.valid = false;
    }
  }

  function cancelEcho() {
    steps.queue.length = 0;
    if (typeof ctx.onEchoCancel === 'function') ctx.onEchoCancel();
  }

  /* 三态车体（正常 / 第一次老化 / 第二次回返）的唯一外观入口：
     车体 visible、车厢灯强度、以及随车体存在与否的碰撞（另一侧座椅、设备箱）
     全部在这里一起切换；applyAge / applySecondReturn 只改事实再调它。 */
  function applyCarState() {
    const sr = !!state.maint.secondReturn;
    if (anchors.carNormal) anchors.carNormal.visible = !state.aged && !sr;
    if (anchors.carAged) anchors.carAged.visible = state.aged && !sr;
    if (anchors.carSecond) anchors.carSecond.visible = sr;
    if (anchors.lightCarA) {
      anchors.lightCarA.intensity = (!state.aged && !sr) ? 4.6 : 0;
      anchors.lightCarB.intensity = (!state.aged && !sr) ? 4.6 : 0;
    }
    if (anchors.lightAged) {
      anchors.lightAged.intensity = (state.aged && !sr) ? 0.62 : 0;
      anchors.lightAged.color.setHex(state.aged && !sr ? L4_ART.palette.amber : 0xb8935d);
    }
    if (anchors.lightSrA) {
      anchors.lightSrA.intensity = sr ? 18 : 0;
      anchors.lightSrB.intensity = sr ? 12 : 0;
    }
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.srSeat) c.y1 = sr ? 0 : 900;
      else if (c.agedOnly) c.y1 = sr ? 900 : 0;
    }
  }

  function applySecondReturn(on) {
    const m = state.maint;
    m.secondReturn = !!on && m.secondReturn;
    const was = steps.active;
    steps.active = !!on;
    if (on) {
      // 激活瞬间以真实位置为基线：站着不动不会有回声
      resetStepBaseline();
    } else {
      cancelEcho();
      steps.last.valid = false;
    }
    applyCarState();
    if (was !== steps.active) state.stageToken = stageIndex();
  }

  function applyDoor() {
    const t = state.door;
    for (let i = 0; i < doorLeaves.length; i++) {
      const lf = doorLeaves[i];
      // 只有步道侧中门（doorZ=0）真的滑动；其它门叶保持关闭，
      // 免得画面看起来所有门都开了、实际只有中门能过。
      if (lf.doorZ !== 0) { lf.mesh.position.z = lf.baseZ; continue; }
      lf.mesh.position.z = lf.baseZ + lf.direction * 0.86 * t;
    }
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.carDoor) continue;
      if (c.sealed) { c.y1 = 0; continue; }
      c.y1 = t > 0.82 ? 900 : 0;
    }
  }

  function applyAge(aged) {
    state.aged = !!aged;
    if (anchors.battery) anchors.battery.visible = state.aged && !state.batteryTaken;
    if (anchors.key) anchors.key.visible = state.aged && !state.keyTaken;
    applyCarState();
  }

  /* ------------------------------------------------------------ 交互 */
  function V(x, y, z) { return new THREE.Vector3(L4_OX + x, y, z); }

  function segHitsBox(ax, ay, az, bx2, by2, bz2, c) {
    let t0 = 0, t1 = 1;
    const dx = bx2 - ax, dy = by2 - ay, dz = bz2 - az;
    const p = [ax, ay, az], d = [dx, dy, dz];
    const lo = [c.x1, c.y1, c.z1], hi = [c.x2, c.y2, c.z2];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) {
        if (p[i] < lo[i] || p[i] > hi[i]) return false;
      } else {
        const inv = 1 / d[i];
        let ta = (lo[i] - p[i]) * inv, tb = (hi[i] - p[i]) * inv;
        if (ta > tb) { const tt = ta; ta = tb; tb = tt; }
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
        if (t0 > t1) return false;
      }
    }
    return true;
  }

  // skip: 允许排除“就是目标自身”的碰撞盒（车门门扇本身、托盘/架子），其余遮挡照旧生效
  function hasLineOfSight(ax, ay, az, bx2, by2, bz2, skip) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.y1 == null || c.y1 >= 900) continue;
      if (skip && skip.indexOf(c) >= 0) continue;
      // 目标点就在这个盒子内部时不算遮挡（物品放在托盘/架子上）
      if (bx2 > c.x1 && bx2 < c.x2 && bz2 > c.z1 && bz2 < c.z2 && by2 > c.y1 && by2 < c.y2) continue;
      if (segHitsBox(ax, ay, az, bx2, by2, bz2, c)) return false;
    }
    return true;
  }

  function nearestInteractable() {
    if (state.paused) return null;
    const cam = ctx.camera;
    if (!cam) return null;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const px = cam.position.x, py = cam.position.y, pz = cam.position.z;
    let best = null, bestScore = Infinity;
    for (let i = 0; i < interactables.length; i++) {
      const it = interactables[i];
      if (!it.enabled()) continue;
      const p = it.pos();
      const dx = p.x - px, dy = p.y - py, dz = p.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > it.reach || dist < 0.001) continue;
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / dist;
      if (dot < AIM_MIN_DOT) continue;
      if (!hasLineOfSight(px, py, pz, p.x, p.y, p.z, it.skip ? it.skip() : null)) continue;
      const score = (1 - dot) * 2 + dist * 0.2;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  function findInteractable(key) {
    for (let i = 0; i < interactables.length; i++) if (interactables[i].key === key) return interactables[i];
    return null;
  }

  function actDoor() {
    state.doorTarget = state.doorTarget > 0.5 ? 0 : 1;
    sfx(state.doorTarget > 0.5 ? 'unlock' : 'door');
    if (state.doorTarget > 0.5) {
      flashMsg('车门滑开了，外面是一条检修步道');
      updateTask();
    }
  }

  function actTorch() {
    if (state.torchOwned) return;
    state.torchOwned = true;
    state.torchOn = true;
    if (anchors.torch) anchors.torch.visible = false;
    if (anchors.torchRing) anchors.torchRing.material = M.steel;
    sfx('clank');
    flashMsg('拾起一只旧手电 · 电量 ' + Math.round(state.torchCharge * 100) + '% · F 开关');
    updateTask();
  }

  function actBattery() {
    if (state.batteryTaken) return;
    state.batteryTaken = true;
    state.spareBattery = 1;
    state.torchCharge = Math.min(1, state.torchCharge + 0.55);
    if (anchors.battery) anchors.battery.visible = false;
    sfx('paper');
    flashMsg('换上备用电池 +55% · 还留着一节');
    updateTask();
  }

  function actKey() {
    if (state.keyTaken) return;
    state.keyTaken = true;
    state.hasKey = true;
    if (anchors.key) anchors.key.visible = false;
    sfx('l4-paper');
    flashMsg('拿到「应急通行钥匙」');
    updateTask();
  }

  function actMaintDoor() {
    const m = state.maint;
    if (!m.unlocked) {
      if (!state.hasKey) { flashMsg('检修门锁着 —— 需要那把应急钥匙'); return false; }
      m.unlocked = true;
      m.doorTarget = 1;
      sfx('unlock');
      flashMsg('钥匙对上了 · 检修门开了');
      updateTask();
      return true;
    }
    m.doorTarget = m.doorTarget > 0.5 ? 0 : 1;
    sfx(m.doorTarget > 0.5 ? 'l4-hatch' : 'door');
    updateTask();
    return true;
  }

  function actBreaker() {
    const m = state.maint;
    if (!m.entered) { flashMsg('得先进到维修间里'); return false; }
    const wasOn = m.breaker > 0.5;
    m.breaker = wasOn ? 0 : 1;
    if (!wasOn) {
      if (!m.powerDone) { m.powerDone = true; flashMsg('配电箱吸合 · 隧道应急灯亮了'); }
      else flashMsg('电闸重新吸合');
      sfx('l4-relay');
    } else {
      flashMsg('电闸断开 · 还能再扳回去');
      sfx('l4-switch');
    }
    applyMaint();
    updateTask();
    return true;
  }

  function buildInteractables() {
    const doorPos = V(CAR.faceIn - 0.02, 1.20, 0);
    const torchPos = V(TORCH_POS.x, TORCH_POS.y + 0.05, TORCH_POS.z);
    const batPos = V(BAT_POS.x, BAT_POS.y, BAT_POS.z);
    const keyPos = V(KEY_POS.x, KEY_POS.y, KEY_POS.z);
    interactables.push({
      key: 'door', label: '车门', pos: () => doorPos, reach: 2.6,
      enabled: () => true,
      // 只排除当前中门自己的门扇盒：车内出生点朝门看，视线不会先撞到这扇门
      skip: () => doorBlockers.filter((c) => c.doorZ === 0),
      hint: () => (state.doorTarget > 0.5 ? '按 E 关闭车门' : '按 E 打开车门'),
      act: actDoor,
    });
    interactables.push({
      key: 'torch', label: '旧手电', pos: () => torchPos, reach: TORCH_REACH,
      enabled: () => !state.torchOwned,
      hint: () => '按 E 拾取旧手电',
      act: actTorch,
    });
    interactables.push({
      key: 'battery', label: '备用电池', pos: () => batPos, reach: PICK_REACH,
      enabled: () => state.aged && !state.batteryTaken,
      hint: () => '按 E 拾取备用电池',
      act: actBattery,
    });
    interactables.push({
      key: 'key', label: '应急通行钥匙', pos: () => keyPos, reach: PICK_REACH,
      enabled: () => state.aged && !state.keyTaken,
      hint: () => '按 E 拾取应急通行钥匙',
      act: actKey,
    });
    // 步道左墙上的检修门：必须走到近处、朝它看、且手里有钥匙
    const maintDoorPos = V(WALK_X1 - 0.05, 1.12, ROOM.cz);
    interactables.push({
      key: 'maintdoor', label: '检修门', pos: () => maintDoorPos, reach: 2.8,
      enabled: () => state.aged,
      hint: () => {
        const m = state.maint;
        if (!m.unlocked) return state.hasKey ? '按 E 用应急钥匙开门' : '锁着：需要应急通行钥匙';
        return m.doorTarget > 0.5 ? '按 E 关上检修门' : '按 E 打开检修门';
      },
      skip: () => colliders.filter((c) => c.maintDoor),
      act: actMaintDoor,
    });
    // 配电箱电闸：进房后可反复扳动
    const breakerPos = V(ROOM.breaker.x - 0.07, ROOM.breaker.y, ROOM.breaker.z);
    interactables.push({
      key: 'breaker', label: '配电箱', pos: () => breakerPos, reach: 1.9,
      enabled: () => state.maint.entered,
      hint: () => (state.maint.breaker > 0.5 ? '按 E 断开电闸' : '按 E 合上电闸'),
      act: actBreaker,
    });
  }

  /* ------------------------------------------------------------ 阶段表
     目标与异常都由这一张表决定：表里每一项是"这一阶段要做什么"，
     完成条件是本 run 内的单次事实（跨环保留、R 清回）。后续第三/四轮
     回返、破局阶段只需要在这里追加条目，不必再往 updateTask 里叠分支。 */
  const FLOW = [
    { id: 'approach', task: '沿同一条隧道向前走', ok: () => state.aged },
    { id: 'salvage', task: '上车清点还能用的东西', ok: () => state.batteryTaken && state.keyTaken },
    { id: 'unlock', task: '用应急钥匙打开检修门', ok: () => state.maint.unlocked },
    { id: 'enter', task: '进入维修间', ok: () => state.maint.entered },
    { id: 'power', task: '恢复配电箱供电', ok: () => state.maint.powerDone },
    { id: 'return2', task: '沿亮起的应急灯查看隧道', ok: () => state.maint.secondReturn },
    { id: 'witness', task: '进入车厢检查变化', ok: () => state.maint.carInspected },
  ];

  /* 阶段只看事实，不做 push：单次事实一旦成立就不会回退，
     所以反向穿缝、反复开关电闸、重复互动都不会把阶段刷回去。 */
  function stageIndex() {
    let i = 0;
    while (i < FLOW.length && FLOW[i].ok()) i++;
    return i;
  }

  function stageId() {
    const i = stageIndex();
    return i < FLOW.length ? FLOW[i].id : 'beyond';
  }

  /* ------------------------------------------------------------ 任务文案 */
  function updateTask() {
    if (!state.torchOwned) {
      setTask(state.door > 0.5 ? '在门外找到手电' : '打开步道侧车门');
      return;
    }
    const i = stageIndex();
    setTask(i < FLOW.length ? FLOW[i].task : '继续探索');
  }

  /* 第二次回返资格：必须真的进过维修间并且完成过一次供电。
     只进门没送电不算；电闸当前开关状态另存，误关不会弄丢资格（不软锁）。 */
  function secondReturnReady() {
    const m = state.maint;
    return !!(m.unlocked && m.entered && m.powerDone);
  }

  /* ------------------------------------------------------------ 接缝 */
  function wrapFx(forward) {
    // 跨缝瞬间**不发声**：任何音效（哪怕很轻）都会把接缝暴露给耳朵，
    // 而这次回返要的就是"走过去才发现列车变了"。异变也只在这一刻发生一次。
    if (forward && !state.aged) {
      // 第一次正向回返：在 26m 外的不可见处换成本关异常版本（只切 visible + 灯参数）
      applyAge(true);
      updateTask();
    } else if (forward && state.aged && !state.maint.secondReturn && secondReturnReady()) {
      // 第二次回返：完成过维修间/供电的玩家，下一次正向穿缝才推进一次。
      // 反向穿缝、原地抖动、没做前置操作都不会触发。
      state.maint.secondReturn = true;
      applySecondReturn(true);
      updateTask();
    }
  }

  function updateSeam() {
    const p = ctx.player;
    const z = p.z, prev = seamState.prevZ;
    if (z > Z_SEAM_F + SEAM_BAND) seamState.armedF = true;
    if (z < Z_SEAM_B - SEAM_BAND) seamState.armedB = true;
    let shift = 0;
    if (seamState.armedF && prev > Z_SEAM_F && z <= Z_SEAM_F) {
      p.z = z + WRAP;
      shift = WRAP;
      seamState.armedF = false;
      seamState.armedB = true;
      seamState.crossings++;
      seamState.forward++;
      state.carSeen = false;
    } else if (seamState.armedB && prev < Z_SEAM_B && z >= Z_SEAM_B) {
      p.z = z - WRAP;
      shift = -WRAP;
      seamState.armedB = false;
      seamState.armedF = true;
      seamState.crossings++;
      seamState.back++;
      state.carSeen = false;
    }
    seamState.prevZ = p.z;
    if (shift !== 0) {
      seamState.lastShift = shift;
      // 接缝不当作一次"大位移落脚"：把基线重设到平移后的真实位置，
      // 这样穿缝后既不会补一串脚步，也不会因为坐标跳变而漏掉下一脚。
      resetStepBaseline();
      // 只把相机沿 z 平移同一个距离：保留步态 bob 的 Y、朝向与其它轴。
      // 若在这里调 syncCamera，会把 Y 重设成"脚底 + 眼高"，接缝帧会丢掉 bob，
      // 造成一次轻微的镜头上下一跳 —— 无缝回返不能有这个。
      if (ctx.camera) ctx.camera.position.z += shift;
      else if (ctx.syncCamera) ctx.syncCamera();
      wrapFx(shift > 0);
    }
  }

  /* ------------------------------------------------------------ 帧更新 */
  function update(dt) {
    if (!state.entered || state.paused) return;
    const step = dt > 0.1 ? 0.1 : dt;

    // 手电电量：只有开着且关卡在推进时才消耗（暂停/失锁不会走到这里）
    if (state.torchOwned && state.torchOn) {
      state.torchCharge = Math.max(0, state.torchCharge - step / TORCH_BURN);
      if (state.torchCharge <= 0) {
        if (state.spareBattery > 0) {
          // 备用电池是真消耗品：一次性自动换上，不虚报也不无限续
          state.spareBattery = 0;
          state.torchCharge = 0.55;
          state.torchOn = true;
          sfx('l4-switch');
          flashMsg('换上最后一节备用电池 · 手电又亮了');
        } else {
          state.torchCharge = 0;
          state.torchOn = false;
          sfx('l4-switch');
          flashMsg('手电暗了 —— 车厢那边还有一点应急光');
        }
        updateTask();
      }
    }

    // 车门电机
    if (state.door !== state.doorTarget) {
      const d = state.doorTarget - state.door;
      const dv = step * 1.7;
      state.door = Math.abs(d) <= dv ? state.doorTarget : state.door + Math.sign(d) * dv;
      applyDoor();
    }

    // 维修间门电机（同一套缓动，开到位才放行碰撞）
    const mm = state.maint;
    if (mm.door !== mm.doorTarget) {
      const d = mm.doorTarget - mm.door;
      const dv = step * 1.9;
      mm.door = Math.abs(d) <= dv ? mm.doorTarget : mm.door + Math.sign(d) * dv;
      applyMaint();
    }

    // 进过维修间（一次性事实）：门开到能过人、人真的跨过门洞内表面
    if (!mm.entered && mm.door > 0.6) {
      const lx = ctx.player.x - L4_OX;
      if (lx < WALK_X1 - 0.34 && ctx.player.z > ROOM.z1 && ctx.player.z < ROOM.z2) {
        mm.entered = true;
        sfx('l4-paper');
        flashMsg('维修间 · 配电箱还挂着');
        updateTask();
      }
    }

    // 通电后的设备运转声（按游戏时间节拍，不按真实时钟；暂停时不推进）
    if (mm.breaker > 0.5) {
      const lx = ctx.player.x - L4_OX;
      mm.humT -= step;
      if (mm.humT <= 0 && lx < WALK_X1 + 2.2) {
        sfx('l4-vent', { gain: 0.26 });
        mm.humT = 3.4;
      }
    }

    // 延迟脚步：只在第二次回返后，从真实落脚事件排队而来。
    // 每个队列事件 = 一组同步足音，延时完全由这个队列掌握（音频层不再自己延后），
    // 所以暂停/离关/复位时清空队列并取消已排声源就等于"戛然而止"。
    if (steps.active && steps.queue.length) {
      for (let i = steps.queue.length - 1; i >= 0; i--) {
        const q = steps.queue[i];
        q.t -= step;
        if (q.t <= 0) {
          sfx('l4-step-echo', { pan: q.pan, gain: q.gain });
          steps.queue.splice(i, 1);
          steps.emitted++;
        }
      }
    }

    // 第二次回返后：必须真的走进车厢、并顺着车长看向整节内景，才算"检查完"。
    // 站在车外隔着窗看、或进车后对着墙，都不判完成。
    if (mm.secondReturn && !mm.carInspected) {
      const p = ctx.player;
      const cam = ctx.camera;
      if (cam && isFinite(p.x) && isFinite(p.z)) {
        const lx = p.x - L4_OX;
        const inside = lx > CAR.xin + 0.25 && lx < CAR.xout - 0.25 && Math.abs(p.z) < CAR.len - 0.60;
        if (inside) {
          cam.getWorldDirection(tmpDir);
          if (Math.abs(tmpDir.z) > 0.55) {
            mm.carInspected = true;
            flashMsg('整节车厢都是新的 · 不该在这趟车上');
            updateTask();
          } else if (!mm.lookHint) {
            mm.lookHint = true;
            flashMsg('车里亮着灯 · 顺着车长看过去');
          }
        }
      }
    }

    // 接缝
    if (seamState.skip) {
      seamState.skip = false;
      seamState.prevZ = ctx.player.z;
    } else {
      updateSeam();
    }

    // 走近异常车厢时更新一次任务文案
    if (state.aged && !state.carSeen) {
      const p = ctx.player;
      if (Math.abs(p.z) < 13 && p.x - L4_OX < -1.8) {
        state.carSeen = true;
        updateTask();
      }
    }

    // 两件都拿到：只给一次轻提示，不结算
    if (state.aged && state.batteryTaken && state.keyTaken && !state.itemHintShown) {
      state.itemHintShown = true;
      flashMsg('收好电池和钥匙，继续探索');
    }

    focus = nearestInteractable();
  }

  /* ------------------------------------------------------------ 交互入口 */
  /* 宿主真实落脚事件 → 延迟脚步候选。只在第二次回返后生效；
     用实际位移过滤（推墙/原地抖动不新增），存停步上限。 */
  function onFootstep(ev) {
    if (!state.entered || state.paused) return false;
    if (!steps.active) return false;
    if (!ev || ev.grounded === false) return false;
    const x = ev.x, z = ev.z;
    if (!isFinite(x) || !isFinite(z)) return false;
    if (steps.last.valid) {
      if (Math.hypot(x - steps.last.x, z - steps.last.z) < steps.minMove) { steps.rejected++; return false; }
    }
    steps.last.x = x; steps.last.z = z; steps.last.valid = true;
    if (steps.queue.length >= steps.maxPending) { steps.rejected++; return false; }
    // 声源在偏前方远处：声像按侧向偏移给，音量按距离衰减
    const media = rand() * 1.8 - 0.9;
    const pan = Math.max(-1, Math.min(1, media / 2.2));
    const dist = 2.6 + rand() * 1.2;
    const gain = 0.34 + 0.30 * Math.max(0, 1 - dist / 12);
    const t = steps.delayMin + rand() * (steps.delayMax - steps.delayMin);
    steps.queue.push({ t: t, pan: pan, gain: gain });
    return true;
  }

  function interact() {
    if (!state.entered || state.paused) return false;
    const it = nearestInteractable();
    if (!it) return false;
    // 动作自己会拒绝（没钥匙 / 没进房 / 超出）时返回 false，负对照才测得出
    return it.act() !== false;
  }

  function getHint() {
    if (!state.entered || state.paused) return '';
    const it = focus || nearestInteractable();
    return it ? it.hint() : '';
  }

  /* ------------------------------------------------------------ 建立 / 进出 */
  function ensureBuilt() {
    if (built) return;
    built = true;
    buildMaterials();
    buildTunnelShell();
    buildNormalCar();
    buildAgedCar();
    buildPickups();
    buildTorch();          // 门外那只实体手电（不建 = 只能"捡空气"，视觉缺失）
    buildInteractables();
    buildMaintRoom();      // 维修间：桶内几何，必须在 flushBuckets 之前
    flushBuckets();
    buildColliders();
    buildBreakerLever();   // 电闸拉杆 + 供电灯（直接建 mesh，不入桶）
    buildSecondCar();      // 第二次回返的整节车厢内景（预建，按车体状态整体显隐）

    // 固定灯池：数量定死，运行时只改强度（不增删灯 => 不重编译 shader）
    anchors.lightCarA = addLight(0xe6eef6, 4.6, 11, 0, 2.20, -4.6, 'l4-car-light-a');
    anchors.lightCarB = addLight(0xe6eef6, 4.6, 11, 0, 2.20, 4.6, 'l4-car-light-b');
    anchors.lightDoor = addLight(0xb8935d, 0.34, 8, -2.50, 1.55, 0.0, 'l4-door-glow');
    anchors.lightAged = addLight(0xb8935d, 0, 7, 0, 2.10, 0.4, 'l4-aged-glow');
    // 位置按"压低顶棚那半节"与"近端半节"分布：远端必须能被看见，
    // 否则玩家进车后看不到最明显的空间异常。
    anchors.lightSrA = addLight(0xd6ecdf, 0, 13.0, 0, srCeilYAt(-6.0) - 0.22, -6.00, 'l4-second-light-a');
    anchors.lightSrB = addLight(0xcfe6da, 0, 12.5, 0, SR_CEIL[3].y - 0.20, 3.10, 'l4-second-light-b');

    group.traverse(o => {
      if (o.isLight || o.isMesh) {
        o.layers.set(TUNNEL_LAYER);
        if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
      }
    });

    applyDoor();
    applyAge(false);
    applyMaint();
    applySecondReturn(false);
    ctx.scene.add(group);
  }

  function spawnPose() {
    return {
      x: L4_OX + 0.0, y: CAR.floor, z: 0,
      yaw: Math.PI / 2, pitch: 0,
    };
  }

  function enter() {
    ensureBuilt();
    group.visible = true;
    state.entered = true;
    state.paused = false;
    const p = ctx.player;
    const pose = spawnPose();
    p.x = pose.x; p.y = pose.y; p.z = pose.z; p.vy = 0;
    if (p.grounded !== undefined) p.grounded = true;
    if (ctx.setView) ctx.setView(pose.yaw, pose.pitch);
    seamState.prevZ = p.z;
    seamState.skip = true;
    seamState.armedF = true;
    seamState.armedB = true;
    applyDoor();
    applyAge(state.aged);
    applyMaint();
    applySecondReturn(state.maint.secondReturn);
    if (ctx.syncCamera) ctx.syncCamera();
    updateTask();
  }

  function leave() {
    state.entered = false;
    state.paused = false;
    group.visible = false;
    // 离关清掉待播脚步并取消已排声源：不带到下一次进入，也不留残留音
    cancelEcho();
    steps.last.valid = false;
  }

  function reset() {
    state.paused = false;
    state.aged = false;
    state.torchOwned = false;
    state.torchOn = false;
    state.torchCharge = 1;
    state.spareBattery = 0;
    state.hasKey = false;
    state.batteryTaken = false;
    state.keyTaken = false;
    state.door = 0;
    state.doorTarget = 0;
    state.carSeen = false;
    state.itemHintShown = false;
    state.entered = true;
    // 维修间与第二次回返：完整清回初始（未拾取、未操作、门关、电闸断开）
    const m = state.maint;
    m.unlocked = false; m.door = 0; m.doorTarget = 0;
    m.entered = false; m.powerDone = false; m.breaker = 0;
    m.secondReturn = false; m.carInspected = false; m.lookHint = false; m.humT = 0;
    cancelEcho();
    steps.active = false;
    steps.last.x = 0; steps.last.z = 0; steps.last.valid = false;
    steps.emitted = 0; steps.rejected = 0;
    seamState.crossings = 0;
    seamState.forward = 0;
    seamState.back = 0;
    seamState.lastShift = 0;
    seamState.skip = true;
    seamState.armedF = true;
    seamState.armedB = true;
    if (anchors.torch) anchors.torch.visible = true;
    if (anchors.torchRing) anchors.torchRing.material = M.emergency;
    applyDoor();
    applyAge(false);
    applyMaint();
    applySecondReturn(false);
    updateTask();
  }

  /* ------------------------------------------------------------ 手电状态（唯一来源） */
  function setTorch(v) {
    if (!state.torchOwned) { state.torchOn = false; return false; }
    if (v && state.torchCharge <= 0) { flashMsg('手电没电了，回车厢找备用电池'); return false; }
    state.torchOn = !!v;
    sfx('l4-switch');
    return true;
  }

  function toggleTorch() {
    if (!state.torchOwned) { flashMsg('这里太黑，先找到能用的手电'); return false; }
    return setTorch(!state.torchOn);
  }

  function beamFactor() {
    if (!state.torchOn) return 0;
    return state.torchCharge > 0.15 ? 1 : 0.72;
  }

  /* ------------------------------------------------------------ 对外 */
  const api = {
    ox: L4_OX, level: L4_LEVEL, layer: TUNNEL_LAYER,
    layout: L4_LAYOUT, seam: L4_SEAM,
    group: group, colliders: colliders, bounds: {
      // 侧壁就是 x=ROOM.x1（维修间后墙内表面）/ x=TROUGH_X：这里给真实内表面，
      // 宿主会再减半径，RADIUS=0.35 时圆心正好停在墙前，不会贴边穿墙（不能重复扣半径）。
      // 步道左墙（除检修门洞外）由 tunnelWall 碰撞体拦住，所以放宽到维修间并不会穿墙。
      x1: L4_OX + ROOM.x1, x2: L4_OX + TROUGH_X,
      z1: Z_FAR + 2.0, z2: Z_NEAR - 2.0,
    },
    doorLeaves: doorLeaves,
    lights: lights, anchors: anchors, interactables: interactables, state: state,
    seamState: seamState,
    ensureBuilt: ensureBuilt,
    enter: enter, leave: leave, reset: reset, update: update,
    interact: interact, getHint: getHint,
    groundAt: groundAt, ceilingAt: ceilingAt, ceilingRaw: ceilingRaw,
    spawnPose: spawnPose,
    setPaused: function (v) {
      const was = state.paused;
      state.paused = !!v;
      if (state.paused) {
        focus = null;
        cancelEcho();          // 暂停即静音：已排出的错位脚步立刻取消
      } else if (was) {
        // 恢复：以当前真实位置重建基线，恢复瞬间不会凭空补一脚
        resetStepBaseline();
      }
    },
    // 手电
    setTorch: setTorch, toggleTorch: toggleTorch, beamFactor: beamFactor,
    // 诊断/测试用的显式动作
    act: function (key) {
      const it = findInteractable(key);
      if (!it || !it.enabled()) return false;
      it.act();
      return true;
    },
    setCarDoor: function (v) {
      state.door = state.doorTarget = v > 0.5 ? 1 : 0;
      applyDoor();
    },
    setAge: function (v) { applyAge(!!v); updateTask(); },
    // 延迟脚步：宿主在真实落脚时通知；返回是否入队（便于测试断言）
    onFootstep: onFootstep,
    stage: stageId,
    readyForSecond: secondReturnReady,
    stageIndex: stageIndex,
    flowIds: function () { return FLOW.map(function (f) { return f.id; }); },
    steps: steps,
    maint: state.maint,
    /* 第二回返整车（供回归做真实网格射线/包围盒检查） */
    secondCar: {
      group: function () { return anchors.carSecond || null; },
      windows: function () { return anchors.srWindows || null; },
      ceiling: function () { return SR_CEIL; },
      minHead: SR_FLOOR_HEAD,
      box: function () { return anchors.srBox || null; },
      ceilYAt: srCeilYAt,
      /* 车外/车内两套材质的真实引用（材质在建关时才生成，故这里是取值函数） */
      mats: function () {
        return { shell: M.agedEnamel, liner: M.srPanel, ceilLiner: M.srCeil, trim: M.srTrim, glass: M.glass };
      },
    },
    carVisible: function () {
      return {
        normal: !!(anchors.carNormal && anchors.carNormal.visible),
        aged: !!(anchors.carAged && anchors.carAged.visible),
        second: !!(anchors.carSecond && anchors.carSecond.visible),
      };
    },
    // 诊断专用（正常游玩不调用）：给测试/取证一个不依赖自然节奏的入口
    debugState: function (opts) {
      opts = opts || {};
      const m = state.maint;
      if (opts.aged) { applyAge(true); }
      if (opts.unlock) { m.unlocked = true; }
      if (opts.open) { m.door = m.doorTarget = 1; }
      if (opts.close) { m.door = m.doorTarget = 0; }
      if (opts.enterRoom) { m.entered = true; }
      // 诊断专用：把拾取事实一次性补齐，便于阶段表回归
      if (opts.items) { state.batteryTaken = true; state.keyTaken = true; state.hasKey = true; }
      if (opts.power) { m.breaker = 1; m.powerDone = true; }
      if (opts.powerOff) { m.breaker = 0; }
      if (opts.secondReturn) { m.secondReturn = true; applySecondReturn(true); }
      // 诊断专用：中门开合（取证图要看清完整车门，不需要玩家先按 E）
      if (opts.carDoor !== undefined) {
        state.door = state.doorTarget = opts.carDoor ? 1 : 0;
        applyDoor();
      }
      if (opts.windowSeen || opts.carInspected) { m.carInspected = true; }
      // 诊断专用：给取证图开手电（正常游玩靠玩家在车门处拾取）
      if (opts.torch) { state.torchOwned = true; state.torchCharge = 1; setTorch(true); }
      applyMaint();
      updateTask();
      return {
        unlocked: m.unlocked, door: m.door, entered: m.entered,
        powerDone: m.powerDone, breaker: m.breaker,
        secondReturn: m.secondReturn, carInspected: m.carInspected,
        stepsActive: steps.active, pending: steps.queue.length,
      };
    },
    // 让测试用可控的伪随机：延迟脚步的抖动不影响断言
    _rand: function (fn) { rand = fn; },
    diag: function () {
      const m = state.maint;
      return {
        aged: state.aged, torchOwned: state.torchOwned, torchOn: state.torchOn,
        charge: state.torchCharge, spare: state.spareBattery, key: state.hasKey,
        door: state.door, crossings: seamState.crossings,
        forward: seamState.forward, back: seamState.back,
        z: ctx.player.z, x: ctx.player.x, paused: state.paused,
        maint: {
          unlocked: m.unlocked, door: Math.round(m.door * 100) / 100,
          entered: m.entered, powerDone: m.powerDone, breaker: m.breaker,
          secondReturn: m.secondReturn, carInspected: m.carInspected,
        },
        steps: {
          active: steps.active, pending: steps.queue.length,
          emitted: steps.emitted, rejected: steps.rejected,
        },
      };
    },
    // 兼容宿主既有调用点（不再有记录卡/最终门）
    closeCard: function () {},
    readCard: function () { return false; },
  };

  Object.defineProperty(api, 'cardOpen', { get: function () { return false; } });
  Object.defineProperty(api, 'paused', { get: function () { return state.paused; } });
  Object.defineProperty(api, 'built', { get: function () { return built; } });
  Object.defineProperty(api, 'lightCount', { get: function () { return lights.length; } });
  Object.defineProperty(api, 'artLighting', { get: function () { return L4_ART.lighting; } });
  Object.defineProperty(api, 'artPalette', { get: function () { return L4_ART.palette; } });
  Object.defineProperty(api, 'artReady', { get: function () { return artReady || Promise.resolve(); } });
  Object.defineProperty(api, 'torchOwned', { get: function () { return state.torchOwned; } });
  Object.defineProperty(api, 'torchOn', { get: function () { return state.torchOn; } });
  Object.defineProperty(api, 'torchCharge', { get: function () { return state.torchCharge; } });
  Object.defineProperty(api, 'hasKey', { get: function () { return state.hasKey; } });
  Object.defineProperty(api, 'spareBattery', { get: function () { return state.spareBattery; } });
  Object.defineProperty(api, 'aged', { get: function () { return state.aged; } });
  Object.defineProperty(api, 'focus', { get: function () { return focus; } });
  Object.defineProperty(api, 'renderInfo', {
    get: function () {
      let meshes = 0, tris = 0;
      const mats = new Set();
      group.traverse(function (o) {
        if (!o.isMesh) return;
        meshes++;
        if (o.material) mats.add(o.material);
        if (o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          tris += o.geometry.attributes.position.count / 3;
        }
      });
      return {
        meshes: meshes, materials: mats.size, colliders: colliders.length,
        lights: lights.length, triangles: Math.round(tris),
      };
    },
  });

  return api;
}
