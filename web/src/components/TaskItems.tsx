import clsx from 'clsx';
import { ListChecks, Star } from 'lucide-react';
import { toggleTask } from '../lib/actions';
import { tr } from '../lib/i18n';
import { openPanel, updateItem, useStore } from '../lib/store';
import type { Task } from '../lib/types';
import { DueChip, PriorityFlag, ProjectTag } from './bits';
import { Checkbox } from './ui';

export function TaskCard({ task, hideProject }: { task: Task; hideProject?: boolean }) {
  const project = useStore((s) => s.projects.find((p) => p.id === task.project_id));
  const done = task.status === 'done';
  const checked = task.checklist.filter((c) => c.done).length;
  const hasMeta = (!hideProject && project) || task.due_date || task.checklist.length > 0 || task.priority >= 2 || task.focus;

  // Finished work shrinks to one faded line; the details are still one click away in the panel.
  if (done) {
    return (
      <div
        title={task.title}
        className="flex cursor-grab items-center gap-2 rounded-lg border border-line/70 px-2.5 py-1.5 opacity-65 transition-[opacity,background-color,border-color] hover:border-line-strong hover:bg-surface hover:opacity-100 active:cursor-grabbing"
      >
        <Checkbox size={14} checked onChange={() => toggleTask(task)} label={tr('Reopen', 'Wieder öffnen')} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3 line-through decoration-ink-3/40">{task.title || tr('Untitled', 'Ohne Titel')}</span>
      </div>
    );
  }

  return (
    <div className="group cursor-grab rounded-[10px] border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong active:cursor-grabbing">
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5">
          <Checkbox size={16} checked={false} onChange={() => toggleTask(task)} label={tr('Mark as done', 'Erledigt')} />
        </div>
        <p className="min-w-0 flex-1 text-[14px] leading-snug break-words text-ink">
          {task.title || <span className="text-ink-3">{tr('Untitled', 'Ohne Titel')}</span>}
        </p>
        <PriorityFlag priority={task.priority} />
      </div>
      {hasMeta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[26px]">
          {!hideProject && <ProjectTag project={project} />}
          {task.due_date && <DueChip date={task.due_date} />}
          {task.checklist.length > 0 && (
            <span className={clsx('tabular inline-flex items-center gap-1 text-[12px]', checked === task.checklist.length ? 'text-ok' : 'text-ink-3')}>
              <ListChecks className="size-3.5" />
              {checked}/{task.checklist.length}
            </span>
          )}
          {task.focus && <Star aria-label={tr('In focus', 'Im Fokus')} className="size-3.5 fill-accent text-accent" />}
        </div>
      )}
    </div>
  );
}

/** Dense list row used on the Today page and in project lists. */
export function TaskRow({ task, muted }: { task: Task; muted?: boolean }) {
  const project = useStore((s) => s.projects.find((p) => p.id === task.project_id));
  const done = task.status === 'done';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openPanel({ kind: 'task', id: task.id })}
      onKeyDown={(e) => e.key === 'Enter' && openPanel({ kind: 'task', id: task.id })}
      className="group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-surface"
    >
      <Checkbox checked={done} onChange={() => toggleTask(task)} label={done ? tr('Reopen', 'Wieder öffnen') : tr('Mark as done', 'Erledigt')} />
      <span
        className={clsx(
          'min-w-0 flex-1 truncate text-[14.5px]',
          done ? 'text-ink-3 line-through decoration-ink-3/40' : muted ? 'text-ink-2' : 'text-ink',
        )}
      >
        {task.title || tr('Untitled', 'Ohne Titel')}
      </span>
      <PriorityFlag priority={done ? 0 : task.priority} />
      <ProjectTag project={project} className="max-w-36" />
      {task.due_date && <DueChip date={task.due_date} done={done} className="w-36 justify-end" />}
      <button
        type="button"
        aria-label={task.focus ? tr('Remove from focus', 'Aus dem Fokus nehmen') : tr('Add to focus', 'In den Fokus')}
        title={task.focus ? tr('Remove from focus', 'Aus dem Fokus nehmen') : tr('Add to today’s focus', 'Heute in den Fokus')}
        onClick={(e) => {
          e.stopPropagation();
          updateItem('tasks', task.id, { focus: !task.focus });
        }}
        className={clsx(
          'rounded-md p-1 transition-opacity hover:bg-sunken focus:opacity-100',
          task.focus ? 'text-accent' : 'text-ink-3 opacity-0 group-hover:opacity-100',
        )}
      >
        <Star className={clsx('size-3.5', task.focus && 'fill-accent')} />
      </button>
    </div>
  );
}
