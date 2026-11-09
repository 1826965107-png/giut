# 门口、墙牌与长凳修复

2026-11-07，由Codex按用户本轮授权直接实现及验证。

- 档案柜由10组改为6组，两侧布置，南门正前方形成连续主通道。第一关所有门两侧1.5m进出区域均通过家具碰撞检查。
- 校正9块方向牌的位置与朝向，背板整体落在实墙外表面，牌面跨度避开门洞。
- 长凳支腿按长边两端布置，支腿接地、顶端接触座板，适用于横向和纵向长凳。

| 实际命令 | 退出码 | 证据 |
|---|---|---|
| `node tools/check-level12-node.cjs` | 0 | l12.log，98 + 304 + 65 = 467项 |
| `node tools/v2/l37-props-check.cjs` | 0 | props-final.log，1174项 |
| `node tools/_syntax12.cjs` | 0 | syntax.log |
| `node tools/_mkcdn.cjs` | 0 | cdn.log |
| `node tools/_mkcdn.cjs --check` | 0 | cdn-check.log |
| `node tools/shots12.cjs --base=http://127.0.0.1:8555/backrooms-pool.html --only=fix-` | 0 | shots.log，SHOTS-OK 4 |

首次props检查退出1，原因是记录型测试桩的addBox未返回对象，无法记录凳腿的userData。已补齐桩接口并重跑通过。真实THREE总入口在修改测试桩前已通过。

截图目录为`shots12/shots12-78oVQn`。已目视复核`fix-archive-room.png`、`fix-locker-sign.png`、`fix-bench-legs.png`。首张`fix-archive-door.png`当时朝向维修配电区，不能作为档案门证据，脚本的该机位已校正。图片来自隔离Edge的SwiftShader真实WebGL，游戏异常为零，仅默认favicon请求404。

本轮保留既有第三、四关验证记录。未提交或推送。
