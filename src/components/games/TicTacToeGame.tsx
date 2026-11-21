import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Sparkles, Dices, Trophy, ChevronLeft, Minus, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  allSelectableSources,
  sourceKey,
  findCategory,
  findSubcategory,
  categories,
  languageCategories,
  type SelectableSource,
  type SoundCategory,
  type Mode,
} from '@/data/words';
import { MixedModePicker } from '@/components/MixedModePicker';
import { isSelectableCategory } from '@/components/pickerGroups';
import { r2ImagePaths, applyRememberedStage } from '@/lib/images';
import { FlashcardImage } from '@/components/FlashcardImage';
import { DataPillWidget } from '@/components/DataPillWidget';
import { formatWordDisplay } from '@/lib/formatters';

type Props = {
  mode: Mode;
  onClose: () => void;
};

const WORDS_NEEDED = 9;

type Step = 1 | 2;

type Cell = {
  word: string;
  source: SelectableSource | null;
  owner: 'X' | 'O' | null;
};

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

function resolveWordImageUrl(word: string, source: SelectableSource): string {
  const cat = categoryForSource(source);
  const sub = findSubcategory(cat, source.subId);
  const plan = r2ImagePaths(word, cat, sub, source.groupId);
  const reordered = applyRememberedStage(plan);
  return reordered.find((a) => a.url)?.url ?? plan.firstUrl;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/* White halo so cells and controls stay scannable over the tinted background */
const HALO = 'ring-2 ring-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.12)]';

export function TicTacToeGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Wizard state
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // Game state
  const [cells, setCells] = useState<Cell[]>([]);
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);

  const sources = useMemo(
    () => allSelectableSources(mode).filter((s) => isSelectableCategory(s.categoryId)),
    [mode],
  );
  const chosenSources = useMemo(
    () => sources.filter((s) => selectedSourceKeys.has(sourceKey(s))),
    [sources, selectedSourceKeys],
  );
  const poolWords = useMemo(() => {
    const seen = new Set<string>();
    const out: { word: string; source: SelectableSource }[] = [];
    for (const s of chosenSources) {
      for (const w of s.words) {
        const key = w.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ word: w, source: s });
        }
      }
    }
    return out;
  }, [chosenSources]);

  // Clear picked words whenever the source selection changes
  useEffect(() => {
    setPickedWords(new Set());
  }, [selectedSourceKeys]);

  // Prefetch all pool images when entering step 2 so previews load fast
  useEffect(() => {
    if (step !== 2) return;
    poolWords.forEach(({ word, source }) => {
      const url = resolveWordImageUrl(word, source);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [step, poolWords]);

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < WORDS_NEEDED) next.add(word);
      return next;
    });
  };

  const randomPick = () => {
    const shuffled = [...poolWords].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, WORDS_NEEDED).map((p) => p.word);
    setPickedWords(new Set(picks));
  };

  const startGame = useCallback(() => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word)).slice(0, WORDS_NEEDED);
    if (picked.length < WORDS_NEEDED) return;
    setCells(picked.map((p) => ({ word: p.word, source: p.source, owner: null })));
    setTurn('X');
    setFocusIndex(null);
    setCorrectCount(0);
    setTryCount(0);
  }, [poolWords, pickedWords]);

  const startGameWithoutWords = useCallback(() => {
    setCells(
      Array.from({ length: WORDS_NEEDED }, () => ({ word: '', source: null, owner: null })),
    );
    setTurn('X');
    setFocusIndex(null);
    setCorrectCount(0);
    setTryCount(0);
  }, []);

  // Focused-cell scoring: Check/Dash record the data point and complete the
  // move; the X button completes without recording; Back cancels entirely.
  const resolveFocus = (kind: 'correct' | 'try' | 'dismiss') => {
    if (focusIndex === null) return;
    if (kind === 'correct') setCorrectCount((n) => n + 1);
    if (kind === 'try') setTryCount((n) => n + 1);
    const idx = focusIndex;
    setFocusIndex(null);
    setCells((prev) =>
      prev.map((c, i) => (i === idx && c.owner === null ? { ...c, owner: turn } : c)),
    );
    setTurn((t) => (t === 'X' ? 'O' : 'X'));
  };

  const cancelFocus = () => setFocusIndex(null);

  const recordOnly = (kind: 'correct' | 'try') => {
    if (kind === 'correct') setCorrectCount((n) => n + 1);
    else setTryCount((n) => n + 1);
  };

  const winner = useMemo(() => {
    for (const [a, b, c] of LINES) {
      const owner = cells[a]?.owner;
      if (owner && cells[b]?.owner === owner && cells[c]?.owner === owner) {
        return owner;
      }
    }
    return null;
  }, [cells]);

  const isDraw = !winner && cells.length > 0 && cells.every((c) => c.owner !== null);
  const gameComplete = winner !== null || isDraw;

  const playAgain = () => {
    // Same 9 cards, board reset — scores also reset per game
    setCells((prev) => prev.map((c) => ({ ...c, owner: null })));
    setTurn('X');
    setFocusIndex(null);
    setCorrectCount(0);
    setTryCount(0);
  };

  const newGame = () => {
    setStep(1);
    setCells([]);
    setTurn('X');
    setFocusIndex(null);
    setPickedWords(new Set());
  };

  // Board sizing — hooks must run on every render (wizard or game)
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(96);
  const boardGap = 8;

  useLayoutEffect(() => {
    if (cells.length === 0) return;
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const size = Math.floor(
        Math.min(
          (w - boardGap * 2) / 3,
          (h - boardGap * 2) / 3,
        ),
      );
      setCellSize(Math.max(56, size));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cells.length]);

  const focusCell = focusIndex !== null ? cells[focusIndex] : null;

  // Focused card geometry: an enlarged card anchored over the selected cell,
  // clamped so it never leaves the board area.
  const focusStyle = useMemo<React.CSSProperties | null>(() => {
    if (focusIndex === null || cells.length === 0) return null;
    const col = focusIndex % 3;
    const row = Math.floor(focusIndex / 3);
    const gridW = 3 * cellSize + boardGap * 2;
    const pad = 24;
    const cardSize = cellSize + pad * 2;
    const left = Math.min(Math.max(col * (cellSize + boardGap) - pad, 0), gridW - cardSize);
    const top = Math.min(Math.max(row * (cellSize + boardGap) - pad, 0), gridW - cardSize);
    return { left, top, width: cardSize, height: cardSize };
  }, [focusIndex, cellSize, cells.length]);

  // ============================== SETUP WIZARD ==============================

  // Step 1: sound/position selection via the shared mixed-practice picker
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50">
        <MixedModePicker
          mode={mode}
          heading="Tic Tac Toe"
          subheading="Select the sounds and positions for your tic tac toe game."
          startLabel="Next"
          secondaryAction={{ label: 'Play without target words', onClick: startGameWithoutWords }}
          onStart={(_words, srcs) => {
            setSelectedSourceKeys(new Set(srcs.map((s) => sourceKey(s))));
            setStep(2);
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Tic Tac Toe</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 2: Word selection with preview */}
          {step === 2 && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick 9 words <span className="font-normal text-gray-400">({pickedWords.size}/9 selected)</span>
                </h3>
                <button
                  onClick={randomPick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <Dices className="w-3.5 h-3.5" />
                  Random
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {poolWords.map(({ word, source }) => {
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
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-1.5 mb-3">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-gray-900' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : null}
              {step === 2 && (
                <button
                  onClick={startGame}
                  disabled={pickedWords.size !== WORDS_NEEDED}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${
        turn === 'X' ? 'bg-sky-100' : 'bg-rose-100'
      }`}
    >
      {/* Floating exit button, top right */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-40 w-11 h-11 rounded-full bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors ${HALO}`}
        title="Exit game"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 min-h-0 flex items-center justify-center gap-4 sm:gap-8 px-4 pb-6">
        {/* Left panel: current turn */}
        <div className={`hidden md:flex flex-col gap-3 shrink-0 relative z-10 transition-opacity duration-300 ${focusCell ? 'opacity-40' : ''}`}>
          <div className={`bg-white rounded-2xl px-8 py-6 text-center ${HALO}`}>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Turn</p>
            <span className={`inline-flex w-16 h-16 items-center justify-center rounded-2xl text-4xl font-black animate-pulse ${
              turn === 'X' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {turn}
            </span>
          </div>
        </div>

        {/* Board — margin keeps the floating data box clear of the grid (no border,
            just space as the visual boundary) */}
        <div
          ref={boardRef}
          className={`flex-1 min-h-0 self-stretch flex items-center justify-center transition-all duration-300 ${
            showData && !pillLeft ? 'mr-28 md:mr-32' : ''
          } ${showData && pillLeft ? 'ml-28 md:ml-32' : ''}`}
        >
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(3, ${cellSize}px)`,
              gridAutoRows: `${cellSize}px`,
              gap: `${boardGap}px`,
            }}
          >
          {cells.map((cell, i) => {
            const isFocused = i === focusIndex;
            const dimmed = focusCell !== null && !isFocused;
            return (
              <button
                key={`${cell.word}-${i}`}
                onClick={() => {
                  if (gameComplete || cell.owner !== null || dimmed) return;
                  // Empty game (no target words): place the mark straight away
                  if (!cell.word) {
                    setCells((prev) =>
                      prev.map((c, j) => (j === i && c.owner === null ? { ...c, owner: turn } : c)),
                    );
                    setTurn((t) => (t === 'X' ? 'O' : 'X'));
                    return;
                  }
                  setFocusIndex(i);
                }}
                disabled={gameComplete || dimmed}
                className={`relative w-full h-full rounded-xl overflow-hidden bg-white transition-all duration-300 select-none focus:outline-none ${HALO} ${
                  dimmed ? 'opacity-30' : ''
                } ${
                  cell.owner === null && !gameComplete && !dimmed
                    ? 'cursor-pointer hover:scale-[1.03]'
                    : 'cursor-default'
                }`}
              >
                <div className="absolute inset-0 p-2 sm:p-3">
                  {cell.source && (
                    <FlashcardImage
                      word={cell.word}
                      category={categoryForSource(cell.source)}
                      subId={cell.source.subId}
                      groupId={cell.source.groupId}
                    />
                  )}
                </div>
                {cell.owner !== null && (
                  <span
                    className={`absolute inset-0 flex items-center justify-center backdrop-blur-[1px] ${
                      cell.owner === 'X' ? 'bg-sky-900/40' : 'bg-rose-900/40'
                    }`}
                  >
                    <span
                      className={`text-6xl font-black leading-none drop-shadow ${
                        cell.owner === 'X' ? 'text-sky-300' : 'text-rose-300'
                      }`}
                    >
                      {cell.owner}
                    </span>
                  </span>
                )}
              </button>
            );
          })}

          {/* In-grid focused target: enlarged card over the selected cell */}
          {focusCell && focusCell.word && focusStyle && (
            <div
              className="absolute z-30 flex flex-col bg-white rounded-2xl shadow-2xl ring-4 ring-white overflow-hidden"
              style={focusStyle}
            >
              {/* Top-left: undo — cancels the selection without a move or turn change */}
              <button
                onClick={cancelFocus}
                className="absolute top-1.5 left-1.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow transition-colors active:scale-95"
                title="Back — cancel selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {/* Top-right: dismiss — completes the move without recording */}
              <button
                onClick={() => resolveFocus('dismiss')}
                className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow transition-colors active:scale-95"
                title="Place mark without recording"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-h-0 p-3 pt-9">
                <FlashcardImage
                  word={focusCell.word}
                  category={categoryForSource(focusCell.source!)}
                  subId={focusCell.source!.subId}
                  groupId={focusCell.source!.groupId}
                />
              </div>
              <div className="shrink-0 px-2 pb-2 flex flex-col items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center leading-tight">
                  {formatWordDisplay(focusCell.word, focusCell.source!.categoryId, focusCell.source!.subId)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resolveFocus('correct')}
                    className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow-md transition-all"
                    title="Correct — record and place your piece"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => resolveFocus('try')}
                    className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-md transition-all"
                    title="Try again — record and place your piece"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Floating dockable data pill (buttons live on the flashcard) */}
      <DataPillWidget
        correct={correctCount}
        tries={tryCount}
        dockedLeft={pillLeft}
        onToggleSide={() => setPillLeft((p) => !p)}
        visible={showData}
        onToggleVisible={() => setShowData((v) => !v)}
      />

      {gameComplete && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className={`max-h-full w-full max-w-xs overflow-y-auto rounded-xl bg-white p-5 text-center ${HALO}`}>
            <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-500" />
            <h3 className="mb-1 text-base font-black text-gray-900">
              {winner ? `Player ${winner} wins!` : "It's a draw!"}
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              {winner ? 'Three in a row' : 'All squares filled'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={playAgain}
                className="min-h-11 w-full rounded-lg bg-gray-900 px-4 py-2 font-semibold text-sm text-white hover:bg-gray-800 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="min-h-11 w-full rounded-lg bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
