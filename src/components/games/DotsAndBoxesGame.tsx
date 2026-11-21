import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Minus, Trophy, RotateCcw, Grid3X3, ArrowLeft } from 'lucide-react';
import { findCategory, categories, languageCategories, type Mode, type SelectableSource, type SoundCategory } from '@/data/words';
import { FlashcardImage } from '@/components/FlashcardImage';
import { MixedModePicker } from '@/components/MixedModePicker';
import { formatWordDisplay } from '@/lib/formatters';
import { DataPillWidget } from '@/components/DataPillWidget';

type Props = {
  mode: Mode;
  onClose: () => void;
};

type Step = 1 | 2 | 3 | 4;

type Target = { word: string; source: SelectableSource };

type PlayerConfig = {
  name: string;
  color: string;
};

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

const GRID_OPTIONS = [
  { boxes: 2, label: '2 × 2' },
  { boxes: 3, label: '3 × 3' },
  { boxes: 4, label: '4 × 4' },
];

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

type LineKey = string;
type Owner = 0 | 1;

function randomDistinctColors(): [string, string] {
  const a = Math.floor(Math.random() * SWATCHES.length);
  let b = Math.floor(Math.random() * SWATCHES.length);
  if (b === a) b = (a + 1 + Math.floor(Math.random() * (SWATCHES.length - 1))) % SWATCHES.length;
  return [SWATCHES[a].hex, SWATCHES[b].hex];
}

export function DotsAndBoxesGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Wizard state
  const [boxCount, setBoxCount] = useState(3);
  const [pool, setPool] = useState<Target[]>([]);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<[PlayerConfig, PlayerConfig]>(() => {
    const [c1, c2] = randomDistinctColors();
    return [
      { name: '', color: c1 },
      { name: '', color: c2 },
    ];
  });
  const [firstPlayer, setFirstPlayer] = useState<Owner>(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);
  const [noWords, setNoWords] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Game state
  const [targets, setTargets] = useState<Target[]>([]);
  const [lines, setLines] = useState<Map<LineKey, Owner>>(new Map());
  const [boxes, setBoxes] = useState<Map<LineKey, Owner>>(new Map());
  const [turn, setTurn] = useState<Owner>(0);
  // Pending practice card anchored to the line just drawn: the line is already
  // claimed; scoring/undo/dismiss all resolve this pending state.
  const [pending, setPending] = useState<{
    key: LineKey;
    card: Target;
    completed: string[];
    prevTurn: Owner;
    nextTurn: Owner;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [deckIndex, setDeckIndex] = useState(0);
  const [deck, setDeck] = useState<Target[]>([]);

  const playerName = (p: Owner) => players[p].name.trim() || `Player ${p + 1}`;
  const playerColor = (p: Owner) => players[p].color;

  // Step 2: deck selection via MixedModePicker
  const handleDeckSelected = useCallback((words: string[], sources: SelectableSource[]) => {
    const seen = new Set<string>();
    const out: Target[] = [];
    for (const s of sources) {
      for (const w of s.words) {
        const key = w.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ word: w, source: s });
        }
      }
    }
    setPool(out);
    setPickedWords(new Set(out.map((t) => t.word)));
    setStep(3);
  }, []);

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const selectAllWords = () => setPickedWords(new Set(pool.map((t) => t.word)));
  const clearWords = () => setPickedWords(new Set());

  const beginGame = () => {
    const picked = noWords ? [] : pool.filter((t) => pickedWords.has(t.word));
    if (!noWords && picked.length === 0) return;
    setTargets(picked);
    setDeck([...picked].sort(() => Math.random() - 0.5));
    setDeckIndex(0);
    setLines(new Map());
    setBoxes(new Map());
    setTurn(firstPlayer);
    setCorrectCount(0);
    setTryCount(0);
    setGameStarted(true);
  };

  const resetToStep1 = () => {
    setStep(1);
    setNoWords(false);
    setGameStarted(false);
    setPickedWords(new Set());
    setPool([]);
    setTargets([]);
    setLines(new Map());
    setBoxes(new Map());
    setCorrectCount(0);
    setTryCount(0);
  };

  const drawKey = (kind: 'h' | 'v', r: number, c: number): LineKey => `${kind}-${r}-${c}`;

  const boxComplete = (allLines: Map<LineKey, Owner>, r: number, c: number) =>
    allLines.has(drawKey('h', r, c)) &&
    allLines.has(drawKey('h', r + 1, c)) &&
    allLines.has(drawKey('v', r, c)) &&
    allLines.has(drawKey('v', r, c + 1));

  const boxesCompletedBy = (allLines: Map<LineKey, Owner>, key: LineKey): string[] => {
    const [kind, rStr, cStr] = key.split('-');
    const r = Number(rStr);
    const c = Number(cStr);
    const completed: string[] = [];
    if (kind === 'h') {
      if (r > 0 && boxComplete(allLines, r - 1, c)) completed.push(`${r - 1}-${c}`);
      if (r < boxCount && boxComplete(allLines, r, c)) completed.push(`${r}-${c}`);
    } else {
      if (c > 0 && boxComplete(allLines, r, c - 1)) completed.push(`${r}-${c - 1}`);
      if (c < boxCount && boxComplete(allLines, r, c)) completed.push(`${r}-${c}`);
    }
    return completed;
  };

  const nextCard = (): Target => {
    if (deck.length === 0) return targets[0];
    const card = deck[deckIndex % deck.length];
    setDeckIndex((i) => i + 1);
    return card;
  };

  // Claiming the line happens immediately on click; the flashcard is practice on top.
  // Completing a box earns an extra turn; the turn otherwise passes — but the
  // highlight only updates when the card is dismissed (check / dash / X).
  const handleLineClick = (key: LineKey) => {
    if (lines.has(key) || pending) return;
    const current = turn;

    const newLines = new Map(lines);
    newLines.set(key, current);
    setLines(newLines);

    const completed = boxesCompletedBy(newLines, key);
    if (completed.length > 0) {
      const newBoxes = new Map(boxes);
      completed.forEach((b) => newBoxes.set(b, current));
      setBoxes(newBoxes);
    }

    if (targets.length > 0) {
      setPending({
        key,
        card: nextCard(),
        completed,
        prevTurn: current,
        nextTurn: completed.length > 0 ? current : ((current === 0 ? 1 : 0) as Owner),
      });
    } else if (completed.length === 0) {
      setTurn((t) => (t === 0 ? 1 : 0) as Owner);
    }
  };

  const resolvePending = () => {
    if (!pending) return;
    setTurn(pending.nextTurn);
    setPending(null);
  };

  const scoreCorrect = () => {
    setCorrectCount((n) => n + 1);
    resolvePending();
  };

  const scoreTry = () => {
    setTryCount((n) => n + 1);
    resolvePending();
  };

  // X: complete the turn without recording any data
  const closeCard = () => resolvePending();

  // Back: undo the move — retract the line, any boxes it completed, and the turn
  const undoPending = () => {
    if (!pending) return;
    setLines((prev) => {
      const next = new Map(prev);
      next.delete(pending.key);
      return next;
    });
    if (pending.completed.length > 0) {
      setBoxes((prev) => {
        const next = new Map(prev);
        pending.completed.forEach((b) => next.delete(b));
        return next;
      });
    }
    setTurn(pending.prevTurn);
    setPending(null);
  };

  const totalLines = 2 * boxCount * (boxCount + 1);
  const scores: [number, number] = [0, 0];
  boxes.forEach((owner) => {
    scores[owner] += 1;
  });
  const gameOver = lines.size === totalLines;
  const winner: Owner | null =
    scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;

  const boardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(420);

  useLayoutEffect(() => {
    if (!gameStarted) return;
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const side = Math.floor(Math.min(el.clientWidth, el.clientHeight));
      setBoardPx(Math.max(200, side));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gameStarted]);

  // ============================== SETUP WIZARD ==============================

  if (!gameStarted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Dots and Boxes</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: grid size */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <p className="text-sm text-gray-500">Choose the size of the board.</p>
              <div className="flex flex-wrap gap-3">
                {GRID_OPTIONS.map((opt) => {
                  const active = opt.boxes === boxCount;
                  return (
                    <button
                      key={opt.boxes}
                      onClick={() => setBoxCount(opt.boxes)}
                      className={`px-6 py-4 rounded-xl text-lg font-bold border-2 transition-all ${
                        active
                          ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                      <span className="block text-xs font-medium opacity-70">boxes</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: deck selection (MixedModePicker overlays) */}
          {step === 2 && (
            <MixedModePicker
              mode={mode}
              onStart={handleDeckSelected}
              onClose={() => setStep(1)}
            />
          )}

          {/* Step 3: target selection */}
          {step === 3 && (
            <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick target words{' '}
                  <span className="font-normal text-gray-400">({pickedWords.size} selected)</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={selectAllWords}
                    className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold hover:bg-green-100 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Select All
                  </button>
                  <button
                    onClick={clearWords}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {pool.map(({ word, source }) => {
                    const sel = pickedWords.has(word);
                    return (
                      <button
                        key={`${source.subId}-${source.groupId}-${word}`}
                        onClick={() => toggleWord(word)}
                        className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                          sel ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-50">
                          <FlashcardImage
                            word={word}
                            category={categoryForSource(source)}
                            subId={source.subId}
                            groupId={source.groupId}
                          />
                        </div>
                        <span className="block text-[10px] text-gray-500 truncate px-1 py-0.5 text-center leading-tight">
                          {formatWordDisplay(word, source.categoryId, source.subId)}
                        </span>
                        {sel && (
                          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: players */}
          {step === 4 && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <p className="text-sm text-gray-500">
                Tap the color circle to pick a color, tap a name to edit it, and tap the crown to decide who goes first.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {([0, 1] as Owner[]).map((p) => {
                  const config = players[p];
                  const otherColor = players[p === 0 ? 1 : 0].color;
                  const isFirst = firstPlayer === p;
                  return (
                    <PlayerSetupCard
                      key={p}
                      index={p}
                      config={config}
                      otherColor={otherColor}
                      isFirst={isFirst}
                      onNameChange={(name) =>
                        setPlayers((prev) => {
                          const next: [PlayerConfig, PlayerConfig] = [...prev];
                          next[p] = { ...next[p], name };
                          return next;
                        })
                      }
                      onColorChange={(color) =>
                        setPlayers((prev) => {
                          const next: [PlayerConfig, PlayerConfig] = [...prev];
                          next[p] = { ...next[p], color };
                          return next;
                        })
                      }
                      onMakeFirst={() => setFirstPlayer(p)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-1.5 mb-3">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-gray-900' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
              ) : (
                <span className="text-sm text-gray-500">{boxCount} × {boxCount} board</span>
              )}
              {step < 4 ? (
                <div className="flex items-center gap-2">
                  {step === 1 && (
                    <button
                      onClick={() => {
                        setNoWords(true);
                        setStep(4);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-300 font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                      Play without target words
                    </button>
                  )}
                  <button
                    onClick={() => setStep((s) => (s + 1) as Step)}
                    disabled={step === 3 && pickedWords.size === 0}
                    className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {step === 1 ? 'Choose words' : 'Next'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={beginGame}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                  Begin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================ GAME BOARD ================================

  const PAD = 30;
  const CELL = 100;
  const size = boxCount * CELL + PAD * 2;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-50 to-indigo-100 flex">
      {/* Left sidebar: player scorecards */}
      <aside className="shrink-0 flex flex-col justify-center items-center gap-3 p-2 bg-transparent w-44">
        {([0, 1] as Owner[]).map((p) => {
          const active = turn === p && !gameOver;
          const color = playerColor(p);
          return (
            <div
              key={p}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 bg-white shadow-sm transition-all w-full ${
                active ? 'scale-105' : 'opacity-75'
              }`}
              style={
                active
                  ? { borderColor: color, backgroundColor: `${color}26`, boxShadow: `0 0 0 4px ${color}55` }
                  : { borderColor: '#e5e7eb' }
              }
            >
              <span
                className={`w-4 h-4 rounded-full shrink-0 ${active ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-bold text-gray-800 max-w-full truncate text-center">
                {playerName(p)}
              </span>
              <span className="text-2xl font-black tabular-nums leading-none" style={{ color }}>
                {scores[p]}
              </span>
              {active && (
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: color }}
                >
                  Turn
                </span>
              )}
            </div>
          );
        })}
      </aside>

      {/* Board fills the remaining middle space */}
      <div ref={boardRef} className="flex-1 min-w-0 flex justify-center items-center px-3 py-3">
        <div className="relative" style={{ width: boardPx, height: boardPx }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full block" role="img" aria-label="Dots and boxes board">
            {/* Filled boxes */}
            {[...boxes.entries()].map(([key, owner]) => {
              const [rStr, cStr] = key.split('-');
              return (
                <rect
                  key={`box-${key}`}
                  x={PAD + Number(cStr) * CELL + 3}
                  y={PAD + Number(rStr) * CELL + 3}
                  width={CELL - 6}
                  height={CELL - 6}
                  rx={10}
                  fill={playerColor(owner)}
                  opacity={0.35}
                />
              );
            })}

            {/* Drawn lines */}
            {[...lines.entries()].map(([key, owner]) => {
              const [kind, rStr, cStr] = key.split('-');
              const r = Number(rStr);
              const c = Number(cStr);
              const x1 = PAD + c * CELL;
              const y1 = PAD + r * CELL;
              const x2 = kind === 'h' ? PAD + (c + 1) * CELL : PAD + c * CELL;
              const y2 = kind === 'h' ? PAD + r * CELL : PAD + (r + 1) * CELL;
              return (
                <line
                  key={`line-${key}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={playerColor(owner)}
                  strokeWidth={9}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Dots */}
            {Array.from({ length: boxCount + 1 }, (_, r) =>
              Array.from({ length: boxCount + 1 }, (_, c) => (
                <circle
                  key={`dot-${r}-${c}`}
                  cx={PAD + c * CELL}
                  cy={PAD + r * CELL}
                  r={7}
                  fill="#374151"
                />
              )),
            )}

            {/* Clickable / hoverable line hit areas */}
            {Array.from({ length: boxCount + 1 }, (_, r) =>
              Array.from({ length: boxCount }, (_, c) => {
                const key = drawKey('h', r, c);
                const taken = lines.has(key);
                return (
                  <line
                    key={`hit-${key}`}
                    x1={PAD + c * CELL + 6}
                    y1={PAD + r * CELL}
                    x2={PAD + (c + 1) * CELL - 6}
                    y2={PAD + r * CELL}
                    stroke="transparent"
                    strokeWidth={26}
                    strokeLinecap="round"
                    className={taken || pending ? '' : 'cursor-pointer hover:stroke-gray-400/60'}
                    onClick={() => handleLineClick(key)}
                  />
                );
              }),
            )}
            {Array.from({ length: boxCount }, (_, r) =>
              Array.from({ length: boxCount + 1 }, (_, c) => {
                const key = drawKey('v', r, c);
                const taken = lines.has(key);
                return (
                  <line
                    key={`hit-${key}`}
                    x1={PAD + c * CELL}
                    y1={PAD + r * CELL + 6}
                    x2={PAD + c * CELL}
                    y2={PAD + (r + 1) * CELL - 6}
                    stroke="transparent"
                    strokeWidth={26}
                    strokeLinecap="round"
                    className={taken || pending ? '' : 'cursor-pointer hover:stroke-gray-400/60'}
                    onClick={() => handleLineClick(key)}
                  />
                );
              }),
            )}
          </svg>
      {/* Compact practice card anchored directly over the line just drawn */}
      {pending && (() => {
        const scale = boardPx / size;
        const [kind, rStr, cStr] = pending.key.split('-');
        const r = Number(rStr);
        const c = Number(cStr);
        const mx = (kind === 'h' ? PAD + (c + 0.5) * CELL : PAD + c * CELL) * scale;
        const my = (kind === 'h' ? PAD + r * CELL : PAD + (r + 0.5) * CELL) * scale;
        const POP_W = 200;
        const POP_H = 260;
        const left = Math.min(Math.max(mx - POP_W / 2, 4), boardPx - POP_W - 4);
        const top = Math.min(Math.max(my - POP_H / 2, 4), boardPx - POP_H - 4);
        return (
          <div
            className="absolute z-40 w-[200px] bg-white rounded-xl shadow-2xl ring-2 ring-white overflow-hidden flex flex-col"
            style={{ left, top, height: POP_H }}
          >
            <button
              onClick={undoPending}
              className="absolute top-1 left-1 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow transition-colors active:scale-95"
              title="Back — undo this move"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeCard}
              className="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow transition-colors active:scale-95"
              title="X — finish the turn without scoring"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 min-h-0 pt-7">
              {pending.card.source && (
                <FlashcardImage
                  word={pending.card.word}
                  category={categoryForSource(pending.card.source)}
                  subId={pending.card.source.subId}
                  groupId={pending.card.source.groupId}
                />
              )}
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1 px-1.5 pb-1.5">
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight max-w-full truncate">
                {formatWordDisplay(pending.card.word, pending.card.source?.categoryId, pending.card.source?.subId)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={scoreCorrect}
                  className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                  title="Correct"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={scoreTry}
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                  title="Try again"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

          {/* Win banner, shown on the side so the board stays visible */}
          {gameOver && (
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-52">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 text-center">
                <Trophy
                  className="w-9 h-9 mx-auto mb-2"
                  style={{ color: winner !== null ? playerColor(winner) : '#f59e0b' }}
                />
                <h3 className="text-lg font-black text-gray-900 mb-0.5">
                  {winner !== null ? `${playerName(winner)} wins!` : "It's a tie!"}
                </h3>
                <p className="text-[11px] text-gray-500 mb-4">
                  {scores[0]} – {scores[1]} boxes
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setLines(new Map());
                      setBoxes(new Map());
                      setTurn(firstPlayer);
                      setDeck([...targets].sort(() => Math.random() - 0.5));
                      setDeckIndex(0);
                      setCorrectCount(0);
                      setTryCount(0);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold text-xs hover:bg-gray-800 transition-colors"
                  >
                    Play again
                  </button>
                  <button
                    onClick={resetToStep1}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-colors"
                  >
                    New setup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar: restart + X at the top, counters at the bottom */}      <aside className="shrink-0 flex flex-col p-2 bg-transparent w-fit">
        <div className="flex items-center justify-center gap-2 shrink-0">
          <button
            onClick={resetToStep1}
            className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors active:scale-95"
            title="Start over (new setup)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors active:scale-95"
            title="Exit game"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1" />
      </aside>

      {/* Floating dockable data pill */}
      <DataPillWidget
        correct={correctCount}
        tries={tryCount}
        dockedLeft={pillLeft}
        onToggleSide={() => setPillLeft((p) => !p)}
        visible={showData}
        onToggleVisible={() => setShowData((v) => !v)}
      />

    </div>
  );
}

type PlayerSetupCardProps = {
  index: Owner;
  config: PlayerConfig;
  otherColor: string;
  isFirst: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onMakeFirst: () => void;
};

function PlayerSetupCard({ index, config, otherColor, isFirst, onNameChange, onColorChange, onMakeFirst }: PlayerSetupCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all ${isFirst ? 'shadow-md' : 'border-gray-200'}`}
      style={isFirst ? { borderColor: config.color } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Player {index + 1}
        </span>
        <button
          onClick={onMakeFirst}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
            isFirst
              ? 'bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
          }`}
          title={isFirst ? 'Goes first' : 'Tap to make this player go first'}
        >
          <CrownIcon className="w-3.5 h-3.5" />
          {isFirst ? 'First' : 'Make first'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="w-11 h-11 rounded-full shrink-0 border-2 border-white shadow ring-1 ring-gray-200 transition-transform hover:scale-105"
          style={{ backgroundColor: config.color }}
          title="Tap to change color"
        />
        <input
          type="text"
          value={config.name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder={`Player ${index + 1}`}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 text-base font-semibold text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {pickerOpen && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="grid grid-cols-8 gap-2">
            {SWATCHES.map((swatch) => {
              const takenByOther = swatch.hex === otherColor;
              const active = config.color === swatch.hex;
              return (
                <button
                  key={swatch.name}
                  onClick={() => {
                    if (takenByOther) return;
                    onColorChange(swatch.hex);
                    setPickerOpen(false);
                  }}
                  disabled={takenByOther}
                  className={`w-8 h-8 rounded-full transition-all ${
                    takenByOther
                      ? 'opacity-25 cursor-not-allowed'
                      : active
                        ? 'ring-2 ring-offset-2 ring-gray-800 scale-110'
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

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2 8l4 4 4-6 4 6 4-4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8z" />
    </svg>
  );
}
