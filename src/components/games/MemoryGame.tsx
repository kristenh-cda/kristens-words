import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Sparkles, Dices, Trophy, ChevronLeft } from 'lucide-react';
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

const CONFETTI_COLORS = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#facc15'];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  size: number;
};

function ConfettiBurst({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: '2px',
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

type Props = {
  mode: Mode;
  onClose: () => void;
};

const CARD_COUNT_OPTIONS = [6, 12, 16, 20] as const;
const CARD_BACK_URL = 'https://pub-c53fff4920214dd59d4a14590b17acae.r2.dev/seasonal/memory.jpg';

type GameCard = {
  id: number;
  word: string;
  pairId: number;
  source: SelectableSource;
};

type Step = 1 | 2 | 3;

function gridColsFor(total: number): number {
  if (total <= 6) return 3;
  if (total <= 12) return 4;
  if (total <= 16) return 4;
  return 5;
}

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

export function MemoryGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Wizard state
  const [cardTotal, setCardTotal] = useState<number>(12);
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // Game state
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);

  const sources = useMemo(
    () => allSelectableSources(mode).filter((s) => isSelectableCategory(s.categoryId)),
    [mode],
  );
  const pairsNeeded = cardTotal / 2;
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

  // Prefetch all pool images when entering step 3 so previews load fast
  useEffect(() => {
    if (step !== 3) return;
    const urls = poolWords.map(({ word, source }) => resolveWordImageUrl(word, source));
    urls.forEach((url) => {
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
      else if (next.size < pairsNeeded) next.add(word);
      return next;
    });
  };

  const randomPick = () => {
    const shuffled = [...poolWords].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, pairsNeeded).map((p) => p.word);
    setPickedWords(new Set(picks));
  };

  const startGame = useCallback(() => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word)).slice(0, pairsNeeded);
    if (picked.length < pairsNeeded) return;
    const flat: GameCard[] = [];
    picked.forEach((p, i) => {
      flat.push({ id: i * 2, word: p.word, pairId: i, source: p.source });
      flat.push({ id: i * 2 + 1, word: p.word, pairId: i, source: p.source });
    });
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    setCards(flat);
    setFlipped([]);
    setMatched(new Set());
    setLocked(false);
  }, [poolWords, pickedWords, pairsNeeded]);

  const handleCardClick = (card: GameCard) => {
    if (matched.has(card.id)) return;

    if (locked) {
      // Two mismatched cards are face-up: clicking either flips both back down.
      // No new card can be flipped until the pair is face-down again.
      if (flipped.includes(card.id)) {
        setFlipped([]);
        setLocked(false);
      }
      return;
    }

    if (flipped.includes(card.id)) return;

    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const a = cards.find((c) => c.id === nextFlipped[0]);
      const b = cards.find((c) => c.id === nextFlipped[1]);
      if (a && b && a.pairId === b.pairId) {
        setMatched((prev) => new Set(prev).add(a.id).add(b.id));
        setFlipped([]);
      } else {
        setLocked(true);
      }
    }
  };

  const gameComplete = cards.length > 0 && matched.size === cards.length;
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fire confetti when the game completes, then auto-dismiss after 4s.
  useEffect(() => {
    if (!gameComplete) return;
    const pieces: ConfettiPiece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.5 + Math.random() * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 8,
    }));
    setConfettiPieces(pieces);
    setShowConfetti(true);
    const t = window.setTimeout(() => setShowConfetti(false), 4000);
    return () => window.clearTimeout(t);
  }, [gameComplete]);

  const playAgain = () => {
    // Same deck, same layout: only reset reveal state
    setMatched(new Set());
    setFlipped([]);
    setLocked(false);
    setCorrectCount(0);
    setTryCount(0);
  };

  const newGame = () => {
    setStep(1);
    setCards([]);
    setMatched(new Set());
    setFlipped([]);
    setLocked(false);
    setPickedWords(new Set());
    setCorrectCount(0);
    setTryCount(0);
  };

  // Board sizing — hooks must run on every render (wizard or game), so they
  // live above the wizard's early return below.
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(96);
  const [boardAvailableWidth, setBoardAvailableWidth] = useState(0);
  const boardGap = 8;
  const preferredCols = gridColsFor(cards.length);
  const fittingCols = boardAvailableWidth > 0
    ? Math.max(1, Math.floor((boardAvailableWidth + boardGap) / (44 + boardGap)))
    : preferredCols;
  const boardCols = Math.min(preferredCols, fittingCols);
  const boardRows = Math.ceil(cards.length / boardCols);

  const dataWidget = (
    <DataPillWidget
      correct={correctCount}
      tries={tryCount}
      dockedLeft={pillLeft}
      onToggleSide={() => setPillLeft((side) => !side)}
      visible={showData}
      onToggleVisible={() => setShowData((visible) => !visible)}
      showScoreButtons
      onCorrect={() => setCorrectCount((n) => n + 1)}
      onTryAgain={() => setTryCount((n) => n + 1)}
      sidebar
    />
  );

  useLayoutEffect(() => {
    if (cards.length === 0) return;
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(0, el.clientWidth - 32);
      const h = Math.max(0, el.clientHeight - 32);
      setBoardAvailableWidth(w);
      const size = Math.floor(
        Math.min(
          (w - boardGap * (boardCols - 1)) / boardCols,
          (h - boardGap * (boardRows - 1)) / boardRows,
        ),
      );
      setCellSize(Math.max(44, size));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cards.length, boardCols, boardRows]);

  // ============================== SETUP WIZARD ==============================

  // Step 2: sound/position selection via the shared mixed-practice picker
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50">
        <MixedModePicker
          mode={mode}
          heading="Memory Matching Game"
          subheading="Select the sounds and positions for your memory game."
          startLabel="Next"
          onStart={(_words, srcs) => {
            setSelectedSourceKeys(new Set(srcs.map((s) => sourceKey(s))));
            setStep(3);
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Memory Matching Game</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: Card count */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">How many cards?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CARD_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCardTotal(n)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      cardTotal === n
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl font-black">{n}</div>
                    <div className="text-xs opacity-70">{n / 2} pairs</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Word selection with preview */}
          {step === 3 && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick {pairsNeeded} words <span className="font-normal text-gray-400">({pickedWords.size}/{pairsNeeded} selected)</span>
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
              {[1, 2, 3].map((s) => (
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
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <span className="text-sm text-gray-500">
                  {cardTotal} cards · {cardTotal / 2} pairs
                </span>
              )}
              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                  Next
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={startGame}
                  disabled={pickedWords.size !== pairsNeeded}
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
    <div className="fixed inset-0 z-50 flex bg-gray-400">
      <aside className="flex w-16 shrink-0 flex-col items-center border-0 bg-transparent px-1 py-3">
        <div className="mt-auto">
          {pillLeft && dataWidget}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div ref={boardRef} className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${boardCols}, ${cellSize}px)`,
              gridAutoRows: `${cellSize}px`,
              gap: `${boardGap}px`,
            }}
          >
            {cards.map((card) => {
              const isUp = flipped.includes(card.id) || matched.has(card.id);
              const isMatched = matched.has(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`relative w-full h-full rounded-xl overflow-hidden shadow-md transition-all duration-300 select-none focus:outline-none ${
                    isMatched ? 'ring-4 ring-green-400' : ''
                  } ${!isUp && locked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03]'}`}
                >
                  {isUp ? (
                    <div className="absolute inset-0 bg-white flex flex-col">
                      <div className="flex-1 min-h-0">
                        <FlashcardImage
                          word={card.word}
                          category={categoryForSource(card.source)}
                          subId={card.source.subId}
                          groupId={card.source.groupId}
                        />
                      </div>
                      <div className="shrink-0 px-1 py-1 text-center">
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700 block w-full truncate leading-tight">
                          {formatWordDisplay(card.word, card.source.categoryId, card.source.subId)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-white">
                      <img
                        src={CARD_BACK_URL}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Completion bar stays beside the controls without covering the cards. */}
        {gameComplete && (
          <div className="shrink-0 relative z-20 bg-green-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 shrink-0" />
              <span className="font-bold text-sm sm:text-base">Great job! You matched all {pairsNeeded} pairs!</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={playAgain}
                className="px-4 py-1.5 rounded-lg bg-white text-green-600 font-semibold text-xs sm:text-sm hover:bg-green-50 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={newGame}
                className="px-4 py-1.5 rounded-lg bg-green-700 text-white font-semibold text-xs sm:text-sm hover:bg-green-800 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </main>

      <aside className="flex w-16 shrink-0 flex-col items-center gap-3 border-0 bg-transparent px-1 py-3">
        <button
          onClick={onClose}
          aria-label="Exit game"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          title="Exit game"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mt-auto">
          {!pillLeft && dataWidget}
        </div>
      </aside>

      {showConfetti && <ConfettiBurst pieces={confettiPieces} />}
    </div>
  );
}
