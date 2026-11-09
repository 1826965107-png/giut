/* ============================================================ 黑影实体（恐怖事件） */
/* 独立建模（不再复用泳池人骨架）：驼背、长臂过膝、左右不对称、炭黑湿织物、暗红小眼。
   移动走 A* 网格路径，撞墙不会穿墙；抓住玩家必须有视线，复位后进入统一惊吓冷却。 */
let entityChasing = false, chaseSpeed = 2.2, chaseLeft = 0, entityUntil = 0;
let entityState = 'idle', searchLeft = 0, gazeT = 0, replanT = 0, entityPath = null, pathIdx = 0;
let horrorCoolUntil = 0;
function horrorCooldownReady() { return performance.now() >= horrorCoolUntil; }
function markHorrorCooldown(ms) { horrorCoolUntil = performance.now() + ms; }

function safeRespawn(level) {
  markHorrorCooldown(5000);
  entityUntil = 0; endChase(); entity.visible = false; entityState = 'idle';
  if (level === 0) {
    player.x = L0_SPAWN.x; player.z = L0_SPAWN.z; player.y = 0; player.vy = 0; player.grounded = true;
    yaw = -Math.PI / 2; pitch = 0;
  } else if (level === 1) {
    player.x = L37_SPAWN.x; player.z = L37_SPAWN.z; player.y = groundAt(L37_SPAWN.x, L37_SPAWN.z);
    player.vy = 0; player.grounded = true; yaw = L37_SPAWN.yaw; pitch = 0;
  } else { respawnToLevelStart(); return; }
  camera.position.set(player.x, player.y + EYE, player.z);
  camera.rotation.set(pitch, yaw, 0);
}

/* ---------------- 导航网格（0.4m，A* 八向 + 视线平滑） ---------------- */
const L0_NAV = (() => {
  const cell = 0.4, x0 = -150, z0 = -24;
  const nx = Math.ceil(86 / cell), nz = Math.ceil(48 / cell);
  const walk = new Uint8Array(nx * nz);
  const pad = 0.42;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = x0 + (ix + 0.5) * cell, z = z0 + (iz + 0.5) * cell;
      let ok = 1;
      for (let i = 0; i < COLLIDERS_L0.length; i++) {
        const c = COLLIDERS_L0[i];
        if (c.y1 != null && c.y1 > 0.75) continue;       // 高处的东西不挡脚
        if (x > c.x1 - pad && x < c.x2 + pad && z > c.z1 - pad && z < c.z2 + pad) { ok = 0; break; }
      }
      walk[iz * nx + ix] = ok;
    }
  }
  return { cell, x0, z0, nx, nz, walk, g: new Float32Array(nx * nz), came: new Int32Array(nx * nz), stamp: new Int32Array(nx * nz), seen: 0 };
})();
function l0Cell(x, z) {
  const ix = Math.floor((x - L0_NAV.x0) / L0_NAV.cell), iz = Math.floor((z - L0_NAV.z0) / L0_NAV.cell);
  if (ix < 0 || iz < 0 || ix >= L0_NAV.nx || iz >= L0_NAV.nz) return -1;
  return iz * L0_NAV.nx + ix;
}
function l0CellCenter(i) {
  const ix = i % L0_NAV.nx, iz = (i - ix) / L0_NAV.nx;
  return { x: L0_NAV.x0 + (ix + 0.5) * L0_NAV.cell, z: L0_NAV.z0 + (iz + 0.5) * L0_NAV.cell };
}
function l0NearestWalkable(x, z) {
  const i = l0Cell(x, z);
  if (i >= 0 && L0_NAV.walk[i]) return i;
  const c = Math.max(1, Math.round(1.5 / L0_NAV.cell));
  let best = -1, bestD = Infinity;
  for (let dz = -c; dz <= c; dz++) {
    for (let dx = -c; dx <= c; dx++) {
      const ix = Math.floor((x - L0_NAV.x0) / L0_NAV.cell) + dx;
      const iz = Math.floor((z - L0_NAV.z0) / L0_NAV.cell) + dz;
      if (ix < 0 || iz < 0 || ix >= L0_NAV.nx || iz >= L0_NAV.nz) continue;
      const j = iz * L0_NAV.nx + ix;
      if (!L0_NAV.walk[j]) continue;
      const cc = l0CellCenter(j), d = Math.hypot(cc.x - x, cc.z - z);
      if (d < bestD) { bestD = d; best = j; }
    }
  }
  return best;
}
function l0Path(sx, sz, tx, tz) {
  const s = l0NearestWalkable(sx, sz), t = l0NearestWalkable(tx, tz);
  if (s < 0 || t < 0) return null;
  const { nx, nz, walk, g, came, stamp } = L0_NAV;
  const tag = ++L0_NAV.seen;
  const heap = [s], hf = [0];
  stamp[s] = tag; g[s] = 0; came[s] = -1;
  const hcost = (i) => {
    const a = i % nx, b = (i - a) / nx, c2 = t % nx, d2 = (t - c2) / nx;
    const dx = Math.abs(a - c2), dz2 = Math.abs(b - d2);
    return (dx + dz2) + (Math.SQRT2 - 2) * Math.min(dx, dz2);
  };
  const push = (i, f) => {
    heap.push(i); hf.push(f);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hf[p] <= hf[k]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const li = heap.pop(), lf = hf.pop();
    if (heap.length) {
      heap[0] = li; hf[0] = lf;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1, r = l + 1;
        let m = k;
        if (l < heap.length && hf[l] < hf[m]) m = l;
        if (r < heap.length && hf[r] < hf[m]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m;
      }
    }
    return top;
  };
  let guard = 0;
  while (heap.length && guard++ < 60000) {
    const cur = pop();
    if (cur === t) break;
    const cx = cur % nx, cz = (cur - cx) / nx;
    for (let dz2 = -1; dz2 <= 1; dz2++) {
      for (let dx2 = -1; dx2 <= 1; dx2++) {
        if (!dx2 && !dz2) continue;
        const ax = cx + dx2, az = cz + dz2;
        if (ax < 0 || az < 0 || ax >= nx || az >= nz) continue;
        const ni = az * nx + ax;
        if (!walk[ni]) continue;
        if (dx2 && dz2 && (!walk[cz * nx + ax] || !walk[az * nx + cx])) continue;   // 不切墙角
        const ng = g[cur] + (dx2 && dz2 ? Math.SQRT2 : 1);
        if (stamp[ni] !== tag) { stamp[ni] = tag; g[ni] = Infinity; came[ni] = -1; }
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ni, ng + hcost(ni)); }
      }
    }
  }
  if (stamp[t] !== tag || (came[t] === -1 && t !== s)) return null;
  const raw = [];
  for (let i = t; i !== -1 && i !== s; i = came[i]) raw.push(i);
  raw.reverse();
  // 视线平滑：能直达的中间点直接跳过
  const out = raw.map(l0CellCenter);
  const smooth = [];
  let i = 0;
  while (i < out.length) {
    let j = out.length - 1, picked = -1;
    const fromX = smooth.length ? smooth[smooth.length - 1].x : sx;
    const fromZ = smooth.length ? smooth[smooth.length - 1].z : sz;
    for (; j > i; j--) {
      if (!segmentBlockedByWalls(fromX, 0.9, fromZ, out[j].x, 0.9, out[j].z)) { picked = j; break; }
    }
    if (picked < 0) picked = i;
    smooth.push(out[picked]);
    i = picked + 1;
  }
  return smooth;
}

/* ---------------- 独立黑影片模型（2.2m，驼背长臂） ---------------- */
function buildBlackFigure() {
  const skinSet = { diffuse: 'textures/monster-skin.png', coverageX: 1.1, coverageY: 1.1 };
  const skin = physicalMat(skinSet, 1.1, 1.1, {
    color: 0x1c1a17, roughness: 0.42, metalness: 0.02,
    clearcoat: 0.28, clearcoatRoughness: 0.5, emissive: 0x050506, emissiveIntensity: 0.6 });
  const cloth = matFor(skinSet, 1.6, 1.6, { color: 0x121211, roughness: 0.55, metalness: 0.0, emissive: 0x030303, emissiveIntensity: 0.5 });
  const hairM = new THREE.MeshStandardMaterial({ map: texFrom('textures/monster-hair.png', 1, 2, true), color: 0x0a0a09, roughness: 0.8 });
  const g = new THREE.Group();
  const R = {};
  const cap = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m);
  // 骨盆 + 弯脊柱（连续体块，不是串珠）+ 胸腔；所有肢体都挂在真实关节父节点上
  R.pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), cloth);
  R.pelvis.scale.set(1.15, 0.85, 0.9); R.pelvis.position.y = 1.16; g.add(R.pelvis);
  R.spine = new THREE.Group(); R.spine.position.set(0, 1.16, 0); g.add(R.spine);
  // 三段脊柱：越往上越前倾（驼背），体块互相重叠保持连续
  const spineSegs = [[0.10, 0.10], [0.27, 0.16], [0.44, 0.22]];
  for (const [y, tilt] of spineSegs) {
    const seg = cap(0.15, 0.13, cloth);
    seg.position.set(0, y, -tilt * 0.20);
    seg.rotation.x = tilt;
    seg.scale.set(1, 1, 0.86);
    R.spine.add(seg);
  }
  R.chest = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), cloth);
  R.chest.scale.set(1.12, 0.86, 0.9); R.chest.position.set(0, 0.58, -0.10); R.spine.add(R.chest);
  // 肩节点：右肩略低、略前（左右不对称）
  R.shoulderL = new THREE.Group(); R.shoulderL.position.set(-0.235, 0.60, -0.08); R.spine.add(R.shoulderL);
  R.shoulderR = new THREE.Group(); R.shoulderR.position.set(0.245, 0.555, -0.05); R.spine.add(R.shoulderR);
  R.head = new THREE.Group();
  R.head.position.set(0, 0.74, -0.20); R.spine.add(R.head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 16), skin);
  skull.scale.set(0.86, 1.12, 1.0); R.head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), skin);
  jaw.scale.set(0.9, 0.7, 0.95); jaw.position.set(0, -0.11, 0.03); R.head.add(jaw);
  // 湿发：额前碎发 + 颈后长发束（各 7 束，滞后摆动）
  R.strands = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.30 + Math.random() * 0.22, 5), hairM);
    const front = i < 7;
    const a = (front ? i / 7 : (i - 7) / 7) * Math.PI * 1.5 - 0.75 + (front ? 0 : Math.PI);
    s.position.set(Math.sin(a) * 0.11, 0.06 - (front ? 0 : 0.10), Math.cos(a) * 0.11 - 0.01);
    s.rotation.set(front ? 0.5 : -0.45, a, (Math.random() - 0.5) * 0.3);
    s.scale.set(1, 1, 0.45); R.head.add(s); R.strands.push(s);
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x120303, emissive: 0x8c1408, emissiveIntensity: 2.4, roughness: 0.3 });
  R.eyes = eyeMat;
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 6), eyeMat);
    e.position.set(s * 0.048, 0.02, 0.117); R.head.add(e);
  }
  // 长臂：肩节点 → 上臂 0.55 → 肘 → 前臂 0.52 → 腕 → 掌 + 五指；指尖落到膝下
  function arm(side) {
    const grp = new THREE.Group();                       // 挂在肩上（父节点 = shoulderL/R）
    grp.rotation.z = side * 0.10;
    grp.rotation.x = 0.12;
    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), cloth);
    shoulderBall.scale.set(1, 0.9, 0.9); grp.add(shoulderBall);
    const upper = cap(0.062, 0.43, skin); upper.position.y = -0.28; grp.add(upper);
    const el = new THREE.Group(); el.position.y = -0.55; grp.add(el);
    const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin); el.add(elbowBall);
    const fore = cap(0.05, 0.42, skin); fore.position.y = -0.27; el.add(fore);
    const wrist = new THREE.Group(); wrist.position.y = -0.52; el.add(wrist);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skin);
    palm.scale.set(1.15, 1.0, 0.55); wrist.add(palm);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const f = cap(0.013, 0.19, skin);
      f.position.set((i - 1.5) * 0.032, -0.115, 0.006);
      f.rotation.x = 0.12 + i * 0.02; wrist.add(f); fingers.push(f);
    }
    const thumb = cap(0.015, 0.10, skin);
    thumb.position.set(side * -0.055, -0.055, 0.02); thumb.rotation.z = side * 0.9; wrist.add(thumb);
    (side < 0 ? R.shoulderL : R.shoulderR).add(grp);
    return { grp, el, wrist, fingers };
  }
  R.armL = arm(-1); R.armR = arm(1);
  // 长腿：髋 1.14 → 膝 0.62 → 踝 0.12 → 脚掌底面 ≈0.02
  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.115, 1.14, 0);
    const thigh = cap(0.085, 0.40, cloth); thigh.position.y = -0.24; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.52; hip.add(knee);
    const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 6), cloth); knee.add(kneeBall);
    const shin = cap(0.062, 0.38, skin); shin.position.y = -0.24; knee.add(shin);
    const ankle = new THREE.Group(); ankle.position.y = -0.50; knee.add(ankle);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.28), skin);
    foot.position.set(0, -0.05, 0.07); ankle.add(foot);
    g.add(hip);
    return { hip, knee, ankle };
  }
  R.legL = leg(-1); R.legR = leg(1);
  g.userData.rig = R; g.userData.skin = skin; g.userData.eyes = eyeMat; g.userData.hair = hairM;
  g.userData.anim = { t: 0, stride: 0, twitch: 0 };
  return g;
}
function animateBlackFigure(g, dt, mode) {
  const R = g.userData.rig, A = g.userData.anim;
  A.t += dt;
  const t = A.t;
  if (mode === 'walk' || mode === 'chase') {
    const spd = mode === 'chase' ? 1.85 : 1.0;
    A.stride += (1 - A.stride) * Math.min(1, dt * 3);
    const s = Math.sin(t * 4.4 * spd) * A.stride;
    R.legL.hip.rotation.x = s * 0.52; R.legR.hip.rotation.x = -s * 0.52;
    R.legL.knee.rotation.x = Math.max(0, -s) * 0.7; R.legR.knee.rotation.x = Math.max(0, s) * 0.7;
    // 左臂摆幅小于右臂（不对称）
    R.armL.grp.rotation.x = 0.12 - s * 0.30; R.armR.grp.rotation.x = 0.12 + s * 0.46;
    R.armL.el.rotation.x = -0.22 - Math.max(0, s) * 0.2; R.armR.el.rotation.x = -0.18 - Math.max(0, -s) * 0.24;
    R.spine.rotation.x = mode === 'chase' ? 0.20 : 0.14;
    R.spine.rotation.z = Math.sin(t * 4.4 * spd * 0.5) * 0.03;
    R.head.rotation.x = -0.18 + Math.sin(t * 8.8 * spd) * 0.045;
    R.head.rotation.z = Math.sin(t * 3.1) * 0.05;
  } else if (mode === 'gaze') {
    A.stride *= Math.max(0, 1 - dt * 3);
    R.legL.hip.rotation.x *= 0.9; R.legR.hip.rotation.x *= 0.9;
    R.spine.rotation.x += (0.24 - R.spine.rotation.x) * Math.min(1, dt * 2);
    R.spine.rotation.z = Math.sin(t * 0.7) * 0.02;
    R.head.rotation.x = -0.26 + Math.sin(t * 0.9) * 0.03;
    R.head.rotation.z = 0.07 + Math.sin(t * 0.55) * 0.05;   // 头歪着看
    A.twitch += dt;
    const tw = Math.max(0, Math.sin(A.twitch * 11)) * 0.18;
    for (const f of R.armR.fingers) f.rotation.x = 0.12 + tw;
    R.armL.grp.rotation.x = 0.10; R.armR.grp.rotation.x = 0.14;
    R.armL.el.rotation.x = -0.3; R.armR.el.rotation.x = -0.26;
  } else {
    A.stride *= Math.max(0, 1 - dt * 4);
    R.spine.rotation.x += (0.20 - R.spine.rotation.x) * Math.min(1, dt * 2);
  }
  for (let i = 0; i < R.strands.length; i++) {
    const s = R.strands[i];
    const lag = Math.sin(t * (1.6 + i * 0.13) + i) * 0.05;
    s.rotation.x += ((i < 7 ? 0.5 : -0.45) + lag - s.rotation.x) * Math.min(1, dt * 2.5);
  }
}
const ENTITY_SCALE = 1.05;                 // 骨架局部约 2.07m，整体放大到 ≈2.17m
function makeEntity() {
  const g = buildBlackFigure();
  g.scale.setScalar(ENTITY_SCALE);
  const eyeLight = new THREE.PointLight(0x8c1408, 0.45, 2.4, 2);
  eyeLight.position.set(0, 1.90, 0.14); g.add(eyeLight);
  g.userData.eyeLight = eyeLight;
  return g;
}
const entity = makeEntity();
entity.visible = false;
scene.add(entity);

const ENTITY_POINTS = [[-140, 10], [-122, -7], [-104, 12], [-90, -1], [-128, 17], [-112, -15], [-84, -16], [-69, 1], [-96, 20], [-134, -20]];
function entityFaceTarget(x, z) { entity.rotation.y = Math.atan2(x - entity.position.x, z - entity.position.z); }
function entityLOS() {
  return !segmentBlockedByWalls(player.x, player.y + 1.4, player.z,
    entity.position.x, entity.position.y + 1.6, entity.position.z);
}
function activateEntity(dur, minDist) {
  if (horrorCooldownReady() === false) return;
  const cands = ENTITY_POINTS.filter(p => Math.hypot(p[0] - player.x, p[1] - player.z) >= (minDist || 8));
  if (!cands.length) return;
  // 优先挑玩家当前看不到的点，避免凭空出现
  const hidden = cands.filter(p => segmentBlockedByWalls(player.x, player.y + 1.4, player.z, p[0], 1.6, p[1]));
  const pick = (hidden.length ? hidden : cands)[Math.floor(Math.random() * (hidden.length ? hidden.length : cands.length))];
  entity.position.set(pick[0], 0, pick[1]);
  entity.rotation.set(0, 0, 0);
  entity.scale.setScalar(ENTITY_SCALE);
  entity.visible = true;
  entityState = 'gaze'; gazeT = 0; entityPath = null; pathIdx = 0; replanT = 0;
  entityUntil = performance.now() + (dur || 3) * 1000;
  entityFaceTarget(player.x, player.z);
  synthKnock();
}
function startChase(speed, dur) {
  entityChasing = true; chaseSpeed = speed || 2.2; chaseLeft = dur || 12;
  entity.visible = true; entityState = 'chase'; entityPath = null; pathIdx = 0; replanT = 0;
  markHorrorCooldown(1200);
  document.body.classList.add('chase');
  synthHeartbeat();
}
function endChase() {
  entityChasing = false; chaseLeft = 0;
  if (entityState === 'chase') { entityState = 'search'; searchLeft = 1.5; }
  document.body.classList.remove('chase');
}
function jumpscare() {
  if (!horrorCooldownReady()) return;
  synthScare();
  stats.scares++;
  document.body.classList.add('scare');
  setTimeout(() => document.body.classList.remove('scare'), 620);
  showFlashText('它发现了你……');
  safeRespawn(LEVEL);
  endChase();
  entityState = 'idle';
  entity.visible = false;
  markHorrorCooldown(6500);
}

function openExitDoor() {
  exitPanel.position.y = 2.9;                        // 门板升起
  exitSignMat.emissive.set(0x37ff6e);
  exitSignMat.emissiveIntensity = 2.2;
  exitLight.color.set(0x37ff6e); exitLight.intensity = 7;
}
function showLevelCard(title, sub) {
  const t = document.getElementById('lc-title'), s = document.getElementById('lc-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  const c = document.getElementById('level-card');
  if (!c) return;
  c.classList.add('show');
  setTimeout(() => c.classList.remove('show'), 1900);
}
function showFlashText(msg) {
  const el = document.getElementById('flash-text');
  el.textContent = msg; el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1900);
}

let creakTimer = 0, ambientTimer = 0;
function updateLevel0(dt) {
  hemiL0.intensity = 0.5;
  // 灯管闪动
  for (const L of l0Lights) {
    L.t -= dt;
    if (L.alive && L.t < 0 && Math.random() < 0.02) { L.t = 0.06 + Math.random() * 0.18; L.mat.emissiveIntensity = 0.08; }
    else if (L.t < 0) L.mat.emissiveIntensity += (L.base - L.mat.emissiveIntensity) * Math.min(1, dt * 5);
  }
  // 保险丝 / 电池 浮动
  for (const f of fusesList) { f.mesh.rotation.y += dt * 1.2; f.mesh.position.y = f.y + Math.sin(performance.now() * 0.0025 + f.ph) * 0.02; }
  // 氛围事件
  creakTimer -= dt;
  if (creakTimer <= 0) { creakTimer = 8 + Math.random() * 14; synthCreak(); }
  if (!entityChasing && horrorCooldownReady()) {
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 22 + Math.random() * 20;
      if (entityState === 'idle' && Math.random() < 0.5) activateEntity(2.6, 15);
    }
  }
  const dx = player.x - entity.position.x, dz = player.z - entity.position.z;
  const d = Math.hypot(dx, dz);
  if (entity.visible && entityState === 'gaze') {
    entityFaceTarget(player.x, player.z);
    animateBlackFigure(entity, dt, 'gaze');
    // 玩家正对并看得见 → 发现
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const dot = (d > 0.01) ? (dx * fx + dz * fz) / d : 1;
    if (entityLOS() && dot > 0.55 && d < 15) gazeT += dt; else gazeT = Math.max(0, gazeT - dt * 0.6);
    if (gazeT > 0.9) { showFlashText('它看见你了——跑！'); startChase(2.25, 10); }
    else if (performance.now() > entityUntil) { entityState = 'fade'; entityUntil = performance.now() + 700; }
  } else if (entityState === 'fade') {
    animateBlackFigure(entity, dt, 'idle');
    entity.position.y -= dt * 0.9;
    entity.scale.setScalar(Math.max(0.05, entity.scale.x - dt * 0.9));
    if (performance.now() > entityUntil) { entity.visible = false; entity.position.y = 0; entity.scale.setScalar(ENTITY_SCALE); entityState = 'idle'; }
  } else if (entityChasing) {
    chaseLeft -= dt;
    replanT -= dt;
    if (!entityPath || replanT <= 0) {
      entityPath = l0Path(entity.position.x, entity.position.z, player.x, player.z);
      pathIdx = 0; replanT = 0.45;
    }
    if (entityPath && entityPath.length) {
      const wp = entityPath[Math.min(pathIdx, entityPath.length - 1)];
      const wx = wp.x - entity.position.x, wz = wp.z - entity.position.z;
      const wd = Math.hypot(wx, wz);
      if (wd < 0.28) { pathIdx++; }
      else {
        const step = Math.min(chaseSpeed * dt, wd);
        const nx = entity.position.x + (wx / wd) * step, nz = entity.position.z + (wz / wd) * step;
        const res = collideCircle(nx, nz, 0.32);
        entity.position.x = res.x; entity.position.z = res.z;
      }
    } else {
      // 找不到路径就沿视线方向小步逼近（仍受碰撞约束）
      if (d > 0.001) {
        const step = Math.min(chaseSpeed * dt, d);
        const res = collideCircle(entity.position.x + (dx / d) * step, entity.position.z + (dz / d) * step, 0.32);
        entity.position.x = res.x; entity.position.z = res.z;
      }
    }
    entityFaceTarget(player.x, player.z);
    animateBlackFigure(entity, dt, 'chase');
    if (d < 1.25 && entityLOS()) { jumpscare(); return; }
    if (chaseLeft <= 0) { endChase(); showFlashText('它停下了……消失在墙里'); }
  } else if (entityState === 'search') {
    searchLeft -= dt;
    animateBlackFigure(entity, dt, 'walk');
    entityFaceTarget(player.x, player.z);
    if (searchLeft <= 0) { entityState = 'fade'; entityUntil = performance.now() + 700; }
  }
  // 出口：只有走到东端出口门前才推进关卡
  if (exitUnlocked && player.x < -64.9 && player.x > -68 && Math.abs(player.z) < 1.7 && player.y < 0.6) enterPoolrooms();
}

function enterPoolrooms() {
  if (transitioning) return;
  transitioning = true;
  synthWhoosh();
  document.getElementById('level-fade').style.opacity = '1';
  entity.visible = false;
  entityChasing = false;
  entityState = 'idle';
  document.body.classList.remove('chase');
  setTimeout(() => {
    LEVEL = 1;
    camera.layers.set(0);
    setStationPresentation(false);
    scene.environment = ENV_TEX;
    ACTIVE_COLLIDERS = COLLIDERS; ACTIVE_BOUNDS = BOUNDS;
    scene.fog = new THREE.FogExp2(0xbfc9c4, 0.016);
    scene.background = new THREE.Color(0x0a1014);
    hemi.intensity = 0.5; hemiL0.intensity = 0;
    if (droneNodes) droneNodes.g.gain.value = 0.012;
    poolIntroShown = false; poolDark.active = false; poolDark.timer = 15 + Math.random() * 15;
    applyRoomSound(1); startAmbience(1);
    showLevelCard('LEVEL 37', '泳池层 · 游泳馆');
    skyLight.intensity = 1.15; skyLight.castShadow = true;
    flashLight.castShadow = false;
    resetLockerHorror();
    setPanelDefaults(0.48, 0.36, 0.016);
    lurker.visible = false;
    poolMonster.swim = false; poolMonster.phase = 'stand'; poolMonster.vx = 0; poolMonster.vz = 0;
    wake.visible = false;
    watcher.userData.skin.emissiveIntensity = 0.15;
    watcher.userData.eyes.emissiveIntensity = 1.5;
    watcher.rotation.set(0, 0, 0);
    watcherHome();
    for (const L of poolLights) { L.light.intensity = L.base; if (L.fxMat) L.fxMat.emissiveIntensity = 4.5; }
    player.x = L37_SPAWN.x; player.z = L37_SPAWN.z; player.y = groundAt(L37_SPAWN.x, L37_SPAWN.z); player.vy = 0;
    yaw = L37_SPAWN.yaw; pitch = 0;
    camera.position.set(player.x, player.y + EYE, player.z); camera.rotation.set(pitch, yaw, 0);
    prepareLevelRendering();
    flashlight.on = false; updateFlashHud();
    document.getElementById('v-task').textContent = '泳池层 · 小心池中之物';
    document.getElementById('level-tag').textContent = 'LEVEL 37 · 泳池层';
    showFlashText('Level 37 — 泳池层');
    renderPreparation.then(() => { document.getElementById('level-fade').style.opacity = '0'; transitioning = false; });
  }, 520);
}