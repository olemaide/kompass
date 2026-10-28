import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import { dateLocale, tr } from './i18n';

/** Local calendar date as YYYY-MM-DD. */
export const iso = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayIso = () => iso(new Date());

export function fromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const fmt = (d: Date | string, pattern: string) =>
  format(typeof d === 'string' ? fromIso(d) : d, pattern, { locale: dateLocale });

export const daysFromToday = (s: string) => differenceInCalendarDays(fromIso(s), new Date());

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export function dueLabel(s: string): { label: string; tone: DueTone } {
  const diff = daysFromToday(s);
  if (diff < -1) return { label: tr(`${-diff} days overdue`, `Seit ${-diff} Tagen fällig`), tone: 'overdue' };
  if (diff === -1) return { label: tr('Due yesterday', 'Gestern fällig'), tone: 'overdue' };
  if (diff === 0) return { label: tr('Today', 'Heute'), tone: 'today' };
  if (diff === 1) return { label: tr('Tomorrow', 'Morgen'), tone: 'soon' };
  if (diff < 7) return { label: fmt(s, 'EEEE'), tone: 'soon' };
  return { label: fmt(s, diff > 300 ? tr('MMM d, yyyy', 'd. MMM yyyy') : tr('MMM d', 'd. MMM')), tone: 'later' };
}

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

export function weekDays(d: Date): Date[] {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The last `n` days ending today, oldest first. */
export function lastDays(n: number, end = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => iso(addDays(end, i - n + 1)));
}
