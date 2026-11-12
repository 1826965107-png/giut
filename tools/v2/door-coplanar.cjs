// 第二关门洞共面/重叠扫描（真实 vendor THREE，只桩渲染器/画布/音频/图片/DOM）。
// 用途：门框在玩家移动时闪烁的回归检测。findings > 0 时退出码 1。
// 用法：node tools/v2/door-coplanar.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const htmlPath = path.join(root, 'backrooms-pool.html');
const outPath = path.join(os.tmpdir(), 'door-coplanar-' + process.pid + '.mjs');

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
const before = src.split('new THREE.WebGLRenderer(').length - 1;
if (before !== 1) throw new Error('WebGLRenderer 构造点数量异常: ' + before);
src = src.replace('new THREE.WebGLRenderer(', 'new __StubRenderer(');
src = src.split('new THREE.PMREMGenerator(').join('new __StubPMREM(');

const PREAMBLE = fs.readFileSync(path.join(__dirname, '..', '_l3-node-stub.js'), 'utf8');
const anchor = 'RectAreaLightUniformsLib.init();';
const ai = src.indexOf(anchor);
if (ai < 0) throw new Error('找不到 import 段结尾');
src = src.slice(0, ai) + PREAMBLE + '\n' + src.slice(ai);

src = src + '\n' + fs.readFileSync(path.join(__dirname, 'door-coplanar-scan.js'), 'utf8');
src = src + '\n' + fs.readFileSync(path.join(__dirname, '_door-coplanar-probe.js'), 'utf8');
fs.writeFileSync(outPath, src);
execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit' });
let code = 0;
try {
  execFileSync(process.execPath, [outPath], { stdio: 'inherit', timeout: 300000 });
} catch (e) {
  code = e.status === undefined ? 1 : e.status;
  console.error('门洞共面扫描失败：exit ' + code);
}
process.exitCode = code;