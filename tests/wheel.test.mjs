import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/three.module.js';
import {buildDrivetrain} from '../dist/model.js';
import {presets} from '../dist/explorer.js';

test('all four rims and tyre treads roll forward on both sides and axles',()=>{
  const model=buildDrivetrain(new T.Scene()),rims=[],tyres=[];
  model.groups.wheels.traverse(o=>{if(o.userData.wheelStyle==='740 M')rims.push(o);if(o.name==='road-tyre')tyres.push(o);});
  assert.equal(rims.length,4);assert.equal(tyres.length,4);
  const state={time:0,explode:0,cutaway:false,visible:[...presets.all],selected:'overview',isolate:false,strength:.5,coasting:false,layout:'chain',flow:false};
  const top=()=>[...rims,...tyres].map(rim=>rim.localToWorld(new T.Vector3(0,.30,0)));
  for(const explode of [0,1]){
    model.update({...state,explode});model.world.updateMatrixWorld(true);const before=top();
    model.update({...state,explode,time:.01});model.world.updateMatrixWorld(true);const after=top();
    for(let i=0;i<8;i++){
      assert.ok(after[i].z<before[i].z,'top of wheel moves toward the front (-Z)');
      assert.ok(Math.abs(after[i].x-before[i].x)<1e-8,'rotation stays in the wheel plane');
    }
  }
});
