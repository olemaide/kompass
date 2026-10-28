import clsx from 'clsx';
import { Copy, Ellipsis, ExternalLink, Grid3x3, Plus, Trash, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { duplicatePost, duplicateTask, setTaskStatus, toggleTask } from '../lib/actions';
import { fmt } from '../lib/dates';
import { tr } from '../lib/i18n';
import { PLATFORMS, POST_FORMATS, POST_STATUSES, PRIORITIES, TASK_STATUSES } from '../lib/meta';
import { href } from '../lib/router';
import { closePanel, openPanel, removeItem, updateItem, useStore } from '../lib/store';
import type { ChecklistItem, Platform, Post, Task } from '../lib/types';
import { DateField, Prop, ProjectSelect } from './bits';
import { AutoTextarea, Checkbox, ConfirmButton, Disclosure, IconButton, MenuItem, Popover, ProgressBar, Segmented, Select } from './ui';

export function PanelHost() {
  const panel = useStore((s) => s.panel);
  useEffect(() => {
    if (!panel) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useStore.getState().paletteOpen) closePanel();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [panel]);

  if (!panel) return null;
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="anim-fade absolute inset-0 bg-black/[0.08] dark:bg-black/45" onClick={closePanel} />
      <aside
        role="dialog"
        aria-modal="true"
        className="anim-drawer relative flex h-full w-[min(540px,100vw)] flex-col border-l border-line bg-surface shadow-overlay"
      >
        {panel.kind === 'task' ? <TaskEditor key={panel.id} id={panel.id} /> : <PostEditor key={panel.id} id={panel.id} />}
      </aside>
    </div>
  );
}

function PanelHeader({ crumb, menu }: { crumb: React.ReactNode; menu: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line px-4">
      <div className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{crumb}</div>
      <div className="relative">
        <IconButton label={tr('More actions', 'Weitere Aktionen')} onClick={() => setOpen(!open)} active={open}>
          <Ellipsis className="size-4" />
        </IconButton>
        <Popover open={open} onClose={() => setOpen(false)} align="right">
          <div onClick={() => setOpen(false)}>{menu}</div>
        </Popover>
      </div>
      <IconButton label={tr('Close (Esc)', 'Schließen (Esc)')} onClick={closePanel}>
        <X className="size-4" />
      </IconButton>
    </header>
  );
}

/* ------------------------------------------------------------------ task */

function TaskEditor({ id }: { id: string }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const project = useStore((s) => s.projects.find((p) => p.id === task?.project_id));
  const cell = useStore((s) => s.cells.find((c) => c.id === task?.cell_id));
  const goal = useStore((s) => s.goals.find((g) => g.id === cell?.goal_id));
  const pillar = useStore((s) => s.cells.find((c) => c.goal_id === cell?.goal_id && c.pillar === cell?.pillar && c.slot === -1));

  if (!task) return null;
  const up = (patch: Partial<Task>, debounce = false) => updateItem('tasks', task.id, patch, { debounce });
  const done = task.status === 'done';

  return (
    <>
      <PanelHeader
        crumb={project ? tr(`Task in ${project.name}`, `Aufgabe in ${project.name}`) : tr('Task', 'Aufgabe')}
        menu={
          <>
            <MenuItem icon={<Copy />} onClick={() => openPanel({ kind: 'task', id: duplicateTask(task).id })}>
              {tr('Duplicate', 'Duplizieren')}
            </MenuItem>
            <MenuItem icon={<Trash />} danger onClick={() => removeItem('tasks', task.id)}>
              {tr('Delete', 'Löschen')}
            </MenuItem>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8">
        <div className="flex items-start gap-3">
          <div className="pt-1.5">
            <Checkbox checked={done} onChange={() => toggleTask(task)} label={done ? tr('Reopen', 'Als offen markieren') : tr('Mark as done', 'Erledigt')} size={20} />
          </div>
          <AutoTextarea
            autoFocus={!task.title}
            value={task.title}
            placeholder={tr('What needs to be done?', 'Was ist zu tun?')}
            onChange={(e) => up({ title: e.target.value.replace(/\n/g, ' ') }, true)}
            className={clsx('bare title-lg', done && 'text-ink-3 line-through decoration-ink-3/50')}
          />
        </div>

        <div className="mt-5 flex flex-col">
          <Prop label="Status">
            <Select label="Status" value={task.status} options={TASK_STATUSES} onChange={(s) => setTaskStatus(task, s)} />
          </Prop>
          <Prop label={tr('Due date', 'Fällig')}>
            <DateField label={tr('Due date', 'Fälligkeitsdatum')} value={task.due_date} onChange={(v) => up({ due_date: v })} />
          </Prop>
          <Prop label={tr('Project', 'Projekt')}>
            <ProjectSelect value={task.project_id} onChange={(v) => up({ project_id: v })} />
          </Prop>
          <Prop label={tr('Priority', 'Priorität')}>
            <Select label={tr('Priority', 'Priorität')} value={task.priority} options={PRIORITIES} onChange={(v) => up({ priority: v })} />
          </Prop>
          <Prop label={tr('Focus today', 'Heute im Fokus')}>
            <label className="flex h-8 items-center gap-2 px-2 text-[14px]">
              <Checkbox round={false} size={16} color="var(--accent)" checked={task.focus} onChange={(v) => up({ focus: v })} label={tr('Focus today', 'Heute im Fokus')} />
              <span className="text-ink-3">{task.focus ? tr('On your Today list', 'Steht auf deiner Heute-Liste') : tr('No', 'Nein')}</span>
            </label>
          </Prop>
          {cell && goal && (
            <Prop label={tr('Part of', 'Gehört zu')}>
              <a
                href={href.goals(goal.id)}
                onClick={closePanel}
                className="flex h-8 items-center gap-1.5 truncate px-2 text-[14px] text-ink hover:text-accent"
              >
                <Grid3x3 className="size-3.5 text-ink-3" />
                <span className="truncate">
                  {goal.title || tr('Goal', 'Ziel')}
                  {pillar?.title ? ` › ${pillar.title}` : ''}
                </span>
              </a>
            </Prop>
          )}
        </div>

        <div className="mt-6">
          <h3 className="section-title mb-1.5">{tr('Notes', 'Notizen')}</h3>
          <AutoTextarea
            minRows={3}
            value={task.description}
            placeholder={tr('Details, links, thoughts…', 'Details, Links, Gedanken …')}
            onChange={(e) => up({ description: e.target.value }, true)}
            className="field text-[14px] leading-relaxed"
          />
        </div>

        <Checklist items={task.checklist} onChange={(checklist) => up({ checklist })} />
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3 text-[12px] text-ink-3">
        <span>
          {tr('Created', 'Erstellt')} {fmt(new Date(task.created_at), tr('MMM d, yyyy', 'd. MMM yyyy'))}
          {task.completed_at && `${tr(', completed', ', erledigt')} ${fmt(new Date(task.completed_at), tr('MMM d', 'd. MMM'))}`}
        </span>
        <ConfirmButton icon={<Trash className="size-3.5" />} onConfirm={() => removeItem('tasks', task.id)}>
          {tr('Delete', 'Löschen')}
        </ConfirmButton>
      </footer>
    </>
  );
}

function Checklist({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [draft, setDraft] = useState('');
  const done = items.filter((i) => i.done).length;
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, { id: crypto.randomUUID(), text: draft.trim(), done: false }]);
    setDraft('');
  };
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="section-title">{tr('Checklist', 'Checkliste')}</h3>
        {items.length > 0 && (
          <>
            <span className="tabular text-[12px] text-ink-3">
              {tr(`${done} of ${items.length}`, `${done} von ${items.length}`)}
            </span>
            <ProgressBar value={done / items.length} color="var(--ok)" className="w-24" />
          </>
        )}
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-raised">
            <Checkbox
              round={false}
              size={16}
              checked={item.done}
              label={item.text}
              onChange={(v) => onChange(items.map((i) => (i.id === item.id ? { ...i, done: v } : i)))}
            />
            <input
              value={item.text}
              aria-label={tr('Edit item', 'Punkt bearbeiten')}
              onChange={(e) => onChange(items.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))}
              className={clsx('bare text-[14px]', item.done && 'text-ink-3 line-through')}
            />
            <button
              type="button"
              aria-label={tr('Remove item', 'Punkt entfernen')}
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              className="rounded p-0.5 text-ink-3 opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center gap-2.5 px-1">
        <Plus className="size-4 text-ink-3" />
        <input
          value={draft}
          placeholder={tr('Add item', 'Punkt hinzufügen')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          onBlur={add}
          className="bare h-8 text-[14px]"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ post */

function PostEditor({ id }: { id: string }) {
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  const project = useStore((s) => s.projects.find((p) => p.id === post?.project_id));
  if (!post) return null;
  const up = (patch: Partial<Post>, debounce = false) => updateItem('posts', post.id, patch, { debounce });
  const togglePlatform = (p: Platform) =>
    up({ platforms: post.platforms.includes(p) ? post.platforms.filter((x) => x !== p) : [...post.platforms, p] });
  const length = [...post.body].length;

  return (
    <>
      <PanelHeader
        crumb={project ? tr(`Post for ${project.name}`, `Post für ${project.name}`) : 'Post'}
        menu={
          <>
            <MenuItem icon={<Copy />} onClick={() => openPanel({ kind: 'post', id: duplicatePost(post).id })}>
              {tr('Duplicate (e.g. for another platform)', 'Duplizieren (z. B. für andere Plattform)')}
            </MenuItem>
            <MenuItem icon={<Trash />} danger onClick={() => removeItem('posts', post.id)}>
              {tr('Delete', 'Löschen')}
            </MenuItem>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8">
        <AutoTextarea
          autoFocus={!post.title}
          value={post.title}
          placeholder={tr('Hook or working title', 'Hook oder Arbeitstitel')}
          onChange={(e) => up({ title: e.target.value.replace(/\n/g, ' ') }, true)}
          className="bare title-lg"
        />

        <div className="mt-4 flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => {
            const on = post.platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => togglePlatform(p.id)}
                className={clsx(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors',
                  on ? 'border-transparent text-white' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink',
                )}
                style={on ? { background: p.color } : undefined}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col">
          <Prop label="Status">
            <div className="px-1">
              <Segmented size="sm" value={post.status} options={POST_STATUSES} onChange={(status) => up({ status })} />
            </div>
          </Prop>
          <Prop label={tr('Publish date', 'Termin')}>
            <div className="flex items-center">
              <DateField label={tr('Date', 'Datum')} value={post.scheduled_date} onChange={(v) => up({ scheduled_date: v })} />
              {post.scheduled_date && (
                <DateField label={tr('Time', 'Uhrzeit')} type="time" value={post.scheduled_time} onChange={(v) => up({ scheduled_time: v })} />
              )}
            </div>
          </Prop>
          <Prop label="Format">
            <Select label="Format" value={post.format} options={POST_FORMATS} onChange={(format) => up({ format })} />
          </Prop>
          <Prop label={tr('Project', 'Projekt')}>
            <ProjectSelect value={post.project_id} onChange={(v) => up({ project_id: v })} />
          </Prop>
          {post.status === 'published' && (
            <Prop label={tr('Live link', 'Live-Link')}>
              <UrlInput value={post.published_url} onChange={(v) => up({ published_url: v }, true)} placeholder="https://…" />
            </Prop>
          )}
        </div>

        <div className="mt-6">
          <h3 className="section-title mb-1.5">Text</h3>
          <AutoTextarea
            minRows={7}
            value={post.body}
            placeholder={tr('Write the post – hook, key message, call to action.', 'Schreib den Post – Hook, Kernaussage, Call-to-Action.')}
            onChange={(e) => up({ body: e.target.value }, true)}
            className="field text-[14px] leading-relaxed"
          />
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            <span className="tabular text-ink-3">
              {length === 1 ? tr('1 character', '1 Zeichen') : tr(`${length} characters`, `${length} Zeichen`)}
            </span>
            {post.platforms
              .map((p) => PLATFORMS.find((x) => x.id === p)!)
              .filter((p) => p.limit)
              .map((p) => (
                <span key={p.id} className={clsx('tabular', length > p.limit ? 'font-medium text-danger' : 'text-ink-3')}>
                  {p.label}{' '}
                  {length > p.limit
                    ? tr(`${length - p.limit} over`, `${length - p.limit} zu lang`)
                    : tr(`${p.limit - length} left`, `noch ${p.limit - length}`)}
                </span>
              ))}
          </div>
        </div>

        <Disclosure title={tr('Assets and notes', 'Material und Notizen')} className="mt-6" defaultOpen={Boolean(post.link || post.notes)}>
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-ink-3">{tr('Link to image, video or draft', 'Link zu Bild, Video oder Entwurf')}</span>
              <UrlInput value={post.link} onChange={(v) => up({ link: v }, true)} placeholder="Drive, Figma, Canva …" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-ink-3">{tr('Notes', 'Notizen')}</span>
              <AutoTextarea
                minRows={3}
                value={post.notes}
                placeholder={tr('Hashtags, repurposing ideas, learnings…', 'Hashtags, Ideen fürs Repurposing, Learnings …')}
                onChange={(e) => up({ notes: e.target.value }, true)}
                className="field text-[14px]"
              />
            </label>
          </div>
        </Disclosure>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-line px-6 py-3 text-[12px] text-ink-3">
        <span>
          {tr('Created', 'Erstellt')} {fmt(new Date(post.created_at), tr('MMM d, yyyy', 'd. MMM yyyy'))}
        </span>
        <ConfirmButton icon={<Trash className="size-3.5" />} onConfirm={() => removeItem('posts', post.id)}>
          {tr('Delete', 'Löschen')}
        </ConfirmButton>
      </footer>
    </>
  );
}

function UrlInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const valid = /^https?:\/\//.test(value);
  return (
    <div className="flex items-center gap-1">
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field h-8 py-0 text-[14px]" />
      {valid && (
        <a href={value} target="_blank" rel="noreferrer" aria-label={tr('Open link', 'Link öffnen')} className="rounded-lg p-2 text-ink-3 hover:bg-sunken hover:text-ink">
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
