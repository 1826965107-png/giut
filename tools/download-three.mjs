// 下载 Three.js 0.160.0 及其 addon 依赖到本地 vendor/three
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'vendor', 'three');
const PKG = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';

const entries = [
  'build/three.module.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/postprocessing/EffectComposer.js',
  'examples/jsm/postprocessing/RenderPass.js',
  'examples/jsm/postprocessing/UnrealBloomPass.js',
  'examples/jsm/postprocessing/OutputPass.js',
  'examples/jsm/objects/Water.js',
  'examples/jsm/lights/RectAreaLightUniformsLib.js',
];

function outFile(rel) {
  if (rel === 'build/three.module.js') return join(OUT, 'three.module.js');
  if (rel.startsWith('examples/jsm/')) return join(OUT, 'jsm', rel.slice('examples/jsm/'.length));
  return join(OUT, rel);
}

// 把 URL 路径按 POSIX 处理
const posixJoin = (...p) => p.join('/').replace(/([^:])\/{2,}/g, '$1/').replace(/\/\.\//g, '/');
function relDir(rel) { return rel.split('/').slice(0, -1).join('/'); }
function resolveRel(fromRel, spec) {
  const parts = (relDir(fromRel) || '.').split('/').filter(Boolean);
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.join('/');
}

const queue = [...entries];
const seen = new Set();
const failed = [];
let count = 0;

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);

  const url = PKG + rel;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    failed.push(`${rel}  FETCH-ERR ${e.message}`);
    continue;
  }
  if (!res.ok) {
    failed.push(`${rel}  HTTP ${res.status}`);
    continue;
  }
  const text = await res.text();
  const dest = outFile(rel);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, text, 'utf8');
  count++;
  console.log(`ok  ${rel}  (${text.length}B)`);

  for (const m of text.matchAll(/import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (spec === 'three') continue;
    if (spec.startsWith('.')) {
      queue.push(resolveRel(rel, spec));
    } else {
      // 非 three 的裸导入，记录以便人工确认
      console.log(`    skip bare import: ${spec}`);
    }
  }
}

console.log(`\nDONE files=${count}`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log('  ' + f);
  process.exitCode = 1;
}