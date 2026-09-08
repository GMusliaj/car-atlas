import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../dist/three.module.js';
import {buildBody,bodyPoint,BODY_IDENTITY} from '../dist/body.js';
import {bodySource} from '../dist/models/g05-source.js';
import {references,componentRefs} from '../dist/references.js';

test('the packaged body preserves the pinned BMW source and identifies the LCI adaptation',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/models/g05-source.json',import.meta.url),'utf8'));
  const asset=await readFile(new URL('../dist/models/g05-source.js',import.meta.url));
  assert.equal(manifest.revision,'6261f53b5ac63c6686039d106fbbbfb693339d72');
  assert.equal(createHash('sha256').update(asset).digest('hex'),manifest.assetSha256);
  assert.equal(manifest.license,'CC-BY-4.0');
  assert.match(manifest.sourceVehicle,/2018.*pre-LCI/);
  assert.equal(manifest.targetVehicle,'BMW X5 G05 LCI M Sport');
  assert.equal(BODY_IDENTITY.trim,'M Sport');assert.equal(BODY_IDENTITY.derivative,true);
  assert.equal(manifest.sources.length,8);
  for(const source of manifest.sources)assert.ok(source.url.includes(`/bmwcarit/digital-car-3d/${manifest.revision}/G05/meshes/`));
  assert.equal(bodySource.length,54);
  assert.ok(bodySource.reduce((n,p)=>n+p.vertices,0)>250000,'actual panel mesh must not be replaced by a primitive envelope');
  assert.equal(componentRefs.bodywork[0],'msport');
  assert.match(references.msport.url,/bmw\.co\.id\/.*xDrive40iMSport/);
  assert.match(await readFile(new URL('../dist/models/LICENSE-CC-BY-4.0.txt',import.meta.url),'utf8'),/Attribution 4.0 International/);
});

test('body conversion preserves axle calibration, panel symmetry and valid indexed geometry',()=>{
  const front=bodyPoint([-6.309,0,0]),rear=bodyPoint([293.30399,0,0]);
  assert.ok(Math.abs(front[2]+1.52)<1e-8);assert.ok(Math.abs(rear[2]-1.62)<1e-8);
  const group=new T.Group();buildBody(group);
  const meshes=group.children.filter(o=>o.isMesh);
  for(const mesh of meshes) {
    const geometry=mesh.geometry,p=geometry.attributes.position;
    assert.ok(p.count>0,mesh.name);
    assert.ok([...p.array].every(Number.isFinite),`${mesh.name}: finite coordinates`);
    if(geometry.index)for(const index of geometry.index.array)assert.ok(index<p.count,`${mesh.name}: valid index`);
  }
  for(const prefix of ['doors-front/Door_F_paint','doors-rear/Door_B_paint','hood/Hood_paint']) {
    const bounds=['left','right'].map(side=>new T.Box3().setFromObject(group.getObjectByName(`${prefix}/${side}`)));
    const a=bounds[0],b=bounds[1];
    assert.ok(Math.abs(a.max.x+b.min.x)<.001);assert.ok(Math.abs(a.min.x+b.max.x)<.001);
    assert.ok(a.getSize(new T.Vector3()).distanceTo(b.getSize(new T.Vector3()))<.001);
  }
  const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3());
  assert.ok(size.z>5&&size.z<5.5,'G05 body length relative to the calibrated wheelbase');
  assert.ok(size.x>2&&size.x<2.4,'body width including mirrors');
  assert.ok(bounds.max.y>1.7&&bounds.max.y<1.95,'G05 roof height');
});

test('LCI light signatures and M Sport apertures occupy the correct ends and remain visible when isolated',()=>{
  const group=new T.Group(),appearance=buildBody(group),meshes=group.children.filter(o=>o.isMesh);
  const arrows=meshes.filter(o=>o.name.startsWith('lci/drl-arrow/'));
  const rearLights=meshes.filter(o=>o.name.startsWith('lci/x-signature/'));
  const exhausts=meshes.filter(o=>o.name.startsWith('m-sport/trapezoidal-exhaust/'));
  assert.equal(arrows.length,4);assert.equal(rearLights.length,4);assert.equal(exhausts.length,2);
  for(const mesh of arrows)assert.ok(new T.Box3().setFromObject(mesh).max.z < -1.9,'front running-light location');
  for(const mesh of [...rearLights,...exhausts])assert.ok(new T.Box3().setFromObject(mesh).min.z > 2,'rear detail location');
  for(const side of ['left','right'])for(const name of ['front-apron','lower-intake','air-curtain','rear-apron','rear-diffuser'])
    assert.ok(group.getObjectByName(`m-sport/${name}/${side}`)?.geometry.index.count>30,`${name}/${side} is a surface`);
  const paint=group.getObjectByName('hood/Hood_paint/left').material;
  appearance.update(false);const contextOpacity=paint.opacity;
  appearance.update(true,true);assert.ok(paint.opacity>contextOpacity*5);assert.equal(paint.depthWrite,true);
  assert.ok(arrows[0].material.emissive.b>arrows[0].material.emissive.r);
  assert.ok(rearLights[0].material.emissive.r>rearLights[0].material.emissive.g);
  appearance.update(false);assert.equal(paint.depthWrite,false);assert.equal(paint.opacity,contextOpacity);
});
