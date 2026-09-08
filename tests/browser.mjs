// Optional browser gate: install Playwright, or set PLAYWRIGHT_MODULE to its module entry.
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAtlasServer} from '../server.mjs';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = createAtlasServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const artifacts = await mkdtemp(path.join(tmpdir(), 'xdrive-browser-'));
let browser;
try {
  browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport: {width: 1440, height: 960}, reducedMotion: 'reduce'});
  const paint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.locator('canvas').waitFor();
  assert.equal(await page.locator('#loading').count(), 0);
  assert.match(await page.locator('#visibleCount').innerText(), /19 assemblies/);
  await page.screenshot({path: path.join(artifacts, 'desktop-overview.png')});
  await page.getByRole('button', {name: 'Hide all', exact: true}).click();
  assert.equal(await page.locator('#emptyScene').isVisible(), true);
  await page.keyboard.press('/');
  await page.getByRole('searchbox').fill('clutch pack');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#partTitle').innerText(), 'Clutch pack');
  assert.equal(await page.locator('#isolate').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('#layer-transfer').isChecked(), true);
  assert.match(await page.locator('#visibleCount').innerText(), /10 assemblies/);
  await page.getByRole('button', {name: 'Isolate component', exact: true}).click();
  assert.match(await page.locator('#visibleCount').innerText(), /1 assembly/);
  await page.screenshot({path: path.join(artifacts, 'desktop-isolated.png')});
  await page.getByRole('button', {name: 'Show surrounding systems', exact: true}).click();
  assert.match(await page.locator('#visibleCount').innerText(), /10 assemblies/);
  await page.getByRole('button', {name: 'Open selected component reference'}).click();
  await page.locator('#referenceImage').evaluate(image => image.decode());
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Assemble and reset'}).click();
  assert.equal(await page.locator('#detail').isVisible(), false);
  assert.equal(await page.locator('#explode').inputValue(), '0');
  assert.equal(await page.locator('#cutaway').isChecked(), false);
  assert.equal(await page.locator('#flow').isChecked(), true);
  assert.match(await page.locator('#visibleCount').innerText(), /19 assemblies/);
  await page.getByRole('button', {name: 'Find a component', exact: true}).click();
  await page.getByRole('searchbox').fill('no-such-component');
  assert.match(await page.locator('#searchCount').innerText(), /No components match/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Power flow', exact: true}).click();
  assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', {name: 'Coasting', exact: true}).click();
  assert.match(await page.locator('#scenarioText').innerText(), /unpowered coasting/);
  await page.locator('#layout').selectOption('gears');
  assert.equal(await page.locator('#layoutNote').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Assemble and reset'}).click();
  assert.equal(await page.locator('#layout').inputValue(), 'chain');
  // A real pointer drag returning to its starting point must not select.
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width / 2 + 70, canvas.y + canvas.height / 2, {steps: 5});
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2, {steps: 5}); await page.mouse.up();
  assert.equal(await page.locator('#detail').isVisible(), false);
  // Find an actual rendered component through its hover hit, then select it.
  let hit;
  for (let y = .3; y <= .7 && !hit; y += .1) for (let x = .3; x <= .7 && !hit; x += .1) {
    const point = {x: canvas.x + canvas.width * x, y: canvas.y + canvas.height * y};
    await page.mouse.move(point.x, point.y);
    if (await page.locator('#hoverLabel').isVisible()) hit = point;
  }
  assert.ok(hit, 'a rendered component can be picked');
  await page.mouse.click(hit.x, hit.y);
  assert.equal(await page.locator('#detail').isVisible(), true);
  await page.getByRole('button', {name: 'Assemble and reset'}).click();
  await paint();
  // The body opens the requested trim reference and renders in every view.
  await page.keyboard.press('/');
  await page.getByRole('searchbox').fill('bodywork');await page.keyboard.press('Enter');
  assert.match(await page.locator('#partTagline').innerText(),/G05 LCI.*M Sport/);
  assert.match(await page.locator('#referenceThumb').getAttribute('src'),/body-m-sport/);
  await page.getByRole('button', {name: 'Isolate component', exact: true}).click();
  assert.match(await page.locator('#visibleCount').innerText(),/1 assembly/);
  for(const view of ['front','side','overview']) {
    await page.locator(`[data-view="${view}"]`).click();await paint();
    await page.screenshot({path:path.join(artifacts,`body-${view}.png`)});
  }
  await page.getByRole('button', {name: 'Open selected component reference'}).click();
  await page.locator('#referenceImage').evaluate(image=>image.decode());
  assert.match(await page.locator('#referenceTitle').innerText(),/G05 LCI M Sport/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Assemble and reset'}).click();await paint();
  // The LCI engine has variant-specific references, mounts and a working cutaway.
  await page.keyboard.press('/');await page.getByRole('searchbox').fill('B58B30M2');await page.keyboard.press('Enter');
  assert.match(await page.locator('#partTagline').innerText(),/B58B30M2/);
  await page.getByRole('button',{name:'Isolate component',exact:true}).click();await paint();
  const assembledEngine=await page.locator('canvas').screenshot({path:path.join(artifacts,'engine-assembled.png')});
  await page.locator('#cutaway').check();await paint();
  assert.ok(!assembledEngine.equals(await page.locator('canvas').screenshot({path:path.join(artifacts,'engine-cutaway.png')})),'engine cutaway changes the rendered assembly');
  await page.getByRole('button',{name:'Open selected component reference'}).click();
  const engineReferences=await page.locator('#referenceSelect option').evaluateAll(options=>options.map(o=>o.value));
  assert.equal(engineReferences.length,28);
  for(const key of engineReferences){await page.locator('#referenceSelect').selectOption(key);await page.locator('#referenceImage').evaluate(image=>image.decode());}
  await page.locator('#referenceSelect').selectOption('engine220271');
  assert.match(await page.locator('#referenceTitle').innerText(),/Engine Suspension/);
  await page.getByRole('button',{name:'Previous reference image',exact:true}).click();
  assert.equal(await page.locator('#referenceSelect').inputValue(),'engine');
  assert.equal(await page.getByRole('button',{name:'Previous reference image',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Next reference image',exact:true}).click();
  assert.equal(await page.locator('#referenceSelect').inputValue(),'engine220271');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await page.locator('#referenceImage').evaluate(image=>image.decode());
    const dialog=await page.locator('#referenceDialog').boundingBox();
    for(const id of ['referenceSelect','referencePrevious','referenceNext']){const box=await page.locator('#'+id).boundingBox();assert.ok(box.x>=dialog.x&&box.x+box.width<=dialog.x+dialog.width,`${width}: ${id} stays inside dialog`);assert.ok(box.height>=44);}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(artifacts,`engine-references-${width}.png`)});
  }
  await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'Assemble and reset'}).click();await paint();
  // Scroll and buttons share the same limit: Zoom out must never zoom back in.
  const zoomCanvas = await page.locator('canvas').boundingBox();
  await page.mouse.move(zoomCanvas.x + zoomCanvas.width / 2, zoomCanvas.y + zoomCanvas.height / 2);
  // mouse.wheel returns before Chromium dispatches the event. Wait for that
  // event before comparing the resulting frame on the larger body mesh.
  await page.evaluate(()=>{
    window.atlasWheelHandled=false;
    document.querySelector('canvas').addEventListener('wheel',()=>{window.atlasWheelHandled=true;},{once:true});
  });
  await page.mouse.wheel(0, 10000);
  await page.waitForFunction(()=>window.atlasWheelHandled);
  await paint();
  const furthestView = await page.locator('canvas').screenshot({path:path.join(artifacts,'zoom-limit-before.png')});
  await page.getByRole('button', {name: 'Zoom out', exact: true}).click();
  await paint();
  assert.ok(furthestView.equals(await page.locator('canvas').screenshot({path:path.join(artifacts,'zoom-limit-after.png')})), 'Zoom out preserves the maximum scroll distance');

  for (const [width, height] of [[1024,768], [390,844], [375,812], [320,568], [844,390], [667,375], [568,320]]) {
    await page.setViewportSize({width, height});
    await page.getByRole('button', {name: 'Assemble and reset'}).click();
    await page.screenshot({path: path.join(artifacts, `${width}-overview.png`)});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: no horizontal overflow`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), false, `${width}: no vertical overflow`);
    if (width <= 900) {
      await page.getByRole('button', {name: 'Systems', exact: true}).click();
      assert.equal(await page.locator('#layersPanel').isVisible(), true);
      await page.getByRole('button', {name: 'Transfer', exact: true}).click();
      assert.match(await page.locator('#visibleCount').innerText(), /10 assemblies/);
      await page.getByRole('button', {name: 'Close systems', exact: true}).click();
    }
    await page.getByRole('button', {name: 'Find a component', exact: true}).click();
    await page.getByRole('searchbox').fill('clutch');
    await page.locator('[data-part=clutch]').click();
    await page.getByRole('button', {name: 'Isolate component', exact: true}).click();
    const viewport = await page.locator('#viewport').boundingBox(), details = await page.locator('#detail').boundingBox();
    assert.ok(viewport.width > 100 && viewport.height > 100, `${width}: usable model area`);
    assert.ok(viewport.x + viewport.width <= details.x || viewport.y + viewport.height <= details.y, `${width}: details do not cover the model`);
    const beforeZoom = await page.locator('canvas').screenshot();
    await page.getByRole('button', {name: 'Zoom in', exact: true}).click();
    await paint();
    assert.ok(!beforeZoom.equals(await page.locator('canvas').screenshot()), `${width}: zoom button changes the rendered model`);
    assert.equal(await page.locator('#isolate').getAttribute('aria-pressed'), 'true', `${width}: zoom retains isolation`);
    await page.getByRole('button', {name: 'Zoom out', exact: true}).click();
    await paint();
    if (width <= 600 && height > 560) {
      const zoom = await page.locator('.view-controls').boundingBox();
      assert.ok(zoom.y + zoom.height <= details.y, `${width}: zoom buttons stay above details`);
      assert.ok(viewport.x + viewport.width <= zoom.x, `${width}: zoom buttons stay beside the model`);
    }
    await page.screenshot({path: path.join(artifacts, `${width}-isolated.png`)});
    await page.getByRole('button', {name: 'Clear selection', exact: true}).click();
    await page.locator('#explode').fill('100');
    assert.equal(await page.locator('#explodeValue').innerText(), '100%');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({path: path.join(artifacts, `${width}-exploded.png`)});
  }
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  const fallback = await browser.newPage({viewport: {width: 390, height: 844}});
  await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await fallback.goto(base);
  await fallback.getByRole('button', {name: 'Reload viewer', exact: true}).waitFor();
  await fallback.getByRole('button', {name: 'Find a component', exact: true}).click();
  await fallback.getByRole('searchbox').fill('engine'); await fallback.locator('[data-part=engine]').click();
  assert.equal(await fallback.locator('#partTitle').innerText(), 'B58 inline-six engine');
  const missing=await browser.newPage({viewport:{width:390,height:844}});
  await missing.route('**/models/g05-source.js',route=>route.abort());
  await missing.goto(base);
  await missing.getByText('The vehicle model could not load',{exact:true}).waitFor();
  assert.equal(await missing.locator('canvas').count(),0,'missing source never falls back to a generic car');
  await missing.getByRole('button',{name:'Find a component',exact:true}).click();
  await missing.getByRole('searchbox').fill('bodywork');await missing.locator('[data-part=bodywork]').click();
  assert.match(await missing.locator('#partTagline').innerText(),/M Sport/);
  console.log('PASS: search, layers, selection, isolation, B58B30M2 cutaway and 28 engine references, reset, scenarios, pointer picking, G05 LCI M Sport body views, reduced motion, missing-model/WebGL recovery, and 8 viewport sizes.');
  console.log(`Screenshots: ${artifacts}`);
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
