import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { tr } from '../lib/i18n';

/* ---------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2.5 text-[13px]' : 'h-8.5 px-3.5 text-[14px]',
        variant === 'primary' && 'bg-accent text-accent-ink hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-raised',
        variant === 'ghost' && 'text-ink-2 hover:bg-sunken hover:text-ink',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink',
        active && 'bg-sunken text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Two clicks: the first arms the button, the second confirms. Avoids blocking browser dialogs. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = tr('Really delete?', 'Wirklich löschen?'),
  icon,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  icon?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      size="sm"
      variant={armed ? 'danger' : 'ghost'}
      icon={icon}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={clsx(!armed && 'hover:text-danger')}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

/* ---------------------------------------------------------------- inputs */

export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }
>(function AutoTextarea({ minRows = 1, className, value, ...rest }, outer) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const borders = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const min = (px(cs.lineHeight) || 20) * minRows + px(cs.paddingTop) + px(cs.paddingBottom) + borders;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight + borders, min)}px`;
  }, [value, minRows]);
  return (
    <textarea
      ref={(el) => {
        inner.current = el;
        if (typeof outer === 'function') outer(el);
        else if (outer) outer.current = el;
      }}
      rows={minRows}
      value={value}
      className={clsx('block overflow-hidden', className)}
      {...rest}
    />
  );
});

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div className={clsx('relative', className)}>
      <select
        aria-label={label}
        value={String(value)}
        onChange={(e) => {
          const hit = options.find((o) => String(o.id) === e.target.value);
          if (hit) onChange(hit.id);
        }}
        className="h-8 w-full appearance-none rounded-lg border border-transparent bg-transparent pr-7 pl-2 text-[14px] text-ink transition-colors hover:border-line hover:bg-surface focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={String(o.id)} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-colors',
            size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7.5 px-3 text-[13px]',
            value === o.id ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- status */

export function Checkbox({
  checked,
  onChange,
  label,
  color,
  size = 18,
  round = true,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color?: string;
  size?: number;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ width: size, height: size, ...(checked ? { background: color ?? 'var(--ok)', borderColor: color ?? 'var(--ok)' } : {}) }}
      className={clsx(
        'group/cb inline-flex shrink-0 items-center justify-center border-[1.5px] border-line-strong transition-colors hover:border-ink-3',
        round ? 'rounded-full' : 'rounded-[5px]',
      )}
    >
      <Check
        strokeWidth={3}
        className={clsx('size-[62%] text-white transition-opacity', checked ? 'opacity-100' : 'opacity-0 group-hover/cb:opacity-30 group-hover/cb:text-ink-3')}
      />
    </button>
  );
}

export function ProgressBar({ value, color = 'var(--accent)', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={clsx('h-1.5 overflow-hidden rounded-full bg-sunken', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 40,
  stroke = 4,
  color = 'var(--accent)',
  track = 'var(--sunken)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export const Dot = ({ color, size = 8, className }: { color: string; size?: number; className?: string }) => (
  <span className={clsx('inline-block shrink-0 rounded-[3px]', className)} style={{ width: size, height: size, background: color }} />
);

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-surface px-1 font-sans text-[11px] font-medium text-ink-3">
      {children}
    </kbd>
  );
}

/* ---------------------------------------------------------------- overlays */

/** Anchored floating panel that closes on outside click and Escape. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = 'left',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('pointerdown', down), 0);
    document.addEventListener('keydown', key, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key, true);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={clsx(
        'anim-pop absolute top-full z-40 mt-1.5 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-overlay',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  hint,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-sunken',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {icon && <span className="text-ink-3 [&>svg]:size-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-start gap-2 py-6', className)}>
      {icon && <div className="mb-1 text-ink-3 [&>svg]:size-5">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="max-w-md text-[13px] text-ink-3">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Collapsible section: the header always shows, the body only on demand. */
export function Disclosure({
  title,
  count,
  defaultOpen = false,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md py-1 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
      >
        <ChevronDown className={clsx('size-3.5 transition-transform', !open && '-rotate-90')} />
        {title}
        {count !== undefined && <span className="tabular text-ink-3">{count}</span>}
      </button>
      {open && <div className="anim-fade mt-1">{children}</div>}
    </div>
  );
}

export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, opts: { mod?: boolean } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (opts.mod && !(e.ctrlKey || e.metaKey)) return;
      if (!opts.mod && (e.ctrlKey || e.metaKey || e.altKey)) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      const t = e.target as HTMLElement;
      if (!opts.mod && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      ref.current(e);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [key, opts.mod]);
}
