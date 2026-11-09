/* ============================================================ 漂浮物（救生圈 / 鸭子） */
/* 六件：主池 2（鸭 + 圈）、训练池 2（鸭 + 鸭）、浅水回声池 2（鸭 + 圈）= 四鸭二圈。
   每件的所属水体在生成时绑定，漂移被限制在该水体的可漂浮矩形内，不会上岸或穿墙。 */
const pickups = [], PICK_TOTAL = 6;
const haloTex = (() => {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(210,245,255,0.85)');
  gr.addColorStop(0.45, 'rgba(150,225,255,0.35)');
  gr.addColorStop(1, 'rgba(120,200,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
let pickedCount = 0;
function ringTexture() {
  const c = makeCanvas(128, 64), g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = (i % 2) ? '#e23b2e' : '#f4f4f1';
    g.fillRect(i * 16, 0, 16, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const ringTexShared = ringTexture();
function makeDuck() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.35, metalness: 0.05 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf27a1a, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), bodyMat);
  body.scale.set(1, 0.85, 1.2); body.position.y = 0.03; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), bodyMat);
  head.position.set(0, 0.17, 0.12); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 10), beakMat);
  beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.165, 0.24); g.add(beak);
  return g;
}
const ringMatShared = new THREE.MeshStandardMaterial({ map: ringTexShared, roughness: 0.35, metalness: 0.1 });
function makeRing() {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 12, 32), ringMatShared);
  ring.rotation.x = Math.PI / 2;
  return ring;
}
/* 可漂浮矩形：池内再收 0.55m，杜绝贴壁穿出 */
function floatRect(p) {
  return { x1: p.x1 + 0.55, x2: p.x2 - 0.55, z1: p.zDeep1 + 0.55, z2: p.zEnd - 0.55 };
}
function spawnPickup(kind, x, z, waterY, bodyName) {
  const p = bodyName ? POOL_BY_NAME[bodyName] : poolAt(x, z, 0.1);
  if (!p) throw new Error(`pickup 不在任何泳池内: ${kind} @ ${x},${z}`);
  const wy = waterY == null ? p.water : waterY;
  const mesh = kind === 'duck' ? makeDuck() : makeRing();
  mesh.position.set(x, wy + 0.04, z);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  scene.add(mesh);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(x, wy + 0.02, z);
  scene.add(halo);
  pickups.push({ kind, mesh, x, z, halo, baseY: wy + 0.04, waterY: wy,
    phase: Math.random() * Math.PI * 2, body: p.name, rect: floatRect(p) });
}
/* [kind, x, z, waterY, body] —— 四鸭二圈，三个水体各两件 */
const PICKUP_DEFS = [
  ['duck', 0.5, 2.0, -0.30, 'main'],      // 主池
  ['ring', -5.5, -6.0, -0.30, 'main'],    // 主池
  ['duck', 18.0, -1.0, -0.30, 'train'],   // 训练池
  ['duck', 22.0, 2.0, -0.30, 'train'],    // 训练池
  ['duck', -8.0, -22.0, -0.14, 'echo'],   // 浅水回声池
  ['ring', -6.0, -21.0, -0.14, 'echo'],   // 浅水回声池
];
PICKUP_DEFS.forEach(d => spawnPickup(d[0], d[1], d[2], d[3], d[4]));
document.getElementById('v-pick').textContent = `0 / ${PICK_TOTAL}`;