import { useMemo, useState } from 'react';
import { X, Check, Minus, Sparkles, Trophy, Gem } from 'lucide-react';
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

type Step = 1 | 2;
type TreasureTarget = { word: string; source: SelectableSource };
type Rock = {
  target: TreasureTarget;
  lifted: boolean;
  hasTreasure: boolean;
  shape: number;
};

const MAX_WORDS = 10;

// Ten distinct rock silhouettes, all drawn in a 0 0 100 100 viewBox so they
// can be scaled freely. Each has a slightly different palette and silhouette.
const ROCK_SHAPES: string[] = [
  'M20 85 L14 55 L28 30 L55 20 L80 35 L88 62 L78 85 Z',
  'M25 88 L18 60 L35 32 L65 25 L85 45 L82 75 L65 88 Z',
  'M15 82 L20 48 L45 25 L75 30 L90 58 L82 82 Z',
  'M22 86 L12 58 L30 28 L60 22 L82 38 L86 68 L70 86 Z',
  'M18 85 L22 52 L50 28 L78 32 L88 60 L80 85 Z',
  'M28 88 L16 62 L38 30 L70 28 L86 50 L80 80 Z',
  'M20 84 L18 50 L40 26 L68 24 L88 42 L86 72 L66 84 Z',
  'M24 87 L14 55 L36 30 L62 24 L84 40 L84 70 L68 87 Z',
  'M17 83 L25 45 L52 24 L82 30 L90 60 L76 83 Z',
  'M21 86 L15 52 L42 26 L70 26 L87 46 L80 78 L62 86 Z',
];

const ROCK_FILLS = ['#a8a29e', '#9ca3af', '#94a3b8', '#a3a3a3', '#9e9e9e', '#a3b0bd', '#9f9f9f', '#a8abb0', '#96a0a8', '#a0a5ad'];
const ROCK_STROKES = ['#57534e', '#4b5563', '#475569', '#525252', '#555555', '#4f5a66', '#515151', '#55585e', '#4a545c', '#51565e'];

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

export function HiddenTreasureGame({ mode, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());
  const [rocks, setRocks] = useState<Rock[] | null>(null);
  const [scoringIndex, setScoringIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [tryCount, setTryCount] = useState(0);
  const [victory, setVictory] = useState(false);

  const sources = useMemo(() => allSelectableSources(mode), [mode]);  const chosenSources = useMemo(
    () => sources.filter((s) => selectedSourceKeys.has(sourceKey(s))),
    [sources, selectedSourceKeys],
  );
  const poolWords = useMemo(() => {
    const seen = new Set<string>();
    const out: TreasureTarget[] = [];
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
      if (next.has(word)) {
        next.delete(word);
      } else if (next.size < MAX_WORDS) {
        next.add(word);
      }
      return next;
    });
  };

  const clearWords = () => setPickedWords(new Set());
  const randomWords = () => {
    const shuffled = [...poolWords].sort(() => Math.random() - 0.5);
    setPickedWords(new Set(shuffled.slice(0, MAX_WORDS).map((p) => p.word)));
  };

  const beginGame = () => {
    const picked = poolWords.filter((p) => pickedWords.has(p.word));
    if (picked.length === 0) return;
    const treasureIndex = Math.floor(Math.random() * picked.length);
    setRocks(
      picked.map((target, i) => ({
        target,
        lifted: false,
        hasTreasure: i === treasureIndex,
        shape: i,
      })),
    );
    setScoringIndex(null);
    setCorrectCount(0);
    setTryCount(0);
    setVictory(false);
  };

  const resetToStep1 = () => {
    setStep(1);
    setRocks(null);
    setScoringIndex(null);
    setPickedWords(new Set());
    setCorrectCount(0);
    setTryCount(0);
    setVictory(false);
  };

  const handleRockTap = (index: number) => {
    setRocks((prev) => {
      if (!prev) return prev;
      const rock = prev[index];
      if (rock.lifted || scoringIndex !== null || victory) return prev;
      setScoringIndex(index);
      return prev;
    });
  };

  const scoreCorrect = () => {
    setCorrectCount((n) => n + 1);
    revealRock();
  };

  const scoreTry = () => {
    setTryCount((n) => n + 1);
    revealRock();
  };

  // Reveal the rock under the cursor, then check for victory.
  const revealRock = () => {
    if (scoringIndex === null) return;
    const idx = scoringIndex;
    const wasTreasure = rocks ? rocks[idx].hasTreasure : false;
    setScoringIndex(null);
    setRocks((prev) => {
      if (!prev) return prev;
      return prev.map((r, i) => (i === idx ? { ...r, lifted: true } : r));
    });
    if (wasTreasure) {
      setTimeout(() => setVictory(true), 700);
    }
  };

  const totalAttempts = correctCount + tryCount;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  const scoringRock = scoringIndex !== null && rocks ? rocks[scoringIndex] : null;

  // ============================== SETUP WIZARD ==============================

  if (!rocks) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Hidden Treasure</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: deck selection (MixedModePicker overlays) */}
          {step === 1 && (
            <MixedModePicker
              mode={mode}
              onStart={(words, sources) => {
                const seen = new Set<string>();
                const out: TreasureTarget[] = [];
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
                      ({pickedWords.size}/{MAX_WORDS} selected)
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={randomWords}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold hover:bg-sky-100 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      Random
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

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="h-1.5 rounded-full bg-gray-900" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-500">
                    {pickedWords.size}/{MAX_WORDS} words selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetToStep1}
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-sky-300 via-emerald-200 to-amber-200">
      {/* Scene: sky, sun, hills, sand */}
      <div className="absolute top-8 right-20 w-16 h-16 rounded-full bg-yellow-300 shadow-[0_0_40px_rgba(253,224,71,0.8)]" />
      <div className="absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-b from-amber-200 to-amber-400" />
      <div className="absolute bottom-[40%] -left-16 w-72 h-40 rounded-[50%] bg-emerald-300/80" />
      <div className="absolute bottom-[42%] right-0 w-64 h-36 rounded-[50%] bg-emerald-400/70" />

      {/* Top-right: restart + X */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={resetToStep1}
          disabled={!victory}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors active:scale-95 ${
            victory
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-white/40 text-gray-500 border border-white/60 cursor-not-allowed'
          }`}
          title={victory ? 'Play again' : 'Find the treasure first'}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors active:scale-95"
          title="Exit game"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rocks grid */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-14 pb-4">
        <div className="grid grid-cols-5 gap-3 sm:gap-5 w-full max-w-3xl">
          {rocks.map((rock, index) => (
            <div key={index} className="relative h-24 sm:h-28" onClick={() => handleRockTap(index)}>
              {/* What's behind the rock, fading in as it lifts */}
              <div
                className={`absolute inset-x-2 bottom-1 top-1 flex items-center justify-center transition-all duration-700 ${
                  rock.lifted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20">
                  <FlashcardImage
                    word={rock.target.word}
                    category={categoryForSource(rock.target.source)}
                    subId={rock.target.source.subId}
                    groupId={rock.target.source.groupId}
                  />
                </div>
              </div>

              {/* The rock itself, tilting and rising as it lifts away */}
              <div
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  rock.lifted ? 'opacity-0 -translate-y-10 rotate-12 scale-75' : 'opacity-100'
                }`}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  <path
                    d={ROCK_SHAPES[rock.shape]}
                    fill={ROCK_FILLS[rock.shape]}
                    stroke={ROCK_STROKES[rock.shape]}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Small hint of the target word image on the rock face */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 opacity-80 rounded-md overflow-hidden">
                    <FlashcardImage
                      word={rock.target.word}
                      category={categoryForSource(rock.target.source)}
                      subId={rock.target.source.subId}
                      groupId={rock.target.source.groupId}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
      {scoringRock && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
            <button
              onClick={revealRock}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center backdrop-blur shadow transition-colors"
              title="Close and reveal what's behind"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 min-h-0 aspect-square max-h-[60vh]">
              <FlashcardImage
                word={scoringRock.target.word}
                category={categoryForSource(scoringRock.target.source)}
                subId={scoringRock.target.source.subId}
                groupId={scoringRock.target.source.groupId}
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

      {/* Victory celebration: shiny treasure grows toward screen center */}
      {victory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white/95 rounded-3xl shadow-2xl px-10 py-8 text-center backdrop-blur">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-300/60" />
              <Gem className="relative w-full h-full text-yellow-500 drop-shadow-lg" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">Treasure found!</h3>
            <p className="text-sm text-gray-600 mt-1">
              It was under <span className="font-bold capitalize">{victoryWord(rocks)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function victoryWord(rocks: Rock[]): string {
  return rocks.find((r) => r.hasTreasure)?.target.word ?? '';
}
