# 回声池地面与标识返修交接

状态：已由原 DSH 任务实施，Codex 已完成代码、日志与真实 WebGL 近景审查。2026-11-04。实现与测试由 DSH 负责，Codex 保持游戏代码只读。

## 用户证据

截图：`C:/Users/18269/AppData/Local/Temp/codex-clipboard-7fea806d-e391-41a6-8874-f93ffa4ff2f1.png`。
问题为回声浅池周围地面呈金属面板质感，水深地贴与柱脚重叠。

## 已核对的代码根因

- `backrooms-pool.html` 中 `floorMaint` 使用 `createTileSet` 产生的 Canvas 材质；大厅 `floorWest/floorEast` 则绑定 `textures/pool-floor.png`。回声室和北廊调用 `addDeck(..., floorMaint, {physical:true})`，因此未使用大厅地面图片，并沿用较强法线、粗糙度贴图及物理材质默认 clearcoat。
- 地贴中心 `(-14.2,-22)`，尺寸 `1.9×1.1m`，投影范围为 x `[-15.15,-13.25]`、z `[-22.55,-21.45]`。
- 柱中心 `(-13.6,-21.4)`，柱脚实际宽 `0.66m`，投影范围为 x `[-13.93,-13.27]`、z `[-21.73,-21.07]`；两者确实相交。

## Codex 设计要求

1. 回声室、北廊接入现有地面图片，使用统一米制纹理尺度。采用低反光防滑石砖；金属度 0、clearcoat 0、弱法线约 0.12、粗糙度约 0.8–0.9。避免粗糙度贴图把最终粗糙度乘低。不全局修改材质工厂。
2. 浅池地贴完整移至干地空位，建议中心 `(-15.2,-22)`；与柱脚最少留 0.30m。保留文字、边框，避开池沿。检查其他两块深度地贴的完整旋转后投影范围。
3. 不改变地图布局、碰撞路线和怪物。

## DSH 验收要求

- 检查实际地面材质绑定的图片资产和浏览器加载状态；区分 Node 绑定检查与真实 WebGL 加载验证。
- 用标识真实世界顶点投影及实际柱脚几何检查相交，不仅比较中心点；旧坐标作为应失败的负对照。
- 自行运行相关 L12、后续关卡回归、语法检查；提供实际命令、退出码与失败日志。旧的 475 项结果不能替代本次测试。
- 使用已审查的 `tools/shots12.cjs`，独立临时浏览器配置、新建截图子目录，从用户近景角度复拍地面与完整标识。
- 最后通过 `node tools/_mkcdn.cjs` 同步在线版，并运行 `--check`。

## 交接状态与阻碍

HEAD：`38e845d19d559159c0379f4725913432f9617be7`。已有 tracked 修改为 README、本地 HTML、在线 HTML、CDN 生成工具，其他原有未跟踪文档与测试保留。

沿用 BridgeTask `dsh_4a56602700c1`、原 DSH 会话及用户指定的 DeepSeek 登录账号 DS V4.1 Flash。

`dsh_status` 和 `dsh_followup` 均在获取以下锁时超时，返修提示未成功发送：
`C:/Users/18269/.dsh/codex-bridge/ledgers/dsh_4a56602700c1/events.lock`。

恢复前，锁记录的进程 43584 在当时的进程查询中不存在。插件 `KNOWN_ISSUES.md` 的 Crash recovery 要求：手工清理前，在约定窗口停止使用同一 bridge home 的所有桥接进程，备份并核对精确目录；不能只凭旧 PID 删除锁。当时先保留锁，取得用户明确授权后再执行下述恢复。

恢复记录：用户明确批准恢复窗口后，临时暂停已识别的桥接进程，备份整个 bridge home，将上述原任务的唯一残留锁移入备份目录，随后立即恢复全部桥接进程（恢复状态均为 0）。未删除任务映射、记录或其他锁。备份目录：`C:/Users/18269/AppData/Local/Temp/dsh-task-lock-recovery-fe995d0f1a594beebd6093fc636459e7`。`dsh_status` 已恢复成功，原任务状态为 interrupted，可继续派工，模型仍为 `deepseek-account/deepseek-flash`、high。

## 最终验收

- 原任务已完成本轮返修。回声室和北廊绑定 `textures/pool-floor.png`，与大厅共用 6m 世界映射周期；局部材质粗糙度 0.86、金属度 0、法线强度 0.12，无 clearcoat 和派生粗糙度图。
- 浅池标识仅移动到 `(-15.2,-22)`，保留原朝向，与最近柱脚净距 0.320m；另外两块标识同样通过完整投影避让检查。
- Codex 已读本轮实际日志：L12 189 项、L3 101 项、L4 168 项、独立 L4 45 项，共 503 项通过。最终 L12 与语法日志分别为 `logs-echo/l12-final.log`、`logs-echo/syntax-final.log`；各命令退出码由 DSH 回传为 0。
- 真实 WebGL 4 张截图为 `shots12/shots12-wbAARr/`。已目视审查近景与广角：石纹、砖缝可见，完整地贴与柱脚分离。北侧机位看到文字倒向是拍摄方位，未因此改变标识朝向。截图为 SwiftShader 软件渲染，不能说明硬件帧率。
- 在线副本已生成，`logs-echo/cdn-check-final.log` 为最终 `CHECK-OK`，退出码 0。详细证据见 `docs/level12-acceptance.md` 第 9 节。
