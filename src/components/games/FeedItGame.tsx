import { useMemo, useRef, useState } from 'react';
import { X, Check, Minus, Sparkles, Trophy, RotateCcw, Dog } from 'lucide-react';
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
import { FlashcardImage } from '@/components/FlashcardImage';
import { formatWordDisplay } from '@/lib/formatters';
import { MixedModePicker } from '@/components/MixedModePicker';

type Props = {
  mode: Mode;
  onClose: () => void;
};

type Target = { word: string; source: SelectableSource };
type Step = 1 | 2;
type Phase = 'pick' | 'card' | 'dispense' | 'drag-dessert';

type Dessert = 'cookie' | 'cupcake' | 'icecream' | 'donut' | 'cake';

const MAX_WORDS = 10;
const ROUNDS = 10;

const DESSERTS: Dessert[] = ['cookie', 'cupcake', 'icecream', 'donut', 'cake'];

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

function DessertGraphic({ kind }: { kind: Dessert }) {
  switch (kind) {
    case 'cookie':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="20" fill="#d97706" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="#b45309" strokeWidth="3" />
          <circle cx="17" cy="18" r="3" fill="#78350f" />
          <circle cx="30" cy="15" r="2.5" fill="#78350f" />
          <circle cx="26" cy="28" r="3" fill="#78350f" />
          <circle cx="14" cy="30" r="2.5" fill="#78350f" />
          <circle cx="34" cy="27" r="2" fill="#78350f" />
        </svg>
      );
    case 'cupcake':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path d="M10 24 L38 24 L33 44 L15 44 Z" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <path d="M18 26 L20 42 M24 26 L24 44 M30 26 L28 42" stroke="#db2777" strokeWidth="1.5" />
          <path d="M12 24 C10 12 18 8 24 12 C28 4 40 8 38 20 C42 24 36 24 24 24 C14 24 12 24 12 24 Z" fill="#fce7f3" stroke="#db2777" strokeWidth="2" />
          <circle cx="24" cy="6" r="2.5" fill="#ef4444" />
        </svg>
      );
    case 'icecream':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <path d="M14 22 L34 22 L24 46 Z" fill="#d97706" stroke="#b45309" strokeWidth="2" />
          <circle cx="18" cy="18" r="7" fill="#a7f3d0" stroke="#059669" strokeWidth="1.5" />
          <circle cx="28" cy="17" r="7" fill="#fda4af" stroke="#e11d48" strokeWidth="1.5" />
          <circle cx="23" cy="11" r="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
          <circle cx="26" cy="9" r="1.5" fill="#ef4444" />
        </svg>
      );
    case 'donut':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="19" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
          <path d="M6 20 C10 14 16 14 20 18 C26 22 32 20 36 16 C40 14 42 16 42 20 C42 30 36 40 24 40 C14 40 6 32 6 20 Z" fill="#f9a8d4" />
          <circle cx="24" cy="24" r="6" fill="#fce7f3" stroke="#b45309" strokeWidth="2" />
          <circle cx="14" cy="22" r="1.5" fill="#fff" />
          <circle cx="30" cy="14" r="1.5" fill="#fff" />
          <circle cx="34" cy="30" r="1.5" fill="#fff" />
          <circle cx="16" cy="32" r="1.5" fill="#fff" />
        </svg>
      );
    case 'cake':
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <rect x="6" y="24" width="36" height="18" rx="3" fill="#fbcfe8" stroke="#db2777" strokeWidth="2" />
          <rect x="6" y="24" width="36" height="6" fill="#f472b6" />
          <rect x="10" y="30" width="4" height="8" fill="#fff" opacity="0.6" />
          <rect x="22" y="30" width="4" height="8" fill="#fff" opacity="0.6" />
          <rect x="34" y="30" width="4" height="8" fill="#fff" opacity="0.6" />
          <path d="M24 24 L24 10 M24 10 C24 6 20 6 20 9 C20 12 24 14 24 10" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
        </svg>
      );
  }
}

function GumballMachine({ flash }: { flash: boolean }) {
  return (
    <svg
      viewBox="0 0 120 200"
      className={`h-full w-auto transition-transform duration-300 ${flash ? 'scale-110' : 'scale-100'}`}
    >
      {/* Bowl */}
      <circle cx="60" cy="50" r="42" fill="#bae6fd" fillOpacity="0.55" stroke="#7dd3fc" strokeWidth="3" />
      <path d="M22 60 A42 42 0 0 0 98 60" fill="#e0f2fe" fillOpacity="0.5" stroke="none" />
      {/* Gumballs inside */}
      <circle cx="45" cy="40" r="8" fill="#f87171" />
      <circle cx="62" cy="34" r="8" fill="#4ade80" />
      <circle cx="76" cy="44" r="8" fill="#fbbf24" />
      <circle cx="52" cy="54" r="8" fill="#60a5fa" />
      <circle cx="70" cy="56" r="8" fill="#f472b6" />
      <circle cx="60" cy="44" r="8" fill="#c084fc" opacity="0.9" />
      {/* Highlight */}
      <path d="M34 28 A 18 18 0 0 1 48 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Bowl base / machine body */}
      <rect x="46" y="90" width="28" height="14" rx="3" fill="#ef4444" />
      {/* Dispense chute */}
      <rect x="52" y="104" width="16" height="10" rx="2" fill="#991b1b" />
      {/* Stand */}
      <rect x="40" y="114" width="40" height="46" rx="4" fill="#ef4444" />
      <rect x="46" y="122" width="28" height="20" rx="3" fill="#fecaca" />
      <circle cx="60" cy="132" r="5" fill="#ef4444" />
      {/* Tray */}
      <path d="M30 160 L90 160 L84 178 L36 178 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2" />
      <ellipse cx="60" cy="160" rx="30" ry="5" fill="#dc2626" />
    </svg>
  );
}

function Puppy({ scale, biting }: { scale: number; biting: boolean }) {
  return (
    <div
      className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center"
      style={{ transform: `scale(${scale})`, transition: 'transform 700ms ease-in-out' }}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <g className={biting ? 'animate-bounce' : ''}>
          {/* Ears */}
          <path d="M30 40 C22 44 22 58 30 62 Z" fill="#92400e" />
          <path d="M90 40 C98 44 98 58 90 62 Z" fill="#92400e" />
          {/* Head */}
          <circle cx="60" cy="52" r="32" fill="#d97706" />
          {/* Muzzle */}
          <ellipse cx="60" cy="64" rx="16" ry="12" fill="#fde68a" />
          <circle cx="60" cy="58" r="4" fill="#1c1917" />
          <path d="M60 62 L60 68 M60 68 C58 72 54 71 54 68 M60 68 C62 72 66 71 66 68" stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="48" cy="46" r="4.5" fill="#1c1917" />
          <circle cx="72" cy="46" r="4.5" fill="#1c1917" />
          <circle cx="49.5" cy="44.5" r="1.5" fill="#fff" />
          <circle cx="73.5" cy="44.5" r="1.5" fill="#fff" />
          {/* Body */}
          <ellipse cx="60" cy="96" rx="26" ry="18" fill="#d97706" />
          <ellipse cx="60" cy="100" rx="16" ry="10" fill="#fde68a" />
          {/* Legs */}
          <rect x="42" y="104" width="8" height="12" rx="3" fill="#b45309" />
          <rect x="70" y="104" width="8" height="12" rx="3" fill="#b45309" />
          {/* Tail */}
          <path d="M84 92 C94 88 96 78 90 74" stroke="#b45309" strokeWidth="5" strokeLinecap="round" fill="none" className="animate-pulse" />
        </g>
      </svg>
    </div>
  );
}

export function FeedItGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [scoringTarget, setScoringTarget] = useState<Target | null>(null);
  const [activeDessert, setActiveDessert] = useState<Dessert | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [victory, setVictory] = useState(false);
  const [machineFlash, setMachineFlash] = useState(false);
  const [puppyBiting, setPuppyBiting] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const sources = useMemo(() => allSelectableSources(mode), [mode]);
  const chosenSources = useMemo(
    () => sources.filter((s) => selectedSourceKeys.has(sourceKey(s))),
    [sources, selectedSourceKeys],
  );
  const poolWords = useMemo(() => {
    const seen = new Set<string>();
    const out: Target[] = [];
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

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < MAX_WORDS) next.add(word);
      return next;
    });
  };

  const randomTen = () => {
    const shuffled = [...poolWords].sort(() => Math.random() - 0.5);
    setPickedWords(new Set(shuffled.slice(0, MAX_WORDS).map((p) => p.word)));
  };
  const clearWords = () => setPickedWords(new Set());

  const beginGame = () => {
    if (pickedWords.size === 0) return;
    setRound(0);
    setPhase('pick');
    setScoringTarget(null);
    setActiveDessert(null);
    setCorrectCount(0);
    setTryCount(0);
    setVictory(false);
  };

  const resetToStep1 = () => {
    setStep(1);
    setSelectedSourceKeys(new Set());
    setPickedWords(new Set());
    setRound(0);
    setPhase('pick');
    setScoringTarget(null);
    setActiveDessert(null);
    setCorrectCount(0);
    setTryCount(0);
    setVictory(false);
  };

  // Queue of targets: the 10 picked words in play order (recycled if < 10 picked).
  const queue: Target[] = useMemo(() => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word));
    const out: Target[] = [];
    while (out.length < ROUNDS && picked.length > 0) {
      for (const t of picked) {
        if (out.length < ROUNDS) out.push(t);
      }
    }
    return out;
  }, [poolWords, pickedWords]);

  const currentRound = round < ROUNDS ? queue[round] : null;
  const remainingTargets = queue.slice(round);
  const puppyScale = 1 + round * 0.1;

  const handleMachineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (phase !== 'pick' || !currentRound) return;
    setMachineFlash(true);
    setTimeout(() => setMachineFlash(false), 350);
    setScoringTarget(currentRound);
    setPhase('card');
  };

  const scoreCorrect = () => {
    setCorrectCount((n) => n + 1);
    closeModal();
  };

  const scoreTry = () => {
    setTryCount((n) => n + 1);
    closeModal();
  };

  const closeModal = () => {
    if (!scoringTarget) return;
    setScoringTarget(null);
    const dessert = DESSERTS[Math.floor(Math.random() * DESSERTS.length)];
    setActiveDessert(dessert);
    setPhase('drag-dessert');
  };

  const feedPuppy = () => {
    if (!activeDessert) return;
    setActiveDessert(null);
    setPuppyBiting(true);
    setTimeout(() => setPuppyBiting(false), 600);
    const nextRound = round + 1;
    setRound(nextRound);
    setPhase('pick');
    if (nextRound >= ROUNDS) {
      setTimeout(() => setVictory(true), 800);
    }
  };

  const puppyZones = () => {
    const el = document.getElementById('puppy-drop-zone');
    return el ? el.getBoundingClientRect() : null;
  };

  const totalAttempts = correctCount + tryCount;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  // ============================== SETUP WIZARD ==============================

  if (round === 0 && phase === 'pick' && !scoringTarget && pickedWords.size === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Dog className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Feed the Puppy</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: deck selection */}
          {step === 1 && (
            <MixedModePicker
              mode={mode}
              onStart={(words, srcs) => {
                const seen = new Set<string>();
                const out: Target[] = [];
                for (const s of srcs) {
                  for (const w of s.words) {
                    const key = w.toLowerCase();
                    if (!seen.has(key) && words.includes(w)) {
                      seen.add(key);
                      out.push({ word: w, source: s });
                    }
                  }
                }
                setSelectedSourceKeys(new Set(srcs.map((s) => sourceKey(s))));
                setPickedWords(new Set(out.slice(0, MAX_WORDS).map((t) => t.word)));
                setStep(2);
              }}
              onClose={onClose}
            />
          )}

          {/* Step 2: target selection */}
          {step === 2 && (
            <>
              <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
                <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                  <h3 className="text-sm font-bold text-gray-700">
                    Pick target words{' '}
                    <span className={`font-normal ${pickedWords.size >= MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                      ({pickedWords.size}/{MAX_WORDS})
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={randomTen}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold hover:bg-sky-100 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Random 10
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
                    {poolWords.map(({ word, source }) => {
                      const sel = pickedWords.has(word);
                      const disabled = !sel && pickedWords.size >= MAX_WORDS;
                      return (
                        <button
                          key={`${source.subId}-${source.groupId}-${word}`}
                          onClick={() => toggleWord(word)}
                          disabled={disabled}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                            sel ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-100 hover:border-gray-300'
                          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
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

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="h-1.5 rounded-full bg-gray-900" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-500">
                    {pickedWords.size}/{MAX_WORDS} selected — fewer than 10 will repeat
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={beginGame}
                      disabled={pickedWords.size === 0}
                      className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Begin
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ================================ GAME BOARD ================================

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100">
      {/* Top-right controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={resetToStep1}
          className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors active:scale-95"
          title="Reset game"
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

      {/* Top header: carousel of remaining targets, draggable */}
      <div className="absolute top-3 inset-x-14 z-20 flex justify-center gap-3 overflow-x-auto py-1">
        {remainingTargets.map((t, i) => (
          <div
            key={`${t.source.subId}-${t.source.groupId}-${t.word}-${i}`}
            draggable={phase === 'pick'}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', t.word);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className={`w-16 h-16 sm:w-20 sm:h-20 bg-transparent flex items-center justify-center ${
              phase === 'pick' ? 'cursor-grab active:cursor-grabbing' : 'opacity-40 pointer-events-none'
            }`}
          >
            <FlashcardImage
              word={t.word}
              category={categoryForSource(t.source)}
              subId={t.source.subId}
              groupId={t.source.groupId}
              className="w-full h-full object-contain bg-transparent"
            />
          </div>
        ))}
      </div>

      {/* Main stage */}
      <div
        ref={stageRef}
        className="absolute inset-0 flex items-end justify-center gap-10 sm:gap-20 px-6 pb-16 pt-24"
        onDragOver={(e) => {
          e.preventDefault();
          if (draggingRef.current && activeDessert) {
            setDragPos({ x: e.clientX, y: e.clientY });
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingRef.current && activeDessert) {
            const puppyZone = puppyZones();
            const hit = puppyZone && e.clientX >= puppyZone.left && e.clientX <= puppyZone.right && e.clientY >= puppyZone.top && e.clientY <= puppyZone.bottom;
            if (hit) feedPuppy();
            draggingRef.current = false;
            setDragPos(null);
          }
        }}
      >
        {/* Gumball machine */}
        <div
          className="h-[60%] max-h-[420px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleMachineDrop}
        >
          <GumballMachine flash={machineFlash} />
        </div>

        {/* Puppy */}
        <div
          id="puppy-drop-zone"
          className="h-[55%] max-h-[400px] flex items-end justify-center"
        >
          <Puppy scale={puppyScale} biting={puppyBiting} />
        </div>
      </div>

      {/* Dessert being dragged (ghost follows cursor) */}
      {activeDessert && draggingRef.current && dragPos && (
        <div
          className="fixed z-40 w-12 h-12 pointer-events-none"
          style={{ left: dragPos.x - 24, top: dragPos.y - 24 }}
        >
          <DessertGraphic kind={activeDessert} />
        </div>
      )}

      {/* Dessert in tray, ready to drag */}
      {activeDessert && !draggingRef.current && (
        <div
          draggable
          onDragStart={(e) => {
            draggingRef.current = true;
            e.dataTransfer.setData('text/plain', 'dessert');
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-20 sm:h-20 z-20 cursor-grab active:cursor-grabbing animate-bounce"
          title="Drag the treat to the puppy!"
        >
          <DessertGraphic kind={activeDessert} />
        </div>
      )}

      {/* Bottom-right stats */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 items-end z-30">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 shadow-sm">
          <Check className="w-3 h-3" />
          <span className="text-xs font-bold tabular-nums">{correctCount}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-200 shadow-sm">
          <Minus className="w-3 h-3" />
          <span className="text-xs font-bold tabular-nums">{tryCount}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
          <Trophy className="w-3 h-3" />
          <span className="text-xs font-bold tabular-nums">{accuracy}%</span>
        </div>
      </div>

      {/* Flashcard evaluation modal: check/dash only record data, card stays open */}
      {scoringTarget && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close and dispense a treat"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 min-h-0 aspect-square max-h-[60vh]">
              <FlashcardImage
                word={scoringTarget.word}
                category={categoryForSource(scoringTarget.source)}
                subId={scoringTarget.source.subId}
                groupId={scoringTarget.source.groupId}
              />
            </div>

            <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={scoreTry}
                className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Try again"
              >
                <Minus className="w-6 h-6" />
              </button>
              <button
                onClick={scoreCorrect}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Correct"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {victory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 text-center max-w-sm w-full">
            <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-3" />
            <h3 className="text-2xl font-black text-gray-900 mb-1">You fed the puppy!</h3>
            <p className="text-sm text-gray-600 mb-1">
              Check <span className="font-bold text-green-600">{correctCount}</span> · Dash{' '}
              <span className="font-bold text-orange-500">{tryCount}</span>
            </p>
            <div className="flex gap-2 justify-center mt-5">
              <button
                onClick={beginGame}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-200 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
