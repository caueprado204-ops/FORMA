export function Logo({ size = 28, word = false }: { size?: number; word?: boolean }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lg-f" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9b7dff" />
            <stop offset="1" stopColor="#5b3df5" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lg-f)" />
        <path d="M21 47V17h23v7.5H29.5v5.8H42v7.4H29.5V47z" fill="#d4ff3a" />
        <circle cx="46" cy="44" r="4.2" fill="#fff" />
      </svg>
      {word && <span className="logo-word">forma<span>studio</span></span>}
    </span>
  );
}
