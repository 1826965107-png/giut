// 生成隔离的浏览器冒烟检查页；不改动游戏文件或通关存档。
// node tools/check-station.cjs，然后打开 /test-station.html?level=3
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'backrooms-pool.html'), 'utf8');
const online = fs.readFileSync(path.join(root, 'backrooms-pool-online.html'), 'utf8');
assert.equal(online, html
  .replace('"three": "./vendor/three/three.module.js"', '"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"')
  .replace('"three/addons/": "./vendor/three/jsm/"', '"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"'));
for (const match of html.matchAll(/['"](textures\/[^'"]+\.png)['"]/g)) {
  assert.ok(fs.existsSync(path.join(root, match[1])), 'Missing asset: ' + match[1]);
}
const moduleSource = html.split('<script type="module">')[1].split('</script>')[0];
const checkPath = path.join(__dirname, '.tmp-station-check.mjs');
fs.writeFileSync(checkPath, moduleSource);
execFileSync(process.execPath, ['--check', checkPath], { stdio: 'inherit' });
const smoke = `
{
  const results = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const output = document.createElement('pre'); output.id = 'station-check-results';
  output.style.cssText = 'position:fixed;inset:20px;z-index:200;background:#081719;color:#d8eadf;padding:24px;overflow:auto;white-space:pre-wrap;font:16px monospace';
  document.body.appendChild(output);
  try {
    enterLevel3(true);
    check(LEVEL === 2 && document.body.classList.contains('station'), 'Third level and station HUD load');
    const hallProps = [...l3HallProps.entries()];
    const separated = (a, b, gap = .12) => a.max.x + gap <= b.min.x || b.max.x + gap <= a.min.x || a.max.z + gap <= b.min.z || b.max.z + gap <= a.min.z;
    check(hallProps.length === 6 && hallProps.every(([, bounds]) => l3HallGuards.every(guard => separated(bounds, guard))), 'Mezzanine furniture clears glass and handrails by at least 12 cm');
    check(hallProps.every(([, a], i) => hallProps.slice(i + 1).every(([, b]) => separated(a, b))), 'Mezzanine furniture does not intersect other furniture');
    check(hallProps.every(([, b]) => b.min.x > -8.88 && b.max.x < 8.88 && b.min.z > 4.15 && b.max.z < 23.85 && b.min.y >= 4.99), 'Mezzanine furniture clears walls and floor');
    check(hallProps.every(([id, b]) => COLLIDERS_L3.some(c => c.hallProp === id && c.x1 <= b.min.x + L3_OX && c.x2 >= b.max.x + L3_OX && c.z1 <= b.min.z && c.z2 >= b.max.z)), 'Furniture colliders cover the rendered geometry');
    check(l3Tickets.length === 2 && !l3State.breakerOn, 'Maintenance ticket stays hidden before power');
    flipBreaker();
    check(l3Tickets.length === 3 && l3TunLights.every(l => l.intensity === 22), 'Breaker reveals ticket and lights maintenance room');
    flipLever();
    check(!l3State.trainArrived, 'Train waits for all three tickets');
    for (const index of [0, 1, 2]) {
      const d = L3_TICKET_DEFS[index]; player.x = d[0]; player.z = d[1]; player.y = d[2] - .75;
      updateL3Proximity(); tryL3Ticket();
    }
    check(l3TicketCount === 3 && l3State.trainArrived, 'All tickets plus power and points summon train');
    check(document.getElementById('station-tickets').classList.contains('done') && document.getElementById('station-mission-title').textContent.includes('上车'), 'Mission HUD reflects completed objectives');
    resetL3State();
    check(l3Tickets.length === 2 && l3TicketCount === 0 && !l3State.trainArrived, 'Replay resets tickets and train');
    player.y = 0;
    check(Math.abs(groundAt(L3_OX, 8.1) - 5/28) < .001, 'Stair height matches 18 cm first step');
    check(Math.abs(groundAt(L3_OX, 12.1) - 75/28) < .001 && groundAt(L3_OX, 16) === 5, 'Stair midpoint and mezzanine landing align');
    player.x = L3_OX; player.z = 7.7; player.y = 0; player.vy = 0; player.grounded = true; yaw = Math.PI;
    keys.clear(); keys.add('KeyW');
    for (let i = 0; i < 180; i++) updatePlayer(1/60);
    keys.clear();
    check(player.z > 16.5 && Math.abs(player.y - 5) < .02, 'Player walks up staircase without jumping or clipping');
    yaw = 0; keys.add('KeyW');
    for (let i = 0; i < 180; i++) updatePlayer(1/60);
    keys.clear();
    check(player.z < 7.9 && Math.abs(player.y) < .02, 'Player walks back down to platform');
    player.x = L3_OX; player.z = 16.7; player.y = 5; player.vy = 0; player.grounded = true; yaw = Math.PI / 2;
    keys.add('KeyW'); for (let i = 0; i < 105; i++) updatePlayer(1/60); keys.clear();
    yaw = 0; keys.add('KeyW'); for (let i = 0; i < 118; i++) updatePlayer(1/60); keys.clear();
    check(Math.abs(player.x - (L3_OX - 6)) < .15 && Math.abs(player.z - 10) < .15 && Math.abs(player.y - 5) < .02, 'West mezzanine walkway reaches ticket without crossing a guardrail');
    player.x = L3_OX; player.z = 16.7; player.y = 5; player.vy = 0; player.grounded = true; yaw = -Math.PI / 2;
    keys.add('KeyW'); for (let i = 0; i < 105; i++) updatePlayer(1/60); keys.clear();
    yaw = 0; keys.add('KeyW'); for (let i = 0; i < 118; i++) updatePlayer(1/60); keys.clear();
    check(Math.abs(player.x - (L3_OX + 6)) < .15 && Math.abs(player.z - 10) < .15 && Math.abs(player.y - 5) < .02, 'East mezzanine walkway stays open beside the stairwell');
    player.x = L3_OX; player.z = 7.4; player.y = 5; player.vy = 0; player.grounded = true; yaw = Math.PI;
    keys.add('KeyW'); for (let i = 0; i < 60; i++) updatePlayer(1/60); keys.clear();
    check(player.z < 7.6 && Math.abs(player.y - 5) < .02, 'Stairwell front guard still prevents falling from mezzanine');
    check(l3Group.userData.fareGates.length === 3 && l3Group.userData.fareGates.every(g => g.height < 1.2), 'Three waist-high fare gates replace oversized blocks');
    for (const lane of [-1.05, 1.05]) {
      player.x = L3_OX + lane; player.z = 16.7; player.y = 5; player.vy = 0; player.grounded = true; yaw = Math.PI;
      keys.add('KeyW'); for (let i = 0; i < 78; i++) updatePlayer(1/60); keys.clear();
      check(player.z > 21 && Math.abs(player.x - L3_OX - lane) < .02 && player.y === 5, 'Fare gate lane ' + lane + ' is walkable at player scale');
    }
    player.x = L3_OX; player.z = 17; player.y = 5; player.vy = 0; player.grounded = true; yaw = Math.PI;
    keys.add('KeyW'); for (let i = 0; i < 60; i++) updatePlayer(1/60); keys.clear();
    check(player.z < 17.6, 'Fare gate housing blocks the player at its visible boundary');
    check(l3Group.userData.clockClearance >= 2.05, 'Mezzanine clock clears standing players by more than two metres');
    check(l3Group.children.some(o => o.isInstancedMesh && o.count === 1000), 'Ballast details use instanced geometry');
    check(l3Group.children.filter(o => o.name === 'station-detail').length < 180, 'Small details stay batched');
    player.y = 5;
    check(groundAt(L3_OX - 6, 10) === 5, 'Upper ticket remains on mezzanine');
    player.y = 0;
    check(groundAt(L3_OX + 9, 0) === -1.25, 'Track trench height remains intact');
    respawnToLevelStart();
    check(player.x === L3_SPAWN.x && player.z === L3_SPAWN.z, 'R reset returns to station spawn');
    toggleHud(); check(document.body.classList.contains('hud-hidden'), 'H hides station HUD'); toggleHud();
    document.getElementById('station-settings').click();
    check(document.getElementById('station-settings').getAttribute('aria-expanded') === 'true', 'Settings panel opens');
    setStationPresentation(false);
    check(!document.body.classList.contains('station') && document.getElementById('hint').innerHTML === defaultHint, 'Other levels retain their original interface');
    setStationPresentation(true);
    document.title = 'PASS: ' + results.length + ' station checks';
    output.textContent = document.title + '\\n\\n' + results.map(s => '✓ ' + s).join('\\n');
  } catch (error) {
    document.title = 'FAIL: ' + error.message; output.textContent = document.title + '\\n' + error.stack;
  }
}
`;
const testHtml = html.replace(/updateOverlayRecord\(\);\s*<\/script>/, smoke + '\nupdateOverlayRecord();\n</script>');
assert.ok(testHtml.includes("output.id = 'station-check-results'"), 'Browser checks were not injected');
fs.writeFileSync(path.join(root, 'test-station.html'), testHtml);
console.log('Syntax, local assets and CDN parity: PASS. Browser checks: /test-station.html?level=3');
