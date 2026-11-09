// 第一/二关统一 Node 回归入口（V2 地图）。
// 三个套件各自在独立进程 + 独立临时模块中运行，互不污染状态：
//   1) L0 六区 / 三保险丝 / 出口 / 连续行走        → _l0v2-tests.js
//   2) L37 四池 / 干湿顺序 / 坐台 / 标识 / 绕池路线 → _l37v2-tests.js
//   3) 黑影 AI / 交互二次校验 / 池中人归属 / 预览   → _l12-behavior-tests.js
// 真实 vendor THREE + 真实几何/碰撞/寻路/AI 代码；只桩化渲染器/画布/音频/图片/DOM。
// 这是 GPU 桩下的几何与行为回归，不能替代浏览器真实 WebGL 渲染验证。
// 用法：node tools/check-level12-node.cjs
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SUITES = [
  ['L0 v2 几何/行走', 'check-l0v2-node.cjs'],
  ['L37 v2 几何/材质/路线', 'check-l37v2-node.cjs'],
  ['L12 行为（AI/交互/池中人/预览）', 'check-l12-behavior-node.cjs'],
];

let failed = 0;
for (const [name, file] of SUITES) {
  const p = path.join(__dirname, file);
  process.stdout.write('\n### ' + name + ' → node tools/' + file + '\n');
  try {
    execFileSync(process.execPath, [p], { stdio: 'inherit', timeout: 900000 });
  } catch (e) {
    failed++;
    console.error('套件失败：' + name + '（' + (e.status !== undefined ? 'exit ' + e.status : e.message) + '）');
  }
}
if (failed) console.error('第一/二关统一回归：' + failed + ' 个套件失败');
else console.log('第一/二关统一回归：3 个套件全部通过');
process.exitCode = failed ? 1 : 0;
