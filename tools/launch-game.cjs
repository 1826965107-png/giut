'use strict';

// 只依赖 Node.js 内置库。--no-open 可用于检查服务而不打开浏览器。
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const GAME_FILE = path.join(ROOT, 'backrooms-pool.html');
const SERVER_FILE = path.join(ROOT, 'server.js');
const GAME_ROUTE = '/backrooms-pool.html';
const DEFAULT_PORT = 8555;
const STARTUP_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function validateOptions(options = {}) {
  const port = options.port === undefined ? DEFAULT_PORT : Number(options.port);
  const level = options.level === undefined ? 0 : Number(options.level);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('端口必须是 1024 到 65535 之间的整数，例如 --port=8556。');
  }
  if (level !== 0 && level !== 3 && level !== 4) {
    throw new Error('关卡参数只支持 --level=0、--level=3 或 --level=4。');
  }
  return { port, level, noOpen: options.noOpen === true };
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg === '--no-open') options.noOpen = true;
    else if (/^--level=(0|3|4)$/.test(arg)) options.level = Number(arg.slice(8));
    else if (/^--port=\d{1,5}$/.test(arg)) options.port = Number(arg.slice(7));
    else throw new Error(`无法识别启动参数：${arg}\n可用参数：--level=0、--level=3、--level=4、--no-open、--port=8556。`);
  }
  return validateOptions(options);
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

// 返回 match / unavailable / conflict，不会停止占用端口的进程。
function inspectServer(port, expectedHash, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (error) reject(error); else resolve(result);
    };
    const request = http.get({
      hostname: '127.0.0.1', port, path: GAME_ROUTE,
      headers: { 'Cache-Control': 'no-cache', Connection: 'close' },
      agent: false,
    }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        finish(null, { state: 'conflict', reason: `HTTP ${response.statusCode}` });
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          finish(null, { state: 'conflict', reason: '返回内容不是当前游戏' });
          response.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => finish(null, {
        state: sha256(Buffer.concat(chunks)) === expectedHash ? 'match' : 'conflict',
        reason: '返回内容与当前工作区的游戏不一致',
      }));
      response.on('aborted', () => finish(new Error('游戏服务提前中断了连接，请重新启动。')));
      response.on('error', error => finish(new Error(`读取游戏页面失败：${error.message}`)));
    });
    const deadline = setTimeout(() => {
      finish(new Error(`端口 ${port} 未及时响应，可能被其他服务占用。可使用 --port=${port < 65535 ? port + 1 : DEFAULT_PORT} 重试。`));
      request.destroy();
    }, timeoutMs);
    request.once('close', () => clearTimeout(deadline));
    request.on('error', error => {
      if (error.code === 'ECONNREFUSED') finish(null, { state: 'unavailable' });
      else finish(new Error(`无法访问本地游戏服务：${error.message}`));
    });
  });
}

function portConflict(port, reason) {
  return new Error(`端口 ${port} 已被其他服务占用（${reason}），未停止该服务。请使用 --port=${port < 65535 ? port + 1 : DEFAULT_PORT} 启动游戏。`);
}

function startDetachedServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_FILE], {
      cwd: ROOT,
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    });
    child.once('error', error => reject(new Error(`无法启动游戏服务：${error.message}`)));
    child.once('spawn', () => { child.unref(); resolve(child.pid); });
  });
}

function openBrowser(url) {
  const windows = process.platform === 'win32';
  const command = windows ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  // URL 仅由固定的本机地址、校验后的整数端口和关卡参数组成。
  const args = windows ? ['/d', '/s', '/c', `start "" "${url}"`] : [url];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      windowsHide: true,
      windowsVerbatimArguments: windows,
      stdio: 'ignore',
    });
    child.once('error', error => reject(new Error(`服务已就绪，但无法自动打开浏览器：${error.message}\n请手动打开：${url}`)));
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

async function launchGame(options = {}) {
  const { port, level, noOpen } = validateOptions(options);
  const expectedHash = sha256(fs.readFileSync(GAME_FILE));
  if (!fs.existsSync(SERVER_FILE)) throw new Error('缺少 server.js，请从完整的游戏文件夹启动。');
  const initial = await inspectServer(port, expectedHash);
  if (initial.state === 'conflict') throw portConflict(port, initial.reason);
  const started = initial.state !== 'match';
  let serverPid;
  if (started) {
    serverPid = await startDetachedServer(port);
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    let ready = false;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const status = await inspectServer(port, expectedHash);
      if (status.state === 'match') { ready = true; break; }
      if (status.state === 'conflict') throw portConflict(port, status.reason);
    }
    if (!ready) throw new Error('游戏服务在 10 秒内未能启动，请在游戏文件夹运行 node server.js 查看原因。');
  }
  const url = `http://127.0.0.1:${port}${GAME_ROUTE}${level === 3 ? '?level=3' : level === 4 ? '?level=4' : ''}`;
  if (!noOpen) await openBrowser(url);
  return { url, port, level, started, serverPid };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await launchGame(options);
  console.log(result.started ? '游戏服务已启动。' : '已连接到当前游戏服务。');
  console.log(`游戏地址：${result.url}`);
  if (!options.noOpen) console.log('已请求浏览器打开游戏。');
  return result;
}

if (require.main === module) {
  main().catch(error => {
    console.error(`启动失败：${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, validateOptions, inspectServer, launchGame, main };
