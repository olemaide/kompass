import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { DueChip } from '../components/bits';
import { Page } from '../components/Page';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { Button, Disclosure, EmptyState, ProgressBar } from '../components/ui';
import { projectStats } from '../lib/derive';
import { tr } from '../lib/i18n';
import { PROJECT_STATUSES } from '../lib/meta';
import { go, href } from '../lib/router';
import { createItem, nextPosition, useStore } from '../lib/store';
import type { Project } from '../lib/types';

export function Projects() {
  const projects = useStore((s) => s.projects);
  const active = projects.filter((p) => p.status === 'active' && !p.archived);
  const rest = projects.filter((p) => !active.includes(p));

  const add = () => go(href.project(createItem('projects', { position: nextPosition(projects) }).id));

  return (
    <Page
      title={tr('Projects', 'Projekte')}
      actions={
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={add}>
          {tr('New project', 'Neues Projekt')}
        </Button>
      }
    >
      {projects.length === 0 ? (
        <EmptyState
          title={tr('No projects yet', 'Noch keine Projekte')}
          action={<Button onClick={add}>{tr('Create your first project', 'Erstes Projekt anlegen')}</Button>}
        >
          {tr(
            'A project bundles tasks, content and notes – for example your website or a podcast.',
            'Ein Projekt bündelt Aufgaben, Content und Notizen – zum Beispiel deine Website oder ein Podcast.',
          )}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col border-t border-line">
            {active.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
          {rest.length > 0 && (
            <Disclosure title={tr('Paused, ideas and completed', 'Pausiert, Ideen und Abgeschlossen')} count={rest.length} className="mt-8">
              <div className="flex flex-col border-t border-line">
                {rest.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>
            </Disclosure>
          )}
        </>
      )}
    </Page>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const tasks = useStore((s) => s.tasks);
  const posts = useStore((s) => s.posts);
  const s = projectStats(project.id, tasks);
  const nextDue = tasks
    .filter((t) => t.project_id === project.id && t.status !== 'done' && t.due_date)
    .map((t) => t.due_date!)
    .sort()[0];
  const planned = posts.filter((p) => p.project_id === project.id && p.status === 'scheduled').length;
  const status = PROJECT_STATUSES.find((x) => x.id === project.status);
  const pct = Math.round(s.pct * 100);

  return (
    <a
      href={href.project(project.id)}
      className="group grid grid-cols-[44px_minmax(0,1fr)_200px_150px] items-center gap-5 border-b border-line py-4 transition-colors hover:bg-surface max-md:grid-cols-[44px_1fr]"
    >
      <ProjectAvatar project={project} size={40} className="ml-1" />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-[17px] font-semibold tracking-[-0.01em]">{project.name || tr('Unnamed', 'Ohne Namen')}</span>
          {project.status !== 'active' && <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-ink-3">{status?.label}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-3">{project.description || tr('No description', 'Keine Beschreibung')}</span>
      </span>
      <span className="flex flex-col gap-1.5 max-md:hidden">
        <span className="flex justify-between text-[12px]">
          <span className="text-ink-2">
            {s.total ? tr(`${s.done} of ${s.total} done`, `${s.done} von ${s.total} erledigt`) : tr('No tasks yet', 'Noch keine Aufgaben')}
          </span>
          {s.total > 0 && <span className="tabular text-ink-3">{tr(`${pct}%`, `${pct} %`)}</span>}
        </span>
        <ProgressBar value={s.pct} color={project.color} />
      </span>
      <span className={clsx('flex flex-col items-end gap-1 pr-3 text-[12px] text-ink-3 max-md:hidden')}>
        {nextDue ? <DueChip date={nextDue} /> : <span>{tr('Nothing due', 'Nichts fällig')}</span>}
        {planned > 0 && (
          <span>{planned === 1 ? tr('1 post scheduled', '1 Post geplant') : tr(`${planned} posts scheduled`, `${planned} Posts geplant`)}</span>
        )}
      </span>
    </a>
  );
}
