#!/usr/bin/env node
/* sync-online.cjs — 生成本地版 → CDN 双击版的副本。
   backrooms-pool-online.html 必须与 backrooms-pool.html 逐字节一致，只替换 importmap 里的
   两行（three 与 three/addons 由 ./vendor/ 换成 jsDelivr CDN）—— tools/check-metro.cjs 与
   tools/check-station.cjs 的“CDN 一致性”断言就是按这个替换规则比对的，所以不要手工改别的字符。

   用法：
     node sync-online.cjs           # 重新生成并覆盖 backrooms-pool-online.html
     node sync-online.cjs --check   # 只校验当前副本是否同步（不同步时退出码 1）
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'backrooms-pool.html');
const DST = path.join(ROOT, 'backrooms-pool-online.html');
const PAIRS = [
  ['"three": "./vendor/three/three.module.js"', '"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"'],
  ['"three/addons/": "./vendor/three/jsm/"', '"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"'],
];

function build() {
  let html = fs.readFileSync(SRC, 'utf8');
  for (const [from, to] of PAIRS) {
    if (!html.includes(from)) throw new Error('importmap 锚点找不到：' + from);
    html = html.split(from).join(to);
  }
  return html;
}

const want = build();
const checkOnly = process.argv.includes('--check');
let cur = null;
try { cur = fs.readFileSync(DST, 'utf8'); } catch (e) { cur = null; }

if (checkOnly) {
  if (cur === want) { console.log('online 副本已同步（' + want.length + ' 字符）。'); process.exit(0); }
  console.log('online 副本未同步：本地 ' + want.length + ' 字符 / 副本 ' + (cur ? cur.length : '(缺失)') + ' 字符。');
  process.exit(1);
}

if (cur === want) { console.log('已有副本与本地一致，无需写入。'); process.exit(0); }

try {
  fs.writeFileSync(DST, want);
  console.log('已同步 backrooms-pool-online.html（' + want.length + ' 字符）。');
} catch (e) {
  console.error('写入失败：' + e.code + ' ' + e.message);
  console.error('该文件在当前权限下不可写；请在普通终端（不经沙箱）重新运行本脚本。');
  process.exit(2);
}