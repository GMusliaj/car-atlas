import * as T from './three.module.js';
import {references, componentRefs, inventory} from './references.js';
import {data, scenarios, internals} from './catalogue.js';
import {systems, systemFor, presets, findParts, isPartVisible, createTapTracker} from './explorer.js';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {selected: 'overview', visible: [...presets.all], isolate: false, explode: 0, cutaway: false, flow: true, layout: 'chain'};
let scenario = 0, playing = !reducedMotion.matches, rotating = false;
let renderer, model, camera, scene, frame = 0, time = 0, last = 0;
let theta = Math.PI - .74, phi = 1.05, radius = 8.6, radiusGoal = radius, cameraView = 'overview';
const target = new T.Vector3(0, .8, 0), targetGoal = target.clone();
let fitPending = true;
const pointers = new Map(), taps = createTapTracker();
let pinch = 0;

function invalidate() { if (renderer && !frame && !document.hidden) frame = requestAnimationFrame(animate); }
function visibleParts() { return data.filter(part => part[0] !== 'overview' && isPartVisible(part[0], state)); }
function updateUI() {
  $('hoverLabel').hidden = true;
  for (const system of systems) $(`layer-${system.id}`).checked = state.visible.includes(system.id);
  document.querySelectorAll('[data-preset]').forEach(button => {
    const ids = presets[button.dataset.preset];
    button.setAttribute('aria-pressed', !state.isolate && ids.length === state.visible.length && ids.every(id => state.visible.includes(id)));
  });
  const count = visibleParts().length;
  $('visibleCount').textContent = `${count} ${count === 1 ? 'assembly' : 'assemblies'} visible`;
  $('emptyScene').hidden = count > 0 || !renderer;
  $('explode').value = Math.round(state.explode * 100);
  $('explodeValue').value = `${Math.round(state.explode * 100)}%`;
  $('cutaway').checked = state.cutaway;
  $('flow').checked = state.flow;
  $('isolate').textContent = state.isolate ? 'Show surrounding systems' : 'Isolate component';
  $('isolate').setAttribute('aria-pressed', state.isolate);
  $('viewLabel').textContent = state.selected !== 'overview'
    ? `${state.isolate ? 'ISOLATED · ' : ''}${data.find(part => part[0] === state.selected)[1].toUpperCase()}`
    : state.explode > 0 ? 'X5 · SEPARATED ASSEMBLIES' : 'X5 · COMPLETE DRIVETRAIN';
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', button.dataset.view === cameraView));
  $('rotate').setAttribute('aria-pressed', rotating);
  $('rotate').setAttribute('aria-label', rotating ? 'Pause rotation' : 'Rotate model');
  $('play').textContent = playing ? 'Pause flow' : 'Play flow';
  $('play').setAttribute('aria-pressed', playing);
  $('layout').value = state.layout;
  $('layoutNote').hidden = state.layout === 'chain';
  invalidate();
}
function setLayers(ids) {
  state.visible = [...ids];
  clearSelection(false);
  fitPending = true;
  updateUI();
}
for (const system of systems) {
  const row = document.createElement('div'); row.className = 'system-row';
  const button = document.createElement('button'); button.className = 'system-name';
  button.title = `Show only ${system.name.toLowerCase()}`;
  button.setAttribute('aria-label', button.title);
  const dot = document.createElement('span'); dot.className = 'system-dot'; dot.style.setProperty('--system-color', system.color); dot.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.textContent = system.name;
  const count = document.createElement('span'); count.className = 'system-count'; count.textContent = system.parts.length;
  button.append(dot, name, count); button.onclick = () => setLayers([system.id]);
  const label = document.createElement('label'); label.className = 'toggle-target';
  const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'system-toggle'; input.id = `layer-${system.id}`;
  input.setAttribute('aria-label', `Show ${system.name.toLowerCase()}`);
  input.onchange = () => setLayers(input.checked ? [...state.visible, system.id] : state.visible.filter(id => id !== system.id));
  label.append(input); row.append(button, label); $('systems').append(row);
}
$('partCount').textContent = data.length - 1;
for (const button of document.querySelectorAll('[data-preset]')) button.onclick = () => setLayers(presets[button.dataset.preset]);
$('hideAll').onclick = () => setLayers([]);
$('showAll').onclick = () => setLayers(presets.all);

function closeLayers(restoreFocus = true) {
  const wasOpen = $('layersPanel').classList.contains('mobile-open');
  $('layersPanel').classList.remove('mobile-open'); $('layersOpen').setAttribute('aria-expanded', 'false');
  if (wasOpen && restoreFocus) $('layersOpen').focus();
}
$('layersOpen').onclick = () => {
  if ($('layersPanel').classList.contains('mobile-open')) return closeLayers();
  closeDetails(false); $('layersPanel').classList.add('mobile-open'); $('layersOpen').setAttribute('aria-expanded', 'true'); $('layersClose').focus();
};
$('layersClose').onclick = () => closeLayers();
function openDialog(id) { closeLayers(false); $(id).showModal(); }
function wireDialog(id, openId, closeId) {
  $(openId).onclick = () => openDialog(id);
  $(closeId).onclick = () => $(id).close();
  $(id).addEventListener('click', event => {
    if (event.target !== $(id)) return;
    const r = $(id).getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $(id).close();
  });
}
wireDialog('info', 'about', 'closeInfo');
wireDialog('sourcesDialog', 'sources', 'closeSources');
wireDialog('motionDialog', 'motionOpen', 'closeMotion');
wireDialog('searchDialog', 'searchOpen', 'closeSearch');
$('searchOpen').setAttribute('aria-label', 'Find a component');
$('motionOpen').setAttribute('aria-label', 'Power flow');
function openSearch() { renderSearch(); openDialog('searchDialog'); $('searchInput').focus(); }
$('searchOpen').onclick = openSearch; $('browseParts').onclick = openSearch;
function renderSearch() {
  const results = findParts(data, $('searchInput').value);
  $('parts').replaceChildren();
  $('searchCount').textContent = results.length ? `${results.length} ${results.length === 1 ? 'component' : 'components'} · Select to inspect` : 'No components match. Try “clutch”, “shaft”, or “engine”.';
  for (const part of results) {
    const system = systemFor(part[0]), button = document.createElement('button'); button.dataset.part = part[0];
    const dot = document.createElement('span'); dot.className = 'system-dot'; dot.style.setProperty('--system-color', system.color); dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.textContent = part[1];
    const meta = document.createElement('small'); meta.textContent = `${system.name} · ${part[0]}`; text.append(meta);
    const arrow = document.createElement('span'); arrow.className = 'result-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    button.append(dot, text, arrow); button.onclick = () => { $('searchDialog').close(); select(part[0], true); };
    $('parts').append(button);
  }
}
$('searchInput').oninput = renderSearch;
$('searchDialog').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); $('searchDialog').close(); return; }
  const buttons = [...$('parts').children], index = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : index - 1;
    if (next < 0) $('searchInput').focus(); else buttons[next]?.focus();
  } else if (event.key === 'Enter' && document.activeElement === $('searchInput')) { event.preventDefault(); buttons[0]?.click(); }
});
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.matches('input, textarea, select, [contenteditable=true]')) { event.preventDefault(); openSearch(); }
  if (event.key === 'Escape') {
    if ($('layersPanel').classList.contains('mobile-open')) closeLayers(); else clearSelection();
  }
});

function closeDetails(restoreFocus = true) {
  const containedFocus = $('detail').contains(document.activeElement);
  $('detail').hidden = true; document.body.classList.remove('detail-open'); fitPending = true; invalidate();
  if (containedFocus && restoreFocus) $('searchOpen').focus();
}
function clearSelection(restoreFocus = true) {
  state.selected = 'overview'; state.isolate = false;
  closeDetails(restoreFocus); fitPending = true; updateUI();
}
function select(id, focusHeading = false) {
  const part = data.find(part => part[0] === id); if (!part || id === 'overview') return clearSelection();
  state.selected = id; state.isolate = false; rotating = false;
  const system = systemFor(id);
  if (!state.visible.includes(system.id)) state.visible.push(system.id);
  if (internals.some(part => part[0] === id)) state.cutaway = id !== 'casecover';
  closeLayers(false);
  $('partNumber').textContent = system.name.toUpperCase();
  $('partTitle').textContent = part[1]; $('partTagline').textContent = part[2]; $('partText').textContent = part[3]; $('watch').textContent = part[4]; $('partId').textContent = id;
  updateReference(id);
  $('detail').hidden = false; document.body.classList.add('detail-open'); $('detail').querySelector('.detail-scroll').scrollTop = 0;
  $('announcement').textContent = `${part[1]} selected. ${system.name}.`;
  if (focusHeading) $('partTitle').focus({preventScroll: true});
  fitPending = true; updateUI();
}
$('closeDetail').onclick = () => clearSelection(); $('clearSelection').onclick = () => clearSelection();
$('isolate').onclick = () => { state.isolate = !state.isolate; state.explode = 0; fitPending = true; updateUI(); };
$('focus').onclick = () => { fitPending = true; invalidate(); };
function reset() {
  Object.assign(state, {selected: 'overview', visible: [...presets.all], isolate: false, explode: 0, cutaway: false, flow: true, layout: 'chain'});
  theta = Math.PI - .74; phi = 1.05; cameraView = 'overview'; rotating = false;
  closeLayers(false); clearSelection(false); $('searchInput').value = ''; fitPending = true; updateUI();
  $('announcement').textContent = 'View reset. All systems visible and assemblies joined.';
}
$('reset').onclick = reset;
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => {
  cameraView = button.dataset.view;
  [theta, phi] = {overview: [Math.PI - .74, 1.05], front: [Math.PI, Math.PI / 2], top: [0, .04], side: [Math.PI / 2, Math.PI / 2]}[cameraView];
  rotating = false; fitPending = true; updateUI();
};
$('rotate').onclick = () => { rotating = !rotating; cameraView = ''; updateUI(); };
$('zoomIn').onclick = () => { $('hoverLabel').hidden = true; radiusGoal = Math.max(.35, radiusGoal * .8); fitPending = false; invalidate(); };
$('zoomOut').onclick = () => { $('hoverLabel').hidden = true; radiusGoal = Math.min(70, radiusGoal * 1.25); fitPending = false; invalidate(); };
$('cutaway').onchange = event => { state.cutaway = event.target.checked; updateUI(); };
$('flow').onchange = event => { state.flow = event.target.checked; updateUI(); };
$('explode').oninput = event => { state.explode = +event.target.value / 100; rotating = false; fitPending = true; updateUI(); };

let referenceKeys=[];
function showReference(key,keys=referenceKeys) {
  referenceKeys=keys.includes(key)?keys:[key];
  $('referenceSelect').replaceChildren(...referenceKeys.map(k=>{const o=document.createElement('option');o.value=k;o.textContent=references[k].short||references[k].title;return o;}));
  $('referenceSelect').value=key;
  const index=referenceKeys.indexOf(key);
  $('referenceCount').textContent=`${index+1} / ${referenceKeys.length}`;
  $('referencePrevious').disabled=index===0;$('referenceNext').disabled=index===referenceKeys.length-1;
  $('referenceNavigation').hidden=referenceKeys.length<2;
  const ref = references[key]; $('referenceTitle').textContent = ref.title; $('referenceImage').src = ref.image; $('referenceImage').alt = ref.title;
  $('referenceCaption').textContent = ref.note; $('referenceSource').textContent = ref.sourceLabel || 'Supplied reference'; $('referenceSource').href = ref.url || ref.image; if(!$('referenceDialog').open)openDialog('referenceDialog');
}
$('referenceSelect').onchange=event=>showReference(event.target.value);
$('referencePrevious').onclick=()=>showReference(referenceKeys[referenceKeys.indexOf($('referenceSelect').value)-1]);
$('referenceNext').onclick=()=>showReference(referenceKeys[referenceKeys.indexOf($('referenceSelect').value)+1]);
function updateReference(id) {
  const keys = componentRefs[id] || ['chassis'], ref = references[keys[0]];
  $('referenceThumb').src = ref.image; $('referenceThumb').alt = ref.title; $('referenceName').textContent = ref.title; $('referenceOpen').onclick = () => showReference(keys[0],keys);
  $('referenceOptions').replaceChildren();
  for (const key of keys.slice(1,keys.length>5?3:undefined)) { const button = document.createElement('button'); button.textContent = references[key].short || references[key].title; button.onclick = () => showReference(key,keys); $('referenceOptions').append(button); }
  if(keys.length>5){const button=document.createElement('button');button.textContent=`Browse ${keys.length} images`;button.onclick=()=>showReference(keys[0],keys);$('referenceOptions').append(button);}
}
$('closeReference').onclick = () => $('referenceDialog').close();
for (const row of inventory) {
  const tr = document.createElement('tr');
  for (const value of [row.part, row.change]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
  const td = document.createElement('td');
  for (const key of row.refs) { const ref = references[key], a = document.createElement('a'); a.href = ref.url || ref.image; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ref.sourceLabel || ref.title; td.append(a, document.createElement('br')); }
  tr.append(td); $('inventoryRows').append(tr);
}
function updateScenario() {
  [...$('scenarios').children].forEach((button, i) => button.setAttribute('aria-pressed', i === scenario));
  $('scenarioText').textContent = scenarios[scenario][2]; invalidate();
}
scenarios.forEach((item, i) => { const button = document.createElement('button'); button.textContent = item[1]; button.onclick = () => { scenario = i; updateScenario(); }; $('scenarios').append(button); });
function updateMode() {
  $('modeText').textContent = {Comfort: 'Comfort · xDrive remains available and adjusts distribution automatically.', Sport: 'Sport · A sportier driving response does not select rear-wheel drive. No exact mode-specific torque split is assumed.', 'Eco Pro': 'Eco Pro · Efficiency-oriented driving settings do not switch off xDrive availability. Coasting is represented separately.'}[$('mode').value];
}
$('mode').onchange = updateMode;
$('play').onclick = () => { playing = !playing; updateUI(); };
$('layout').onchange = event => { state.layout = event.target.value; updateUI(); };
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { playing = false; rotating = false; updateUI(); } });
document.addEventListener('visibilitychange', () => { last = 0; if (!document.hidden) invalidate(); });
updateScenario(); updateMode(); updateUI();

// Keep search/references usable even if a bundled body asset cannot load.
let modelAssetFailed = false;
try {
  let buildDrivetrain;
  try { ({buildDrivetrain} = await import('./model.js')); }
  catch (error) { modelAssetFailed = true; throw error; }
  renderer = new T.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new T.Scene(); camera = new T.PerspectiveCamera(40, 1, .02, 200);
  scene.add(new T.HemisphereLight(0xffffff, 0x657681, 2.4));
  const key = new T.DirectionalLight(0xf3f7ff, 3.4); key.position.set(5, 8, -3); scene.add(key);
  const rim = new T.DirectionalLight(0xb8dfd4, 1.8); rim.position.set(-5, 3, 4); scene.add(rim);
  model = buildDrivetrain(scene);
  $('viewport').append(renderer.domElement); $('loading').remove();
  wireCanvas();
  new ResizeObserver(() => { resize(); fitPending = true; invalidate(); }).observe($('viewport'));
  resize(); updateUI();
} catch (error) {
  console.error(error); renderer?.dispose(); renderer = null;
  const loading = $('loading'); loading.dataset.error = 'true'; loading.setAttribute('role', 'alert');
  loading.replaceChildren();
  const title = document.createElement('strong'); title.textContent = modelAssetFailed ? 'The vehicle model could not load' : 'The 3D view needs WebGL2';
  const note = document.createElement('p'); note.textContent = modelAssetFailed ? 'Reload the viewer or restore the bundled model files. Component search and references are still available.' : 'Enable graphics acceleration or try another browser. You can still search components and read their references.';
  const retry = document.createElement('button'); retry.textContent = 'Reload viewer'; retry.onclick = () => location.reload();
  loading.append(title, note, retry);
}
function resize() {
  if (!renderer) return;
  const rect = $('viewport').getBoundingClientRect();
  renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height)); camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix();
}
function selectionBounds() {
  const box = new T.Box3(); model.world.updateMatrixWorld(true);
  const source = state.selected === 'overview' ? model.world : model.groups[state.selected];
  source.traverseVisible(object => {
    if (!object.geometry || object.userData.flow) return;
    object.geometry.computeBoundingBox(); box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  if (box.isEmpty()) box.setFromCenterAndSize(new T.Vector3(0, .8, 0), new T.Vector3(2.5, 2, 5.5));
  return box;
}
function fitCamera() {
  const bounds = selectionBounds();
  bounds.getCenter(targetGoal);
  const tanFov = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  const direction = new T.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
  const right = new T.Vector3(Math.cos(theta), 0, -Math.sin(theta));
  const up = new T.Vector3().crossVectors(direction, right);
  let distance = .6;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new T.Vector3(x, y, z).sub(targetGoal), depth = point.dot(direction);
    distance = Math.max(distance, depth + Math.abs(point.dot(right)) / (tanFov * camera.aspect), depth + Math.abs(point.dot(up)) / tanFov);
  }
  radiusGoal = T.MathUtils.clamp(distance * 1.12, .6, 70);
  fitPending = false;
}
function animate(now) {
  frame = 0;
  const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
  if (playing) time += dt;
  if (rotating) theta += dt * .22;
  model.update({...state, time, strength: scenarios[scenario][3], coasting: scenario === 4});
  if (fitPending) fitCamera();
  const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-Math.max(dt, .016) * 12);
  target.lerp(targetGoal, ease); radius += (radiusGoal - radius) * ease;
  camera.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(target); renderer.render(scene, camera);
  if (playing || rotating || target.distanceTo(targetGoal) > .001 || Math.abs(radiusGoal - radius) > .001) invalidate();
  else last = 0;
}
function wireCanvas() {
  const canvas = renderer.domElement, raycaster = new T.Raycaster();
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D drivetrain. Arrow keys rotate; plus and minus zoom. Search provides keyboard component selection.');
  function pick(x, y) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(model.world.children, true).find(hit => {
      if (hit.object.userData.flow) return false;
      const id = hit.object.userData.componentId;
      if (!id || (id === 'bodywork' && state.selected !== 'bodywork' && visibleParts().some(part => part[0] !== 'bodywork'))) return false;
      for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
      return true;
    });
    return hit?.object.userData.componentId;
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    rotating = false; $('hoverLabel').hidden = true;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    taps.down(event.pointerId, event.clientX, event.clientY, pointers.size); canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    updateUI();
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType !== 'mouse') return;
      const id = pick(event.clientX, event.clientY); canvas.style.cursor = id ? 'pointer' : 'grab';
      $('hoverLabel').hidden = !id;
      if (id) { $('hoverLabel').textContent = data.find(part => part[0] === id)?.[1] || ''; $('hoverLabel').style.left = `${Math.min(event.clientX + 14, innerWidth - 230)}px`; $('hoverLabel').style.top = `${event.clientY + 16}px`; }
      return;
    }
    taps.move(event.pointerId, event.clientX, event.clientY);
    const prev = pointers.get(event.pointerId); pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
      radiusGoal = T.MathUtils.clamp(radiusGoal * (pinch || distance) / Math.max(distance, 1), .35, 70); pinch = distance;
    } else if (pointers.size === 1) { theta -= (event.clientX - prev.x) * .007; phi = T.MathUtils.clamp(phi + (event.clientY - prev.y) * .007, .04, Math.PI - .04); }
    cameraView = ''; updateUI();
  });
  canvas.addEventListener('pointerup', event => {
    if (!pointers.has(event.pointerId)) return;
    const tap = taps.up(event.pointerId, event.clientX, event.clientY); pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (tap) { const id = pick(event.clientX, event.clientY); if (id) select(id); }
  });
  for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => { pointers.delete(event.pointerId); taps.cancel(); });
  canvas.addEventListener('pointerleave', () => $('hoverLabel').hidden = true);
  canvas.addEventListener('wheel', event => { event.preventDefault(); $('hoverLabel').hidden = true; radiusGoal = T.MathUtils.clamp(radiusGoal * Math.exp(event.deltaY * .001), .35, 70); fitPending = false; invalidate(); }, {passive: false});
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault(); rotating = false; cameraView = '';
    if (event.key === 'ArrowLeft') theta -= .1;
    if (event.key === 'ArrowRight') theta += .1;
    if (event.key === 'ArrowUp') phi = Math.max(.04, phi - .1);
    if (event.key === 'ArrowDown') phi = Math.min(Math.PI - .04, phi + .1);
    if (event.key === '+' || event.key === '=') radiusGoal = Math.max(.35, radiusGoal * .85);
    if (event.key === '-') radiusGoal = Math.min(70, radiusGoal * 1.15);
    updateUI();
  });
}
