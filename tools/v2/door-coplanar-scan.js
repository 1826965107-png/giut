/* 门洞共面/重叠扫描（纯几何判定，可被探针与正式回归共用）
   追加进 backrooms-pool.html 的 module 尾部执行（此时场景已建好），也可以单独作为断言库调用。

   判据：两个轴对齐盒体在同一平面（同一轴、同向法线、坐标差 < EPS）且在切平面内正面重叠面积 > MIN_AREA。
   同向共面 = 两片表面朝同一侧、落在同一深度 ⇒ 相机移动时光栅化互相争夺，表现为门框/门头闪烁。
   反向贴面（两块实体对接，一面朝 +、一面朝 -）与共同接地底面（都在 y=0、朝下埋进楼板）不算闪烁，
   前者由背面剔除自然分出胜负，后者玩家根本看不到。
   只配对「至少一方是 l12Casing* 门套件」的盒体，避免吊顶条/墙裙/桥架等长条装饰污染结果。 */
(function l12DoorCoplanarScan() {
  const EPS = 5e-4;        // 平面重合容差 0.5mm
  const MIN_AREA = 2e-4;   // 面积阈值 2e-4 ㎡ = 200 mm²（约 1.4cm×1.4cm），更小的贴面接触不算闪烁
  const WT = 0.24;
  const AX = ['x', 'y', 'z'];

  function boxOf(THREE, mesh) {
    const m = mesh.matrixWorld.elements;
    const ax = [m[0], m[1], m[2]], ay = [m[4], m[5], m[6]], az = [m[8], m[9], m[10]];
    const okAxis = arr => {
      const a = arr.map(Math.abs);
      return (a[0] > 0.9999 || a[0] < 1e-4) && (a[1] > 0.9999 || a[1] < 1e-4) && (a[2] > 0.9999 || a[2] < 1e-4);
    };
    if (!okAxis(ax) || !okAxis(ay) || !okAxis(az)) return null;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox.clone();
    b.applyMatrix4(mesh.matrixWorld);
    return { mesh, min: b.min.clone(), max: b.max.clone() };
  }

  function collectBoxes(THREE, scene) {
    const boxes = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (o.isInstancedMesh) return;   // 实例化批量的本地 bbox 在原点、无逐实例变换，参与扫描只会产生假阳性
      if (o.geometry.type !== 'BoxGeometry') return;
      if (o.userData && o.userData.noCoplanarScan) return;
      const b = boxOf(THREE, o);
      if (b) boxes.push(b);
    });
    return boxes;
  }

  function doorVolumes(doors, doorHDefault) {
    return doors.map(d => {
      const pad = 0.55;
      const doorH = d.h == null ? doorHDefault : d.h;
      const box = d.axis === 'z'
        ? { x1: d.gap[0] - pad, x2: d.gap[1] + pad, z1: d.coord - WT / 2 - 0.16, z2: d.coord + WT / 2 + 0.16, y1: -0.05, y2: 3.6 }
        : { x1: d.coord - WT / 2 - 0.16, x2: d.coord + WT / 2 + 0.16, z1: d.gap[0] - pad, z2: d.gap[1] + pad, y1: -0.05, y2: 3.6 };
      return { axis: d.axis, coord: d.coord, gap: d.gap.slice(), doorH, box };
    });
  }

  const inDoor = (b, d) => {
    const q = d.box;
    return b.max.x > q.x1 - EPS && b.min.x < q.x2 + EPS && b.max.z > q.z1 - EPS && b.min.z < q.z2 + EPS &&
      b.max.y > q.y1 - EPS && b.min.y < q.y2 + EPS;
  };

  // 门洞壁范围：沿墙轴 gap ±0.12、厚度 ±0.14、高度 0..doorH+0.15（平面轴取其平面坐标本身）
  function inReveal(d, planeAx, planeVal, others, o0, o1, p0, p1) {
    const alongAx = d.axis === 'z' ? 'x' : 'z';
    const thickAx = d.axis;
    const pick = ax => (ax === planeAx ? [planeVal, planeVal] : ax === others[0] ? [o0, o1] : ax === others[1] ? [p0, p1] : null);
    const ar = pick(alongAx), tr = pick(thickAx), yr = pick('y');
    if (!ar || !tr || !yr) return false;
    return ar[1] > d.gap[0] - 0.12 && ar[0] < d.gap[1] + 0.12 &&
      tr[1] > d.coord - 0.14 && tr[0] < d.coord + 0.14 &&
      yr[1] > 0 && yr[0] < d.doorH + 0.15;
  }

  /* 返回命中的同向共面重叠对。doors 为原始门洞数据（axis/coord/gap/h）。 */
  function scanPairs(boxes, doors, opt) {
    const o = typeof opt === 'number' || opt == null ? { doorHDefault: opt } : opt;
    const vols = doorVolumes(doors, o.doorHDefault == null ? 2.3 : o.doorHDefault);
    const onlyCasing = o.onlyCasing !== false;
    const hits = [];
    for (const d of vols) {
      const list = boxes.filter(b => inDoor(b, d) && (!onlyCasing || /^l12Casing/.test(b.mesh.name || '')));
      for (const A of list) {
        for (const B of boxes) {
          if (B === A || !inDoor(B, d)) continue;
          for (const ax of AX) {
            const others = AX.filter(a => a !== ax);
            const o0 = Math.max(A.min[others[0]], B.min[others[0]]);
            const o1 = Math.min(A.max[others[0]], B.max[others[0]]);
            const p0 = Math.max(A.min[others[1]], B.min[others[1]]);
            const p1 = Math.min(A.max[others[1]], B.max[others[1]]);
            if (o1 - o0 <= EPS || p1 - p0 <= EPS) continue;
            const area = (o1 - o0) * (p1 - p0);
            if (area < MIN_AREA) continue;
            if (Math.abs(A.max[ax] - B.max[ax]) <= EPS && inReveal(d, ax, A.max[ax], others, o0, o1, p0, p1)) {
              hits.push({ d, ax, side: '+', plane: A.max[ax], area, A, B });
            }
            // 共同接地底面（都在 y≈0、朝下埋进楼板）是合法接触，不计入
            const floorContact = ax === 'y' && Math.abs(A.min[ax]) < 0.03;
            if (!floorContact && Math.abs(A.min[ax] - B.min[ax]) <= EPS && inReveal(d, ax, A.min[ax], others, o0, o1, p0, p1)) {
              hits.push({ d, ax, side: '-', plane: A.min[ax], area, A, B });
            }
          }
        }
      }
    }
    // 去重（同一对表面可能被两个门洞邻域同时命中）
    const seen = new Set();
    const uniq = [];
    for (const h of hits) {
      const key = [h.ax, h.side, h.plane.toFixed(4), h.A.mesh.uuid, h.B.mesh.uuid].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key); uniq.push(h);
    }
    return uniq;
  }

  /* 负对照：按修复前的老构造临时造同样的几何，扫描必须能报出共面重叠。
     老构造 = 立框内侧面与墙洞切面同平面 + 上沿底面与门楣底面同平面。
     mk 的 (w, h, dd) 一律按「沿洞口展开方向 / 高 / 沿墙厚方向」给，axis==='x' 的门洞
     需要同时交换 BoxGeometry 的 x、z 尺寸（否则几何朝向反了，负对照会假通过）。 */
  function legacyPairs(THREE, door) {
    const side = 1, doorH = door.h == null ? 2.3 : door.h;
    const gapW = door.gap[1] - door.gap[0], mid = (door.gap[0] + door.gap[1]) / 2;
    const alongX = door.axis === 'z';   // 洞口沿 x 展开（墙固定在 z）
    const mk = (w, h, dd, u, y, name) => {
      const geo = alongX ? new THREE.BoxGeometry(w, h, dd) : new THREE.BoxGeometry(dd, h, w);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
      mesh.name = name;
      if (alongX) mesh.position.set(u, y, door.coord);
      else mesh.position.set(door.coord, y, u);
      mesh.updateMatrixWorld(true);
      return boxOf(THREE, mesh);
    };
    const cutPlane = mid + side * gapW / 2;   // 墙洞切面（老构造里立框内侧面就压在这个平面上）
    const lh = Math.min(2.1, Math.max(0.02, 4.4 - doorH));
    return [
      mk(0.07, doorH, WT + 0.04, cutPlane + 0.035, doorH / 2, 'l12CasingJamb'),
      mk(3.0, 4.4, WT, cutPlane + 1.5, 2.2, 'legacyWall'),
      mk(gapW + 0.14, 0.07, WT + 0.04, mid, doorH + 0.035, 'l12CasingHead'),
      mk(gapW, lh, WT, mid, doorH + lh / 2, 'legacyLintel')
    ].filter(Boolean);
  }

  /* 负对照批量：对 z 向与 x 向各取一个门洞，确认两种朝向都被检出 */
  function legacyCheck(THREE, doors) {
    const pick = ax => doors.filter(d => d.axis === ax);
    const res = {};
    for (const ax of ['z', 'x']) {
      const d = pick(ax)[0];
      res[ax] = d ? scanPairs(legacyPairs(THREE, d), [d]).length : -1;
    }
    return res;
  }

  function scanDoorCoplanar(THREE, scene, doors, opts) {
    const o = opts || {};
    const boxes = collectBoxes(THREE, scene);
    const hits = scanPairs(boxes, doors);
    let legacy = -1, legacyByAxis = null;
    if (o.withLegacy && doors.length) {
      legacyByAxis = legacyCheck(THREE, doors);
      legacy = Math.min(legacyByAxis.z, legacyByAxis.x);
    }
    return { boxes: boxes.length, hits, legacy, legacyByAxis };
  }

  globalThis.__L12_COPLANAR = { scanDoorCoplanar, scanPairs, collectBoxes, legacyPairs, legacyCheck, EPS, MIN_AREA };
})();