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
  doorZ: 0,
  torch: TORCH_POS,
  battery: BAT_POS,
  key: KEY_POS,
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
  };

  const seamState = {
    prevZ: 0, armedF: true, armedB: true, skip: true,
    crossings: 0, forward: 0, back: 0, lastShift: 0,
  };

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
  }

  /* ------------------------------------------------------------ 隧道 */
  function buildTunnelShell() {
    const z1 = Z_FAR, z2 = Z_NEAR, len = z2 - z1, zc = (z1 + z2) / 2;

    // 检修步道 + 轨槽（连续长条：UV 以自身起点为锚，位移 84/3=28 格仍同相）
    span('walkway', WALK_X1, WALK_X2, -0.62, WALK_Y, z1, z2, TILE);
    span('concrete', WALK_X2, TROUGH_X, -1.02, TROUGH_Y, z1, z2, TILE);

    // 排水沟（沿墙，略低于步道面）
    span('steel', -3.88, -3.60, -0.06, -0.004, z1, z2, TILE);

    // 侧墙
    span('concrete', WALK_X1 - 0.22, WALK_X1, -0.62, 2.45, z1, z2, TILE);
    span('concrete', TROUGH_X, TROUGH_X + 0.22, TROUGH_Y, 2.45, z1, z2, TILE);

    // 拱形衬砌：两侧起拱 + 平顶
    slab('concrete', WALK_X1, 2.45, -2.86, CEIL_Y, zc, len, 0.24, TILE);
    slab('concrete', -2.86, CEIL_Y, 1.46, CEIL_Y, zc, len, 0.24, TILE);
    slab('concrete', 1.46, CEIL_Y, TROUGH_X, 2.45, zc, len, 0.24, TILE);

    // 电缆托架 + 线束（沿全程）
    span('steel', WALK_X1 + 0.02, WALK_X1 + 0.32, 1.99, 2.04, z1, z2, TILE);
    span('steel', WALK_X1 + 0.02, WALK_X1 + 0.32, 2.36, 2.41, z1, z2, TILE);
    cyl('rubber', 0.048, len, WALK_X1 + 0.15, 2.10, zc, 'z', TILE, 8);
    cyl('rubber', 0.040, len, WALK_X1 + 0.25, 2.14, zc, 'z', TILE, 8);
    cyl('rubber', 0.032, len, WALK_X1 + 0.08, 2.18, zc, 'z', TILE, 8);
    cyl('rubber', 0.030, len, WALK_X1 + 0.18, 2.47, zc, 'z', TILE, 8);

    // 钢轨（视觉；轨槽面才是碰撞地面）
    span('steel', -0.82, -0.74, -0.46, -0.30, z1, z2, TILE);
    span('steel', 0.74, 0.82, -0.46, -0.30, z1, z2, TILE);

    // 按模数重复的细节：环肋 / 托架 / 篦子 / 反光片 / 枕木 / 扣件
    for (let z0 = z1; z0 < z2 - 0.01; z0 += MOD) {
      bx('concrete', 0.12, 3.07, 0.18, WALK_X1 + 0.06, 0.915, z0, 2);
      bx('concrete', 0.12, 3.00, 0.18, TROUGH_X - 0.06, 0.95, z0, 2);
      slab('concrete', WALK_X1, 2.45, -2.86, CEIL_Y, z0, 0.18, 0.22, 2);
      slab('concrete', -2.86, CEIL_Y, 1.46, CEIL_Y, z0, 0.18, 0.22, 2);
      slab('concrete', 1.46, CEIL_Y, TROUGH_X, 2.45, z0, 0.18, 0.22, 2);

      bx('steel', 0.34, 0.05, 0.10, WALK_X1 + 0.17, 1.965, z0, 2);
      bx('steel', 0.05, 0.30, 0.06, WALK_X1 + 0.03, 2.20, z0, 2);
      bx('steel', 0.30, 0.02, 0.56, -3.74, 0.006, z0 + 1.20, 2);
      bx('emergency', 0.02, 0.09, 0.22, WALK_X1 + 0.02, 1.06, z0 + 3.00, 2);

      bx('steel', 2.80, 0.10, 0.24, 0.20, -0.50, z0 + 3.00, 2);
      bx('rust', 0.16, 0.06, 0.10, -0.78, -0.47, z0 + 3.00, 2);
      bx('rust', 0.16, 0.06, 0.10, 0.78, -0.47, z0 + 3.00, 2);
    }

    // 车厢底下：深色裙板，既遮住车底穿模，也当碰撞体（见 buildCarUnderBlock）
    span('steel', CAR.faceIn, CAR.faceOut + 0.02, TROUGH_Y, 0.03, -CAR.len - 0.2, CAR.len + 0.2, TILE);
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
    const winY1 = 1.30, winY2 = 2.10;      // 步道侧窗带的上下沿（沿用原车窗带高度）
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
      // 均分窗洞：窗间柱 >= 0.36m
      const n = Math.max(1, Math.round((len - 0.36) / 1.60));
      const step = len / n;
      const hw = Math.min(0.62, step / 2 - 0.18);
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
    const winC = [-7.8, -5.0, -2.2, 2.2, 5.0, 7.8], winHW = 0.95, wy1 = 1.28, wy2 = 2.12;
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
    // 驾驶端设备托盘
    addCollider(0.55, 1.10, -9.75, -9.35, 0, 0.98, { kind: 'console' });
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
      // 松脱吊板下方按板下净高给（含玩家半径余量），否则跳跃会穿进板边
      if (z >= LOOSE_PANEL.z1 && z <= LOOSE_PANEL.z2 && lx >= LOOSE_PANEL.x1 && lx <= LOOSE_PANEL.x2) {
        return LOOSE_PANEL.lowY;
      }
      if (Math.abs(z - CAR.sagZ) <= CAR.sagHalf) return CAR.ceilSag;
      return CAR.ceil;
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
    if (anchors.carNormal) anchors.carNormal.visible = !state.aged;
    if (anchors.carAged) anchors.carAged.visible = state.aged;
    if (anchors.battery) anchors.battery.visible = state.aged && !state.batteryTaken;
    if (anchors.key) anchors.key.visible = state.aged && !state.keyTaken;
    if (anchors.lightCarA) {
      anchors.lightCarA.intensity = state.aged ? 0 : 4.6;
      anchors.lightCarB.intensity = state.aged ? 0 : 4.6;
      anchors.lightAged.intensity = state.aged ? 0.62 : 0;
      anchors.lightAged.color.setHex(state.aged ? L4_ART.palette.amber : 0xb8935d);
    }
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
  }

  /* ------------------------------------------------------------ 任务文案 */
  function updateTask() {
    let t;
    if (!state.torchOwned) t = state.door > 0.5 ? '在门外找到手电' : '打开步道侧车门';
    else if (!state.aged) t = '沿同一条隧道向前走';
    else if (!state.batteryTaken || !state.keyTaken) t = '上车清点还能用的东西';
    else t = '继续探索';
    setTask(t);
  }

  /* ------------------------------------------------------------ 接缝 */
  function wrapFx(forward) {
    // 跨缝瞬间**不发声**：任何音效（哪怕很轻）都会把接缝暴露给耳朵，
    // 而这次回返要的就是"走过去才发现列车变了"。异变也只在这一刻发生一次。
    if (forward && !state.aged) {
      // 第一次正向回返：在 26m 外的不可见处换成本关异常版本（只切 visible + 灯参数）
      applyAge(true);
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
  function interact() {
    if (!state.entered || state.paused) return false;
    const it = nearestInteractable();
    if (!it) return false;
    it.act();
    return true;
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
    flushBuckets();
    buildColliders();

    // 固定灯池：数量定死，运行时只改强度（不增删灯 => 不重编译 shader）
    anchors.lightCarA = addLight(0xe6eef6, 4.6, 11, 0, 2.20, -4.6, 'l4-car-light-a');
    anchors.lightCarB = addLight(0xe6eef6, 4.6, 11, 0, 2.20, 4.6, 'l4-car-light-b');
    anchors.lightDoor = addLight(0xb8935d, 0.34, 8, -2.50, 1.55, 0.0, 'l4-door-glow');
    anchors.lightAged = addLight(0xb8935d, 0, 7, 0, 2.10, 0.4, 'l4-aged-glow');

    group.traverse(o => {
      if (o.isLight || o.isMesh) {
        o.layers.set(TUNNEL_LAYER);
        if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
      }
    });

    applyDoor();
    applyAge(false);
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
    if (ctx.syncCamera) ctx.syncCamera();
    updateTask();
  }

  function leave() {
    state.entered = false;
    state.paused = false;
    group.visible = false;
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
      // 侧壁就是 x=WALK_X1 / x=TROUGH_X：这里给真实内边界，宿主会再减半径，
      // RADIUS=0.35 时圆心正好停在 -3.85 / 2.45，不会贴边穿墙（不能重复扣半径）。
      x1: L4_OX + WALK_X1, x2: L4_OX + TROUGH_X,
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
    setPaused: function (v) { state.paused = !!v; if (state.paused) focus = null; },
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
    diag: function () {
      return {
        aged: state.aged, torchOwned: state.torchOwned, torchOn: state.torchOn,
        charge: state.torchCharge, spare: state.spareBattery, key: state.hasKey,
        door: state.door, crossings: seamState.crossings,
        forward: seamState.forward, back: seamState.back,
        z: ctx.player.z, x: ctx.player.x, paused: state.paused,
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
