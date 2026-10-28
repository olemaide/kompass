import clsx from 'clsx';
import { X } from 'lucide-react';
import { tr } from '../lib/i18n';
import { dismissToast, useStore } from '../lib/store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-[60] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'anim-pop pointer-events-auto flex max-w-[420px] items-center gap-3 rounded-xl py-2.5 pr-2 pl-4 text-[13px] shadow-overlay',
            t.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg',
          )}
        >
          <span className="min-w-0 flex-1 truncate">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
              className="shrink-0 rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label={tr('Close', 'Schließen')} onClick={() => dismissToast(t.id)} className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
