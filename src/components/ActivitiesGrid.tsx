import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  onClose: () => void;
  onLaunchSpinner: () => void;
  onLaunchMemory: () => void;
  onLaunchTicTacToe: () => void;
  onLaunchConnectFour: () => void;
  onLaunchDice: () => void;
  onLaunchDots: () => void;
  onLaunchWhackAMole: () => void;
  onLaunchHiddenTreasure: () => void;
};

type Activity = {
  name: string;
  icon: React.ReactNode;
  launch?: () => void;
};

const SLICE_COLORS = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#fb923c', '#a3e635', '#f472b6', '#22d3ee'];

function SoonBadge() {
  return (
    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Soon</span>
  );
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function SpinnerIcon() {
  const n = 8;
  const step = 360 / n;
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={slicePath(32, 34, 22, i * step, (i + 1) * step)}
          fill={SLICE_COLORS[i % SLICE_COLORS.length]}
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      ))}
      <circle cx="32" cy="34" r="21.5" fill="none" stroke="#374151" strokeWidth="2.5" />
      <circle cx="32" cy="34" r="4" fill="#374151" />
      {/* Pointer triangle at the top */}
      <path d="M32 3 L27 12 L37 12 Z" fill="#374151" />
    </svg>
  );
}

function MemoryIcon() {
  const cards = [
    { x: 8, y: 8 },
    { x: 26, y: 8 },
    { x: 44, y: 8 },
    { x: 8, y: 30 },
    { x: 26, y: 30 },
    { x: 44, y: 30 },
  ];
  const backs = ['#f87171', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8'];
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      {cards.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={c.y}
            width={16}
            height={20}
            rx={3}
            fill={backs[i]}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx={c.x + 8} cy={c.y + 10} r={4.5} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.85" />
        </g>
      ))}
    </svg>
  );
}

function TicTacToeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      <g stroke="#374151" strokeWidth="4" strokeLinecap="round">
        <line x1="22" y1="8" x2="22" y2="56" />
        <line x1="42" y1="8" x2="42" y2="56" />
        <line x1="8" y1="22" x2="56" y2="22" />
        <line x1="8" y1="42" x2="56" y2="42" />
      </g>
      <g strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M11 11 L19 19 M19 11 L11 19" stroke="#ef4444" />
        <circle cx="32" cy="32" r="5" stroke="#2563eb" />
        <path d="M45 45 L53 53 M53 45 L45 53" stroke="#ef4444" />
      </g>
    </svg>
  );
}

function ConnectFourIcon() {
  const holes: { x: number; y: number; token?: string }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const token =
        row === 3 && col === 2
          ? '#dc2626'
          : row === 3 && col === 3
            ? '#1f2937'
            : row === 2 && col === 2
              ? '#dc2626'
              : undefined;
      holes.push({ x: 7 + col * 11, y: 7 + row * 11, token });
    }
  }
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      <rect x="2" y="2" width="60" height="52" rx="4" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
      {holes.map((h, i) => (
        <g key={i}>
          <circle cx={h.x + 3.5} cy={h.y + 3.5} r={3.8} fill={h.token ?? '#eff6ff'} />
          {h.token && <circle cx={h.x + 3.5} cy={h.y + 3.5} r={3.8} fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />}
        </g>
      ))}
      {/* Legs */}
      <rect x="8" y="54" width="6" height="8" rx="1.5" fill="#1e40af" />
      <rect x="50" y="54" width="6" height="8" rx="1.5" fill="#1e40af" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      {/* Single die */}
      <rect x="10" y="10" width="44" height="44" rx="9" fill="#f8f9fa" stroke="#374151" strokeWidth="2.5" />
      <circle cx="23" cy="23" r="4.5" fill="#374151" />
      <circle cx="41" cy="41" r="4.5" fill="#ef4444" />
      <circle cx="23" cy="41" r="4.5" fill="#ef4444" />
      <circle cx="41" cy="23" r="4.5" fill="#374151" />
    </svg>
  );
}

function DotsAndBoxesIcon() {
  const dots: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) dots.push({ x: 10 + c * 15, y: 10 + r * 15 });
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      <line x1="10" y1="10" x2="25" y2="10" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1="10" y1="10" x2="10" y2="25" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1="10" y1="25" x2="25" y2="25" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1="25" y1="10" x2="25" y2="25" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <rect x="12.5" y="12.5" width="10" height="10" rx="2" fill="#ef4444" opacity="0.4" />
      <line x1="25" y1="10" x2="40" y2="10" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="10" x2="40" y2="25" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      <rect x="27.5" y="12.5" width="10" height="10" rx="2" fill="#3b82f6" opacity="0.4" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3" fill="#374151" />
      ))}
    </svg>
  );
}

function WhackAMoleIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]">
      {/* Mound */}
      <ellipse cx="30" cy="52" rx="24" ry="8" fill="#16a34a" />
      <ellipse cx="30" cy="48" rx="18" ry="6" fill="#4d7c0f" />
      {/* Hole */}
      <ellipse cx="30" cy="48" rx="12" ry="4" fill="#1c1917" />
      {/* Word card popping out */}
      <rect x="20" y="22" width="20" height="18" rx="3" fill="#ffffff" stroke="#374151" strokeWidth="1.5" />
      <circle cx="30" cy="31" r="5" fill="#34d399" />
      <rect x="23" y="37" width="14" height="2" rx="1" fill="#d1d5db" />
    </svg>
  );
}

export function ActivitiesGrid({ onClose, onLaunchSpinner, onLaunchMemory, onLaunchTicTacToe, onLaunchConnectFour, onLaunchDice, onLaunchDots, onLaunchWhackAMole, onLaunchHiddenTreasure }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ACTIVITIES: Activity[] = [
    { name: 'Spinner', icon: <SpinnerIcon />, launch: onLaunchSpinner },
    { name: 'Memory', icon: <MemoryIcon />, launch: onLaunchMemory },
    { name: 'Tic Tac Toe', icon: <TicTacToeIcon />, launch: onLaunchTicTacToe },
    { name: 'Connect 4', icon: <ConnectFourIcon />, launch: onLaunchConnectFour },
    { name: 'Dice', icon: <DiceIcon />, launch: onLaunchDice },
    { name: 'Dots and Boxes', icon: <DotsAndBoxesIcon />, launch: onLaunchDots },
    { name: 'Whack a Mole', icon: <WhackAMoleIcon />, launch: onLaunchWhackAMole },
    { name: 'Hidden Treasure', icon: <SoonBadge /> },
    { name: 'Feed the Puppy', icon: <SoonBadge /> },
    { name: 'Board Game', icon: <SoonBadge /> },
    { name: 'Battleship', icon: <SoonBadge /> },
    { name: 'Crazy Eights', icon: <SoonBadge /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      <header className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div>
          <h2 className="text-white font-bold text-lg">Activities</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto">
          {ACTIVITIES.map((activity) => {
            const playable = Boolean(activity.launch);
            return (
              <button
                key={activity.name}
                onClick={activity.launch}
                disabled={!playable}
                className="group relative text-left bg-white rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-200 transition-all duration-200 disabled:cursor-default enabled:hover:shadow-xl enabled:hover:scale-[1.03] enabled:active:scale-[0.98]"
              >
                <div className="relative flex items-center justify-center aspect-[4/3]">
                  <div className="relative flex items-center justify-center w-full h-full">{activity.icon}</div>
                </div>
                <div className="px-1.5 pb-2 pt-0.5 text-center">
                  <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">{activity.name}</h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
