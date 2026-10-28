import { parseQuickAdd } from './quickadd';
import { createItem, nextPosition, toast, updateItem, useStore } from './store';
import type { Cell, Goal, Post, Task, TaskStatus } from './types';
import { tr } from './i18n';

const get = useStore.getState;

/** Status change that also keeps completed_at and a linked 64-chart action in step. */
export function setTaskStatus(task: Task, status: TaskStatus, position?: number) {
  const patch: Partial<Task> = { status };
  if (position !== undefined) patch.position = position;
  if (status === 'done' && task.status !== 'done') patch.completed_at = new Date().toISOString();
  if (status !== 'done') patch.completed_at = null;
  updateItem('tasks', task.id, patch);

  const cell = task.cell_id ? get().cells.find((c) => c.id === task.cell_id) : undefined;
  if (cell && cell.kind === 'task' && cell.done !== (status === 'done')) updateItem('cells', cell.id, { done: status === 'done' });
}

export function toggleTask(task: Task) {
  const done = task.status !== 'done';
  setTaskStatus(task, done ? 'done' : 'todo');
  if (done) toast(tr(`Done: ${task.title || 'Task'}`, `Erledigt: ${task.title || 'Aufgabe'}`), 'info', { label: tr('Undo', 'Rückgängig'), run: () => setTaskStatus({ ...task, status: 'done' }, task.status) });
}

export function setCellDone(cell: Cell, done: boolean) {
  updateItem('cells', cell.id, { done });
  const task = get().tasks.find((t) => t.cell_id === cell.id);
  if (task && (task.status === 'done') !== done) setTaskStatus(task, done ? 'done' : 'todo');
}

/** Creates a task from quick-add text such as "Landing page #website tomorrow !!!". */
export function createTaskFromText(text: string, defaults: Partial<Task> = {}) {
  const parsed = parseQuickAdd(text, get().projects);
  const status = defaults.status ?? 'todo';
  const inColumn = get().tasks.filter((t) => t.status === status);
  return createItem('tasks', {
    status,
    position: nextPosition(inColumn),
    ...defaults,
    title: parsed.title,
    ...(parsed.project_id && { project_id: parsed.project_id }),
    ...(parsed.due_date && { due_date: parsed.due_date }),
    ...(parsed.priority !== undefined && { priority: parsed.priority }),
    ...(parsed.focus && { focus: true }),
    ...(status === 'done' && { completed_at: new Date().toISOString() }),
  });
}

export function duplicateTask(task: Task) {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = task;
  return createItem('tasks', { ...rest, title: `${task.title} (Kopie)`, position: task.position + 0.5, cell_id: null });
}

export function duplicatePost(post: Post) {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = post;
  return createItem('posts', {
    ...rest,
    title: `${post.title} (Kopie)`,
    status: post.status === 'published' ? 'draft' : post.status,
    published_url: '',
    position: post.position + 0.5,
  });
}

/** Writes one square of a 64 chart, creating the row the first time it gets content. */
export function upsertCell(goalId: string, pillar: number, slot: number, patch: Partial<Cell>, debounce = false) {
  const existing = get().cells.find((c) => c.goal_id === goalId && c.pillar === pillar && c.slot === slot);
  if (existing) {
    updateItem('cells', existing.id, patch, { debounce });
    return existing;
  }
  return createItem('cells', { goal_id: goalId, pillar, slot, ...patch });
}

export function taskFromCell(cell: Cell, goal: Goal) {
  const existing = get().tasks.find((t) => t.cell_id === cell.id);
  if (existing) return existing;
  const todo = get().tasks.filter((t) => t.status === 'todo');
  const task = createItem('tasks', {
    title: cell.title,
    cell_id: cell.id,
    project_id: goal.project_id,
    status: cell.done ? 'done' : 'todo',
    due_date: cell.start_date,
    position: nextPosition(todo),
  });
  toast(tr('Added to the board', 'Aufs Board gelegt'));
  return task;
}
