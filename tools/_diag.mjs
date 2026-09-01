import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const h = readFileSync(new URL('../backrooms-pool.html', import.meta.url), 'utf8');
const k = '<script type="module">';
const i = h.indexOf(k) + k.length;
const j = h.indexOf('</script>', i);
if (j < 0) { console.error('module closing tag not found'); process.exit(1); }
writeFileSync(new URL('../.tmp-check.mjs', import.meta.url), h.slice(i, j));
console.log('extracted', j - i, 'chars');

// —— 静态引用扫描：调用但未定义的标识符 ——
const code = h.slice(i, j);
const defined = new Set();
for (const m of code.matchAll(/(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of code.matchAll(/\bimport\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);   // default-ish, 粗略
const calls = new Set();
for (const m of code.matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) calls.add(m[1]);
const builtin = new Set(['if','for','while','switch','catch','return','function','new','typeof','instanceof','in','of','Math','Number','String','Array','Object','JSON','parseFloat','parseInt','setTimeout','Promise','Set','Map','performance','requestAnimationFrame','isNaN','Float32Array','Uint8Array','Uint16Array','Int8Array','console','window','document','isFinite','Date','URL','RegExp','Error','null','undefined','true','false','Infinity','NaN','decodeURIComponent','encodeURIComponent','BigInt','Symbol','WeakMap','Proxy','Reflect','Atomics','structuredClone','queueMicrotask','Blob','FileReader','Image','AudioContext','webkitAudioContext']);
const flagged = [...calls].filter(x => !defined.has(x) && !builtin.has(x));
console.log('可能未定义（含 three 导出/方法调用，需人工判断）:');
console.log(flagged.join(', ') || '(无)');