/* 门洞共面检测探针（追加到宿主模块尾部执行，真实 vendor THREE，不渲染）
   依赖同目录 door-coplanar-scan.js 提供的 globalThis.__L12_COPLANAR。
   输出逐条命中 + 负对照计数；有命中或负对照失效时退出码非 0。 */
(function doorCoplanarProbe() {
  const api = globalThis.__L12_COPLANAR;
  if (!api) {
    console.log('COPLANAR_FAIL 缺少扫描库 door-coplanar-scan.js');
    process.exitCode = 2;
    return;
  }
  const r = api.scanDoorCoplanar(THREE, scene, L37_DOORS_V2, { withLegacy: true });
  console.log('BOXES', r.boxes);
  console.log('DOORS', L37_DOORS_V2.length,
    'z=' + L37_DOORS_V2.filter(d => d.axis === 'z').length,
    'x=' + L37_DOORS_V2.filter(d => d.axis === 'x').length);
  console.log('COPLANAR_PAIRS', r.hits.length);
  const nm = m => (m.name || m.userData.l12art ? 'art:' : '') + (m.name || '(unnamed)');
  const size = b => [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map(n => n.toFixed(3)).join('x');
  for (const h of r.hits) {
    console.log('COPLANAR', h.ax + h.side, 'plane=' + h.plane.toFixed(4), 'area=' + h.area.toFixed(4),
      'door=' + h.d.axis + '@' + h.d.coord + '[' + h.d.gap.join(',') + ']',
      'A=' + nm(h.A.mesh), 'size=' + size(h.A), 'B=' + nm(h.B.mesh), 'size=' + size(h.B));
  }
  console.log('LEGACY_NEGCTRL_PAIRS', r.legacy, JSON.stringify(r.legacyByAxis || null));
  // 负对照明细：按修复前老构造还原的几何（立框内侧面 vs 墙洞切面、上沿底面 vs 门楣底面）必须都被判出
  for (const ax of ['z', 'x']) {
    const ld = L37_DOORS_V2.filter(d => d.axis === ax)[0];
    if (!ld) { console.log('LEGACY_NEGCTRL_FAIL 没有 ' + ax + ' 向门洞可用'); continue; }
    const hits = api.scanPairs(api.legacyPairs(THREE, ld), [ld]);
    for (const h of hits) {
      console.log('LEGACY_NEGCTRL', ax + '-door', h.ax + h.side, 'plane=' + h.plane.toFixed(3), 'area=' + h.area.toFixed(4),
        'doorH=' + ld.h, h.A.mesh.name + '(' + size(h.A) + ')', 'vs', h.B.mesh.name + '(' + size(h.B) + ')');
    }
  }
  const negOk = r.legacy >= 2;
  if (!negOk) console.log('COPLANAR_FAIL 负对照失效：修复前的老门套构造没有被判出共面（应 ≥2 对）');
  if (r.hits.length === 0 && negOk) console.log('COPLANAR_OK 门框/门楣周边无同向共面重叠面，负对照可检出');
  else if (r.hits.length > 0) console.log('COPLANAR_FAIL 门框/门楣周边仍有同向共面重叠面 ' + r.hits.length + ' 对');
  if (r.hits.length > 0 || !negOk) process.exitCode = 3;
})();