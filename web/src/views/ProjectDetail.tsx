import { ArrowLeft, Check, CodeXml, Globe, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { PlatformBadges } from '../components/bits';
import { Page } from '../components/Page';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { AutoTextarea, Button, ConfirmButton, EmptyState, Popover, ProgressBar, Segmented, Select } from '../components/ui';
import { projectStats } from '../lib/derive';
import { fmt } from '../lib/dates';
import { tr } from '../lib/i18n';
import { PROJECT_COLORS, PROJECT_STATUSES, postStatusMeta } from '../lib/meta';
import { go, href } from '../lib/router';
import { createItem, nextPosition, openPanel, removeItem, updateItem, useStore } from '../lib/store';
import { usePersisted } from '../lib/theme';
import type { Project } from '../lib/types';
import { TaskBoard } from './Board';

type Tab = 'tasks' | 'content' | 'notes' | 'details';

export function ProjectDetail({ id }: { id: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const tasks = useStore((s) => s.tasks);
  const [tab, setTab] = usePersisted<Tab>('project.tab', 'tasks');

  if (!project) {
    return (
      <Page title={tr('Project not found', 'Projekt nicht gefunden')}>
        <EmptyState
          title={tr('This project no longer exists.', 'Dieses Projekt gibt es nicht mehr.')}
          action={<Button onClick={() => go(href.projects)}>{tr('Go to projects', 'Zu den Projekten')}</Button>}
        />
      </Page>
    );
  }

  const up = (patch: Partial<Project>, debounce = false) => updateItem('projects', project.id, patch, { debounce });
  const stats = projectStats(project.id, tasks);
  const projectTasks = tasks.filter((t) => t.project_id === project.id);

  return (
    <Page
      above={
        <a href={href.projects} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" />
          {tr('Projects', 'Projekte')}
        </a>
      }
      title={
        <span className="flex items-center gap-3">
          <ColorPicker project={project} onChange={(color) => up({ color })} />
          <input
            value={project.name}
            autoFocus={!project.name}
            placeholder={tr('Project name', 'Projektname')}
            aria-label={tr('Project name', 'Projektname')}
            onChange={(e) => up({ name: e.target.value }, true)}
            className="bare display min-w-0"
          />
        </span>
      }
      lead={
        <input
          value={project.description}
          placeholder={tr("What's it about? One sentence is enough.", 'Worum geht es? Ein Satz reicht.')}
          aria-label={tr('Description', 'Beschreibung')}
          onChange={(e) => up({ description: e.target.value }, true)}
          className="bare text-[15px] text-ink-2"
        />
      }
      actions={
        <div className="flex items-center gap-1">
          {project.url && <LinkButton url={project.url} icon={<Globe className="size-4" />} label="Website" />}
          {project.repo && <LinkButton url={project.repo} icon={<CodeXml className="size-4" />} label="Repo" />}
          <Select label={tr('Project status', 'Projektstatus')} value={project.status} options={PROJECT_STATUSES} onChange={(status) => up({ status })} className="w-40" />
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <ProgressBar value={stats.pct} color={project.color} className="w-40" />
          <span className="text-[13px] text-ink-2">
            {stats.total
              ? tr(`${stats.done} of ${stats.total} tasks done`, `${stats.done} von ${stats.total} Aufgaben erledigt`)
              : tr('No tasks yet', 'Noch keine Aufgaben')}
          </span>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'tasks', label: tr('Tasks', 'Aufgaben') },
            { id: 'content', label: 'Content' },
            { id: 'notes', label: tr('Notes', 'Notizen') },
            { id: 'details', label: 'Details' },
          ]}
        />
      </div>

      {tab === 'tasks' && (
        <div className="flex min-h-[420px]">
          <TaskBoard tasks={projectTasks} projectId={project.id} />
        </div>
      )}
      {tab === 'content' && <ProjectContent project={project} />}
      {tab === 'notes' && (
        <AutoTextarea
          minRows={14}
          value={project.notes}
          placeholder={tr(
            'Ideas, decisions, where logins live, contacts … everything that belongs to this project.',
            'Ideen, Entscheidungen, Zugangsorte, Kontakte … alles, was zu diesem Projekt gehört.',
          )}
          onChange={(e) => up({ notes: e.target.value }, true)}
          className="field max-w-[820px] px-4 py-3 text-[15px] leading-relaxed"
        />
      )}
      {tab === 'details' && <ProjectDetails project={project} />}
    </Page>
  );
}

function LinkButton({ url, icon, label }: { url: string; icon: React.ReactNode; label: string }) {
  const full = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return (
    <a href={full} target="_blank" rel="noreferrer" title={full} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-2 hover:bg-sunken hover:text-ink">
      {icon}
      {label}
    </a>
  );
}

function ColorPicker({ project, onChange }: { project: Project; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const value = project.color;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={tr('Choose color', 'Farbe wählen')}
        onClick={() => setOpen(!open)}
        className="size-7 shrink-0 rounded-lg ring-offset-2 ring-offset-bg transition-shadow hover:ring-2 hover:ring-line-strong"
      >
        <ProjectAvatar project={project} size={28} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="grid w-auto min-w-0 grid-cols-5 gap-1.5 p-2.5">
        {PROJECT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={tr(`Color ${c}`, `Farbe ${c}`)}
            onClick={() => {
              onChange(c);
              setOpen(false);
            }}
            className="flex size-7 items-center justify-center rounded-lg"
            style={{ background: c }}
          >
            {c === value && <Check className="size-4 text-white" strokeWidth={3} />}
          </button>
        ))}
      </Popover>
    </span>
  );
}

function ProjectContent({ project }: { project: Project }) {
  const posts = useStore((s) => s.posts);
  const mine = posts
    .filter((p) => p.project_id === project.id)
    .sort((a, b) => (a.scheduled_date ?? '9999').localeCompare(b.scheduled_date ?? '9999'));
  const add = () =>
    openPanel({ kind: 'post', id: createItem('posts', { project_id: project.id, position: nextPosition(posts) }).id });

  return (
    <div className="max-w-[820px]">
      <div className="mb-3 flex justify-end">
        <Button icon={<Plus className="size-4" />} onClick={add}>
          {project.name ? tr(`Post for ${project.name}`, `Post für ${project.name}`) : tr('Post for this project', 'Post für dieses Projekt')}
        </Button>
      </div>
      {mine.length === 0 ? (
        <EmptyState title={tr('No content for this project yet', 'Noch kein Content zu diesem Projekt')}>
          {tr(
            'Plan posts that put the project in front of people – launch, learnings, behind the scenes.',
            'Plane Posts, die das Projekt sichtbar machen – Launch, Learnings, Behind the Scenes.',
          )}
        </EmptyState>
      ) : (
        <div className="flex flex-col border-t border-line">
          {mine.map((p) => {
            const st = postStatusMeta(p.status);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openPanel({ kind: 'post', id: p.id })}
                className="flex items-center gap-4 border-b border-line px-1 py-3 text-left transition-colors hover:bg-surface"
              >
                <span className="w-24 shrink-0 text-[13px] text-ink-3">{p.scheduled_date ? fmt(p.scheduled_date, tr('EEE, MMM d', 'EE d. MMM')) : tr('Unscheduled', 'Ohne Termin')}</span>
                <PlatformBadges platforms={p.platforms} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{p.title || tr('Untitled', 'Ohne Titel')}</span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
                  <span className="size-2 rounded-full" style={{ background: st.color }} />
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectDetails({ project }: { project: Project }) {
  const up = (patch: Partial<Project>) => updateItem('projects', project.id, patch, { debounce: true });
  return (
    <div className="flex max-w-[560px] flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">Website</span>
        <input value={project.url} onChange={(e) => up({ url: e.target.value })} placeholder="https://…" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">Repository</span>
        <input value={project.repo} onChange={(e) => up({ repo: e.target.value })} placeholder="https://github.com/…" className="field" />
      </label>
      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-2 text-[13px] text-ink-3">
          {tr(
            'Deleting keeps your tasks, posts and goals – they just lose their link to this project.',
            'Beim Löschen bleiben Aufgaben, Posts und Ziele erhalten – sie verlieren nur die Zuordnung zu diesem Projekt.',
          )}
        </p>
        <ConfirmButton
          icon={<Trash className="size-3.5" />}
          confirmLabel={tr('Really delete project?', 'Projekt wirklich löschen?')}
          onConfirm={() => {
            removeItem('projects', project.id);
            go(href.projects);
          }}
        >
          {tr('Delete project', 'Projekt löschen')}
        </ConfirmButton>
      </div>
    </div>
  );
}
