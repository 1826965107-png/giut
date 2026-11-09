# logs-final-v2 —— 本轮证据清单（命令 / 退出码 / 结果 / 日志）

所有命令均在 `D:\AI\工作文件夹\游戏` 执行，退出码取自 PowerShell `$LASTEXITCODE`。
截图脚本统一使用 `--base=http://127.0.0.1:8571/backrooms-pool.html`（本项目 `server.js`，`PORT=8571`）；下表写全 URL，不用省略号。

| # | 命令 | 退出码 | 结果 | 日志 |
|---|------|--------|------|------|
| 1 | `node tools/_syntax12.cjs` | 0 | SYNTAX OK | `syntax.log` |
| 2 | `node tools/check-level12-node.cjs` | 0 | L0 84/84 + L37 217/217 + L12-BEHAVIOR 65/65 = **366**；`第一/二关统一回归：3 个套件全部通过` | `l12.log` |
| 3 | `node tools/check-l12-behavior-node.cjs`（#2 已串行调用，另单独跑一次留证） | 0 | 65/65（含黑影眼部 THREE 射线正/负对照） | `l12b.log` |
| 4 | `node tools/check-l37v2-node.cjs`（单独跑，用于灯注册断言定位） | 0 | 217/217 | `l37.log` |
| 5 | `node tools/v2/plan-check.cjs` | 0 | pass=168 fail=0 | `plan.log` |
| 6 | `node tools/v2/l37-props-check.cjs` | 0 | pass=1118 fail=0 | `props.log` |
| 7 | `node tools/check-level3-node.cjs` | 0 | 101/101 | `l3.log` |
| 8 | `node tools/check-level4-node.cjs` | 0 | L4-NODE-TESTS-OK（168/168） | `l4.log` |
| 9 | `node tools/check-level4-rework-independent.cjs` | 0 | checks=45; failures=0 | `l4r.log` |
| 10 | `node tools/_mkcdn.cjs` | 0 | online bytes 367154 | `cdn.log` |
| 11 | `node tools/_mkcdn.cjs --check` | 0 | CHECK-OK（仅 importmap 两行不同，367154 字符） | `cdn-check.log` |
| 12 | `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L0-20,L0-21,L0-22,L0-23,L0-25,L37-20,L37-23,L37-25,L37-31` | 0 | SHOTS-OK 9 → `shots12/shots12-tGCwvb` | `shots-formal-9.log`（由 `logs-art/shots.log` 复制，同一条命令） |
| 13 | `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L37-23,L37-25` | 0 | SHOTS-OK 2 → `shots12/shots12-3lgY5v`（删旧 26 盏灯后的正式代表图） | `shots-formal-l37.log` |
| 14 | `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L0-32,L37-35` | 0 | SHOTS-OK 2 → `shots12/shots12-Fyaxy2`（含 `l12diagLight` 的两张头脸诊断近景） | `shots-head-last.log` |
| 15 | `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L0-32` | 0 | SHOTS-OK 1 → `shots12/shots12-WkJDsg`（射线验证眼位后的最终黑影头脸） | `shots-eyes.log` |

**关于"无游戏异常"**：上表第 12–15 行最终通过的截图里，浏览器只记录了默认的 `404 /favicon.ico`（`faviconOnly: true`、`gameErrors: []`），没有贴图/模块 404、没有游戏 JS 异常。这条结论**只覆盖上表四条命令的最终通过结果**，不覆盖下面的失败取证。

## 保留的失败取证（均由后续修复/重拍解决）

| 现象 | 目录 | 当时状态 | 现在 |
|---|---|---|---|
| `ERR_CONNECTION_REFUSED` | `shots12/shots12-Hmqx7q` | 8571 服务未启动，四张机位各空等 75s 后 FAIL；退出码未单独留存（同一批命令后续成功，旧日志已不再保留） | 之后每次先 `Invoke-WebRequest` 确认 `SERVER=200` 再拍 |
| `ReferenceError: eyeGap is not defined` | `shots12/shots12-IjQAXS` | 截图脚本当时会命中页面 JS 报错；未记录独立退出码 | 已修 `eyeGap` 定义顺序，并给脚本加 `FATAL_JS` 立即失败（不再空等 75s） |
| `camBlocked=true` / `*-NOTREADY` | `shots12/shots12-pO9lLi` 的 `L0-31`、`shots12/shots12-FnpGbZ` 的 `L37-35` | 就绪门控判定机位受阻，保留 NOTREADY 图片及报告；独立退出码未在此清单留存 | 调整机位后重拍；头脸最终以 `Fyaxy2`、`WkJDsg` 为准，诊断补光与正式场景图分列 |

## 旧灯复活回归的说明

- 根因：清理时删掉了 `l37Lamp` 里的 `L12_OLD_LAMPS` 早退守卫，而 host 1722–1739 的旧三池 26 盏调用仍在 → 全部复活并叠加新灯（诊断 `lights=93`）。
- 修复：整段删除那 18 行旧调用（main 8 / entry 2 / locker 4 / echo 3 / corridor 3 / train 4 / equip 2），保留通用 `l37Lamp` 与既有的 **2 盏水面填光**；删除未调用的 `l37DrainGrid`。
- 断言：水面填光恰好 2 盏且 `zone==='pool'`；房间灯全部落在 plan 房间内且无一落在池水面上 1.2m 内；每盏有灯盘与正光强；**负对照只抽查旧 16 个坐标**（`_l37v2-tests.js` 的 `oldSpots` 是 16 项，不是全部 26 点）——旧 26 行调用本身已整段删除，因此"预算回到 66"与"抽查 16 点不复现"是两件事，不能互相替代。

## 其它口径

- `calls=1` 是 `renderer.info.render.calls` 在最后一次 `composer.render` 后的值，不是整帧全部 pass 的绘制调用数；`geos/tex/progs` 是常驻计数。
- 本目录只收本轮日志；2026-11-01 起的旧 budget/回归日志留在 `logs-final`、`logs-art`、`logs-v2`、`logs-l37`、`logs-echo` 等目录，未混入。
- 未执行：硬件 GPU 帧率/GPU 时间、音频听感、真实硬件 Bloom 观感；Node 侧渲染器为桩（真实 vendor THREE + 真实游戏逻辑），画面证据来自本机 Edge 无头 + SwiftShader WebGL。
