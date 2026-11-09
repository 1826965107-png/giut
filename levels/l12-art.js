export const L12_DRAIN_RECTS = [];
const notRects = L12_DRAIN_RECTS;
/* L12 终版美术细件：天花构造、护墙、横梁、灯槽、池沿排水格栅、指示牌、躺椅
 * 约束：全部使用传入材质（不新建图片资产）；网格/线条走实例化；不新增逐帧光源。
 * ctx: { THREE, scene, addBox, addWorldUVBox, COLLIDERS, mats, L12_TEX, pushLight? }
 */

function bx(ctx, ...args) { const m = ctx.addBox(...args); if (m) m.userData.l12art = true; return m; }

function tagMesh(m) { if (m) m.userData.l12art = true; return m; }

export function makeBoardTexture(THREE, lines, opts = {}) {
  const W = opts.px || 512, H = opts.py || 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#2b2f30'; g.fillRect(0, 0, W, H);
  // 深铜灰底 + 细铜色边框
  g.strokeStyle = opts.edge || '#8a7550'; g.lineWidth = 6;
  g.strokeRect(10, 10, W - 20, H - 20);
  const rows = Array.isArray(lines) ? lines : [lines];
  const title = opts.title;
  let y = H * 0.20;
  if (title) {
    g.fillStyle = opts.titleColor || '#f3ead6';
    g.font = `bold ${Math.round(H * 0.17)}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(title, W / 2, y);
    y += H * 0.17;
    g.strokeStyle = 'rgba(200,180,140,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(W * 0.18, y - H * 0.05); g.lineTo(W * 0.82, y - H * 0.05); g.stroke();
    y += H * 0.04;
  }
  g.textAlign = 'left';
  g.fillStyle = opts.text || '#e9e2d2';
  g.font = `${Math.round(H * 0.085)}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
  for (const ln of rows) {
    g.fillText(ln, W * 0.10, y);
    y += H * 0.115;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* 米制 UV：把 PlaneGeometry 的 uv 改成世界米数 / scale */
export function metricPlaneUV(geo, w, h, scale) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) {
    const x = (uv.getX(i) - 0.5) * w;
    const y = (uv.getY(i) - 0.5) * h;
    uv.setXY(i, x / scale, y / scale);
  }
  uv.needsUpdate = true;
  return geo;
}

/* 声学/矿物板天花 + T 型龙骨 + 吸顶灯盘 + 线槽 */
export function panelCeiling(ctx, room, o = {}) {
  const { THREE, scene } = ctx;
  const h = o.h == null ? 3.0 : o.h;
  const w = room.x2 - room.x1, d = room.z2 - room.z1;
  const cx = (room.x1 + room.x2) / 2, cz = (room.z1 + room.z2) / 2;
  const tile = o.tile == null ? 2.0 : o.tile;
  const rep = o.repeat == null ? 0.5 : o.repeat;    // 材质 texture.repeat
  const uvScale = tile * rep;                        // 有效周期 = uvScale / repeat = tile
  const geo = new THREE.PlaneGeometry(w, d, 1, 1);
  metricPlaneUV(geo, w, d, uvScale);
  const mat = o.mat || ctx.mats.ceil;
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = Math.PI / 2;
  plane.position.set(cx, h - 0.02, cz);
  tagMesh(plane); scene.add(plane);

  // T 型龙骨：主龙骨沿 x 每 1.2m 一道，副龙骨沿 z 每 0.6m 一道（实例化）
  const barMat = o.barMat || ctx.mats.boardBar || ctx.mats.trim;
  const mainN = Math.max(1, Math.round(d / 1.2));
  const crossN = Math.max(1, Math.round(w / 0.6));
  const main = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.05, 0.035), barMat, mainN);
  const cross = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.05, d), barMat, crossN);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < mainN; i++) {
    const z = room.z1 + (i + 0.5) * (d / mainN);
    m4.makeTranslation(cx, h - 0.05, z); main.setMatrixAt(i, m4);
  }
  for (let i = 0; i < crossN; i++) {
    const x = room.x1 + (i + 0.5) * (w / crossN);
    m4.makeTranslation(x, h - 0.075, cz); cross.setMatrixAt(i, m4);
  }
  main.instanceMatrix.needsUpdate = true; cross.instanceMatrix.needsUpdate = true;
  tagMesh(main); tagMesh(cross); scene.add(main); scene.add(cross);

  // 吸顶灯盘：灯槽 + 扩散面（不新增点光源，靠现有房间灯）
  const panels = o.panels || [];
  const diffMat = ctx.mats.lightDiffuse || new THREE.MeshStandardMaterial({
    color: 0xf2efe6, emissive: 0xf4efe0, emissiveIntensity: 1.15, roughness: 0.7, side: 2 });
  for (const p of panels) {
    bx(ctx, p.w || 1.2, 0.06, p.d || 0.6, p.x, h - 0.10, p.z, ctx.mats.trim, 1.0);
    const diff = new THREE.Mesh(new THREE.PlaneGeometry((p.w || 1.2) - 0.08, (p.d || 0.6) - 0.08), diffMat);
    diff.rotation.x = Math.PI / 2; diff.position.set(p.x, h - 0.135, p.z); tagMesh(diff); scene.add(diff);
    if (o.cove) {
      // 灯槽：沿灯盘短边两侧的浅槽
      bx(ctx, (p.w || 1.2) + 0.14, 0.10, 0.05, p.x, h - 0.12, p.z - (p.d || 0.6) / 2 - 0.05, ctx.mats.trim, 1.0);
      bx(ctx, (p.w || 1.2) + 0.14, 0.10, 0.05, p.x, h - 0.12, p.z + (p.d || 0.6) / 2 + 0.05, ctx.mats.trim, 1.0);
    }
  }
  // 线槽：沿房间长边一道，带出线盒
  if (o.tray !== false) {
    const tz = room.z1 + 0.45;
    bx(ctx, w - 0.4, 0.10, 0.16, cx, h - 0.16, tz, ctx.mats.metal || ctx.mats.trim, 1.0);
    for (let x = room.x1 + 1.2; x < room.x2 - 0.8; x += 2.4) {
      bx(ctx, 0.18, 0.05, 0.18, x, h - 0.10, tz, ctx.mats.metal || ctx.mats.trim, 1.0);
    }
  }
  return plane;
}

/* 烟熏浅木格栅顶（更衣/接待）：暗底 + 实例化木条 */
export function slatCeiling(ctx, room, o = {}) {
  const { THREE, scene } = ctx;
  const h = o.h == null ? 3.0 : o.h;
  const w = room.x2 - room.x1, d = room.z2 - room.z1;
  const cx = (room.x1 + room.x2) / 2, cz = (room.z1 + room.z2) / 2;
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ctx.mats.ceilDark || ctx.mats.ceil);
  backing.rotation.x = Math.PI / 2; backing.position.set(cx, h - 0.01, cz); tagMesh(backing); scene.add(backing);
  const gap = o.gap || 0.16, sw = o.slat || 0.06;
  const n = Math.max(1, Math.floor(d / gap));
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(w - 0.1, 0.07, sw), ctx.mats.wood, n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m4.makeTranslation(cx, h - 0.06, room.z1 + 0.08 + i * gap);
    slats.setMatrixAt(i, m4);
  }
  slats.instanceMatrix.needsUpdate = true; tagMesh(slats); scene.add(slats);
  // 承载龙骨（两道）
  for (const t of [0.25, 0.75]) {
    bx(ctx, w - 0.08, 0.05, 0.05, cx, h - 0.02, room.z1 + d * t, ctx.mats.trim, 1.0);
  }
  return slats;
}

/* 结构横梁 + 吊杆（池厅） */
export function beamRibs(ctx, room, o = {}) {
  const h = o.h == null ? 4.4 : o.h;
  const cx = (room.x1 + room.x2) / 2;
  const w = room.x2 - room.x1;
  const every = o.every || 6;
  for (let z = room.z1 + every / 2; z < room.z2; z += every) {
    bx(ctx, w - 0.06, 0.34, 0.22, cx, h - 0.19, z, ctx.mats.trim, 1.0);
    bx(ctx, w - 0.06, 0.05, 0.26, cx, h - 0.40, z, ctx.mats.metal || ctx.mats.trim, 1.0);
  }
}

/* 线性嵌入灯槽（自发光带 + 凹槽收边） */
export function linearCove(ctx, o) {
  const { THREE, scene } = ctx;
  const len = o.len, x = o.x, z = o.z, y = o.y, dir = o.dir || 'x';
  bx(ctx, dir === 'x' ? len + 0.1 : 0.20, 0.09, dir === 'x' ? 0.20 : len + 0.1, x, y, z, ctx.mats.trim, 1.0);
  const mat = ctx.mats.coveStrip || new THREE.MeshStandardMaterial({
    color: 0xf6f1e2, emissive: 0xffe9c0, emissiveIntensity: 1.6, roughness: 0.6 });
  const strip = new THREE.Mesh(dir === 'x' ? new THREE.PlaneGeometry(len, 0.10) : new THREE.PlaneGeometry(0.10, len), mat);
  strip.rotation.x = Math.PI / 2;
  strip.position.set(x, y - 0.055, z);
  tagMesh(strip); scene.add(strip);
}

/* 墙下部护墙（石/木）+ 细压条；沿房间四边内侧，自动避开门洞 */
export function wainscot(ctx, room, doors, o = {}) {
  const hb = o.h == null ? 0.72 : o.h;      // 护墙高度
  const t = 0.035;                          // 护墙厚度
  const wallT = o.wallT == null ? 0.24 : o.wallT;
  const mat = o.mat || ctx.mats.stone;
  const rail = ctx.mats.trim;
  // 约定与 levels/l12-plan.js 相同：axis 'z' = 固定 z 的横墙（沿 x 展开）；axis 'x' = 固定 x 的竖墙（沿 z 展开）
  const edges = [
    { axis: 'z', coord: room.z1, a: room.x1, b: room.x2, dir: 1 },
    { axis: 'z', coord: room.z2, a: room.x1, b: room.x2, dir: -1 },
    { axis: 'x', coord: room.x1, a: room.z1, b: room.z2, dir: 1 },
    { axis: 'x', coord: room.x2, a: room.z1, b: room.z2, dir: -1 },
  ];
  const made = [];
  for (const e of edges) {
    const cuts = (doors || []).filter(d => d.axis === e.axis && Math.abs(d.coord - e.coord) < 0.01)
      .map(d => [Math.max(e.a, d.gap[0]), Math.min(e.b, d.gap[1])])
      .filter(g => g[1] > g[0]).sort((p, q) => p[0] - q[0]);
    let cur = e.a;
    const segs = [];
    for (const g of cuts) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); }
    if (cur < e.b) segs.push([cur, e.b]);
    // 贴合室内墙面：墙面在 coord ± wallT/2，板中心再向室内推 t/2 + 2mm
    const off = e.dir * (wallT / 2 + t / 2 + 0.002);
    for (const [s0, s1] of segs) {
      const len = s1 - s0;
      if (len < 0.4) continue;
      const mid = (s0 + s1) / 2;
      let m1, m2;
      if (e.axis === 'z') {
        m1 = bx(ctx, len, hb, t, mid, hb / 2, e.coord + off, mat, 1.0);
        m2 = bx(ctx, len, 0.045, t + 0.03, mid, hb + 0.02, e.coord + off, rail, 1.0);
      } else {
        m1 = bx(ctx, t, hb, len, e.coord + off, hb / 2, mid, mat, 1.0);
        m2 = bx(ctx, t + 0.03, 0.045, len, e.coord + off, hb + 0.02, mid, rail, 1.0);
      }
      if (m1) { m1.userData.wainscot = { axis: e.axis, coord: e.coord, dir: e.dir, a: s0, b: s1, h: hb }; made.push(m1); }
      if (m2) { m2.userData.wainscotRail = true; made.push(m2); }
    }
  }
  return made;
}

/* 池沿窄排水槽 + 实例化格栅（沿池四边，池沿内侧 0.10m 宽） */
export function drainGrates(ctx, pool, o = {}) {
  const { THREE, scene } = ctx;
  // 窄槽落在石材压顶外侧（压顶占距池边 0..0.52m），槽口略高于地面以避免共面闪烁；
  // 槽与格栅都完整落在干地一侧，不再被压顶盖住。
  const w = 0.14, y = o.y == null ? 0.012 : o.y, off = o.off == null ? 0.63 : o.off;
  const slotMat = ctx.mats.slot || new THREE.MeshStandardMaterial({ color: 0x1b2224, roughness: 0.9 });
  const barMat = ctx.mats.metal || ctx.mats.trim;
  const rects = [
    { x1: pool.x1 - off - 0.45, x2: pool.x2 + off + 0.45, z1: pool.zDeep1 - off - w / 2, z2: pool.zDeep1 - off + w / 2 },
    { x1: pool.x1 - off - 0.45, x2: pool.x2 + off + 0.45, z1: pool.zEnd + off - w / 2, z2: pool.zEnd + off + w / 2 },
    { x1: pool.x1 - off - w / 2, x2: pool.x1 - off + w / 2, z1: pool.zDeep1 - off, z2: pool.zEnd + off },
    { x1: pool.x2 + off - w / 2, x2: pool.x2 + off + w / 2, z1: pool.zDeep1 - off, z2: pool.zEnd + off },
  ];
  for (const r of rects) {
    const slot = bx(ctx, r.x2 - r.x1, 0.05, r.z2 - r.z1, (r.x1 + r.x2) / 2, y, (r.z1 + r.z2) / 2, slotMat, 1.0);
    if (slot) slot.userData.grateSlot = pool.name;
  }
  notRects.push(...rects.map(r => ({ ...r, pool: pool.name, y })));
  const horiz = [
    { x1: pool.x1 - off - 0.4, x2: pool.x2 + off + 0.4, z: pool.zDeep1 - off },
    { x1: pool.x1 - off - 0.4, x2: pool.x2 + off + 0.4, z: pool.zEnd + off },
  ];
  const vert = [
    { z1: pool.zDeep1 - off, z2: pool.zEnd + off, x: pool.x1 - off },
    { z1: pool.zDeep1 - off, z2: pool.zEnd + off, x: pool.x2 + off },
  ];
  let count = 0;
  for (const h of horiz) count += Math.max(1, Math.floor((h.x2 - h.x1) / 0.11));
  for (const v of vert) count += Math.max(1, Math.floor((v.z2 - v.z1) / 0.11));
  const barGeo = new THREE.BoxGeometry(0.05, 0.016, 0.10);
  const inst = new THREE.InstancedMesh(barGeo, barMat, count);
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (const h of horiz) {
    const n = Math.max(1, Math.floor((h.x2 - h.x1) / 0.11));
    for (let k = 0; k < n; k++) { m4.makeTranslation(h.x1 + 0.06 + k * 0.11, y + 0.030, h.z); inst.setMatrixAt(i++, m4); }
  }
  for (const v of vert) {
    const n = Math.max(1, Math.floor((v.z2 - v.z1) / 0.11));
    for (let k = 0; k < n; k++) { m4.makeTranslation(v.x, y + 0.030, v.z1 + 0.06 + k * 0.11); inst.setMatrixAt(i++, m4); }
  }
  inst.instanceMatrix.needsUpdate = true;
  tagMesh(inst); inst.userData.grateBars = pool.name; scene.add(inst);
  return inst;
}

/* 真实墙面指示牌：深铜灰底 + 暖白字，背板与墙留 2mm，边框不穿柱 */
export function wallBoard(ctx, o) {
  const { THREE, scene } = ctx;
  const tex = makeBoardTexture(THREE, o.lines || [], {
    title: o.title, bg: o.bg || '#2b2f30', text: o.text || '#ece4d2',
    edge: o.edge || '#8a7550', px: o.px, py: o.py,
  });
  const w = o.w || 1.6, h = o.h || 0.9;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.12, emissive: 0x1a1712, emissiveIntensity: 0.25 });
  const isZ = (o.face || 'z+')[0] === 'z';
  bx(ctx, isZ ? w + 0.06 : 0.05, h + 0.06, isZ ? 0.05 : w + 0.06, o.x, o.y, o.z, ctx.mats.metal || ctx.mats.trim, 1.0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.set(o.x + (o.face === 'x+' ? 0.031 : o.face === 'x-' ? -0.031 : 0),
    o.y, o.z + (o.face === 'z+' ? 0.031 : o.face === 'z-' ? -0.031 : 0));
  if (o.face === 'x+') face.rotation.y = Math.PI / 2;
  if (o.face === 'x-') face.rotation.y = -Math.PI / 2;
  if (o.face === 'z-') face.rotation.y = Math.PI;
  tagMesh(face); scene.add(face);
  return { mesh: face, tex, w, h };
}

/* 躺椅：斜靠背 + 椅框 + 支撑（比平板更可读） */
export function lounger(ctx, p) {
  const { THREE, scene } = ctx;
  const wood = ctx.mats.wood, metal = ctx.mats.metal || ctx.mats.trim;
  const g = new THREE.Group();
  const seatY = p.h;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.07, p.d * 0.62), ctx.mats.wood));
  g.children[0].position.set(0, seatY, p.d * 0.12);
  const back = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.06, p.d * 0.42), wood);
  back.position.set(0, seatY + 0.20, -p.d * 0.26);
  back.rotation.x = -1.02;                 // 斜靠背
  g.add(back);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, seatY, 0.05), metal);
    leg.position.set(s * (p.w / 2 - 0.05), seatY / 2, p.d * 0.18); g.add(leg);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, seatY * 0.8, 0.05), metal);
    leg2.position.set(s * (p.w / 2 - 0.05), seatY * 0.4, -p.d * 0.28); g.add(leg2);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, p.d * 0.92), wood);
    side.position.set(s * (p.w / 2 - 0.02), seatY + 0.02, 0); g.add(side);
  }
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rot || 0;
  g.traverse(o2 => tagMesh(o2));
  scene.add(g);
  return g;
}
