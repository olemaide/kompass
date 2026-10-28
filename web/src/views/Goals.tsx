import clsx from 'clsx';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Circle, Ellipsis, Grid3x3, Plus, Repeat, SquareKanban, Trash } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DateField, ProjectSelect } from '../components/bits';
import { Page } from '../components/Page';
import { AutoTextarea, Button, Checkbox, ConfirmButton, EmptyState, MenuItem, Popover, Ring, Segmented, Select } from '../components/ui';
import { setCellDone, taskFromCell, upsertCell } from '../lib/actions';
import { fmt, lastDays, todayIso } from '../lib/dates';
import { goalStats, indexLogs, isAction, pct, routineRate, routineStreak, type LogIndex } from '../lib/derive';
import { tr } from '../lib/i18n';
import { PILLAR_COLORS } from '../lib/meta';
import { go, href } from '../lib/router';
import { createItem, nextPosition, openPanel, removeItem, toggleRoutine, updateItem, useStore } from '../lib/store';
import { usePersisted } from '../lib/theme';
import type { Cell, Goal } from '../lib/types';

/** Pillar/slot index (0..7) of a grid position (0..8, row-major) around the center. */
const indexOf = (pos: number) => (pos < 4 ? pos : pos - 1);
const tint = (color: string, amount: number) => `color-mix(in oklab, ${color} ${amount}%, var(--surface))`;

type Tab = 'overview' | 'grid' | 'routines' | 'sheet';

export function Goals({ id }: { id?: string }) {
  const goals = useStore((s) => s.goals);
  const goal = goals.find((g) => g.id === id) ?? goals.find((g) => !g.archived);

  useEffect(() => {
    if (goal && goal.id !== id) location.replace(href.goals(goal.id));
  }, [goal, id]);

  if (!goal) return <GoalsIntro />;
  return <GoalView key={goal.id} goal={goal} />;
}

/* ------------------------------------------------------------------ intro */

function GoalsIntro() {
  const goals = useStore((s) => s.goals);
  const [title, setTitle] = useState('');
  const start = () => go(href.goals(createItem('goals', { title: title.trim(), position: nextPosition(goals) }).id));

  return (
    <Page title={tr('Goals', 'Ziele')}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-center gap-16 max-lg:grid-cols-1">
        <div className="max-w-[560px]">
          <p className="text-[17px] leading-relaxed text-ink-2">
            {tr(
              'The Harada method breaks a big goal down into a chart of 81 cells: the goal in the center, eight pillars around it and eight concrete actions for each pillar. You check off one-time tasks and keep up routines daily.',
              'Die Harada-Methode zerlegt ein großes Ziel in ein Raster aus 81 Feldern: das Ziel in der Mitte, acht Säulen darum und zu jeder Säule acht konkrete Aktionen. Einmalige Aufgaben hakst du ab, Routinen pflegst du täglich.',
            )}
          </p>
          <ol className="mt-8 flex flex-col gap-4 text-[14px]">
            {[
              [
                tr('Goal in the center', 'Ziel in die Mitte'),
                tr(
                  'Specific and with a deadline, e.g. “Make a living from my own business by the end of 2027.”',
                  'Konkret und mit Termin, etwa „Bis Ende 2027 vom eigenen Business leben“.',
                ),
              ],
              [
                tr('Eight pillars', 'Acht Säulen'),
                tr(
                  'What needs to be in place for you to reach the goal? Product, sales, health …',
                  'Was muss stimmen, damit das Ziel fällt? Produkt, Vertrieb, Gesundheit …',
                ),
              ],
              [
                tr('64 actions', '64 Aktionen'),
                tr(
                  'Eight steps per pillar. Start with about ten and give them a start date.',
                  'Je Säule acht Schritte. Starte mit etwa zehn und gib ihnen ein Startdatum.',
                ),
              ],
            ].map(([head, text], i) => (
              <li key={head} className="flex gap-4">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-semibold text-ink-2">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-ink">{head}</span>
                  <span className="block text-ink-3">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex max-w-[520px] items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder={tr('What do you want to achieve?', 'Was willst du erreichen?')}
              className="field h-11 text-[15px]"
            />
            <Button variant="primary" className="h-11" onClick={start}>
              {tr('Create chart', 'Raster anlegen')}
            </Button>
          </div>
        </div>
        <MandalaPreview />
      </div>
    </Page>
  );
}

function MandalaPreview() {
  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-2 max-lg:hidden">
      {Array.from({ length: 9 }, (_, block) => (
        <div key={block} className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }, (_, pos) => {
            const pillar = block === 4 ? (pos === 4 ? -1 : indexOf(pos)) : indexOf(block);
            const center = block === 4 && pos === 4;
            const pillarCell = (block === 4 && pos !== 4) || (block !== 4 && pos === 4);
            const color = pillar >= 0 ? PILLAR_COLORS[pillar] : 'var(--accent)';
            return (
              <div
                key={pos}
                className="aspect-square rounded-[4px]"
                style={{
                  background: center ? 'var(--ink)' : pillarCell ? color : tint(color, (block * 9 + pos) % 3 === 0 ? 30 : 12),
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ goal */

function GoalView({ goal }: { goal: Goal }) {
  const goals = useStore((s) => s.goals);
  const cells = useStore((s) => s.cells);
  const logs = useStore((s) => s.logs);
  const index = useMemo(() => indexLogs(logs), [logs]);
  const stats = useMemo(() => goalStats(goal.id, cells, index), [goal.id, cells, index]);
  const [tab, setTab] = usePersisted<Tab>('goal.tab', 'overview');
  const [pillar, setPillar] = useState<number | null>(null);

  const up = (patch: Partial<Goal>, debounce = false) => updateItem('goals', goal.id, patch, { debounce });
  const newGoal = () => go(href.goals(createItem('goals', { position: nextPosition(goals) }).id));

  const lead = goal.deadline
    ? `${tr(`By ${fmt(goal.deadline, 'MMMM d, yyyy')}.`, `Bis ${fmt(goal.deadline, 'd. MMMM yyyy')}.`)}${goal.why ? ` ${goal.why.split('\n')[0]}` : ''}`
    : tr('No deadline yet. Use the Goal sheet to set when and why.', 'Noch ohne Termin. Im Ziel-Blatt legst du fest, bis wann und warum.');

  return (
    <Page
      above={
        <div className="flex items-center gap-1">
          {goals.length > 1 && (
            <Select
              label={tr('Switch goal', 'Ziel wechseln')}
              className="-ml-2 w-64"
              value={goal.id}
              options={goals.map((g) => ({ id: g.id, label: `${g.title || tr('Untitled', 'Ohne Titel')}${g.archived ? tr(' (archived)', ' (archiviert)') : ''}` }))}
              onChange={(v) => go(href.goals(v))}
            />
          )}
          <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={newGoal} className={clsx(goals.length <= 1 && '-ml-2.5')}>
            {tr('New goal', 'Neues Ziel')}
          </Button>
        </div>
      }
      title={
        <AutoTextarea
          value={goal.title}
          autoFocus={!goal.title}
          placeholder={tr('Your big goal', 'Dein großes Ziel')}
          aria-label={tr('Goal', 'Ziel')}
          onChange={(e) => up({ title: e.target.value.replace(/\n/g, ' ') }, true)}
          className="bare display"
        />
      }
      lead={<span className="line-clamp-2">{lead}</span>}
      actions={
        <div className="flex items-center gap-4">
          <div className="text-right text-[13px] leading-snug">
            <div className="text-ink">
              {stats.tasks
                ? tr(
                    `${stats.tasksDone} of ${stats.tasks} ${stats.tasks === 1 ? 'task' : 'tasks'} done`,
                    `${stats.tasksDone} von ${stats.tasks} Aufgaben erledigt`,
                  )
                : tr(`${stats.actions} of 64 actions planned`, `${stats.actions} von 64 Aktionen geplant`)}
            </div>
            {stats.routines > 0 && (
              <div className="text-ink-3">
                {tr(`Routines this week ${pct(stats.routineRate)}`, `Routinen diese Woche ${pct(stats.routineRate)}`)}
              </div>
            )}
          </div>
          <Ring value={stats.score} size={58} stroke={5}>
            <span className="tabular text-[13px] font-semibold">{Math.round(stats.score * 100)}</span>
          </Ring>
        </div>
      }
    >
      <div className="mb-7">
        <Segmented
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPillar(null);
          }}
          options={[
            { id: 'overview', label: tr('Pillars', 'Säulen') },
            { id: 'grid', label: tr('64 chart', '64-Raster') },
            { id: 'routines', label: stats.routines ? tr(`Routines (${stats.routines})`, `Routinen (${stats.routines})`) : tr('Routines', 'Routinen') },
            { id: 'sheet', label: tr('Goal sheet', 'Ziel-Blatt') },
          ]}
        />
      </div>

      {tab === 'overview' &&
        (pillar === null ? (
          <PillarOverview goal={goal} stats={stats} index={index} onOpen={setPillar} />
        ) : (
          <PillarFocus goal={goal} pillar={pillar} index={index} onPillar={setPillar} />
        ))}
      {tab === 'grid' && <FullGrid goal={goal} index={index} />}
      {tab === 'routines' && <CheckSheet goal={goal} index={index} />}
      {tab === 'sheet' && <GoalSheet goal={goal} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ overview */

function PillarOverview({
  goal,
  stats,
  index,
  onOpen,
}: {
  goal: Goal;
  stats: ReturnType<typeof goalStats>;
  index: LogIndex;
  onOpen: (p: number) => void;
}) {
  const cells = useStore((s) => s.cells).filter((c) => c.goal_id === goal.id);
  const named = cells.filter((c) => c.slot === -1 && c.title.trim()).length;

  return (
    <div className="max-w-[980px]">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, pos) => {
          if (pos === 4) {
            return (
              <div key="center" className="flex h-44 flex-col justify-between rounded-2xl bg-ink p-5 text-bg">
                <span className="text-[12px] font-medium opacity-60">{tr('Goal', 'Ziel')}</span>
                <span className="line-clamp-3 text-[19px] leading-tight font-semibold tracking-[-0.01em]">{goal.title || tr('Your big goal', 'Dein großes Ziel')}</span>
                <span className="tabular text-[13px] opacity-70">{tr(`${pct(stats.score)} achieved`, `${pct(stats.score)} erreicht`)}</span>
              </div>
            );
          }
          const p = indexOf(pos);
          const pillarCell = cells.find((c) => c.pillar === p && c.slot === -1);
          const color = PILLAR_COLORS[p];
          const s = stats.pillars[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => onOpen(p)}
              className="group flex h-44 flex-col rounded-2xl border p-4 text-left transition-[border-color,transform] hover:-translate-y-px"
              style={{ borderColor: tint(color, 28), background: tint(color, 5) }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={clsx('line-clamp-3 text-[15.5px] leading-snug font-semibold hyphens-auto', !pillarCell?.title && 'font-medium text-ink-3')}>
                  {pillarCell?.title || tr('Name this pillar', 'Säule benennen')}
                </span>
                <Ring value={s.score} size={34} stroke={3.5} color={color} track={tint(color, 18)} />
              </div>
              <div className="mt-auto flex items-end justify-between gap-2">
                <ActionDots pillar={p} color={color} index={index} cells={cells} />
                <span className="text-[12px] text-ink-3">
                  {s.actions ? tr(`${s.actions} of 8`, `${s.actions} von 8`) : tr('empty', 'leer')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {named < 8 && (
        <p className="mt-4 text-[13px] text-ink-3">
          {tr(
            'Click a pillar to name it and set its eight actions. The 64 chart shows everything at once.',
            'Klick auf eine Säule, um sie zu benennen und ihre acht Aktionen festzulegen. Im 64-Raster siehst du alles auf einmal.',
          )}
        </p>
      )}
    </div>
  );
}

function ActionDots({ pillar, color, index, cells }: { pillar: number; color: string; index: LogIndex; cells: Cell[] }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {Array.from({ length: 8 }, (_, slot) => {
        const c = cells.find((x) => x.pillar === pillar && x.slot === slot);
        const filled = c && isAction(c);
        const strength = !filled ? 0 : c.kind === 'routine' ? 0.35 + routineRate(c, index) * 0.65 : c.done ? 1 : 0;
        return (
          <span
            key={slot}
            className={clsx('size-2.5 rounded-[3px] border', !filled && 'border-dashed')}
            style={{
              borderColor: filled ? color : tint(color, 35),
              background: strength ? `color-mix(in oklab, ${color} ${Math.round(strength * 100)}%, transparent)` : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ pillar focus */

function PillarFocus({ goal, pillar, index, onPillar }: { goal: Goal; pillar: number; index: LogIndex; onPillar: (p: number | null) => void }) {
  const pillarCell = useStore((s) => s.cells.find((c) => c.goal_id === goal.id && c.pillar === pillar && c.slot === -1));
  const color = PILLAR_COLORS[pillar];

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || useStore.getState().panel) return;
      if (e.key === 'ArrowRight') onPillar((pillar + 1) % 8);
      if (e.key === 'ArrowLeft') onPillar((pillar + 7) % 8);
      if (e.key === 'Escape') onPillar(null);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [pillar, onPillar]);

  return (
    <div className="max-w-[980px]">
      <div className="mb-4 flex items-center gap-1">
        <Button size="sm" variant="ghost" icon={<ArrowLeft className="size-3.5" />} onClick={() => onPillar(null)} className="-ml-2.5">
          {tr('All pillars', 'Alle Säulen')}
        </Button>
        <span className="mx-2 h-4 w-px bg-line" />
        <button type="button" aria-label={tr('Previous pillar (left arrow)', 'Vorherige Säule (Pfeil links)')} onClick={() => onPillar((pillar + 7) % 8)} className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink">
          <ChevronLeft className="size-4" />
        </button>
        <span className="flex gap-1">
          {PILLAR_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-label={tr(`Pillar ${i + 1}`, `Säule ${i + 1}`)}
              onClick={() => onPillar(i)}
              className={clsx('h-2 rounded-full transition-all', i === pillar ? 'w-5' : 'w-2 opacity-35 hover:opacity-70')}
              style={{ background: c }}
            />
          ))}
        </span>
        <button type="button" aria-label={tr('Next pillar (right arrow)', 'Nächste Säule (Pfeil rechts)')} onClick={() => onPillar((pillar + 1) % 8)} className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, pos) =>
          pos === 4 ? (
            <div key="pillar" className="flex min-h-44 flex-col rounded-2xl p-4 text-white" style={{ background: color }}>
              <span className="mb-1 text-[12px] font-medium opacity-75">{tr('Pillar', 'Säule')}</span>
              <AutoTextarea
                value={pillarCell?.title ?? ''}
                autoFocus={!pillarCell?.title}
                placeholder={tr('What is this pillar called?', 'Wie heißt diese Säule?')}
                aria-label={tr('Pillar name', 'Name der Säule')}
                onChange={(e) => upsertCell(goal.id, pillar, -1, { title: e.target.value.replace(/\n/g, ' ') }, true)}
                className="bare text-[18px] leading-snug font-semibold text-white placeholder:!text-white/60"
              />
            </div>
          ) : (
            <ActionCell key={`${pillar}-${pos}`} goal={goal} pillar={pillar} slot={indexOf(pos)} color={color} index={index} />
          ),
        )}
      </div>
      <p className="mt-4 text-[13px] text-ink-3">
        {tr(
          'Arrow keys switch pillars. Use an action’s menu to make it a routine, add it to the board or give it a start date.',
          'Pfeiltasten wechseln die Säule. Über das Menü einer Aktion machst du sie zur Routine, legst sie aufs Board oder gibst ihr ein Startdatum.',
        )}
      </p>
    </div>
  );
}

function ActionCell({ goal, pillar, slot, color, index }: { goal: Goal; pillar: number; slot: number; color: string; index: LogIndex }) {
  const cell = useStore((s) => s.cells.find((c) => c.goal_id === goal.id && c.pillar === pillar && c.slot === slot));
  const linked = useStore((s) => (cell ? s.tasks.find((t) => t.cell_id === cell.id) : undefined));
  const [menu, setMenu] = useState(false);
  const filled = Boolean(cell && isAction(cell));
  const today = todayIso();
  const routine = cell?.kind === 'routine';
  const doneToday = Boolean(cell && index.get(cell.id)?.has(today));
  const streak = cell && routine ? routineStreak(cell.id, index) : 0;

  return (
    <div
      className={clsx('group relative flex min-h-44 flex-col rounded-2xl border p-4 transition-colors', !filled && 'border-dashed border-line-strong hover:border-ink-3')}
      style={filled ? { borderColor: tint(color, 35), background: cell!.done ? tint(color, 16) : 'var(--surface)' } : undefined}
    >
      {filled && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-ink-3">
          {routine ? <Repeat className="size-3.5" /> : <Circle className="size-3.5" />}
          {routine ? tr('Routine', 'Routine') : tr('Task', 'Aufgabe')}
          {cell!.start_date && <span>{tr(`, from ${fmt(cell!.start_date, 'MMM d')}`, `, ab ${fmt(cell!.start_date, 'd. MMM')}`)}</span>}
          {linked && <SquareKanban className="ml-0.5 size-3.5" aria-label={tr('On the board', 'Liegt auf dem Board')} />}
        </div>
      )}
      <AutoTextarea
        value={cell?.title ?? ''}
        placeholder={tr('Add action', 'Aktion hinzufügen')}
        aria-label={tr('Action', 'Aktion')}
        onChange={(e) => upsertCell(goal.id, pillar, slot, { title: e.target.value.replace(/\n/g, ' ') }, true)}
        className={clsx('bare flex-1 text-[14.5px] leading-snug', cell?.done && 'text-ink-2')}
      />
      {filled && (
        <div className="mt-2 flex items-center gap-2">
          {routine ? (
            <>
              <Checkbox checked={doneToday} color={color} onChange={() => toggleRoutine(cell!.id, today)} label={tr('Done today', 'Heute erledigt')} />
              <span className="text-[12px] text-ink-3">{doneToday ? tr('Done today', 'Heute erledigt') : tr('Today', 'Heute')}</span>
              {streak > 1 && <span className="tabular ml-auto text-[12px] text-ink-3">{tr(`${streak} days in a row`, `${streak} Tage in Folge`)}</span>}
            </>
          ) : (
            <>
              <Checkbox checked={cell!.done} color={color} onChange={(v) => setCellDone(cell!, v)} label={tr('Done', 'Erledigt')} />
              <span className="text-[12px] text-ink-3">{cell!.done ? tr('Done', 'Erledigt') : tr('Open', 'Offen')}</span>
            </>
          )}
        </div>
      )}
      {filled && (
        <div className="absolute top-2.5 right-2.5">
          <button
            type="button"
            aria-label={tr('Options', 'Optionen')}
            onClick={() => setMenu(!menu)}
            className={clsx('rounded-md p-1 text-ink-3 transition-opacity hover:bg-sunken hover:text-ink focus:opacity-100', menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
          >
            <Ellipsis className="size-4" />
          </button>
          <Popover open={menu} onClose={() => setMenu(false)} align="right" className="w-60">
            <MenuItem
              icon={routine ? <Circle /> : <Repeat />}
              onClick={() => {
                updateItem('cells', cell!.id, { kind: routine ? 'task' : 'routine' });
                setMenu(false);
              }}
            >
              {routine ? tr('Track as one-time task', 'Als einmalige Aufgabe führen') : tr('Track as daily routine', 'Als tägliche Routine führen')}
            </MenuItem>
            {!routine && (
              <MenuItem
                icon={<SquareKanban />}
                onClick={() => {
                  setMenu(false);
                  if (linked) openPanel({ kind: 'task', id: linked.id });
                  else taskFromCell(cell!, goal);
                }}
              >
                {linked ? tr('Open task on board', 'Aufgabe im Board öffnen') : tr('Add to board', 'Aufs Board legen')}
              </MenuItem>
            )}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1 text-[13px]">
              <span className="text-ink-2">{tr('Start', 'Start')}</span>
              <DateField label={tr('Start date', 'Startdatum')} value={cell!.start_date} onChange={(v) => updateItem('cells', cell!.id, { start_date: v })} />
            </div>
            <div className="my-1 h-px bg-line" />
            <MenuItem
              icon={<Trash />}
              danger
              onClick={() => {
                setMenu(false);
                removeItem('cells', cell!.id);
              }}
            >
              {tr('Clear cell', 'Feld leeren')}
            </MenuItem>
          </Popover>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ 9x9 */

function FullGrid({ goal, index }: { goal: Goal; index: LogIndex }) {
  const cells = useStore((s) => s.cells);
  const mine = cells.filter((c) => c.goal_id === goal.id);
  const find = (p: number, slot: number) => mine.find((c) => c.pillar === p && c.slot === slot);

  return (
    <div className="max-w-[900px]">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }, (_, block) => (
          <div key={block} className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }, (_, pos) => {
              if (block === 4 && pos === 4) {
                return (
                  <MiniCell
                    key={pos}
                    value={goal.title}
                    placeholder={tr('Goal', 'Ziel')}
                    style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                    strong
                    onSave={(title) => updateItem('goals', goal.id, { title })}
                  />
                );
              }
              const p = block === 4 ? indexOf(pos) : indexOf(block);
              const color = PILLAR_COLORS[p];
              if (block === 4 || pos === 4) {
                return (
                  <MiniCell
                    key={pos}
                    value={find(p, -1)?.title ?? ''}
                    placeholder={tr('Pillar', 'Säule')}
                    style={{ background: color, color: 'white' }}
                    strong
                    onSave={(title) => upsertCell(goal.id, p, -1, { title })}
                  />
                );
              }
              const slot = indexOf(pos);
              const cell = find(p, slot);
              const filled = Boolean(cell && isAction(cell));
              const routine = cell?.kind === 'routine';
              return (
                <MiniCell
                  key={pos}
                  value={cell?.title ?? ''}
                  placeholder=""
                  dashed={!filled}
                  style={filled ? { background: tint(color, cell!.done ? 30 : routine ? 6 + routineRate(cell!, index) * 24 : 9) } : undefined}
                  onSave={(title) => upsertCell(goal.id, p, slot, { title })}
                  badge={
                    filled ? (
                      routine ? (
                        <Repeat className="size-3" style={{ color }} />
                      ) : (
                        <button
                          type="button"
                          aria-label={cell!.done ? tr('Mark as open', 'Als offen markieren') : tr('Mark as done', 'Als erledigt markieren')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCellDone(cell!, !cell!.done);
                          }}
                          className={clsx(
                            'flex size-4 items-center justify-center rounded-full border transition-opacity',
                            cell!.done ? 'border-transparent text-white' : 'opacity-0 group-hover:opacity-100',
                          )}
                          style={cell!.done ? { background: color } : { borderColor: color }}
                        >
                          {cell!.done && <Check className="size-2.5" strokeWidth={3.5} />}
                        </button>
                      )
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ink-3">
        {tr(
          'Click a cell to write, Enter saves. The pillars in the center and in the outer blocks are the same cell.',
          'Klick in ein Feld zum Schreiben, Enter speichert. Die Säulen in der Mitte und in den äußeren Blöcken sind dasselbe Feld.',
        )}
      </p>
    </div>
  );
}

function MiniCell({
  value,
  placeholder,
  onSave,
  style,
  strong,
  dashed,
  badge,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  style?: React.CSSProperties;
  strong?: boolean;
  dashed?: boolean;
  badge?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={value || undefined}
      onClick={() => {
        if (!editing) {
          setDraft(value);
          setEditing(true);
        }
      }}
      onKeyDown={(e) => {
        if (!editing && e.key === 'Enter') {
          setDraft(value);
          setEditing(true);
        }
      }}
      className={clsx(
        'group relative aspect-[4/3] overflow-hidden rounded-[7px] p-1.5 text-[11.5px] leading-[1.25] hyphens-auto transition-shadow',
        dashed ? 'border border-dashed border-line-strong bg-surface hover:border-ink-3' : 'border border-transparent',
        strong && 'font-semibold',
        editing && 'ring-2 ring-accent',
      )}
      style={style}
    >
      {editing ? (
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\n/g, ' '))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setEditing(false);
            }
          }}
          className="bare h-full text-[11.5px] leading-[1.25]"
          style={{ color: 'inherit' }}
        />
      ) : (
        <span className={clsx('line-clamp-4 break-words', !value && 'opacity-40')}>{value || placeholder}</span>
      )}
      {badge && !editing && <span className="absolute right-1 bottom-1">{badge}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ routines */

function CheckSheet({ goal, index }: { goal: Goal; index: LogIndex }) {
  const cells = useStore((s) => s.cells);
  const routines = cells
    .filter((c) => c.goal_id === goal.id && c.kind === 'routine' && isAction(c))
    .sort((a, b) => a.pillar - b.pillar || a.slot - b.slot);
  const days = lastDays(21);
  const today = todayIso();

  if (!routines.length) {
    return (
      <EmptyState icon={<Repeat />} title={tr('No routines yet', 'Noch keine Routinen')}>
        {tr(
          'Routines are actions you repeat regularly, like “30 minutes of outreach” or “Check key numbers every morning”. Open a pillar and choose “Track as daily routine” in an action’s menu.',
          'Routinen sind Aktionen, die du regelmäßig wiederholst – etwa „30 Minuten Outreach“ oder „Jeden Morgen Kennzahlen checken“. Öffne eine Säule und wähle im Menü einer Aktion „Als tägliche Routine führen“.',
        )}
      </EmptyState>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <table className="border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-64 bg-bg pr-4 pb-2 text-left font-medium text-ink-3">{tr('Routine', 'Routine')}</th>
            {days.map((d) => (
              <th key={d} className={clsx('w-7 pb-2 text-center font-normal', d === today ? 'text-accent' : 'text-ink-3')}>
                <div className="text-[10px]">{fmt(d, 'EEEEEE')}</div>
                <div className={clsx('tabular text-[12px]', d === today && 'font-semibold')}>{fmt(d, 'd')}</div>
              </th>
            ))}
            <th className="pb-2 pl-5 text-right font-medium text-ink-3">{tr('Streak', 'Serie')}</th>
            <th className="pb-2 pl-5 text-right font-medium text-ink-3">{tr('7 days', '7 Tage')}</th>
          </tr>
        </thead>
        <tbody>
          {routines.map((c) => {
            const color = PILLAR_COLORS[c.pillar];
            const set = index.get(c.id);
            return (
              <tr key={c.id}>
                <td className="sticky left-0 z-10 max-w-80 bg-bg py-1 pr-4">
                  <span className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-[3px]" style={{ background: color }} />
                    <span className="truncate">{c.title}</span>
                  </span>
                </td>
                {days.map((d) => {
                  const on = set?.has(d) ?? false;
                  return (
                    <td key={d} className="p-[2px] text-center">
                      <button
                        type="button"
                        aria-label={tr(`${c.title} on ${fmt(d, 'MMMM d')}`, `${c.title} am ${fmt(d, 'd. MMMM')}`)}
                        aria-pressed={on}
                        onClick={() => toggleRoutine(c.id, d)}
                        className={clsx('size-6 rounded-[6px] border transition-colors', d === today && !on && 'ring-1 ring-accent')}
                        style={on ? { background: color, borderColor: color } : { borderColor: 'var(--line)', background: 'var(--surface)' }}
                      />
                    </td>
                  );
                })}
                <td className="tabular pl-5 text-right text-ink-2">{routineStreak(c.id, index)}</td>
                <td className="tabular pl-5 text-right text-ink-2">{pct(routineRate(c, index, 7))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet */

const SHEET_FIELDS: { key: 'why' | 'values_text' | 'successes' | 'obstacles' | 'solutions'; label: string; hint: string }[] = [
  {
    key: 'why',
    label: tr('Why does this goal matter to you?', 'Warum ist mir dieses Ziel wichtig?'),
    hint: tr('Your drive for the days when it gets tough.', 'Der Antrieb für die Tage, an denen es zäh wird.'),
  },
  {
    key: 'values_text',
    label: tr('What changes for you and for others?', 'Was verändert sich für mich und für andere?'),
    hint: tr(
      'Harada deliberately asks about both: meaning for you and value for others.',
      'Harada fragt bewusst nach beidem: Sinn für dich und Nutzen für andere.',
    ),
  },
  {
    key: 'successes',
    label: tr('What has worked for you before?', 'Was hat früher schon funktioniert?'),
    hint: tr('Successes and strengths you can build on.', 'Erfolge und Stärken, auf die du bauen kannst.'),
  },
  {
    key: 'obstacles',
    label: tr('What could hold you back?', 'Was könnte mich aufhalten?'),
    hint: tr('Be honest: time, money, habits, doubts.', 'Ehrlich bleiben: Zeit, Geld, Gewohnheiten, Zweifel.'),
  },
  {
    key: 'solutions',
    label: tr('How will you deal with it?', 'Wie gehe ich damit um?'),
    hint: tr('A concrete countermeasure for each obstacle.', 'Zu jedem Hindernis eine konkrete Gegenmaßnahme.'),
  },
];

function GoalSheet({ goal }: { goal: Goal }) {
  const up = (patch: Partial<Goal>, debounce = false) => updateItem('goals', goal.id, patch, { debounce });
  return (
    <div className="max-w-[880px]">
      <div className="mb-8 grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-ink-2">{tr('By when?', 'Bis wann?')}</span>
          <DateField label={tr('Target date', 'Zieldatum')} value={goal.deadline} onChange={(v) => up({ deadline: v })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-ink-2">{tr('Belongs to project', 'Gehört zu Projekt')}</span>
          <ProjectSelect value={goal.project_id} onChange={(v) => up({ project_id: v })} />
        </label>
      </div>
      <div className="flex flex-col divide-y divide-line border-y border-line">
        {SHEET_FIELDS.map((f) => (
          <div key={f.key} className="grid grid-cols-[260px_minmax(0,1fr)] gap-8 py-5 max-md:grid-cols-1 max-md:gap-2">
            <div>
              <p className="text-[14px] font-semibold">{f.label}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{f.hint}</p>
            </div>
            <AutoTextarea minRows={3} value={goal[f.key]} onChange={(e) => up({ [f.key]: e.target.value }, true)} className="field text-[14px] leading-relaxed" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={<Grid3x3 className="size-3.5" />} onClick={() => up({ archived: !goal.archived })}>
          {goal.archived ? tr('Reactivate', 'Wieder aktivieren') : tr('Archive goal', 'Ziel archivieren')}
        </Button>
        <ConfirmButton
          icon={<Trash className="size-3.5" />}
          confirmLabel={tr('Delete goal and its chart?', 'Ziel samt Raster löschen?')}
          onConfirm={() => {
            removeItem('goals', goal.id);
            go(href.goals());
          }}
        >
          {tr('Delete goal', 'Ziel löschen')}
        </ConfirmButton>
      </div>
    </div>
  );
}
