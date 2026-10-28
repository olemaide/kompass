import { tr } from './i18n';
import type { Platform, PostStatus, Priority, ProjectStatus, TaskStatus } from './types';

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To-do' },
  { id: 'doing', label: tr('In progress', 'In Arbeit') },
  { id: 'done', label: tr('Done', 'Erledigt') },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 0, label: tr('None', 'Keine') },
  { id: 1, label: tr('Low', 'Niedrig') },
  { id: 2, label: tr('Medium', 'Mittel') },
  { id: 3, label: tr('High', 'Hoch') },
];

export const PROJECT_STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'active', label: tr('Active', 'Aktiv') },
  { id: 'paused', label: tr('Paused', 'Pausiert') },
  { id: 'idea', label: tr('Idea', 'Idee') },
  { id: 'done', label: tr('Completed', 'Abgeschlossen') },
];

export const POST_STATUSES: { id: PostStatus; label: string; color: string }[] = [
  { id: 'idea', label: tr('Idea', 'Idee'), color: 'var(--ink-3)' },
  { id: 'draft', label: tr('Draft', 'Entwurf'), color: 'var(--warn)' },
  { id: 'scheduled', label: tr('Scheduled', 'Geplant'), color: 'var(--accent)' },
  { id: 'published', label: tr('Published', 'Veröffentlicht'), color: 'var(--ok)' },
];
export const postStatusMeta = (s: PostStatus) => POST_STATUSES.find((x) => x.id === s) ?? POST_STATUSES[0];

export const PLATFORMS: { id: Platform; label: string; short: string; color: string; limit: number }[] = [
  { id: 'linkedin', label: 'LinkedIn', short: 'in', color: '#0A66C2', limit: 3000 },
  { id: 'instagram', label: 'Instagram', short: 'IG', color: '#D62976', limit: 2200 },
  { id: 'x', label: 'X', short: 'X', color: '#5B6470', limit: 280 },
  { id: 'threads', label: 'Threads', short: 'Th', color: '#7A5AF8', limit: 500 },
  { id: 'tiktok', label: 'TikTok', short: 'TT', color: '#0FA3A3', limit: 2200 },
  { id: 'youtube', label: 'YouTube', short: 'YT', color: '#E62117', limit: 5000 },
  { id: 'blog', label: 'Blog', short: 'Bl', color: '#B8781A', limit: 0 },
  { id: 'newsletter', label: 'Newsletter', short: 'NL', color: '#2F8F5B', limit: 0 },
];
export const platformMeta = (p: Platform) => PLATFORMS.find((x) => x.id === p) ?? PLATFORMS[0];

export const POST_FORMATS = [
  { id: 'post', label: 'Post' },
  { id: 'carousel', label: tr('Carousel', 'Karussell') },
  { id: 'video', label: 'Video / Reel' },
  { id: 'story', label: 'Story' },
  { id: 'thread', label: 'Thread' },
  { id: 'article', label: tr('Article', 'Artikel') },
];

/** Readable in light and dark mode. */
export const PROJECT_COLORS = [
  '#3E63DD',
  '#0090FF',
  '#12A594',
  '#30A46C',
  '#E2A336',
  '#F76B15',
  '#E5484D',
  '#D6409F',
  '#8E4EC6',
  '#978365',
];

/** One hue per pillar of a 64 chart, so a pillar is recognisable in the center block and in its own block. */
export const PILLAR_COLORS = ['#3E63DD', '#12A594', '#E2A336', '#D6409F', '#0090FF', '#F76B15', '#8E4EC6', '#30A46C'];
