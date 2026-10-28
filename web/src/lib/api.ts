import type { CollectionName, Snapshot } from './types';

async function request<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {}
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface Info {
  dataDir: string;
  dbFile: string;
  backupDir: string;
  version: string;
}

export const api = {
  state: () => request<Snapshot>('GET', '/state'),
  info: () => request<Info>('GET', '/info'),
  create: (c: CollectionName, data: object) => request('POST', `/${c}`, data),
  update: (c: CollectionName, id: string, data: object, keepalive = false) =>
    request('PATCH', `/${c}/${id}`, data, keepalive),
  remove: (c: CollectionName, id: string) => request('DELETE', `/${c}/${id}`, {}),
  routine: (cell_id: string, date: string, done: boolean) => request('PUT', '/routine', { cell_id, date, done }),
  journal: (date: string, data: object, keepalive = false) => request('PUT', `/journal/${date}`, data, keepalive),
  importAll: (data: unknown) => request<Snapshot>('POST', '/import', data),
  openDataFolder: () => request('POST', '/open-data', {}),
  openExternal: (url: string) => request('POST', '/open-url', { url }),
};
