import { create } from 'zustand';
import { api } from './api';
import type { CollectionName, Collections, JournalEntry, RoutineLog, Snapshot } from './types';
import { tr } from './i18n';

const DEFAULTS: { [C in CollectionName]: () => Omit<Collections[C], 'id' | 'created_at' | 'updated_at'> } = {
  projects: () => ({
    name: '',
    description: '',
    color: '#3E63DD',
    status: 'active',
    url: '',
    repo: '',
    notes: '',
    position: 0,
    archived: false,
  }),
  tasks: () => ({
    title: '',
    description: '',
    status: 'todo',
    priority: 0,
    due_date: null,
    project_id: null,
    cell_id: null,
    position: 0,
    focus: false,
    checklist: [],
    completed_at: null,
  }),
  posts: () => ({
    title: '',
    body: '',
    platforms: [],
    format: 'post',
    status: 'idea',
    scheduled_date: null,
    scheduled_time: null,
    project_id: null,
    link: '',
    published_url: '',
    notes: '',
    position: 0,
  }),
  goals: () => ({
    title: '',
    why: '',
    values_text: '',
    deadline: null,
    successes: '',
    obstacles: '',
    solutions: '',
    project_id: null,
    position: 0,
    archived: false,
  }),
  cells: () => ({
    goal_id: '',
    pillar: 0,
    slot: -1,
    title: '',
    kind: 'task',
    done: false,
    start_date: null,
    notes: '',
  }),
};

export type Panel = { kind: 'task'; id: string } | { kind: 'post'; id: string };
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
  action?: { label: string; run: () => void };
}

interface State {
  ready: boolean;
  loadError: string | null;
  projects: Collections['projects'][];
  tasks: Collections['tasks'][];
  posts: Collections['posts'][];
  goals: Collections['goals'][];
  cells: Collections['cells'][];
  logs: RoutineLog[];
  journal: Record<string, JournalEntry>;

  panel: Panel | null;
  paletteOpen: boolean;
  toasts: Toast[];
}

export const useStore = create<State>(() => ({
  ready: false,
  loadError: null,
  projects: [],
  tasks: [],
  posts: [],
  goals: [],
  cells: [],
  logs: [],
  journal: {},
  panel: null,
  paletteOpen: false,
  toasts: [],
}));

const set = useStore.setState;
const get = useStore.getState;

/* ------------------------------------------------------------------ sync */

// Requests for the same record run strictly one after another, so an edit never overtakes its create.
const queues = new Map<string, Promise<unknown>>();
function enqueue(key: string, run: () => Promise<unknown>) {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(run, run).catch((err: Error) => {
    toast(tr(`Could not save: ${err.message}`, `Speichern fehlgeschlagen: ${err.message}`), 'error');
    void load();
  });
  queues.set(key, next);
  void next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
}

// Text edits are collected and sent once typing pauses.
const pending = new Map<string, { c: CollectionName; id: string; patch: object; timer: number }>();
function takePending(key: string) {
  const p = pending.get(key);
  if (!p) return {};
  clearTimeout(p.timer);
  pending.delete(key);
  return p.patch;
}
function flushKey(key: string, keepalive = false) {
  const p = pending.get(key);
  if (!p) return;
  const patch = takePending(key);
  enqueue(key, () => api.update(p.c, p.id, patch, keepalive));
}

const journalPending = new Map<string, number>();
function flushJournal(date: string, keepalive = false) {
  clearTimeout(journalPending.get(date));
  journalPending.delete(date);
  const entry = get().journal[date];
  if (entry) enqueue(`journal:${date}`, () => api.journal(date, { plan: entry.plan, reflection: entry.reflection }, keepalive));
}

export function flushAll(keepalive = false) {
  for (const key of [...pending.keys()]) flushKey(key, keepalive);
  for (const date of [...journalPending.keys()]) flushJournal(date, keepalive);
}
window.addEventListener('pagehide', () => flushAll(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushAll(true);
});

/* ------------------------------------------------------------------ data */

function applySnapshot(s: Snapshot) {
  set({
    ready: true,
    loadError: null,
    projects: s.projects,
    tasks: s.tasks,
    posts: s.posts,
    goals: s.goals,
    cells: s.cells,
    logs: s.routine_logs,
    journal: Object.fromEntries(s.journal.map((j) => [j.date, j])),
  });
}

export async function load() {
  try {
    applySnapshot(await api.state());
  } catch (err) {
    set({ loadError: (err as Error).message });
  }
}

export async function importSnapshot(data: unknown) {
  flushAll();
  applySnapshot(await api.importAll(data));
}

type Rows<C extends CollectionName> = Collections[C][];
const rows = <C extends CollectionName>(c: C) => get()[c] as Rows<C>;
const setRows = <C extends CollectionName>(c: C, list: Rows<C>) => set({ [c]: list } as Partial<State>);

export function createItem<C extends CollectionName>(c: C, data: Partial<Collections[C]>): Collections[C] {
  const now = new Date().toISOString();
  const item = { ...DEFAULTS[c](), ...data, id: crypto.randomUUID(), created_at: now, updated_at: now } as Collections[C];
  setRows(c, [...rows(c), item]);
  enqueue(`${c}:${item.id}`, () => api.create(c, item));
  return item;
}

export function updateItem<C extends CollectionName>(
  c: C,
  id: string,
  patch: Partial<Collections[C]>,
  opts: { debounce?: boolean } = {},
) {
  const now = new Date().toISOString();
  setRows(
    c,
    rows(c).map((r) => (r.id === id ? { ...r, ...patch, updated_at: now } : r)),
  );
  const key = `${c}:${id}`;
  if (opts.debounce) {
    const prev = pending.get(key);
    if (prev) clearTimeout(prev.timer);
    const merged = { ...(prev?.patch ?? {}), ...patch };
    pending.set(key, { c, id, patch: merged, timer: window.setTimeout(() => flushKey(key), 450) });
    return;
  }
  const merged = { ...takePending(key), ...patch };
  enqueue(key, () => api.update(c, id, merged));
}

export function removeItem<C extends CollectionName>(c: C, id: string) {
  const key = `${c}:${id}`;
  takePending(key);
  const s = get();
  // Mirror the database's ON DELETE rules so the screen matches what the server does.
  if (c === 'projects') {
    const unlink = <T extends { project_id: string | null }>(list: T[]) =>
      list.map((r) => (r.project_id === id ? { ...r, project_id: null } : r));
    set({ tasks: unlink(s.tasks), posts: unlink(s.posts), goals: unlink(s.goals) });
  }
  if (c === 'goals' || c === 'cells') {
    const gone = new Set(c === 'goals' ? s.cells.filter((x) => x.goal_id === id).map((x) => x.id) : [id]);
    set({
      cells: s.cells.filter((x) => !gone.has(x.id)),
      logs: s.logs.filter((l) => !gone.has(l.cell_id)),
      tasks: s.tasks.map((t) => (t.cell_id && gone.has(t.cell_id) ? { ...t, cell_id: null } : t)),
    });
  }
  setRows(
    c,
    rows(c).filter((r) => r.id !== id),
  );
  if (get().panel?.id === id) set({ panel: null });
  enqueue(key, () => api.remove(c, id));
}

export function toggleRoutine(cellId: string, date: string) {
  const has = get().logs.some((l) => l.cell_id === cellId && l.date === date);
  set({
    logs: has
      ? get().logs.filter((l) => !(l.cell_id === cellId && l.date === date))
      : [...get().logs, { cell_id: cellId, date }],
  });
  enqueue(`cells:${cellId}`, () => api.routine(cellId, date, !has));
}

export function setJournal(date: string, patch: Partial<Pick<JournalEntry, 'plan' | 'reflection'>>) {
  const current = get().journal[date] ?? { date, plan: '', reflection: '', updated_at: '' };
  set({ journal: { ...get().journal, [date]: { ...current, ...patch, updated_at: new Date().toISOString() } } });
  clearTimeout(journalPending.get(date));
  journalPending.set(
    date,
    window.setTimeout(() => flushJournal(date), 600),
  );
}

/* ------------------------------------------------------------------ ui */

let toastSeq = 0;
export function toast(text: string, tone: Toast['tone'] = 'info', action?: Toast['action']) {
  const id = ++toastSeq;
  set({ toasts: [...get().toasts.slice(-2), { id, text, tone, action }] });
  window.setTimeout(() => dismissToast(id), tone === 'error' ? 7000 : 4500);
}
export const dismissToast = (id: number) => set({ toasts: get().toasts.filter((t) => t.id !== id) });

export const openPanel = (panel: Panel) => {
  flushAll();
  set({ panel });
};
export const closePanel = () => {
  flushAll();
  set({ panel: null });
};
export const setPalette = (paletteOpen: boolean) => set({ paletteOpen });

/** A position between two neighbours, for drag-and-drop ordering. */
export function between(before?: number, after?: number) {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return after! - 1000;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}

export const nextPosition = (list: { position: number }[]) =>
  list.reduce((m, r) => Math.max(m, r.position), 0) + 1000;
