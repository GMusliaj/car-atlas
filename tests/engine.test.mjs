import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../dist/three.module.js';
import {buildEngine,ENGINE_IDENTITY} from '../dist/engine.js';
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
  assert.ok(new T.Box3().setFromObject(group.getObjectByName('engine/front-belt-drive')).max.z<-.4);
  assert.ok(new T.Box3().setFromObject(group.getObjectByName('engine/rear-timing-drive')).min.z>.35);
  const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3());
  assert.ok(size.x>.9&&size.x<1.2);assert.ok(size.y>.8&&size.y<1.1);assert.ok(size.z>.9&&size.z<1.2);
  group.traverse(o=>{
    assert.ok(o.matrixWorld.elements.every(Number.isFinite),o.name);
    if(o.geometry){const p=o.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite),o.name);if(o.geometry.index)for(const i of o.geometry.index.array)assert.ok(i<p.count,o.name);}
  });
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
