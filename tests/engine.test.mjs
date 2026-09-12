import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../dist/three.module.js';
import {buildEngine,ENGINE_IDENTITY,ENGINE_CONNECTIONS} from '../dist/engine.js';
import {TRANSMISSION_CONNECTIONS} from '../dist/transmission.js';
import {buildDrivetrain} from '../dist/model.js';
import {componentRefs,references} from '../dist/references.js';
import {data} from '../dist/catalogue.js';
import {findParts,presets} from '../dist/explorer.js';

test('engine evidence pins the LCI variant and every downloaded image is intact and reachable',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/references/engine/manifest.json',import.meta.url)));
  assert.equal(ENGINE_IDENTITY.engine,'B58B30M2');assert.equal(manifest.target.engine,ENGINE_IDENTITY.engine);
  assert.equal(manifest.target.type,'21EU');assert.match(manifest.identitySource,/bmwtechinfo\.bmwgroup\.com/);
  assert.match(manifest.requestedSourceStatus,/403/);
  assert.equal(manifest.images.length,29);
  assert.equal(new Set(manifest.images.map(i=>i.file)).size,29);
  for(const entry of manifest.images){
    const bytes=await readFile(new URL('../dist/references/engine/'+entry.file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.file);
    if(entry.file.endsWith('.png'))assert.equal(bytes.readUInt32BE(0),0x89504e47,'actual PNG');
    else assert.equal(bytes.readUInt16BE(0),0xffd8,'actual JPEG');
    if(entry.kind!=='Photograph')assert.match(entry.url,/\/1\/21EU\?steering=L&transmission=A$/);
    const ref=Object.entries(references).find(([,r])=>r.image==='references/engine/'+entry.file);
    assert.ok(ref,entry.file);
    assert.ok(Object.values(componentRefs).some(keys=>keys.includes(ref[0])),`${entry.file}: browsable from an assembly`);
  }
  assert.ok(componentRefs.engine.includes('engine220271'));
  assert.ok(!componentRefs.engine.some(key=>references[key].image==='references/engine-photo.jpg'));
  for(const query of ['B58B30M2','engine mounts'])assert.equal(findParts(data,query)[0][0],'engine');
});

test('engine geometry has six scaled pistons, opposing mounts, rear timing and front belt with finite geometry',()=>{
  const group=new T.Group();buildEngine(group);group.updateMatrixWorld(true);
  const pistons=[];group.traverse(o=>{if(/^engine\/piston\/\d$/.test(o.name))pistons.push(o);});
  assert.equal(pistons.length,6);
  const centres=pistons.map(p=>{const m=p.getObjectByName('piston');assert.equal(m.geometry.parameters.radiusTop,.041);return m.position.z;});
  for(let i=1;i<centres.length;i++)assert.ok(centres[i]-centres[i-1]>.08);
  const left=new T.Box3().setFromObject(group.getObjectByName('engine/mount/left'));
  const right=new T.Box3().setFromObject(group.getObjectByName('engine/mount/right'));
  assert.ok(left.max.x<0);assert.ok(right.min.x>0);
  assert.ok(left.getSize(new T.Vector3()).z>right.getSize(new T.Vector3()).z,'the supports are asymmetric');
  for(const [i,side]of ['left','right'].entries()){
    const isolator=group.getObjectByName(`engine/mount/${side}`).getObjectByName('hydraulic-isolator');
    const foot=new T.Box3().setFromObject(isolator),point=foot.getCenter(new T.Vector3());point.y=foot.min.y;
    assert.ok(point.distanceTo(new T.Vector3(...ENGINE_CONNECTIONS.mounts[i]))<1e-7,'mount connection is the rubber foot, with the bolt projecting into its seat');
  }
  assert.ok(new T.Box3().setFromObject(group.getObjectByName('engine/front-belt-drive')).max.z<-.4);
  assert.ok(new T.Box3().setFromObject(group.getObjectByName('engine/rear-timing-drive')).min.z>.35);
  const crank=group.getObjectByName('crankshaft').getWorldPosition(new T.Vector3());
  for(const name of ['flexplate','pulley']){
    const centre=group.getObjectByName(name).getWorldPosition(new T.Vector3());
    assert.ok(Math.hypot(centre.x-crank.x,centre.y-crank.y)<1e-8,`${name} shares the canted engine's crank axis`);
  }
  const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3());
  assert.ok(size.x>.9&&size.x<1.2);assert.ok(size.y>.8&&size.y<1.1);assert.ok(size.z>.9&&size.z<1.2);
  group.traverse(o=>{
    assert.ok(o.matrixWorld.elements.every(Number.isFinite),o.name);
    if(o.geometry){const p=o.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite),o.name);if(o.geometry.index)for(const i of o.geometry.index.array)assert.ok(i<p.count,o.name);}
  });
});

test('assembled 40i powertrain fits the bonnet and tunnel and restores connected shafts and mounts',()=>{
  const model=buildDrivetrain(new T.Scene()),g=model.groups;
  const state={time:0,explode:0,cutaway:false,flow:false,visible:[...presets.all],selected:'overview',isolate:false,strength:.5,coasting:false,layout:'chain'};
  const update=extra=>{model.update({...state,...extra});model.world.updateMatrixWorld(true);};
  const world=(group,p)=>group.localToWorld(new T.Vector3(...p));
  const near=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-6,message);
  const bounds=group=>{
    const box=new T.Box3();
    group.traverseVisible(o=>{if(o.geometry&&!o.userData.flow){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
    return box;
  };
  update();
  const engine=bounds(g.engine),gearbox=bounds(g.gearbox),transfer=bounds(g.transfer);
  const frontAxle=g.wheels.children[0].position.z;
  assert.ok(Math.abs(engine.getCenter(new T.Vector3()).z-frontAxle)<.25,'engine sits between the front wheels');
  assert.ok(engine.min.x>-.6&&engine.max.x<.6,'engine and mounts fit between the suspension towers');
  assert.ok(gearbox.max.z<0,'gearbox ends in the forward part of the centre tunnel');
  assert.ok(gearbox.getSize(new T.Vector3()).x<engine.getSize(new T.Vector3()).x*.6,'gearbox is narrower than the engine assembly');
  assert.ok(transfer.getSize(new T.Vector3()).x<.75&&transfer.getSize(new T.Vector3()).y<.55,'transfer case stays compact');
  assert.ok(transfer.min.y>.25,'transfer case clears the underbody instead of hanging near the ground');

  // Check actual cover and bonnet surfaces, rather than just their overall boxes.
  const cover=g.engine.getObjectByName('engine/acoustic-cover'),coverBox=bounds(cover);
  const hood=['left','right'].map(side=>g.bodywork.getObjectByName(`hood/Hood_paint/${side}`));
  const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);let samples=0;
  for(let i=1;i<20;i++)for(let j=1;j<30;j++){
    const x=T.MathUtils.lerp(coverBox.min.x,coverBox.max.x,i/20),z=T.MathUtils.lerp(coverBox.min.z,coverBox.max.z,j/30);
    ray.set(new T.Vector3(x,3,z),down);
    const bonnet=ray.intersectObjects(hood)[0],surface=ray.intersectObject(cover)[0];
    if(!bonnet||!surface)continue;
    samples++;assert.ok(bonnet.point.y-surface.point.y>.005,'acoustic cover stays below the bonnet');
  }
  assert.ok(samples>=400,'enough actual bonnet/cover intersections to establish clearance');
  for(const local of ENGINE_CONNECTIONS.mounts){
    const seat=world(g.engine,local);ray.set(seat.clone().add(new T.Vector3(0,.01,0)),down);
    const support=ray.intersectObject(g.chassis)[0];assert.ok(support,'mount has a subframe seat');near(support.point,seat,'seat meets the engine mount');
  }

  function connections(){
    near(world(g.engine,ENGINE_CONNECTIONS.transmission),world(g.gearbox,TRANSMISSION_CONNECTIONS.input),'engine and bellhousing meet');
    near(world(g.gearbox,TRANSMISSION_CONNECTIONS.output),world(g.transfer,[0,0,-.24]),'gearbox and transfer case meet');
    const front=g.frontshaft.userData.ends.map(p=>g.frontshaft.localToWorld(p.clone()));
    const rear=g.rearshaft.userData.ends.map(p=>g.rearshaft.localToWorld(p.clone()));
    near(front[1],world(g.frontoutput,[0,0,-.42]),'front propeller shaft meets the transfer output');
    assert.ok(Math.abs(front[0].z-(g.frontdiff.position.z+.10))<1e-8,'front propeller shaft reaches the differential');
    near(rear[0],world(g.outputshaft,[0,0,.61]),'rear propeller shaft meets the transfer output');
    near(rear[1],world(g.reardiff,[0,.12,-.26]),'rear propeller shaft reaches the differential');
  }
  connections();
  const assembled=Object.fromEntries(Object.entries(g).map(([id,group])=>[id,group.matrixWorld.clone()]));
  update({explode:1,cutaway:true});
  assert.ok(g.engine.position.distanceTo(g.engine.userData.base)>.5);
  update();connections();
  for(const [id,matrix]of Object.entries(assembled))assert.ok(matrix.equals(g[id].matrixWorld),`${id} restores after explode/cutaway`);
});

test('integrated engine cutaway and explode restore correctly without leaking through hidden layers',()=>{
  const model=buildDrivetrain(new T.Scene()),engine=model.groups.engine;
  const state={time:0,explode:0,cutaway:false,visible:[...presets.all],selected:'engine',isolate:true,strength:.5,coasting:false,layout:'chain'};
  const cover=engine.getObjectByName('engine/acoustic-cover'),block=engine.getObjectByName('closed-deck-block');
  model.update(state);const y=cover.position.y;
  engine.traverse(o=>{if(o.userData.flow)assert.equal(o.visible,false,'isolated inspection leaves the cover unobscured');});
  assert.equal(cover.visible,true);assert.equal(block.material.opacity,1);
  model.update({...state,explode:1});assert.ok(cover.position.y>y+.3);
  model.update({...state,cutaway:true});assert.equal(cover.visible,false);assert.ok(block.material.opacity<.2);
  assert.equal(engine.getObjectByName('engine/rotating-assembly').visible,true);
  assert.equal(engine.getObjectByName('engine/crankcase').visible,false);
  assert.equal(engine.getObjectByName('engine/crankcase-outline').visible,true);
  const mount=engine.getObjectByName('engine/mount/left');mount.traverse(o=>{if(o.isMesh)assert.equal(o.material.opacity,1,'cutaway preserves opaque mounts');});
  model.update({...state,visible:[],isolate:false});const shown=[];engine.traverseVisible(o=>{if(o.isMesh)shown.push(o);});assert.equal(shown.length,0);
  model.update(state);assert.equal(cover.visible,true);assert.equal(cover.position.y,y);assert.equal(block.material.opacity,1);
  assert.equal(engine.getObjectByName('engine/rotating-assembly').visible,false);
});
