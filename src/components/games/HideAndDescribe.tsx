import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Settings, Eye, EyeOff, Play, Square } from 'lucide-react';
import { sceneImageUrl } from '@/lib/images';

type Player = { name: string; color: string };
export type { Player };
type Owner = 0 | 1;

type Props = {
  title: string;
  players: [Player, Player];
  scores: [number, number];
  onPlayersChange: (players: [Player, Player]) => void;
  onScore: (player: Owner, delta: number) => void;
  onBack: () => void;
  onClose: () => void;
};

// One step larger than SceneViewer's 72px chips
const CHIP = 88;

const SWATCHES: { name: string; hex: string }[] = [
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Coral', hex: '#fb7185' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Mint', hex: '#34d399' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Lavender', hex: '#a78bfa' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Cocoa', hex: '#a16207' },
];

export function randomPlayerPair(): [Player, Player] {
  const a = Math.floor(Math.random() * SWATCHES.length);
  let b = Math.floor(Math.random() * SWATCHES.length);
  if (b === a) b = (a + 1 + Math.floor(Math.random() * (SWATCHES.length - 1))) % SWATCHES.length;
  return [
    { name: '', color: SWATCHES[a].hex },
    { name: '', color: SWATCHES[b].hex },
  ];
}

/**
 * Hide & Describe: one draggable chip is placed on a scene and hidden. The
 * active player taps around the scene to find it — every miss costs -1, and
 * tapping the hidden chip reveals it for +10.
 */
export function HideAndDescribe({ title, players, scores, onPlayersChange, onScore, onBack, onClose }: Props) {
  // Chip position in scene-container coordinates; start spot is upper-left
  const START = { x: 110, y: 140 };
  const [chip, setChip] = useState({ x: START.x, y: START.y, placed: false });
  const [dragging, setDragging] = useState(false);
  const [chipVisible, setChipVisible] = useState(true);
  const [selected, setSelected] = useState<Owner | null>(null);
  const [guessing, setGuessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const chipRef = useRef(chip);
  chipRef.current = chip;

  // New scene: chip back to start, visible, turn disengaged (scores/players persist)
  useEffect(() => {
    setChip({ x: START.x, y: START.y, placed: false });
    setChipVisible(true);
    setSelected(null);
    setGuessing(false);
    setSettingsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const playerName = (p: Owner) => players[p].name.trim() || `Player ${p + 1}`;
  const chipHidden = chip.placed && !chipVisible && !dragging;
  const canToggle = chip.placed && !dragging;

  const startDrag = (e: React.PointerEvent) => {
    if (!chipVisible) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setChip({ x: e.clientX - rect.left, y: e.clientY - rect.top, placed: true });
    setDragging(true);
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setChip((c) => ({ ...c, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  };

  const endDrag = useCallback(() => {
    setDragging((wasDragging) => {
      if (!wasDragging) return false;
      const cRect = containerRef.current?.getBoundingClientRect();
      const iRect = imgRef.current?.getBoundingClientRect();
      if (!cRect || !iRect) return false;
      const cur = chipRef.current;
      const cx = cRect.left + cur.x;
      const cy = cRect.top + cur.y;
      const r = CHIP / 2;
      const nearestX = Math.max(iRect.left, Math.min(cx, iRect.right));
      const nearestY = Math.max(iRect.top, Math.min(cy, iRect.bottom));
      const dx = cx - nearestX;
      const dy = cy - nearestY;
      const overlaps = dx * dx + dy * dy <= r * r;
      if (overlaps) {
        setChip((c) => ({ ...c, placed: true }));
      } else {
        // Placed fully off the picture: snap back to the start spot
        setChip({ x: START.x, y: START.y, placed: false });
      }
      return false;
    });
  }, []);

  const handleSceneTap = () => {
    if (!guessing || selected === null) return;
    onScore(selected, -1);
  };

  const handleHiddenChipTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!guessing || selected === null) return;
    onScore(selected, 10);
    setChipVisible(true);
    setGuessing(false);
    setSelected(null);
  };

  const toggleVisibility = () => {
    if (!canToggle) return;
    if (chipVisible) {
      setChipVisible(false);
    } else {
      // Manual reveal: no points, turn disengages
      setChipVisible(true);
      setGuessing(false);
      setSelected(null);
    }
  };

  const setPlayerColor = (p: Owner, color: string) => {
    const next: [Player, Player] = [{ ...players[0] }, { ...players[1] }];
    next[p] = { ...next[p], color };
    onPlayersChange(next);
  };

  const setPlayerName = (p: Owner, name: string) => {
    const next: [Player, Player] = [{ ...players[0] }, { ...players[1] }];
    next[p] = { ...next[p], name };
    onPlayersChange(next);
  };

  const otherColor = (p: Owner) => players[p === 0 ? 1 : 0].color;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex">
      {/* Left sidebar: top controls, centered game controls, settings at the bottom */}
      <aside className="shrink-0 flex flex-col p-1.5 border-r border-slate-200 bg-white overflow-y-auto w-fit">
        {/* Top controls */}
        <div className="flex items-center justify-between gap-1 shrink-0">
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="Back to scenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="Exit to dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Centered game controls: eye, scorecards, play */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          {/* Eye / Eye-Off toggle */}
          <button
            onClick={toggleVisibility}
            disabled={!canToggle}
            className={`h-9 w-full rounded-lg flex items-center justify-center border-2 transition-all ${
              !canToggle
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                : chipVisible
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700'
            }`}
            title={chipVisible ? 'Hide the chip' : 'Show the chip'}
          >
            {chipVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Player scorecards: radio on top, name below, score below that */}
          {([0, 1] as Owner[]).map((p) => {
            const isTurn = guessing && selected === p;
            const isSelected = selected === p;
            const color = players[p].color;
            return (
              <button
                key={p}
                onClick={() => {
                  if (guessing) return;
                  setSelected((prev) => (prev === p ? null : p));
                }}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 bg-white w-full transition-all ${
                  isTurn ? 'scale-[1.03]' : isSelected ? '' : 'opacity-80'
                }`}
                style={
                  isTurn
                    ? { borderColor: color, backgroundColor: `${color}1a`, boxShadow: `0 0 0 3px ${color}55` }
                    : isSelected
                      ? { borderColor: color }
                      : { borderColor: '#e2e8f0' }
                }
                title={guessing ? undefined : `Select ${playerName(p)}`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-transparent' : 'border-slate-300'
                  }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="block max-w-full text-[10px] font-bold text-slate-800 truncate leading-tight">
                  {playerName(p)}
                </span>
                <span className="text-base font-black tabular-nums leading-none" style={{ color }}>
                  {scores[p]}
                </span>
              </button>
            );
          })}

          {/* Play / Stop turn control */}
          <button
            onClick={() => {
              if (guessing) {
                setGuessing(false);
                return;
              }
              if (selected !== null && chipHidden) setGuessing(true);
            }}
            disabled={!guessing && (selected === null || !chipHidden)}
            className={`h-9 w-full rounded-lg flex items-center justify-center border-2 transition-all ${
              guessing
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse'
                : selected !== null && chipHidden
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
            }`}
            title={guessing ? 'Stop turn' : 'Start guessing turn'}
          >
            {guessing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Settings at the bottom */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 self-start mt-2 ${
            settingsOpen ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Player settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </aside>

      {/* Scene viewport: image maximized, chip free-drags over it */}
      <div
        ref={containerRef}
        onClick={handleSceneTap}
        className="relative flex-1 min-w-0 overflow-hidden select-none"
      >
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <img
            ref={imgRef}
            src={sceneImageUrl(title)}
            alt=""
            draggable={false}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        {/* Hidden chip hit target (only active while guessing) */}
        {chipHidden && (
          <div
            onClick={handleHiddenChipTap}
            className={`absolute rounded-full ${
              guessing ? 'cursor-pointer' : 'pointer-events-none'
            }`}
            style={{ left: chip.x - CHIP / 2, top: chip.y - CHIP / 2, width: CHIP, height: CHIP }}
          />
        )}

        {/* Visible draggable chip */}
        {chipVisible && (
          <div
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onClick={(e) => e.stopPropagation()}
            className={`absolute rounded-full border-4 touch-none shadow-lg transition-colors ${
              dragging
                ? 'border-red-600 bg-red-500/20 cursor-grabbing'
                : chip.placed
                  ? 'border-red-500 bg-red-500/10 cursor-grab hover:bg-red-500/20'
                  : 'border-dashed border-slate-400 bg-slate-200/60 cursor-grab hover:bg-slate-300/60'
            }`}
            style={{ left: chip.x - CHIP / 2, top: chip.y - CHIP / 2, width: CHIP, height: CHIP }}
            title="Drag onto the scene"
          />
        )}

        {/* Settings banner: edit player names and colors */}
        {settingsOpen && (
          <div className="absolute top-3 left-3 right-3 z-30 mx-auto max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Players</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {([0, 1] as Owner[]).map((p) => (
                <PlayerEditor
                  key={p}
                  index={p}
                  player={players[p]}
                  otherColor={otherColor(p)}
                  onNameChange={(name) => setPlayerName(p, name)}
                  onColorChange={(color) => setPlayerColor(p, color)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type PlayerEditorProps = {
  index: Owner;
  player: Player;
  otherColor: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
};

function PlayerEditor({ index, player, otherColor, onNameChange, onColorChange }: PlayerEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="w-9 h-9 rounded-full shrink-0 border-2 border-white shadow ring-1 ring-slate-200 transition-transform hover:scale-105"
          style={{ backgroundColor: player.color }}
          title="Tap to change color"
        />
        <input
          type="text"
          value={player.name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder={`Player ${index + 1}`}
          className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
      {pickerOpen && (
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="grid grid-cols-8 gap-1.5">
            {SWATCHES.map((swatch) => {
              const takenByOther = swatch.hex === otherColor;
              const active = player.color === swatch.hex;
              return (
                <button
                  key={swatch.name}
                  onClick={() => {
                    if (takenByOther) return;
                    onColorChange(swatch.hex);
                    setPickerOpen(false);
                  }}
                  disabled={takenByOther}
                  className={`w-6 h-6 rounded-full transition-all ${
                    takenByOther
                      ? 'opacity-25 cursor-not-allowed'
                      : active
                        ? 'ring-2 ring-offset-1 ring-slate-800 scale-110'
                        : 'hover:scale-110 cursor-pointer'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={takenByOther ? `${swatch.name} (taken)` : swatch.name}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
