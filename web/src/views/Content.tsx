import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import clsx from 'clsx';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Columns3, Lightbulb, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { PlatformBadges, ProjectTag } from '../components/bits';
import { Kanban } from '../components/Kanban';
import { Page } from '../components/Page';
import { Button, IconButton, Segmented } from '../components/ui';
import { fmt, iso, todayIso } from '../lib/dates';
import { tr } from '../lib/i18n';
import { PLATFORMS, POST_STATUSES, platformMeta, postStatusMeta } from '../lib/meta';
import { createItem, nextPosition, openPanel, updateItem, useStore } from '../lib/store';
import { usePersisted } from '../lib/theme';
import type { Platform, Post, PostStatus } from '../lib/types';
import { FilterChip } from './Board';

type View = 'calendar' | 'pipeline';

/** Monday-first, matching the calendar grid. */
const WEEKDAYS = [
  tr('Mon', 'Mo'),
  tr('Tue', 'Di'),
  tr('Wed', 'Mi'),
  tr('Thu', 'Do'),
  tr('Fri', 'Fr'),
  tr('Sat', 'Sa'),
  tr('Sun', 'So'),
];

export function Content() {
  const posts = useStore((s) => s.posts);
  const [view, setView] = usePersisted<View>('content.view', 'calendar');
  const [platform, setPlatform] = usePersisted<Platform | 'all'>('content.platform', 'all');

  const visible = useMemo(
    () => (platform === 'all' ? posts : posts.filter((p) => p.platforms.includes(platform))),
    [posts, platform],
  );

  const newPost = (data: Partial<Post> = {}) =>
    openPanel({
      kind: 'post',
      id: createItem('posts', {
        position: nextPosition(posts),
        ...(platform !== 'all' && { platforms: [platform] }),
        ...data,
      }).id,
    });

  return (
    <Page
      fill
      title="Content"
      actions={
        <div className="flex items-center gap-3">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: 'calendar', label: tr('Calendar', 'Kalender'), icon: <CalendarDays className="size-3.5" /> },
              { id: 'pipeline', label: 'Pipeline', icon: <Columns3 className="size-3.5" /> },
            ]}
          />
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => newPost()}>
            {tr('New post', 'Neuer Post')}
          </Button>
        </div>
      }
    >

      <div className="mb-5 flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('Filter by platform', 'Nach Plattform filtern')}>
        <FilterChip active={platform === 'all'} onClick={() => setPlatform('all')}>
          {tr('All channels', 'Alle Kanäle')}
        </FilterChip>
        {PLATFORMS.map((p) => (
          <FilterChip key={p.id} active={platform === p.id} onClick={() => setPlatform(p.id)}>
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.label}
          </FilterChip>
        ))}
      </div>

      {view === 'calendar' ? <Calendar posts={visible} onNew={newPost} /> : <Pipeline posts={visible} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ calendar */

function Calendar({ posts, onNew }: { posts: Post[]; onNew: (data?: Partial<Post>) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const today = todayIso();

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.scheduled_date) continue;
      if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, []);
      map.get(p.scheduled_date)!.push(p);
    }
    for (const list of map.values()) list.sort((a, b) => (a.scheduled_time ?? '99').localeCompare(b.scheduled_time ?? '99'));
    return map;
  }, [posts]);
  const unscheduled = posts.filter((p) => !p.scheduled_date && p.status !== 'published').sort((a, b) => a.position - b.position);
  const dragged = posts.find((p) => p.id === dragId);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!over) return;
    const id = String(active.id);
    const target = String(over.id);
    if (target === 'unscheduled') updateItem('posts', id, { scheduled_date: null, scheduled_time: null });
    else if (target.startsWith('day:')) updateItem('posts', id, { scheduled_date: target.slice(4) });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setDragId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragId(null)}
    >
      <div className="flex min-h-0 flex-1 gap-6 pb-6 max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="title-lg min-w-44">{fmt(month, 'MMMM yyyy')}</h2>
            <IconButton label={tr('Previous month', 'Vorheriger Monat')} onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton label={tr('Next month', 'Nächster Monat')} onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="size-4" />
            </IconButton>
            {!isSameMonth(month, new Date()) && (
              <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
                {tr('Today', 'Heute')}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3 text-[12px] text-ink-3 max-md:hidden">
              {POST_STATUSES.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-[3px] rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-line text-[12px] text-ink-3">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 pb-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-7 border-l border-line">
            {days.map((d) => {
              const key = iso(d);
              return (
                <DayCell
                  key={key}
                  date={d}
                  isoDate={key}
                  inMonth={isSameMonth(d, month)}
                  isToday={key === today}
                  posts={byDay.get(key) ?? []}
                  onNew={() => onNew({ scheduled_date: key, status: 'draft' })}
                />
              );
            })}
          </div>
        </div>
        <IdeaColumn posts={unscheduled} onNew={onNew} />
      </div>
      <DragOverlay dropAnimation={null}>{dragged ? <PostChip post={dragged} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function DayCell({
  date,
  isoDate,
  inMonth,
  isToday,
  posts,
  onNew,
}: {
  date: Date;
  isoDate: string;
  inMonth: boolean;
  isToday: boolean;
  posts: Post[];
  onNew: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${isoDate}` });
  const [expanded, setExpanded] = useState(false);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const shown = expanded ? posts : posts.slice(0, 3);
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'group flex min-h-[112px] flex-col gap-1 border-r border-b border-line p-1.5 transition-colors',
        isOver ? 'bg-accent-soft' : weekend || !inMonth ? 'bg-sunken/30' : 'bg-surface',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'tabular flex size-6 items-center justify-center rounded-full text-[12px]',
            isToday ? 'bg-accent font-semibold text-accent-ink' : inMonth ? 'text-ink-2' : 'text-ink-3/60',
          )}
        >
          {fmt(date, 'd')}
        </span>
        <button
          type="button"
          onClick={onNew}
          aria-label={tr(`Add post on ${fmt(date, 'MMMM d')}`, `Post am ${fmt(date, 'd. MMMM')} anlegen`)}
          className="rounded-md p-0.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sunken hover:text-ink focus:opacity-100"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {shown.map((p) => (
        <DraggablePost key={p.id} post={p} />
      ))}
      {posts.length > 3 && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="px-1 text-left text-[11px] text-ink-3 hover:text-ink">
          {tr(`${posts.length - 3} more`, `${posts.length - 3} weitere`)}
        </button>
      )}
    </div>
  );
}

function DraggablePost({ post }: { post: Post }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: post.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={clsx(isDragging && 'opacity-30')}>
      <PostChip post={post} />
    </div>
  );
}

function PostChip({ post, overlay }: { post: Post; overlay?: boolean }) {
  const st = postStatusMeta(post.status);
  return (
    <button
      type="button"
      onClick={() => openPanel({ kind: 'post', id: post.id })}
      className={clsx(
        'flex w-full cursor-grab items-center gap-1.5 rounded-md border border-line bg-surface py-1 pr-1.5 pl-1 text-left text-[12px] leading-tight transition-colors hover:border-line-strong',
        overlay && 'w-48 shadow-overlay',
        post.status === 'published' && 'text-ink-3',
      )}
    >
      <span className="h-4 w-[3px] shrink-0 rounded-full" style={{ background: st.color }} />
      {post.platforms.length > 0 && (
        <span className="flex shrink-0 -space-x-0.5" title={post.platforms.map((p) => platformMeta(p).label).join(', ')}>
          {post.platforms.slice(0, 3).map((p) => (
            <span key={p} className="size-2 rounded-full ring-1 ring-surface" style={{ background: platformMeta(p).color }} />
          ))}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{post.title || tr('Untitled', 'Ohne Titel')}</span>
      {post.scheduled_time && <span className="tabular shrink-0 text-[11px] text-ink-3">{post.scheduled_time}</span>}
    </button>
  );
}

function IdeaColumn({ posts, onNew }: { posts: Post[]; onNew: (data?: Partial<Post>) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });
  const [text, setText] = useState('');
  const all = useStore((s) => s.posts);
  const add = () => {
    if (!text.trim()) return;
    createItem('posts', { title: text.trim(), status: 'idea', position: nextPosition(all) });
    setText('');
  };
  return (
    <aside
      ref={setNodeRef}
      className={clsx(
        'flex w-64 shrink-0 flex-col rounded-xl border p-3 transition-colors max-lg:w-full',
        isOver ? 'border-accent bg-accent-soft' : 'border-line bg-raised',
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <Lightbulb className="size-4 text-ink-3" />
        <h2 className="section-title flex-1">{tr('Unscheduled', 'Ohne Termin')}</h2>
        <span className="tabular text-[12px] text-ink-3">{posts.length}</span>
      </div>
      <p className="mb-3 text-[12px] leading-snug text-ink-3">
        {tr('Ideas and drafts. Drag them onto a day to schedule them.', 'Ideen und Entwürfe. Zieh sie auf einen Tag, um sie einzuplanen.')}
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={tr('Capture a new idea', 'Neue Idee festhalten')}
        className="field mb-2 h-8.5 py-0 text-[13px]"
      />
      <div className="flex min-h-16 flex-col gap-1.5 overflow-y-auto">
        {posts.map((p) => (
          <DraggablePost key={p.id} post={p} />
        ))}
        {posts.length === 0 && (
          <button type="button" onClick={() => onNew({ status: 'idea' })} className="py-3 text-left text-[12px] text-ink-3 hover:text-ink">
            {tr('All scheduled. Room for new ideas.', 'Alles eingeplant. Platz für neue Ideen.')}
          </button>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ pipeline */

function Pipeline({ posts }: { posts: Post[] }) {
  const all = useStore((s) => s.posts);
  const columnOf = useCallback((p: Post) => p.status, []);
  return (
    <Kanban
      columns={POST_STATUSES.map((s) => ({ id: s.id, title: s.label, color: s.color, limit: s.id === 'published' ? 8 : undefined }))}
      items={posts}
      columnOf={columnOf}
      onMove={(id, column, position) => updateItem('posts', id, { status: column as PostStatus, position })}
      onOpen={(p) => openPanel({ kind: 'post', id: p.id })}
      renderCard={(p) => <PostCard post={p} />}
      onAdd={(column, text) => createItem('posts', { title: text, status: column as PostStatus, position: nextPosition(all) })}
      addLabel={tr('Add post', 'Post hinzufügen')}
    />
  );
}

function PostCard({ post }: { post: Post }) {
  const project = useStore((s) => s.projects.find((p) => p.id === post.project_id));

  // Published posts fade to one line, like finished tasks on the task board.
  if (post.status === 'published') {
    return (
      <div
        title={post.title}
        className="flex cursor-grab items-center gap-2 rounded-lg border border-line/70 px-2.5 py-1.5 opacity-65 transition-[opacity,background-color,border-color] hover:border-line-strong hover:bg-surface hover:opacity-100 active:cursor-grabbing"
      >
        <Check className="size-3.5 shrink-0 text-ok" strokeWidth={3} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{post.title || tr('Untitled', 'Ohne Titel')}</span>
      </div>
    );
  }

  return (
    <div className="cursor-grab rounded-[10px] border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong active:cursor-grabbing">
      {post.platforms.length > 0 && (
        <div className="mb-1.5">
          <PlatformBadges platforms={post.platforms} />
        </div>
      )}
      <p className="text-[14px] leading-snug break-words text-ink">
        {post.title || <span className="text-ink-3">{tr('Untitled', 'Ohne Titel')}</span>}
      </p>
      {(post.scheduled_date || project) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
          {post.scheduled_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {fmt(post.scheduled_date, tr('EEE, MMM d', 'EE d. MMM'))}
              {post.scheduled_time && `, ${post.scheduled_time}`}
            </span>
          )}
          <ProjectTag project={project} />
        </div>
      )}
    </div>
  );
}
