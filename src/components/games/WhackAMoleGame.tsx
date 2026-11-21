import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Minus, Pause, Play, RotateCcw, Trophy, ChevronLeft, Gavel } from 'lucide-react';
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
import { r2ImagePaths, applyRememberedStage } from '@/lib/images';
import { FlashcardImage } from '@/components/FlashcardImage';
import { formatWordDisplay } from '@/lib/formatters';
import { MixedModePicker } from '@/components/MixedModePicker';
import { DataPillWidget } from '@/components/DataPillWidget';

type Props = {
  mode: Mode;
  onClose: () => void;
};

type MoleTarget = { word: string; source: SelectableSource };
type Hole = { target: MoleTarget; up: boolean } | null;
type Step = 1 | 2 | 3;
type Speed = 'easy' | 'medium' | 'hard';

const SPEEDS: { id: Speed; label: string; hint: string; popupMs: number }[] = [
  { id: 'easy', label: 'Easy', hint: '2.5s popup', popupMs: 2500 },
  { id: 'medium', label: 'Medium', hint: '1.8s popup', popupMs: 1800 },
  { id: 'hard', label: 'Hard', hint: '1.2s popup', popupMs: 1200 },
];

const GRID_OPTIONS = [
  { holes: 6, label: '6 Holes', hint: '2 × 3 grid', cols: 3 },
  { holes: 9, label: '9 Holes', hint: '3 × 3 grid', cols: 3 },
];

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

/**
 * Resolves the raw transparent graphic (svg/png preferred) for a word so it can
 * rise out of a mole hole with no card frame behind it.
 */
function resolveMoleImageUrl(word: string, source: SelectableSource): string | undefined {
  const cat = categoryForSource(source);
  const sub = findSubcategory(cat, source.subId);
  const plan = r2ImagePaths(word, cat, sub, source.groupId);
  const attempts = applyRememberedStage(plan);
  const graphic = attempts.find((a) => a.url && a.stage !== 'icon' && a.stage !== 'placeholder');
  return graphic?.url ?? plan.firstUrl;
}

export function WhackAMoleGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [speed, setSpeed] = useState<Speed>('easy');
  const [holeCount, setHoleCount] = useState(6);

  // Target deck state
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // Game state
  const [targets, setTargets] = useState<MoleTarget[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [paused, setPaused] = useState(false);
  const [tapped, setTapped] = useState<MoleTarget | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [showData, setShowData] = useState(true);
  const [pillLeft, setPillLeft] = useState(false);

  const sources = useMemo(() => allSelectableSources(mode), [mode]);
  const chosenSources = useMemo(
    () => sources.filter((s) => selectedSourceKeys.has(sourceKey(s))),
    [sources, selectedSourceKeys],
  );
  const poolWords = useMemo(() => {
    const seen = new Set<string>();
    const out: MoleTarget[] = [];
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

  const timersRef = useRef<number[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const tappedRef = useRef(tapped);
  tappedRef.current = tapped;
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  const popupMs = SPEEDS.find((s) => s.id === speed)?.popupMs ?? 2500;
  const gridOption = GRID_OPTIONS.find((g) => g.holes === holeCount) ?? GRID_OPTIONS[0];

  const pickTarget = (): MoleTarget | undefined => {
    const list = targetsRef.current;
    if (list.length === 0) return undefined;
    return list[Math.floor(Math.random() * list.length)];
  };

  // Pop-up loop: a poll checks whether it's time to raise a new mole. Paused
  // and evaluating states just idle the poll without popping anything.
  useEffect(() => {
    if (targets.length === 0) return;
    let nextPopupAt = Date.now() + 600;
    const poll = window.setInterval(() => {
      if (pausedRef.current || tappedRef.current) return;
      if (Date.now() < nextPopupAt) return;
      nextPopupAt = Date.now() + popupMs;
      setHoles((prev) => {
        // Retract anything still up, then raise one new mole in a free hole.
        const next: Hole[] = prev.map((h) => (h && h.up ? { ...h, up: false } : h));
        const free = next.map((h, i) => (h === null ? i : -1)).filter((i) => i >= 0);
        const target = pickTarget();
        if (target && free.length > 0) {
          next[free[Math.floor(Math.random() * free.length)]] = { target, up: true };
        }
        // Fully clear retracted holes shortly after so they can be reused.
        addTimer(
          window.setTimeout(() => {
            setHoles((cur) => cur.map((h) => (h && !h.up ? null : h)));
          }, 400),
        );
        return next;
      });
    }, 150);
    return () => window.clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.length, popupMs]);

  const handleDeckSelected = useCallback((words: string[], sources: SelectableSource[]) => {
    const seen = new Set<string>();
    const out: MoleTarget[] = [];
    for (const s of sources) {
      for (const w of s.words) {
        const key = w.toLowerCase();
        if (!seen.has(key) && words.includes(w)) {
          seen.add(key);
          out.push({ word: w, source: s });
        }
      }
    }
    setSelectedSourceKeys(new Set(sources.map((s) => sourceKey(s))));
    setPickedWords(new Set(out.map((t) => t.word)));
    setStep(3);
  }, []);

  const toggleSource = (key: string) => {
    setSelectedSourceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleWord = (word: string) => {
    setPickedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const selectAllWords = () => setPickedWords(new Set(poolWords.map((p) => p.word)));
  const clearWords = () => setPickedWords(new Set());

  const beginGame = () => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word));
    if (picked.length === 0) return;
    clearTimers();
    setTargets(picked);
    setHoles(Array(holeCount).fill(null));
    setPaused(false);
    setTapped(null);
    setCorrectCount(0);
    setTryCount(0);
  };

  const resetToStep1 = () => {
    clearTimers();
    setStep(1);
    setTargets([]);
    setHoles([]);
    setPaused(false);
    setTapped(null);
    setPickedWords(new Set());
    setCorrectCount(0);
    setTryCount(0);
  };

  const handleMoleTap = (index: number) => {
    setHoles((prev) => {
      const hole = prev[index];
      if (!hole || !hole.up || tappedRef.current) return prev;
      setTapped(hole.target);
      return prev;
    });
  };

  const scoreCorrect = () => {
    setCorrectCount((n) => n + 1);
    setTapped(null);
  };

  const scoreTry = () => {
    setTryCount((n) => n + 1);
    setTapped(null);
  };

  const closeCard = () => setTapped(null);

  const totalAttempts = correctCount + tryCount;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  // ============================== SETUP WIZARD ==============================

  if (targets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Whack-a-Mole</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: game settings */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Speed</h3>
                <div className="flex flex-wrap gap-3">
                  {SPEEDS.map((s) => {
                    const active = s.id === speed;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSpeed(s.id)}
                        className={`px-6 py-4 rounded-xl text-lg font-bold border-2 transition-all ${
                          active
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {s.label}
                        <span className="block text-xs font-medium opacity-70">{s.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Grid Layout</h3>
                <div className="flex flex-wrap gap-3">
                  {GRID_OPTIONS.map((g) => {
                    const active = g.holes === holeCount;
                    return (
                      <button
                        key={g.holes}
                        onClick={() => setHoleCount(g.holes)}
                        className={`px-6 py-4 rounded-xl text-lg font-bold border-2 transition-all ${
                          active
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {g.label}
                        <span className="block text-xs font-medium opacity-70">{g.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: deck selection (MixedModePicker overlays) */}
          {step === 2 && (
            <MixedModePicker mode={mode} onStart={handleDeckSelected} onClose={() => setStep(1)} />
          )}

          {/* Step 3: target selection */}
          {step === 3 && (
            <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick target words <span className="font-normal text-gray-400">({pickedWords.size} selected)</span>
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
                  {SPEEDS.find((s) => s.id === speed)?.label} · {holeCount} holes
                </span>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                  {step === 1 ? 'Choose words' : 'Next'}
                </button>
              ) : (
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-green-400">
      {/* Decorative field */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-green-400 to-green-600" />
      <div className="absolute top-6 left-8 w-16 h-6 rounded-full bg-white/80" />
      <div className="absolute top-10 left-16 w-10 h-5 rounded-full bg-white/80" />
      <div className="absolute top-8 right-24 w-14 h-6 rounded-full bg-white/70" />

      {/* Top-left: mole counter */}
      <div className="absolute top-3 left-3 z-20 bg-white rounded-xl shadow-md px-4 py-2 flex items-center gap-2">
        <Gavel className="w-4 h-4 text-gray-600" />
        <span className="text-lg font-black tabular-nums text-gray-800">{correctCount}</span>
      </div>

      {/* Top-right: pause / reset / exit */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setPaused((v) => !v)}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors active:scale-95 ${
            paused ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
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

      {/* Holes */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-14 pb-6">
        <div
          className="grid gap-4 sm:gap-6 w-full max-w-2xl"
          style={{ gridTemplateColumns: `repeat(${gridOption.cols}, minmax(0, 1fr))` }}
        >
          {holes.map((hole, index) => (
            <div key={index} className="relative h-32 sm:h-36" onClick={() => handleMoleTap(index)}>
              {/* Clip window: the target rises out of the oval hole below */}
              <div className="absolute inset-x-4 top-0 bottom-6 overflow-hidden">
                {hole && (
                  <div
                    className="absolute inset-x-0 bottom-0 flex justify-center transition-transform duration-300 ease-out"
                    style={{ height: '100%' }}
                  >
                    <div
                      className={`flex flex-col items-center justify-center transition-transform duration-300 ease-out ${
                        hole.up ? 'translate-y-0' : 'translate-y-full'
                      }`}
                      style={{ height: '100%' }}
                    >
                      <img
                        src={resolveMoleImageUrl(hole.target.word, hole.target.source)}
                        alt={hole.target.word}
                        draggable={false}
                        className="max-w-full max-h-full object-contain drop-shadow-md select-none pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* The hole itself: black oval, target emerges from its vertical center */}
              <div className="absolute inset-x-2 bottom-0 h-10 sm:h-11 rounded-[50%] bg-stone-950 shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_2px_5px_rgba(0,0,0,0.6)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-right dockable data pill */}
      <DataPillWidget
        correct={correctCount}
        tries={tryCount}
        dockedLeft={pillLeft}
        onToggleSide={() => setPillLeft((p) => !p)}
        visible={showData}
        onToggleVisible={() => setShowData((v) => !v)}
      />

      {/* Flashcard evaluation modal */}
      {tapped && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
            <button
              onClick={closeCard}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close card"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 min-h-0 aspect-square max-h-[60vh]">
              <FlashcardImage
                word={tapped.word}
                category={categoryForSource(tapped.source)}
                subId={tapped.source.subId}
                groupId={tapped.source.groupId}
              />
            </div>

            <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={scoreCorrect}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Correct — retracts the mole and resumes"
              >
                <Check className="w-6 h-6" />
              </button>
              <button
                onClick={scoreTry}
                className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow transition-all"
                title="Try again — keeps the card open"
              >
                <Minus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
