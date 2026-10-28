// Starts the server against an empty temporary data folder and checks the basics:
// it answers, starts without any data, saves and returns an item, and shuts down cleanly.
// Runs in CI on Windows, macOS and Linux:  node scripts/smoke-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'kompass-smoke-'));
const port = 4799;
const base = `http://127.0.0.1:${port}/api`;

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'server', 'index.mjs')], {
  env: { ...process.env, KOMPASS_DATA: data, KOMPASS_PORT: String(port) },
  stdio: 'inherit',
});
const exited = new Promise((resolve) => server.on('exit', resolve));

function check(ok, message) {
  if (!ok) {
    console.error(`FAIL: ${message}`);
    server.kill();
    process.exit(1);
  }
  console.log(`ok: ${message}`);
}
const json = (method, url, body) =>
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then((r) => r.json());

let up = false;
for (let i = 0; i < 40 && !up; i++) {
  up = await fetch(`${base}/health`).then((r) => r.ok, () => false);
  if (!up) await new Promise((r) => setTimeout(r, 250));
}
check(up, 'server answers');

const state = await json('GET', '/state');
check(['projects', 'tasks', 'posts', 'goals'].every((k) => state[k].length === 0), 'a fresh install has no data');

const project = await json('POST', '/projects', { name: 'Smoke test' });
const after = await json('GET', '/state');
check(after.projects.some((p) => p.id === project.id), 'items are saved');

const page = await fetch(`http://127.0.0.1:${port}/`).then((r) => r.text());
check(page.includes('<div id="root">'), 'the built interface is served');

await json('POST', '/shutdown', {});
const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('timeout'), 5000))]);
check(code === 0, 'server shuts down cleanly');
check(fs.existsSync(path.join(data, 'kompass.db')), 'database file is created in the data folder');
fs.rmSync(data, { recursive: true, force: true });
