const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('production page exposes the Unity FaceInputFrame bridge', () => {
  assert.match(html, /window\.facelympicUnityBridge=faceBridge/);
  assert.match(html, /FaceInputReceiver','OnFaceInputFrame/);
  for (const field of ['timestampMs','faceDetected','quality','neutral','smile','boost','browRaise','headRoll','jawOpen','pucker']) {
    assert.match(html, new RegExp(field));
  }
});

test('phone diagnostics and existing Supabase leaderboard remain wired', () => {
  assert.match(html, /DEBUG_MODE/);
  assert.match(html, /yixigkpyncjmbfyaocjl\.supabase\.co/);
  assert.match(html, /fl_scores/);
});

test('local preview serves the debug query at the root page', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/?debug=1`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="techDebug"/);
});
