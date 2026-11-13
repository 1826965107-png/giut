# 门框闪烁修复 · 验证记录（2026-11-12）

工作目录 `D:\AI\工作文件夹\游戏`。
本节记录的是**修复当时**（2026-11-12）在基线 `fc66003b0dd39ac93310284bc783baed2af62cab` 上做的操作；修复已随提交 `6f1ab0b034aa9c37cae6e3fccfd8c843a227a0a8` 于 2026-11-12 提交并推送，因此"未提交"只描述当日基线。2026-11-13 的逐帧证据与文档校正见第 6 节。
本目录是这一轮「第二关门框在玩家视角移动时闪烁」的全部证据：结构扫描日志、正式回归日志、真实 WebGL 截图与旧门套叠加负对照。

## 1. 结论一句话

旧门套的立框内侧面与墙洞切面同平面整片重合、上门套底面与门楣底面同高重合，另有墙裙压条端面探入墙体厚度带 12.5mm；三者都是同向共面，运镜时深度值相等导致光栅化互有胜负。已改为外贴门套 + 门楣让缝 + 墙裙端面让 4mm，共面计数从 347 降到 0。

> 计数口径：修复前这 347 对里含 120 对共同接地底面（`plane=0`、法向朝下埋在楼板里，玩家看不到），**可见面冲突为 227 对**；文档与报告里不把 347 全部称作"可见闪烁面"。全配对诊断的 547 命中另含墙裙/压条等非门套件。

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
- 旧门套叠加负对照（`?camseq=` + `?oldcasing=1`）：`shots12\shots12-p60tML\DF-04-OLD-…`、`DF-06-OLD-…`。注意 `oldcasing=1` **只把修复前的旧立框与旧上沿重新摆到新场景上**，并不恢复旧门楣与旧墙裙，所以它是"旧门套构造会共面"的叠加负对照，**不是完整旧版本复现**。
- 放大对照：`logs-doorframe/evidence/DF-06-OLD-jamb-zoom2.png`（洞口侧可见点状虚线）与 `DF-06-new-jamb-zoom.png`（干净）；`DF-06-OLD-jamb-zoom.png` 为更早一轮同名图。

边界说明：SwiftShader 每帧约 5 秒（`frames=9~12` 对应 40–60 秒），420ms 间隔抓到的相邻帧可能重复，因此没有用像素差分量化闪烁；曾尝试高通/翻转比例指标（新旧 0.0156 与 0.0158，被运镜噪声淹没），已删除该脚本，改用「结构扫描 347→0」+「同机位 A/B 目视」两类证据。Node 侧为 GPU 桩下的几何断言，不是渲染结果；真实硬件 GPU 帧率与音频未测。

## 5. 本轮未做的事

- 未改 `renderOrder`、未移门洞、未加深度偏移、未降画质——修复全部来自几何构造。
- 未改碰撞与导航（门洞净空不变：立框退让 6mm 后净宽仍为名义 `gap`）。
- 未提交、未推送、未回滚；工作区既有未跟踪文件保持原样。
## 6. 逐帧门控证据（2026-11-13 补拍）

旧写法是固定 420ms 间隔连抓，日志里没有"这张图对应哪个真实绘制帧"，SwiftShader 每帧约 5 秒，间隔短于帧时长就可能抓到同一帧。本轮改为按 `?diag=1` 的 `frames`（`diagDrawFrames`，每次 `composer.render()` 后自增）门控：

- `tools/shots12.cjs` 新增 `--framegated=1` 与 `--fgap=2`：每张截图前先等 `frames` 推进 ≥ `--fgap`，截图后立刻再读一次标题里的 `frames`、`cam`、`camRot`；**帧号没前进或相机没移动即判 `duplicate-frame` / `camera-not-moved`，不计入成功**并继续重试（允许跨帧，不允许重复帧当成功）。
- 成功判定改为 `gatedOk >= 3`（`shot.fmin` 默认 3）才算该机位序列通过；日志把静态首张与门控张数分开打印（`static=1 gatedOk=6/6 gatedEnough=true`），不再出现 `7/6` 这种混算。
- 宿主 `?diag=1` 的标题 JSON 增加 `camRot: [pitch, yaw]`，便于逐帧记录机位朝向（只加字段，不影响玩法与渲染）。

实拍（新目录，独立临时 Edge profile，未操作用户浏览器）：

| 命令 | 退出码 | 结果 | 日志 |
|---|---|---|---|
| `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --framegated=1 --fgap=2 --only=DF-01-lobby-shoe-front,DF-06-shower-wetHall-up` | 0 | 两机位各 6 张门控帧，全部 `SEQ-OK` | `shots-framegated.log` |
| `node tools/shots12.cjs … --framegated=1 --fgap=2 --only=DF-01-lobby-shoe-front` | 0 | 校正计数器后的复验：`static=1 gatedOk=6/6 gatedFailed=0 gatedEnough=true` | `shots-framegated2.log` |

逐帧记录（取自 `shots-report.json`，`frames A->B` 为截图前后帧号，`cam` 为截图前后相机坐标，单位米）：

- `DF-01-lobby-shoe-front`（`shots12\shots12-jgYCQb\`）：`F21` 17→21 `[0.94,1.62,20.27] → [1.02,1.62,20.28]`；`F28` 24→28 `[1.08,…] → [1.16,…]`；`F36` 32→36；`F42` 38→42；`F48` 44→48；`F54` 50→54（yaw 0.182→0.255 rad 连续增大）。
- `DF-06-shower-wetHall-up`（同目录）：`F23` 16→23 `[-3.34,1.62,4.35] → [-3.31,1.62,4.51]`；`F31` 27→31；`F39` 35→39；`F47` 43→47；`F55` 50→55；`F63` 59→63（yaw 1.626→1.722 rad）。
- 复验（`shots12\shots12-wxuMAl\`，DF-01）：`F21/F28/F34/F40/F46/F52`，帧号与相机逐张递进，无重复帧。

口径说明：`frames A->B` 是"截图前读到 A、截图后读到 B"，真实截图落在该窗口内的某一个真实绘制帧（`captureScreenshot` 每次会让无头浏览器再推进若干帧），因此只能保证"落在 A..B 之间"，不能声称精确对应某单一帧号；相邻两张之间帧号至少相差 5，相机位移约 8cm，确实不是同一帧。SwiftShader 单帧约 4–6 秒，本次 6 张门控帧的单机位耗时约 4 分钟；硬件 GPU 帧率与肉眼观看下的闪烁主观评价仍未测，也没有做像素级量化（该指标此前被运镜噪声淹没，已放弃）。

口径补充：`shots12\shots12-jgYCQb\shots-report.json` 由修正计数之前的脚本生成，逐帧 `framesBefore/framesAfter/camBefore/camAfter/camRot` 齐全但没有 `gatedOk/gatedEnough` 字段；计数字段以同一机位用修正后脚本复验的 `shots12\shots12-wxuMAl` 为准（`gatedOk=6/6 gatedFail=0 gatedEnough=true`）。DF-06 未重复拍摄，只沿用 jgYCQb 的 6 张逐帧证据。

