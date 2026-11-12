# 🏊 POOLROOMS · 后室泳池层

项目代码修改统一记录在[代码改动记录](代码改动记录.md)，每次修改代码时同步更新。

> 一个**纯前端**的第一人称 3D 恐怖解谜网页游戏：经典 Backrooms（后室）Level 0 后勤层 → 逃离至 Level 37 温泉会所 → 地下车站 → 回声区间。
>
> 不需要构建步骤，但**不是单文件游戏**：`backrooms-pool.html` 是宿主，平面/建造/道具/美术拆在 `levels/l12-*.js`，素材在 `assets-v2/`（六张 v2 材质）、`textures/`（旧材质与 L3/L4 素材）、`vendor/three/`（离线 Three r160），第四关在 `levels/level4-tunnel.js`。因此必须通过 HTTP 打开（`node server.js` 或 `启动游戏.cmd`），`file://` 双击会被浏览器拦掉相对模块。

---

## ✅ 当前状态（2026-11-10，V2 布局）

| 项 | 事实 |
|---|---|
| Level 0 | 外包 42×24m；8 个房间、矩形面积合计 **760 m²**（未扣墙/家具，净可走更小）；接待 120 m²；3 保险丝在**员工休息桌 / 档案柜 / 配电柜**实体台面上；`档案 ↔ 布草` 有绕行门，两条短回环；出口在服务前室东墙 `x=-108` |
| Level 37 | 接待 → 脱鞋 → 东/西更衣 → 淋浴 → 湿区分配厅 → 主池（25×10m、5 条 2m 泳道）+ 主汤 + 静汤 + 冷水池 + 桑拿 + 北休息廊；设备间只走员工支线，不是游客必经路；6 个目标为**鸭 3 + 圈 3**，主池/主汤/静汤各 2 |
| 材质 | 使用原有六张材质与新增L37白色墙砖、浅灰地砖，合计八张。墙砖整张2m、10×10块，地砖整张2.4m、8×8块，池内马赛克整张0.4m。新增材质、提示词及验证见 [记录](logs-ceramic-refresh/RUN.md) |
| 测试 | `node tools/check-level12-node.cjs` **575 项**（L0 98 + L37 412 + 行为 65，三段独立进程）；`tools/v2/plan-check.cjs` 168；`tools/v2/l37-props-check.cjs` 1174；第三关 101；第四关 168 + 独立验收 45。本轮瓷砖与浮物返修见 [验证记录](logs-ceramic-refresh/RUN.md)，此前吸顶灯返修见 [验证记录](logs-ceiling-lights/RUN.md)，此前门口、墙牌和长凳返修见 [验证记录](logs-door-sign-bench/RUN.md)，此前淋浴返修见 [`logs-shower/RUN.md`](logs-shower/RUN.md)；后两关既有回归见 [`logs-final-v2/MANIFEST.md`](logs-final-v2/MANIFEST.md) |
| 画面 | 真实 WebGL（本机 Edge 无头 + SwiftShader），正式代表图见 `shots12/shots12-3lgY5v/`、`shots12/shots12-QJ5wkG/`、`shots12/shots12-tGCwvb/`；两张怪物头脸是**含 `l12diagLight` 的诊断近景**，不冒充正式灯光图 |
| 未测 | 硬件 GPU 帧率/GPU 时间、真实硬件 Bloom 观感、音频听感；截图里 `renderer.info.render.calls=1` 是最后一次 `composer.render` 后的值，不是整帧性能口径 |

---

## 🎮 游戏流程

```
Level 0 · 后勤后室（第一关）              Level 37 · 温泉会所（第二关）
┌──────────────────────────┐            ┌────────────────────────────────┐
│ 42×24m 外包 / 8 房         │  EXIT 门   │ 接待 → 脱鞋 → 东/西更衣 → 淋浴    │
│ · 接待 120m²（供电导览）    │ ─────────▶ │ → 湿区分配厅                     │
│ · 员工更衣 / 票务档案       │  黑屏过渡  │ · 主池 25×10m / 5 条泳道          │
│ · 布草 / 布草库 / 配电      │            │ · 主汤 / 静汤 / 冷水池 + 桑拿      │
│ · 服务前室（出口）          │            │ · 北休息廊连两厅；设备间员工支线   │
│ 3 枚保险丝（实体台面承载）   │            │ 6 个目标：鸭 3 + 圈 3            │
│ 躲避黑影（绕墙追击 + 最后目击）│            │ 躲避池中人（只在主池追人）        │
└──────────────────────────┘            └────────────────────────────────┘
```

第三关乘车约 6.4s 后故障停车，承接 **Level 4 · 回声区间：第一次回返**。紧急制动与静坐两种选择都从正常列车进入新版。

| 阶段 | 目标 | 恐怖/玩法元素 |
|---|---|---|
| **Level 0** | 找齐 3 枚保险丝 → 服务前室东墙 EXIT 解锁 → 进入泳池层 | 42×24m 外包的后勤后室，8 个房间：值班接待（失电配电图 + 值班台）、员工更衣休息、票务档案、布草整理、布草库、维修配电、服务前室、中央走廊。每房都有目标/线索/捷径：接待的供电图指向三处分电，员工休息桌是第 1 枚保险丝，票务档案的票柜与出票台是第 2 枚，布草 ↔ 档案有绕行门可甩开追逐，配电柜仪表托架是第 3 枚。**两条短回环**接回中央节点；三枚保险丝都坐在真实台面（0.72 / 1.02 / 1.66m）上并带端帽实体造型（不是发光方块）。门洞有门楣墙、洞口内衬与薄门套；插座/百叶/水渍只贴真实墙段；管线有管夹与吊杆；墙/地毯用世界米制 UV 且跨门洞相位连续。**黑影**：驼背长臂约 2.2m、左右肩不对称、炭黑湿织物 + 嵌入式窄暗红眼缝；行为分凝视（视线内正视 0.9s 才被发现）→ 追击（八向 A* 绕墙、分步碰撞、丢失视线改追**最后目击点**、5s 追不到就放弃）→ 搜寻（原地缓慢转身）；被抓回起点但保留已收集进度，带统一安全冷却 |
| **Level 37** | 自由探索温泉会所，集齐 6 个漂浮物（鸭 3 / 救生圈 3；主池、主汤、静汤各 2） | 空间：南入口接待（总导览牌 + 前台 + 等候）→ 脱鞋储物 → 东/西两组更衣 → 分离淋浴（每侧 4 间单排并列、2.65×2.40m、共用侧板、2.1m 不透明板 + L 形错位入口、入口净宽约 1.10m、贯通走道 1.34m、地面连续排水槽）→ 湿区分配厅；右转 25×10m 五泳道主池（四级台阶、单级 ≤0.62m），左转温泉区（主汤 10×8m、静汤 6×6m 浅水坐台、3×3m 冷水池、桑拿）；北侧静休廊把两厅连成第二湿区环路；设备/水处理只走员工门支线。**统一材质家族**：浅灰防滑瓷砖地、白色釉面墙砖、灰绿石质池内小砖、烟熏浅木、深铜灰五金，湿干区靠构造/铺装/光色区分而不是每房换色；池沿是石材压顶 + 压顶外侧窄排水槽与实例化格栅。**池中人**：与黑影完全不同的独立模型（灰白浸水皮肤、灰黑凹陷眼窝、塌肩偏斜头、分层湿发、指肘膝连续），站立有呼吸/头部延迟/手指抽动，游动四肢节拍不同、发束滞后；只在主池追人，其他水体只出水声与远处窥视；停电只在有效水下点间转移；上岸不追干地；抓取要距离 + 高度 + 真实墙体遮挡，并有冷却。集齐后弹出**通关结算**（用时/惊吓/收集度），一键再玩 |
| **Level 4 · 回声区间**<br>（关卡编号 3，第三关乘车途中进入） | 故障停车 → E 开门下车 → 门外拾实体手电 → 沿黑暗隧道前进 → 无缝回到起点 → 旧列车异变 → 进车拾电池和应急通行钥匙 | **心理恐怖阶段一**：列车老旧、窗框错位、扶手倾斜、车顶下垂。本次到资源探索为止，继续自由走动，不结算、不写全流程纪录。 |

### 操作

| 按键 | 功能 |
|---|---|
| `W A S D` / 方向键 | 移动 |
| 鼠标 | 视角 |
| `Shift` | 奔跑 |
| `空格` | 跳跃 / 水中上浮 |
| `E` | 交互拾取；车厢内关门发车；行驶中选择紧急制动；第四关：打开中门、拾手电、电池与钥匙 |
| `R` | 返回本关起点；乘车时返回站台并恢复开门；第四关完整恢复正常列车及未拾取物品 |
| `F` | 手电开关；第四关必须先拾取手电，独立电量约260秒，备用电池耗尽时自动补给一次 |
| `Esc` / `P` | 释放光标（可调左上角参数面板） |
| `H` | 隐藏 / 显示 HUD 面板 |

---

## 🚀 快速开始

### 本地运行（推荐）

Windows 下双击 **`启动游戏.cmd`**：自动检查或启动本机服务再打开游戏，已运行时会复用现有服务。

```bash
git clone https://github.com/1826965107-png/giut.git
cd giut
node server.js            # 需 Node.js ≥ 18
```

浏览器打开 **http://127.0.0.1:8555/backrooms-pool.html**。

- 直达第三关：`启动游戏.cmd --level=3`；第四关：`--level=4`（预览，不写全流程记录）。
- 第二关直达预览：`http://127.0.0.1:8555/backrooms-pool.html?level=37`，`&px=…&pz=…` 指定落点，`&cam=x,y,z,yaw,pitch` 固定机位；预览不建记录、不写档。
- 诊断：`&diag=1` 把 level/player/cam/renderer.info 写进标题栏，`&l12view=entity|drowned-stand|drowned-swim` 固定怪物姿态（仅诊断机位）。

### HTTP 服务版（importmap 指 jsDelivr，仍需服务）

`backrooms-pool-online.html` 只是把 importmap 的两行换成 `https://cdn.jsdelivr.net/npm/three@0.160.0/...`，其余与本地版逐字节相同。它**同样必须通过 HTTP 打开**，并且要和 `levels/`、`textures/`、`assets-v2/` 放在同一目录（第四关与 v2 模块用相对 import，`file://` 双击会被 CORS 拦掉）。

> 由 `node tools/_mkcdn.cjs` 从本地版生成，`node tools/_mkcdn.cjs --check` 按"仅 importmap 两行不同"校验；不要手工改其他字符。当前本地 400018 B / CDN 400089 B（`_mkcdn.cjs --check` 报告 370259 字符，逐行仅 importmap 两行不同）。

---

## 🛠 技术要点

**渲染（Three.js r160）**
- ACES 色调映射 + UnrealBloom 泛光 + 指数雾；暗顶密集筒灯/线灯 + 独立灯槽与灯盘
- `Water` 平面反射/折射水面：法线扰动的水平分量压到 `0.045`（Three 默认 `1.5`），`distortionScale 0.10`，室内静水只留细微摆动
- 水底焦散：贴图叠加滚动（AdditiveBlending）；自建 HDR 环境球 → PMREM IBL
- 自定义 ShaderPass：水下全屏折射滤镜（噪声扭曲 + 水色 + 暗角）
- 天花按房间分两类：湿区/泳池用矿物板 + T 龙骨 + 灯盘，接待/更衣/桑拿用烟熏木格栅；墙裙 0.72m 石/木护墙 + 细压条

**关卡与玩法**
- 平面唯一数据源 `levels/l12-plan.js`（房间/门洞/四水体/收集物/池中人点位/出生点），墙、门楣、门套、天花、踢脚、碰撞、导航、深度标识都由同一份数据生成
- 建造模块 `levels/l12-l0.js` / `levels/l12-props.js` / `levels/l12-art.js`；宿主只保留状态机与控制器
- 数据驱动碰撞（AABB 列表 + 圆推进解），地面/水位按矩形与台阶/坐台数据查询，模型与 `groundAt` 同源
- 世界米制 UV（顶点世界坐标直接算 uv），同一墙面拆段相位连续
- 第一人称控制器：重力 / 跳跃 / 游泳 / 头摆 / 奔跑 FOV；台阶单级 ≤0.62m 限制
- 多关卡状态机（后室 → 泳池 → 车站 → 回声区间）：碰撞/边界/雾/光照随关卡切换
- 运行时错误可视化（左下角红框，告别黑屏哑火）

**素材**
- `assets-v2/`（V2 正式材质，6 张）：`l12-v2-spa-floor.png` 4×4 块石砖（整张 2.4m）、`l12-v2-pool-mosaic.png` 8×8 小砖（0.4m）、`l12-v2-spa-plaster.png` 矿物墙（2m）、`l12-v2-wallpaper.png` 黄麻墙纸（2m）、`l12-v2-carpet.png` 低绒地毯（2m）、`l12-v2-smoked-oak.png` 烟熏浅木（2m）
- `textures/`（旧材质与第三/四关素材）：黄墙纸、暗顶、白釉砖、池底石砖、水面、焦散、`l4-*` 等；`textures/` 仍是目录画廊
- 程序化贴图引擎保留：瓷砖逐砖色差 + 烘焙 AO、高度图 Sobel 生成法线、水面 fbm 可平铺
- 怪物建模：黑影（驼背长臂 + 嵌入式窄红眼缝）与池中人（凹陷眼窝 + 分层湿发）独立骨架，共享材质工厂但不共享体块

**合成音频（WebAudio，零音频文件）**
- 分表面脚步声（瓷砖 / 地毯 / 水泥 / 水溅）+ 卷积混响大厅回声
- 47Hz 低频嗡鸣环境床 + 随机吱嘎声 + 拾取/解锁/惊吓音效全实时合成

---

## 📁 目录结构

```
.
├── backrooms-pool.html          # 🎮 宿主（本地版，importmap → vendor/）
├── backrooms-pool-online.html   # 🎮 同一游戏，importmap → jsDelivr（仍需 HTTP）
├── levels/l12-plan.js           # 第一/二关平面唯一数据源（房间/门洞/水体/目标/点位）
├── levels/l12-l0.js             # L0 建造：墙/门楣/门套/天花/踢脚/家具/保险丝台面
├── levels/l12-props.js          # L37 家具/灯具/方向牌/温度牌/回水口/池深标识
├── levels/l12-art.js            # 装饰构件：吊顶/木格栅/梁/灯槽/墙裙/排水格栅/牌面
├── levels/level4-tunnel.js      # 第四关：黑暗隧道、首次回返与异变列车
├── assets-v2/                   # V2 六张正式材质（2K 可平铺）
├── textures/                    # 旧材质 + 第三/四关素材 + 画廊 index.html
├── vendor/three/                # Three.js r160 + addons（离线依赖）
├── tools/                       # 回归检查、CDN 同步、截图脚本
├── logs-final-v2/               # 本阶段证据：命令/退出码/结果（MANIFEST.md）
├── shots12/                     # 真实 WebGL 截图（按运行批次分子目录）
├── server.js                    # 零依赖静态服务器（Node ≥18）
└── refs/                        # 怪物与材质参考图
```

---

## 🔧 开发提示

```bash
# 第一/二关统一回归（纯 Node，不启动浏览器；575 项，三段独立进程）
node tools/check-level12-node.cjs

# 也可分段跑
node tools/check-l0v2-node.cjs        # L0 几何/行走/拾取：84
node tools/check-l37v2-node.cjs       # L37 几何/材质/路线/灯注册/8 间隔间/门洞共面：412
node tools/check-l12-behavior-node.cjs# 黑影 AI/交互缓存/池中人/预览：65

# 平面与家具数据检查（不渲染）
node tools/v2/plan-check.cjs          # 168
node tools/v2/l37-props-check.cjs     # 1174

# 第三/四关回归
node tools/check-level3-node.cjs      # 101
node tools/check-level4-node.cjs      # 168
node tools/check-level4-rework-independent.cjs   # 45

# 语法（把内联 module 交给 node --check）
node tools/_syntax12.cjs

# 改完本地版后同步 HTTP 服务版（只换 importmap 两行）并校验
node tools/_mkcdn.cjs
node tools/_mkcdn.cjs --check

# 真实 WebGL 截图（Edge 无头 + CDP；--only 过滤机位）
node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L37-23,L37-25
```

- 平面调结构只改 `levels/l12-plan.js`；墙/门/碰撞/导航/标识会一起更新。改完先跑 `plan-check` 再跑引擎回归。
- 第三关检查：`node tools/check-station.cjs`，再打开 `http://127.0.0.1:8555/test-station.html?level=3`（31 项任务流程、闸机、楼梯环廊、家具交叠与界面）。检查页不改存档。
- 地铁检查：`node tools/check-metro.cjs`，再打开 `http://127.0.0.1:8555/test-metro.html?level=3`（66 项，含车体与站台间距、三门进出、跳跃净空、两个结局、复位与零重复写入）。
- 交互性能：`node tools/check-interaction-performance.cjs` + `test-performance.html?level=3`（灯光数量与新增着色程序；第三关动态提灯留在固定灯池）。
- 检票员检查：`node tools/check-conductor.cjs` + `test-conductor.html?level=3`（35 项出生坐标、可见性、巡逻、查票与追逐）。
- 第三关纯 Node 回归：`node tools/check-level3-node.cjs`（101 项，含 111 个位置的车体扫掠、真实 `updatePlayer` 进维修间、查票线/死区/让行冷却、真实高度视线遮挡、固定 26 灯）。`tools/check-{metro,conductor,station}.cjs` 只生成浏览器检查页并做注入语法自检，不能当行为断言。
- 第四关：`node tools/check-level4-node.cjs`（168）+ `node tools/check-level4-rework-independent.cjs`（45，含连续 WASD、正逆接缝、真实净空、隔墙不可拾取、两条乘车衔接与零写档）。Node 侧 GPU/DOM/音频/图片解码为桩，真实画面另用浏览器检查。
- 第一/二关回归是同一范式：从宿主抽出真实 module + 真实 `vendor/three`，只桩渲染器/画布/音频/图片/DOM。2026-11-12 的一键数字：**575 项统一入口** + `plan-check` 168 + `l37-props-check` 1174 + 第三关 101 + 第四关 168/45。**测试是 Node 桩，不是浏览器实测**；浏览器证据在 `shots12/`，两者不能互相替代。

---

## ⚠️ 已知问题

- Level 0 通道净宽按 ≥1.4m 布置（碰撞半径 0.35m）；接待 120 m² 是有意的"前厅感"，其余房间按用途收紧。
- 材质原图较大（2K/1K），首次进入需 1~2s 贴图加载（期间表面偏暗）。
- 手电筒电量约 100s（`charge - dt/100` 处可调）。
- **未实测**：硬件 GPU 帧率/GPU 时间、真实硬件 Bloom 与水面观感、音频听感。`?diag=1` 的 `renderer.info` 读数里 `calls=1` 只是最后一次 `composer.render` 的值，不能当整帧绘制调用数；`geos/tex/progs` 是常驻计数，不等于当前可见数量。
- 怪物头脸两张（`shots12/shots12-WkJDsg/L0-32-entity-head.png`、`shots12/shots12-Fyaxy2/L37-35-drowned-head.png`）使用**诊断补光 `l12diagLight`**，只用于检查骨架/材质，不代表正式场景亮度。
- L37 站立近景 `L37-06` 的头脸被泳道绳部分遮挡；水下 `L37-08/09` 的头脸亦受泳道绳或高光影响，面部近景证据有限（躯干/腕部/发盖已复核）。
- 第三关本轮改动（维修间净空、检票员 AI/模型/贴图）由纯 Node 回归覆盖几何与参数；布料 PBR、死皮裂纹、提灯体积感未在浏览器实测，需要人工看一眼。
- 第四关通过 168 项模块测试、45 项独立验收、第三关 101 项回归与真实 WebGL 代表画面检查；范围止于首次异变后拾电池和钥匙，长期帧率与音效听感尚未专项评测。
- 修改本地版后必须重跑 `node tools/_mkcdn.cjs` 与 `--check`；`node tools/check-entry.cjs` 检查启动、服务复用和第四关模块访问。
- Windows 下 git 若报 `schannel SEC_E_NO_CREDENTIALS`：`git config --local http.sslBackend openssl`

---

## 📜 许可

本项目为个人作品演示（代码与 AI 生成素材）。使用 Backrooms 题材概念致敬 [The Backrooms](https://backrooms-wiki.wikidot.com) 社区（Kane Parsons 原创概念）。
