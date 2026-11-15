import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function compareVersions(a, b) {
  const parse = v => {
    if (!/^\d+(\.\d+){0,3}$/.test(v)) throw Error('Invalid Chrome version');
    return v.split('.').map(Number);
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 4; i++) if ((x[i] || 0) !== (y[i] || 0)) return Math.sign((x[i] || 0) - (y[i] || 0));
  return 0;
}
const versions = revision => (revision?.distributionChannels || []).map(c => c.crxVersion);
export function releaseDecision(status, version) {
  if (status.takenDown) throw Error('Item taken down: resolve in the developer dashboard.');
  if (versions(status.publishedItemRevisionStatus).some(v => compareVersions(v, version) >= 0)) return 'published';
  const submitted = status.submittedItemRevisionStatus;
  if (['PENDING_REVIEW', 'STAGED'].includes(submitted?.state)) return versions(submitted).includes(version) ? 'submitted' : 'deferred';
  if (submitted?.state === 'REJECTED') throw Error('Previous submission rejected: inspect the developer dashboard before retrying.');
  return 'upload';
}
export async function release({ token, publisher, item, version, zip, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  if (!token || !/^[\w-]+$/.test(publisher || '') || !/^[a-p]{32}$/.test(item || '')) throw Error('Missing or invalid publishing configuration');
  const name = `publishers/${publisher}/items/${item}`;
  const call = async (suffix, options = {}, upload = false) => {
    const response = await fetchImpl(`https://chromewebstore.googleapis.com/${upload ? 'upload/' : ''}v2/${name}:${suffix}`, {
      ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers }, signal: AbortSignal.timeout(120000),
    });
    // Do not print response bodies: upstream errors can echo request credentials.
    if (!response.ok) throw Error(`Chrome Web Store ${suffix} failed (HTTP ${response.status}); inspect developer dashboard.`);
    return response.json();
  };
  const status = await call('fetchStatus');
  const decision = releaseDecision(status, version);
  if (decision !== 'upload') return decision;
  if (status.lastAsyncUploadState === 'IN_PROGRESS') return 'deferred';
  let upload = await call('upload', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: zip }, true);
  let state = upload.uploadState;
  for (let attempt = 0; ['IN_PROGRESS', 'UPLOAD_IN_PROGRESS'].includes(state) && attempt < 30; attempt++) {
    await sleep(10000);
    state = (await call('fetchStatus')).lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') throw Error(`Upload did not succeed (${state || 'unknown'}); nothing submitted.`);
  if (upload.crxVersion && upload.crxVersion !== version) throw Error('Uploaded version mismatch');
  const result = await call('publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }) });
  if (!['PENDING_REVIEW', 'PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(result.state)) throw Error(`Unexpected publish state: ${result.state}`);
  return result.state === 'PENDING_REVIEW' ? 'submitted' : 'published';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { version } = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
    const result = await release({ token: process.env.CWS_ACCESS_TOKEN, publisher: process.env.CWS_PUBLISHER_ID, item: 'jcjililghkknjbifgcnnkipiblmmmhid', version, zip: await readFile('study-keys-chrome.zip') });
    const message = `Chrome Web Store ${version}: ${result}.`;
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
