import clsx from 'clsx';
import { CalendarDays, Flag, X } from 'lucide-react';
import { dueLabel, fmt } from '../lib/dates';
import { tr } from '../lib/i18n';
import { platformMeta } from '../lib/meta';
import { useStore } from '../lib/store';
import type { Platform, Priority, Project } from '../lib/types';
import { Dot, Select } from './ui';

const toneClass = {
  overdue: 'text-danger',
  today: 'text-accent',
  soon: 'text-ink-2',
  later: 'text-ink-3',
};

export function DueChip({ date, done, className }: { date: string; done?: boolean; className?: string }) {
  const { label, tone } = dueLabel(date);
  return (
    <span
      title={fmt(date, tr('EEEE, MMMM d, yyyy', 'EEEE, d. MMMM yyyy'))}
      className={clsx('inline-flex items-center gap-1 text-[12px] font-medium', done ? 'text-ink-3' : toneClass[tone], className)}
    >
      <CalendarDays className="size-3.5" />
      {label}
    </span>
  );
}

export function PriorityFlag({ priority }: { priority: Priority }) {
  if (priority < 2) return null;
  return (
    <Flag
      aria-label={priority === 3 ? tr('High priority', 'Hohe Priorität') : tr('Medium priority', 'Mittlere Priorität')}
      className={clsx('size-3.5 shrink-0', priority === 3 ? 'fill-danger text-danger' : 'text-warn')}
    />
  );
}

export function ProjectTag({ project, className }: { project?: Project; className?: string }) {
  if (!project) return null;
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3', className)}>
      <Dot color={project.color} size={7} />
      <span className="truncate">{project.name || tr('Unnamed', 'Ohne Namen')}</span>
    </span>
  );
}

export function PlatformBadges({ platforms, size = 'sm' }: { platforms: Platform[]; size?: 'sm' | 'xs' }) {
  if (!platforms.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {platforms.map((p) => {
        const m = platformMeta(p);
        return (
          <span
            key={p}
            title={m.label}
            className={clsx(
              'inline-flex items-center justify-center rounded-[4px] font-semibold text-white',
              size === 'sm' ? 'h-4.5 min-w-4.5 px-1 text-[10px]' : 'h-3.5 min-w-3.5 px-0.5 text-[8.5px]',
            )}
            style={{ background: m.color }}
          >
            {m.short}
          </span>
        );
      })}
    </span>
  );
}

export function DateField({
  value,
  onChange,
  label,
  type = 'date',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
  type?: 'date' | 'time';
}) {
  return (
    <div className="group relative flex items-center">
      <input
        type={type}
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={clsx(
          'h-8 rounded-lg border border-transparent bg-transparent px-2 text-[14px] transition-colors hover:border-line hover:bg-surface focus:border-accent focus:outline-none',
          !value && 'text-ink-3',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label={tr(`Clear ${label.toLowerCase()}`, `${label} entfernen`)}
          onClick={() => onChange(null)}
          className="ml-0.5 rounded p-1 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink focus:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function ProjectSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const projects = useStore((s) => s.projects);
  const current = projects.find((p) => p.id === value);
  return (
    <div className="flex items-center gap-1">
      {current && <Dot color={current.color} className="ml-2" />}
      <Select
        label={tr('Project', 'Projekt')}
        className="flex-1"
        value={value ?? ''}
        options={[
          { id: '', label: tr('No project', 'Kein Projekt') },
          ...projects.map((p) => ({ id: p.id, label: p.name || tr('Unnamed', 'Ohne Namen') })),
        ]}
        onChange={(v) => onChange(v || null)}
      />
    </div>
  );
}

/** Label/value row used in the detail panels. */
export function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-2 py-0.5">
      <span className="text-[13px] text-ink-3">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
