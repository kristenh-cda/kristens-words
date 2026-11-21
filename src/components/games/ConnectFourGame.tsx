import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Sparkles, Dices, Trophy, ChevronLeft, Minus } from 'lucide-react';
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
import { isSelectableCategory } from '@/components/pickerGroups';
import { r2ImagePaths, applyRememberedStage } from '@/lib/images';
import { FlashcardImage } from '@/components/FlashcardImage';
import { formatWordDisplay } from '@/lib/formatters';
import { MixedModePicker } from '@/components/MixedModePicker';
import { DataPillWidget } from '@/components/DataPillWidget';

type Props = {
  mode: Mode;
  onClose: () => void;
};

const COLS = 7;
const ROWS = 6;
const WORDS_MAX = COLS * ROWS; // 42

type Step = 1 | 2;
type Player = 'red' | 'black';

type Cell = {
  word: string;
  source: SelectableSource | null;
  owner: Player | null;
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

function findWinningLine(owners: (Player | null)[]): Player | null {
  const at = (r: number, c: number) => owners[r * COLS + c];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = at(r, c);
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        while (count < 4) {
          const nr = r + dr * count;
          const nc = c + dc * count;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
          if (at(nr, nc) !== p) break;
          count++;
        }
        if (count >= 4) return p;
      }
    }
  }
  return null;
}

export function ConnectFourGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Wizard state
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // Game state
  const [cells, setCells] = useState<Cell[]>([]);
  const [turn, setTurn] = useState<Player>('red');
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);
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

  const toggleSource = (key: string) => {
    setSelectedSourceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // MixedModePicker hands back the full word pool and its sources.
  const handleDeckSelected = useCallback((words: string[], sources: SelectableSource[]) => {
    const byWord = new Map<string, SelectableSource>();
    for (const s of sources) {
      for (const w of s.words) {
        if (!byWord.has(w.toLowerCase())) byWord.set(w.toLowerCase(), s);
      }
    }
    setSelectedSourceKeys(new Set(sources.map((s) => sourceKey(s))));
    setPickedWords(new Set(words.map((w) => {
      const source = byWord.get(w.toLowerCase());
      return source ? `${source.subId}-${source.groupId ?? ''}-${w}` : w;
    }))); 
    setStep(2);
  }, []);

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < WORDS_MAX) next.add(word);
      return next;
    });
  };

  const randomPick = () => {
    const shuffled = [...poolWords].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, WORDS_MAX).map((p) => p.word);
    setPickedWords(new Set(picks));
  };

  const startGame = useCallback(() => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word));
    if (picked.length === 0) return;
    const shuffled = [...picked].sort(() => Math.random() - 0.5);
    const out: Cell[] = [];
    for (let i = 0; i < WORDS_MAX; i++) {
      const p = shuffled[i % shuffled.length];
      out.push({ word: p.word, source: p.source, owner: null });
    }
    setCells(out);
    setTurn('red');
    setOverlayIndex(null);
    setCorrectCount(0);
    setTryCount(0);
  }, [poolWords, pickedWords]);

  const startGameWithoutWords = useCallback(() => {
    const out: Cell[] = Array.from({ length: WORDS_MAX }, () => ({ word: '', source: null, owner: null }));
    setCells(out);
    setTurn('red');
    setOverlayIndex(null);
    setCorrectCount(0);
    setTryCount(0);
    setStep(2);
  }, []);

  // Overlay evaluation: records the score and dismisses the card (drops the token)
  const evaluate = (kind: 'correct' | 'try') => {
    if (kind === 'correct') setCorrectCount((n) => n + 1);
    else setTryCount((n) => n + 1);
    closeOverlayAndDrop();
  };

  // Lowest empty row in a column, or -1 when the column is full
  const landingRow = (grid: Cell[], col: number): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r * COLS + col].owner === null) return r;
    }
    return -1;
  };

  const openColumn = (col: number) => {
    if (gameComplete) return;
    const row = landingRow(cells, col);
    if (row === -1) return;
    const cell = cells[row * COLS + col];
    // Empty game (no target words): drop straight away without the flashcard
    if (!cell.word) {
      setCells((prev) =>
        prev.map((c, i) => (i === row * COLS + col && c.owner === null ? { ...c, owner: turn } : c)),
      );
      setTurn((t) => (t === 'red' ? 'black' : 'red'));
      return;
    }
    setOverlayIndex(row * COLS + col);
  };

  const closeOverlayAndDrop = () => {
    if (overlayIndex === null) return;
    const idx = overlayIndex;
    setOverlayIndex(null);
    setCells((prev) =>
      prev.map((c, i) => (i === idx && c.owner === null ? { ...c, owner: turn } : c)),
    );
    setTurn((t) => (t === 'red' ? 'black' : 'red'));
  };

  const winner = useMemo(() => findWinningLine(cells.map((c) => c.owner)), [cells]);
  const isDraw = !winner && cells.length > 0 && cells.every((c) => c.owner !== null);
  const gameComplete = winner !== null || isDraw;

  const playAgain = () => {
    // Same card set, board reset — scores also reset per game
    setCells((prev) => prev.map((c) => ({ ...c, owner: null })));
    setTurn('red');
    setOverlayIndex(null);
    setCorrectCount(0);
    setTryCount(0);
  };

  const newGame = () => {
    setStep(1);
    setCells([]);
    setTurn('red');
    setOverlayIndex(null);
    setPickedWords(new Set());
  };

  // Board sizing — hooks must run on every render (wizard or game)
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(64);
  const boardGap = 6;

  useLayoutEffect(() => {
    if (cells.length === 0) return;
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const size = Math.floor(
        Math.min(
          (w - boardGap * (COLS - 1)) / COLS,
          (h - boardGap * (ROWS - 1)) / ROWS,
        ),
      );
      setCellSize(Math.max(36, size));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cells.length]);

  const overlayCell = overlayIndex !== null ? cells[overlayIndex] : null;
  const overlayPlayer: Player = turn;

  // ============================== SETUP WIZARD ==============================

  // Step 1: sound/position selection via the shared mixed-practice picker
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50">
        <MixedModePicker
          mode={mode}
          heading="Connect 4"
          subheading="Select the sounds and positions for your Connect 4 game."
          startLabel="Next"
          secondaryAction={{ label: 'Play without target words', onClick: startGameWithoutWords }}
          onStart={handleDeckSelected}
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
              <h2 className="text-lg font-bold text-gray-900">Connect 4</h2>
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
                  Pick up to {WORDS_MAX} words <span className="font-normal text-gray-400">({pickedWords.size} selected — words repeat to fill the grid)</span>
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
                  disabled={pickedWords.size === 0}
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
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${turn === 'red' ? 'bg-gradient-to-b from-red-200 to-red-300' : 'bg-gradient-to-b from-gray-300 to-gray-400'}`}>
      {/* Top bar: turn indicator + exit (above the end-of-game dimmer) */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 relative z-30">
        <div className="flex items-center gap-2 bg-white rounded-full shadow-sm border border-gray-200 pl-2 pr-4 py-1.5">
          <span
            className={`w-7 h-7 rounded-full shadow-inner transition-all ${
              turn === 'red'
                ? 'bg-red-500 ring-2 ring-red-300 animate-pulse'
                : 'bg-gray-900 ring-2 ring-gray-400 animate-pulse'
            }`}
          />
          <span className="text-sm font-semibold text-gray-700">
            {turn === 'red' ? "Red's turn" : "Black's turn"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors"
          title="Exit game"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Board */}
      <div ref={boardRef} className="flex-1 min-h-0 flex items-center justify-center px-3 pb-3">
        <div
          className="bg-indigo-600 rounded-2xl p-2 shadow-xl"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`, gap: `${boardGap}px` }}
        >
          {cells.map((cell, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const isLanding = landingRow(cells, col) === row;
            return (
              <button
                key={i}
                onClick={() => openColumn(col)}
                disabled={gameComplete || !isLanding}
                className={`rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none ${
                  cell.owner === null
                    ? 'bg-white'
                    : cell.owner === 'red'
                      ? 'bg-red-500 shadow-inner'
                      : 'bg-gray-900 shadow-inner'
                } ${
                  isLanding && !gameComplete
                    ? 'ring-2 ring-amber-300 hover:scale-[1.06] cursor-pointer'
                    : 'cursor-default disabled:pointer-events-none'
                }`}
                style={{ width: cellSize, height: cellSize }}
              >
                {cell.owner === null && isLanding && !gameComplete && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data tracking bottom-right (dockable) */}
      <DataPillWidget
        correct={correctCount}
        tries={tryCount}
        dockedLeft={pillLeft}
        onToggleSide={() => setPillLeft((p) => !p)}
        visible={showData}
        onToggleVisible={() => setShowData((v) => !v)}
      />

      {/* End-of-game dimmer (clicks pass through; interactive controls sit above) */}
      {gameComplete && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      {/* Victory / draw banner, shown to the side so the board stays visible */}
      {gameComplete && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-52">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 text-center">
            <Trophy className="w-9 h-9 text-amber-500 mx-auto mb-2" />
            <h3 className="text-lg font-black text-gray-900 mb-0.5">
              {winner === 'red' ? 'Red wins!' : winner === 'black' ? 'Black wins!' : "It's a draw!"}
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">
              {winner ? 'Four in a row' : 'All slots filled'}
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={playAgain}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold text-xs hover:bg-gray-800 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen flashcard overlay for the drop slot */}
      {overlayCell && overlayCell.word && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="flex-1 min-h-0 aspect-square max-h-[60vh]">
              <FlashcardImage
                word={overlayCell.word}
                category={categoryForSource(overlayCell.source!)}
                subId={overlayCell.source!.subId}
                groupId={overlayCell.source!.groupId}
              />
            </div>
            <div className="shrink-0 text-center px-4 py-2 border-t border-gray-100">
              <span className="text-base font-medium text-gray-800">
                {formatWordDisplay(overlayCell.word, overlayCell.source!.categoryId, overlayCell.source!.subId)}
              </span>
            </div>

            {/* Evaluation controls: repeatable during practice */}
            <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => evaluate('correct')}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Correct"
              >
                <Check className="w-6 h-6" />
              </button>
              <button
                onClick={() => evaluate('try')}
                className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Try again"
              >
                <Minus className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom-right X: close the card and drop this player's token */}
            <button
              onClick={closeOverlayAndDrop}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close card and drop your piece"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
