# 吸顶圆灯返修

2026-11-07，Codex直接修复并验证。

淋浴灯旧高度2.35m与房间4.4m吊顶不一致。房间圆灯现在统一通过已有roomHeight函数取得本房间净高，光源放在吊顶下0.16m，圆形灯壳顶部接触吊顶底面。桑拿、设备间按各自局部净高生成。发光面与灯壳底面错开4mm，消除共面闪烁。

| 命令 | 退出码 | 记录 |
|---|---|---|
| `node tools/check-level12-node.cjs` | 0 | l12-final.log，98+385+65=548项 |
| `node tools/v2/l37-props-check.cjs` | 0 | props.log，1174项 |
| `node tools/_syntax12.cjs` | 0 | syntax.log |
| `node tools/_mkcdn.cjs` | 0 | cdn.log |
| `node tools/_mkcdn.cjs --check` | 0 | cdn-check.log |
| `node tools/shots12.cjs --base=http://127.0.0.1:8555/backrooms-pool.html --only=fix-shower-light` | 0 | shots-final.log，SHOTS-OK 1 |

新增检查对27盏房间圆灯逐一验证真实灯壳包围盒接顶、发光面与灯壳间距及光源高度。正式场景光源总数仍为66。截图目录为`shots12/shots12-wydRBB`，已目视检查，来源为隔离Edge的SwiftShader真实WebGL，仅favicon默认请求404。

首轮画面DOLc1M暴露了灯壳底面与发光面共面的问题，修正4mm间距后重拍通过。本轮只读服务探测在默认沙箱中出现EACCES，随后获准的隔离浏览器成功访问8555服务。未提交或推送。
