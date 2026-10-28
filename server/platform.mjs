// Everything that differs between Windows, macOS and Linux lives here.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const platform = process.platform;

/** Per-user folder for the database, backups and logs. KOMPASS_DATA overrides it. */
export function dataDir() {
  if (process.env.KOMPASS_DATA) return path.resolve(process.env.KOMPASS_DATA);
  if (platform === 'win32') return path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Kompass');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Kompass');
  return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'kompass');
}

/** Disposable files such as the app window's browser profile. */
function cacheDir() {
  if (platform === 'win32') return path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'Kompass');
  if (platform === 'darwin') return path.join(home, 'Library', 'Caches', 'Kompass');
  return path.join(process.env.XDG_CACHE_HOME || path.join(home, '.cache'), 'kompass');
}

/** True when the operating system's language is German; used where no browser is involved. */
export function systemIsGerman() {
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '';
  const locale = env && env !== 'C' && env !== 'POSIX' ? env : Intl.DateTimeFormat().resolvedOptions().locale;
  return locale.toLowerCase().startsWith('de');
}

/** Opens a folder in the file manager or a web link in the default browser. */
export function openPath(target) {
  const isUrl = /^https?:\/\//.test(target);
  const [cmd, args] =
    platform === 'win32'
      ? isUrl
        ? ['rundll32.exe', ['url.dll,FileProtocolHandler', target]]
        : ['explorer.exe', [target]]
      : platform === 'darwin'
        ? ['open', [target]]
        : ['xdg-open', [target]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
}

function onPath(names) {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const name of names) {
    for (const dir of dirs) {
      const candidate = path.join(dir, name);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {}
    }
  }
  return null;
}

/** A Chromium-based browser that can show Kompass as its own app window, or null. */
function findBrowser() {
  if (platform === 'win32') {
    const pf = process.env.ProgramFiles ?? 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    // Chrome first: Edge signs fresh profiles into the Windows Microsoft account and asks to sync.
    return (
      [
        path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(pf, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(local, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ].find((p) => fs.existsSync(p)) ?? null
    );
  }
  if (platform === 'darwin') {
    const apps = [
      'Google Chrome.app/Contents/MacOS/Google Chrome',
      'Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      'Brave Browser.app/Contents/MacOS/Brave Browser',
      'Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const app of apps) {
      for (const root of ['/Applications', path.join(home, 'Applications')]) {
        const p = path.join(root, app);
        if (fs.existsSync(p)) return p;
      }
    }
    return null;
  }
  return onPath([
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser',
    'brave-browser',
    'microsoft-edge-stable',
    'microsoft-edge',
  ]);
}

function profileDir(browser) {
  const name = path.basename(browser).replace(/\.exe$/i, '').replace(/\s+/g, '-');
  // Snap browsers (Ubuntu's Chromium) may only write to their own folder under ~/snap.
  if (browser.startsWith('/snap/bin/')) return path.join(home, 'snap', path.basename(browser), 'common', 'kompass-profile');
  return path.join(cacheDir(), `window-${name}`);
}

/**
 * Shows Kompass in a window of its own. Returns the browser process when one was started,
 * so the server can close it again; falls back to a tab in the default browser.
 */
export function openAppWindow(url) {
  const browser = findBrowser();
  if (!browser) {
    openPath(url);
    return null;
  }
  // A separate profile keeps the app window free of tabs, extensions and sign-in prompts.
  const child = spawn(
    browser,
    [
      `--app=${url}`,
      `--user-data-dir=${profileDir(browser)}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-search-engine-choice-screen',
      '--disable-sync',
      '--disable-features=Translate',
      '--window-size=1440,920',
      '--class=Kompass',
    ],
    { stdio: 'ignore', windowsHide: false },
  );
  child.on('error', () => openPath(url));
  return child;
}

/** Best-effort message box for problems that happen before any window exists. */
export function alertUser(message) {
  const env = { ...process.env, KOMPASS_MSG: message };
  const attempts =
    platform === 'win32'
      ? [
          [
            'powershell.exe',
            [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              "Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.MessageBox]::Show($env:KOMPASS_MSG, 'Kompass')",
            ],
          ],
        ]
      : platform === 'darwin'
        ? [['osascript', ['-e', 'display alert "Kompass" message (system attribute "KOMPASS_MSG")']]]
        : [
            ['zenity', ['--error', '--title=Kompass', `--text=${message}`]],
            ['kdialog', ['--title', 'Kompass', '--error', message]],
            ['notify-send', ['Kompass', message]],
          ];
  for (const [cmd, args] of attempts) {
    const res = spawnSync(cmd, args, { env, stdio: 'ignore', windowsHide: true });
    if (!res.error) return;
  }
  process.stderr.write(`${message}\n`);
}
