import { useEffect, useState } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Logo } from './components/Logo';
import { PanelHost } from './components/Panels';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { Button, useHotkey } from './components/ui';
import { api } from './lib/api';
import { tr } from './lib/i18n';
import { go, href, useRoute, type Route } from './lib/router';
import { load, setPalette, useStore } from './lib/store';
import { Board } from './views/Board';
import { Content } from './views/Content';
import { Goals } from './views/Goals';
import { ProjectDetail } from './views/ProjectDetail';
import { Projects } from './views/Projects';
import { Settings } from './views/Settings';
import { Today } from './views/Today';

const NAV_KEYS = [href.today, href.board, href.projects, href.content, href.goals()];

function View({ route }: { route: Route }) {
  switch (route.name) {
    case 'board':
      return <Board />;
    case 'projects':
      return <Projects />;
    case 'project':
      return <ProjectDetail id={route.id} />;
    case 'content':
      return <Content />;
    case 'goals':
      return <Goals id={route.id} />;
    case 'settings':
      return <Settings />;
    default:
      return <Today />;
  }
}

export function App() {
  const ready = useStore((s) => s.ready);
  const loadError = useStore((s) => s.loadError);
  const route = useRoute();

  useEffect(() => {
    void load();
  }, []);

  // The open stream tells the server a window is alive; losing it means edits can't be saved.
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const events = new EventSource('/api/events');
    let timer: number | undefined;
    let lost = false;
    events.onopen = () => {
      clearTimeout(timer);
      if (lost) void load();
      lost = false;
      setOffline(false);
    };
    events.onerror = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        lost = true;
        setOffline(true);
      }, 4000);
    };
    return () => {
      clearTimeout(timer);
      events.close();
    };
  }, []);

  // Links to the outside world open in the normal browser, not inside the app window.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[target="_blank"]') as HTMLAnchorElement | null;
      if (!a || !/^https?:/.test(a.href) || a.origin === location.origin) return;
      e.preventDefault();
      api.openExternal(a.href).catch(() => window.open(a.href, '_blank', 'noopener'));
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, []);

  useHotkey('k', (e) => {
    e.preventDefault();
    setPalette(!useStore.getState().paletteOpen);
  }, { mod: true });
  useHotkey('n', (e) => {
    if (useStore.getState().panel) return;
    e.preventDefault();
    setPalette(true);
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      const to = NAV_KEYS[Number(e.key) - 1];
      const s = useStore.getState();
      if (to && !s.panel && !s.paletteOpen) go(to);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Logo size={36} />
        {loadError ? (
          <>
            <p className="text-ink-2">
              {tr('Your data could not be loaded:', 'Die Daten konnten nicht geladen werden:')} {loadError}
            </p>
            <Button onClick={() => void load()}>{tr('Try again', 'Erneut versuchen')}</Button>
          </>
        ) : (
          <p className="text-[13px] text-ink-3">{tr('Loading …', 'Lade …')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {offline && (
        <div role="alert" className="fixed top-3 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-danger px-4 py-2.5 text-[13px] font-medium text-white shadow-overlay">
          {tr(
            'No connection to the Kompass server. Changes are not being saved right now – please restart Kompass.',
            'Keine Verbindung zum Kompass-Server. Änderungen werden gerade nicht gespeichert – bitte Kompass neu starten.',
          )}
        </div>
      )}
      <Sidebar route={route} />
      {/* Reserve the scrollbar even when nothing scrolls, so the page width stays the same on every view. */}
      <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <View route={route} />
      </main>
      <a
        href="https://manypi.com"
        target="_blank"
        rel="noreferrer"
        className="fixed right-4 bottom-2 z-20 rounded-full bg-bg/80 px-2 py-0.5 text-[11px] text-ink-3 backdrop-blur-sm transition-colors hover:text-ink"
      >
        {tr('Made by', 'Gemacht von')} <span className="font-medium">ManyPi</span>
      </a>
      <PanelHost />
      <CommandPalette />
      <Toasts />
    </div>
  );
}
