import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('manifest.json'));
const count = Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim());
if (!Number.isInteger(count) || count < 1 || count > 65535 || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw Error('Cannot derive a valid Chrome build version');
manifest.version_name = manifest.version;
manifest.version += `.${count}`;
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`CI package version: ${manifest.version}`);
