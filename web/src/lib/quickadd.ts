import { addDays, nextMonday } from 'date-fns';
import { iso } from './dates';
import { tr } from './i18n';
import type { Priority, Project } from './types';

export interface QuickToken {
  kind: 'project' | 'date' | 'priority' | 'focus';
  label: string;
}
export interface QuickParse {
  title: string;
  project_id?: string;
  due_date?: string;
  priority?: Priority;
  focus?: boolean;
  tokens: QuickToken[];
}

// Both languages are always understood, whatever the interface language is.
const WEEKDAYS = [
  ['sunday', 'sonntag'],
  ['monday', 'montag'],
  ['tuesday', 'dienstag'],
  ['wednesday', 'mittwoch'],
  ['thursday', 'donnerstag'],
  ['friday', 'freitag'],
  ['saturday', 'samstag'],
];
const PRIO_WORDS: Record<string, Priority> = { low: 1, medium: 2, high: 3, niedrig: 1, mittel: 2, hoch: 3 };
const PRIO_LABEL = ['', tr('Low', 'Niedrig'), tr('Medium', 'Mittel'), tr('High', 'Hoch')];

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Turns "Fix landing page #website tomorrow !!!" into a title plus fields.
 * #project, today/tomorrow/weekday/next week (or heute/morgen/übermorgen/Wochentag/nächste Woche),
 * 24.12. or 2026-12-24, ! to !!! (or !high / !hoch), * for focus.
 */
export function parseQuickAdd(input: string, projects: Project[], now = new Date()): QuickParse {
  const out: QuickParse = { title: '', tokens: [] };
  let text = ` ${input} `;

  const nextWeek = /\s(next\s+week|(nächste|naechste)n?\s+woche)\s/i;
  if (nextWeek.test(text)) {
    out.due_date = iso(nextMonday(now));
    out.tokens.push({ kind: 'date', label: tr('Next week', 'Nächste Woche') });
    text = text.replace(nextWeek, ' ');
  }

  const rest: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const w = word.toLowerCase().replace(/[.,;:]$/, '');

    const tag = /^#(.+)$/.exec(word);
    if (tag && !out.project_id) {
      const want = slug(tag[1]);
      const hit = projects.find((p) => slug(p.name) === want) ?? projects.find((p) => slug(p.name).startsWith(want));
      if (hit) {
        out.project_id = hit.id;
        out.tokens.push({ kind: 'project', label: hit.name });
        continue;
      }
    }

    const bang = /^!(!{0,2}|high|medium|low|hoch|mittel|niedrig)$/.exec(w);
    if (bang && out.priority === undefined) {
      out.priority = (PRIO_WORDS[bang[1]] ?? (bang[1].length + 1)) as Priority;
      out.tokens.push({ kind: 'priority', label: PRIO_LABEL[out.priority] });
      continue;
    }

    if (w === '*' && !out.focus) {
      out.focus = true;
      out.tokens.push({ kind: 'focus', label: tr('Focus', 'Fokus') });
      continue;
    }

    if (!out.due_date) {
      let date: Date | null = null;
      const weekday = WEEKDAYS.findIndex((names) => names.includes(w));
      if (w === 'today' || w === 'heute') date = now;
      else if (w === 'tomorrow' || w === 'morgen') date = addDays(now, 1);
      else if (w === 'übermorgen' || w === 'uebermorgen') date = addDays(now, 2);
      else if (weekday >= 0) {
        const ahead = (weekday - now.getDay() + 7) % 7 || 7;
        date = addDays(now, ahead);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(w)) {
        const [y, mo, d] = w.split('-').map(Number);
        const parsed = new Date(y, mo - 1, d);
        if (parsed.getDate() === d) date = parsed;
      } else {
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?$/.exec(word);
        if (m) {
          const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : now.getFullYear();
          const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
          if (!m[3] && d < addDays(now, -1)) d.setFullYear(year + 1);
          if (!Number.isNaN(d.getTime()) && d.getDate() === Number(m[1])) date = d;
        }
      }
      if (date) {
        out.due_date = iso(date);
        out.tokens.push({ kind: 'date', label: word.replace(/[.,;:]$/, '') });
        continue;
      }
    }

    rest.push(word);
  }

  out.title = rest.join(' ').trim() || input.trim();
  return out;
}
