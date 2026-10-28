import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Page({
  title,
  lead,
  actions,
  children,
  className,
  above,
  fill,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Small context line above the title, e.g. a back link. */
  above?: ReactNode;
  /** Stretch to the window height so boards and calendars can fill it. */
  fill?: boolean;
}) {
  // Every view shares this width and padding, so switching views never moves the title or the actions.
  return (
    <div className={clsx('mx-auto w-full max-w-[1440px] px-10 pt-9 max-md:px-5', fill ? 'flex h-full flex-col' : 'pb-16', className)}>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          {above && <div className="mb-2 flex h-8 items-center">{above}</div>}
          <h1 className="display">{title}</h1>
          {lead && <p className="mt-2 max-w-[68ch] text-[15px] text-ink-2">{lead}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
