import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { tr } from '../lib/i18n';
import { between } from '../lib/store';

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  /** Show only this many cards until the user asks for more. */
  limit?: number;
}

type Layout = Record<string, string[]>;

interface Props<T extends { id: string; position: number }> {
  columns: KanbanColumn[];
  items: T[];
  columnOf: (item: T) => string;
  onMove: (id: string, column: string, position: number) => void;
  onOpen: (item: T) => void;
  renderCard: (item: T) => ReactNode;
  onAdd?: (column: string, text: string) => void;
  addLabel?: string;
}

export function Kanban<T extends { id: string; position: number }>(props: Props<T>) {
  const { columns, items, columnOf, onMove, onOpen, renderCard, onAdd, addLabel = tr('Add', 'Hinzufügen') } = props;

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const base = useMemo(() => {
    const layout: Layout = Object.fromEntries(columns.map((c) => [c.id, []]));
    const sorted = [...items].sort((a, b) => a.position - b.position);
    for (const item of sorted) layout[columnOf(item)]?.push(item.id);
    return layout;
  }, [columns, items, columnOf]);

  const [drag, setDrag] = useState<{ id: string; layout: Layout } | null>(null);
  const layout = drag?.layout ?? base;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnOfId = (id: string, l: Layout) => (id in l ? id : Object.keys(l).find((k) => l[k].includes(id)));

  function onDragStart(e: DragStartEvent) {
    setDrag({ id: String(e.active.id), layout: base });
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDrag((d) => {
      if (!d) return d;
      const l = d.layout;
      const activeId = String(active.id);
      const overId = String(over.id);
      const from = columnOfId(activeId, l);
      const to = columnOfId(overId, l);
      if (!from || !to || from === to) return d;
      const target = l[to].filter((x) => x !== activeId);
      let index = target.length;
      if (!(overId in l)) {
        const overIndex = target.indexOf(overId);
        const translated = active.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
      }
      target.splice(index, 0, activeId);
      return { ...d, layout: { ...l, [from]: l[from].filter((x) => x !== activeId), [to]: target } };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = drag;
    setDrag(null);
    if (!current || !over) return;
    const activeId = String(active.id);
    let l = current.layout;
    const col = columnOfId(activeId, l);
    if (!col) return;
    const overId = String(over.id);
    if (!(overId in l) && columnOfId(overId, l) === col) {
      const from = l[col].indexOf(activeId);
      const to = l[col].indexOf(overId);
      if (from !== to) l = { ...l, [col]: arrayMove(l[col], from, to) };
    }
    const list = l[col];
    const i = list.indexOf(activeId);
    const item = byId.get(activeId);
    if (!item) return;
    const prev = i > 0 ? byId.get(list[i - 1])?.position : undefined;
    const next = i < list.length - 1 ? byId.get(list[i + 1])?.position : undefined;
    const unchanged =
      columnOf(item) === col && (prev === undefined || prev < item.position) && (next === undefined || item.position < next);
    if (!unchanged) onMove(activeId, col, between(prev, next));
  }

  const active = drag ? byId.get(drag.id) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            ids={layout[col.id] ?? []}
            dragging={Boolean(drag)}
            render={(id) => {
              const item = byId.get(id);
              return item ? renderCard(item) : null;
            }}
            onOpen={(id) => {
              const item = byId.get(id);
              if (item) onOpen(item);
            }}
            onAdd={onAdd ? (text) => onAdd(col.id, text) : undefined}
            addLabel={addLabel}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {active ? <div className="rotate-[1.5deg] cursor-grabbing shadow-overlay rounded-[10px]">{renderCard(active)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  ids,
  render,
  onOpen,
  onAdd,
  addLabel,
  dragging,
}: {
  column: KanbanColumn;
  ids: string[];
  render: (id: string) => ReactNode;
  onOpen: (id: string) => void;
  onAdd?: (text: string) => void;
  addLabel: string;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [expanded, setExpanded] = useState(false);
  const visible = column.limit && !expanded && !dragging ? ids.slice(0, column.limit) : ids;
  const hidden = ids.length - visible.length;

  return (
    <section className="flex min-w-[248px] max-w-[360px] flex-1 flex-col">
      <header className="flex h-9 items-center gap-2 px-1">
        {column.color && <span className="size-2 rounded-full" style={{ background: column.color }} />}
        <h2 className="text-[13px] font-semibold text-ink">{column.title}</h2>
        <span className="tabular text-[13px] text-ink-3">{ids.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={clsx(
          'flex min-h-28 flex-1 flex-col gap-2 rounded-xl p-1.5 transition-colors',
          isOver || (dragging && ids.length === 0) ? 'bg-sunken/70' : 'bg-sunken/35',
        )}
      >
        <SortableContext items={visible} strategy={verticalListSortingStrategy}>
          {visible.map((id) => (
            <SortableCard key={id} id={id} onOpen={() => onOpen(id)}>
              {render(id)}
            </SortableCard>
          ))}
        </SortableContext>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg py-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface hover:text-ink"
          >
            {tr(`Show ${hidden} more`, `${hidden} weitere anzeigen`)}
          </button>
        )}
        {onAdd && <AddCard label={addLabel} onAdd={onAdd} />}
      </div>
    </section>
  );
}

function SortableCard({ id, children, onOpen }: { id: string; children: ReactNode; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx('rounded-[10px] outline-offset-1', isDragging && 'opacity-35')}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter') onOpen();
        else listeners?.onKeyDown?.(e);
      }}
    >
      {children}
    </div>
  );
}

function AddCard({ label, onAdd }: { label: string; onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-surface hover:text-ink"
      >
        <Plus className="size-3.5" />
        {label}
      </button>
    );
  }
  return (
    <div className="rounded-[10px] border border-accent bg-surface p-2 shadow-[0_0_0_3px_var(--accent-soft)]">
      <textarea
        ref={ref}
        autoFocus
        rows={2}
        value={text}
        placeholder={tr('Title – #project, tomorrow, !!! work too', 'Titel – #projekt, morgen, !!! gehen auch')}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) onAdd(text.trim());
            setText('');
          }
          if (e.key === 'Escape') {
            setText('');
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (!text.trim()) setOpen(false);
        }}
        className="bare text-[14px]"
      />
      <p className="mt-1 text-[11px] text-ink-3">{tr('Enter saves, Esc closes', 'Enter speichert, Esc schließt')}</p>
    </div>
  );
}
