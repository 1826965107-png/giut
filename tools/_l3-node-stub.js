/* ===================== Node 回归桩 =====================
   只替换：WebGL 渲染器 / 2D 画布 / 音频 / 图片解码 / DOM UI / 随机动画帧。
   几何构建、碰撞表、AI、材质参数全部走真实代码。
   ====================================================== */
const __noop = () => {};
const __style = () => new Proxy({ setProperty: __noop, removeProperty: __noop, getPropertyValue: () => '', cssText: '' },
  { get: (t, k) => (k in t ? t[k] : ''), set: (t, k, v) => (t[k] = v, true) });
// 通用 uniform 值：既能当数字用（valueOf→0），也支持 .set/.copy
function __uobj() {
  const o = {
    x: 0, y: 0, z: 0, w: 0, width: 1, height: 1,
    set() { return this; }, copy() { return this; }, equals() { return true; },
    toArray() { return [0, 0]; }, clone() { return __uobj(); },
    valueOf() { return 0; }, toString() { return '0'; },
  };
  return o;
}
const __fakeImg = (url) => {
  // 项目里所有贴图都是 1024²（已核对 uniform-wool.png / dead-skin.png 头信息）。
  const img = {
    width: 1024, height: 1024, naturalWidth: 1024, naturalHeight: 1024,
    src: String(url), complete: true, crossOrigin: '', decoding: 'sync',
    addEventListener: __noop, removeEventListener: __noop, decode: () => Promise.resolve(),
  };
  return img;
};
const __mkCtx2D = () => {
  const grad = { addColorStop: __noop };
  const ctx = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic', direction: 'ltr',
    globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none',
    shadowBlur: 0, shadowColor: '#000', shadowOffsetX: 0, shadowOffsetY: 0,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'low', letterSpacing: '0px', wordSpacing: '0px',
    save: __noop, restore: __noop, translate: __noop, rotate: __noop, scale: __noop,
    transform: __noop, setTransform: __noop, resetTransform: __noop,
    beginPath: __noop, closePath: __noop, moveTo: __noop, lineTo: __noop, arc: __noop, arcTo: __noop,
    ellipse: __noop, rect: __noop, roundRect: __noop, quadraticCurveTo: __noop, bezierCurveTo: __noop,
    fill: __noop, stroke: __noop, clip: __noop, fillRect: __noop, strokeRect: __noop, clearRect: __noop,
    fillText: __noop, strokeText: __noop, drawImage: __noop, setLineDash: __noop,
    getLineDash: () => [], isPointInPath: () => false, isPointInStroke: () => false,
    measureText: (t) => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad,
    createPattern: () => ({ setTransform: __noop }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    putImageData: __noop,
  };
  return ctx;
};
const __mkCanvas = (w = 1280, h = 720) => {
  const c = {
    width: w, height: h, style: __style(), dataset: {}, nodeName: 'CANVAS', tagName: 'CANVAS',
    addEventListener: __noop, removeEventListener: __noop, dispatchEvent: __noop,
    appendChild: __noop, removeChild: __noop, remove: __noop, setAttribute: __noop, getAttribute: () => null,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h }),
    toDataURL: () => 'data:image/png;base64,', requestPointerLock: __noop, focus: __noop, blur: __noop,
    classList: { add: __noop, remove: __noop, toggle: __noop, contains: () => false },
  };
  c.getContext = () => { const ctx = __mkCtx2D(); ctx.canvas = c; return ctx; };
  c.transferToImageBitmap = () => ({});
  return c;
};
const __mkEl = (id) => {
  const e = {
    id, nodeName: 'DIV', tagName: 'DIV', style: __style(), dataset: {}, children: [], childNodes: [],
    textContent: '', innerHTML: '', innerText: '', value: '', checked: false, disabled: false, hidden: false,
    width: 1280, height: 720, offsetWidth: 1280, offsetHeight: 720, offsetLeft: 0, offsetTop: 0,
    clientWidth: 1280, clientHeight: 720, scrollTop: 0, scrollLeft: 0, src: '', href: '', name: '',
    classList: { add: __noop, remove: __noop, toggle: __noop, contains: () => false },
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    append: __noop, prepend: __noop, insertBefore: __noop, removeChild: __noop, replaceChildren: __noop,
    remove: __noop, setAttribute: __noop, removeAttribute: __noop, getAttribute: () => null,
    hasAttribute: () => false, addEventListener: __noop, removeEventListener: __noop, dispatchEvent: __noop,
    querySelector: (sel) => __getEl('qs:' + sel), querySelectorAll: () => [], closest: () => null, contains: () => false,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 1280, height: 720, top: 0, left: 0, right: 1280, bottom: 720 }),
    getContext: () => __mkCtx2D(), click: __noop, focus: __noop, blur: __noop, scrollIntoView: __noop,
    requestPointerLock: __noop, animate: () => ({ cancel: __noop, finished: Promise.resolve(), onfinish: null }),
  };
  return e;
};
const __els = new Map();
const __getEl = (id) => { if (!__els.has(id)) __els.set(id, __mkEl(id)); return __els.get(id); };
const __doc = {
  title: '', body: __mkEl('body'), head: __mkEl('head'), documentElement: __mkEl('html'),
  getElementById: __getEl,
  querySelector: (q) => (String(q).startsWith('#') ? __getEl(String(q).slice(1)) : null),
  querySelectorAll: () => [],
  createElement: (tag) => (String(tag).toLowerCase() === 'canvas' ? __mkCanvas() : __mkEl(tag)),
  createElementNS: (ns, tag) => (String(tag).toLowerCase() === 'canvas' ? __mkCanvas() : __mkEl(tag)),
  addEventListener: __noop, removeEventListener: __noop, dispatchEvent: __noop,
  exitPointerLock: __noop, pointerLockElement: null, hidden: false, visibilityState: 'visible',
  fonts: { ready: Promise.resolve(), add: __noop, check: () => true, addEventListener: __noop },
  createTextNode: (t) => ({ textContent: t, nodeName: '#text' }),
};
const __win = {
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720, outerWidth: 1280, outerHeight: 720,
  scrollX: 0, scrollY: 0, document: __doc,
  addEventListener: __noop, removeEventListener: __noop, dispatchEvent: __noop,
  matchMedia: () => ({ matches: false, addEventListener: __noop, removeEventListener: __noop, addListener: __noop }),
  getComputedStyle: () => ({ getPropertyValue: () => '', width: '1280px', height: '720px' }),
  requestAnimationFrame: () => 0, cancelAnimationFrame: __noop,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  location: { search: '', hash: '', href: 'file:///game/', reload: __noop, assign: __noop },
  navigator: { userAgent: 'node-regression', platform: 'node', maxTouchPoints: 0, language: 'zh-CN' },
  performance: globalThis.performance,
  alert: __noop, confirm: () => false, prompt: () => null,
  open: () => null, close: __noop, focus: __noop,
  screen: { width: 1280, height: 720, availWidth: 1280, availHeight: 720 },
};
__win.window = __win; __win.self = __win; __win.top = __win; __win.parent = __win;
globalThis.window = __win;
globalThis.document = __doc;
globalThis.self = __win;
globalThis.location = __win.location;
globalThis.screen = __win.screen;
globalThis.getComputedStyle = __win.getComputedStyle;
globalThis.requestAnimationFrame = __win.requestAnimationFrame;
globalThis.cancelAnimationFrame = __win.cancelAnimationFrame;
globalThis.matchMedia = __win.matchMedia;
globalThis.alert = __noop;
globalThis.HTMLCanvasElement = class HTMLCanvasElement {};
globalThis.Image = class Image extends __mkCanvas.constructor { };
globalThis.Image = function Image() { return __mkCanvas(); };
for (const [k, v] of [['navigator', __win.navigator], ['localStorage', {
  __m: new Map(),
  getItem(k) { return this.__m.has(k) ? this.__m.get(k) : null; },
  setItem(k, v) { this.__m.set(k, String(v)); },
  removeItem(k) { this.__m.delete(k); },
  clear() { this.__m.clear(); },
  key(i) { return [...this.__m.keys()][i] ?? null; },
  get length() { return this.__m.size; },
}]]) {
  try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } catch (e) { /* 只读则忽略 */ }
}
// ── 音频：只保留调用形状 ──
const __audioParam = (v = 1) => ({
  value: v, defaultValue: v, minValue: -3.4e38, maxValue: 3.4e38,
  setValueAtTime: () => __audioParam(v), linearRampToValueAtTime: () => __audioParam(v),
  exponentialRampToValueAtTime: () => __audioParam(v), setTargetAtTime: () => __audioParam(v),
  setValueCurveAtTime: () => __audioParam(v), cancelScheduledValues: () => __audioParam(v),
  cancelAndHoldAtTime: () => __audioParam(v),
});
const __audioNode = (extra = {}) => Object.assign({
  connect: (n) => n, disconnect: __noop, start: __noop, stop: __noop,
  addEventListener: __noop, removeEventListener: __noop,
}, extra);
class __StubAudioContext {
  constructor() {
    this.destination = __audioNode();
    this.currentTime = 0; this.sampleRate = 48000; this.state = 'running';
    this.baseLatency = 0; this.outputLatency = 0;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createGain() { return __audioNode({ gain: __audioParam(1) }); }
  createOscillator() { return __audioNode({ frequency: __audioParam(440), detune: __audioParam(0), type: 'sine', onended: null }); }
  createBufferSource() { return __audioNode({ buffer: null, loop: false, loopStart: 0, loopEnd: 0, playbackRate: __audioParam(1), detune: __audioParam(0), onended: null }); }
  createBuffer(ch = 1, len = 1024, rate = 48000) {
    const n = Math.max(1, len | 0);
    return { numberOfChannels: ch, length: n, sampleRate: rate, duration: n / rate, getChannelData: () => new Float32Array(n) };
  }
  createBiquadFilter() { return __audioNode({ frequency: __audioParam(350), Q: __audioParam(1), gain: __audioParam(0), type: 'lowpass' }); }
  createDynamicsCompressor() { return __audioNode({ threshold: __audioParam(-24), knee: __audioParam(30), ratio: __audioParam(12), attack: __audioParam(.003), release: __audioParam(.25) }); }
  createStereoPanner() { return __audioNode({ pan: __audioParam(0) }); }
  createWaveShaper() { return __audioNode({ curve: null, oversample: 'none' }); }
  createConvolver() { return __audioNode({ buffer: null, normalize: true }); }
  createDelay() { return __audioNode({ delayTime: __audioParam(0) }); }
  createAnalyser() { return __audioNode({ fftSize: 2048, frequencyBinCount: 1024, getByteFrequencyData: __noop, getByteTimeDomainData: __noop }); }
  createChannelMerger() { return __audioNode({}); }
  createPanner() { return __audioNode({ positionX: __audioParam(0), positionY: __audioParam(0), positionZ: __audioParam(0) }); }
}
globalThis.AudioContext = __StubAudioContext;
globalThis.webkitAudioContext = __StubAudioContext;
__win.AudioContext = __StubAudioContext;
// ── 渲染器桩：setAnimationLoop 只记录不启动，测试手工推进 dt ──
class __StubRenderer {
  constructor() {
    this.domElement = __mkCanvas(1280, 720);
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true, needsUpdate: false };
    this.info = { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 }, programs: [], autoReset: true, reset: __noop };
    this.capabilities = {
      isWebGL2: true, isWebGL1: false, maxTextureSize: 8192, getMaxAnisotropy: () => 16,
      precision: 'highp', logarithmicDepthBuffer: false, maxSamples: 4,
    };
    this.xr = { enabled: false, isPresenting: false, setAnimationLoop: __noop, getSession: () => null, addEventListener: __noop, removeEventListener: __noop };
    this.autoClear = true; this.localClippingEnabled = false; this.toneMapping = 0;
    this.toneMappingExposure = 1; this.outputColorSpace = ''; this.__loop = null;
  }
  setPixelRatio() {} getPixelRatio() { return 1; }
  setSize() {} setClearColor() {} setClearAlpha() {} setScissorTest() {} setViewport() {}
  getSize(v) { return v ? v.set(1280, 720) : { width: 1280, height: 720 }; }
  getDrawingBufferSize(v) { return v ? v.set(1280, 720) : { width: 1280, height: 720 }; }
  getViewport(v) { return v ? v.set(0, 0, 1280, 720) : { x: 0, y: 0, width: 1280, height: 720 }; }
  setAnimationLoop(cb) { this.__loop = cb; }
  render() {} renderAsync() { return Promise.resolve(); }
  compile() {} compileAsync() { return Promise.resolve(); }
  clear() {} clearDepth() {} clearColor() {}
  setRenderTarget() {} getRenderTarget() { return null; }
  readRenderTargetPixels() {} copyFramebufferToTexture() {} initTexture() {}
  getContext() { return null; } getMRT() { return null; }
  dispose() {} forceContextLoss() {}
}
// ── 环境贴图预过滤：返回可直接当 envMap 的 Texture，不做 GPU 卷积 ──
class __StubPMREM {
  constructor(renderer) { this.renderer = renderer; this.__tex = new THREE.Texture(); }
  fromScene() { return { texture: this.__tex, dispose: __noop }; }
  fromEquirectangular() { return { texture: this.__tex, dispose: __noop }; }
  fromCubemap() { return { texture: this.__tex, dispose: __noop }; }
  compileCubemapShader() {}
  compileEquirectangularShader() {}
  dispose() {}
}
// ── 贴图：不真解码 PNG，只给出真实尺寸与可用 Texture 对象 ──
THREE.ImageLoader.prototype.load = function (url, onLoad, onProgress, onError) {
  const img = __fakeImg(url);
  if (onLoad) Promise.resolve().then(() => onLoad(img));
  return img;
};
THREE.ImageLoader.prototype.loadAsync = function (url) {
  return new Promise((res) => { const img = __fakeImg(url); res(img); });
};
THREE.ImageBitmapLoader.prototype.load = function (url, onLoad) {
  const img = __fakeImg(url);
  if (onLoad) Promise.resolve().then(() => onLoad(img));
  return img;
};
THREE.ImageBitmapLoader.prototype.loadAsync = function (url) { return Promise.resolve(__fakeImg(url)); };
// 3D 文字/字体等浏览器专有能力直接失败，由游戏自身降级
if (typeof globalThis.FontFace === 'undefined') globalThis.FontFace = class FontFace { constructor() {} load() { return Promise.resolve(this); } };
