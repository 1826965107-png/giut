# 第四关重做 · 程序侧交付报告

此文件保留 DSH 交付时的程序记录。Codex 随后补充正式美术、界面、48m接缝缓冲与最终验收；当前结果以 `level4-acceptance.md` 为准。

本文件只记录**实际做过的改动**、**可复现的命令**、**设计对应关系**和**真实限制**。
美术/贴图由 Codex 负责，本报告不含美术创作说明。

---

## 0. 环境与验证边界（必须先读）

- 程序在独立制作目录完成；临时副本未纳入仓库。默认检查命令直接在仓库根目录运行，可选 --stage 仅供原开发机调试。
- 本次会话的 shell 被平台 ACL 阻断：任何 `pwsh` 调用（含 `node -v`）都在启动阶段失败并报
  `SetNamedSecurityInfoW failed (Win32 5): grantWrite(...)`，因此**我没有在本机执行任何 Node 命令**。
  程序落盘使用 `read` / `write` / `edit` 文件工具。初始权限变更请求未获允许，随后按 Codex 指导继续正常文件操作，没有修改 ACL。
- 已经发生过的真实执行（由 Codex 在本地跑）：
  - `node tools/check-level4-rework-independent.cjs --stage`：独立验收 **25 项全过**（真实引擎：真实相机瞄准 `tryInteract` 开门 → WASD 下车 → 拾手电 → 持续前进跨缝异变 → WASD 走回车内 → 拾电池与钥匙 → 自动换备用 / 暂停冻结 / 重开 / 不结算 / 灯池与网格稳定 / fog 与 art 一致）。
  - 同一脚本扩到 36 项后：**34 项通过**，两个不同横向采样点均暴露异常车松脱吊板低边的跳跃净高问题，已通过共用吊板尺寸与保守净高定义修正（见 §3.6）。
  - 第三次实跑（Codex 侧）：独立验收 **38/38 全过**（含地面实体手电、接缝 bob 无缝、吊板低边）。
  - 我的 DSH 测试套件（`tools/_l4-node-tests.js`，168 项）首轮由 Codex 在 `%TEMP%` 临时模块中执行：**133/146 通过、13 失败**，逐项归因与修复见 §4；第三轮 **167/168 通过**，唯一失败是**测试自己**的坐标换算错误（把 `anchors.torch.position` 这个局部 x 又减了一次 `L4_OX`，显示成 `-362.62`），已改为 `getWorldPosition()` 核对世界坐标，**模型位置一行未动**（见 §4 末）。
- 因此：**GPU/浏览器验证与 Node 自测都不是我跑的**，我没有截图，也没有亲眼看过后处理链。
  下面凡标「已验证」的都是 Codex 实跑结果，标「待复跑」的是我改完等待实跑确认的部分。

## 1. 玩法实现对应（brief 七步 → 代码）

| brief 步骤 | 实现 |
| --- | --- |
| 1. 故障停车（车内） | `spawnPose()` = `{x:L4_OX, y:0.04, z:0, yaw:π/2, pitch:0}`，面朝步道侧中门；正常车厢 = `ctx.buildMetroCar({passing:false})` |
| 2. 车内开门真实下车 | `interactables` 里 `door` 项：`AIM_MIN_DOT=0.62` 准星命中 + 2.6m 距离 + 视线判定；`applyDoor()` 只滑 `doorZ===0` 的中门叶（`baseZ + direction*0.86*t`），门洞碰撞盒 `y1` 在 `t>0.82` 时抬到 900 开放通行；地面高度由 `groundAt()` 给车内地板 `0.04`、步道 `0`，宿主台阶判定（>0.62m 撤销位移）放行 |
| 3. 门外暗步道拾实体手电 | `buildTorch()` 建真实手电模型（`anchors.torch`，`TORCH_POS{-2.62,0.055,-3.20}`，靠门口、贴地不埋地）；`torch` 交互项 `enabled` 仅在 `!torchOwned`；拾取后 `anchors.torch.visible=false`、`anchors.torchRing.material=M.steel` |
| 4. 沿同一条黑暗隧道一直走 | 单走向隧道，`MOD=6` 周期重复环肋/托架/篦子/枕木/反光片；步道 `x∈[-4.20,-1.89]` 高 0，轨槽 `x≥-1.89` 低 `-0.55` |
| 5. 同朝向丝滑跨缝回起点 | `updateSeam()`：`armedF && prev>-48 && z<=-48 → p.z += 84`，反向 `armedB && prev<36 && z>=36 → p.z -= 84`；重上膛 `z>-46.8` / `z<34.8`；`84 = 14×MOD = 28×TILE`（偶数格，镜像重复 UV 也连续）；接缝帧**只给 `camera.position.z += shift`**，保留 Y（步态 bob）、朝向与其它轴 |
| 6. 第一次回返发现列车锈蚀/受控畸变 | `wrapFx(true)` 首次正向跨缝调 `applyAge(true)`（一次性，`agedOnce` 守）；异常车与正常车**同时预建同层**，异变只切 `visible` + 灯强度/颜色，不增删灯、不建新材质 |
| 7. 进入车厢拾电池与应急通行钥匙 | `battery`（`{1.00,0.70,3.05}`，座椅旁收纳架）与 `key`（`{0.82,1.04,-9.55}`，驾驶端设备托盘）两个交互项，`enabled = aged && !taken`；`actBattery` → `charge=min(1,charge+0.55)` 且 `spareBattery=1` |

阶段结束：两件都拿到后 `updateTask()` 只把任务文案改成「继续探索」，**不调用 `ctx.onComplete`、不写 `poolrooms.records.v1`**（宿主 `ensureLevel4` 里 `onComplete` 已换成空函数）。

## 2. 手电归属与电量（宿主验收点 1）

- `L4 state` 独揽 `torchOwned / torchOn / torchCharge / spareBattery`；宿主 `l4Flash` 改成访问器：
  `get on(){return !!(l4&&l4.torchOn);}` / `set on(v){ if(!v&&l4) l4.setTorch(false); }`。
- `toggleFlash()` 的 L4 分支改为 `l4.toggleTorch()`（**未拥有时 `setTorch(true)` 直接拒绝**，因此 F 无效）。
- 光强：`(LEVEL===L4_LEVEL && l4) ? l4.artLighting.flashlight * l4.beamFactor() : 0`，不再有 `32+5*sin` 独立光强；
  角度/半影/距离/衰减由 `enterLevel4()` 用 `setFlashBeam()` 从 `api.artLighting` 写入 `flashLight`，`enterLevel3()` / `restartGame()` 用 `BEAM_BASE={distance:26,angle:0.5,penumbra:0.45,decay:1.4}` 还原（L0 手电行为不变）。
- 电耗：`update(dt)` 内 `torchCharge -= step/TORCH_BURN`（`TORCH_BURN=260`）；`paused` / `cardOpen` 时 `update` 直接 return，**不耗电**。
- 耗尽：若 `spareBattery>0` → 一次性自动换上（`spareBattery=0; torchCharge=0.55; torchOn=true`），否则灭灯；电量不永久锁死（`R` 或再拾电池都能恢复）。
- HUD：`updateFlashHud()` 读真实 `torchOwned/torchCharge/torchOn`，未拾取显示「未拾取」、耗尽显示「耗尽」、电量条按真实百分比。

## 3. 关键实现点与已修的真实缺陷

### 3.1 碰撞表与 bounds 不再外放（验收点 2）
`api.bounds = {x1:L4_OX+WALK_X1(-4.20), x2:L4_OX+TROUGH_X(2.80), z1:-70, z2:58}` 是**真实内边界**；
宿主 `collideCircle()` 末段本来就会再 `x=Math.max(x1+r, min(x2-r))`，所以不能再外放，否则 `RADIUS=0.35` 的圆心能停到墙里。
隧道侧墙另有分段碰撞盒（跳过三个门洞）。

### 3.2 车底碰撞上界必须低于步道脚面
异常/正常车底 `addCollider(CAR.faceIn, CAR.faceOut+0.02, -10.2, 10.2, TROUGH_Y=-0.55, -0.06, {kind:'under'})`。
若上界取 `0.03`，步道脚面 `y=0` 的人在 `x=-1.89` 会被顶回 `-2.24`，永远进不了车。

### 3.3 车底与门洞的横向净空
门净宽 `CAR.doorW=1.65`、两侧半宽 `gapHalf=0.885`，中心过道实测最窄 1.62m（z=0.9 处座椅盒 + 墙），均满足 brief 的 ≥1.1m / ≥1.0m；可走净高：隧道 3.05、车顶 2.60、下垂区 2.50、门洞 2.28，均 ≥2.15m。

### 3.4 交互视线要放行"自己这一扇门"
闭门时门洞碰撞盒 `x∈[-1.89,-1.75]` 正好挡在车内出生点与门外交互点之间，
`hasLineOfSight(...,skip)` 的 `skip` 改成**数组**，`door` 交互项传 `() => doorBlockers.filter(c => c.doorZ === 0)`（只排除当前中门自身，其他遮挡照旧）。

### 3.5 异常车仍要像"那节车厢"（美术观感，Codex 提出）
步道侧壁改成 **8 个真窗洞**：上/下壁板 + 竖向窗间柱围洞，`winY1=1.30 / winY2=2.10`，
每段 `n=round((len-0.36)/1.60)` 窗、窗间柱 ≥0.36m、两端 ≥0.18m，玻璃面落在墙厚中点 `x=-1.82`（洞内，不是贴在实心墙外）；
每窗 4 根错位窗框（`fy=±0.05`、`tilt≈±0.016rad`），一扇无玻璃只剩锈边、一扇带 0.42rad 斜裂缝，玻璃用本关局部克隆材质 `M.glassOld`（`opacity=0.24, depthWrite=false`，不改 `levels/level4-art.js`）。
地板从大块钢面改为深灰橡胶防滑（`M.rubber`），金属只留门槛与走道压条。

### 3.6 松脱吊板不许被跳跃穿头（Codex 36 项验收发现）
模块级常量 `LOOSE_PANEL = {w:0.70,h:0.03,d:1.05,x:0.52,y:2.42,z:2.15,rz:0.26}`，几何与净高**同源**：
`lowY = y-(w/2)sin(rz)-h/2-0.02 ≈ 2.295`，`x1/x2 = ±(w/2)cos(rz) ± 0.35`（含 0.35 半径余量），`z1/z2 = z ∓ (d/2+0.35)`；
`ceilingRaw()` 在车体内先查该区域返回 `lowY`，因此宿主夹紧（`maxFeet = ceilingAt - EYE*crouchH - 0.12`）一定先于穿模。

### 3.7 跨缝不许有声音（Codex 专项接缝审查）
`wrapFx()` 里**所有 `sfx(...)` 已删除**，只剩一次性 `applyAge(true)` + `updateTask()`；
缝边来回 W/S 不会叠加吱嘎，玩家是"走近才发现列车变了"。

### 3.8 实体手电模型从未被建造（Codex 反馈的 13 项失败中唯一的真实实现 bug）
`buildTorch()` 写好了但 `ensureBuilt()` 里漏了调用 → `anchors.torch` 不存在，手电只有交互点没有模型。
已在 `buildPickups()` 之后补 `buildTorch();`。

## 4. DSH 测试套件（`tools/_l4-node-tests.js`）13 项失败的逐项归因

首轮 133/146，失败项与原因（**12 项是测试自身错误，1 项是实现 bug**）：

| # | 失败断言 | 原因 | 修法 |
| --- | --- | --- | --- |
| 1 | `focus 命中车门 [none]` | `focus` 只在 `update(dt)` 内刷新，测试没跑帧 | 瞄准后先 `l4.update(0)` 再断言 |
| 2 | `另两扇车门保持锁死` | `filter(c=>c.doorZ!==0)` 把无关碰撞盒也选进来 | `filter(c => c.carDoor && c.doorZ !== 0)` |
| 3 | `相机与人同步 [0.035]` | 宿主 `updatePlayer` 末尾有 ±0.035m 步态 bob | 水平/竖直误差分开算，竖直容差 0.12 |
| 4–5 | `undefined (reading 'visible')` ×2 | **实现 bug**：`buildTorch()` 未被调用 | §3.8 补调用；并断言初始可见 / 拾后隐藏 / R 后恢复 |
| 6–9 | 跨缝 `crossings=4 forward=4`、`落点 z=-7.72`、第二圈 `forward=4`、逆向 `back=0` | `wasdTo` 朝固定 z 目标走，跨缝后继续追不可达目标，一圈圈刷 | `wasdTo` 增 `stopOnSeam`，跨第一帧即停；接缝用例前先 `setPose` 摆位 |
| 10 | `中心过道净宽 >= 1.0m [1.62m]` | 条件写成 `>=2.0` 与标签不一致 | 改断言真实净宽 `w >= 1.0`（brief 值），并把实测区间打印进 extra |
| 11 | 逆向 `camErr 0.122` | 同 3（bob） | 同 3 |
| 12–13 | 朝向断言 | 我原先那行带 `|| true`，等于恒真 | 删除；改为接缝帧真实快照：`updatePlayer` 之后、`l4.update` 之前的相机 Y/旋转/位移差 |

接缝帧现在断言四条硬指标（都不含恒真）：`seamCamYDelta===0`（Y 完全保留）、`seamRotDelta===0`（朝向/俯仰/滚转不变）、`seamZShift===±84`（只沿 z 平移）、`crossings` 恰好 +1。

第三轮只剩 1 项失败，同样是测试自身的坐标口径错误：

| 失败断言 | 原因 | 修法 |
| --- | --- | --- |
| `手电就在门外步道定位点` 显示 `[-362.62, .055, -3.2]` | 手电挂在 `l4.group` 下，`group` 自身已有 `position.x = L4_OX`，所以 `anchors.torch.position` 是**局部**坐标 `-2.62`；我却写成 `p.x + L4_OX` 再比 `LAY.torch.x`，等于平移了两次 | 改为 `l4.group.updateMatrixWorld(true)` + `anchors.torch.getWorldPosition(new THREE.Vector3())`，再与 `LX(LAY.torch.x)`（世界坐标）比较；extra 里打印 `wp.x - L4_OX` 保持读数为局部值。**模型位置未改** |

## 5. 测试覆盖（`tools/_l4-node-tests.js`，A–P）

A 契约与尺度 · B 真实 `enterLevel4` + 图层 + 碰撞表 + 雾/背景/半球光取 art 值 + 灯池 4 盏 + 两版车同层 + 实体手电 + `glassOld` + `artReady` ·
C 未拥有手电时 F 无效 · D 真实准星开门 + 只有中门滑 + 另两扇锁死 · E 真实 `updatePlayer` 走下车 ·
F 拾取距离/背对不命中/隔墙视线/拾后隐藏 · G 电耗 `1/260` 与暂停冻结 · H 走 48m 首次正向跨缝（落点 z≈36、`maxStep<0.30`、Y/朝向不变、`L4_SFX['l4-wind']` 调用 0 次） ·
I 异变一次性 + 包围盒 · J 走回车内 + 净空 + 过道实测 + 门洞 + 吊板跳跃头顶 <2.30 · K 电池/钥匙一次性 ·
L 耗尽 → 自动换备用 → 不软锁 · M 第二圈 / 逆向 / 贴墙奔跑（不穿不抖） · N 不结算且 `poolrooms.records.v1` 0 次写入 ·
O `respawnToLevelStart()` 全复位后能再走一遍 · P 反复 `enter`/`leave` 不积累网格/材质/灯/监听。

## 6. 命令（Codex 侧执行）

```bat
node tools/check-level4-node.cjs
node tools/check-level3-node.cjs
node tools/check-entry.cjs
node tools/check-level4-rework-independent.cjs --stage
```

`tools/check-level4-node.cjs` 不需要改动：它把 `backrooms-pool.html` 的 module 脚本抽出来、把 `from 'three'` 与所有相对 import 解析成真实绝对 file URL、给 `level4-tunnel.js` 的具名导入追加 `L4_SEAM`/`L4_LAYOUT`、把后处理 addon 换成同名桩、插 `tools/_l3-node-stub.js`、追加 `tools/_l4-node-tests.js`，然后 `node --check` + `execFileSync(node, [out], {stdio:'inherit'})`。

`tools/_mkcdn.cjs` 已重写：路径全部由 `__dirname` 推导，只读写本制作目录的 `backrooms-pool.html` / `backrooms-pool-online.html`；替换条目找不到时 **throw** 而不是静默写出坏文件。

## 7. 真实限制（未做/未验证）

1. **我没有执行过任何 Node 命令**。接缝 bob 保留、吊板低边、地面实体手电已由 Codex 的 38 项独立验收实跑确认；最后一处测试坐标修正（§4 末）需要复跑一次 168 项套件才算闭环。
2. **没有 GPU 验证**：24m 端部收口、26m 外列车在雾里的淡影、`glassOld` 的透明排序、灯池在异常态的整体明度，都只能在浏览器里看。
3. 正常车直接复用宿主 `buildMetroCar()`，其自带 3 盏灯被移除、LED 材质换成低亮版本（`emissiveIntensity=0.42`）以免 26m 外露白光；这类"宿主模型的改造"仍可能和 Codex 后续改 `buildMetroCar` 冲突，需要一起复查。
4. 异常车的变形幅度是常量写死的（天花下垂 0.10、壁板外鼓 0.035、窗框偏移 5cm / 倾 0.012–0.02rad、扶手倾角 ±0.006rad），没有做参数化；若要更强/更弱的畸变，改 `buildAgedCar` 里的这几个数即可。
5. 行走音效只用了宿主既有脚步表（L4 → `'concrete'`），步道/车厢地板没有区分材质音。
