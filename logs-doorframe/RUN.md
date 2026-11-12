# 门框闪烁修复 · 验证记录（2026-11-12）

工作目录 `D:\AI\工作文件夹\游戏`；Git HEAD `fc66003b0dd39ac93310284bc783baed2af62cab`，未提交、未推送、未回滚。
本目录是这一轮「第二关门框在玩家视角移动时闪烁」的全部证据：结构扫描日志、正式回归日志、真实 WebGL 截图与旧构造 A/B 对照。

## 1. 结论一句话

旧门套的立框内侧面与墙洞切面同平面整片重合、上门套底面与门楣底面同高重合，另有墙裙压条端面探入墙体厚度带 12.5mm；三者都是同向共面，运镜时深度值相等导致光栅化互有胜负。已改为外贴门套 + 门楣让缝 + 墙裙端面让 4mm，共面计数从 347 降到 0，回归与真实 WebGL A/B 均通过。

## 2. 结构扫描（Node + 真实 vendor THREE，渲染器为桩）

| 命令 | 退出码 | 结果 | 日志 |
|---|---|---|---|
| `node tools/v2/door-coplanar.cjs`（修复前） | 0（当时未接退出码） | `BOXES 2595`、`COPLANAR_PAIRS 347`，覆盖 21 个门洞 | `coplanar-before.log` |
| `node tools/v2/door-coplanar-all.cjs`（修复前，全配对） | 0 | `ALLPAIR_HITS 547` | `allpairs.log`、`allpairs2.log` |
| `node tools/v2/door-coplanar.cjs`（修复后） | 0 | `COPLANAR_PAIRS 0`、`LEGACY_NEGCTRL_PAIRS 2 {"z":2,"x":2}`、`COPLANAR_OK` | `coplanar-after7.log` |
| `node tools/v2/door-coplanar-all.cjs`（修复后，全配对） | 0 | `ALLPAIR_HITS 0` | `allpairs3.log` |

判据：两个轴对齐 `BoxGeometry` 盒体同轴、同向（`EPS = 5e-4`）、切平面内正重叠面积 > `MIN_AREA = 2e-4 ㎡ = 200 mm²`；重叠须落在门洞 gap ±0.12 / 墙线 ±0.14 / y ∈ (0, doorH+0.15)；`y=0` 且朝下的共同接地视为合法接触；跳过 `InstancedMesh`（本地 bbox 在原点会造假阳性）。负对照按修复前老构造复原，z 向与 x 向都必须检出「立框 vs 墙洞切面」与「上沿 vs 门楣底面」两类。

## 3. 正式回归

| 命令 | 退出码 | 结果 | 日志 |
|---|---|---|---|
| `node tools/_syntax12.cjs` | 0 | `SYNTAX OK`（346005 字符） | `syntax3.log` |
| `node tools/check-l37v2-node.cjs` | 0 | **412/412 PASS** | `l37-final3.log`（早期 `l37-pathA.log`、`l37-pathB.log`、`l37-final.log`、`l37-final2.log`） |
| `node tools/check-level12-node.cjs` | 0 | L0 98/98 + L37 412/412 + L12-BEHAVIOR 65/65，`第一/二关统一回归：3 个套件全部通过` | `l12-unified.log` |
| `node tools/check-l0v2-node.cjs` | 0 | 98/98 | `l0.log` |
| `node tools/check-l12-behavior-node.cjs` | 0 | 65/65 | `l12b.log` |
| `node tools/v2/plan-check.cjs` | 0 | `pass=168 fail=0` | `plan.log` |
| `node tools/v2/l37-props-check.cjs` | 0 | `pass=1174 fail=0` | `props.log` |
| `node tools/check-level3-node.cjs` | 0 | 101/101 | `l3.log` |
| `node tools/check-level4-node.cjs` | 0 | 168/168，`L4-NODE-TESTS-OK` | `l4.log` |
| `node tools/check-level4-rework-independent.cjs` | 0 | `checks=45; failures=0` | `l4r.log` |
| `node tools/_mkcdn.cjs` | 0 | `online bytes 370259` | `cdn.log` |
| `node tools/_mkcdn.cjs --check` | 0 | `CHECK-OK online 与本地版仅 importmap 两行不同` | `cdn-check.log` |

新增断言（`tools/_l37v2-tests.js`，共 18 条）：门洞共面 12 条（真实扫描 0 对 / 21 门逐个 0 / 两轴负对照各 2 类 / 全配对 0 对 / 墙裙压条端面负对照），门套构造不变量 6 条（立框 42、上门套 21、退让 6mm、上沿对面门高与门楣抬高 ≥4mm、上沿两端压接且更厚、立框顶端藏于上沿内）。

## 4. 真实 WebGL（无头 Edge + SwiftShader）

命令：`node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=DF-01-lobby,DF-06-shower` → `SHOTS-OK 2`，退出码 0（`shots-seq3.log`；早期轮次 `shots-seq1.log`、`shots-seq2.log`）。
本机服务：`$env:PORT=8571; node server.js`（本项目 `server.js`，页面 200 / 400018 B）。

- 新构造（每机位 6 帧连续平移，`?camseq=`）：`shots12\shots12-pAttB2\DF-01-lobby-shoe-front-f2..f6.png`、`DF-06-shower-wetHall-up-f2..f6.png`，均 `ready=true`、`camBlocked=false`、`seq=6/6 seqBad=0`。
- 旧构造 A/B（`?camseq=` + `?oldcasing=1` 叠回旧门套）：`shots12\shots12-p60tML\DF-04-OLD-…`、`DF-06-OLD-…`。
- 放大对照：`logs-doorframe/evidence/DF-06-OLD-jamb-zoom2.png`（洞口侧可见点状虚线）与 `DF-06-new-jamb-zoom.png`（干净）；`DF-06-OLD-jamb-zoom.png` 为更早一轮同名图。

边界说明：SwiftShader 每帧约 5 秒（`frames=9~12` 对应 40–60 秒），420ms 间隔抓到的相邻帧可能重复，因此没有用像素差分量化闪烁；曾尝试高通/翻转比例指标（新旧 0.0156 与 0.0158，被运镜噪声淹没），已删除该脚本，改用「结构扫描 347→0」+「同机位 A/B 目视」两类证据。Node 侧为 GPU 桩下的几何断言，不是渲染结果；真实硬件 GPU 帧率与音频未测。

## 5. 本轮未做的事

- 未改 `renderOrder`、未移门洞、未加深度偏移、未降画质——修复全部来自几何构造。
- 未改碰撞与导航（门洞净空不变：立框退让 6mm 后净宽仍为名义 `gap`）。
- 未提交、未推送、未回滚；工作区既有未跟踪文件保持原样。