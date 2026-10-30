// 生成隔离的第一关贴图检查页，不需要指针锁，也不写通关记录。
// node tools/check-level0-textures.cjs，然后打开 /test-level0-textures.html（不加 level=3）。
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');
const online = fs.readFileSync(path.join(root, 'backrooms-pool-online.html'), 'utf8');
assert.equal(online, html
  .replace('"three": "./vendor/three/three.module.js"', '"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"')
  .replace('"three/addons/": "./vendor/three/jsm/"', '"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"'), 'CDN 版未同步');
for (const name of ['wallpaper-yellow.png', 'carpet-dark.png', 'ceiling-dark.png']) {
  assert.ok(fs.statSync(path.join(root, 'textures', name)).size > 0, '缺失第一关贴图：' + name);
}

const smoke = `
{
  const results = [];
  const out = document.createElement('pre'); out.id = 'level0-texture-results';
  out.style.cssText = 'position:fixed;inset:12px;z-index:350;background:#10190f;color:#e4edcf;padding:22px;overflow:auto;white-space:pre-wrap;font:15px monospace';
  document.body.appendChild(out);
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    results.push(label); out.textContent = '正在检查第一关贴图……\\n\\n' + results.map(s => '✓ ' + s).join('\\n');
  };
  const settle = (promise, label, ms = 30000) => {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + '超时')), ms); })]).finally(() => clearTimeout(timer));
  };
  const maps = material => ['map', 'normalMap', 'roughnessMap'].map(key => material[key]).filter(Boolean);
  const l0Maps = () => [...l0TextureMaterials].flatMap(maps);
  const pixels = texture => Array.from(texture.image.getContext('2d').getImageData(0, 0, 1, 1).data);
  const fingerprint = () => [...l0TextureMaterials].map(material => ({
    id: material.uuid, type: material.type,
    maps: maps(material).map(t => ({ id: t.uuid, asset: t.userData.asset, repeat: t.repeat.toArray(), colorSpace: t.colorSpace, width: t.image.width, height: t.image.height }))
  })).sort((a, b) => a.id.localeCompare(b.id));
  const originalPointerLock = renderer.domElement.requestPointerLock;
  const recordsBefore = localStorage.getItem(REC_KEY);
  renderer.domElement.requestPointerLock = () => Promise.resolve();
  (async () => {
    let error = null;
    const temporaryTextures = [];
    try {
      check(LEVEL === 0 && camera.layers.mask === 1, '冷启动进入第一关及第零渲染层');
      check(!renderReady, '关键贴图未就绪前不开放游戏入口');
      check(l0TextureMaterials instanceof Set && l0TextureMaterials.size === 3, '第一关墙纸、地毯、天花三种材质均受准备流程管理');
      check(getLevelTextureMaterials() === l0TextureMaterials, '第一关准备流程等待自身关键材质');
      check(l0Maps().every(t => t.image && t.image.width > 0 && t.image.height > 0), '冷启动没有无图像的空纹理');
      const normals = [...l0TextureMaterials].map(m => m.normalMap).filter(Boolean);
      const roughness = [...l0TextureMaterials].map(m => m.roughnessMap).filter(Boolean);
      check(normals.length === 2 && normals.every(t => pixels(t).join(',') === '128,128,255,255'), '墙纸和地毯等待派生时使用中性法线');
      check(roughness.length === 2 && roughness.every(t => pixels(t).join(',') === '255,255,255,255'), '粗糙度等待派生时保持哑光，不使用黑色空采样');
      check(l0Maps().every(t => textureReady.get(t) instanceof Promise), '全部关键原图和派生贴图均提供可等待的准备任务');

      await settle(renderPreparation, '第一关画面准备');
      check(renderReady && LEVEL === 0, '关键贴图准备完成后开放第一关入口');
      check(scene.environment === ENV_TEX && camera.layers.mask === 1, '第一关仍使用原有环境反射和渲染层');
      const expected = ['textures/wallpaper-yellow.png', 'textures/carpet-dark.png', 'textures/ceiling-dark.png'].sort();
      check(JSON.stringify([...l0TextureMaterials].map(m => m.map.userData.asset).sort()) === JSON.stringify(expected), '第一关完整绑定墙纸、地毯、天花原图');
      check(l0Maps().every(t => t.userData.status === 'ready' && t.image.width > 1 && t.image.height > 1), '开放入口时所有关键原图、法线和粗糙度均已加载');
      check([...l0TextureMaterials].every(m => m.map.colorSpace === THREE.SRGBColorSpace), '颜色原图使用 SRGB 色彩空间');
      check(normals.concat(roughness).every(t => t.colorSpace === THREE.NoColorSpace), '法线和粗糙度保持线性数据色彩空间');
      check([...l0TextureMaterials].every(m => maps(m).every(t => t.repeat.equals(m.map.repeat))), '每种材质的颜色、法线和粗糙度重复比例保持对齐');
      check(l0Maps().every(t => t.wrapS === THREE.RepeatWrapping && t.wrapT === THREE.RepeatWrapping), '关键贴图保持可重复铺设');
      check(expected.every(asset => !textureLoadFailures.has(asset)), '第一关关键贴图没有加载失败记录');
      check(!document.getElementById('err-box'), '冷启动没有脚本或准备错误');

      const originalFingerprint = JSON.stringify(fingerprint());
      const wall = [...l0TextureMaterials].find(m => m.map.userData.asset.includes('wallpaper'));
      const cachedImage = textureImageCache.get(wall.map.userData.asset);
      const repeatA = texFrom(wall.map.userData.asset, 2, 3, true);
      const repeatB = texFrom(wall.map.userData.asset, 4, 5, true);
      temporaryTextures.push(repeatA, repeatB);
      await settle(Promise.all([textureReady.get(repeatA), textureReady.get(repeatB)]), '共享原图准备');
      check(repeatA !== repeatB && repeatA.image === repeatB.image && textureImageCache.get(wall.map.userData.asset) === cachedImage, '重复引用共享原图加载，不共享纹理实例');
      check(repeatA.repeat.x === 2 && repeatA.repeat.y === 3 && repeatB.repeat.x === 4 && repeatB.repeat.y === 5 && wall.map.repeat.x === 1 && wall.map.repeat.y === 1, '共享原图时各材质 UV 比例仍相互独立');

      const absentPath = 'textures/__missing-level0-test__.png';
      const missing = texFrom(absentPath, 2, 3, true); temporaryTextures.push(missing);
      await settle(textureReady.get(missing), '缺失原图兜底', 20000);
      check(missing.userData.status === 'fallback' && missing.image && missing.image.width > 0 && missing.image.height > 0, '缺失原图明确进入非空兜底而非永久等待');
      check(textureLoadFailures.has(absentPath) && String(textureLoadFailures.get(absentPath)).length > 0, '缺失贴图记录具体失败路径');
      check(missing.colorSpace === THREE.SRGBColorSpace && missing.repeat.x === 2 && missing.repeat.y === 3, '兜底图保持原有颜色空间和 UV 设置');

      enterLevel3(true); await settle(renderPreparation, '第三关画面准备');
      check(LEVEL === 2 && camera.layers.mask === (1 << STATION_LAYER) && renderReady, '能够正常切换到第三关并完成准备');
      resetGame();
      check(LEVEL === 0 && !renderReady && camera.layers.mask === 1 && scene.environment === ENV_TEX, '从第三关重玩时恢复第一关并重新等待准备');
      await settle(renderPreparation, '重玩第一关画面准备');
      check(renderReady && l0Maps().every(t => t.userData.status === 'ready'), '重玩第一关的关键贴图仍保持完整就绪');
      check(JSON.stringify(fingerprint()) === originalFingerprint, '第三关往返后墙、地毯和天花材质及贴图指纹不丢失');
      check(!document.getElementById('err-box'), '关卡往返没有脚本或画面准备错误');
    } catch (e) { error = e; }
    finally {
      renderer.domElement.requestPointerLock = originalPointerLock;
      for (const texture of temporaryTextures) texture.dispose();
      try {
        check(renderer.domElement.requestPointerLock === originalPointerLock, '检查结束恢复原鼠标锁定函数');
        check(localStorage.getItem(REC_KEY) === recordsBefore, '检查不会更改通关记录');
      } catch (e) { if (!error) error = e; }
    }
    document.title = error ? 'FAIL: ' + error.message : 'PASS: ' + results.length + ' level0 texture checks';
    out.textContent = document.title + '\\n\\n' + results.map(s => '✓ ' + s).join('\\n') + (error ? '\\n\\n' + error.stack : '');
  })();
}
`;
const testHtml = html.replace(/updateOverlayRecord\(\);\s*<\/script>/, smoke + '\nupdateOverlayRecord();\n</script>');
assert.ok(testHtml.includes("out.id = 'level0-texture-results'"), '未注入第一关贴图检查');
const moduleSource = testHtml.split('<script type="module">')[1].split('</script>')[0];
const checkPath = path.join(__dirname, '.tmp-level0-texture-check.mjs');
fs.writeFileSync(checkPath, moduleSource);
execFileSync(process.execPath, ['--check', checkPath], { stdio: 'inherit' });
fs.writeFileSync(path.join(root, 'test-level0-textures.html'), testHtml);
console.log('注入模块语法 / 关键贴图文件 / CDN 一致性 PASS → /test-level0-textures.html');
