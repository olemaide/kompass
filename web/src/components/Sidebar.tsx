import clsx from 'clsx';
import { CalendarDays, Grid3x3, Monitor, Moon, Plus, Search, Settings, SquareKanban, Sun, Sunrise, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { todayIso } from '../lib/dates';
import { modKey, tr } from '../lib/i18n';
import { go, href, type Route } from '../lib/router';
import { createItem, nextPosition, setPalette, useStore } from '../lib/store';
import { useTheme, type ThemePref } from '../lib/theme';
import { Logo } from './Logo';
import { Dot, Kbd } from './ui';

export function Sidebar({ route }: { route: Route }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const [theme, setTheme] = useTheme();
  const today = todayIso();
  const todayCount = tasks.filter((t) => t.status !== 'done' && (t.focus || (t.due_date && t.due_date <= today))).length;
  const active = projects.filter((p) => p.status === 'active' && !p.archived);

  const newProject = () => {
    const p = createItem('projects', { position: nextPosition(projects) });
    go(href.project(p.id));
  };

  const nextTheme: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeLabel = {
    system: tr('Theme: system', 'Design: wie System'),
    light: tr('Theme: light', 'Design: hell'),
    dark: tr('Theme: dark', 'Design: dunkel'),
  }[theme];

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-bg max-lg:w-[60px]">
      <div className="flex h-14 items-center gap-2.5 px-4.5">
        <Logo size={22} />
        <span className="text-[16px] font-semibold tracking-[-0.01em] max-lg:hidden">Kompass</span>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex h-8.5 w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink max-lg:justify-center"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left max-lg:hidden">{tr('Search or create', 'Suchen, anlegen')}</span>
          <span className="flex gap-0.5 max-lg:hidden">
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label={tr('Sections', 'Bereiche')}>
        <NavItem to={href.today} icon={<Sunrise />} active={route.name === 'today'} count={todayCount || undefined} shortcut="1">
          {tr('Today', 'Heute')}
        </NavItem>
        <NavItem to={href.board} icon={<SquareKanban />} active={route.name === 'board'} shortcut="2">
          Board
        </NavItem>
        <NavItem to={href.projects} icon={<FolderOpen />} active={route.name === 'projects'} shortcut="3">
          {tr('Projects', 'Projekte')}
        </NavItem>
        <NavItem to={href.content} icon={<CalendarDays />} active={route.name === 'content'} shortcut="4">
          Content
        </NavItem>
        <NavItem to={href.goals()} icon={<Grid3x3 />} active={route.name === 'goals'} shortcut="5">
          {tr('Goals', 'Ziele')}
        </NavItem>
      </nav>

      <div className="mt-7 flex min-h-0 flex-1 flex-col px-3 max-lg:hidden">
        <div className="flex h-7 items-center justify-between pr-1 pl-2.5">
          <span className="text-[12px] font-medium text-ink-3">{tr('Active projects', 'Aktive Projekte')}</span>
          <button
            type="button"
            aria-label={tr('New project', 'Neues Projekt')}
            title={tr('New project', 'Neues Projekt')}
            onClick={newProject}
            className="rounded-md p-1 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          {active.map((p) => (
            <a
              key={p.id}
              href={href.project(p.id)}
              className={clsx(
                'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
                route.name === 'project' && route.id === p.id ? 'bg-sunken text-ink' : 'text-ink-2 hover:bg-sunken/70 hover:text-ink',
              )}
            >
              <Dot color={p.color} />
              <span className="truncate">{p.name || tr('Unnamed', 'Ohne Namen')}</span>
            </a>
          ))}
          {active.length === 0 && <p className="px-2.5 py-1 text-[12px] text-ink-3">{tr('No active projects yet.', 'Noch keine aktiven Projekte.')}</p>}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line px-3 py-3 max-lg:items-center">
        <NavItem to={href.settings} icon={<Settings />} active={route.name === 'settings'}>
          {tr('Settings', 'Einstellungen')}
        </NavItem>
        <button
          type="button"
          onClick={() => setTheme(nextTheme[theme])}
          title={tr(`${themeLabel} – click to change`, `${themeLabel} – klicken zum Wechseln`)}
          className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink [&>svg]:size-4"
        >
          {theme === 'system' ? <Monitor /> : theme === 'light' ? <Sun /> : <Moon />}
          <span className="max-lg:hidden">{themeLabel}</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  active,
  count,
  shortcut,
  children,
}: {
  to: string;
  icon: ReactNode;
  active: boolean;
  count?: number;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      title={shortcut ? `${children} (${shortcut})` : undefined}
      className={clsx(
        'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
        active ? 'bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-line' : 'text-ink-2 hover:bg-sunken hover:text-ink',
      )}
    >
      {icon}
      <span className="flex-1 max-lg:hidden">{children}</span>
      {count !== undefined && <span className="tabular text-[12px] text-ink-3 max-lg:hidden">{count}</span>}
    </a>
  );
}
