// 临时探针运行器（与 check-level12-node.cjs 同构，只把断言文件换成探针）。不属于正式回归。
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'backrooms-pool.html');
const outPath = path.join(os.tmpdir(), 'l12-probe-' + process.pid + '.mjs');
const html = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script type="module">';
const s = html.indexOf(startTag);
let src = html.slice(s + startTag.length, html.indexOf('</script>', s));
const vbase = pathToFileURL(path.join(root, 'vendor', 'three')).href;
src = src.replace(/from 'three'/, `from '${vbase}/three.module.js'`);
src = src.replace(/from '(\.\.?\/[^']+)'/g, (m, rel) => `from '${pathToFileURL(path.resolve(root, rel)).href}'`);
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
  src = src.replace(new RegExp(`import \\{ ${name} \\} from 'three/addons/[^']+';`), code);
}
src = src.replace('new THREE.WebGLRenderer(', 'new __StubRenderer(');
src = src.split('new THREE.PMREMGenerator(').join('new __StubPMREM(');
const PREAMBLE = fs.readFileSync(path.join(__dirname, '_l3-node-stub.js'), 'utf8');
const anchor = 'RectAreaLightUniformsLib.init();';
const ai = src.indexOf(anchor);
src = src.slice(0, ai) + PREAMBLE + '\n' + src.slice(ai);
src = src + '\n' + fs.readFileSync(path.join(__dirname, '_l12-probe-swim.js'), 'utf8');
fs.writeFileSync(outPath, src);
execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit' });
execFileSync(process.execPath, [outPath], { stdio: 'inherit', timeout: 300000 });
