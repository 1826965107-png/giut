# 第二关导视改造

2026-11-10，本轮由Codex直接实现并验证。

- 门侧牌与总导览采用瓷白哑光面板、灰蓝文字、细金属收边。中文区域名称为主要信息，英文分区编号与说明文字使用较小字号。
- 门侧牌约0.95–1.05m宽，中心约1.65m高。湿区分岔牌采用灰蓝底白字和方向箭头，宽1.30m。更衣间牌作为区域识别，淋浴与分岔牌承担方向提示。
- 水温、水深标识沿用同一配色与排版。水深标识缩为1.05×0.56m，位置按完整牌面与排水槽净距生成。水温牌的背板与面板方向一致。
- 文本绘制按实际字宽调整字号。牌面采用普通哑光材质，面板与背板相接。

| 实际命令 | 退出码 | 证据 |
|---|---|---|
| `node tools/check-level12-node.cjs` | 0 | l12-final.log，98+395+65=558项 |
| `node tools/v2/l37-props-check.cjs` | 0 | props.log，1174项 |
| `node tools/_syntax12.cjs` | 0 | syntax.log |
| `node tools/_mkcdn.cjs` | 0 | cdn.log |
| `node tools/_mkcdn.cjs --check` | 0 | cdn-check.log |
| `node tools/shots12.cjs --base=http://127.0.0.1:8555/backrooms-pool.html --only=wayfinding-` | 0 | shots-final.log，SHOTS-OK 3 |

首轮检查发现宿主已有boardTexture回调缺少makeBoardTexture导入，退出码1，报错保存在l12.log。补齐导入后总回归通过。首轮白底分岔牌在灯光下对比偏弱，调整为灰蓝底白字并重拍。

最终图片位于`shots12/shots12-XEttCY/`，已目视复核总导览、门侧牌及分岔牌。三个机位均ready=true、camBlocked=false，游戏错误为空，仅默认favicon请求404。图为隔离Edge的SwiftShader真实WebGL。既有墙牌实墙支撑、门洞避让、水深牌与排水槽净距等检查均通过。
