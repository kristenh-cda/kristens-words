import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Check,
  Sparkles,
  ChevronLeft,
  Minus,
  Trophy,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
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
import { groupSourcesForPicker, toggleableKeysForCategory, isSelectableCategory, type PickerCategoryGroup } from '@/components/pickerGroups';
import { FlashcardImage } from '@/components/FlashcardImage';
import { formatWordDisplay } from '@/lib/formatters';
import { MixedModePicker } from '@/components/MixedModePicker';
import { DataPillWidget } from '@/components/DataPillWidget';

type Props = {
  mode: Mode;
  onClose: () => void;
};

type Step = 1 | 2;

const DIE = { label: 'd6', sides: 6, color: '#38bdf8' };
const MAX_DIE_SIZE = 900;

function getDieSize() {
  const availableHeight = Math.max(120, (window.innerHeight - 150) * 0.9);
  return Math.floor(Math.max(120, Math.min(window.innerWidth * 0.92, availableHeight, MAX_DIE_SIZE)));
}

const CARD_COUNTS = [0, 1, 2, 3, 4, 5, 6];

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

type FaceOrientation = { x: number; y: number };

const FACE_ORIENTATIONS: Record<number, FaceOrientation> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: -90 },
  6: { x: 0, y: 180 },
};

function pipLayout(n: number): { x: number; y: number }[] {
  switch (n) {
    case 1:
      return [{ x: 50, y: 50 }];
    case 2:
      return [{ x: 28, y: 28 }, { x: 72, y: 72 }];
    case 3:
      return [{ x: 26, y: 26 }, { x: 50, y: 50 }, { x: 74, y: 74 }];
    case 4:
      return [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }];
    case 5:
      return [{ x: 26, y: 26 }, { x: 74, y: 26 }, { x: 50, y: 50 }, { x: 26, y: 74 }, { x: 74, y: 74 }];
    default:
      return [
        { x: 26, y: 24 },
        { x: 74, y: 24 },
        { x: 26, y: 50 },
        { x: 74, y: 50 },
        { x: 26, y: 76 },
        { x: 74, y: 76 },
      ];
  }
}

type DieProps = {
  die: { label: string; sides: number; color: string };
  rolling: boolean;
  rolled: number | null;
  size?: number;
};

/** Animated 3D die: a CSS cube that tumbles while rolling and settles on a face. */
function Die3D({ die, rolling, rolled, size = 150 }: DieProps) {
  const [rot, setRot] = useState<FaceOrientation>({ x: -20, y: -30 });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (rolling) {
      intervalRef.current = window.setInterval(() => {
        setRot((prev) => ({
          x: prev.x + 18 + Math.random() * 14,
          y: prev.y + 24 + Math.random() * 16,
        }));
      }, 60);
      return () => {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      };
    }
    // Settle: show a real cube face for values 1-6, otherwise an angled rest pose.
    if (rolled !== null && FACE_ORIENTATIONS[rolled]) {
      setRot(FACE_ORIENTATIONS[rolled]);
    } else {
      setRot({ x: -20, y: -30 });
    }
  }, [rolling, rolled]);

  const half = size / 2;
  const faceNumbers = [1, 2, 3, 4, 5, 6];

  const faceStyle = (transform: string): React.CSSProperties => ({
    position: 'absolute',
    width: size,
    height: size,
    transform,
    backfaceVisibility: 'hidden',
    background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 55%, #e2e8f0 100%)',
    border: '3px solid #94a3b8',
    borderRadius: Math.round(size * 0.14),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 18px rgba(0,0,0,0.08)',
  });

  const faceContent = (n: number) => {
    return (
      <svg viewBox="0 0 100 100" width={size * 0.8} height={size * 0.8}>
        {pipLayout(n).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={9} fill="#1e293b" />
        ))}
      </svg>
    );
  };

  return (
    <div style={{ perspective: size * 5 }}>
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: rolling ? 'none' : 'transform 700ms cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        }}
      >
        <div style={faceStyle(`translateZ(${half}px)`)}>{faceContent(faceNumbers[0])}</div>
        <div style={faceStyle(`rotateY(180deg) translateZ(${half}px)`)}>{faceContent(faceNumbers[5])}</div>
        <div style={faceStyle(`rotateY(90deg) translateZ(${half}px)`)}>{faceContent(faceNumbers[4])}</div>
        <div style={faceStyle(`rotateY(-90deg) translateZ(${half}px)`)}>{faceContent(faceNumbers[1])}</div>
        <div style={faceStyle(`rotateX(90deg) translateZ(${half}px)`)}>{faceContent(faceNumbers[2])}</div>
        <div style={faceStyle(`rotateX(-90deg) translateZ(${half}px)`)}>{faceContent(faceNumbers[3])}</div>
      </div>
    </div>
  );
}

export function DiceGame({ mode, onClose }: Props) {
  const [dieSize, setDieSize] = useState(getDieSize);

  useEffect(() => {
    const handleResize = () => setDieSize(getDieSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [maxCards, setMaxCards] = useState<number>(1);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // Game state
  const [targets, setTargets] = useState<{ word: string; source: SelectableSource }[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'reveal' | 'single-card' | 'multi-cards'>('idle');
  const [singleCard, setSingleCard] = useState<{ word: string; source: SelectableSource } | null>(null);
  const [multiCards, setMultiCards] = useState<{ word: string; source: SelectableSource }[]>([]);
  const [cardScores, setCardScores] = useState<(0 | 1 | null)[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);
  const [noTargetMode, setNoTargetMode] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const pendingValueRef = useRef<number | null>(null);

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

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => clearTimeouts, []);

  const toggleSource = (key: string) => {
    setSelectedSourceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (group: PickerCategoryGroup) => {
    const catKeys = toggleableKeysForCategory(group);
    const allSelected = catKeys.every((k) => selectedSourceKeys.has(k));
    setSelectedSourceKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        catKeys.forEach((k) => next.delete(k));
      } else {
        catKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  // MixedModePicker hands back the full word pool and its sources.
  const handleDeckSelected = useCallback((words: string[], sources: SelectableSource[]) => {
    setSelectedSourceKeys(new Set(sources.map((s) => sourceKey(s))));
    setPickedWords(new Set(words.map((w) => w.toLowerCase())));
    setStep(2);
  }, []);

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const selectAllWords = () => setPickedWords(new Set(poolWords.map((p) => p.word)));

  const beginGame = useCallback(() => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word.toLowerCase()));
    if (picked.length === 0) return;
    setTargets(picked);
    setRolled(null);
    setPhase('idle');
    setSingleCard(null);
    setMultiCards([]);
    setCorrectCount(0);
    setTryCount(0);
  }, [poolWords, pickedWords]);

  const beginGameWithoutWords = useCallback(() => {
    // No-target mode: the die rolls and reveals numbers only — no cards
    setNoTargetMode(true);
    setTargets([]);
    setMaxCards(0);
    setRolled(null);
    setPhase('idle');
    setSingleCard(null);
    setMultiCards([]);
    setCorrectCount(0);
    setTryCount(0);
  }, []);

  const drawCards = (n: number) => {
    if (targets.length === 0) return [];
    const shuffled = [...targets].sort(() => Math.random() - 0.5);
    return Array.from({ length: n }, (_, i) => shuffled[i % shuffled.length]);
  };

  const roll = () => {
    if (rolling || phase === 'single-card' || phase === 'multi-cards') return;
    const value = 1 + Math.floor(Math.random() * DIE.sides);

    // No-target mode or "cards per roll = 0": just roll and reveal
    if (maxCards === 0) {
      setRolling(true);
      setRolled(null);
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setRolling(false);
          setRolled(value);
          setPhase('reveal');
        }, 2000),
      );
      return;
    }

    if (maxCards === 1) {
      setRolling(true);
      setRolled(null);
      timeoutsRef.current.push(
        window.setTimeout(() => {
          // Pause the roll mid-air and pop up one full-screen flashcard.
          setRolling(false);
          pendingValueRef.current = value;
          setSingleCard(drawCards(1)[0] ?? null);
          setPhase('single-card');
        }, 500),
      );
      return;
    }

    // maxCards >= 2: roll, freeze on the number, then show N cards.
    setRolling(true);
    setRolled(null);
    timeoutsRef.current.push(
      window.setTimeout(() => {
        setRolling(false);
        setRolled(value);
        setPhase('reveal');
        timeoutsRef.current.push(
          window.setTimeout(() => {
            const n = Math.min(value, maxCards);
            setMultiCards(drawCards(n));
            setCardScores(Array(n).fill(null));
            setPhase('multi-cards');
          }, 1000),
        );
      }, 500),
    );
  };

  const evaluate = (kind: 'correct' | 'try') => {
    if (kind === 'correct') setCorrectCount((n) => n + 1);
    else setTryCount((n) => n + 1);
  };

  const closeSingleCard = () => {
    if (!pendingValueRef.current) return;
    setSingleCard(null);
    setRolled(pendingValueRef.current);
    pendingValueRef.current = null;
    setPhase('reveal');
  };

  const scoreMultiCard = (index: number, kind: 'correct' | 'try') => {
    evaluate(kind);
    setCardScores((prev) => prev.map((s, i) => (i === index ? (kind === 'correct' ? 1 : 0) : s)));
  };

  // Multi-card: scoring dismisses that card; closing the last one returns to the die
  const removeMultiCard = (index: number) => {
    setMultiCards((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setCardScores([]);
        setPhase('idle');
      } else {
        setCardScores((scores) => scores.filter((_, i) => i !== index));
      }
      return next;
    });
  };

  const resetToStep1 = () => {
    clearTimeouts();
    setRolling(false);
    setRolled(null);
    setPhase('idle');
    setSingleCard(null);
    setMultiCards([]);
    setPickedWords(new Set());
    setTargets([]);
    setNoTargetMode(false);
    setStep(1);
  };

  // ============================== SETUP WIZARD ==============================

  // Step 1: sound/position selection via the shared mixed-practice picker
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50">
        <MixedModePicker
          mode={mode}
          heading="Dice"
          subheading="Select the sounds and positions for your dice game."
          startLabel="Next"
          secondaryAction={{ label: 'Play without target words', onClick: beginGameWithoutWords }}
          onStart={handleDeckSelected}
          onClose={onClose}
        />
      </div>
    );
  }

  const inSetup = targets.length === 0 && !noTargetMode;

  if (inSetup) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Dice</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 2: Word selection + cards per roll */}
          {step === 2 && (
            <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick target words <span className="font-normal text-gray-400">({pickedWords.size} selected)</span>
                </h3>
                <button
                  onClick={selectAllWords}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold hover:bg-green-100 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Select All
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2 shrink-0">
                <span className="text-xs font-medium text-gray-500">Max cards per roll</span>
                <div className="flex flex-wrap gap-1.5">
                  {CARD_COUNTS.map((n) => {
                    const active = n === maxCards;
                    return (
                      <button
                        key={n}
                        onClick={() => setMaxCards(n)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold border transition-all ${
                          active
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
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
                  onClick={beginGame}
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
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-50 to-indigo-100 flex flex-col">
      {/* Top-right: loop reset + exit */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3">
        <button
          onClick={resetToStep1}
          className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors active:scale-95"
          title="Start over (clears targets)"
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

      {/* Centered die */}
      <button
        onClick={roll}
        disabled={rolling || phase === 'single-card' || phase === 'multi-cards'}
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 cursor-pointer disabled:cursor-default select-none"
        title="Click the die to roll"
      >
        <Die3D die={DIE} rolling={rolling} rolled={rolled} size={dieSize} />

        {phase === 'reveal' && rolled !== null && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">You rolled</span>
            <span className="text-7xl font-black tabular-nums text-gray-900 leading-none">{rolled}</span>
            <span className="mt-2 text-xs font-semibold text-gray-400">
              Click the die to roll again
            </span>
          </div>
        )}
        {phase === 'idle' && (
          <span className="text-xs font-semibold text-gray-400">
            Click the die to roll
            {!noTargetMode && (
              <> · {targets.length} target{targets.length === 1 ? '' : 's'}</>
            )}
          </span>
        )}
      </button>

      {/* Data tracking bottom-right (dockable) */}
      <DataPillWidget
        correct={correctCount}
        tries={tryCount}
        dockedLeft={pillLeft}
        onToggleSide={() => setPillLeft((p) => !p)}
        visible={showData}
        onToggleVisible={() => setShowData((v) => !v)}
      />

      {/* Single full-screen flashcard modal (max cards = 1) */}
      {phase === 'single-card' && singleCard && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="flex-1 min-h-0 aspect-square max-h-[60vh]">
              <FlashcardImage
                word={singleCard.word}
                category={categoryForSource(singleCard.source)}
                subId={singleCard.source.subId}
                groupId={singleCard.source.groupId}
              />
            </div>

            {/* Evaluation controls: score and dismiss in one tap */}
            <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  evaluate('correct');
                  closeSingleCard();
                }}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Correct"
              >
                <Check className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  evaluate('try');
                  closeSingleCard();
                }}
                className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Try again"
              >
                <Minus className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom-right X: close the card; the die keeps rolling underneath */}
            <button
              onClick={closeSingleCard}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close card"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-card modal (max cards >= 2) */}
      {phase === 'multi-cards' && multiCards.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">
                {multiCards.length} card{multiCards.length === 1 ? '' : 's'} · roll {rolled}
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {multiCards.map((card, i) => {
                  return (
                    <div
                      key={`${card.word}-${i}`}
                      className="rounded-xl overflow-hidden border-2 border-gray-100 flex flex-col bg-white"
                    >
                      <div className="aspect-square bg-gray-50">
                        <FlashcardImage
                          word={card.word}
                          category={categoryForSource(card.source)}
                          subId={card.source.subId}
                          groupId={card.source.groupId}
                        />
                      </div>
                      <span className="block text-xs font-medium text-gray-700 capitalize truncate px-2 py-1 text-center">
                        {card.word}
                      </span>
                      <div className="shrink-0 flex items-center justify-center gap-2 px-2 py-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            scoreMultiCard(i, 'correct');
                            removeMultiCard(i);
                          }}
                          className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow transition-all active:scale-95"
                          title="Correct"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            scoreMultiCard(i, 'try');
                            removeMultiCard(i);
                          }}
                          className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow transition-all active:scale-95"
                          title="Try again"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom-right X: close and keep rolling */}
            <button
              onClick={() => {
                setMultiCards([]);
                setPhase('idle');
              }}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close cards"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
