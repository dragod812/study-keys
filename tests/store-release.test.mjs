import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseDecision, release, compareVersions } from '../scripts/store-release.mjs';
const revision = (state, version) => ({ state, distributionChannels: [{ crxVersion: version }] });
test('release defers other pending reviews and skips already released versions', () => {
  assert.equal(releaseDecision({ submittedItemRevisionStatus: revision('PENDING_REVIEW', '1.7.2') }, '1.7.4.33'), 'deferred');
  assert.equal(releaseDecision({ submittedItemRevisionStatus: revision('STAGED', '1.7.4.33') }, '1.7.4.33'), 'submitted');
  assert.equal(releaseDecision({ publishedItemRevisionStatus: revision('PUBLISHED', '1.8.0') }, '1.7.4.33'), 'published');
  assert.throws(() => releaseDecision({ takenDown: true }, '1.7.4'));
  assert.throws(() => releaseDecision({ submittedItemRevisionStatus: revision('REJECTED', '1.7.3') }, '1.7.4'));
  assert.equal(compareVersions('1.7.4.33', '1.7.4'), 1);
});
test('uploads, waits for processing, then submits with automatic publication', async () => {
  const calls = [], replies = [{}, { uploadState: 'IN_PROGRESS' }, { lastAsyncUploadState: 'SUCCEEDED' }, { state: 'PENDING_REVIEW' }];
  const result = await release({ token: 'test', publisher: 'publisher', item: 'jcjililghkknjbifgcnnkipiblmmmhid', version: '1.7.4.33', zip: new Uint8Array(), sleep: async () => {}, fetchImpl: async (url, options) => { calls.push([url, options]); return { ok: true, json: async () => replies.shift() }; } });
  assert.equal(result, 'submitted');
  assert.equal(calls.length, 4);
  assert.ok(calls[1][0].includes('/upload/v2/'));
  assert.deepEqual(JSON.parse(calls[3][1].body), { publishType: 'DEFAULT_PUBLISH' });
});
test('failed uploads never publish and HTTP errors never echo credentials', async () => {
  let calls = 0;
  await assert.rejects(release({ token: 'secret', publisher: 'publisher', item: 'jcjililghkknjbifgcnnkipiblmmmhid', version: '1.7.4', zip: new Uint8Array(), fetchImpl: async () => ({ ok: true, json: async () => ++calls === 1 ? {} : { uploadState: 'FAILED' } }) }), /nothing submitted/);
  assert.equal(calls, 2);
});
