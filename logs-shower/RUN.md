# L37 shower repair — run log

Run at 2026-11-05 22:03 (Asia/Shanghai). Host `backrooms-pool.html`, service `http://127.0.0.1:8571/backrooms-pool.html` (project `node server.js`).

| # | Command | Result | Exit |
|---|---|---|---|
| 1 | `node tools/_syntax12.cjs` | `SYNTAX OK` | 0 |
| 2 | `node tools/v2/l37-props-check.cjs` | `pass=1174 fail=0` | 0 |
| 3 | `node tools/v2/plan-check.cjs` | `pass=168 fail=0` | 0 |
| 4 | `node tools/check-l37v2-node.cjs` | `L37-V2 NODE 回归：237 / 237 PASS` | 0 |
| 5 | `node tools/check-level12-node.cjs` | L0 84/84 + L37 237/237 + BEHAVIOR 65/65, `第一/二关统一回归：3 个套件全部通过` | 0 |
| 6 | `node tools/shots12.cjs --base=http://127.0.0.1:8571/backrooms-pool.html --only=L37-22,L37-36` | `SHOTS-OK 2` | 0 |
| 7 | `node tools/_mkcdn.cjs` | `online bytes 367154` | 0 |
| 8 | `node tools/_mkcdn.cjs --check` | `CHECK-OK online 与本地版仅 importmap 两行不同（367154 字节）` | 0 |

Total unified suite: **386** (84 + 237 + 65).

## Files written
- `logs-shower\syntax.log`, `props.log`, `plan.log`, `l37.log`, `l12-final.log`, `cdn-final.log`, `cdn-check-final.log`
- Successful screenshot logs: `shots.log` (cZfBsT, 4 OK), `shots2.log`, `shots3.log`, `shots4.log` (NoiYJ9, 2 OK). The earlier failed attempt is retained in `shots12/shots12-xFs3yw/shots-report.json` and its NOTREADY images, not in the subsequently overwritten `shots.log`.

## Failure record (kept)
- `shots12/shots12-xFs3yw/shots-report.json`: `L37-22/L37-36/L37-37` failed the readiness/camera obstruction gate; corresponding NOTREADY images remain. Moving the cameras into the corridor and using oblique/longitudinal positions resolved this; final shots `shots2/3/4.log` are OK. The failed attempt's independent process exit code was not retained in this checklist.
- All screenshot runs report `NET_ERR=1 JS_ERR=1` for the browser's default `404 /favicon.ico` only (`faviconOnly: true`, `gameErrors: []`).

## Images
- `shots12\shots12-NoiYJ9\L37-22-shower-W.png` (west row along corridor)
- `shots12\shots12-NoiYJ9\L37-36-shower-E.png` (east row, mirrored)
- `shots12\shots12-cZfBsT\L37-38-shower-inside.png` (inside stall: riser, clamps, drain strip)
- `shots12\shots12-FmGR0h\L37-39-shower-topdown.png` (`l12view=topdown` diagnostic, auxiliary light — not a lighting reference)

## Scope note
- Node side: real `vendor/three` + real `updatePlayer`/collision/raycast; renderer, canvas, audio and images are stubs. Screenshots are real WebGL but software-rasterized (SwiftShader); hardware GPU timing not measured.
- L3/L4 not re-run (their code paths untouched).
