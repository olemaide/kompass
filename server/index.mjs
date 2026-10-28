import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, HttpError } from './db.mjs';
import { dataDir, openAppWindow, openPath } from './platform.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'web', 'dist');
const DATA_DIR = dataDir();
const PORT = Number(process.env.KOMPASS_PORT ?? 4747);
const HOST = '127.0.0.1';
const URL_BASE = `http://${HOST}:${PORT}/`;
const LOG_FILE = path.join(DATA_DIR, 'server.log');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

fs.mkdirSync(DATA_DIR, { recursive: true });

function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.map((p) => (p instanceof Error ? p.stack : String(p))).join(' ')}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

const store = openStore(DATA_DIR);
let backupDir = '';
try {
  backupDir = store.backup();
} catch (err) {
  log('Backup failed', err);
}

// Browser windows this server opened; closed again when the server stops.
const windows = new Set();
function openWindow() {
  const child = openAppWindow(URL_BASE);
  if (!child) return;
  windows.add(child);
  child.on('exit', () => windows.delete(child));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// Only answer requests addressed to this machine by name, which blocks DNS-rebinding tricks.
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readJson(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!(req.headers['content-type'] ?? '').includes('application/json')) {
      reject(new HttpError(415, 'Expected application/json'));
      return;
    }
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const method = req.method;
  const [head, id] = parts;

  if (head === 'health') return send(res, 200, { ok: true, app: 'kompass' });
  if (head === 'events' && method === 'GET') return openEventStream(req, res);
  if (head === 'state' && method === 'GET') return send(res, 200, store.snapshot());
  if (head === 'info' && method === 'GET') {
    return send(res, 200, { dataDir: DATA_DIR, dbFile: store.file, backupDir, version: VERSION });
  }

  if (head === 'export' && method === 'GET') {
    const stamp = new Date().toLocaleDateString('sv-SE');
    return send(res, 200, { app: 'kompass', exported_at: new Date().toISOString(), ...store.snapshot() }, {
      'Content-Disposition': `attachment; filename="kompass-export-${stamp}.json"`,
    });
  }

  // Everything below changes state and must be a JSON request (forces a CORS preflight for other origins).
  if (method === 'GET') throw new HttpError(404, 'Not found');
  const body = await readJson(req);

  if (head === 'import' && method === 'POST') {
    store.backup();
    store.importAll(body);
    return send(res, 200, store.snapshot());
  }
  if (head === 'batch' && method === 'POST') return send(res, 200, store.batch(body.ops));
  if (head === 'routine' && method === 'PUT') {
    store.setRoutine(String(body.cell_id), String(body.date), Boolean(body.done));
    return send(res, 200, { ok: true });
  }
  if (head === 'journal' && id && method === 'PUT') {
    store.saveJournal(id, body);
    return send(res, 200, { ok: true });
  }
  if (head === 'open-data' && method === 'POST') {
    openPath(DATA_DIR);
    return send(res, 200, { ok: true });
  }
  if (head === 'open-window' && method === 'POST') {
    // A second launch while Kompass is running just asks for another window.
    openWindow();
    return send(res, 200, { ok: true });
  }
  if (head === 'open-url' && method === 'POST') {
    // Hand web links to the default browser; the app window itself runs in an isolated profile.
    let target;
    try {
      target = new URL(String(body.url));
    } catch {
      throw new HttpError(400, 'Invalid URL');
    }
    if (!['http:', 'https:'].includes(target.protocol)) throw new HttpError(400, 'Only http(s) links');
    openPath(target.href);
    return send(res, 200, { ok: true });
  }
  if (head === 'shutdown' && method === 'POST') {
    send(res, 200, { ok: true });
    setTimeout(shutdown, 50);
    return;
  }

  if (head && !id && method === 'POST') return send(res, 201, store.create(head, body));
  if (head && id && method === 'PATCH') return send(res, 200, store.update(head, id, body));
  if (head && id && method === 'DELETE') {
    store.remove(head, id);
    return send(res, 200, { ok: true });
  }
  throw new HttpError(404, 'Not found');
}

// Every open app window holds one event stream. Started by the launcher (KOMPASS_AUTO_EXIT=1),
// the server stops itself once no window has been connected for a while, so closing the
// last window ends everything no matter how the browser behaves in the background.
const AUTO_EXIT = process.env.KOMPASS_AUTO_EXIT === '1';
const clients = new Set();
let idleTimer;

function exitWhenIdle(ms) {
  if (!AUTO_EXIT) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (clients.size === 0) shutdown();
  }, ms);
}

function openEventStream(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  clients.add(res);
  clearTimeout(idleTimer);
  const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
    if (clients.size === 0) exitWhenIdle(15_000);
  });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden');

  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, 'index.html');
  if (!fs.existsSync(target)) {
    return send(res, 503, 'The interface has not been built yet. Run "npm run build" once.');
  }
  const ext = path.extname(target);
  const immutable = target.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (!ALLOWED_HOSTS.has(req.headers.host ?? '')) return send(res, 403, 'Forbidden');
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(req, res, url);
  } catch (err) {
    const conflict = /UNIQUE constraint failed/.test(err?.message ?? '');
    const status = err instanceof HttpError ? err.status : conflict ? 409 : 500;
    if (status === 500) log('Error', req.method, url.pathname, err);
    const message = err instanceof HttpError ? err.message : String(err?.message ?? err);
    if (!res.headersSent) send(res, status, { error: message });
    else res.end();
  }
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  log('Stopping Kompass server');
  for (const child of windows) child.kill();
  server.close();
  server.closeAllConnections?.();
  try {
    store.close();
  } catch (err) {
    log('Could not close the database', err);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log(`Port ${PORT} is already in use – is Kompass already running?`);
    process.exit(2);
  }
  log('Server error', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log(`Kompass is running at ${URL_BASE} (data: ${store.file})`);
  if (process.env.KOMPASS_OPEN === '1') openWindow();
  // The first window gets generous time to appear.
  exitWhenIdle(90_000);
});
