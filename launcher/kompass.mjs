// Starts Kompass on Windows, macOS and Linux: reuses a running server or starts one in the
// background, which then opens the app window. The server stops by itself a few seconds after
// the last Kompass window is closed, so this script never has to stay around.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.KOMPASS_PORT ?? 4747);
const BASE = `http://127.0.0.1:${PORT}`;

// node:sqlite works without a flag from Node.js 22.13 on. Checked before importing anything that needs it.
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = major > 22 || (major === 22 && minor >= 13);

const { alertUser, dataDir, systemIsGerman } = await import('../server/platform.mjs');
const t = (en, de) => (systemIsGerman() ? de : en);

if (!nodeOk) {
  alertUser(
    t(
      `Kompass needs Node.js 22.13 or newer (found ${process.versions.node}). Please install the current LTS version from nodejs.org.`,
      `Kompass braucht Node.js 22.13 oder neuer (gefunden: ${process.versions.node}). Bitte die aktuelle LTS-Version von nodejs.org installieren.`,
    ),
  );
  process.exit(1);
}

if (!fs.existsSync(path.join(ROOT, 'web', 'dist', 'index.html'))) {
  alertUser(
    t(
      'The Kompass interface has not been built yet. Please run the installer in the Kompass folder once.',
      'Die Kompass-Oberfläche ist noch nicht gebaut. Bitte einmal das Installationsprogramm im Kompass-Ordner ausführen.',
    ),
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function healthy() {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(800) });
    return (await res.json()).app === 'kompass';
  } catch {
    return false;
  }
}

const askForWindow = () =>
  fetch(`${BASE}/api/open-window`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});

if (await healthy()) {
  await askForWindow();
  process.exit(0);
}

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'server', 'index.mjs')], {
  cwd: ROOT,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: { ...process.env, KOMPASS_PORT: String(PORT), KOMPASS_AUTO_EXIT: '1', KOMPASS_OPEN: '1' },
});
let exited = false;
server.on('exit', () => (exited = true));
server.unref();

// A server that exits right away usually lost a race against a second double-click; give the winner a moment.
for (let i = 0, afterExit = 0; i < 80 && afterExit < 12; i++) {
  if (await healthy()) {
    // Our server opens its own window. If it lost the race, ask the winner for one.
    if (exited) await askForWindow();
    process.exit(0);
  }
  if (exited) afterExit++;
  await sleep(250);
}

alertUser(
  t(
    `The Kompass server did not start. Details are in ${path.join(dataDir(), 'server.log')}`,
    `Der Kompass-Server ist nicht gestartet. Details stehen in ${path.join(dataDir(), 'server.log')}`,
  ),
);
process.exit(1);
