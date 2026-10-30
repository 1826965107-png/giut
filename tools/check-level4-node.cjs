// 第四关纯 Node 冒烟：真实 vendor THREE + 从 backrooms-pool.html 抽出的真实模块代码 +
// 真实 levels/level4-tunnel.js（走文件 URL 导入，不是内联复制）。
// 只桩化「渲染器 / 画布 2D / 音频 / 图片解码 / DOM UI」，几何、碰撞、地面高度场、净高、
// 门/接缝/灯光池全部跑真实实现。
// 用法：node tools/check-level4-node.cjs
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'backrooms-pool.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const startTag = '<script type="module">';
const s = html.indexOf(startTag);
if (s < 0) throw new Error('找不到 module script');
let src = html.slice(s + startTag.length, html.indexOf('</script>', s));

// 1) import map → 真实 vendor 文件；后处理/水面这类纯 GPU 插件替换为同名桩类
const vbase = pathToFileURL(path.join(root, 'vendor', 'three')).href;
src = src.replace(/from 'three'/, `from '${vbase}/three.module.js'`);

// 2) 项目内相对 import 必须解析到真实文件 URL（L4 模块是真实文件，不是内联副本）
const L4_REL = './levels/level4-tunnel.js';
const L4_ABS = path.resolve(root, 'levels', 'level4-tunnel.js');
if (!fs.existsSync(L4_ABS)) throw new Error('缺少真实模块文件 levels/level4-tunnel.js');
if (!src.includes(`from '${L4_REL}'`)) throw new Error('HTML 未从 ' + L4_REL + ' 导入第四关模块');
src = src.replace(/from '(\.\.?\/[^']+)'/g, (m, rel) => {
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) throw new Error('相对 import 指向不存在的文件: ' + rel);
  return `from '${pathToFileURL(abs).href}'`;
});
if (!src.includes(pathToFileURL(L4_ABS).href)) throw new Error('第四关 import 没有解析成真实文件 URL');

// 2b) 断言要用到的额外导出名：只改测试模块的 import 名表，生产 HTML 的 import 一行不动
src = src.replace(/import\s*\{([^}]*)\}\s*from\s*'([^']*level4-tunnel\.js)'/, (m, names, url) => {
  const set = new Set(names.split(',').map(t => t.trim()).filter(Boolean));
  ['L4_SEAM', 'L4_LAYOUT'].forEach(n => set.add(n));
  return `import { ${[...set].join(', ')} } from '${url}';`;
});
if (!/L4_SEAM/.test(src)) throw new Error('测试模块未能拿到 L4_SEAM 导出');

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

// 3) 渲染器构造替换为桩（仅此一处；其余构造全部真跑）
const before = src.split('new THREE.WebGLRenderer(').length - 1;
if (before !== 1) throw new Error('WebGLRenderer 构造点数量异常: ' + before);
src = src.replace('new THREE.WebGLRenderer(', 'new __StubRenderer(');
src = src.split('new THREE.PMREMGenerator(').join('new __StubPMREM(');

// 4) 在 import 段之后插入 Node 桩
const PREAMBLE = fs.readFileSync(path.join(__dirname, '_l3-node-stub.js'), 'utf8');
const anchor = 'RectAreaLightUniformsLib.init();';
const ai = src.indexOf(anchor);
if (ai < 0) throw new Error('找不到 import 段结尾');
src = src.slice(0, ai) + PREAMBLE + '\n' + src.slice(ai);

// 5) 文件尾追加第四关真实断言
const TESTS = fs.readFileSync(path.join(__dirname, '_l4-node-tests.js'), 'utf8');
src = src + '\n' + TESTS;

// tools/ 在部分环境下不允许新建文件（EPERM）——写不进去就落到系统临时目录，
// 生成的模块用绝对 file:// URL 引用 vendor three 与 levels/level4-tunnel.js，位置无关。
let tmpChoice = path.join(__dirname, '.tmp-l4-node.mjs');
try {
  fs.writeFileSync(tmpChoice, src);
} catch (e) {
  tmpChoice = path.join(require('node:os').tmpdir(), 'dsh-tmp-l4-node.mjs');
  fs.writeFileSync(tmpChoice, src);
  console.log('（tools/ 不可写: ' + e.code + '，临时模块落在 ' + tmpChoice + '）');
}
const outPath = tmpChoice;
execFileSync(process.execPath, ['--check', outPath], { stdio: 'inherit' });
// stdio 必须 inherit：本机沙箱不允许父进程通过管道捕获子进程输出（spawn EPERM）
try {
  execFileSync(process.execPath, [outPath], { stdio: 'inherit', timeout: 300000 });
} catch (e) {
  console.error('第四关冒烟失败：' + (e.status !== undefined ? 'exit ' + e.status : e.message));
  process.exitCode = 1;
}