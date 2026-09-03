# 🏊 POOLROOMS · 后室泳池层

> 一个**纯前端、零资源依赖思路**的第一人称 3D 恐怖解谜网页游戏：经典 Backrooms（后室）Level 0 黄色迷宫 → 逃离至 Level 37 泳池层（标准游泳馆）。
>
> 单 HTML 文件 + Three.js，材质、音效、水体、恐怖事件全部程序化 / AI 生成，克隆即玩。

---

## 🎮 游戏流程

```
Level 0 · 后室（前置关卡）            Level 37 · 泳池层（通关场景）
┌─────────────────────┐              ┌──────────────────────────┐
│ 暗黑黄色迷宫          │   出口门变绿  │ 25m 标准 8 泳道竞赛池      │
│ · 收集 3 枚保险丝      │ ──────────▶ │ · 泳道绳 / 泳道线 / 出发台  │
│ · 拾取手电筒 (F)      │   黑屏过渡   │ · 训练池 / 筒灯暗顶 / 白瓷砖│
│ · 躲避黑暗中"黑影"     │              │ · 收集 6 个漂浮物 → 结算   │
└─────────────────────┘              └──────────────────────────┘
```

| 阶段 | 目标 | 恐怖/玩法元素 |
|---|---|---|
| **Level 0** | 找齐 3 枚保险丝 → 东端 EXIT 门解锁 → 逃入泳池层 | 灯管大面积烧毁、手电成为关键；**黑影实体**三种行为：远处凝视（靠近触发惊吓）、第 2 枚保险丝后**追击战 12s**（2.2m/s，走跑可甩脱）、第 3 枚后**逃亡追逐 22s**（3.05m/s，全灯骤暗 + 心跳声 + 嗡鸣渐强）；被抓即回出生点（道具进度保留） |
| **Level 37** | 自由探索标准游泳馆，集齐 6 个漂浮物（小黄鸭 ×4 / 救生圈 ×2） | **泳池恐怖包**：①「池中人」——苍白人影立于深水池底、时刻面向你，**全馆停电**（进馆 15~30s 后首次，之后每 24~50s）时它会换位，来电瞬间离你太近→惊吓；②停电时**水下掠影**高速滑过 + 远处水声；③**背视漂移**——漂浮物在你没看它时缓缓靠近；④随机滴水/水声回声。潜入深水触发水下折射滤镜；集齐后弹出 **通关结算**（用时/惊吓/收集度），一键**再玩一次** |

### 操作

| 按键 | 功能 |
|---|---|
| `W A S D` / 方向键 | 移动 |
| 鼠标 | 视角 |
| `Shift` | 奔跑 |
| `空格` | 跳跃 / 水中上浮 |
| `E` | 交互拾取（保险丝 / 手电筒 / 漂浮物） |
| `F` | 手电筒开关（仅 Level 0 生效，有电量） |
| `Esc` / `P` | 释放光标（可调左上角参数面板） |
| `H` | 隐藏 / 显示 HUD 面板 |

---

## 🚀 快速开始

### 方式一：本地离线版（推荐）
```bash
git clone https://github.com/1826965107-png/giut.git
cd giut
node server.js            # 需 Node.js ≥ 18
```
浏览器打开 **http://127.0.0.1:8555/backrooms-pool.html**

### 方式二：CDN 双击版（需联网）
直接双击打开 `backrooms-pool-online.html`（Three.js 从 jsDelivr 加载）。

> ⚠️ 本地版通过 `<script type="module">` + importmap 加载，必须走 HTTP 服务（`node server.js`）；浏览器直接以 `file://` 打开请用 CDN 版。

---

## 🛠 技术要点

**渲染（Three.js r160）**
- ACES 色调映射 + UnrealBloom 泛光 + 指数雾
- `Water` 平面反射/折射水面（AI 图转法线驱动，室内静水：扰动压缩至 6%）
- 水底焦散：AI 原图叠加滚动（AdditiveBlending）
- 自建 HDR 环境球 → PMREM IBL：瓷砖釉面、不锈钢扶梯的真实反射
- 暗顶密集筒灯阵（PointLight + 自发光灯位）；Level 0 荧光灯管带随机骤熄闪烁
- 自定义 ShaderPass：水下全屏折射滤镜（噪声扭曲 + 水色 + 暗角）

**关卡与玩法**
- 数据驱动碰撞（AABB 列表 + 圆推进解），地面/水位按矩形区域查询
- ShapeGeometry 洞口地板 + 世界坐标 UV；Box/Plane 逐面 UV 缩放 → **全场共享单张贴图**，原图直出省显存
- 第一人称控制器：重力 / 跳跃 / 游泳 / 头摆 / 奔跑 FOV
- 双关卡状态机（Level 0 ⇄ Level 37）：碰撞/边界/雾/光照随关卡切换
- 运行时错误可视化（左下角红框，告别黑屏哑火）

**程序化贴图引擎**（无需任何外部素材也能跑）
- 瓷砖：逐砖色差 + 釉面渐变 + 烘焙 AO + 微裂纹 + 无缝大尺度斑驳
- 由高度图 Sobel 生成法线贴图；粗糙度贴图同步生成
- 水面法线：周期 fbm（可平铺）

**AI 贴图包**（`textures/`，生图模型产出，2K/1K 可平铺）
- `wallpaper-yellow.png` 黄墙纸 · `carpet-dark.png` 湿地毯 · `ceiling-dark.png` 暗顶
- `pool-tiles-white.png` 白釉砖 · `pool-mosaic-teal.png` 青绿马赛克 · `pool-floor.png` 大厅石砖
- `water-surface.png` 水面 · `water-caustics.png` 水底焦散
- 内置画廊：`http://127.0.0.1:8555/textures/`

**合成音频（WebAudio，零音频文件）**
- 分表面脚步声（瓷砖 / 地毯 / 水泥 / 水溅）+ 卷积混响大厅回声
- 47Hz 低频嗡鸣环境床 + 随机吱嘎声 + 拾取/解锁/惊吓音效全实时合成

---

## 📁 目录结构

```
.
├── backrooms-pool.html        # 🎮 游戏本体（本地版，importmap → vendor/）
├── backrooms-pool-online.html # 🎮 游戏本体（CDN 版，可双击）
├── server.js                  # 零依赖静态服务器（Node ≥18）
├── vendor/three/              # Three.js r160 + addons（离线依赖）
├── tools/download-three.mjs   # vendor 重新生成脚本
└── textures/                  # AI 生成贴图包 + index.html 画廊
```

---

## 🔧 开发提示

```bash
# 重新拉取 Three.js 依赖（版本变动时）
node tools/download-three.mjs

# 语法自检（提取内联 module 交给 node --check）
node -e "const h=require('fs').readFileSync('backrooms-pool.html','utf8');const k='<script type=\"module\">';const i=h.indexOf(k)+k.length,j=h.indexOf('</script>',i);require('fs').writeFileSync('.tmp.mjs',h.slice(i,j))" && node --check .tmp.mjs && del .tmp.mjs
```

- 关卡数据（泳池/台阶/碰撞/分区）集中在文件顶部 `/* 地图数据 */` 区块，调结构改这里
- Windows 下 git 若报 `schannel SEC_E_NO_CREDENTIALS`：`git config --local http.sslBackend openssl`

---

## ⚠️ 已知问题

- Level 0 迷宫通道偏窄处转身可能蹭墙（碰撞半径 0.35m），如需可调 `RADIUS`
- 材质原图较大，首次进入需 1~2s 贴图加载（期间表面偏暗）
- 手电筒电量约 100s（`charge - dt/100` 处可调）

---

## 📜 许可

本项目为个人作品演示（代码与 AI 生成素材）。使用 Backrooms 题材概念致敬 [The Backrooms](https://backrooms-wiki.wikidot.com) 社区（Kane Parsons 原创概念）。
