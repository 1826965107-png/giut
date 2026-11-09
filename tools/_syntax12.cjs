// 仅做语法检查：把 backrooms-pool.html 的 module script 抽到临时 .mjs，再跑 node --check。
// 不执行任何游戏代码，不需要桩。退出码即 node --check 的退出码。
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const htmlPath = path.join(__dirname, '..', 'backrooms-pool.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no module script found'); process.exit(2); }
const body = m[1];
const outPath = path.join(os.tmpdir(), '_bp12_syntax.mjs');
fs.writeFileSync(outPath, body, 'utf8');
console.log(`extracted ${body.length} chars -> ${outPath}`);
try {
  execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit', timeout: 120000 });
  console.log('SYNTAX OK');
} catch (e) {
  console.error('SYNTAX FAIL exit=' + (e.status == null ? 'null' : e.status));
  process.exit(e.status == null ? 1 : e.status);
}