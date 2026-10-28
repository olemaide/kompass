// Writes a Kompass export file full of made-up sample data, with dates relative to today.
// Used for the README screenshots; import it under Settings → Import to look around.
// It replaces everything that's in Kompass, so try it before entering your own data.
//
//   node scripts/sample-data.mjs [output.json]
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const out = process.argv[2] ?? 'kompass-sample-data.json';
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE');
};
const at = (offset, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
let pos = 0;
const next = () => (pos += 1000);

const project = (name, description, color, extra = {}) => ({
  id: randomUUID(),
  name,
  description,
  color,
  status: 'active',
  url: '',
  repo: '',
  notes: '',
  archived: false,
  position: next(),
  created_at: at(-40),
  ...extra,
});
const site = project('Website relaunch', 'New portfolio site with case studies and a booking page', '#3E63DD', { url: 'example.com' });
const podcast = project('Podcast', 'Weekly episodes about building a small business in public', '#D6409F');
const course = project('Online course', 'Video course: Notion for freelancers', '#12A594');
const letter = project('Newsletter', 'Monthly letter for about 1,200 readers', '#E2A336');
const app = project('Habit app', 'Maybe next year: a tiny app for daily check-ins', '#8E4EC6', { status: 'idea' });

const check = (...items) => items.map(([text, done]) => ({ id: randomUUID(), text, done }));
const task = (title, status, extra = {}) => ({
  id: randomUUID(),
  title,
  description: '',
  status,
  priority: 0,
  due_date: null,
  project_id: null,
  cell_id: null,
  focus: false,
  checklist: [],
  completed_at: status === 'done' ? at(-3, 16) : null,
  position: next(),
  created_at: at(-20),
  ...extra,
});

const tasks = [
  task('Write the About page', 'doing', { project_id: site.id, priority: 2, due_date: day(0), focus: true }),
  task('Record episode 12 with Mara', 'todo', { project_id: podcast.id, priority: 3, due_date: day(0) }),
  task('Send invoice for the October workshop', 'todo', { priority: 2, due_date: day(-1) }),
  task('Pick three case studies', 'todo', {
    project_id: site.id,
    due_date: day(2),
    checklist: check(['Agency rebrand', true], ['Shop migration', true], ['Coaching platform', false]),
  }),
  task('Outline module 3: databases', 'todo', { project_id: course.id, due_date: day(4), priority: 1 }),
  task('Draft November letter', 'todo', { project_id: letter.id, due_date: day(6) }),
  task('Edit episode 11', 'doing', { project_id: podcast.id, due_date: day(1), priority: 2 }),
  task('Set up booking calendar', 'backlog', { project_id: site.id }),
  task('Ask five readers what they want next', 'backlog', { project_id: letter.id }),
  task('Price the course: research five competitors', 'backlog', {
    project_id: course.id,
    checklist: check(['List competitors', true], ['Note prices', false], ['Compare outlines', false], ['Decide', false]),
  }),
  task('Sketch the check-in screen', 'backlog', { project_id: app.id }),
  task('Renew domain', 'backlog', { due_date: day(12) }),
  task('Choose a new hosting plan', 'done', { project_id: site.id, completed_at: at(0, 10) }),
  task('Publish episode 10', 'done', { project_id: podcast.id, completed_at: at(-2, 18) }),
  task('Film intro video for the course', 'done', { project_id: course.id }),
  task('Clean up subscriber list', 'done', { project_id: letter.id, completed_at: at(0, 9) }),
  task('Write episode 11 show notes', 'done', { project_id: podcast.id }),
  task('Move blog posts to the new site', 'done', { project_id: site.id }),
];

const post = (title, status, platforms, date, extra = {}) => ({
  id: randomUUID(),
  title,
  body: '',
  platforms,
  format: 'post',
  status,
  scheduled_date: date,
  scheduled_time: null,
  project_id: null,
  link: '',
  published_url: '',
  notes: '',
  position: next(),
  created_at: at(-15),
  ...extra,
});
const posts = [
  post('What I learned from 10 episodes', 'published', ['linkedin'], day(-9), { project_id: podcast.id }),
  post('Behind the scenes: my recording setup', 'published', ['instagram', 'tiktok'], day(-6), { format: 'video', project_id: podcast.id }),
  post('New site sneak peek', 'published', ['instagram'], day(-3), { format: 'carousel', project_id: site.id }),
  post('Episode 11 is live', 'scheduled', ['linkedin', 'x', 'threads'], day(1), { scheduled_time: '09:00', project_id: podcast.id }),
  post('3 Notion templates for freelancers', 'scheduled', ['instagram'], day(2), { format: 'carousel', project_id: course.id, scheduled_time: '12:30' }),
  post('Why I rebuilt my website from scratch', 'draft', ['blog', 'linkedin'], day(4), { format: 'article', project_id: site.id }),
  post('November newsletter', 'draft', ['newsletter'], day(7), { project_id: letter.id }),
  post('Course waitlist is open', 'scheduled', ['linkedin', 'instagram'], day(9), { project_id: course.id }),
  post('Episode 12 teaser', 'idea', ['tiktok', 'youtube'], day(11), { format: 'video', project_id: podcast.id }),
  post('My weekly planning routine', 'idea', ['youtube'], null, { format: 'video' }),
  post('Tools I stopped paying for', 'idea', ['linkedin', 'threads'], null),
  post('Case study: the shop migration', 'draft', ['blog'], null, { format: 'article', project_id: site.id }),
];

const goal = {
  id: randomUUID(),
  title: 'Make a living from my own business by the end of 2027',
  why: 'Freedom to choose my projects, and time for the people I love.',
  values_text: 'Honest work, steady progress, health first.',
  deadline: '2027-12-31',
  successes: 'Three paying clients a month, a course that sells on its own, 3,000 newsletter readers.',
  obstacles: 'Too many ideas at once. Skipping marketing when client work gets busy.',
  solutions: 'One main project per quarter. Marketing hour every morning before client work.',
  project_id: null,
  archived: false,
  position: next(),
  created_at: at(-30),
};

const pillars = [
  ['Offer', ['Define three packages', 'Write sales page', 'Collect 5 testimonials', 'Raise prices by 15%']],
  ['Audience', ['Post on LinkedIn', 'Reply to every comment', 'Guest on 4 podcasts', 'Grow newsletter to 3,000']],
  ['Course', ['Finish the outline', 'Record 8 modules', 'Beta with 10 students', 'Launch on the waitlist']],
  ['Money', ['Track every expense', 'Six months of savings', 'Separate tax account']],
  ['Health', ['30 minutes outside', 'No screens after 10 pm', 'Strength training 3×', 'Yearly check-up']],
  ['Skills', ['Read 20 minutes', 'Learn video editing', 'Public speaking course']],
  ['Systems', ['Weekly review on Friday', 'Template for client onboarding', 'Automate invoices']],
  ['People', ['Monthly founder dinner', 'Call one friend a week', 'Find a mentor']],
];
const routines = new Set(['Post on LinkedIn', 'Reply to every comment', '30 minutes outside', 'Read 20 minutes', 'Track every expense', 'No screens after 10 pm']);
const done = new Set(['Define three packages', 'Finish the outline', 'Separate tax account', 'Yearly check-up', 'Weekly review on Friday', 'Collect 5 testimonials']);

const cells = [];
const logs = [];
pillars.forEach(([title, actions], pillar) => {
  cells.push({ id: randomUUID(), goal_id: goal.id, pillar, slot: -1, title, kind: 'task', done: false, start_date: null, notes: '', created_at: at(-30) });
  actions.forEach((action, slot) => {
    const routine = routines.has(action);
    const cell = {
      id: randomUUID(),
      goal_id: goal.id,
      pillar,
      slot,
      title: action,
      kind: routine ? 'routine' : 'task',
      done: done.has(action),
      start_date: routine ? day(-21) : null,
      notes: '',
      created_at: at(-30),
    };
    cells.push(cell);
    // A believable routine history: mostly done, a few gaps, longer streaks for some.
    if (routine) {
      for (let d = -21; d <= 0; d++) {
        const skip = (d * 7 + slot * 3 + pillar) % 5 === 0 && d < -3;
        if (!skip && !(d === 0 && slot % 2)) logs.push({ cell_id: cell.id, date: day(d) });
      }
    }
  });
});

// One action from the chart is also on the board.
const linked = cells.find((c) => c.title === 'Write sales page');
tasks.push(task('Write sales page', 'todo', { project_id: site.id, cell_id: linked.id, due_date: day(3), priority: 2, focus: true }));

const journal = [
  {
    date: day(0),
    plan: 'About page first, then record with Mara at 2 pm.',
    reflection: '',
    updated_at: at(0, 8),
  },
];

const data = { app: 'kompass', exported_at: new Date().toISOString(), projects: [site, podcast, course, letter, app], goals: [goal], cells, tasks, posts, routine_logs: logs, journal };
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`Wrote ${out}`);
