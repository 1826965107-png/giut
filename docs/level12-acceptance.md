# 第一关 / 第二关重做 · 验收记录

> **当前结论以下方「V2 验收（2026-11-05）」一节为准。**
> 第 1–12 节是旧版历史记录（2026-11-01 起的重做与返修轮），其中的布局、水体数量与泳道数、房间坐标、断言计数（114 / 161 / 189）、"以第 8 节为准"等说法**全部不再代表当前版本**，只作为过程留档。

---

# V2 验收（2026-11-05，当前版本）

工作目录 `D:\AI\工作文件夹\游戏`；Git HEAD `38e845d19d559159c0379f4725913432f9617be7`，**未提交、未推送、未回滚**；`AGENTS.md` 与设计/审查文档保持未跟踪原样。

## V2.1 布局与各房用途

**Level 0（外包 42×24m；矩形面积合计 760 m²，未扣墙体与家具；净可走更小）**

| 房间 | 范围 (x, z) | 用途 / 目标 / 线索 / 捷径 |
|---|---|---|
| 值班接待 | −150..−140, −6..6（120 m²） | 出生点 (−147,0)；值班台与**失电配电图**（三处分电示意）；三张长椅；通往中央走廊 |
| 中央走廊 | −140..−108, −1.2..1.2 | 主脊，连接全部侧房；两条短回环接回此处 |
| 员工更衣休息 | −140..−131, 1.2..10 | 更衣柜 / 长凳 / 打卡机 / 休息桌 → **第 1 枚保险丝（桌面 0.72m）** |
| 票务档案 | −131..−119, 1.2..10 | 6组两侧票柜 + 门前主通道 + 出票台 → **第 2 枚保险丝（台面 1.02m）**；与布草之间有绕行门 |
| 布草整理 | −119..−108, 1.2..10 | 布草车 / 层架 / 折叠台；`档案 ↔ 布草` 绕行门（x=−119, z 6..7.8）可甩开追逐 |
| 布草库 | −140..−131, −10..−1.2 | 立柱 / 层架 / 打包台；第 2 条回环的北端 |
| 维修配电 | −131..−119, −10..−1.2 | 配电柜 + 仪表托架 → **第 3 枚保险丝（托架 1.66m）**；两条桥架带管夹/吊杆；工作台与灯罩 |
| 服务前室 | −119..−108, −10..−1.2 | 卷帘门 + EXIT 灯；**出口阈值在东墙 x=−108、z −6.5..−3.5** |

两条主短回环：`走廊 → 员工区 → 档案 → 走廊`、`走廊 → 服务前室 → 维修配电 → 布草库 → 接待 → 走廊`；另有`档案 → 布草 → 走廊`绕行。三枚保险丝都有端帽实体造型（管身 + 两端金属帽 + 环带 + 标签），坐在登记过的真实台面上。

**Level 37（接待 → 脱鞋 → 东/西更衣 → 淋浴 → 湿区 → 四水体 + 桑拿 + 北廊）**

| 区段 | 范围 (x, z) | 说明 |
|---|---|---|
| 接待 | −10..10, 16..24 | 出生 (0, 22.5, yaw 0.62)；前台 / 候客 / 背墙**总导览牌**；脱鞋通口 |
| 脱鞋储物 | −6..6, 12..16 | 鞋柜，接两侧更衣 |
| 更衣 A / B | 西 −28..−6、东 6..28, 6..16 | 柜列 + 长凳；各与本侧淋浴在 z=6 相连 |
| 淋浴 A / B | 西 −28..−6、东 6..28, 2..6 | 三面围合隔间 + 花洒；从 x=±6 门进湿区分配厅 |
| 湿区分配厅 | −6..6, 2..6 | 三门分别通向温泉厅 / 中央湿廊 / 泳池厅 |
| 泳池厅 | 2..28, −28..2（含东侧 22..28 的 equip 分割） | 主池 25×10m、5 条 2m 泳道、南端四级台阶 |
| 温泉厅 | −28..−2, −28..2（sauna 单独分割） | 主汤 10×8m / 静汤 6×6m（浅水坐台）/ 冷水池 3×3m / 桑拿 |
| 北休息廊 | −28..28, −32..−28 | 连两厅，构成第二湿区环路 |
| 设备间 | 22..28, −28..−20 | 只走员工门支线，不是游客去下一池的必经路 |

六目标：`duck/ring` 各 3，主池、主汤、静汤各 2（冷水池不强制）。池中人点位全在主池内。

## V2.2 素材与构造

- 六张 `assets-v2/l12-v2-*.png` 统一材质家族，世界米制周期：地砖 **2.4m**、池内小砖 **0.4m**、墙面/抹灰/地毯/木饰 **2m**；墙面法线 0.08–0.18、地面 0.08–0.15，石材 metalness 0、低 clearcoat。
- 构造：门洞有门楣墙 + 洞口内衬 + 薄门套（L0 门高 2.15/2.4、L37 2.35，低顶房间按局部净高）；墙裙 0.72m + 细压条；池沿石材压顶 0.52×0.10m，排水槽在压顶**外侧**（0.56–0.70m）并实例化格栅；池壁回水口按室内法线贴壁、水下、避开台阶与坐台；结构柱与底座不压任何池体。
- 天花：泳池/温泉用矿物板 + T 龙骨 + 灯盘 + 线灯槽，接待/更衣/桑拿用烟熏木格栅；L0 用暖灰白矿棉板 + 灯盘 + 检修缝，地毯 0.86 粗糙度、无镜面。

## V2.3 测试（本机真实执行）

| 命令 | 结果 | 退出码 | 日志 |
|---|---|---|---|
| `node tools/check-level12-node.cjs` | **386 项**（L0 84 + L37 237 + 行为 65），三段独立进程 | 0 | [logs-shower/l12-final.log](../logs-shower/l12-final.log) |
| `node tools/v2/plan-check.cjs` | 168 / 0 | 0 | [logs-final-v2/plan.log](../logs-final-v2/plan.log) |
| `node tools/v2/l37-props-check.cjs` | 1174 / 0 | 0 | [logs-shower/props.log](../logs-shower/props.log) |
| `node tools/check-level3-node.cjs` | 101 / 101 | 0 | [logs-final-v2/l3.log](../logs-final-v2/l3.log) |
| `node tools/check-level4-node.cjs` | 168 / 168 | 0 | [logs-final-v2/l4.log](../logs-final-v2/l4.log) |
| `node tools/check-level4-rework-independent.cjs` | 45 / 0 | 0 | [logs-final-v2/l4r.log](../logs-final-v2/l4r.log) |
| `node tools/_syntax12.cjs` | SYNTAX OK | 0 | [logs-final-v2/syntax.log](../logs-final-v2/syntax.log) |
| `node tools/_mkcdn.cjs` / `--check` | 367154 字符 / CHECK-OK | 0 / 0 | [cdn.log](../logs-final-v2/cdn.log)、[cdn-check.log](../logs-final-v2/cdn-check.log) |

本轮淋浴返修清单见 [`logs-shower/RUN.md`](../logs-shower/RUN.md)；后两关既有证据见 [`logs-final-v2/MANIFEST.md`](../logs-final-v2/MANIFEST.md)。

**行为套件覆盖**（Node 侧：真实 `vendor/three` + 真实游戏函数，只桩渲染器/画布/音频/图片/DOM）：黑影 `startChase` 有效出生点与反应窗口、`entityLOS` 正负对照、失视后追最后目击点并在 5s 内放弃、定向 150 帧追逐无穿墙无 NaN；保险丝在"仅移远 / 仅改高度 / 仅加遮挡"三种单变量条件下被拒，漂浮物另验缓存命中后移远被拒，两者均含恢复后可正常拾取的正对照；池中人受击计一次并冷却、R/resetGame/预览后仍在主池、停电迁移只落在主池内并避开玩家且模型边界不越池壁（含近点过滤负对照）；预览不写 `poolrooms.records.v1`。

**连续路线证据**：真实 `updatePlayer` 从出生经更衣→淋浴→湿区→主池 2 目标→主汤 2 目标→静汤/冷水池→北廊，**5838 帧 / 36 段 / 最大单帧位移 0.057m**，六个目标真实移除、出池落干地（见 `l37.log` 的 `INFO 连续路线`）。该测试冻结了怪物，与 AI 测试分开，不能互相替代。

## V2.4 正式画面（真实 WebGL，本机 Edge 无头 + SwiftShader）

- 主泳池：[shots12/shots12-3lgY5v/L37-23-pool-hall.png](../shots12/shots12-3lgY5v/L37-23-pool-hall.png)
- 主汤池：[shots12/shots12-3lgY5v/L37-25-hot-spring.png](../shots12/shots12-3lgY5v/L37-25-hot-spring.png)
- 池沿压顶与外侧排水槽：[shots12/shots12-yHplFF/L37-34-pool-coping.png](../shots12/shots12-yHplFF/L37-34-pool-coping.png)
- L0 出生视角：[shots12/shots12-QJ5wkG/L0-20-spawn-v2.png](../shots12/shots12-QJ5wkG/L0-20-spawn-v2.png)
- L37 接待：[shots12/shots12-tGCwvb/L37-31-lobby-spawn.png](../shots12/shots12-tGCwvb/L37-31-lobby-spawn.png)
- 黑影头脸（**含诊断补光 `l12diagLight`**）：[shots12/shots12-WkJDsg/L0-32-entity-head.png](../shots12/shots12-WkJDsg/L0-32-entity-head.png)
- 池中人头脸（**含诊断补光**）：[shots12/shots12-Fyaxy2/L37-35-drowned-head.png](../shots12/shots12-Fyaxy2/L37-35-drowned-head.png)

两张头脸是模型诊断近景，**不代表正式场景亮度**；正式图的唯一网络事件是浏览器默认 `404 /favicon.ico`（`gameErrors: []`）。

## V2.5 审查结论与来源

- Codex 已读 366 项统一入口、L3/L4 日志与 `--check`，并亲看 `3lgY5v` 主池/主汤、`yHplFF` 池沿与两张头脸，判定程序、正式画面与怪物头脸通过；本文件与 README 的收尾属文档整理，未再改程序。
- 旧 26 盏灯复活回归（清理时删掉了 `l37Lamp` 的守卫）已修复：删除 host 中 18 行旧三池调用，保留通用 `l37Lamp` 与既有 2 盏水面填光；新增灯注册不变量——水面填光恰好 2 盏、房间灯全部落在 plan 房间内、无灯落在池水面上 1.2m 内、负对照抽查旧 16 个坐标不复现（不是遍历全部 26 点；旧 26 行调用本身已整段删除）。
- 布局参考（规划阶段，非游戏素材）：Salinarium Therme、Thermal Römerbad（Behnisch）、Yunomori Sathorn 的"干区→更衣→淋浴→湿区"流线与后勤分离做法，见 [`level12-spa-rebuild.md`](level12-spa-rebuild.md)。
- 历史误记更正：旧文多处写"可走约 725 m²"，实际为**矩形面积合计 760 m²（未扣墙与家具）**；725 只是早期估算，不作为面积口径。

## V2.7 淋浴隔间返修（2026-11-05 晚，本轮）

**问题**：实图显示淋浴区前排挡后排、侧板为 0.28 透明玻璃、入口无隐私；旧测试只验证房间通路与"三块板"，未验证逐间进出与走道视线。

**修复**
- 每侧 4 间改为**沿北墙单排并列**（西 x −26.30/−23.65/−21.00/−18.35，东镜像），2.65×2.40m，相邻间**共用侧板**（cx±1.325），后墙贴房间内表面 z=2.14、前挡板 z=4.54。
- 2.1m **不透明**板（`stoneMat` / `waterStoneMat`，不再用 opacity 0.28 玻璃）+ 前挡板（宽 1.475m）+ **L 形回墙**（内伸 0.95m）；入口构造开口1.175m，扣除两侧板半厚后净宽约 **1.10m**，公共走道 **1.34m**（z 4.54–5.88）。
- 取消抬高浅盘，地面连续；前沿 0.12m 金属排水槽；花洒立管落地、横臂朝走道，**两处管夹接后墙**（1.05 / 1.92m）；删除原先悬空挂件。
- 全部板材碰撞与网格同源（`kind:'stall'`，厚 0.08）。

**测试（新增 20 项：L37 217 → 237；props 1118 → 1174）**
- 8 间逐间真实 `updatePlayer`：更衣门 → 走道 → 浴位 → 退出 → 湿区门，全部走通，最大单帧 0.057m。
- 负对照一：封住任一间入口 → 该间 `no-path`，其余 7 间仍可达；解封后恢复。
- 隐私射线：每间 3 个走道眼位 × 胸/头共 **48/48** 首命中为**不透明**板（按命中材质 `transparent`/`opacity` 判定，含材质数组）。
- 负对照二：移除前挡板 → 暴露；负对照三：把前挡板换成旧 0.28 玻璃材质 → 该射线不再算遮挡（暴露）。

**证据**
- 命令 / 退出码 / 失败记录：[logs-shower/RUN.md](../logs-shower/RUN.md)（统一入口 386 = 84 + 237 + 65；语法 0；props 1174/0；plan 168/0；CDN `--check` 0）。
- 图（真实 WebGL / SwiftShader）：[L37-22-shower-W](../shots12/shots12-NoiYJ9/L37-22-shower-W.png)、[L37-36-shower-E](../shots12/shots12-NoiYJ9/L37-36-shower-E.png)、[L37-38-shower-inside](../shots12/shots12-cZfBsT/L37-38-shower-inside.png)、[L37-39-shower-topdown](../shots12/shots12-FmGR0h/L37-39-shower-topdown.png)（最后一个为 `l12view=topdown` 诊断 + 辅助光，非正式灯光）。
- 失败取证保留：[shots12-xFs3yw报告](../shots12/shots12-xFs3yw/shots-report.json)及NOTREADY图片，首轮三张 `camBlocked=true`（机位贴南墙 0.22m 内被判遮挡），改机位后 `shots2/3/4.log` 全部 OK；所有截图仅 favicon 404。

**未测**：硬件 GPU 帧率、音频；L3/L4 本轮未重跑（代码路径未触及）。

## V2.6 未测项

- 硬件 GPU 帧率/GPU 时间、真实硬件 Bloom 与水面观感、音频听感均未测。
- `?diag=1` 的 `renderer.info` 读数中 `calls=1` 只是最后一次 `composer.render` 后的值，不是整帧绘制调用；`geos/tex/progs` 是常驻计数，不等于当前可见数量。
- 浏览器侧只有 `shots12/` 的静态画面证据，没有做交互录屏或真机性能剖面。

---

# 以下为旧版历史记录（2026-11-01 起）

> 仅作过程留档，**不作为当前布局、计数或待办**；当前结论以上方 V2 为准。下文出现的 86×48 外壳、三水体/六泳道、空办公室 A/B/C、四鸭二圈、114/161/189 项、`以第 8 节为准` 等表述均已过时。

记录时间：2026-11-01（Asia/Shanghai）。工作目录 `D:\AI\工作文件夹\游戏`，Git HEAD 保持 `38e845d19d559159c0379f4725913432f9617be7`，**未提交、未推送、未回滚**；未跟踪的 `AGENTS.md`、`docs/level12-design.md` 原样保留。

本文件只写本机真实执行过的东西；没跑成的项目在第 6 节逐条列出原因，没有用"应该没问题"代替证据。**Node 渲染桩回归**与**真实浏览器 WebGL 截图**在第 2、第 3 节分别标注，不混为一谈。

---

## 1. 完成范围

### 1.1 第一关 Level 0（后室）

- **分区化**：走廊（z −5..5，x −150..−72）+ 北侧 N_A 接待区（x −150..−132）、N_B 档案区（x −132..−100）、N_C 配电区（x −100..−72）+ 南侧 S_A 空办公室（x −150..−118）、S_B 档案二区（x −118..−94）、S_C 配电副间（x −94..−72）+ 东端出口前厅（x −72..−64，z −10..10）。房间之间是真实墙体，门洞带门套。
- **≥3 条闭合回路**：`x=-132`（缺口 z −16..−13）、`x=-100`（缺口 z −18..−15）、`x=-118`（缺口 z 13..16）、`x=-94`（缺口 z 8..11）、`x=-72`（缺口 z −9..−6 与 6..9）与走廊南北墙缺口组合；测试用"封门法"逐条验证可走通。
- **出生点视线切断**：出生点 (−144,0) 东向视线在 x=−126 的防火分区前室被切断（`wallX(-126,…,[[1.2,4.2]])` + `wallX(-120,…,[[-4.2,-1.2]])`，两块 `l0Casing` 门套、半开门扇、`防火分区 / FIRE ZONE` 牌）；x=−90/−84 的服务横廊二次错位（反向门洞 + 穿墙服务管线 + 地面明沟）；出口前厅 `wallZ(-10,…)`/`wallZ(10,…)` 收口 + 竖井墙 `wallX(-70,-5,1.2)`（留 z 1.2..5 共 3.8m 通行）。出口门**不能**从走廊一眼看穿。
- **三枚保险丝坐在真实承载物上**：接待台 (−140,−14) 台面 1.02；档案柜 (−128.6,−21.4) 顶面 1.42；配电柜 (−86,−22.9) 顶面 1.52。`spawnFuse` 用 `surface + 0.12`（方块半高）让保险丝**坐在台面上**而不是陷进去。
- **近景工艺与合批**：踢脚线、插座、通风百叶、天花拼缝、柜门把手全部走 `flushInstanced` 实例化；20 块荧光灯盘（7 盏常亮）+ 6 盏补光 + 办公角聚光。
- **黑影（独立模型 + 公平追击）**：见 1.3 的美术收尾；AI 为 0.4m 栅格八向 A*（不切墙角）+ 逐帧 `collideCircle`（宿主返回 `[x,z]`）+ 最后目击记忆 + NaN 防守。
- **出口推进用真实门阈值**：`exitUnlocked && player.x < -64.9 && player.x > -68 && |player.z| < 1.7 && player.y < 0.6`（旧版 `x < -66 && |z| < 2.6` 会在主走廊任意西侧误跳关）。
- **统一安全复位**：`safeRespawn(level)` + `markHorrorCooldown(ms)`；R 复位、被抓、池中人惊吓共用同一冷却，**不重置已收集进度**，并清空 `nearestFuse/nearestPickup/nearestFlash/nearestBattery`。

### 1.2 第二关 Level 37（泳池层，优先项）

- **外壳与五分区**：`BOUNDS = {x1:-28,x2:30,z1:-28,z2:24}`，净高 `H = 4.4`。南入口前厅（z 13.8..24）→ 主池厅（x −14..12，z −16..24）→ 北浅水回声室（x −28..2，z −28..−16，低顶棚 2.55m）→ 西更衣淋浴区（x −28..−14，**南北两个门洞** z=−7.5 与 9.5）→ 东训练池与设备区（x 12..30；设备间 x 24..30 / z −16..−6 带观察窗；半高栏板 z=6.5 + 四柱柱廊）。
- **南侧步道真实可通**：主池南沿 z=11 与主厅南墙原在 z=12，只剩 0.7m（玩家半径 0.35 过不去）。南墙与前厅边界整体移到 **z=13.8**，前厅 `POOL·LEVEL 37` 发光牌同步移到 (6.6,2.35,13.97)。
- **三水体 + 六漂浮物（四鸭二圈）**：

  | 水体 | 位置 | 池底 | 水面 | 台阶 |
  |---|---|---|---|---|
  | main 主池 | x −9..3，z −14..11（12×25m，6 条泳道） | −2.05 | −0.30 | 4 级，单级 0.40m（−0.44/−0.84/−1.24/−1.64） |
  | train 训练池 | x 16..24，z −4..4（8×8m） | −1.15 | −0.30 | 2 级（−0.36/−0.74） |
  | echo 浅水回声池 | x −12..−4，z −25..−19（8×6m） | −0.62 | −0.14 | 1 级缓台（−0.30） |

  main duck(0.5,2)/ring(−5.5,−6)、train duck(18,−1)/duck(22,2)、echo duck(−8,−22)/ring(−6,−21)。
- **台阶模型与 `groundAt` 同源**：`POOLS[x].stairs.steps` 同时驱动 `buildPool` 的盒体与 `groundAt`，单级 ≤0.62m（控制器 `groundAt − player.y > 0.62` 会撤销位移）；测试逐级核对地面高度与真实网格。
- **拾取公平性**：漂移限制在所属水体 `floatRect`（四边各收 0.55m）；最近拾取判定加高度窗（`|waterY − (player.y+0.4)| ≤ 1.0`）与 `segmentBlockedByWalls` 真实遮挡；`tryPickup` 执行时再校验"对象仍在列表 + 水平半径 ≤1.7m + 高度 + 遮挡"。
- **池中人（独立模型，不复用黑影骨架）**：`buildDrownedBody()` 用 `textures/dead-skin.png`（`physicalMat`，湿润 clearcoat）与 `textures/monster-hair.png`；见 1.3。
- **池中人公平性**：只有**玩家在主池水中**才 stalk/抓取；训练池/回声池只出水声与远处 wake；抓取需同时满足主池内、水平距 <2.4（水下近身 <1.35）、高度差 <2.6、`watcherCanReachPlayer()`（真实墙体/池壁遮挡）、`horrorCooldownReady()`；停电只在主池内 ≥4.6m 外的有效水下点间转移，出场先有水声水纹；上岸后只 stand/retreat，**不在干地追人**。
- **站/游/复位高度用真实包围盒**：`DROWNED_FOOT_LIFT`（静止 `Box3` 实测）用于所有站立高度；`DROWNED_TOP_TABLE` 对 rotX 0…1.15（13 档）× 96 个姿态相位（覆盖最慢摆动约 7s）用 `Box3.setFromObject` 实测最高点，`drownedSwimY()` 只做插值并留 10cm 余量；`watcher.rotation.order = 'YXZ'` 让游姿随航向倾斜而不侧翻。
- **第二关直达预览（不写档）**：`?level=37`（可加 `&px=&pz=&cam=`）调用 `enterPoolroomsPreview(x,z)`：建关、切碰撞/边界/雾/天光、摆好机位，`runPreview = true`，**不写任何记录**（测试逐字节比对存档键）。
- **诊断钩子**（仅 `?cam=` 组合生效）：`&l12view=entity|drowned-stand|drowned-swim` 冻结行为只留动画；`?diag=1` 把 `lv/p/cam/ray/budget/ready/frames/lum/lumMax/lumMin/camBlocked` 写进标题栏。

### 1.3 本轮美术收尾（Codex 实图审查后的定点修复）

- **水面**：`Water` 的 `distortionScale` 0.45 → **0.10**；在注入的 fragmentShader 里把 `surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5))` 改为 **`vec3(0.045, 1.0, 0.045)`**（水平扰动压到 3%），静态室内水面不再像"皱布"。
- **L0 墙面**：`l0WallMat.color = 0xf2d38f`、`roughness = 0.92`，靠材质染色回到暖赭黄，不提曝光、不加灯。
- **黑影重建**（去"分节机器人"）：躯干改为单条 `LatheGeometry`（10 段轮廓 + 逐顶点前倾剪切 `lean = 0.17·s^2.3 − 0.045·sin(πs)`、上背更厚），骨盆/颈/头/肩挂 `R.spine`；颈前伸、头略垂；湿发 15 束（`ConeGeometry` 原点在发根、锥尖朝下，额前 6 + 鬓角后颈 9）；肩肘腕肘全部加覆盖球；五指改 `TubeGeometry` 弯管且长短不同（0.135/0.175/0.168/0.140/0.104 的手掌外伸 + 不同弯曲），拇指独立；脚改三球扁长有机轮廓；`ENTITY_TARGET_HEIGHT = 2.20` 由 `Box3` 实测定 `ENTITY_SCALE`，眼灯跟随真实头高。
- **池中人重建**：躯干同样改 `LatheGeometry`（单侧塌陷、前后压扁），删掉平面"湿斑"圆片与颈下黑洞；肩/颈/头/双臂改挂 `R.spine`（躯干前倾时颈根不断开）；加贴头皮发盖 + 18 束湿发；臂改为上臂/肘球/前臂/腕球/掌一路重叠，五指长短不同；`DROWNED_SWIM_ROT = 1.15`（≈66°，近水平游姿）。
- **游姿姿态确定性**：`animateDrowned` 的 swim 分支现在清掉站立期残留（头 yaw/roll、躯干呼吸缩放、双肩高度、五指角度），否则从站立切游动会残留抬手，包围盒比安全高度表更高——这正是"偶发浮出水面 2~5cm"的来源。

### 1.4 改动文件

| 文件 | 说明 |
|---|---|
| `backrooms-pool.html` | 唯一游戏本体改动：地图数据、L37 建造（三水体/五分区/更衣淋浴/回声室/训练厅/设备间/灯光/水面 shader）、漂浮物、L0 建造、黑影+导航+复位、池中人模型与动画、控制器（拾取/复位/交互/脚步材质）、`?level=37` 预览、`?l12view=` 与 `?diag=1` 诊断 |
| `backrooms-pool-online.html` | 由 `tools/_mkcdn.cjs` 现场生成：与本地版仅 importmap 两行不同（本地 403458 B / 7252 行，CDN 版 403529 B，逐行比对仅 2 行不同），`--check` 通过 |
| `tools/check-level12-node.cjs`（新） | 第一/二关纯 Node 回归入口 |
| `tools/_l12-node-tests.js`（新） | **114 项**真实断言 |
| `tools/level12-budget.cjs` + `tools/_l12-budget-probe.js`（新） | 场景预算统计（分区） |
| `tools/shots12.cjs`（新） | Edge 无头 + CDP 截图：`--remote-debugging-port=0` + 自有 profile/`DevToolsActivePort`、只驱动自建标签、有界关闭、`--only=` 筛选、`ready/camBlocked` 门控、favicon 404 与游戏错误分开判定 |
| `tools/_mkcdn.cjs` | 新增 `--check`：逐字节比对 CDN 版是否等于"本地版仅 importmap 两行不同" |
| `tools/_splice.cjs`、`tools/_b0_consts.js`、`_b1_l37.js`、`_b3_pickups.js`、`_b4_l0.js`、`_b5_entity.js` | 拼接用的分块草稿与拼接脚本（**HTML 已是唯一事实来源**；草稿删除被沙箱拒绝，见 6.4） |
| `tools/probe-swim.cjs`、`tools/_l12-probe-swim.js` | 临时探针（游姿高度取证，可用后即删） |
| `logs-final/*.log`（新） | 本轮最终回归日志，见第 2 节 |
| `docs/level12-acceptance.md` | 本文件 |
| `README.md` | 流程表、两关说明、预览与诊断参数、检查命令、已知问题 |

未改动：第三关/第四关相关代码、`levels/level4-tunnel.js`、`textures/`、`vendor/`、`server.js`。

---

## 2. 最终命令与退出码（真实执行，日志已落盘）

全部在本机 pwsh 执行，退出码为 `$LASTEXITCODE` 原值。日志在**工作区内**、便于只读核对：

| # | 命令 | 退出码 | 结果 | 日志绝对路径 |
|---|---|---|---|---|
| 1 | `node tools/_syntax12.cjs` | **0** | `extracted 351698 chars` + `SYNTAX OK` | `D:\AI\工作文件夹\游戏\logs-final\syntax.log` |
| 2 | `node tools/check-level12-node.cjs` | **0** | **114 / 114 PASS** | `D:\AI\工作文件夹\游戏\logs-final\l12.log` |
| 3 | `node tools/check-level3-node.cjs` | **0** | **101 / 101 PASS** | `D:\AI\工作文件夹\游戏\logs-final\l3.log` |
| 4 | `node tools/check-level4-node.cjs` | **0** | **168 / 168 通过，失败 0**，`L4-NODE-TESTS-OK` | `D:\AI\工作文件夹\游戏\logs-final\l4.log` |
| 5 | `node tools/check-level4-rework-independent.cjs` | **0** | `checks=45; failures=0` | `D:\AI\工作文件夹\游戏\logs-final\l4-rework-independent.log` |
| 6 | `node tools/level12-budget.cjs` | **0** | 输出 `BUDGET {json}`（第 4 节） | `D:\AI\工作文件夹\游戏\logs-final\budget.log` |
| 7 | `node tools/_mkcdn.cjs` | **0** | `online bytes 375952`（字符长度口径；磁盘 403529 B） | 终端输出（工具不写日志） |
| 8 | `node tools/_mkcdn.cjs --check` | **0** | `CHECK-OK online 与本地版仅 importmap 两行不同（375952 字节）`——该数字是工具内部的**字符长度**口径；磁盘上本地版 403458 B、CDN 版 403529 B，逐行比对仅 importmap 两行不同 | 终端输出 |
| 9 | `node tools/shots12.cjs --only=L37-06,L37-07` | **0** | `SHOTS-OK 2`（第 3 节） | `D:\AI\工作文件夹\游戏\shots12\shots12-K9Ipct\shots-report.json` |
| 10 | `node tools/shots12.cjs --only=L0-03,L0-06,drowned-under` | **2** | 4 张全部 `ready=true/camBlocked=false`；退出码 2 来自当时"favicon 404 也算失败"的旧判定，已修（第 3 节说明） | `D:\AI\工作文件夹\游戏\shots12\shots12-FIbEyv\shots-report.json` |
| 11 | 服务：`$env:PORT=8571; node server.js` | 运行中 | `GET /backrooms-pool.html` → `200`，`LEN=394382+` | 后台作业 |

补充说明：第 2 项在改动前为 105 项，本轮补了池中人"站→游→站"多帧过渡、静态游姿逐相位、拾取半径等断言后为 **114 项**；第 1 项抽取的字符数随代码增长（351698）。

### 2.1 这些 Node 测试跑的是什么（与浏览器的边界）

第 1～6 项都是**纯 Node 真实引擎回归**（与既有第三/四关同范式）：从 `backrooms-pool.html` 抽真实 `<script type="module">`，`from 'three'` 指向真实 `vendor/three/three.module.js`，**只桩化渲染器 / Canvas2D / WebAudio / 图片解码 / DOM**。碰撞、寻路、`groundAt`、AI、拾取、复位、关卡切换、动画姿态全部跑真实实现，姿态断言用的是真实网格 `Box3`。

因此：**几何与行为结论可信；GPU 观感（材质/灯/水面/泛光/帧率）不在这些断言覆盖范围内**——那部分用第 3 节的真实浏览器截图取证。

---

## 3. 真实浏览器 WebGL 截图（非桩、非合成）

执行方式：本机 Edge `--headless=new` + `--use-angle=swiftshader --enable-unsafe-swiftshader`，Node 24 原生 WebSocket 走 CDP；每个机位 `Page.navigate` → 等 `ready`（`renderReady && frames>8 && lumMax>0.02 && budget.calls>0 && camBlocked===false`）→ `Page.captureScreenshot`。**这些是软件光栅（SwiftShader）的真实 WebGL 渲染**，不是硬件 GPU 帧率样本。

### 3.1 最终有效截图（按机位取最新一次拍摄）

| 机位 | 绝对路径 | 字节 | 关键读图结论 |
|---|---|---|---|
| L0-01 出生点 | `D:\AI\工作文件夹\游戏\shots12\shots12-qsb6uU\L0-01-spawn.png` | 1.77M | 东向走廊被前室切断，看不到出口门 |
| L0-02 防火分区前室 | `...\shots12-qsb6uU\L0-02-vestibule.png` | 1.79M | 错位门洞 + 半开门扇 + 指示牌 |
| L0-03 档案区（斜向） | `D:\AI\工作文件夹\游戏\shots12\shots12-FIbEyv\L0-03-archive-loop.png` | 1.84M | 机位移到 z=−18.5、yaw=1.231（由柜列中心反算），柜列与西门洞入画；Codex 已验收 |
| L0-04 黑影近景（旧） | `...\shots12-qsb6uU\L0-04-entity-close.png` | — | 已被重做模型取代，仅留历史 |
| L0-05 黑影正面 | `...\shots12-qsb6uU\L0-05-entity-front.png` | 1.79M | 连续收腰躯干、垂下发束、膝下长臂 |
| L0-06 黑影侧面 | `D:\AI\工作文件夹\游戏\shots12\shots12-FIbEyv\L0-06-entity-side.png` | 1.78M | 侧面驼背轮廓与前后不对称；Codex 已验收 |
| L37-01 入口前厅 | `...\shots12-qsb6uU\L37-01-entry.png` | 1.71M | 入口缓冲 → 主池厅，可见主池水面与池沿 |
| L37-02 主池 | `...\shots12-qsb6uU\L37-02-mainpool.png` | 2.32M | 六泳道、溢流槽、扶梯、出发台、天花梁 |
| L37-03 回声室 | `...\shots12-qsb6uU\L37-03-echo-room.png` | 2.12M | 低顶棚、柱门、浅池缓台 |
| L37-04 更衣淋浴 | `...\shots12-qsb6uU\L37-04-locker-shower.png` | 1.70M | 中央通道机位，柜列/长凳/淋浴隔间同时入画 |
| L37-05 训练池与设备区 | `...\shots12-qsb6uU\L37-05-train-hall.png` | 1.90M | 半高栏板、柱廊、泵组与管线 |
| L37-06 池中人站立 | `D:\AI\工作文件夹\游戏\shots12\shots12-K9Ipct\L37-06-drowned-stand.png` | 2.21M | 最终代码重拍；站立于主池，灰白浸水皮肤、湿发、长臂 |
| L37-07 池中人游动 | `D:\AI\工作文件夹\游戏\shots12\shots12-K9Ipct\L37-07-drowned-swim.png` | 2.30M | 最终代码重拍；近水平游姿，四肢不同相位 |
| L37-08 水下·站立 | `D:\AI\工作文件夹\游戏\shots12\shots12-FIbEyv\L37-08-drowned-under-stand.png` | 2.16M | 水下近景；**头脸同样被泳道绳横向遮住**，可辨躯干/腕部/发盖，脸部证据有限 |
| L37-09 水下·游动 | `D:\AI\工作文件夹\游戏\shots12\shots12-FIbEyv\L37-09-drowned-under-swim.png` | 2.31M | 水下近景；游姿躯干与腕掌衔接可辨，脸部落在水面高光侧，细节有限 |

（表中 `...\shots12-qsb6uU\` = `D:\AI\工作文件夹\游戏\shots12\shots12-qsb6uU\`。）

### 3.2 机位限制与已知瑕疵（如实说明）

- **L37-06 站立近景的头部被泳道绳部分遮挡**：`l12view=drowned-stand` 把池中人摆在主池 (x=−3.4, z=−6)，该处水面正好有泳道绳经过，绳与浮筒压住了头脸一条。按 Codex m01317 的结论不再重拍，此处据实登记为"机位限制"，不是模型缺陷。
- **水下 L37-08 / L37-09 并不能提供无遮挡的头脸近景**：这两张同样被泳道绳横向遮住头脸，仅能辨认躯干、腕部与发盖轮廓。Codex 对池中人的通过依据是"躯干/腕部/发盖可辨"，**脸部近景证据有限**，本轮不再补拍；模型面部（凹陷眼窝、塌肩偏斜头）的实际观感在本报告中属于未充分取证项，见第 6.4 节。
- **L37-07 游动图上身躯干贴近水面、部分被水面高光与泳道绳遮挡**：游姿高度由安全表决定，本轮把采样从 16 相位/2.6s 提升到 **96 相位/7s** 并留 10cm 余量（此前偶发露出水面 2~5cm），因此比早先那版略深 10cm。这是为"绝不露出水面"付出的可见性代价，与 Codex 对本轮 K9Ipct 重拍图的通过结论一致。
- **`favicon.ico` 404**：`L0-01`、`L37-06`、`L37-07` 等机位的 `NET_ERR=1` 全部来自浏览器自动请求 `http://127.0.0.1:8571/favicon.ico`，与游戏资源无关。截图脚本已改为"仅当所有 4xx 都只来自 favicon 时豁免"，出现贴图/模块 404 仍判失败；因此 `--only=L37-06,L37-07` 本轮输出 `SHOTS-OK 2`、`SHOTS_EXIT=0`。这也解释了上表第 10 项早期运行 `SHOTS_EXIT=2` 的原因。
- **SwiftShader 而非硬件 GPU**：所有像素由软件光栅产生；真实硬件帧率、Bloom 观感强弱、水面反射在真机上的表现**未测**（见第 6 节）。

### 3.3 浏览器 `renderer.info` 读数（`?diag=1` 标题栏，非性能 benchmark）

下面是**页面内 `renderer.info` 与场景图统计**的采样，不是 GPU 侧计时，也不能当作完整场景性能证据：

- `calls=1` 是帧内最后一次 `composer.render` 后的 `renderer.info.render.calls`，不是全部 pass（Bloom/输出等）累计，因此**不能用它推断整帧绘制调用数**。
- `meshes`/`inst`/`lights`/`tris` 是遍历 `scene` 得到的场景图统计（与第 4 节同口径）。
- `geos` 是 `renderer.info.memory.geometries` 的**驻留统计**（已上传到 GPU 的几何数量），**不等于当前可见几何数**；纯 CPU 侧构建的几何不会立刻改变它。
- `tex`/`progs` 同理属于驻留/程序计数，不代表每帧绑定或编译活动。
- 真实硬件帧率、GPU 时间、水面反射开销**未测**（见第 6 节）。

```
L37 机位: budget {"meshes":1964,"inst":130,"lights":67,"tris":394493,"calls":1,"rtris":1,"geos":691,"tex":99,"progs":38}
L0  机位: budget {"meshes":1964,"inst":130,"lights":67,"tris":394493,"calls":1,"rtris":1,"geos":63,"tex":95,"progs":35}
ready=true, frames=11~13, lum=0.16~0.68, lumMax=0.27~0.96, camBlocked=false（全部机位）
```

`geos` 63→691 的差异来自两次探针所处关卡不同（L0 只创建了前室所需几何，L37 建造了三水体与五分区），仍是驻留计数口径，不能读成"视野内几何数"。`lum`/`lumMax` 是渲染循环里 9 点 `readPixels` 的亮度采样，只用于判定"不是黑帧"，同样不是性能指标。

---

## 4. 场景预算证据（`node tools/level12-budget.cjs`，exit 0）

**口径（重要）**：这是**场景图统计**，不是 GPU 绘制数据。它遍历真实 `scene` 统计网格/实例/三角面/灯/材质/贴图，**不渲染**，因此没有 FPS、没有 draw call；且**未按 `camera.layers` 过滤**（三/四关用独立渲染层）。

| 指标 | Level 0 区域 | Level 37 区域 | 全场（四关合计） |
|---|---|---|---|
| 网格数 | 227 | 659 | 1968 |
| 其中 InstancedMesh / 实例数 | 0 / 0 | 7 / 239 | 130 / 6454 |
| 三角面 | 3,232 | 43,761 | 447,769（可见 363,938） |
| 灯（强度>0） | 10（9） | 34（32） | 67（63） |
| 投射阴影体 | 187 | 405 | 1,363 |
| 材质 / 几何 / 贴图 | 57 / 212 / 14 | 144 / 646 / 78 | 360 / 1877 / 150 |

其他可核对项：`l0LightEntries=16`（20 块灯盘 + 6 盏点光）、`poolLightEntries=28`（26 盏分区灯 + 2 盏池面）、`lockerLightEntries=4`；`COLLIDERS_L0=69`、`COLLIDERS(L37)=89`；三池尺寸与台阶数 `main 12×25/4 级、train 8×8/2 级、echo 8×6/1 级`。

实例化批次（踢脚/插座/百叶/天花拼缝/排水格栅）的 `InstancedMesh` 世界坐标在原点，按区域过滤时不计入分区行——其预算体现在"全场"列，这是统计口径限制，不是没有合批。

---

## 5. 本轮发现并修复的真实缺陷

| # | 现象（测试/审查发现） | 根因 | 修复 |
|---|---|---|---|
| 1 | 主池南侧步道 0.7m，玩家过不去 | 池南沿 z=11 与南墙 z=12 冲突 | 南墙/前厅边界整体移到 z=13.8，前厅指示牌同步移位 |
| 2 | 站立脚掌最低点 −2.17 vs 池底 −2.05 | 池中人原点在脚踝上方 0.12m | `DROWNED_FOOT_LIFT`（`Box3` 实测）用于所有站立/回位高度 |
| 3 | 游动姿态出水 2.233m | 用公式自证且符号写反 | `DROWNED_TOP_TABLE`（`Box3` 实测）+ `drownedSwimY` 改 `waterY − 0.035 − top − 余量` |
| 4 | 黑影手臂从地面往下长、与躯干断开 | `g.add(grp)` 挂在根节点 y≈0.02 | 手臂改挂真实肩部节点；补肩→肘→腕→指尖与脚底断言 |
| 5 | 黑影直线穿墙追逐 | 位移直接叠加速度 | 0.4m 栅格 A* + 逐帧 `collideCircle`（返回 `[x,z]`）+ 最后目击记忆 + NaN 防守 |
| 6 | 拾取只比水平距离，能隔墙/隔楼板拾取 | 只算 `Math.hypot`，`tryPickup` 无校验 | 高度窗 + `segmentBlockedByWalls` + 执行时二次校验 + `safeRespawn` 清缓存 |
| 7 | 漂浮物能漂上岸/穿墙 | 漂移无池界 | 限制在所属水体 `floatRect`（内收 0.55m） |
| 8 | 档案柜上的保险丝"到达却不可交互" | 承载柜体自己被判成遮挡 | 改"真实眼位 + 端点接触容差 0.15m"，`tryFuse` 二次校验 |
| 9 | `resetGame()` 把 `FUSE_DEFS` 当二维数组读 | 数据改为对象后漏改 | `FUSE_DEFS.forEach(d => spawnFuse(d))` |
| 10 | R 复位/被抓后怪物仍在身边立刻再抓 | 复位只移动玩家 | `safeRespawn()` + `markHorrorCooldown()` 统一冷却（L0 被抓 6500ms、R 复位 4000ms、L37 受击/复位 5000ms） |
| 11 | 出口跳关阈值过宽 | 旧判定 `x < -66 && |z| < 2.6` | 真实门内阈值（−68 < x < −64.9，|z| < 1.7，y < 0.6） |
| 12 | 池中人跨池锁定、隔墙抓人、上岸追人 | 只判平面距离与高度 | 限定主池 + `watcherCanReachPlayer()` 遮挡 + 岸上只 stand/retreat |
| 13 | `enterPoolrooms()` 里 `watcherHome();` 调了不赋值 | 误写成只调用 | `const h = watcherHome(); watcher.position.set(h.x,h.y,h.z)` |
| 14 | 更衣区脚步材质错位 | 阈值写死 `player.x < -16.1` | 改分区边界 `player.x < -14` |
| 15 | 池中人只是黑影换色 | 复用 `buildDweller` 骨架 | 独立 `buildDrownedBody()`（新骨架 + 死皮/湿发贴图 + 不同动画节拍） |
| 16 | 初始化期调用 `animateDrowned` 崩溃 | 该函数引用尚未初始化的 `player`（TDZ） | 测量改用静止姿态 `Box3` |
| 17 | `tryPickup()` 不看"现在还有多远" | 只靠 `nearestPickup` 缓存 | 执行时校验水平半径 ≤1.7m；新增负例 `pickups 5→5, picked 2→2` |
| 18 | 水面像"大幅褶皱的布"（Codex 实图审查） | `Water.js` 法线水平分量 1.5× | shader 改 `vec3(0.045,1,0.045)` + `distortionScale 0.10` |
| 19 | L0 墙面偏灰绿、和泳池白砖色相太近 | 墙纸原色偏冷 | `l0WallMat.color=0xf2d38f`、`roughness=0.92` |
| 20 | 黑影像"分节机器人"（腹部圆柱/方块脚/叉齿手指/发束朝上） | 体块由球+胶囊拼接、发束锥尖朝上 | LatheGeometry 连续躯干 + 前倾剪切；五指 Tube 弯管；脚改三球；发束原点在发根朝下 |
| 21 | 池中人"球胸+圆柱腹+球骨盆"、腕掌有缝、颈根断开 | 体块拼接、上半身挂错父节点 | Lathe 躯干 + 删平面湿斑/黑洞 + 肩颈头臂改挂 `R.spine` + 臂段重叠 |
| 22 | 游姿偶发浮出水面 2~5cm（测试三次两失败） | ①安全表只采 16 相位/2.6s，漏掉 2.4 rad/s 手臂峰值与 7s 慢摆；②站立期残留的抬头/手指角度未清除 | 采样改 **96 相位/7s** + 10cm 余量；swim 分支清残留姿态；连续 3 次运行稳定 114/114 |
| 23 | 截图"黑帧"与隔张失败 | 固定 wait 等不到 `?cam=` 分支执行完 | 加 `ready/frames/lum` 门控 + `camBlocked` 判据；黑帧问题消失 |
| 24 | 更衣区截图整屏是柜门条纹 | 机位 (−17.5,1.62,1.5) 贴进柜体 | 移到柜岛之间中央通道 (−19,1.62,12)，构图含柜列/长凳/淋浴 |
| 25 | 黑影侧面机位拍不到侧面 | 诊断路径用 `entityFaceTarget(player)` 跟随相机 | 改固定 yaw −π/2，正面机位在西、侧面机位在南 |
| 26 | `favicon.ico` 404 被当成失败 | 4xx 一律计失败 | 仅当所有 4xx 只来自 favicon 时豁免；游戏 JS 异常单独计数并判失败 |

修复后：第 2 节第 1～8 项全部 exit 0。

---

## 6. 未执行 / 受限的检查（不含推测）

### 6.1 需要在放宽环境里跑一次的命令

浏览器截图与 CDN 覆盖都需要"子进程创建命名管道 / 改写已存在文件"这两项被沙箱禁止的能力。本轮用户已批准并已实际执行（截图见第 3 节、CDN 见第 2 节第 7、8 项），**批准范围仅限这两件事**，没有扩展到通用文件系统、ACL、旧文件删除或工作区之外。

### 6.2 `node tools/check-entry.cjs` 未执行

其断言依赖 8555 端口与 spawn 子进程；8555 被另一个会话的旧服务占用（`Get-NetTCPConnection` 看不到该套接字，我的进程也无法接管），而命名管道受限时该脚本不可靠。入口可用性已在 8571 手工验证：`Invoke-WebRequest http://127.0.0.1:8571/backrooms-pool.html` → `STATUS=200`、`LEN=394382+`。

### 6.3 仍是"生成浏览器检查页 + 浏览器内断言"的脚本未执行

`tools/check-station.cjs`、`check-metro.cjs`、`check-conductor.cjs`、`check-interaction-performance.cjs` 及其 `test-*.html` 依赖浏览器内断言；第三关的**几何/行为**结论由 `check-level3-node.cjs` 101/101 覆盖，但它们的浏览器内 UI 断言本轮没有跑。

### 6.4 其他未测与未清理项

| 项目 | 状态 |
|---|---|
| 池中人面部近景取证（凹陷眼窝、塌肩偏斜头的可读性） | **证据有限**：L37-06/07/08/09 四张图的头脸都被泳道绳或水面高光遮住一部分；通过依据是躯干/腕部/发盖可辨，不是干净的脸部近景 |
| 硬件 GPU 帧率、真机 Bloom/水面观感 | **未测**：截图是 SwiftShader 软件光栅，不能代表硬件性能与观感强弱 |
| 音频听感（心跳、水声、抓取音） | **未测**：需要人工试听；本轮只验证了调用路径不报错 |
| `check-level12-node.cjs` 的 `--check` 之外的截图脚本回归 | 截图脚本靠 `ready/camBlocked` 门控与人工读图验证，没有自动化视觉断言 |
| 草稿文件 `tools/_b0_consts.js`、`_b1_l37.js`、`_b3_pickups.js`、`_b4_l0.js`、`_b5_entity.js` | **未删除**：子进程对本会话创建的文件没有删除权（`Access to the path … is denied`）。它们不参与运行；需要清理时执行 `Remove-Item tools\_b0_consts.js, tools\_b1_l37.js, tools\_b3_pickups.js, tools\_b4_l0.js, tools\_b5_entity.js -Force` |
| `git commit / push` | **未执行**：用户明确禁止 |

---

## 7. 结论

- 第一关（L0）与第二关（L37）的地图、怪物、交互与复位链路已按 `docs/level12-design.md` 重做完毕，第二关优先项（五分区、三水体、六目标、台阶同源、漂移留池、池中人独立模型与主池限定）全部落地。
- 行为与几何由 **114 项第一/二关真实引擎断言**把关（连续 3 次运行稳定通过），第三关 101 项、第四关 168 项 + 45 项独立验收**仍然全部通过**，内联 module 语法自检通过——四关没有被本轮改动破坏。
- 真实画面已用本机 Edge + 真实 WebGL（SwiftShader 光栅）拍成 15 个机位，路径在第 3 节；`?diag=1` 给出真实 `renderer.info` 读数与 `camBlocked` 机位有效性。
- CDN 版已由 `tools/_mkcdn.cjs` 现场生成并 `--check` 通过：与本地版逐行比对**只有 importmap 两行不同**（本地 403458 B / CDN 403529 B / 7252 行），离线版与 CDN 版内容一致。
- 两项能力边界（硬件 GPU 表现、音频听感）如实登记为未测，不用桩化测试冒充真实运行。

---

## 8. 返修轮：近景构造（门洞收口 / 装饰贴面 / 悬空件与管线支架 / 贴图尺度）

触发：用户对上一轮近景提出"贴图错误太多、门框横梁有问题、个别物件悬空"，并给出两张现场实图与逐条根因。本轮只改这两关的建造与材质，不改布局、怪物和玩法；L37 同类缺口一并收口，UV 修复只作用于 L0/L37 墙面，不动全局 `scaleBoxUV`（避免改变第三/四关的材质尺度）。

### 8.1 修复内容（逐条对应实图缺陷）

| # | 缺陷（实图可见） | 真实原因 | 修复 |
|---|---|---|---|
| 1 | 门洞上方到顶棚是黑的，深色门套横梁像悬空大梁 | `wallZ/wallX` 把 `gap` 按**整个层高**删掉，而 `l0Casing` 只有 2.18m 竖框 + 0.1m 横框，门头以上到 `L0H` 全空 | 新增 `L0_DOOR_H = 2.18`：每个真实门洞都补一整块**门楣墙**（`addWorldUVBox`，从门头到顶棚）、洞口内衬与双面薄门套（7cm 贴脸 + 2cm 凸出，横梁端部压在立框上）；门楣单独登记并与 `COLLIDERS_L0` 的 `l0Header`（`y1=2.18..y2=3.0`）同源，3m 门洞净宽与通行碰撞不受影响 |
| 2 | 通风百叶漂在门洞上方的空中 | `l0Vents` 从 x=-140 起每 12m 盲布，x=-128 等正好落在走廊北墙缺口里 | 装饰改为按**真实墙段**定位：新增 `l0WallPieces`/`L0_GAPS` 注册表与 `l0Face(axis, fixed, side, u, margin)`，只在同轴同坐标、整高、未被门洞切段、非墙端的墙面上落件；百叶改为窗单元（暗框 + 上下框 + 两侧立框 + 12 片叶片），整排贴到南壳墙内表面 z=23.775（原来在 23.72，浮在墙外 8cm） |
| 3 | 灰白插座板悬在空中 | 插座同样盲布（x=-148..-70 每 6m），忽略 z=±5 的缺口 | 22 个插座全部经 `l0Face` 判定 + 距方柱 0.58m 排除，双面沿真实墙面法向贴合（底板 0.115×0.15×0.024 + 面板凹槽），另有 5 个房间内插座 |
| 4 | 地面像灰褐塑料木板 | L0 地板是 `physicalMat(carpet, …, { roughness: 0.62, clearcoat: 0.05 })`，且 `matFor` 默认 `ns=0.8` 把漫反射污渍派生成高浮雕 | L0 专属收敛：地毯 `ns=0.12`、`roughness=0.95`、`metalness=0`、无 `clearcoat`/`roughnessMap`；墙纸 `ns=0.16`、`roughness=0.95`、`envMapIntensity=0.35`。材质工厂未改，三/四关参数不受影响 |
| 5 | 墙面竖直贴图相位接缝 | `addBox` 走 `scaleBoxUV`，每段墙 UV 都从 0 起 | 新增 `addWorldUVBox`：UV 由顶点**世界坐标**算出（x 轴墙面 `u=±z/c`、z 轴墙面 `u=±x/c`），同一堵墙被门洞切段后相位天然连续；L0/L37 墙面、门楣、观察窗、栏板全部改用它 |
| 6 | 配电管线飞到关外 | `pipe.position.set(-86, py, px + 0)` 把 `px=-78` 当成 z 放到了 z=-78（关卡外） | 删除手写 `Cylinder + rotation`，统一用 `pipeBetween(ax,ay,az,bx,by,bz,r,mat)` 按两端点建管并登记 `l0Pipes`；管线全部落在关内北墙/走廊/东墙 |
| 7 | 服务横廊的管子方向不对、也没有吊杆 | 一根长 10 的 Cylinder 旋转 90° 沿 x，且未登记 | 改为 `pipeBetween(-87,2.62,-5,-87,2.62,5)` **沿 z 横穿走廊**，并由 `pipeHangFromCeil` 从顶棚下 5 根吊杆，纳入同一张管线/支撑表 |
| 8 | 管夹看着"在管子附近"，实际没接触 | 管夹用固定 `center=-23.66 / depth=0.30`：第二根管（z=-23.30）与夹子隔 15cm；东墙管（x=-72.4）的夹子中心 -72.55 落在**管子远离墙的一侧** | 新增 `pipeClampToWall(rec,u,along,wallFace,mat)`：长度与中心从**墙内表面**量到**管中心**（北墙内表面 -23.8、东墙 -72.15），两端同时碰到墙与管；每根夹子登记真实 `mesh` |
| 9 | 维修工作灯只有一块发光片悬着；倒伏椅插进地板；侧台腿在台面外 | 灯壳无吊杆；`chair.position.y=0.5` 未按旋转后包围盒落地；侧台腿 x±0.6 而台面宽 1.1 | 工作灯补吊杆 + 接线盒 + 锥形灯罩；倒伏椅改用 `Box3` 求最低点后 `y += 0.006 - box.min.y`；侧台四条腿收到 ±0.47/±0.22 |
| 10 | 纸张/贴花刷进墙或柜体 | 纸张随机落点未排除碰撞体；水渍贴花嵌在墙里 0.05~0.2m | 纸张按 `COLLIDERS_L0`（`y1≤0.4`）外扩 0.14 逐个排除；水渍用 `l0Face` 定位并贴到 `face + side*0.006`，朝向由墙法向决定 |
| 11 | L37 门洞同样只剩竖框、上方无门楣 | `l37Doorway` 只有 `jw=0.12` 竖框 + 横框 | 新增 `l37Header`：每个门洞补门楣到该处真实顶棚；回声室门楣按局部低顶 `L37_ECHO_H=2.55`、设备间按 `L37_EQUIP_H=3.05`，其余按 `H=4.4`，低顶侧不补高顶段以免穿顶；11 个门洞全部登记 |
| 12 | L37 设备间观察窗"看得见玻璃却没有窗下墙" | 只有玻璃 + 上下两条细框，碰撞却是 `0..1.18` 的 sill | 重写 `l37EquipWindow`：窗下墙（0..1.18）、窗上墙（2.52..3.05）、高顶一侧补墙（3.05..4.4）、两侧竖框与上下框，碰撞改为整幅实墙 `0..H`，与可见几何一致 |

### 8.2 本轮改动文件

| 文件 | 说明 |
|---|---|
| `backrooms-pool.html` | 上述 12 项：`addWorldUVBox`、`l0WallPieces`/`L0_GAPS`/`l0Headers`/`l0Sockets`/`l0Handles`/`l0Vents`/`l0Stains`/`l0Props`/`l0Pipes`/`l0Hangers`/`l0Papers` 注册表、`l0Face`、`l0Casing` 门楣、`pipeBetween`/`pipeClampToWall`/`pipeHangFromCeil`、陈设接地、材质收敛、`l37Header`、`l37EquipWindow`、`l37AddWall`/`l37Parapet` 改世界 UV |
| `tools/_l12-node-tests.js` | 新增 5 个断言段（门洞收口、墙面装饰、陈设接地与管线支撑、墙面 UV、L37 门洞与观察窗），并把管线支撑改为"真实网格包围盒同时接触管体与墙面/顶棚"；断言总数 114 → **161** |
| `tools/shots12.cjs` | 新增 9 个机位（L0-07..L0-13、L37-10/11），`--only=` 过滤 |
| `backrooms-pool-online.html` | `node tools/_mkcdn.cjs` 现场重新生成：本地 420752 B / 7513 行，CDN 版 420823 B，逐行比对**只有 importmap 两行不同**（`Compare-Object` 计 4 行差异 = 两行各自的一条替换） |
| `docs/level12-acceptance.md`、`README.md` | 本轮证据与说明 |

### 8.3 本轮命令、退出码与日志（全部本机真实执行）

| # | 命令 | 退出码 | 结果 | 日志绝对路径 |
|---|---|---|---|---|
| 1 | `node tools/_syntax12.cjs` | **0** | `extracted 366152 chars` + `SYNTAX OK` | `D:\AI\工作文件夹\游戏\logs-fix\syntax.log` |
| 2 | `node tools/check-level12-node.cjs` | **0** | **161 / 161 PASS** | `D:\AI\工作文件夹\游戏\logs-fix\l12.log` |
| 3 | `node tools/check-level3-node.cjs` | **0** | **101 / 101 PASS** | `D:\AI\工作文件夹\游戏\logs-fix\l3.log` |
| 4 | `node tools/check-level4-node.cjs` | **0** | **168 / 168 通过，失败 0**，`L4-NODE-TESTS-OK` | `D:\AI\工作文件夹\游戏\logs-fix\l4.log` |
| 5 | `node tools/check-level4-rework-independent.cjs` | **0** | `checks=45; failures=0` | `D:\AI\工作文件夹\游戏\logs-fix\l4r.log` |
| 6 | `node tools/level12-budget.cjs` | **0** | `BUDGET {json}`（见 8.5） | `D:\AI\工作文件夹\游戏\logs-fix\budget.log` |
| 7 | `node tools/_mkcdn.cjs` | **0** | `online bytes 390406`（字符口径）；磁盘 420823 B | `D:\AI\工作文件夹\游戏\logs-fix\cdn.log` |
| 8 | `node tools/_mkcdn.cjs --check` | **0** | `CHECK-OK online 与本地版仅 importmap 两行不同（390406 字节）` | `D:\AI\工作文件夹\游戏\logs-fix\cdn-check.log` |
| 9 | `node tools/shots12.cjs --only=L0-07…L37-11` | **2** | 8 张中 7 张 OK；`L0-09` 因 `camBlocked=true`（机位落在方柱/装饰体内）判失败，换机位后 `SHOTS-OK 1`、退出码 **0** | `D:\AI\工作文件夹\游戏\logs-fix\shots-fix.log` |
| 10 | `node tools/shots12.cjs --only=L0-12,L0-13` | **0** | `SHOTS-OK 2` | `D:\AI\工作文件夹\游戏\logs-fix\shots-pipe.log` |
| 11 | `node tools/shots12.cjs --only=L0-13`（重拍） | **0** | `SHOTS-OK 1` | 同上 |
| 12 | `node --check tools/shots12.cjs` | **0** | 截图脚本语法自检 | 终端 |

说明：截图命令的退出码 2 只在"有任意一张被判失败"时出现；`L0-09` 的失败判据是 `camBlocked`（机位本身有效），换到走廊开阔位置即通过，**不是渲染失败**。所有截图都带 `ready=true`、`budget.calls=1`、`lumMax>0.02`、`camBlocked=false` 四道门控。

### 8.4 新增断言（第 2 条命令的 161 项里本轮新增 47 项）

1. **L0 门洞收口**：遍历 `L0_GAPS` 找 `l0Headers`，用 `Box3` 校验门楣上下沿 = 登记值、跨度覆盖洞口、顶面接顶棚；`l0Header` 碰撞条数与缺口一致且 `y1≥2.1`；负对照：在门廊 A 西门洞临时塞一条整高墙，`segmentBlockedByWalls` 立刻由 false 变 true（证明视线函数真的在看墙）。
2. **L0 墙面装饰**：22 个插座全部贴面且不进 gap、百叶贴面不进 gap、12 片叶片 + 16 件窗框、4 处水渍位置与法向（点积 > 0.9）；负对照：门洞内查询 `l0Face` 返回 null、实体墙段返回非 null。
3. **L0 陈设接地与管线支撑**：23 件陈设 `Box3.min.y ∈ [-0.02, 0.03]`；侧台四腿在台面投影内；每根管线在关内；**每根管线的支撑必须用真实网格包围盒同时接触管体与墙面/顶棚、且 ≥2 处**；服务横廊那根必须沿 z 横穿；负对照两条——夹子沿管轴偏 15cm 不再相交、夹子挂到管子远离墙的一侧不再碰墙（正是本轮 Codex 指出的两类假支撑）。
4. **L0 墙面 UV**：320 个墙面顶点共用同一把世界尺子（相位常数项全 0、`|Δu/Δx|=1/c`）；负对照：改用 `scaleBoxUV` 的同尺寸墙偏移 35.63 被判出；材质断言（墙纸 `ns∈[0.10,0.22]`、地毯 `ns≤0.16` 且无 `roughnessMap`/`clearcoat`）+ 负对照 `matFor(wallpaper,1,1).normalScale.x = 0.80`。
5. **L37 门洞与观察窗**：11 个门楣上下沿与登记一致、不越过 `H`；回声室门楣 `top=2.55`；`poolHeader` 碰撞最低 `y1=2.47`（门头以上，净高仍可通行）；观察窗整幅碰撞 `0..4.4`；用 `scene.traverse` 取跨过 x=24 平面的实体，断言窗台以下、窗楣以上都有真实墙面。

本轮修测试自身的三处不严谨（避免"只对常量自证"）：`stainAt` 是建造函数内部变量不可见 → 改用 `l0Face` 负对照；管线"支撑"原判定只看坐标距离（会放过 15cm 空隙和另一侧假夹子）→ 改真实 `Box3` 双端接触；`poolHeader` 期望数误按 11（实际 13，含 2 条低顶侧补墙）→ 改 `>=` 并逐条校验 `y1`。

### 8.5 场景预算（本轮，`logs-fix/budget.log`）

| 区域 | 网格 | 实例批次(实例数) | 三角面 | 灯(亮) | 阴影体 | 材质 | 几何 | 贴图 |
|---|---|---|---|---|---|---|---|---|
| L0 | 389 | 0 (0) | 5 258 | 10 (9) | 329 | 54 | 374 | 12 |
| L37 | 678 | 8 (281) | 44 481 | 34 (32) | 425 | 145 | 665 | 78 |
| 全场四关 | 2 147（可见 1 734） | 131 (6 496) | 450 435（可见 366 604） | 67 (63) | 1 523 | 358 | 2 056 | 148 |

口径提醒（与第 3.3 节一致）：这些是**场景图统计**，不是 GPU draw call，也不是帧率；`renderer.info.render.calls=1` 只代表帧内最后一次 `composer.render`，不能当作整帧开销。

### 8.6 真实 WebGL 近拍（本轮，用户缺陷位置）

| 机位 | 绝对路径 | 读图结论 |
|---|---|---|
| 门洞上方收口（正面） | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L0-08-door-gap.png` | 门头以上是实墙，不再有到顶棚的黑洞；门套是薄贴脸，横梁压在立框上 |
| 门楣仰角 | `D:\AI\工作文件夹\游戏\shots12\shots12-axefyF\L0-09-lintel-lowangle.png` | 低角度看门楣与顶棚交接处连续，没有悬空梁 |
| 门楣背面 | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L0-10-lintel-back.png` | 从门内侧回看，另一面同样收口，门洞上部不漏空 |
| 插座贴面 | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L0-07-socket-wall.png` | 插座贴在墙面上（**注意：右下角被 HUD 裁掉一部分，取证有限**） |
| 地面质感 | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L0-11-floor.png` | 地毯低绒、无镜面反光，不再像塑料木板 |
| 配电区管线与吊杆 | `D:\AI\工作文件夹\游戏\shots12\shots12-nxsLCV\L0-12-switchgear.png` | 两根北墙管带可见管夹、走廊管带吊杆；画面整体偏暗，细节以 8.4 的真实包围盒断言为准 |
| 北墙 x≈-128.5 门洞（用户图 2 现场） | `D:\AI\工作文件夹\游戏\shots12\shots12-cwZZLI\L0-13-north-door-x128.png` | 门洞上方补墙完整、原通风口位置已是实墙；方柱（-128,-3.2）挡在门前，因此从西侧斜看；旁侧低位插座未入画 |
| L37 入口门洞 | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L37-10-vestibule-door.png` | 前厅门洞上方有门楣，与顶棚相接 |
| L37 设备观察窗 | `D:\AI\工作文件夹\游戏\shots12\shots12-QyYV35\L37-11-equip-window.png` | 玻璃下是实墙、上方到设备间顶也是实墙，侧框可见 |

### 8.7 本轮未做与限制

| 项 | 状态 |
|---|---|
| `tools/check-entry.cjs`、浏览器内检查页 | 仍未执行（沿用第 6 节原因：需要额外启动/路由覆盖，不在本轮返修范围） |
| 硬件 GPU 帧率、GPU 时间、音频听感 | 仍未测；截图是本机 Edge 无头 + SwiftShader 光栅 |
| 插座取证被 HUD 遮挡 | `L0-07` 右下角被 HUD 裁切，证据有限；未再补拍（用户确认该方向通过） |
| 配电区画面偏暗 | `L0-12` 可读支撑位置，细节强度以几何断言为准 |
| 5 个拼接草稿 `tools/_b0_consts.js` 等 | 仍未删除（子进程无删除权），不参与运行 |
| `git commit / push / rollback` | 未执行（用户明确禁止） |

---

## 9. 返修轮：回声池地面材质与池深标识避让

用户实图：`C:\Users\18269\AppData\Local\Temp\codex-clipboard-7fea806d-e391-41a6-8874-f93ffa4ff2f1.png`
（回声浅池周围地面呈金属面板质感；`0.62 m 浅水回声池` 地贴被柱脚压住一角）。
Codex 交接与根因：`docs/level37-floor-sign-repair.md`。

### 9.1 修复内容

| # | 缺陷 | 修法 |
|---|---|---|
| 1 | 回声室 / 北廊地面仍是 `createTileSet` 的 Canvas 材质，物理材质默认 clearcoat + 派生 roughnessMap 把粗糙度乘低 → 金属面板感 | 地面集合绑定现有 `textures/pool-floor.png`（`floorMaint.diffuse/normal/rough`），回声室与北廊改用**局部**标准材质 `l37EchoFloorMat`：`metalness 0`、`roughness 0.86`、`normalScale 0.12`、`envMapIntensity 0.22`、`roughnessMap = null`。标准材质没有 clearcoat 通道。未改共享材质工厂，未动大厅/更衣区材质 |
| 2 | 贴图周期会误沿用旧 Canvas 的 3.72m 覆盖率 | 与相邻大厅同一资产同一映射：`L37_ECHO_FLOOR_COV = 1/6`，即**整张石砖图覆盖 6m**（图内是 4×4 块砖，每块 1.5m），UV 仍是世界米制（`u = x`、`v = -z`），所以与大厅地面在接缝处尺度、相位连续 |
| 3 | 浅池地贴中心 `(-14.2,-22)`、1.9×1.1m，投影压住柱脚 `(-13.6,-21.4)` 的 0.66m 底座 | 地贴只沿 x 平移到 `(-15.2,-22)`（保持 `ry=0`，其余两块未动）；与柱脚净距 0.320m ≥ 0.30m，仍在干地、不压池沿，文字与边框完整 |
| 4 | 缺少可验证的避让/材质约束 | 新增 28 条断言：地面材质绑定与参数、米制 UV 与 repeat 一致性、三块地贴的真实顶点投影 vs 真实柱脚 `Box3`（SAT 判相交 + 边采样净距）、旧坐标负对照、贴图 UV 0..1 完整 |

说明：早期一张近景里地贴文字看起来是倒的，那是**相机在北侧朝南看的方位**造成的；贴图朝向没有旋转，本轮最终状态与用户看图通过的 `shots12-wbAARr` 完全一致（主池 `ry=0`、训练池保持 `Math.PI`、回声池 `ry=0` 仅平移）。

### 9.2 本轮改动文件

| 文件 | 改动 |
|---|---|
| `backrooms-pool.html` | `floorMaint` 接图；`addDeck` 支持 `opts.mat`；新增 `l37EchoFloorMat` 与两处地面调用；`l37Column` 登记真实柱脚底座 `l37ColumnBases`；`l37DeckSign` 登记 `l37DeckSigns`；浅池地贴移至 `(-15.2,-22)` |
| `tools/_l12-node-tests.js` | 新增两个断言段（回声池地面材质 / 池深标识避让），共 28 条 |
| `tools/shots12.cjs` | 新增 3 个机位：`L37-12-echo-floor-sign`、`L37-13-echo-floor-wide`、`L37-14-north-corridor` |
| `backrooms-pool-online.html` | 由 `node tools/_mkcdn.cjs` 重新生成（仅 importmap 两行不同） |

未改：地图布局、碰撞与路线、怪物、共享材质工厂、其他关卡材质尺度。

### 9.3 本轮命令、退出码与日志（全部本机真实执行）

| # | 命令 | 结果 | 退出码 | 日志 |
|---|---|---|---|---|
| 1 | `node tools/_syntax12.cjs` | `SYNTAX OK` | 0 | `logs-echo\syntax-final.log` |
| 2 | `node tools/check-level12-node.cjs` | **189/189 PASS** | 0 | `logs-echo\l12-final.log` |
| 3 | `node tools/check-level3-node.cjs` | 101/101 PASS | 0 | `logs-echo\l3.log` |
| 4 | `node tools/check-level4-node.cjs` | 168/168 通过、失败 0 | 0 | `logs-echo\l4.log` |
| 5 | `node tools/check-level4-rework-independent.cjs` | `checks=45; failures=0` | 0 | `logs-echo\l4r.log` |
| 6 | `node tools/shots12.cjs --base=http://127.0.0.1:8556/backrooms-pool.html --only=echo,north-corridor` | `SHOTS-OK 4` | 0 | `logs-echo\shots.log` |
| 7 | `node tools/_mkcdn.cjs` | `online bytes 391463` | 0 | `logs-echo\cdn.log` |
| 8 | `node tools/_mkcdn.cjs --check` | `CHECK-OK online 与本地版仅 importmap 两行不同（391463 字节）` | 0 | `logs-echo\cdn-check.log` |

第 3–5 条在材质/地贴改动之后、地贴旋转回退之前执行；回退后文件在这三关相关代码上与此前逐字一致（仅 L37 地贴 `ry` 复原），故其日志仍是当前文件的回归证据。第 2 条在回退后重跑。

CDN 一致性实测：`backrooms-pool.html` 422256 B / 7531 行，`backrooms-pool-online.html` 422327 B / 7531 行，`Compare-Object` 只有 4 行差异（两条 importmap 各自一行替换）。

### 9.4 本轮新增断言（第 2 条命令 161 → 189，+28）

- 地面材质段（14 条）：资产同源（`textures/pool-floor.png` 同时被回声池与大厅使用）、两片地面都绑定该材质、`status !== 'fallback'`、非物理材质、`roughness ∈ [0.8,0.95]`、`metalness ≤ 0.01`、`roughnessMap === null`、`normalScale ≈ 0.12`、`envMapIntensity ≤ 0.5`、米制 UV 偏差 < 1e-4、回声池与大厅 `repeat` 一致（0.1667）、负对照（旧画布物理地面 `clearcoat 0.45 / ns 0.80` 会被判不合格）。
- 地贴段（14 条）：20 个真实柱脚底座（厚 0.12m）、四角真实世界高度 0.016、**负对照：旧坐标 (-14.2,-22) 的投影确实压住 (-13.60,-21.40) 的 0.66m 底座**、新位置无相交、净距 0.320m、三块地贴各自不压柱脚、不压池沿、UV 0..1 且 `repeat 1`（文字/边框不被裁切）。

### 9.5 真实 WebGL 取证（`shots12-wbAARr`，本机 Edge 无头 + SwiftShader）

| 图（绝对路径） | 结论 |
|---|---|
| `D:\AI\工作文件夹\游戏\shots12\shots12-wbAARr\L37-12-echo-floor-sign.png` | 用户近景视角：石纹与砖缝清晰、无金属板浮雕/强镜面，地贴完整且与柱脚分离 |
| `D:\AI\工作文件夹\游戏\shots12\shots12-wbAARr\L37-13-echo-floor-wide.png` | 整块地贴 + 柱脚 + 浅池沿同框；地面 6m 网格与大厅一致 |
| `D:\AI\工作文件夹\游戏\shots12\shots12-wbAARr\L37-14-north-corridor.png` | 北廊同一材质，接缝处尺度/相位连续 |
| `D:\AI\工作文件夹\游戏\shots12\shots12-wbAARr\L37-03-echo-room.png` | 回声室全貌（本轮另拍） |

每张都满足门控：`ready=true`、`budget.calls>0`、`lumMax>0.02`、`camBlocked=false`，`waited` 24–33s。

**贴图加载证据（不是靠单个字段冒充）**：
1. 浏览器侧网络日志：4 张图仅 1 条 `404 http://127.0.0.1:8556/favicon.ico`（浏览器默认请求），**没有任何贴图/模块 404 或 loadingFailed**；该 404 是 `Runtime.consoleAPICalled` 里同一条 "Failed to load resource"，因此 `gameErrors` 为空（`shots-report.json` 的 `netErrors` / `gameErrors` / `faviconOnly` 字段可查）。
2. 同一服务上直接取资产：`GET http://127.0.0.1:8556/textures/pool-floor.png` → **200**、`image/png`、**1468326 B**，与磁盘文件字节数完全一致。
3. 页面诊断：`?diag=1` 报表 `ready=true`；回声室机位准星射线命中材质报告 `["StandardMaterial","e3e6df","img","nm",0.86,"ShapeGeometry",…]` —— 命中体是带图片贴图、带法线贴图、roughness 0.86 的地面（仅作"此刻该处确是这块材质"的旁证，不作为加载成功的唯一依据）。
4. Node 侧（渲染桩）只证明**绑定**：材质 `map.userData.asset === 'textures/pool-floor.png'`、参数区间、UV/repeat；不证明解码与显存上传。

### 9.6 场景预算（浏览器 `?diag=1`，L37 机位，非 benchmark）

`meshes 2144 / instanced 131 / lights 67 / tris 397171 / calls 1 / geos 419 / tex 90 / progs 40`。
`calls=1` 是帧内最后一次 `composer.render` 后的 `renderer.info.render.calls`，不是全部 pass 累计；`geos/tex/progs` 是 `renderer.info.memory` 的驻留计数。相对上一轮（`L37 678 网格 / 44481 三角` 的场景分区统计口径不同）：本轮新增几何只有柱脚登记与地贴重定位，噪声级。

### 9.7 本轮未做与限制

| 项 | 状态 |
|---|---|
| 硬件 GPU 帧率 / GPU 时间 / 音频 | 未测（SwiftShader 光栅） |
| 地贴文字朝向 | 未改（`ry` 保持原值）；近景里的"倒向"是相机方位 |
| 其他关卡的地面材质 | 未动（按要求只改局部） |
| `git commit / push / rollback` | 未执行（用户明确禁止） |



## 10. L0 替换为 42×24 紧凑后勤层（本轮子交付，2026-11-04）

本轮把第一关从旧的 86×48 大平面换成"同一份数据驱动"的紧凑后勤层；L37 外壳/家具已在上一轮接入，L0 旧实景生成被旁路，后两关未改。

### 10.1 结构与数据源

| 项 | 位置 | 说明 |
|---|---|---|
| 平面数据 | levels/l12-plan.js | 唯一数据源：L0.rooms（8 房）/L0.doors（11 门，含 1 扇出口外门）/bounds/spawn；宿主与 Node 检查共用 |
| L0 建造 | levels/l12-l0.js | createL0V2(ctx)：墙体由房间边并集生成、按门洞切段、门楣/门套/天花/踢脚/家具/灯/墙饰同源 |
| 宿主接线 | backrooms-pool.html | import { createL0V2 }；BOUNDS_L0/L0_SPAWN/L0_RESPAWN 由 plan 派生；出口触发改为服务前室东墙真实阈值 |
| 家具/灯/标识（L37） | levels/l12-props.js | 上一轮已接入，本轮未改 |

- 矩形面积合计 **760 m²（8 房，未扣墙与家具）**（旧文写作 725 m² 是早期估算，已更正），可走外包 42×20 m（含 2 m 实心后勤带共 42×24），接待 x[-150,-140] z[-6,6]（约 120 m²，按用户意见收窄；entry↔store 门洞同步移到 z[-5.8,-4.2] 的公共边界内），8 个房间：entry / corr / staff / archive / linen / maint / vest / store。
- 两条短回环：corr→staff→archive→corr 与 corr→vest→store→entry→corr（plan-check 断言）。
- 三枚保险丝坐在真实台面：员工区休息桌 0.72 m、档案出票台 1.02 m、配电柜仪表托架 1.66 m；造型为组合实体（陶瓷管身 + 两端金属帽 + 发光环带 + 标签，≥4 零件），不再是单个发光方块。

### 10.2 本轮修掉的真实缺陷

| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| 1 | 出口门洞仍是一整面实墙 | 墙段切洞时 cuts 过滤了 !d.exterior | 切全部门洞并为外门同样生成门楣；通行由 exitDoor 碰撞/门扇负责 |
| 2 | 通风口/水渍全部静默消失 | faceAt 用 9.86/5.86 查真实墙（±10/6），永远查不到 | 用墙中心坐标查询、由返回面坐标偏移；插座按 side 有符号偏移 0.012 |
| 3 | 墙/木饰面贴图 4 m 周期 | map.repeat=0.5 与 addWorldUVBox(cov=2) 双重缩放 | 墙/木 cov=1.0（只缩一次 → 2 m），并为三套材质强制 RepeatWrapping |
| 4 | 配电柜仪表托架保险丝不可交互 | 托架与保险丝嵌在配电柜碰撞体内部（z=-9.55 落在柜体 -9.95..-9.25） | 托架与保险丝移到柜前表面 z=-9.0 |
| 5 | 出口阈值够不到 | 触发窗口 x > -109.3，而玩家实际只能站到 -109.40 | 窗口改为 -109.95 < x < -108.0、-6.9 < z < -3.1 |
| 6 | L0 地面在近景几乎纯黑 | 地毯图偏暗 + 面板灯 2.3/8.5m 距离衰减 + 深色乘色 | 地面色改 0xd6ccb8、面板灯 3.0/12m/decay 1.4、hemiL0 0.12→0.32 |

### 10.3 命令与退出码（本轮新跑，日志在 logs-v2/）

| 命令 | 结果 | 退出码 | 日志 |
|---|---|---|---|
| node tools/check-l0v2-node.cjs | 83 / 83 PASS | 0 | logs-v2/l0v2.log |
| node tools/v2/plan-check.cjs | pass=167 fail=0 | 0 | logs-v2/plan-check.log |
| node tools/_syntax12.cjs | SYNTAX OK | 0 | logs-v2/syntax.log |
| node tools/shots12.cjs --base=http://127.0.0.1:8556/backrooms-pool.html --only=L0-20..L0-24 | SHOTS-OK 5 | 0 | logs-v2/shots-l0v2-final.log |

check-l0v2-node.cjs 用真实 vendor THREE + 真实 updatePlayer/l0Path/tryFuse，只桩渲染器与画布；断言含：plan 同源、门洞中心无阻挡、出生点可行走、三保险丝桌边可站且连续行走无瞬移（单帧位移 < 0.35 m）、保险丝组合实体与台面贴合、三枚→出口的连续路径触发 transitioning、R 复位保进度、怪物点位在新房间内，以及负对照（旧出口 x=-64 无路径、旧配电/档案坐标不在导航网格、旧 9.86 墙面坐标在 1 cm 判据下不贴墙、cov=2 旧写法得出 4 m 周期）。

### 10.4 真实 WebGL 取证（shots12-oDShsq + 收窄接待后的 shots12-dk0WX3 重拍，SwiftShader 光栅）

| 机位 | 文件 |
|---|---|
| 出生（接待/两台门洞） | D:\AI\工作文件夹\游戏\shots12\shots12-dk0WX3\L0-20-spawn-v2.png |
| 档案区（票柜列） | D:\AI\工作文件夹\游戏\shots12\shots12-oDShsq\L0-21-archive-v2.png |
| 配电区（配电柜/桥架/仪表托架保险丝） | D:\AI\工作文件夹\游戏\shots12\shots12-oDShsq\L0-22-switchgear-v2.png |
| 俯视平面（8 房/走廊/门洞/家具） | D:\AI\工作文件夹\游戏\shots12\shots12-dk0WX3\L0-23-topdown-v2.png |
| 服务前室（出口卷帘/门牌） | D:\AI\工作文件夹\游戏\shots12\shots12-dk0WX3\L0-24-service-vest-v2.png |

- 全部 ready=true、camBlocked=false、frames 11–13；唯一网络错误是浏览器默认 404 /favicon.ico（gameErrors: []、faviconOnly: true）。
- 俯视图偏暗（曝光按 L0 恐怖基调），用于读平面结构；近景三张可辨墙纸/地毯纹理、门套、通风口、桥架与保险丝实体。

### 10.5 尚未完成（下一子交付）

| 项 | 说明 |
|---|---|
| 旧 L12 套件改写 | tools/check-level12-node.cjs 仍按旧 86×48 / 三水体旧名断言（110/132），需整体改为新不变量；本轮以 check-l0v2-node.cjs 为 L0 证据 |
| __deadV2Draft 与旧 L0/L37 死段清理 | 旧实景生成已被 L12_V2_L0 / L12_V2_SHELL 旁路，尚未物理删除 |
| L37 坐台支撑/groundAt 同源、方向标识、终版美术 | 按用户要求留到下一子任务 |
| 硬件 GPU 帧率 / 音频 | 未测 |

---

## 11. L37 温泉会所：真实可玩性与关键材质统一

本轮子交付目标（用户 m04329 / m04596 / m04605 / m04666 / m04667）：把第二关从"能看"推进到"能连续走完并取满目标"，同时清掉旧地图残留与重复几何。

### 11.1 真实缺陷与修复

| # | 缺陷（可复核） | 修复 |
|---|---|---|
| 1 | 温泉坐台是固定 0.30m 厚、悬在池底上方 0.38m 的盒子，props 里另有重复声明 | 坐台改为 `levels/l12-plan.js` 的 `p.benches` 单一数据源：`buildPool` 从池底砌起（高 `b.top - p.bottom`）、`groundAt` 返回座面高度、`levels/l12-props.js` 删除 hot-ledge-N/E 与 quiet-ledge-N，`ledge` 分支不再造盒 |
| 2 | 四池仍用旧青蓝马赛克，新资产未接入 | `poolMosaic` 改为 `createTileSet({ cols: 8, rows: 8, tileWorld: 0.05 })` + `coverage 0.4`，`diffuse = assets-v2/l12-v2-pool-mosaic.png`，`buildPool` 的 `COV` 取 `poolMosaic.coverageX` |
| 3 | 墙/木材 repeat = .5 又传 `cov = 2`，实际周期 4m | 墙体/门楣/柱的 `addWorldUVBox` 统一传 `1.0`（木家具本已 1.0），材质 repeat 保持 1/2 → 实测周期 2.00m；未改全局 `scaleBoxUV` |
| 4 | 深度标识写死文字，与水体不一致 | `depthTextOf(pool) = (water - bottom).toFixed(2) + ' m'` 派生：主池 1.72、主汤 0.84、静汤 0.48、冷池 1.19 |
| 5 | 温泉缺坐台/回水口/温度牌/热气，导览是空木板 | 新增 4 块水温牌（28/39/37/18°C，立柱+金属牌+自发光字，带碰撞）、16 个池壁回水口格栅（水线下 0.18m）、4 片主汤水面热气、10 块方向牌（会所导览/脱鞋/更衣 A·B/淋浴 A·B/游泳厅/温泉厅/北休息廊/设备间员工专用） |
| 6 | `poolScare`、`resetGame`、`?l12view` 把池中人放回旧坐标 `-3` / `-3.4` | 改为 `watcherHome()` 与新主池数据派生点；受击、R 复位、重新开局、停电换位、诊断机位全部落在主池 `x 8..18 / z -25.2..-0.2` 内 |
| 7 | 旧 L37 直接造物仍在新地图里：`l37Parapet` 栏板横在东更衣门口、`l37EquipWindow` 观察窗留在旧 x24、`l37EastClere` 窗框悬在新主池水面上 | 三个 IIFE 首行加 `if (L12_V2_SHELL) return;`，不再生成网格与碰撞；测试用真实 `Box3` 扫场景断言三处已空 |

### 11.2 本轮实际命令与退出码

| # | 命令 | 结果 | 退出码 | 日志 |
|---|---|---|---|---|
| 1 | `node tools/_syntax12.cjs` | SYNTAX OK（抽取 387365 字符） | 0 | `logs-l37/syntax.log` |
| 2 | `node tools/v2/plan-check.cjs` | PASS 167 / 0 | 0 | `logs-l37/plan.log` |
| 3 | `node tools/v2/l37-props-check.cjs` | PASS 1118 / 0 | 0 | `logs-l37/props.log` |
| 4 | `node tools/check-l37v2-node.cjs` | **PASS 184 / 184** | 0 | `logs-l37/l37.log` |
| 5 | `node tools/check-l0v2-node.cjs` | PASS 83 / 83 | 0 | `logs-l37/l0.log` |
| 6 | `node tools/check-level3-node.cjs` | PASS 101 / 101 | 0 | `logs-l37/l3.log` |
| 7 | `node tools/check-level4-node.cjs` | PASS 168 / 168 | 0 | `logs-l37/l4.log` |
| 8 | `node tools/check-level4-rework-independent.cjs` | checks=45 failures=0 | 0 | `logs-l37/l4r.log` |
| 9 | `node tools/_mkcdn.cjs` | online bytes 411938 | 0 | `logs-l37/cdn.log` |
| 10 | `node tools/_mkcdn.cjs --check` | CHECK-OK（仅 importmap 两行不同） | 0 | `logs-l37/cdn-check.log` |

### 11.3 新增断言（97 → 184）

- 坐台：真实 `Box3` 与 `p.benches` 一一对应（每池 1 块，尺寸/中心/座面高度对齐），池内无悬浮平台（扫描时排除台阶实体塔、薄水面、泳道线、坐台本体），props 无 `ledge` 声明。
- 材质：四池全部引用 `assets-v2/l12-v2-pool-mosaic.png`、`roughness ≥ 0.8`、`metalness ≤ 0.01`、`roughnessMap = null`；墙/木取样 `Δu/Δm × repeat` → 周期 2.00m，并以 `cov = 2` 的旧组合做负对照。
- 连续路线（核心证据）：一次 `place(出生)` 后不再改坐标，全部用真实 `updatePlayer(1/60)` 连续行走——出生→脱鞋→西更衣→西淋浴→湿区→主池台阶下池→主池 2 目标 `tryPickup` 真移除→台阶出池落干地→主汤 2 目标→出池→静汤 2 目标→出池→冷池入出→北休息廊→回湿区；**5799 帧、36 段、最大单帧位移 0.057m、全程 0.1s（测试总耗时 4.8s）**——这是当时阶段的数字；最终 V2 日志为 **5852 帧 / 36 段**（见上方 V2.3 与 `logs-final-v2/l37.log`），两处差异只是后续断言/路线细化，不代表行为变化。顺序按原玩法安排：主池 2 件 → 主汤 2 件 → 冷池入出 → 北休息廊往返 → 最后在静汤池收齐第 5、6 件；第 6 件拾取触发结算（`transitioning` false → true），并在预览态（`runPreview = true`）验证 `poolrooms.records.v1` 未变化，即"结算触发但不写档"。为隔离路线测试，测试内临时冻结怪物（`poolMonster.cool = 1e9`、`poolDark.timer = 1e9`），**与怪物 AI 测试分开**。
- 路线测试自带 240s 预算：每段记录帧数与耗时，超预算时输出"卡在哪一段/帧数/位置"而不是静默跑到外层 300s 超时（本轮实测 4.8s，最慢段 0.04s/728 帧）。
- 干湿顺序：西侧"鞋区→西更衣→西淋浴→湿Hall"、东侧同序列各自独立走通（不靠绕另一侧），每段到达后核对"人确实在该房间内"；负对照把 `x = ±6` 两处淋浴门封死并重建导航网格后，接待到湿区 `pathTo = null`，移除后恢复。
- 池中人归属：受击、R 复位、`resetGame` 之后位置仍在主池；`WATCHER_SPOTS` 6 点全部在主池内。
- 旧残留：主池水面上方、旧设备窗位置、旧栏板位置三类 `Box3` 扫描均为空。

### 11.4 真实 WebGL 机位（SwiftShader 无头 Edge，非硬件 GPU）

| 目录 | 机位 | 说明 |
|---|---|---|
| `shots12/shots12-NFAlx8` | `L37-23-pool-hall`、`L37-24-pool-poolside`、`L37-25-hot-spring`、`L37-06/07/08/09-drowned-*` | 移除旧残留后重拍；主池水面上方已无浮框，池中人在主池内站立/游动 |
| `shots12/shots12-t0DzUD` | `L37-23/24/25/26/29/30` | 主池、池边、主汤、静汤+冷池、深度标识近景、水温牌近景 |
| `shots12/shots12-xSkwmg` | `L37-20..L37-30` | 接待导览/脱鞋/淋浴/桑拿/北廊序列 |
| `shots12/shots12-0fKsYN`、`shots12/shots12-dk0WX3` | `L0-20..24` | L0 出生/档案/配电/俯视/服务前室（上一子交付） |

全部 `ready=true`、`camBlocked=false`、`frames 10–12`；唯一网络错误仍是浏览器默认 `404 /favicon.ico`（`gameErrors: []`、`faviconOnly: true`）。

### 11.5 尚未完成（下一子交付）

| 项 | 说明 |
|---|---|
| 终版美术 | 按 `docs/level12-v2-art-direction.md`：灯槽/灯带、池沿窄排水槽与实例化格栅（当前仍是零散灰方片）、墙面层次、L0 暗顶与地毯亮度、平面裁切 |
| 旧套件与死代码 | `tools/check-level12-node.cjs` 仍按上一版地图断言；`__deadV2Draft` 与旧建造死段尚未物理删除 |
| 怪物 | 池中人/黑影 AI 断言与本轮路线测试分开，终版灯光下的近景与追人手感仍需复核 |
| 硬件 GPU / 音频 | 未测（无头 SwiftShader 不能代表帧率） |


## 12.（历史补记）统一入口与怪物头脸的中间态

> 本节是 V2 正式验收之前的中间记录，**已被上方 V2 节取代**；其中的路径写法（`shots12shots12-...`）是旧的转义错误，正确路径见 V2.4。

- 当时统一入口为 366 项（L0 84 + L37 217 + 行为 65），与当前一致；`plan-check` 168、`l37-props-check` 1118、L3 101、L4 168、L4R 45 也一致。
- 黑影眼部当时新增真实 THREE 射线断言（从脸前方射向眼中心，首个命中必须是眼网格；负对照：把眼压回 1cm 后不再首先命中），眼中心按头壳解析曲面外推到 z=0.144；池中人改为灰黑凹陷眼窝。这两项在 V2 节保留。
- 旧灯复活回归：清理时删掉 `l37Lamp` 的守卫导致旧三池 26 盏调用复活（诊断 lights=93），已删除那 18 行调用并补灯注册不变量；V2.5 有完整说明。
