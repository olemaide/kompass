# Kompass

**A calm, local-first planner for your projects, tasks, social media content and big goals.**
Runs on your own computer, works offline, needs no account. English and German.

[Deutsche Anleitung → README.de.md](README.de.md)

![Kompass: the Today view with focus tasks, routines and this week's content](docs/screenshots/today.png)

## What's inside

| Area         | What it's for                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| **Today**    | Everything due today or starred, your daily routines, this week's posts and a short daily note       |
| **Board**    | Kanban with Backlog, To-do, In progress and Done; filter by project. Finished tasks shrink to one line |
| **Projects** | Progress per project, with its own board, content and notes                                          |
| **Content**  | Monthly calendar with drag and drop, a column for unscheduled ideas, and a pipeline from idea to published |
| **Goals**    | The Harada method: one big goal, 8 pillars, 64 actions, daily routines and a goal sheet              |

<table>
  <tr>
    <td><img src="docs/screenshots/board.png" alt="Board with four columns; finished tasks are shown as single faded lines"></td>
    <td><img src="docs/screenshots/content.png" alt="Content calendar for a month with scheduled posts and a column of unscheduled ideas"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/goal-chart.png" alt="Harada 64 chart: the goal in the middle, eight colored pillars and their actions"></td>
    <td><img src="docs/screenshots/projects.png" alt="Project list with generated project icons and progress bars"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/project.png" alt="A single project with its own task board"></td>
    <td><img src="docs/screenshots/board-dark.png" alt="The board in dark mode"></td>
  </tr>
</table>

<sub>The screenshots show made-up sample data. A fresh install starts empty.</sub>

## Install

Kompass works on **Windows 10/11, macOS and Linux**. Setup takes about two minutes.

### 1. Install Node.js

Kompass runs on Node.js, so install it first if you don't have it already.
Go to [nodejs.org](https://nodejs.org), download the **LTS** version and click through the installer with the default settings.
Kompass needs Node.js 22.13 or newer.

### 2. Download Kompass

Open the [latest release](../../releases/latest) and download `kompass-….zip`. Unzip it anywhere, for example in your Downloads folder.

<sub>No release yet? Use the green **Code** button → **Download ZIP**. The installer then builds Kompass itself, which needs an internet connection and takes about a minute longer.</sub>

### 3. Run the installer

**Windows:** double-click **`install.cmd`** in the unzipped folder.
If Windows asks whether you want to run the file, choose **Run** (or **More info → Run anyway**). A window shows the progress; when it says *Done*, Kompass opens. From then on, start it with the **Kompass** icon on your desktop or in the Start menu.

**macOS:** open **Terminal** (press ⌘ Space, type *Terminal*, press Return). Type `bash ` with a space at the end, drag the file **`install.sh`** from the unzipped folder into the Terminal window and press Return.
Kompass opens when it's done. Later you'll find it in the **Applications** folder inside your home folder, or with Spotlight.

**Linux:** open a terminal in the unzipped folder and run `bash install.sh`.
Kompass then shows up in your app menu, and you can also start it with the command `kompass`.

You can delete the downloaded folder afterwards; Kompass has been copied to its own place.

Kompass opens in a window of its own when Chrome, Edge, Brave or Chromium is installed. Otherwise it opens as a tab in your default browser, which works just as well.
Closing the last Kompass window stops Kompass completely a few seconds later.

## Getting started

1. **Projects → New project.** Give it a name and a color; the icon is generated for you.
2. **Add tasks** on the board, or press **N** anywhere for quick add.
3. Mark what matters today with the **star**. It then shows up under **Today**.
4. Plan posts under **Content**: drag ideas from *Unscheduled* onto a day.
5. Set up one big goal under **Goals**. Start with about ten actions. Turn repeating ones into **routines** to tick them off daily on the Today page.

### Quick add

Press **N** (or **Ctrl K** / **⌘ K**) and type, for example:

```
Fix landing page #website tomorrow !!! *
```

| You type                                                  | Kompass understands                               |
| --------------------------------------------------------- | ------------------------------------------------- |
| `#website`                                                | Project (the start of the name is enough)          |
| `today`, `tomorrow`, `friday`, `next week`                | Due date (German words like `morgen` work too)    |
| `24.12.` or `2026-12-24`                                  | Due date                                          |
| `!` `!!` `!!!` or `!low` `!medium` `!high`                 | Priority                                          |
| `*`                                                       | Add to today's focus                              |

### Keyboard shortcuts

| Keys                  | Action                                 |
| --------------------- | -------------------------------------- |
| **Ctrl K** / **⌘ K**  | Search or create                       |
| **N**                 | Quick add                              |
| **1** – **5**         | Today, Board, Projects, Content, Goals |
| **Esc**               | Close panel or dialog                  |

### Language and appearance

Kompass follows your system language (German or English; English for every other language) and your light/dark setting.
You can change both under **Settings**.

## Your data

Everything stays on your computer in a single SQLite file. There is no account, no cloud and no tracking. Kompass only accepts connections from your own computer.

| System  | Data folder                                  |
| ------- | -------------------------------------------- |
| Windows | `%APPDATA%\Kompass`                          |
| macOS   | `~/Library/Application Support/Kompass`      |
| Linux   | `~/.local/share/kompass`                     |

- A **backup** is made automatically on the first start of each day; the last 14 are kept in the `backups` folder.
- **Settings → Export** saves everything as a JSON file. **Settings → Import** restores such a file (it replaces the current data, after making a backup).
- **Settings → Open folder** shows the data folder.

**Want to look around first?** Run `node scripts/sample-data.mjs` in the downloaded folder. Then import the `kompass-sample-data.json` it creates under **Settings → Import**. This replaces your data, so do it before you start for real. Export your data first if you already have some.

## Update

Download the new version and run the installer again, as in step 3. Your data stays where it is.

## Uninstall

- **Windows:** double-click `uninstall.cmd` in the downloaded folder.
- **macOS and Linux:** run `bash install.sh --uninstall`. On macOS you can also drag **Kompass** from your Applications folder to the Trash.

Your data folder (see above) is kept. Delete it as well if you want to remove everything.

## Troubleshooting

- **"Node.js was not found"** even though you installed it: restart your computer once so the new program is found, then try again.
- **Kompass doesn't start:** look at `server.log` in the data folder. Another program may already be using port 4747.
- **Kompass opens in a browser tab, not its own window:** no Chrome, Edge, Brave or Chromium was found. Everything works the same; install one of them if you prefer a separate window.

## For developers

```bash
npm install
npm run build                       # type-check and build the interface into web/dist
KOMPASS_DATA=./data npm run server  # API and interface on http://127.0.0.1:4747
npm run dev                         # Vite with hot reload on http://localhost:5188 (needs the server running)
npm run app                         # start like the installed app: server in the background plus an app window
node scripts/smoke-test.mjs         # quick end-to-end check against an empty data folder
```

On Windows PowerShell, set the variable with `$env:KOMPASS_DATA = '.\data'` first.

- `server/`: Node.js server with no dependencies (`node:http`, `node:sqlite`). The schema and migrations are in `db.mjs`, and everything OS-specific is in `platform.mjs`.
- `web/src/`: React 19, Tailwind 4, dnd-kit and zustand. UI text is written as `tr('English', 'Deutsch')` (see `lib/i18n.ts`).
- `launcher/`: `kompass.mjs` starts Kompass on every system. `Launcher.cs` becomes `Kompass.exe` on Windows (compiled by the installer with the C# compiler that ships with Windows).
- `install.mjs`: one installer for all three systems. `install.cmd` and `install.sh` just call it.
- Project icons are generated locally with [DiceBear](https://www.dicebear.com) (style "Shapes", CC0).
- Releases: push a tag such as `v1.0.0`. GitHub Actions builds the interface and attaches a ready-to-install zip to the release. CI builds and tests on Windows, macOS and Linux.

## License

[MIT](LICENSE) · Made by [ManyPi](https://manypi.com)
