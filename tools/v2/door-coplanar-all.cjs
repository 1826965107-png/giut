// 临时诊断（不入库断言）：扫描门洞邻域「所有」轴对齐盒体的同向共面重叠（不限门套），
// 用于确认除门套外是否还有别的共面面（墙裙、压条、地面、门楣等）。
// 用法：node tools/v2/door-coplanar-all.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const htmlPath = path.join(root, 'backrooms-pool.html');
const outPath = path.join(os.tmpdir(), 'door-all-' + process.pid + '.mjs');

const html = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script type="module">';
const s = html.indexOf(startTag);
if (s < 0) throw new Error('找不到 module script');
let src = html.slice(s + startTag.length, html.indexOf('</script>', s));

const vbase = pathToFileURL(path.join(root, 'vendor', 'three')).href;
src = src.replace(/from 'three'/, `from '${vbase}/three.module.js'`);
src = src.replace(/from '(\.\.?\/[^']+)'/g, (m, rel) => {
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) throw new Error('相对 import 指向不存在的文件: ' + rel);
  return `from '${pathToFileURL(abs).href}'`;
});
const ADDON_STUBS = {
  EffectComposer: `class EffectComposer { constructor(renderer) { this.renderer = renderer; this.passes = []; this.size = { width: 1280, height: 720 }; } addPass(p) { this.passes.push(p); } removePass() {} render() {} reset() {} setSize(w, h) { this.size = { width: w, height: h }; } setPixelRatio() {} dispose() {} }`,
  RenderPass: `class RenderPass { constructor(scene, camera) { this.scene = scene; this.camera = camera; } setSize() {} dispose() {} }`,
  UnrealBloomPass: `class UnrealBloomPass { constructor(res, strength, radius, threshold) { this.resolution = res; this.strength = strength; this.radius = radius; this.threshold = threshold; } setSize() {} dispose() {} }`,
  OutputPass: `class OutputPass { constructor() {} setSize() {} dispose() {} }`,
  ShaderPass: `class ShaderPass { constructor(shader) { this.uniforms = (shader && shader.uniforms) || {}; this.material = { uniforms: this.uniforms }; this.enabled = true; } setSize() {} dispose() {} }`,
  Water: `class Water extends THREE.Mesh { constructor(geo, opts) { super(geo, new THREE.MeshBasicMaterial({ color: 0x0a1a20, transparent: true })); this.options = opts || {}; this.material.uniforms = new Proxy({}, { get: (t, k) => (t[k] || (t[k] = { value: __uobj() })), has: () => true, set: (t, k, v) => (t[k] = v, true) }); } }`,
  RectAreaLightUniformsLib: `const RectAreaLightUniformsLib = { init() {}, ready: true }`,
};
for (const [name, code] of Object.entries(ADDON_STUBS)) {
  const re = new RegExp(`import \\{ ${name} \\} from 'three/addons/[^']+';`);
  if (!re.test(src)) throw new Error('缺少 addon import: ' + name);
  src = src.replace(re, code);
}
src = src.replace('new THREE.WebGLRenderer(', 'new __StubRenderer(');
src = src.split('new THREE.PMREMGenerator(').join('new __StubPMREM(');

const PREAMBLE = fs.readFileSync(path.join(root, 'tools', '_l3-node-stub.js'), 'utf8');
const anchor = 'RectAreaLightUniformsLib.init();';
const ai = src.indexOf(anchor);
if (ai < 0) throw new Error('找不到 import 段结尾');
src = src.slice(0, ai) + PREAMBLE + '\n' + src.slice(ai);

src += '\n' + fs.readFileSync(path.join(__dirname, 'door-coplanar-scan.js'), 'utf8');
src += `
const __CP = globalThis.__L12_COPLANAR;
enterPoolroomsPreview(3, 20);
const __boxes = __CP.collectBoxes(THREE, scene);
const __hits = __CP.scanPairs(__boxes, L37_DOORS_V2, { onlyCasing: false });
console.log('ALLPAIR_BOXES', __boxes.length, 'ALLPAIR_HITS', __hits.length);
const __by = new Map();
for (const h of __hits) {
  const nm = b => (b.mesh.name || '(anon)') + '[' + (b.mesh.material && b.mesh.material.name ? b.mesh.material.name : '?' ) + ']';
  const k = nm(h.A) + ' vs ' + nm(h.B);
  __by.set(k, (__by.get(k) || 0) + 1);
}
const __rows = [...__by.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, n] of __rows.slice(0, 25)) console.log('PAIR', n + 'x', k);
const __fmt = b => (b.mesh.name || '(anon)') + '(' +
  (b.max.x - b.min.x).toFixed(2) + 'x' + (b.max.y - b.min.y).toFixed(2) + 'x' + (b.max.z - b.min.z).toFixed(2) +
  ' @' + ((b.min.x + b.max.x) / 2).toFixed(2) + ',' + ((b.min.y + b.max.y) / 2).toFixed(2) + ',' + ((b.min.z + b.max.z) / 2).toFixed(2) + ')';
for (const h of __hits.slice(0, 12)) {
  console.log('DETAIL', h.ax + h.side, 'plane=' + h.plane.toFixed(4), 'area=' + h.area.toFixed(4),
    'door=' + h.d.axis + '@' + h.d.coord + 'gap[' + h.d.gap + ']', __fmt(h.A), 'vs', __fmt(h.B));
}
// 匿名对（美术件）单独抽 8 条，方便判断是不是墙裙/压条端面
const __anon = __hits.filter(h => !/^l12Casing/.test(h.A.mesh.name || '') && !/^l12Casing/.test(h.B.mesh.name || ''));
console.log('ANON_HITS', __anon.length);
for (const h of __anon.slice(0, 8)) {
  console.log('ANON', h.ax + h.side, 'plane=' + h.plane.toFixed(4), 'area=' + h.area.toFixed(4), __fmt(h.A), 'vs', __fmt(h.B));
}
const __areas = [...new Set(__hits.map(h => h.area.toFixed(4)))].sort();
console.log('AREAS', __areas.join(' '));
// 面积最大的 10 条：最可能是真正会被看见的成片共面
const __big = __hits.slice().sort((a, b) => b.area - a.area).slice(0, 10);
for (const h of __big) {
  console.log('BIG', h.area.toFixed(4), h.ax + h.side, 'plane=' + h.plane.toFixed(3), __fmt(h.A), 'vs', __fmt(h.B));
}
`;
fs.writeFileSync(outPath, src);
execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit' });
try {
  execFileSync(process.execPath, [outPath], { stdio: 'inherit', timeout: 300000 });
} catch (e) {
  console.error('门洞全配对扫描失败：' + (e.status !== undefined ? 'exit ' + e.status : e.message));
  process.exitCode = 1;
}