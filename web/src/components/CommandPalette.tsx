import clsx from 'clsx';
import {
  CalendarDays,
  CornerDownLeft,
  FolderOpen,
  Grid3x3,
  Lightbulb,
  Plus,
  Search,
  Settings,
  SquareKanban,
  SquarePen,
  Sunrise,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createTaskFromText } from '../lib/actions';
import { tr } from '../lib/i18n';
import { parseQuickAdd } from '../lib/quickadd';
import { go, href } from '../lib/router';
import { createItem, nextPosition, openPanel, setPalette, toast, useStore } from '../lib/store';
import { Dot, Kbd } from './ui';

interface Item {
  id: string;
  group: string;
  icon: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  return open ? <Palette /> : null;
}

function Palette() {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const posts = useStore((s) => s.posts);
  const goals = useStore((s) => s.goals);

  const close = () => setPalette(false);
  const done = (fn: () => void) => () => {
    close();
    fn();
  };

  const items = useMemo<Item[]>(() => {
    const text = q.trim();
    const needle = text.toLowerCase();
    const goTo = tr('Go to', 'Wechseln zu');
    const nav: Item[] = [
      { id: 'n-today', group: goTo, icon: <Sunrise />, label: tr('Today', 'Heute'), hint: '1', run: () => go(href.today) },
      { id: 'n-board', group: goTo, icon: <SquareKanban />, label: 'Board', hint: '2', run: () => go(href.board) },
      { id: 'n-projects', group: goTo, icon: <FolderOpen />, label: tr('Projects', 'Projekte'), hint: '3', run: () => go(href.projects) },
      { id: 'n-content', group: goTo, icon: <CalendarDays />, label: 'Content', hint: '4', run: () => go(href.content) },
      { id: 'n-goals', group: goTo, icon: <Grid3x3 />, label: tr('Goals', 'Ziele'), hint: '5', run: () => go(href.goals()) },
      { id: 'n-settings', group: goTo, icon: <Settings />, label: tr('Settings', 'Einstellungen'), run: () => go(href.settings) },
    ];
    const newGroup = tr('New', 'Neu');
    const found = tr('Results', 'Gefunden');

    if (!text) {
      return [
        {
          id: 'c-task',
          group: newGroup,
          icon: <Plus />,
          label: tr('Task', 'Aufgabe'),
          hint: tr('or just start typing', 'oder einfach lostippen'),
          run: () => openPanel({ kind: 'task', id: createTaskFromText('').id }),
        },
        {
          id: 'c-post',
          group: newGroup,
          icon: <SquarePen />,
          label: 'Post',
          run: () => openPanel({ kind: 'post', id: createItem('posts', { position: nextPosition(posts) }).id }),
        },
        {
          id: 'c-project',
          group: newGroup,
          icon: <FolderOpen />,
          label: tr('Project', 'Projekt'),
          run: () => go(href.project(createItem('projects', { position: nextPosition(projects) }).id)),
        },
        {
          id: 'c-goal',
          group: newGroup,
          icon: <Grid3x3 />,
          label: tr('Goal with 64 chart', 'Ziel mit 64-Raster'),
          run: () => go(href.goals(createItem('goals', { position: nextPosition(goals) }).id)),
        },
        ...nav,
      ];
    }

    const parsed = parseQuickAdd(text, projects);
    const out: Item[] = [
      {
        id: 'q-task',
        group: newGroup,
        icon: <Plus />,
        label: (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{tr('Task', 'Aufgabe')}: {parsed.title}</span>
            {parsed.tokens.map((t) => (
              <span key={t.kind} className="shrink-0 rounded-md bg-accent-soft px-1.5 py-px text-[11px] font-medium text-accent">
                {t.label}
              </span>
            ))}
          </span>
        ),
        run: () => {
          const task = createTaskFromText(text);
          toast(tr(`Task created: ${task.title}`, `Aufgabe angelegt: ${task.title}`), 'info', {
            label: tr('Open', 'Öffnen'),
            run: () => openPanel({ kind: 'task', id: task.id }),
          });
        },
      },
      {
        id: 'q-post',
        group: newGroup,
        icon: <Lightbulb />,
        label: <span className="truncate">{tr('Post idea', 'Post-Idee')}: {text}</span>,
        run: () => {
          createItem('posts', { title: text, status: 'idea', position: nextPosition(posts) });
          toast(tr('Idea saved – it’s waiting in the content planner', 'Idee gespeichert – sie wartet im Content-Planer'));
        },
      },
      {
        id: 'q-project',
        group: newGroup,
        icon: <FolderOpen />,
        label: <span className="truncate">{tr('Project', 'Projekt')}: {text}</span>,
        run: () => go(href.project(createItem('projects', { name: text, position: nextPosition(projects) }).id)),
      },
    ];

    const match = (s: string) => s.toLowerCase().includes(needle);
    for (const p of projects.filter((p) => match(p.name)).slice(0, 4)) {
      out.push({ id: `p-${p.id}`, group: found, icon: <Dot color={p.color} />, label: p.name, hint: tr('Project', 'Projekt'), run: () => go(href.project(p.id)) });
    }
    for (const g of goals.filter((g) => match(g.title)).slice(0, 3)) {
      out.push({ id: `g-${g.id}`, group: found, icon: <Grid3x3 />, label: g.title, hint: tr('Goal', 'Ziel'), run: () => go(href.goals(g.id)) });
    }
    for (const t of tasks.filter((t) => match(t.title)).slice(0, 6)) {
      out.push({
        id: `t-${t.id}`,
        group: found,
        icon: <SquareKanban />,
        label: <span className={clsx('truncate', t.status === 'done' && 'text-ink-3 line-through')}>{t.title}</span>,
        hint: tr('Task', 'Aufgabe'),
        run: () => openPanel({ kind: 'task', id: t.id }),
      });
    }
    for (const p of posts.filter((p) => match(p.title) || match(p.body)).slice(0, 4)) {
      out.push({ id: `c-${p.id}`, group: found, icon: <CalendarDays />, label: <span className="truncate">{p.title || tr('Untitled', 'Ohne Titel')}</span>, hint: 'Post', run: () => openPanel({ kind: 'post', id: p.id }) });
    }
    out.push(...nav.filter((n) => match(String(n.label))));
    return out;
  }, [q, projects, tasks, posts, goals]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[sel];
      if (item) done(item.run)();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]" onKeyDown={onKey}>
      <div className="anim-fade absolute inset-0 bg-black/15 dark:bg-black/50" onClick={close} />
      <div role="dialog" aria-label={tr('Search or create', 'Suchen oder erstellen')} className="anim-pop relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4.5 text-ink-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr('Search, jump to, or quickly create something…', 'Suchen, springen oder schnell etwas anlegen …')}
            className="bare h-14 text-[16px]"
          />
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && <div className="px-3 pt-2.5 pb-1 text-[12px] font-medium text-ink-3">{header}</div>}
                <button
                  type="button"
                  data-selected={i === sel}
                  onMouseMove={() => setSel(i)}
                  onClick={done(item.run)}
                  className={clsx(
                    'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px]',
                    i === sel ? 'bg-sunken text-ink' : 'text-ink-2',
                  )}
                >
                  <span className="flex w-4 justify-center text-ink-3 [&>svg]:size-4">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="text-[12px] text-ink-3">{item.hint}</span>}
                  {i === sel && <CornerDownLeft className="size-3.5 text-ink-3" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-raised px-4 py-2.5 text-[12px] text-ink-3">
          <span>{tr('Quick add:', 'Schnelleingabe:')}</span>
          <span>
            <Kbd>#</Kbd> {tr('project', 'Projekt')}
          </span>
          <span>{tr('today, tomorrow, Friday, next week', 'heute, morgen, freitag, 24.12.')}</span>
          <span>
            <Kbd>!</Kbd> {tr('to', 'bis')} <Kbd>!!!</Kbd> {tr('priority', 'Priorität')}
          </span>
          <span>
            <Kbd>*</Kbd> {tr('focus', 'Fokus')}
          </span>
        </div>
      </div>
    </div>
  );
}
