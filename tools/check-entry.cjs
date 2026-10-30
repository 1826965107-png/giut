const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const local = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');
const online = fs.readFileSync(path.join(root, 'backrooms-pool-online.html'), 'utf8');
function route(html, protocol, search = '') {
  const script = html.match(/<script id="local-file-entry">([\s\S]*?)<\/script>/)[1];
  const importmap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
  let redirected;
  vm.runInNewContext(script, {
    URL,
    location: { protocol, search, replace: value => { redirected = value; } },
    document: { querySelector: () => ({ textContent: importmap }) }
  });
  return redirected;
}
assert.equal(route(local, 'file:'), 'http://127.0.0.1:8555/backrooms-pool.html');
assert.equal(route(local, 'file:', '?level=3&cam=180,2,0&diag=1'), 'http://127.0.0.1:8555/backrooms-pool.html?level=3');
assert.equal(route(local, 'http:', '?level=3'), undefined);
assert.equal(route(local, 'file:', '?level=4&cam=360,1.6,0&diag=1'), 'http://127.0.0.1:8555/backrooms-pool.html?level=4');
assert.equal(route(local, 'http:', '?level=4'), undefined);
assert.equal(route(online, 'file:'), undefined);
console.log('PASS: 6 entry routing checks');

// 测试专用临时端口，不打开浏览器，不影响正在玩的 8555 服务。
async function checkLauncher() {
  const http = require('node:http');
  const { launchGame } = require('./launch-game.cjs');
  const foreign = http.createServer((req, res) => res.end('unrelated service'));
  await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve));
  const port = foreign.address().port;
  try {
    await assert.rejects(launchGame({ port, noOpen: true }), /其他服务占用/);
  } finally { await new Promise(resolve => foreign.close(resolve)); }
  let started;
  try {
    started = await launchGame({ port, level: 3, noOpen: true });
    assert.equal(started.started, true);
    assert.ok(started.serverPid);
    const reused = await launchGame({ port, level: 3, noOpen: true });
    assert.equal(reused.started, false);
    assert.equal(reused.url, `http://127.0.0.1:${port}/backrooms-pool.html?level=3`);
    const response = await fetch(reused.url);
    assert.equal(await response.text(), local);
    const level4 = await launchGame({ port, level: 4, noOpen: true });
    assert.equal(level4.started, false);
    assert.equal(level4.url, `http://127.0.0.1:${port}/backrooms-pool.html?level=4`);
    const moduleResponse = await fetch(`http://127.0.0.1:${port}/levels/level4-tunnel.js`);
    assert.equal(moduleResponse.status, 200);
    assert.equal(await moduleResponse.text(), fs.readFileSync(path.join(root, 'levels/level4-tunnel.js'), 'utf8'));
    console.log('PASS: launcher conflict, background startup, service reuse and page loading');
  } finally {
    if (started?.serverPid) process.kill(started.serverPid);
  }
}
checkLauncher().catch(error => { console.error(error); process.exitCode = 1; });
