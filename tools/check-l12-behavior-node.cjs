// L12 行为回归（独立进程）：黑影 AI / 交互二次校验 / 池中人归属 / 预览不写档。真实 vendor THREE + 从 backrooms-pool.html 抽出的真实模块代码，
// 只桩化「渲染器 / 画布 2D / 音频 / 图片解码 / DOM UI」。几何、碰撞、寻路、行走全部真实实现。
// 由统一入口 check-level12-node.cjs 串行调用，保证与几何套件互不污染状态。
// 用法：node tools/check-l0v2-node.cjs
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'backrooms-pool.html');
const outPath = path.join(os.tmpdir(), 'l12b-node-' + process.pid + '.mjs');

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

const PREAMBLE = fs.readFileSync(path.join(__dirname, '_l3-node-stub.js'), 'utf8');
const anchor = 'RectAreaLightUniformsLib.init();';
const ai = src.indexOf(anchor);
if (ai < 0) throw new Error('找不到 import 段结尾');
src = src.slice(0, ai) + PREAMBLE + '\n' + src.slice(ai);

src = src + '\n' + fs.readFileSync(path.join(__dirname, '_l12-behavior-tests.js'), 'utf8');
fs.writeFileSync(outPath, src);
execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit' });
try {
  execFileSync(process.execPath, [outPath], { stdio: 'inherit', timeout: 300000 });
} catch (e) {
  console.error('L12 行为回归失败：' + (e.status !== undefined ? 'exit ' + e.status : e.message));
  process.exitCode = 1;
}
