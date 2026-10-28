import clsx from 'clsx';
import { Plus, Repeat } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PlatformBadges } from '../components/bits';
import { Page } from '../components/Page';
import { TaskRow } from '../components/TaskItems';
import { AutoTextarea, Checkbox, Disclosure, ProgressBar } from '../components/ui';
import { createTaskFromText } from '../lib/actions';
import { daysFromToday, fmt, iso, todayIso, weekDays } from '../lib/dates';
import { indexLogs, isAction, projectStats, routineStreak } from '../lib/derive';
import { tr } from '../lib/i18n';
import { PILLAR_COLORS, postStatusMeta } from '../lib/meta';
import { parseQuickAdd } from '../lib/quickadd';
import { href } from '../lib/router';
import { openPanel, setJournal, toggleRoutine, useStore } from '../lib/store';
import type { Task } from '../lib/types';

const byUrgency = (a: Task, b: Task) =>
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || b.priority - a.priority || a.position - b.position;

export function Today() {
  const tasks = useStore((s) => s.tasks);
  const posts = useStore((s) => s.posts);
  const today = todayIso();

  const open = tasks.filter((t) => t.status !== 'done');
  const focus = open.filter((t) => t.focus || (t.due_date && t.due_date <= today)).sort(byUrgency);
  const overdue = focus.filter((t) => t.due_date && t.due_date < today).length;
  const upcoming = open
    .filter((t) => !focus.includes(t) && t.due_date && daysFromToday(t.due_date) <= 7)
    .sort(byUrgency);
  const doneToday = tasks.filter((t) => t.status === 'done' && t.completed_at && iso(new Date(t.completed_at)) === today);
  const week = weekDays(new Date()).map(iso);
  const weekPosts = posts.filter((p) => p.scheduled_date && week.includes(p.scheduled_date) && p.status !== 'published');

  const lead = [
    focus.length === 0
      ? tr('Nothing is due today.', 'Heute ist nichts fällig.')
      : focus.length === 1
        ? tr(
            `One task for today${overdue ? ', and it’s overdue' : ''}.`,
            `Eine Aufgabe steht heute an${overdue ? `, ${overdue} davon überfällig` : ''}.`,
          )
        : tr(
            `${focus.length} tasks for today${overdue ? `, ${overdue} of them overdue` : ''}.`,
            `${focus.length} Aufgaben stehen heute an${overdue ? `, ${overdue} davon überfällig` : ''}.`,
          ),
    weekPosts.length
      ? weekPosts.length === 1
        ? tr('One post planned this week.', 'Diese Woche ist ein Post eingeplant.')
        : tr(`${weekPosts.length} posts planned this week.`, `Diese Woche sind ${weekPosts.length} Posts eingeplant.`)
      : tr('No posts planned for this week yet.', 'Für diese Woche ist noch kein Post eingeplant.'),
  ].join(' ');

  return (
    <Page title={fmt(new Date(), tr('EEEE, MMMM d', 'EEEE, d. MMMM'))} lead={lead}>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-14 max-xl:grid-cols-1 max-xl:gap-10">
        <div className="min-w-0">
          <section aria-labelledby="focus-h">
            <h2 id="focus-h" className="sr-only">
              {tr('Today’s focus', 'Fokus heute')}
            </h2>
            <QuickAdd />
            <div className="mt-2 flex flex-col">
              {focus.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
            {focus.length === 0 && (
              <p className="py-4 text-[14px] text-ink-3">
                {tr('Type what matters today above, or mark tasks on the', 'Schreib oben, was heute zählt, oder markiere Aufgaben im')}{' '}
                <a href={href.board} className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
                  {tr('Board', 'Board')}
                </a>{' '}
                {tr('with a star.', 'mit dem Stern.')}
              </p>
            )}
            {doneToday.length > 0 && (
              <Disclosure title={tr('Done today', 'Heute erledigt')} count={doneToday.length} className="mt-3">
                <div className="flex flex-col">
                  {doneToday.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </Disclosure>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="mt-12" aria-labelledby="next-h">
              <h2 id="next-h" className="section-title mb-2">
                {tr('Next 7 days', 'Die nächsten 7 Tage')}
              </h2>
              <div className="flex flex-col">
                {upcoming.slice(0, 6).map((t) => (
                  <TaskRow key={t.id} task={t} muted />
                ))}
              </div>
              {upcoming.length > 6 && (
                <a href={href.board} className="mt-1 inline-block text-[13px] text-ink-3 hover:text-ink">
                  {tr(`${upcoming.length - 6} more on the board`, `${upcoming.length - 6} weitere im Board`)}
                </a>
              )}
            </section>
          )}

          <ProjectsOverview />
        </div>

        <aside className="flex min-w-0 flex-col gap-11 border-l border-line pl-10 max-xl:border-l-0 max-xl:pl-0">
          <Routines />
          <ContentWeek />
          <DayNote />
        </aside>
      </div>
    </Page>
  );
}

function QuickAdd() {
  const projects = useStore((s) => s.projects);
  const [text, setText] = useState('');
  const parsed = text.trim() ? parseQuickAdd(text, projects) : null;
  const submit = () => {
    if (!text.trim()) return;
    createTaskFromText(text, { focus: true });
    setText('');
  };
  return (
    <div className="group flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)] hover:border-line-strong">
      <Plus className="size-4.5 text-ink-3 group-focus-within:text-accent" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={tr('What’s on for today?', 'Was steht heute an?')}
        aria-label={tr('Add a task for today', 'Aufgabe für heute hinzufügen')}
        className="bare h-12 text-[15px]"
      />
      {parsed?.tokens.map((t) => (
        <span key={t.kind} className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[12px] font-medium text-accent">
          {t.label}
        </span>
      ))}
      {!parsed && <span className="shrink-0 text-[12px] text-ink-3 max-md:hidden">{tr('#project tomorrow !!!', '#projekt morgen !!!')}</span>}
    </div>
  );
}

function ProjectsOverview() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const active = projects.filter((p) => p.status === 'active' && !p.archived);
  if (!active.length) return null;
  return (
    <section className="mt-12" aria-labelledby="proj-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="proj-h" className="section-title">
          {tr('Projects', 'Projekte')}
        </h2>
        <a href={href.projects} className="text-[13px] text-ink-3 hover:text-ink">
          {tr('All projects', 'Alle Projekte')}
        </a>
      </div>
      <div className="grid grid-cols-2 gap-x-10 gap-y-1 max-md:grid-cols-1">
        {active.map((p) => {
          const s = projectStats(p.id, tasks);
          return (
            <a key={p.id} href={href.project(p.id)} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.name || tr('Unnamed', 'Ohne Namen')}</span>
              <span className="tabular text-[12px] text-ink-3">{tr(`${s.open} open`, `${s.open} offen`)}</span>
              <ProgressBar value={s.pct} color={p.color} className="w-20" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function Routines() {
  const cells = useStore((s) => s.cells);
  const goals = useStore((s) => s.goals);
  const logs = useStore((s) => s.logs);
  const index = useMemo(() => indexLogs(logs), [logs]);
  const today = todayIso();
  const live = new Set(goals.filter((g) => !g.archived).map((g) => g.id));
  const routines = cells.filter((c) => c.kind === 'routine' && isAction(c) && live.has(c.goal_id));
  const doneCount = routines.filter((c) => index.get(c.id)?.has(today)).length;

  return (
    <section aria-labelledby="routines-h">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="routines-h" className="section-title">
          {tr('Routines', 'Routinen')}
        </h2>
        {routines.length > 0 && (
          <span className="tabular text-[12px] text-ink-3">
            {tr(`${doneCount} of ${routines.length}`, `${doneCount} von ${routines.length}`)}
          </span>
        )}
      </div>
      {routines.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ink-3">
          {tr('Routines come from your', 'Routinen entstehen in deinen')}{' '}
          <a href={href.goals()} className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            {tr('Goals', 'Zielen')}
          </a>
          {tr(
            ': mark an action in the 64 chart as a routine, then check it off here every day.',
            ': Markiere eine Aktion im 64-Raster als Routine, dann kannst du sie hier täglich abhaken.',
          )}
        </p>
      ) : (
        <ul className="flex flex-col">
          {routines.map((c) => {
            const done = index.get(c.id)?.has(today) ?? false;
            const streak = routineStreak(c.id, index);
            const color = PILLAR_COLORS[c.pillar];
            return (
              <li key={c.id} className="flex min-h-10 items-center gap-3">
                <Checkbox checked={done} color={color} onChange={() => toggleRoutine(c.id, today)} label={c.title} />
                <span className={clsx('min-w-0 flex-1 truncate text-[14px]', done && 'text-ink-3')}>{c.title}</span>
                {streak > 1 && (
                  <span className="tabular inline-flex items-center gap-1 text-[12px] text-ink-3" title={tr('Days in a row', 'Tage in Folge')}>
                    <Repeat className="size-3" />
                    {streak}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ContentWeek() {
  const posts = useStore((s) => s.posts);
  const days = weekDays(new Date());
  const today = todayIso();
  const upcoming = posts
    .filter((p) => p.scheduled_date && p.scheduled_date >= today && p.status !== 'published')
    .sort((a, b) => `${a.scheduled_date}${a.scheduled_time ?? ''}`.localeCompare(`${b.scheduled_date}${b.scheduled_time ?? ''}`));
  const next = upcoming[0];

  return (
    <section aria-labelledby="content-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="content-h" className="section-title">
          {tr('Content this week', 'Content diese Woche')}
        </h2>
        <a href={href.content} className="text-[13px] text-ink-3 hover:text-ink">
          {tr('Planner', 'Planer')}
        </a>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = iso(d);
          const list = posts.filter((p) => p.scheduled_date === key);
          const isToday = key === today;
          return (
            <a
              key={key}
              href={href.content}
              title={list.map((p) => p.title).join('\n') || undefined}
              className={clsx(
                'flex flex-col items-center gap-1.5 rounded-lg py-2 transition-colors hover:bg-surface',
                isToday && 'bg-surface ring-1 ring-line',
              )}
            >
              <span className={clsx('text-[11px]', isToday ? 'font-semibold text-accent' : 'text-ink-3')}>{fmt(d, 'EEEEEE')}</span>
              <span className={clsx('tabular text-[13px] font-medium', isToday ? 'text-ink' : 'text-ink-2')}>{fmt(d, 'd')}</span>
              <span className="flex h-2 items-center gap-0.5">
                {list.slice(0, 3).map((p) => (
                  <span key={p.id} className="size-1.5 rounded-full" style={{ background: postStatusMeta(p.status).color }} />
                ))}
              </span>
            </a>
          );
        })}
      </div>
      {next ? (
        <button
          type="button"
          onClick={() => openPanel({ kind: 'post', id: next.id })}
          className="mt-3 flex w-full flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong"
        >
          <span className="text-[12px] text-ink-3">
            {tr(`Up next, ${fmt(next.scheduled_date!, 'EEEE')}`, `Als Nächstes, ${fmt(next.scheduled_date!, 'EEEE')}`)}
            {next.scheduled_time ? tr(` at ${next.scheduled_time}`, ` um ${next.scheduled_time}`) : ''}
          </span>
          <span className="flex items-center gap-2">
            <PlatformBadges platforms={next.platforms} />
            <span className="truncate text-[14px] font-medium">{next.title || tr('Untitled', 'Ohne Titel')}</span>
          </span>
        </button>
      ) : (
        <p className="mt-3 text-[13px] text-ink-3">
          {tr('Nothing scheduled. Drag ideas onto a day in the planner.', 'Nichts terminiert. Ideen kannst du im Planer auf einen Tag ziehen.')}
        </p>
      )}
    </section>
  );
}

function DayNote() {
  const today = todayIso();
  const entry = useStore((s) => s.journal[today]);
  const hasText = Boolean(entry?.plan || entry?.reflection);
  const [open, setOpen] = useState(hasText);

  return (
    <section aria-labelledby="note-h">
      <h2 id="note-h" className="section-title mb-2">
        {tr('Daily note', 'Tagesnotiz')}
      </h2>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dashed border-line-strong px-3 py-3 text-left text-[13px] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
        >
          {tr(
            'Plan briefly, reflect in the evening: the Harada journal in two questions.',
            'Kurz planen und abends reflektieren – das Harada-Tagebuch in zwei Fragen.',
          )}
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-2">{tr('What would make today a good day?', 'Was macht heute zu einem guten Tag?')}</span>
            <AutoTextarea
              minRows={2}
              autoFocus={!hasText}
              value={entry?.plan ?? ''}
              onChange={(e) => setJournal(today, { plan: e.target.value })}
              className="field text-[14px]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-2">{tr('What went well, and what did you learn?', 'Was lief gut, was nehme ich mit?')}</span>
            <AutoTextarea
              minRows={2}
              value={entry?.reflection ?? ''}
              onChange={(e) => setJournal(today, { reflection: e.target.value })}
              className="field text-[14px]"
            />
          </label>
        </div>
      )}
    </section>
  );
}
