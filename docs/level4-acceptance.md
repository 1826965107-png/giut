# 第四关：第一次回返 · 验收记录

2026-10-30。本次按用户新设想重做，范围止于第一次异变后的车内探索与资源拾取。设计见 `level4-rework-brief.md`，美术见 `level4-rework-art.md`。

## 已交付的流程

第三关乘车故障停车 → 正常车厢开中门、真实下车 → 门外拾取实体手电 → 沿黑暗检修步道持续前进 → 保持运动、朝向、眼高与步态无缝回返 → 走近发现锈蚀、错位窗框、倾斜扶手及下垂车顶的列车 → 实际进车拾备用电池与应急通行钥匙。

拿齐后继续自由探索，不触发通关，不写全流程纪录。旧值班室、电路柜、风向出口和最终门已从本关移除。钥匙的后续用途保持未定。

## 分工与实现

- DSH 完成程序主体，实际模型 `xuhe / deepseek-v4.1-flash-1017 / high`。任务 `dsh_e05fe33e0c46` 在隔离目录制作，交付后写入占用已释放，会话保留。
- Codex 制定符合新需求的范围，制作三张正式 PNG、材质工厂与轻量电量/物品界面，独立审查代码、执行测试并反馈返修，最终整合。
- DSH 的命令沙箱出现 `grantWrite / Win32 5`，未能自行运行 Node；没有批准其修改 ACL 或切换完全权限。它通过正常文件工具完成代码与测试，以下实际执行结果全部由 Codex取得。
- 制作副本、旧版备份及权限诊断仅保留在开发机，不属于仓库运行或测试依赖。

## 实际测试

| 命令 | 结果与边界 |
| --- | --- |
| `node tools/check-level4-node.cjs` | **168/168 PASS**。真实 THREE、真实模块/宿主、几何碰撞与物品状态；GPU、DOM、音频和图片解码为桩。修正了准星点积的假判断，并实际等待贴图/异步预热与检查错误反馈。 |
| `node tools/check-level4-rework-independent.cjs` | **45/45 PASS**。独立真实相机瞄准与 `tryInteract`、连续 WASD 完整流程，正逆接缝与当帧镜头起伏保留、隔墙禁止拾取、实体手电、真实网格吊板净空、资源一次性、备用电池/暂停/复位、两条真实 L3 乘车更新路径，以及正式衔接与探索零通关写档。 |
| `node tools/check-level3-node.cjs` | **101/101 PASS**。原有第三关模型、巡逻、车体扫掠、通行及矮家具视线等回归。 |
| `node tools/check-entry.cjs` | **6 项入口路由通过**；临时本机端口的冲突保护、后台启动、服务复用和页面/模块访问通过。没有停止正在使用的服务。 |
| 本地/CDN 同步 | `node tools/_mkcdn.cjs` 使用当前目录生成，本地/CDN 仅 Three importmap 不同；新模块和正式贴图一同提供。 |

实际日志：[第四关168项](verification/level4-node.txt)、[独立45项](verification/level4-independent.txt)、[第三关101项](verification/level3-regression.txt)。测试不把桩化运行称为 GPU 或人工听感验收。

## 真实画面

在真实 WebGL 中检查正式材质、黑暗步道、异变列车外观、资源近景，以及精确接缝前后机位。代表页面无控制台 error/warn。

开灯前后两张对应机位 JPEG，RGB 平均绝对差约 **0.19/255**（含动态胶片颗粒与 JPEG 差异），未见结构、纹理或眼前列车跳变。关灯机位也作对应检查。隧道两端各延长至离接缝 **48m**，避免有限壳体端部进入有效视程；近景连续性另有真实 THREE 射线与控制器验证。

代表截图保存在仓库的 `docs/images/`：

- [黑暗步道](images/level4-new-walkway-20261030.jpg)
- [异变列车](images/level4-new-aged-train-20261030.jpg)
- [车内资源](images/level4-new-battery-20261030.jpg)
- [接缝前](images/level4-seam-before-20261030.jpg) / [接缝后](images/level4-seam-after-20261030.jpg)
- [关灯接缝前](images/level4-seam-dark-before-20261030.jpg) / [关灯接缝后](images/level4-seam-dark-after-20261030.jpg)

`test-level4.html` 提供 11 个诊断机位；这些机位只用于观察预建状态，正常游玩仍须自行开门、拾手电和完成回返。

## 启动与限制

双击根目录 `启动第四关.cmd`，或运行 `node tools/launch-game.cjs --level=4`。在默认浏览器游玩；不要用 `file://` 直接打开 HTML。`E` 开门/拾取，`F` 开关手电，`R` 完整重开。满电约260秒，备用电池在耗尽时自动使用一次。

完整移动/交互的验证使用真实引擎 Node harness；内置浏览器用于 WebGL 机位检查。内置浏览器的自动点击存在指针锁限制，未据此宣称完成原生鼠标实机全程游玩。长期帧率、显存压力和音效听感未作专项测评。
