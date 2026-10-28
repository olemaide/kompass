import { createAvatar } from '@dicebear/core';
import * as shapes from '@dicebear/shapes';
import clsx from 'clsx';
import { useMemo } from 'react';
import type { Project } from '../lib/types';

/** Blends a #rrggbb color toward white (amount > 0) or black (amount < 0); returns rrggbb without '#'. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return [16, 8, 0]
    .map((bits) => {
      const c = (n >> bits) & 255;
      return Math.round(c + (target - c) * a)
        .toString(16)
        .padStart(2, '0');
    })
    .join('');
}

/**
 * Abstract DiceBear "shapes" avatar, generated locally. Seeded by the project id so it survives
 * renames, and drawn in tints of the project color so it still matches the dots elsewhere.
 */
export function ProjectAvatar({ project, size = 40, className }: { project: Project; size?: number; className?: string }) {
  const src = useMemo(() => {
    const base = /^#[0-9a-f]{6}$/i.test(project.color) ? project.color : '#3E63DD';
    return createAvatar(shapes, {
      seed: project.id,
      size,
      backgroundColor: [base.slice(1)],
      shape1Color: [shade(base, 0.55)],
      shape2Color: [shade(base, -0.35)],
      shape3Color: [shade(base, 0.85)],
    }).toDataUri();
  }, [project.id, project.color, size]);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={clsx('shrink-0 rounded-[28%]', className)}
      style={{ width: size, height: size }}
    />
  );
}
