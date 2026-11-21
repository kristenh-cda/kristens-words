export function GamesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* die with pips */}
      <rect x="4" y="14" width="20" height="20" rx="5" />
      <circle cx="11" cy="21" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="21" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="28" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="28" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="24.5" r="1.6" fill="currentColor" stroke="none" />
      {/* playing cards */}
      <rect x="25" y="8" width="14" height="19" rx="3" transform="rotate(12 32 17.5)" />
      <rect x="27" y="12" width="14" height="19" rx="3" transform="rotate(-8 34 21.5)" />
      {/* spinner arc */}
      <path d="M34 34a10 10 0 0 1-10 10" />
      <path d="M24 44l3-4M24 44l4 2.5" />
      <circle cx="39" cy="36" r="5" />
      <path d="M39 36l2.5-2.5" />
    </svg>
  );
}
