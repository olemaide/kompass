import { tr } from './i18n';
import { differenceInCalendarDays } from 'date-fns';
import { fromIso, iso, lastDays } from './dates';
import type { Cell, RoutineLog, Task } from './types';

export function projectStats(projectId: string, tasks: Task[]) {
  const list = tasks.filter((t) => t.project_id === projectId);
  const done = list.filter((t) => t.status === 'done').length;
  return { total: list.length, done, open: list.length - done, pct: list.length ? done / list.length : 0 };
}

export type LogIndex = Map<string, Set<string>>;
export function indexLogs(logs: RoutineLog[]): LogIndex {
  const map: LogIndex = new Map();
  for (const l of logs) {
    if (!map.has(l.cell_id)) map.set(l.cell_id, new Set());
    map.get(l.cell_id)!.add(l.date);
  }
  return map;
}

/** Share of days a routine was done, over the last `window` days but never before it existed. */
export function routineRate(cell: Cell, logs: LogIndex, window = 14) {
  const since = cell.start_date ?? iso(new Date(cell.created_at));
  const age = differenceInCalendarDays(new Date(), fromIso(since)) + 1;
  const days = Math.max(1, Math.min(window, age));
  const set = logs.get(cell.id);
  if (!set) return 0;
  return lastDays(days).filter((d) => set.has(d)).length / days;
}

/** Consecutive days up to today; an unchecked today doesn't break a streak that ran through yesterday. */
export function routineStreak(cellId: string, logs: LogIndex) {
  const set = logs.get(cellId);
  if (!set) return 0;
  const days = lastDays(400).reverse();
  let i = set.has(days[0]) ? 0 : 1;
  let streak = 0;
  while (i < days.length && set.has(days[i])) {
    streak++;
    i++;
  }
  return streak;
}

export const isAction = (c: Cell) => c.slot >= 0 && c.title.trim() !== '';
const score = (c: Cell, logs: LogIndex) => (c.kind === 'routine' ? routineRate(c, logs) : c.done ? 1 : 0);

export interface PillarStats {
  actions: number;
  tasksDone: number;
  tasks: number;
  routines: number;
  score: number;
}

export function goalStats(goalId: string, cells: Cell[], logs: LogIndex) {
  const mine = cells.filter((c) => c.goal_id === goalId);
  const pillars: PillarStats[] = Array.from({ length: 8 }, (_, p) => {
    const actions = mine.filter((c) => c.pillar === p && isAction(c));
    const tasks = actions.filter((c) => c.kind === 'task');
    return {
      actions: actions.length,
      tasks: tasks.length,
      tasksDone: tasks.filter((c) => c.done).length,
      routines: actions.length - tasks.length,
      score: actions.length ? actions.reduce((s, c) => s + score(c, logs), 0) / actions.length : 0,
    };
  });
  const actions = mine.filter(isAction);
  const tasks = actions.filter((c) => c.kind === 'task');
  const routines = actions.filter((c) => c.kind === 'routine');
  return {
    pillars,
    actions: actions.length,
    tasks: tasks.length,
    tasksDone: tasks.filter((c) => c.done).length,
    routines: routines.length,
    routineRate: routines.length ? routines.reduce((s, c) => s + routineRate(c, logs, 7), 0) / routines.length : 0,
    score: actions.length ? actions.reduce((s, c) => s + score(c, logs), 0) / actions.length : 0,
  };
}

export const pct = (v: number) => tr(`${Math.round(v * 100)}%`, `${Math.round(v * 100)} %`);
