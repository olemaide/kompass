import { Download, FolderOpen, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Page } from '../components/Page';
import { Button, Kbd, Segmented } from '../components/ui';
import { api, type Info } from '../lib/api';
import { modKey, readLangPref, setLangPref, systemLang, tr, type LangPref } from '../lib/i18n';
import { importSnapshot, toast } from '../lib/store';
import { useTheme } from '../lib/theme';

export function Settings() {
  const [theme, setTheme] = useTheme();
  const [info, setInfo] = useState<Info | null>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; data: unknown } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.info().then(setInfo, () => setInfo(null));
  }, []);

  const pickFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) throw new Error(tr('Not a Kompass export file', 'Keine Kompass-Exportdatei'));
      setPendingImport({ name: file.name, data });
    } catch (err) {
      toast(tr(`Could not read the file: ${(err as Error).message}`, `Datei nicht lesbar: ${(err as Error).message}`), 'error');
    }
  };

  return (
    <Page title={tr('Settings', 'Einstellungen')}>
      <div className="flex max-w-[760px] flex-col divide-y divide-line border-y border-line">
        <Row title={tr('Appearance', 'Darstellung')} text={tr('Follows your system setting by default.', 'Folgt standardmäßig der Systemeinstellung.')}>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { id: 'system', label: tr('System', 'Wie System') },
              { id: 'light', label: tr('Light', 'Hell') },
              { id: 'dark', label: tr('Dark', 'Dunkel') },
            ]}
          />
        </Row>

        <Row
          title={tr('Language', 'Sprache')}
          text={tr(
            `Follows your system language by default (currently ${systemLang() === 'de' ? 'German' : 'English'}).`,
            `Folgt standardmäßig der Systemsprache (gerade ${systemLang() === 'de' ? 'Deutsch' : 'Englisch'}).`,
          )}
        >
          <Segmented<LangPref>
            value={readLangPref()}
            onChange={setLangPref}
            options={[
              { id: 'system', label: tr('System', 'Wie System') },
              { id: 'en', label: 'English' },
              { id: 'de', label: 'Deutsch' },
            ]}
          />
        </Row>

        <Row
          title={tr('Storage', 'Speicherort')}
          text={
            <>
              {tr(
                'Everything stays on this computer in a single SQLite file. A backup is made automatically on the first start of each day; the last 14 are kept.',
                'Alles liegt lokal in einer SQLite-Datei auf diesem Rechner. Beim ersten Start des Tages wird automatisch eine Sicherung angelegt, die letzten 14 bleiben erhalten.',
              )}
              {info && <code className="mt-2 block rounded-md bg-sunken px-2 py-1 font-sans text-[12px] break-all text-ink-2">{info.dbFile}</code>}
            </>
          }
        >
          <Button icon={<FolderOpen className="size-4" />} onClick={() => api.openDataFolder()}>
            {tr('Open folder', 'Ordner öffnen')}
          </Button>
        </Row>

        <Row title="Export" text={tr('All projects, tasks, posts, goals and notes as a JSON file.', 'Alle Projekte, Aufgaben, Posts, Ziele und Notizen als JSON-Datei.')}>
          <Button icon={<Download className="size-4" />} onClick={() => (location.href = '/api/export')}>
            {tr('Export', 'Exportieren')}
          </Button>
        </Row>

        <Row
          title="Import"
          text={
            pendingImport
              ? tr(
                  `“${pendingImport.name}” replaces all current data. A backup is made first.`,
                  `„${pendingImport.name}“ ersetzt alle aktuellen Daten. Vorher wird automatisch eine Sicherung angelegt.`,
                )
              : tr('Restores an export and replaces the current data.', 'Stellt einen Export wieder her und ersetzt dabei die aktuellen Daten.')
          }
        >
          {pendingImport ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPendingImport(null)}>
                {tr('Cancel', 'Abbrechen')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await importSnapshot(pendingImport.data);
                    toast(tr('Import complete', 'Import abgeschlossen'));
                  } catch (err) {
                    toast(tr(`Import failed: ${(err as Error).message}`, `Import fehlgeschlagen: ${(err as Error).message}`), 'error');
                  }
                  setPendingImport(null);
                }}
              >
                {tr('Replace data', 'Daten ersetzen')}
              </Button>
            </div>
          ) : (
            <>
              <Button icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
                {tr('Choose file', 'Datei wählen')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickFile(f);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </Row>

        <Row
          title={tr('Keyboard shortcuts', 'Tastenkürzel')}
          text={tr('Work everywhere, except while you are typing in a text field.', 'Funktionieren überall, außer während du in einem Textfeld schreibst.')}
        >
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-[13px]">
            <dt className="flex gap-1">
              <Kbd>{modKey}</Kbd>
              <Kbd>K</Kbd>
            </dt>
            <dd className="text-ink-2">{tr('Search or create', 'Suchen oder erstellen')}</dd>
            <dt>
              <Kbd>N</Kbd>
            </dt>
            <dd className="text-ink-2">{tr('Quickly add something', 'Schnell etwas anlegen')}</dd>
            <dt className="flex gap-1">
              <Kbd>1</Kbd>–<Kbd>5</Kbd>
            </dt>
            <dd className="text-ink-2">{tr('Today, Board, Projects, Content, Goals', 'Heute, Board, Projekte, Content, Ziele')}</dd>
            <dt>
              <Kbd>Esc</Kbd>
            </dt>
            <dd className="text-ink-2">{tr('Close panel or dialog', 'Panel oder Dialog schließen')}</dd>
          </dl>
        </Row>
      </div>
      {info && <p className="mt-6 text-[12px] text-ink-3">Kompass {info.version}</p>}
    </Page>
  );
}

function Row({ title, text, children }: { title: string; text: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-10 py-6 max-md:grid-cols-1 max-md:gap-3">
      <div>
        <h2 className="section-title">{title}</h2>
        <div className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-3">{text}</div>
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}
