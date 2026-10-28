import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Kanban, type KanbanColumn } from '../components/Kanban';
import { Page } from '../components/Page';
import { TaskCard } from '../components/TaskItems';
import { Dot } from '../components/ui';
import { createTaskFromText, setTaskStatus } from '../lib/actions';
import { tr } from '../lib/i18n';
import { TASK_STATUSES } from '../lib/meta';
import { openPanel, useStore } from '../lib/store';
import { usePersisted } from '../lib/theme';
import type { Task, TaskStatus } from '../lib/types';

const COLUMN_COLORS: Record<TaskStatus, string> = {
  backlog: 'var(--line-strong)',
  todo: 'var(--ink-3)',
  doing: 'var(--accent)',
  done: 'var(--ok)',
};

export const TASK_COLUMNS: KanbanColumn[] = TASK_STATUSES.map((s) => ({
  id: s.id,
  title: s.label,
  color: COLUMN_COLORS[s.id],
  limit: s.id === 'done' ? 8 : undefined,
}));

/** Kanban of tasks; reused on the project page with a fixed project. */
export function TaskBoard({ tasks, projectId }: { tasks: Task[]; projectId?: string | null }) {
  const all = useStore((s) => s.tasks);
  const columnOf = useCallback((t: Task) => t.status, []);
  return (
    <Kanban
      columns={TASK_COLUMNS}
      items={tasks}
      columnOf={columnOf}
      onMove={(id, column, position) => {
        const task = all.find((t) => t.id === id);
        if (task) setTaskStatus(task, column as TaskStatus, position);
      }}
      onOpen={(t) => openPanel({ kind: 'task', id: t.id })}
      renderCard={(t) => <TaskCard task={t} hideProject={Boolean(projectId)} />}
      onAdd={(column, text) => createTaskFromText(text, { status: column as TaskStatus, ...(projectId ? { project_id: projectId } : {}) })}
      addLabel={tr('Add task', 'Aufgabe hinzufügen')}
    />
  );
}

export function Board() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const [filter, setFilter] = usePersisted<string>('board.project', 'all');
  const [query, setQuery] = useState('');

  const visibleProjects = projects.filter((p) => !p.archived && p.status !== 'done');
  const projectId = filter !== 'all' && filter !== 'none' && projects.some((p) => p.id === filter) ? filter : null;
  const effective = projectId ?? (filter === 'none' ? 'none' : 'all');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (effective === 'none' && t.project_id) return false;
      if (projectId && t.project_id !== projectId) return false;
      if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, effective, projectId, query]);

  return (
    <Page
      fill
      title="Board"
      actions={
        <label className="flex h-8.5 w-64 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-accent">
          <Search className="size-4 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('Filter tasks', 'Aufgaben filtern')} className="bare text-[13px]" />
        </label>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('Filter by project', 'Nach Projekt filtern')}>
        <FilterChip active={effective === 'all'} onClick={() => setFilter('all')}>
          {tr('All', 'Alle')}
        </FilterChip>
        {visibleProjects.map((p) => (
          <FilterChip key={p.id} active={projectId === p.id} onClick={() => setFilter(p.id)}>
            <Dot color={p.color} size={7} />
            {p.name || tr('Unnamed', 'Ohne Namen')}
          </FilterChip>
        ))}
        <FilterChip active={effective === 'none'} onClick={() => setFilter('none')}>
          {tr('No project', 'Ohne Projekt')}
        </FilterChip>
      </div>

      <TaskBoard tasks={items} projectId={projectId} />
    </Page>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        // Same weight in both states, so selecting a chip doesn't widen it and push its neighbours.
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
        active ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-sunken hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
