/* L12 近景细件几何库：真实小倒角板材、圆杆、曲管、圆盘、法兰、格栅。
 * 设计要点：
 *  - 几何按尺寸缓存复用；圆杆按（半径 + 材质）合批成 InstancedMesh，控制绘制与三角形开销；
 *  - 倒角用「圆角矩形截面 + ExtrudeGeometry 斜切」生成真实斜边轮廓，不是换色或附加贴片；
 *  - UV 按世界米制写入（材质自身 repeat 决定最终周期），所有顶点/法线都是有限值；
 *  - 不新建贴图、不新增逐帧灯光；
 *  - 在缺少 ExtrudeGeometry/InstancedMesh 的桩环境（数据检查脚本）里退化为按包围尺寸调用
 *    ctx.addBox 记录，保持既有数据检查的实质约束不被绕过。
 */
export function createDetailKit(ctx) {
  const { THREE, scene } = ctx;
  const CAN = !!(THREE && THREE.Shape && THREE.ExtrudeGeometry && THREE.Matrix4 &&
    THREE.Quaternion && THREE.Vector3 && THREE.InstancedMesh);
  const geoCache = new Map();
  const rodBatches = new Map();
  const rodSnapshot = [];
  const stats = { slabs: 0, rods: 0, tubes: 0, discs: 0, flanges: 0, grates: 0, instancedBatches: 0, fallback: 0 };
  // 按零件名计数（门板 / 把手 / 铰链 / 裙板 …）：给回归提供"结构件真的生成了"的硬证据，
  // 圆杆被实例化后无法再逐件遍历，所以必须在生成时就记下来。
  const parts = Object.create(null);
  const countPart = p => { if (p) parts[p] = (parts[p] || 0) + 1; };
  const keyOf = parts => parts.map(v => (typeof v === 'number' ? v.toFixed(4) : String(v))).join('|');
  const cache = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
  const tag = (obj, kind, part, extra) => {
    if (!obj || !obj.userData) return obj;
    obj.userData.l12detail = true;
    obj.userData.detailKind = kind;
    if (part) obj.userData.detailPart = part;
    if (extra) Object.assign(obj.userData, extra);
    return obj;
  };

  function record(w, h, d, x, y, z, mat, kind, part, extra) {
    stats.fallback++;
    countPart(part);
    const m = ctx.addBox ? ctx.addBox(w, h, d, x, y, z, mat) : null;
    return tag(m, kind, part, extra);
  }

  function roundedShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    const rr = Math.max(0, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4));
    if (rr <= 1e-5) {
      s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.closePath();
      return s;
    }
    s.moveTo(x + rr, y);
    s.lineTo(x + w - rr, y); s.quadraticCurveTo(x + w, y, x + w, y + rr);
    s.lineTo(x + w, y + h - rr); s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    s.lineTo(x + rr, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rr);
    s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    s.closePath();
    return s;
  }

  // 按主导法线写米制 UV：板面用两轴，侧边用「厚度 × 长度」，任意周期材质都正常
  function applyMetricUV(geo, uvScale) {
    const p = geo.attributes && geo.attributes.position;
    const n = geo.attributes && geo.attributes.normal;
    const uv = geo.attributes && geo.attributes.uv;
    if (!p || !uv) return geo;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n ? n.getX(i) : 0), ny = Math.abs(n ? n.getY(i) : 1), nz = Math.abs(n ? n.getZ(i) : 0);
      let u, v;
      if (nz >= nx && nz >= ny) { u = p.getX(i); v = p.getY(i); }
      else if (nx >= ny) { u = p.getZ(i); v = p.getY(i); }
      else { u = p.getX(i); v = p.getZ(i); }
      uv.setXY(i, u / uvScale, v / uvScale);
    }
    uv.needsUpdate = true;
    return geo;
  }

  // axis 为厚度方向；A/B/T 分别对应（旋转后）世界 X / 世界 Y / 世界 Z 的板面尺寸
  function dimsOf(o) {
    const axis = o.axis || 'y';
    const A = axis === 'y' ? o.w : axis === 'x' ? o.d : o.w;
    const B = axis === 'y' ? o.d : o.h;
    const T = axis === 'y' ? o.h : axis === 'x' ? o.w : o.d;
    return { axis, A, B, T };
  }

  function slabGeometry(A, B, T, axis, r, bevel) {
    const key = keyOf(['slab', A, B, T, axis, r, bevel]);
    return cache(key, () => {
      const be = Math.max(1e-4, Math.min(bevel, T * 0.3, Math.min(A, B) * 0.12));
      const rr = Math.max(1e-4, Math.min(r, Math.min(A, B) / 2 - be - 1e-4));
      const shape = roundedShape(A - 2 * be, B - 2 * be, Math.max(1e-4, rr - be));
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(1e-4, T - 2 * be), bevelEnabled: true,
        bevelThickness: be, bevelSize: be, bevelSegments: 1, curveSegments: 2, steps: 1,
      });
      geo.translate(0, 0, -(T / 2 - be));
      if (axis === 'y') geo.rotateX(-Math.PI / 2);
      else if (axis === 'x') geo.rotateY(Math.PI / 2);
      applyMetricUV(geo, 1);
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      return geo;
    });
  }

  const kit = {
    // 带真实小倒角的板：axis 为厚度方向（'y' 桌面/座板，'x' 立板，'z' 门板/挡板）
    slab(o) {
      const { axis, A, B, T } = dimsOf(o);
      const part = o.part || o.kind || 'slab';
      if (!CAN || !THREE.Mesh) return record(o.w, o.h, o.d, o.x, o.y, o.z, o.mat, 'slab', part, o.userData);
      const be = o.bevel == null ? Math.min(0.004, T / 6) : o.bevel;
      const r = o.r == null ? 0.008 : o.r;
      const m = new THREE.Mesh(slabGeometry(A, B, T, axis, r, be), o.mat);
      m.position.set(o.x, o.y, o.z);
      if (o.rx) m.rotation.x = o.rx;
      if (o.ry) m.rotation.y = o.ry;
      if (o.rz) m.rotation.z = o.rz;
      m.name = o.name || 'l12DetailSlab';
      tag(m, 'slab', part, o.userData);
      (o.parent || scene).add(m);
      countPart(part);
      stats.slabs++;
      return m;
    },
    // 圆杆：按半径 + 材质合批，长度用实例缩放
    rod(o) {
      const r = o.r == null ? 0.018 : o.r, len = o.len, axis = o.axis || 'y';
      const part = o.part || 'rod';
      if (!CAN) {
        return axis === 'y'
          ? record(r * 2, len, r * 2, o.x, o.y, o.z, o.mat, 'rod', part, o.userData)
          : axis === 'x'
            ? record(len, r * 2, r * 2, o.x, o.y, o.z, o.mat, 'rod', part, o.userData)
            : record(r * 2, r * 2, len, o.x, o.y, o.z, o.mat, 'rod', part, o.userData);
      }
      const key = 'rod:' + r.toFixed(4) + ':' + (o.mat && o.mat.uuid ? o.mat.uuid : 'm');
      if (!rodBatches.has(key)) {
        rodBatches.set(key, { geo: cache('rod:' + r.toFixed(4), () => new THREE.CylinderGeometry(r, r, 1, 10, 1)), mat: o.mat, items: [] });
      }
      const q = new THREE.Quaternion();
      if (axis === 'x') q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      else if (axis === 'z') q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      const m4 = new THREE.Matrix4().compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(1, len, 1));
      const batch = rodBatches.get(key);
      batch.items.push(m4);
      if (!batch.meta) batch.meta = [];
      batch.meta.push({ part, r, len, axis: axis || 'y' });
      if (o.part) batch.parts = (batch.parts || []).concat([part]);
      countPart(part);
      stats.rods++;
      return m4;
    },
    // 连续弯曲圆管（弯头、扶手）：CatmullRom 采样，分段受控
    tube(o) {
      if (!CAN || !THREE.TubeGeometry || !THREE.CatmullRomCurve3) {
        const xs = o.points.map(p => p[0]), ys = o.points.map(p => p[1]), zs = o.points.map(p => p[2]);
        const t = (o.r || 0.03) * 2;
        return record(Math.max(t, Math.max(...xs) - Math.min(...xs)), Math.max(t, Math.max(...ys) - Math.min(...ys)),
          Math.max(t, Math.max(...zs) - Math.min(...zs)),
          (Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2,
          (Math.max(...zs) + Math.min(...zs)) / 2, o.mat, 'tube', o.part || 'tube', o.userData);
      }
      const pts = o.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const key = 'tube:' + (o.r || 0.03).toFixed(4) + ':' + pts.map(p => p.toArray().map(v => v.toFixed(3)).join(',')).join(';');
      const geo = cache(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), o.seg || 24, o.r || 0.03, 8, false));
      const m = new THREE.Mesh(geo, o.mat);
      m.name = o.name || 'l12DetailTube';
      tag(m, 'tube', o.part || 'tube', o.userData);
      (o.parent || scene).add(m);
      countPart(o.part || 'tube');
      stats.tubes++;
      return m;
    },
    // 圆盘 / 端盖 / 喷头 / 旋钮
    disc(o) {
      const r = o.r, t = o.t == null ? 0.02 : o.t, seg = o.seg || 14;
      const part = o.part || 'disc';
      if (!CAN) {
        return o.axis === 'x' ? record(t, r * 2, r * 2, o.x, o.y, o.z, o.mat, 'disc', part, o.userData)
          : o.axis === 'z' ? record(r * 2, r * 2, t, o.x, o.y, o.z, o.mat, 'disc', part, o.userData)
            : record(r * 2, t, r * 2, o.x, o.y, o.z, o.mat, 'disc', part, o.userData);
      }
      const geo = cache('disc:' + r.toFixed(4) + ':' + t.toFixed(4) + ':' + seg,
        () => new THREE.CylinderGeometry(r, r, t, seg, 1));
      const m = new THREE.Mesh(geo, o.mat);
      m.position.set(o.x, o.y, o.z);
      if (o.axis === 'x') m.rotation.z = Math.PI / 2;
      else if (o.axis === 'z') m.rotation.x = Math.PI / 2;
      m.name = o.name || 'l12DetailDisc';
      tag(m, 'disc', part, o.userData);
      (o.parent || scene).add(m);
      countPart(part);
      stats.discs++;
      return m;
    },
    // 墙面法兰：一圈环 + 薄盘，套在立管与墙面之间；三轴都要同轴（薄盘法线 = 圆环法线）
    flange(o) {
      const part = o.part || 'flange';
      const axis = o.axis || 'z';
      if (!CAN || !THREE.TorusGeometry) {
        const bb = axis === 'x' ? [0.012, o.r * 2, o.r * 2]
          : axis === 'y' ? [o.r * 2, 0.012, o.r * 2]
            : [o.r * 2, o.r * 2, 0.012];
        return record(bb[0], bb[1], bb[2], o.x, o.y, o.z, o.mat, 'flange', part, o.userData);
      }
      const ringGeo = cache('flangeRing:' + o.r.toFixed(4), () => new THREE.TorusGeometry(o.r, o.r * 0.22, 6, 14));
      const ring = new THREE.Mesh(ringGeo, o.mat);
      ring.position.set(o.x, o.y, o.z);
      if (axis === 'x') ring.rotation.y = Math.PI / 2;
      else if (axis === 'y') ring.rotation.x = Math.PI / 2;
      ring.name = 'l12DetailFlange';
      tag(ring, 'flange', part, o.userData);
      scene.add(ring);
      // 薄盘必须与圆环同轴：axis 原样透传，否则水平法兰会长出一块竖着的圆片
      kit.disc({ r: o.r * 0.97, t: 0.012, x: o.x, y: o.y, z: o.z, mat: o.mat, axis, part: 'flangeDisc' });
      countPart(part);
      stats.flanges++;
      return ring;
    },
    // 排水槽 + 实体格栅：槽体走 addBox（与地面齐平），两侧承托轨道接住格栅条两端，条用实例化
    grate(o) {
      const slotH = o.slotH == null ? 0.02 : o.slotH;
      const slotKey = o.slotKey || 'grateSlot';
      const slot = ctx.addBox ? ctx.addBox(o.w, slotH, o.d, o.x, o.y, o.z, o.slotMat) : null;
      tag(slot, 'grateSlot', 'slot', { [slotKey]: o.id });
      const alongX = (o.w >= o.d);
      const len = alongX ? o.w : o.d;
      const n = Math.max(3, Math.floor(len / (o.step || 0.11)));
      const rimTop = o.y + slotH / 2;
      const slotBot = o.y - slotH / 2;
      // 承托轨道：坐在槽底、顶面给出格栅条的支承面；条两端落在轨道上（真实接触，不是悬空）
      const railH = Math.min(0.012, slotH * 0.6);
      const railW = 0.03;
      const railTop = slotBot + railH;
      const shortHalf = (alongX ? o.d : o.w) / 2;
      for (const s of [-1, 1]) {
        kit.slab({
          w: alongX ? len : railW, h: railH, d: alongX ? railW : len,
          x: o.x + (alongX ? 0 : s * (shortHalf - railW / 2)),
          y: railTop - railH / 2,
          z: o.z + (alongX ? s * (shortHalf - railW / 2) : 0),
          mat: o.barMat, axis: 'y', r: 0.002, bevel: 0.001, part: 'grateRail'
        });
      }
      const barY = railTop + 0.008;     // 条底 = 轨顶；条顶只比槽沿高 8mm，两端有支撑
      if (!CAN || !THREE.InstancedMesh) {
        record(alongX ? len * 0.94 : o.d * 0.7, 0.016, alongX ? o.d * 0.7 : len * 0.94, o.x, barY, o.z, o.barMat, 'grateBars', 'bars', { [slotKey]: o.id, barCount: n });
      } else {
        const barGeo = cache('grateBar', () => new THREE.BoxGeometry(0.05, 0.016, 0.10));
        const inst = new THREE.InstancedMesh(barGeo, o.barMat, n);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          const u = -len / 2 + (i + 0.5) * (len / n);
          m4.makeRotationY(alongX ? 0 : Math.PI / 2);
          m4.setPosition(o.x + (alongX ? u : 0), barY, o.z + (alongX ? 0 : u));
          inst.setMatrixAt(i, m4);
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.name = 'l12DetailGrateBars';
        tag(inst, 'grateBars', 'bars', { [slotKey]: o.id, barCount: n });
        scene.add(inst);
      }
      countPart('grateSlot');
      stats.grates++;
      return slot;
    },
    flush() {
      if (!CAN) return;
      for (const { geo, mat, items, meta } of rodBatches.values()) {
        if (!items.length) continue;
        const inst = new THREE.InstancedMesh(geo, mat, items.length);
        items.forEach((m, i) => inst.setMatrixAt(i, m));
        inst.instanceMatrix.needsUpdate = true;
        inst.name = 'l12DetailRods';
        tag(inst, 'rods', 'rods', { rodCount: items.length });
        scene.add(inst); stats.instancedBatches++;
        // 记录每根实例圆杆的真实世界包围盒（由实例矩阵与实际圆柱半径推出），
        // 供回归检查"构件是否真的接到一起"，而不是只看包围盒总量。
        const rad = (geo.parameters && geo.parameters.radiusTop) || 0.01;
        items.forEach((m, i) => {
          const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
          m.decompose(pos, q, sc);
          const pts = [];
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            pts.push(new THREE.Vector3(sx * rad, sy * 0.5 * sc.y, sz * rad).applyQuaternion(q).add(pos));
          }
          rodSnapshot.push({ part: (meta && meta[i] && meta[i].part) || '', box: new THREE.Box3().setFromPoints(pts) });
        });
      }
      rodBatches.clear();
    },
    rodInstances() { return rodSnapshot; },
    stats() { return { ...stats, parts: { ...parts } }; },
  };
  return kit;
}