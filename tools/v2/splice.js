// 备选接入工具：一次性把"新平面数据 + 新建造段"接进宿主。
// 注意：本机沙箱下 pwsh/node 子进程不能覆写既有文件（EPERM / Access denied），
// 因此该脚本只能在获得一次性提权时执行；默认路径仍是用编辑工具分段接入。
// 组装必须使用**有界切片**，任何 slice(n) 到文件末尾的写法都会重复模块与声明。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HOST = path.join(ROOT, 'backrooms-pool.html');
const lines = fs.readFileSync(HOST, 'utf8').split(/\r?\n/);

// 断言锚点（防止行号漂移后切错段）
const must = (i, re, label) => {
  if (!re.test(lines[i - 1] || '')) throw new Error(`锚点不匹配 ${label} @${i}: ${lines[i - 1]}`);
};
must(580, /^\/\* =+ 地图数据/, '数据段起点');
must(620, /^\/\* =+ 关卡状态|^const BOUNDS_L0/, '数据段终点');
must(1280, /L37|泳池层/, 'L37 建造段起点');
must(1985, /桥|黑影|WATCHER/, 'L37 建造段终点');
must(2746, /Level 0/, 'L0 建造段起点');
must(3388, /手电筒|FLASHLIGHT/, 'L0 建造段终点');

const dataJs = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const l37Js = fs.readFileSync(path.join(__dirname, 'l37.js'), 'utf8');
const l0Js = fs.readFileSync(path.join(__dirname, 'l0.js'), 'utf8');

const out = []
  .concat(lines.slice(0, 579))          // 1..579
  .concat(dataJs.split(/\r?\n/))        // 新数据段
  .concat(lines.slice(619, 1279))       // 620..1279（有界）
  .concat(l37Js.split(/\r?\n/))
  .concat(lines.slice(1984, 2745))      // 1985..2745（有界）
  .concat(l0Js.split(/\r?\n/))
  .concat(lines.slice(3387));           // 3388..end

fs.writeFileSync(HOST, out.join('\n'), 'utf8');
console.log(`spliced -> ${out.length} lines`);
