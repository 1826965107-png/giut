// 生成 CDN 版页面。
// 旧版本把源工作区绝对路径写死在这里，
// 一运行就会覆盖工作区以外的文件；现在所有路径都以本文件所在目录推导，
// 只读写当前制作目录里的 backrooms-pool.html / backrooms-pool-online.html。
// 用法：node tools/_mkcdn.cjs          生成 CDN 版
//       node tools/_mkcdn.cjs --check  只校验：online 版是否等于"本地版仅 importmap 两行不同"
const fs = require('node:fs');
const path = require('node:path');

const CHECK_ONLY = process.argv.includes('--check');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'backrooms-pool.html');
const dst = path.join(root, 'backrooms-pool-online.html');

const THREE_VER = '0.160.0';
const CDN_BUILD = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER + '/build/three.module.js';
const CDN_ADDONS = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER + '/examples/jsm/';

// [原文（HTML 里的 importmap 条目）, 替换目标, 兜底正则]
const PAIRS = [
  ['"three": "./vendor/three/three.module.js"', '"three": "' + CDN_BUILD + '"', /"three"\s*:\s*"[^"]*"/],
  ['"three/addons/": "./vendor/three/jsm/"', '"three/addons/": "' + CDN_ADDONS + '"', /"three\/addons\/"\s*:\s*"[^"]*"/],
];

if (!fs.existsSync(src)) throw new Error('找不到本地版页面：' + src);
let s = fs.readFileSync(src, 'utf8');
if (s.indexOf('type="importmap"') < 0) throw new Error('没有 importmap，拒绝写出：' + src);

for (const [exact, to, re] of PAIRS) {
  if (s.indexOf(exact) >= 0) {
    s = s.split(exact).join(to);
    continue;
  }
  // importmap 排版可能被改过：退一步按正则替换，但必须真的换掉了才算数
  if (!re.test(s)) throw new Error('importmap 里找不到要替换的条目，拒绝写出坏文件：' + exact);
  s = s.replace(re, to);
}

if (s.indexOf(CDN_BUILD) < 0 || s.indexOf(CDN_ADDONS) < 0) {
  throw new Error('替换后仍没有 CDN 地址，拒绝写出坏文件');
}
if (CHECK_ONLY) {
  if (!fs.existsSync(dst)) {
    console.error('CHECK-FAIL  没有 CDN 版文件：' + dst);
    process.exit(1);
  }
  const cur = fs.readFileSync(dst, 'utf8');
  if (cur === s) {
    console.log('CHECK-OK  online 与本地版仅 importmap 两行不同（' + cur.length + ' 字节）');
    process.exit(0);
  }
  let i = 0;
  while (i < cur.length && i < s.length && cur[i] === s[i]) i++;
  console.error('CHECK-FAIL  CDN 版与本地版不同步');
  console.error('  expected bytes ' + s.length + ' / actual bytes ' + cur.length);
  console.error('  首个差异偏移 ' + i);
  console.error('  expected: ' + JSON.stringify(s.slice(i, i + 90)));
  console.error('  actual  : ' + JSON.stringify(cur.slice(i, i + 90)));
  process.exit(1);
}

// levels/ 与 textures/ 这些相对路径保持本地（随页面一起发布）
fs.writeFileSync(dst, s, 'utf8');
console.log('本地版 : ' + src);
console.log('CDN 版 : ' + dst);
console.log('three  : ' + CDN_BUILD);
console.log('addons : ' + CDN_ADDONS);
console.log('online bytes ' + s.length);
