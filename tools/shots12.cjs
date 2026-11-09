// 真实浏览器 WebGL 截图（第一关 / 第二关）。
// 用 Edge 无头模式 + CDP（Node 24 原生 WebSocket），不写档、不改游戏逻辑，
// 只通过既有诊断入口 ?level=37 / ?cam= / ?diag=1 / ?l12view= 摆机位。
//
// 隔离约定（避免碰到别人的浏览器/标签）：
//  - 浏览器用 --remote-debugging-port=0 + 本次 mkdtemp 出来的独立 profile，
//    端口从该 profile 目录里的 DevToolsActivePort 读取 —— 只连接**自己启动的这个实例**；
//    不探测、不复用 9333 之类固定端口（固定端口上若有别人的 CDP 浏览器会被误接管）。
//  - 连上后用 Target.createTarget 新建**自己的**标签页，再 Target.attachToTarget(flatten) 只驱动它；
//    全程不列别人的 target、不导航别人的标签。
//  - 结束只关闭自己的 target 与自己启动的浏览器进程；从不删除任何既有目录/文件/用户资料。
//    输出目录与 profile 都用 mkdtemp 新建，结束后保留供取证。
//  - 不传任何关闭浏览器安全隔离的 flag（无 --no-sandbox / --disable-web-security）。
//
// 用法：node tools/shots12.cjs [--base=http://127.0.0.1:8571/backrooms-pool.html] [--out=<已存在目录>]
//       --out 只是"父目录"，脚本会在下面新建 shots12-<随机> 子目录并打印其绝对路径。
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function arg(name, dflt) {
  const hit = process.argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : dflt;
}
const BASE = arg('base', 'http://127.0.0.1:8571/backrooms-pool.html');
const OUT_PARENT = arg('out', path.join(__dirname, '..', 'shots12'));

const SHOTS = [
  { name: 'fix-shower-light', q: 'level=37&cam=-24,1.62,5.25,-1.01,0.80' },
  { name: 'fix-archive-door', q: 'cam=-125.6,1.62,0,3.14159,-0.04' },
  { name: 'fix-archive-room', q: 'cam=-125.6,1.62,2.8,3.14159,-0.04' },
  { name: 'fix-locker-sign', q: 'level=37&cam=-8.4,1.62,14.0,-1.5708,0.08' },
  { name: 'fix-bench-legs', q: 'level=37&cam=-21.5,0.95,11,-1.5708,-0.13' },
  // 第一关（Level 0 后室）
  { name: 'L0-01-spawn', q: 'cam=-144,1.62,0,-1.5708,0' },
  { name: 'L0-02-vestibule', q: 'cam=-124.2,1.62,1.6,-1.5708,0' },
  // 斜向看档案柜列与西门洞（正拍只会是一面空墙）。机位放在错开短墙(z=-16)以北、
  // 由柜列中心 (-126.3,-21.4) 反算 yaw=atan2(-dx,-dz)=1.231，确保镜头里是柜列不是隔墙背面。
  { name: 'L0-03-archive-loop', q: 'cam=-118,1.62,-18.5,1.231,-0.03' },
  { name: 'L0-04-entity-close', q: 'cam=-135.6,1.62,0.4,-1.5708,0&l12view=entity' },
  { name: 'L0-05-entity-front', q: 'cam=-133.6,1.55,0.4,-1.5708,-0.02&l12view=entity' },
  { name: 'L0-06-entity-side', q: 'cam=-131.6,1.58,3.2,0,-0.02&l12view=entity' },
  // 本轮返修取证：插座贴面（正拍墙面）、门洞收口（正面/背面/仰角）、地面质感、配电区管线与吊杆
  { name: 'L0-07-socket-wall', q: 'cam=-136,1.35,-3.6,0,-0.1' },
  { name: 'L0-08-door-gap', q: 'cam=-140.5,1.6,-2.6,0,0.02' },
  { name: 'L0-09-lintel-lowangle', q: 'cam=-129.5,0.6,2.7,-1.5708,0.26' },
  { name: 'L0-10-lintel-back', q: 'cam=-124.6,1.5,2.7,1.5708,0.06' },
  { name: 'L0-11-floor', q: 'cam=-118,1.3,1.2,0,-0.5' },
  { name: 'L0-12-switchgear', q: 'cam=-88,1.55,-18.2,0,0.14' },
  // 用户截图 2 最可能的现场：走廊北墙 x≈-128.5 的门洞（旧通风口盲布 x=-128 正好落在这个 gap 里）。
  // 方柱在 (-128,-3.2)，正拍会被它挡住，所以从西侧斜看，让完整门楣与门旁墙段一起入画。
  { name: 'L0-13-north-door-x128', q: 'cam=-132,1.5,-1.2,-0.79,0.06' },
  // ---- L0 v2（42×24 紧凑后勤层）新坐标：出生 / 档案 / 配电 / 俯视 ----
  { name: 'L0-20-spawn-v2', q: 'cam=-147,1.62,0,0,0' },
  { name: 'L0-21-archive-v2', q: 'cam=-120.6,1.55,5.4,1.5708,-0.06' },
  { name: 'L0-22-switchgear-v2', q: 'cam=-120.4,1.5,-6.2,0.97,0.06' },
  { name: 'L0-23-topdown-v2', q: 'cam=-129,22,0,0,-1.5707&l12view=topdown' },
  { name: 'L0-24-service-vest-v2', q: 'cam=-114.5,1.6,-5.0,-1.5708,0' },
    { name: 'L0-25-linen-loop', q: 'cam=-121.6,1.58,6.9,1.5708,-0.03' },
    { name: 'L0-30-entity-face', q: 'cam=-134.2,1.58,0.4,-1.5708,-0.02&l12view=entity' },
    { name: 'L0-31-entity-34', q: 'cam=-133.6,1.62,1.0,-1.28,-0.08&l12view=entity' },
    { name: 'L0-32-entity-head', q: 'cam=-132.7,2.02,0.44,-1.5708,0&l12view=entity-head' },
    { name: 'L37-32-drowned-stand-close', q: 'level=37&cam=17.6,1.30,-14.0,1.5708,-0.26&l12view=drowned-stand' },
    { name: 'L37-33-drowned-swim-close', q: 'level=37&cam=17.2,0.45,-14.0,1.5708,-0.20&l12view=drowned-swim' },
    { name: 'L37-31-lobby-spawn', q: 'level=37&cam=0,1.62,22.5,0.62,-0.05' },
    { name: 'L37-34-pool-coping', q: 'level=37&cam=5.7,1.30,-12,-1.5708,-0.70' },
    { name: 'L37-35-drowned-head', q: 'level=37&cam=9.95,0.1,-12,1.5708,0&l12view=drowned-head' },
  // 第二关（Level 37 泳池层）
  { name: 'L37-01-entry', q: 'level=37&cam=3,1.62,20.5,0,-0.06' },
  { name: 'L37-02-mainpool', q: 'level=37&cam=0,1.62,10.2,0,-0.12' },
  { name: 'L37-03-echo-room', q: 'level=37&cam=-8,1.45,-17.6,0,-0.1' },
  // 柜岛之间的中央通道（x≈-19），同时看到柜列、长凳与西侧淋浴隔间
  { name: 'L37-04-locker-shower', q: 'level=37&cam=-19,1.62,12,0,-0.05' },
  { name: 'L37-05-train-hall', q: 'level=37&cam=13.2,1.62,0.5,-1.5708,-0.04' },
  // 水上全景（看清它与水面/池壁的位置关系）
  { name: 'L37-06-drowned-stand', q: 'level=37&cam=16.6,1.42,-14.0,1.5708,-0.06&l12view=drowned-stand' },
  { name: 'L37-07-drowned-swim', q: 'level=37&cam=16.6,1.16,-14.0,1.5708,-0.16&l12view=drowned-swim' },
  // 水下近景：相机在水面以下看头/胸，用于审查面部、湿发与肢体连续性
  { name: 'L37-08-drowned-under-stand', q: 'level=37&cam=15.7,-0.95,-14.0,1.5708,0.10&l12view=drowned-stand' },
  { name: 'L37-09-drowned-under-swim', q: 'level=37&cam=15.5,-0.72,-13.2,0.9,0.03&l12view=drowned-swim' },
  // 本轮返修取证：入口前厅门洞收口、设备间观察窗（窗下/窗上要有实墙）
  { name: 'L37-10-vestibule-door', q: 'level=37&cam=1,1.55,16.6,-0.62,0.06' },
  { name: 'L37-11-equip-window', q: 'level=37&cam=21.5,1.7,-10.5,-1.5708,0.02' },
  // 回声池地面与池深标识：贴近用户截图视角（水池在右上、柱脚居右、地贴居左下）
  // 相机 (-17.0,1.5,-23.0) 看向 (-14.4,0,-21.0)：yaw=atan2(-dx,-dz)=-2.2265，pitch=-atan(1.5/3.28)=-0.4291
  { name: 'L37-12-echo-floor-sign', q: 'level=37&cam=-17,1.5,-23,-2.2265,-0.4291' },
  // 稍微拉远、抬高一点，同时看到整块地贴、柱脚、浅池沿与地面砖缝
  { name: 'L37-13-echo-floor-wide', q: 'level=37&cam=-17.6,1.62,-24.6,-2.2426,-0.33' },
  // 北廊地面（同一材质，检查与回声室接缝处的尺度/相位）
  { name: 'L37-14-north-corridor', q: 'level=37&cam=4,1.6,-22,-1.5708,-0.18' },
  // v2 温泉会所：按新平面坐标取景（旧 L37-02 落在 svc 布草间，不再使用）
  { name: 'L37-20-lobby-guide', q: 'cam=2.4,1.62,23.4,0.733,-0.05' },
  { name: 'L37-21-shoe-lockW', q: 'level=37&cam=-8.6,1.62,13.2,1.35,-0.04' },
  { name: 'L37-22-shower-W', q: 'level=37&cam=-26.5,1.58,5.62,-1.05,-0.05' },
    { name: 'L37-36-shower-E', q: 'level=37&cam=26.5,1.58,5.62,1.05,-0.05' },
    { name: 'L37-37-shower-corridor', q: 'level=37&cam=-20.2,1.52,5.42,0.82,-0.08' },
    { name: 'L37-38-shower-inside', q: 'level=37&cam=-24.1,1.52,3.55,0.10,-0.06' },
    { name: 'L37-39-shower-topdown', q: 'level=37&cam=-17,12,4,0,-1.5707&l12view=topdown' },
  { name: 'L37-23-pool-hall', q: 'level=37&cam=13,1.62,1.6,0,-0.07' },
  { name: 'L37-24-pool-poolside', q: 'level=37&cam=20,1.62,-8,1.5708,-0.06' },
  { name: 'L37-25-hot-spring', q: 'level=37&cam=-20,1.62,-12.4,0.35,-0.10' },
  { name: 'L37-26-quiet-cold', q: 'level=37&cam=-13.4,1.62,-19.4,-1.15,-0.12' },
  { name: 'L37-27-sauna', q: 'level=37&cam=-21.4,1.55,-8.0,1.5708,-0.03' },
  { name: 'L37-28-rest-link', q: 'level=37&cam=0,1.62,-29.4,1.5708,-0.03' },
  { name: 'L37-29-deck-sign-close', q: 'level=37&cam=6.9,1.42,-9.9,0,-0.62' },
  { name: 'L37-30-temp-sign-hot', q: 'level=37&cam=-24.2,1.5,-18.6,1.15,-0.12' }
];

// --only=L0-04,drowned 只重拍匹配到的机位（子串匹配，逗号分隔），节省重复编译
const ONLY = (arg('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const RUN = ONLY.length ? SHOTS.filter(s => ONLY.some(o => s.name.includes(o))) : SHOTS;

const sleep = ms => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(ws, sessionId = null) {
    this.ws = ws; this.sessionId = sessionId; this.id = 0;
    this.pending = new Map(); this.events = [];
    ws.addEventListener('message', ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
      } else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}, timeoutMs = 30000) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (this.sessionId) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP 超时：' + method)); }, timeoutMs);
      this.pending.set(id, {
        resolve: v => { clearTimeout(timer); resolve(v); },
        reject: e => { clearTimeout(timer); reject(e); }
      });
      try { this.ws.send(JSON.stringify(payload)); }
      catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
}

async function readActivePort(profileDir, deadline, child) {
  const f = path.join(profileDir, 'DevToolsActivePort');
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return { err: '浏览器进程已退出 exited=' + child.exitCode };
    try {
      const txt = fs.readFileSync(f, 'utf8').trim();
      const lines = txt.split(/\r?\n/);
      const port = Number(lines[0]);
      if (port > 0) return { port, wsPath: lines[1] || '' };
    } catch { }
    await sleep(300);
  }
  return { err: '等待 DevToolsActivePort 超时' };
}

async function main() {
  if (!fs.existsSync(OUT_PARENT)) throw new Error('输出父目录不存在：' + OUT_PARENT);
  const OUT = fs.mkdtempSync(path.join(OUT_PARENT, 'shots12-'));       // 本次唯一输出目录
  const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-l12-prof-')); // 本次唯一 profile
  console.log('SHOT_DIR ' + OUT);
  console.log('PROFILE_DIR ' + PROFILE);

  const child = spawn(EDGE, [
    '--headless=new', '--hide-scrollbars', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',   // 无 GPU 时的软件 WebGL 回退，与安全隔离无关
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=0',                                 // 端口交给浏览器自选，从本 profile 的 DevToolsActivePort 读
    '--window-size=1600,900',
    'about:blank'
  ], { stdio: 'ignore', windowsHide: true });
  let exited = null;
  child.on('exit', c => { exited = c; });

  const finish = async (code) => {
    try { if (child.exitCode === null) child.kill(); } catch { }
    await sleep(300);
    process.exit(code);
  };

  const ap = await readActivePort(PROFILE, Date.now() + 60000, child);
  if (ap.err) { console.error('SHOTS-FAIL ' + ap.err); return finish(1); }
  if (child.exitCode !== null) { console.error('SHOTS-FAIL 连接前浏览器已退出 exited=' + child.exitCode); return finish(1); }
  console.log('browser pid=' + child.pid + ' port=' + ap.port);

  const browserUrl = 'ws://127.0.0.1:' + ap.port + (ap.wsPath || '');
  const ws = new WebSocket(browserUrl);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('WebSocket 连接超时：' + browserUrl)), 15000);
    ws.addEventListener('open', () => { clearTimeout(t); res(); });
    ws.addEventListener('error', e => { clearTimeout(t); rej(e); });
  });

  const cdpBrowser = new CDP(ws);        // 浏览器级（只用于建/关自己的 target）
  const tgt = await cdpBrowser.send('Target.createTarget', { url: 'about:blank', newWindow: false, background: false }, 15000);
  const targetId = tgt.targetId;
  const att = await cdpBrowser.send('Target.attachToTarget', { targetId, flatten: true }, 15000);
  const cdp = new CDP(ws, att.sessionId);   // 页面级（flatten 会话），只驱动自己新建的这个标签

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  // 等"确实画出来了"：标题里的 diag JSON 报 ready=true、有真实绘制调用、屏幕亮度不是纯黑。
  // 超时即判失败（不把黑帧/错误页当成功）。
  async function waitReady(deadlineMs) {
    const FATAL_JS = /ReferenceError|TypeError|SyntaxError|is not defined|Cannot read propert/;
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < deadlineMs) {
      try {
        const r = await cdp.send('Runtime.evaluate', {
          returnByValue: true, expression: 'document.title'
        }, 8000);
        const title = String(r.result.value || '');
        if (title.startsWith('{')) {
          try {
            const j = JSON.parse(title);
            last = j;
            if (j.ready === true && j.budget && j.budget.calls > 0 && j.lumMax > 0.02 && j.camBlocked === false) return { ok: true, diag: j, waited: Date.now() - t0 };
          } catch { }
        }
      } catch { }
      await sleep(400);
    }
    return { ok: false, diag: last, waited: Date.now() - t0 };
  }

  const report = [];
  let bad = 0;
  for (const shot of RUN) {
    const url = BASE + '?' + shot.q + '&diag=1';
    const mark = cdp.events.length;
    await cdp.send('Page.navigate', { url }, 20000);

    const rd = await waitReady(shot.readyTimeout || 75000);
    if (!rd.ok) await sleep(1500);   // 给最后一次机会：稍后再确认一次

    let probe = null;
    try {
      const r = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(()=>{const c=document.querySelector('canvas');let gl=null;try{gl=c&&(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){}
        const dbg=gl&&gl.getExtension('WEBGL_debug_renderer_info');
        return JSON.stringify({title:document.title.slice(0,1600),gl:gl?gl.getParameter(gl.VERSION):'none',
          ren:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):(gl?gl.getParameter(gl.RENDERER):'none'),
          w:c?c.width:0,h:c?c.height:0});})()`
      }, 15000);
      probe = JSON.parse(r.result.value);
    } catch (e) { probe = { err: String((e && e.message) || e) }; }

    let diag = null;
    try { if (probe && probe.title && probe.title.startsWith('{')) diag = JSON.parse(probe.title); } catch { }
    const readyNow = !!(diag && diag.ready === true && diag.budget && diag.budget.calls > 0 && diag.lumMax > 0.02 && diag.camBlocked === false);

    const errs = cdp.events.slice(mark).filter(m =>
      (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') ||
      m.method === 'Runtime.exceptionThrown' ||
      (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
    ).map(m => {
      if (m.method === 'Log.entryAdded') return m.params.entry.text;
      if (m.method === 'Runtime.exceptionThrown') return (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text;
      return (m.params.args || []).map(a => a.value || a.description || a.type).join(' ');
    });

    // 资源侧证据：4xx/5xx 与加载失败（贴图/模块缺失会在这里现形）
    const netErrs = [];
    const netUrls = [];
    for (const m of cdp.events.slice(mark)) {
      if (m.method === 'Network.responseReceived') {
        const rr = m.params.response;
        if (rr.status >= 400) { netErrs.push(rr.status + ' ' + rr.url); netUrls.push(rr.url); }
      } else if (m.method === 'Network.loadingFailed') {
        netErrs.push('LOADFAIL ' + (m.params.errorText || '') + ' ' + (m.params.type || ''));
        netUrls.push('');
      }
    }
    // favicon.ico 是浏览器自动请求、与游戏无关；只有"全部 4xx 都只来自 favicon"时才豁免，
    // 贴图/模块 404 依旧算失败。控制台里那条 "Failed to load resource" 同源豁免。
    const faviconOnly = netErrs.length > 0
      && netUrls.every(u => /\/favicon\.ico$/.test(u || ''))
      && netErrs.every(e => /favicon\.ico/.test(e));
    const gameErrs = errs.filter(t => !(faviconOnly && /Failed to load resource/i.test(t)));

    const pngPath = path.join(OUT, shot.name + (readyNow ? '' : '-NOTREADY') + '.png');
    let bytes = 0, shotErr = null;
    try {
      const img = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 30000);
      const buf = Buffer.from(img.data, 'base64');
      fs.writeFileSync(pngPath, buf);
      bytes = buf.length;
    } catch (e) { shotErr = String((e && e.message) || e); }

    // 游戏自身 JS 异常、真实资源 4xx 都算失败；仅 favicon.ico 404 豁免（在报告里单列）
    const failed = !readyNow || !bytes || !!shotErr || (netErrs.length > 0 && !faviconOnly) || gameErrs.length > 0;
    if (failed) bad++;
    report.push({
      name: shot.name, url, png: pngPath, bytes, ok: !failed,
      ready: readyNow, camBlocked: diag ? diag.camBlocked : null,
      waited: rd.waited, diag, probe, errors: errs.slice(0, 8), gameErrors: gameErrs.slice(0, 8),
      netErrors: netErrs.slice(0, 8), faviconOnly, shotErr
    });
    console.log('shot ' + shot.name + ' ' + (failed ? 'FAIL' : 'OK') + ' bytes=' + bytes + ' ready=' + readyNow + ' camBlocked=' + (diag ? diag.camBlocked : '?') + ' waited=' + rd.waited + 'ms'
      + (diag ? ' frames=' + diag.frames + ' lum=' + diag.lum + '/' + diag.lumMax + ' calls=' + (diag.budget ? diag.budget.calls : '?') : '')
      + (netErrs.length ? ' NET_ERR=' + netErrs.length : '') + (errs.length ? ' JS_ERR=' + errs.length : '') + (shotErr ? ' SHOT_ERR=' + shotErr : ''));
    if (diag) console.log('   diag ' + JSON.stringify({ lv: diag.lv, p: diag.p, cam: diag.cam, ray: diag.ray, budget: diag.budget }));
    for (const e of netErrs.slice(0, 4)) console.log('   NET ' + e.slice(0, 260));
    for (const e of errs.slice(0, 4)) console.log('   ERR ' + e.slice(0, 260));
  }

  const reportPath = path.join(OUT, 'shots-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ base: BASE, when: new Date().toISOString(), browserPid: child.pid, cdpPort: ap.port, shots: report }, null, 2), 'utf8');
  console.log('SHOT_REPORT ' + reportPath);

  // 有界关闭：先关自己建的 target，再请自己的浏览器退出；都带超时，最后才关 socket。
  try { await cdpBrowser.send('Target.closeTarget', { targetId }, 5000); } catch { }
  try { await cdpBrowser.send('Browser.close', {}, 5000); } catch { }
  for (let i = 0; i < 20 && child.exitCode === null; i++) await sleep(250);
  try { if (child.exitCode === null) child.kill(); } catch { }
  await sleep(200);
  try { ws.close(); } catch { }

  if (bad) { console.log('SHOTS-DONE-WITH-ISSUES ' + bad); return finish(2); }
  console.log('SHOTS-OK ' + RUN.length);
  return finish(0);
}

main().catch(e => { console.error('SHOTS-FAIL ' + ((e && e.stack) || e)); process.exit(1); });
