/** 3×3 grid with the center lit: the shape of a Harada block, used as the app mark. */
export function Logo({ size = 24 }: { size?: number }) {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {cells.map((i) => {
        const x = (i % 3) * 8 + 0.5;
        const y = Math.floor(i / 3) * 8 + 0.5;
        const center = i === 4;
        const edge = i % 2 === 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={7}
            height={7}
            rx={1.8}
            fill={center ? 'var(--accent)' : 'var(--ink)'}
            opacity={center ? 1 : edge ? 0.55 : 0.25}
          />
        );
      })}
    </svg>
  );
}
