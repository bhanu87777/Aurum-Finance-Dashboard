// The AURUM mark: an "A" stroke inside a rounded frame, drawn in the gold
// gradient. Pure SVG so it stays crisp at any size.
export function Monogram({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="none" stroke="url(#au)" strokeWidth="1.5" />
      <path
        d="M12 28 L20 11 L28 28 M15.5 22.5 H24.5"
        fill="none"
        stroke="url(#au)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="au" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d68a" />
          <stop offset="100%" stopColor="#c99b3f" />
        </linearGradient>
      </defs>
    </svg>
  );
}
