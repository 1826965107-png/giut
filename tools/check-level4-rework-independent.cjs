// Codex acceptance: run the real host/controller without editing DSH's stage.
// GPU, audio and DOM use the existing documented Node harness stubs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const target = process.argv.includes('--stage')
  ? path.join(root, 'workbench', 'l4-first-return-20261030') : root;
let harness = fs.readFileSync(path.join(root, 'tools', 'check-level4-node.cjs'), 'utf8');
const tests = String.raw`
let codexFailures = 0, codexChecks = 0;
function verify(value, label) { codexChecks++; console.log((value?'PASS ':'FAIL ')+label); if(!value)codexFailures++; }
let seamBobError=0;
function tick() {
  updatePlayer(1/60);const cy=camera.position.y, count=l4.seamState.crossings;
  l4.update(1/60);
  if(l4.seamState.crossings!==count)seamBobError=Math.max(seamBobError,Math.abs(camera.position.y-cy));
}
function walkTo(x,z,max=7000) {
  const tx=L4_OX+x; let n=0;
  for(;n<max;n++) {
    const dx=tx-player.x,dz=z-player.z;
    if(Math.hypot(dx,dz)<.10)break;
    yaw=Math.atan2(-dx,-dz);pitch=0; keys.add('KeyW');tick();keys.clear();
  }
  verify(n<max,'真实WASD抵达 '+x+','+z+'，实际 '+(player.x-L4_OX).toFixed(2)+','+player.z.toFixed(2));
  return n<max;
}
function use(key) {
  const it=l4.interactables.find(x=>x.key===key), q=it.pos();
  camera.lookAt(q.x,q.y,q.z);camera.updateMatrixWorld(true);tryInteract();
}
try {
  enterLevel4({instant:true}); await l4.artReady; renderReady=true;
  document.pointerLockElement=renderer.domElement;syncCameraToPlayer();camera.updateMatrixWorld(true);
  verify(!l4.torchOwned,'初始未拥有手电');toggleFlash();verify(!l4.torchOn,'未拾取按F不能亮');
  verify(!!l4.anchors.torch&&l4.anchors.torch.visible,'地面手电有真实可见模型');
  const originalPose={...player};
  player.x=L4_OX-1.1;player.z=-3.2;player.y=.04;syncCameraToPlayer();
  use('torch');verify(!l4.torchOwned,'车壁后的近距离手电不可隔墙拾取');
  Object.assign(player,originalPose);syncCameraToPlayer();camera.updateMatrixWorld(true);
  use('door');verify(l4.state.doorTarget===1,'出生点真实瞄准按E能打开中门');
  for(let i=0;i<70;i++)l4.update(1/60);
  if(!walkTo(-2.8,0,500))throw Error('开门后不能下车');
  walkTo(-2.62,-3.2,500);use('torch');verify(l4.torchOwned&&l4.torchOn,'实际捡到手电并点亮');
  walkTo(-2.8,-4,500); yaw=0;pitch=0;const yBefore=player.y;
  let frames=0;for(;frames<2500&&!l4.aged;frames++){keys.add('KeyW');tick();keys.clear();}
  verify(l4.aged&&l4.seamState.forward===1,'持续前进触发首次异变');
  verify(player.z>30&&player.z<37,'跨缝返回列车前方缓冲区');
  verify(yaw===0&&pitch===0&&Math.abs(player.y-yBefore)<.01,'接缝保持方向与脚高');
  verify(Math.abs(camera.position.z-player.z)<1e-6,'相机与玩家同步跨缝');
  verify(seamBobError<1e-9,'跨缝精确保留当帧步态镜头高度 '+seamBobError.toFixed(6));
  const meshes=l4.renderInfo.meshes, lights=l4.lightCount;
  const savedSet=localStorage.setItem.bind(localStorage);let recordWrites=0;
  localStorage.setItem=(key,value)=>{if(key==='poolrooms.records.v1')recordWrites++;savedSet(key,value);};
  walkTo(-2.8,0);if(!walkTo(0,0,600))throw Error('不能走回异常车厢');
  walkTo(0,3.05,600);use('battery');verify(l4.state.batteryTaken,'车内真实瞄准拾取电池');
  walkTo(0,-8.8,1800);use('key');verify(l4.hasKey,'车内真实瞄准拾取通行钥匙');
  verify(!l4Completed,'拿齐物品不触发最终结算');
  verify(recordWrites===0,'探索及拿齐物品没有写通关记录');
  l4.group.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(L4_OX+.52,1.8,2.15),new THREE.Vector3(0,1,0),0,2);
  ray.layers.set(TUNNEL_LAYER);
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  const ceilingHit=ray.intersectObject(l4.group,true).find(h=>visible(h.object));
  verify(ceilingHit&&l4.ceilingAt(L4_OX+.52,2.15)-.12<=ceilingHit.point.y+.015,
    '下垂车顶实际网格与跳跃头顶净空一致'+(ceilingHit?' meshY='+ceilingHit.point.y.toFixed(3):''));
  for(const x of [.23,.35,.7,.81]){
    ray.ray.origin.x=L4_OX+x;
    const hit=ray.intersectObject(l4.group,true).find(h=>visible(h.object));
    verify(hit&&l4.ceilingAt(L4_OX+x,2.15)-.12<=hit.point.y+.015,
      '下垂板边缘不穿头 x='+x+(hit?' meshY='+hit.point.y.toFixed(3):''));
  }
  const spare=l4.spareBattery;
  l4.state.torchCharge=.00001;l4.setTorch(true);l4.update(.05);
  verify(spare===0||(l4.spareBattery===spare-1&&l4.torchCharge>.5),'备用电池能自动使用一次');
  const charge=l4.torchCharge;l4.setPaused(true);l4.update(50);
  verify(l4.torchCharge===charge,'暂停不耗电');l4.setPaused(false);
  walkTo(0,0);walkTo(-2.8,0,600);
  walkTo(-2.8,35);
  yaw=Math.PI;pitch=0;let reverseFrames=0;
  for(;reverseFrames<100&&l4.seamState.back===0;reverseFrames++){keys.add('KeyW');tick();keys.clear();}
  verify(l4.seamState.back===1&&player.z< -47,'真实逆向穿缝可返回另一侧');
  verify(l4.aged&&l4.hasKey&&l4.state.batteryTaken,'逆向回环不刷新异变与已拾资源');
  verify(Math.abs(yaw-Math.PI)<1e-9&&Math.abs(camera.position.z-player.z)<1e-9,'逆向穿缝保持方向及相机同步');
  const wall=collideCircle(L4_OX-5,30,RADIUS),otherWall=collideCircle(L4_OX+4,30,RADIUS);
  verify(wall[0]>=L4_OX-3.85-1e-6&&otherWall[0]<=L4_OX+2.45+1e-6,'两侧边界保留玩家半径，不可贴穿墙');
  verify(l4.lightCount===lights&&l4.renderInfo.meshes===meshes,'探索和拾取不增加灯或网格');
  l4.reset();verify(!l4.aged&&!l4.torchOwned&&!l4.hasKey&&!l4.state.batteryTaken,'重开恢复正常列车及全部物品状态');
  verify(Math.abs(scene.fog.density-l4.artLighting.fogDensity)<1e-9,'宿主最终雾密度遵循美术配置');
  for(const choice of [false,true]){
    enterLevel3(true);runPreview=false;l3State.boarded=true;l3State.rideT=0;
    l3State.rideDone=false;l3State.rideChoice=choice;l4RideHandoff=false;
    for(let i=0;i<400;i++)updateLevel3(1/60);
    await new Promise(resolve=>setTimeout(resolve,580));await renderPreparation;
    verify(LEVEL===L4_LEVEL&&l4.state.entered,'真实L3乘车更新衔接L4 choice='+choice);
    verify(!l4.aged&&!l4.torchOwned&&!l4.hasKey,'第三关衔接从正常车及未拾手电开始');
    verify(!l4Completed&&recordWrites===0,'正式乘车衔接及阶段探索不结算、不写档');
  }
} catch(e) { codexFailures++;console.error('FAIL exception',e.stack); }
console.log('Codex independent acceptance: checks='+codexChecks+'; failures='+codexFailures);
process.exit(codexFailures?1:0);
`;
harness = harness.replace("const root = path.resolve(__dirname, '..');", 'const root = '+JSON.stringify(target)+';');
const suite = process.argv.includes('--dsh-suite')
  ? fs.readFileSync(path.join(target, 'tools', '_l4-node-tests.js'), 'utf8') : tests;
harness = harness.replace("const TESTS = fs.readFileSync(path.join(__dirname, '_l4-node-tests.js'), 'utf8');", 'const TESTS = '+JSON.stringify(suite)+';');
harness = harness.replace("let tmpChoice = path.join(__dirname, '.tmp-l4-node.mjs');", 'let tmpChoice = '+JSON.stringify(path.join(os.tmpdir(),'codex-l4-independent-'+process.pid+'.mjs'))+';');
const runner = new Module(path.join(root,'tools','codex-l4-independent-runner.cjs'), module);
runner.filename=path.join(root,'tools','codex-l4-independent-runner.cjs');
runner.paths=module.paths;
runner._compile(harness,runner.filename);
