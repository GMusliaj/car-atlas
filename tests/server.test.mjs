import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtlasServer } from '../server.mjs';
import { references } from '../dist/references.js';

test('local backend serves the full frontend with module and image content types', async () => {
  const server = createAtlasServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const index = await fetch(base);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /type="module" src="app.js"/);
    for (const name of ['app.js', 'model.js', 'engine.js', 'engine-references.js', 'body.js', 'models/g05-source.js', 'catalogue.js', 'explorer.js', 'references.js', 'three.module.js']) {
      const response = await fetch(`${base}/${name}`);
      assert.equal(response.status, 200, name);
      assert.match(response.headers.get('content-type'), /text\/javascript/);
      assert.ok((await response.text()).length > 100);
    }
    for (const ref of Object.values(references)) {
      const response = await fetch(`${base}/${ref.image}`);
      assert.equal(response.status, 200, ref.image);
      assert.match(response.headers.get('content-type'), /^image\//);
      assert.ok((await response.arrayBuffer()).byteLength > 100);
    }
    assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'ok');
    assert.equal((await fetch(`${base}/server.mjs`)).status, 404);
    assert.equal((await fetch(`${base}/.openai/hosting.json`)).status, 403);
    assert.equal((await fetch(`${base}/%2e%2e%2fserver.mjs`)).status, 403);
    assert.equal((await fetch(`${base}/app.js`, {method:'POST'})).status, 405);
    assert.equal(await (await fetch(`${base}/app.js`, {method:'HEAD'})).text(), '');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
