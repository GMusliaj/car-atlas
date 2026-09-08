import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/three.module.js';
import {buildDrivetrain} from '../dist/model.js';
import {data} from '../dist/catalogue.js';
import {systems, presets, findParts, createTapTracker} from '../dist/explorer.js';

test('every selectable component belongs to exactly one system and has geometry', () => {
  const model = buildDrivetrain(new T.Scene());
  const catalogue = data.filter(part => part[0] !== 'overview').map(part => part[0]).sort();
  assert.deepEqual(systems.flatMap(system => system.parts).sort(), catalogue);
  assert.deepEqual(Object.keys(model.groups).sort(), catalogue);
});

test('search finds component names and IDs across hidden systems', () => {
  assert.equal(findParts(data, '  CLUTCH  PACK ')[0][0], 'clutch');
  assert.equal(findParts(data, 'frontoutput')[0][0], 'frontoutput');
  assert.equal(findParts(data, 'G05 LCI M Sport')[0][0], 'bodywork');
  assert.equal(findParts(data, 'transfer input')[0][0], 'inputshaft');
  assert.equal(findParts(data, 'unmatched component').length, 0);
  assert.equal(findParts(data, '').length, data.length - 1);
});

test('dragging back to the starting point, cancelled gestures and pinches never select a part', () => {
  const taps = createTapTracker();
  taps.down(1, 10, 10, 1); taps.move(1, 12, 11);
  assert.equal(taps.up(1, 12, 11), true);
  taps.down(1, 10, 10, 1); taps.move(1, 40, 10); taps.move(1, 10, 10);
  assert.equal(taps.up(1, 10, 10), false);
  taps.down(1, 10, 10, 1); taps.down(2, 20, 20, 2);
  assert.equal(taps.up(2, 20, 20), false);
  assert.equal(taps.up(1, 10, 10), false);
  taps.down(1, 10, 10, 1); taps.cancel();
  assert.equal(taps.up(1, 10, 10), false);
});

test('rendered visibility honors layers, exact internal isolation and restoration', () => {
  const model = buildDrivetrain(new T.Scene());
  const state = {time: 0, explode: 0, cutaway: false, visible: [...presets.all], selected: 'overview', isolate: false, strength: .5, coasting: false, layout: 'chain'};
  const visible = () => {
    const ids = new Set();
    model.world.traverseVisible(object => { if (object.geometry) ids.add(object.userData.componentId); });
    return [...ids].sort();
  };
  model.update(state);
  assert.deepEqual(visible(), data.filter(part => part[0] !== 'overview').map(part => part[0]).sort());
  model.update({...state, visible: []}); assert.deepEqual(visible(), []);
  model.update({...state, visible: presets.drivetrain}); assert.ok(!visible().includes('bodywork')); assert.ok(!visible().includes('chassis'));
  model.update({...state, selected: 'clutch', isolate: true, cutaway: true}); assert.deepEqual(visible(), ['clutch']);
  model.update({...state, selected: 'casecover', isolate: true}); assert.deepEqual(visible(), ['casecover']);
  model.update({...state, selected: 'transfer', isolate: true}); assert.deepEqual(visible(), systems.find(system => system.id === 'transfer').parts.toSorted());
  model.update(state); assert.equal(visible().length, 19);
});

test('power flow toggle controls 3D flow visibility and responds to state', () => {
  const model = buildDrivetrain(new T.Scene());
  const state = {time: 0, explode: 0, cutaway: false, flow: true, visible: [...presets.all], selected: 'overview', isolate: false, strength: .5, coasting: false, layout: 'chain'};
  const countFlow = () => {
    let count = 0;
    model.world.traverseVisible(o => { if (o.userData.flow) count++; });
    return count;
  };
  model.update(state);
  const initialFlowCount = countFlow();
  assert.ok(initialFlowCount > 0, 'flow meshes and beads are visible when flow is enabled');
  model.update({...state, flow: false});
  assert.equal(countFlow(), 0, 'flow meshes and beads are hidden when flow is disabled');
  model.update({...state, flow: true});
  assert.equal(countFlow(), initialFlowCount, 'flow visibility is restored when flow is re-enabled');
});
