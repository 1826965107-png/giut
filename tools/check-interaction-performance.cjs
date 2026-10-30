// 生成隔离浏览器性能检查页。不会写通关记录，也不需要指针锁。
// --baseline 保存改动前的对照页；默认生成待验收页并要求事件不新增着色程序。
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
let html = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');
const smoke = `
{
  const out = document.createElement('pre'); out.id = 'performance-results';
  out.style.cssText = 'position:fixed;inset:12px;z-index:350;background:#07161a;color:#dbefe5;padding:22px;overflow:auto;white-space:pre-wrap;font:15px monospace';
  out.textContent = '正在检查车票、检票员和列车的首次渲染成本……'; document.body.appendChild(out);
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  (async () => {
    try {
      enterLevel3(true); qStep = 3;
      camera.position.set(L3_OX - 1.05, 6.64, 16.5); camera.rotation.set(-.10, Math.PI, 0, 'YXZ');
      await new Promise(resolve => setTimeout(resolve, 1400));
      if (typeof renderPreparation !== 'undefined') await renderPreparation;
      const rows = [];
      const sample = async (label, action) => {
        const programs = renderer.info.programs.length;
        const existing = new Set(renderer.info.programs.map(p => p.id));
        const start = performance.now(); action(); const actionMs = performance.now() - start;
        let maxRenderMs = 0, visibleLights = 0;
        scene.traverseVisible(o => { if (o.isLight && o.layers.test(camera.layers)) visibleLights++; });
        for (let i = 0; i < 3; i++) {
          const begin = performance.now(); renderer.render(scene, camera);
          maxRenderMs = Math.max(maxRenderMs, performance.now() - begin); await frame();
        }
        rows.push({ label, visibleLights, newPrograms: renderer.info.programs.length - programs, programNames: renderer.info.programs.filter(p => !existing.has(p.id)).map(p => p.name), actionMs: +actionMs.toFixed(2), maxRenderMs: +maxRenderMs.toFixed(2) });
        out.textContent = JSON.stringify(rows, null, 2);
      };
      await sample('空闲检票厅', () => {});
      await sample('拾取首张车票', () => {
        const d = L3_TICKET_DEFS[2]; player.x = d[0]; player.z = d[1]; player.y = d[2] - .75;
        updateL3Proximity(); tryInteract();
      });
      await sample('首票后检票员出现', () => {
        const rng = Math.random;
        try { Math.random = () => 0; updateLevel3(1 / 60); }
        finally { Math.random = rng; }
        if (typeof updateConductorLight === 'function') updateConductorLight();
      });
      await sample('检票员离开', () => {
        l3Entity.visible = false; l3State.entityOn = false;
        if (typeof updateConductorLight === 'function') updateConductorLight();
      });
      await sample('三节过站列车出现', () => { l3PassTrain.position.z = 0; l3PassTrain.visible = true; });
      await sample('过站列车离开', () => { l3PassTrain.visible = false; });
      await sample('维修间通电', () => { flipBreaker(); });
      await sample('集齐车票列车进站', () => {
        flipLever();
        for (const tk of [...l3Tickets]) { player.x = tk.x; player.z = tk.z; player.y = tk.baseY - .75; updateL3Proximity(); tryInteract(); }
        for (let i = 0; i < 420; i++) updateLevel3(1 / 60);
      });
      const events = rows.slice(1);
      const compileFree = events.every(row => row.newPrograms === 0);
      const lightCounts = new Set(rows.map(row => row.visibleLights));
      const passingLights = []; l3PassTrain.traverse(o => { if (o.isLight) passingLights.push(o); });
      const checks = {
        compileFree, stableLights: lightCounts.size === 1,
        noPassingLights: passingLights.length === 0,
        ticketCount: l3TicketCount, trainReady: metroReady(), doorsOpen: l3State.doorsT === 1,
        noErrors: !document.getElementById('err-box')
      };
      const ok = ${baseline ? 'true' : 'compileFree && checks.stableLights && checks.noPassingLights && checks.ticketCount === 3 && checks.trainReady && checks.doorsOpen && checks.noErrors'};
      document.title = (${baseline ? "'BASELINE'" : "ok ? 'PASS' : 'FAIL'"}) + ': interaction performance';
      out.textContent = document.title + '\\n\\n' + JSON.stringify({checks, rows}, null, 2);
    } catch (error) { document.title = 'FAIL: performance'; out.textContent = document.title + '\\n' + error.stack; }
  })();
}
`;
html = html.replace(/updateOverlayRecord\(\);\s*<\/script>/, smoke + '\nupdateOverlayRecord();\n</script>');
if (!html.includes("out.id = 'performance-results'")) throw Error('检查代码未注入');
const moduleSource = html.split('<script type="module">')[1].split('</script>')[0];
const checkPath = path.join(__dirname, '.tmp-performance-check.mjs');
fs.writeFileSync(checkPath, moduleSource);
execFileSync(process.execPath, ['--check', checkPath], { stdio: 'inherit' });
const name = baseline ? 'test-performance-baseline.html' : 'test-performance.html';
fs.writeFileSync(path.join(root, name), html);
console.log('语法 PASS → /' + name + '?level=3');
