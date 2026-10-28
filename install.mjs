// Installs or updates Kompass for the current user on Windows, macOS and Linux.
//
//   node install.mjs                 install or update (run it again after downloading a new version)
//   node install.mjs --uninstall     remove the program; your data stays where it is
//
// Options: --rebuild (build the interface even if it exists), --no-shortcuts, --no-start,
// --dir <path> (install somewhere else; mainly for testing).
// Windows users double-click install.cmd, macOS and Linux users run install.sh; both call this file.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir, systemIsGerman } from './server/platform.mjs';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const t = (en, de) => (systemIsGerman() ? de : en);
const say = (en, de) => console.log(t(en, de));
function fail(en, de) {
  console.error(`\n${t(en, de)}`);
  process.exit(1);
}

const home = os.homedir();
const platform = process.platform;
const PORT = process.env.KOMPASS_PORT ?? '4747';
const version = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')).version;

// Where the program goes. The data folder is separate, so updating never touches it.
const macApp = option('--dir') ?? path.join(home, 'Applications', 'Kompass.app');
const target =
  platform === 'darwin'
    ? path.join(macApp, 'Contents', 'Resources', 'app')
    : option('--dir') ??
      (platform === 'win32'
        ? path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'Programs', 'Kompass')
        : path.join(home, '.local', 'lib', 'kompass'));
const winExe = path.join(target, 'Kompass.exe');
const linuxBin = path.join(target, 'kompass');
const linuxDesktop = path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'applications', 'kompass.desktop');
const linuxIcons = path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'icons', 'hicolor');
const linuxLink = path.join(home, '.local', 'bin', 'kompass');

const run = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
const quiet = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { stdio: 'ignore', ...opts });
const shq = (s) => `'${s.replaceAll("'", `'\\''`)}'`;
const powershell = (script, env) =>
  run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, ...env } });

// A running Kompass would keep serving the old files, so ask it to stop first.
async function stopRunning() {
  try {
    const health = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) }).then((r) => r.json());
    if (health.app !== 'kompass') return;
    await fetch(`http://127.0.0.1:${PORT}/api/shutdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(1500),
    });
    await new Promise((r) => setTimeout(r, 1000));
  } catch {}
}

// Windows shortcuts are only removed when they point to this installation.
const WIN_SHORTCUTS = `
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')) {
  $path = Join-Path $dir 'Kompass.lnk'
  if ($env:K_REMOVE) {
    if ((Test-Path $path) -and $shell.CreateShortcut($path).TargetPath -eq $env:K_EXE) { Remove-Item $path }
    continue
  }
  $link = $shell.CreateShortcut($path)
  $link.TargetPath = $env:K_EXE
  $link.WorkingDirectory = $env:K_DIR
  $link.IconLocation = "$env:K_EXE,0"
  $link.Description = $env:K_DESC
  $link.Save()
}`;

async function uninstall() {
  await stopRunning();
  if (platform === 'win32') powershell(WIN_SHORTCUTS, { K_REMOVE: '1', K_EXE: winExe });
  if (platform === 'darwin') fs.rmSync(macApp, { recursive: true, force: true });
  if (platform === 'linux') {
    for (const f of [linuxDesktop, linuxLink, path.join(linuxIcons, '256x256', 'apps', 'kompass.png'), path.join(linuxIcons, 'scalable', 'apps', 'kompass.svg')]) {
      fs.rmSync(f, { force: true });
    }
  }
  fs.rmSync(target, { recursive: true, force: true });
  say('Kompass has been removed.', 'Kompass wurde entfernt.');
  say(
    `Your data is still in ${dataDir()}. Delete that folder as well to remove everything.`,
    `Deine Daten liegen weiterhin in ${dataDir()}. Lösche auch diesen Ordner, um alles zu entfernen.`,
  );
}

function build() {
  const built = fs.existsSync(path.join(SRC, 'web', 'dist', 'index.html'));
  if (built && !flag('--rebuild')) {
    say('1/3 Interface is already built', '1/3 Oberfläche ist schon gebaut');
    return;
  }
  // Release downloads come with the interface built; a source download builds it once.
  say('1/3 Building the interface (takes about a minute)', '1/3 Oberfläche bauen (dauert etwa eine Minute)');
  const npm = (cmd) => run(cmd, { cwd: SRC, shell: true }).status === 0;
  if (!npm('npm install --no-fund --no-audit')) fail('npm install failed.', 'npm install ist fehlgeschlagen.');
  if (!npm('npm run build')) fail('The build failed.', 'Der Build ist fehlgeschlagen.');
}

function copyProgram() {
  say(`2/3 Copying the program to ${target}`, `2/3 Programm nach ${target} kopieren`);
  const same = path.resolve(SRC).toLowerCase() === path.resolve(target).toLowerCase();
  if (same) return;
  for (const item of ['server', 'launcher', path.join('web', 'dist'), 'LICENSE', 'package.json']) {
    const to = path.join(target, item);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(path.join(SRC, item), to, { recursive: true });
  }
}

function integrateWindows() {
  say('3/3 Creating Kompass.exe and shortcuts', '3/3 Kompass.exe und Verknüpfungen anlegen');
  const fw = path.join(process.env.WINDIR ?? 'C:\\Windows', 'Microsoft.NET');
  const csc = [path.join(fw, 'Framework64', 'v4.0.30319', 'csc.exe'), path.join(fw, 'Framework', 'v4.0.30319', 'csc.exe')].find((p) =>
    fs.existsSync(p),
  );
  if (!csc) fail('The C# compiler that ships with Windows was not found.', 'Der C#-Compiler, der zu Windows gehört, wurde nicht gefunden.');
  const res = run(csc, [
    '/nologo',
    '/target:winexe',
    '/optimize+',
    '/codepage:65001',
    `/win32icon:${path.join(target, 'launcher', 'kompass.ico')}`,
    '/reference:System.Windows.Forms.dll',
    `/out:${winExe}`,
    path.join(target, 'launcher', 'Launcher.cs'),
  ]);
  if (res.status !== 0) fail('Kompass.exe could not be compiled.', 'Kompass.exe konnte nicht kompiliert werden.');
  if (!flag('--no-shortcuts')) {
    powershell(WIN_SHORTCUTS, { K_EXE: winExe, K_DIR: target, K_DESC: t('Projects, content and goals', 'Projekte, Content und Ziele') });
  }
}

function integrateMac() {
  say(`3/3 Creating ${macApp}`, `3/3 ${macApp} anlegen`);
  const contents = path.join(macApp, 'Contents');
  fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true });
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true });
  fs.writeFileSync(
    path.join(contents, 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Kompass</string>
  <key>CFBundleDisplayName</key><string>Kompass</string>
  <key>CFBundleIdentifier</key><string>com.manypi.kompass</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Kompass</string>
  <key>CFBundleIconFile</key><string>kompass</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`,
  );
  // Finder starts apps without the shell's PATH, so Node's location is written into the app.
  const exe = path.join(contents, 'MacOS', 'Kompass');
  fs.writeFileSync(
    exe,
    `#!/bin/bash
NODE=${shq(process.execPath)}
[ -x "$NODE" ] || NODE="$(PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" command -v node)"
exec "$NODE" "$(dirname "$0")/../Resources/app/launcher/kompass.mjs"
`,
  );
  fs.chmodSync(exe, 0o755);

  // App icon from the committed 1024 px PNG; without it the app simply gets the generic icon.
  const png = path.join(target, 'launcher', 'icon-1024.png');
  const set = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kompass-')), 'kompass.iconset');
  fs.mkdirSync(set);
  for (const size of [16, 32, 128, 256, 512]) {
    quiet('sips', ['-z', String(size), String(size), png, '--out', path.join(set, `icon_${size}x${size}.png`)]);
    quiet('sips', ['-z', String(size * 2), String(size * 2), png, '--out', path.join(set, `icon_${size}x${size}@2x.png`)]);
  }
  quiet('iconutil', ['-c', 'icns', set, '-o', path.join(contents, 'Resources', 'kompass.icns')]);
  quiet('touch', [macApp]);
}

function integrateLinux() {
  say('3/3 Adding Kompass to the app menu', '3/3 Kompass zum App-Menü hinzufügen');
  fs.writeFileSync(
    linuxBin,
    `#!/bin/bash
NODE=${shq(process.execPath)}
[ -x "$NODE" ] || NODE="$(command -v node)"
exec "$NODE" ${shq(path.join(target, 'launcher', 'kompass.mjs'))} "$@"
`,
  );
  fs.chmodSync(linuxBin, 0o755);

  const dist = path.join(target, 'web', 'dist');
  for (const [from, dir, name] of [
    ['icon-256.png', '256x256', 'kompass.png'],
    ['favicon.svg', 'scalable', 'kompass.svg'],
  ]) {
    fs.mkdirSync(path.join(linuxIcons, dir, 'apps'), { recursive: true });
    fs.copyFileSync(path.join(dist, from), path.join(linuxIcons, dir, 'apps', name));
  }
  if (!flag('--no-shortcuts')) {
    fs.mkdirSync(path.dirname(linuxDesktop), { recursive: true });
    fs.writeFileSync(
      linuxDesktop,
      `[Desktop Entry]
Type=Application
Name=Kompass
Comment=Projects, content and goals
Comment[de]=Projekte, Content und Ziele
Exec="${linuxBin.replace(/(["`$\\])/g, '\\$1')}"
Icon=kompass
Terminal=false
Categories=Office;ProjectManagement;
StartupWMClass=Kompass
`,
    );
    quiet('update-desktop-database', [path.dirname(linuxDesktop)]);
    // Also available as a terminal command when ~/.local/bin is on the PATH.
    fs.mkdirSync(path.dirname(linuxLink), { recursive: true });
    fs.rmSync(linuxLink, { force: true });
    fs.symlinkSync(linuxBin, linuxLink);
  }
}

function start() {
  if (flag('--no-start')) return;
  const detached = { detached: true, stdio: 'ignore' };
  if (platform === 'win32') spawn(winExe, [], detached).unref();
  else if (platform === 'darwin') spawn('open', [macApp], detached).unref();
  else if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) spawn(linuxBin, [], detached).unref();
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  fail(
    `Kompass needs Node.js 22.13 or newer (found ${process.versions.node}). Please install the current LTS version from https://nodejs.org.`,
    `Kompass braucht Node.js 22.13 oder neuer (gefunden: ${process.versions.node}). Bitte die aktuelle LTS-Version von https://nodejs.org installieren.`,
  );
}
if (!['win32', 'darwin', 'linux'].includes(platform)) fail(`Unsupported system: ${platform}`, `Nicht unterstütztes System: ${platform}`);

if (flag('--uninstall')) {
  await uninstall();
} else {
  say(`Setting up Kompass ${version} ...`, `Kompass ${version} wird eingerichtet ...`);
  build();
  await stopRunning();
  copyProgram();
  if (platform === 'win32') integrateWindows();
  else if (platform === 'darwin') integrateMac();
  else integrateLinux();
  console.log('');
  say(
    platform === 'win32'
      ? 'Done. Start Kompass from the icon on your desktop or in the Start menu.'
      : platform === 'darwin'
        ? 'Done. Kompass is now in the Applications folder in your home folder (also findable with Spotlight).'
        : 'Done. Start Kompass from your app menu or with the command "kompass".',
    platform === 'win32'
      ? 'Fertig. Starte Kompass über das Symbol auf dem Desktop oder im Startmenü.'
      : platform === 'darwin'
        ? 'Fertig. Kompass liegt jetzt im Ordner „Programme“ in deinem Benutzerordner (auch über Spotlight zu finden).'
        : 'Fertig. Starte Kompass über das App-Menü oder mit dem Befehl „kompass“.',
  );
  say(`Your data is stored in ${dataDir()}`, `Deine Daten liegen in ${dataDir()}`);
  start();
}
