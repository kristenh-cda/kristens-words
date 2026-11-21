import { useMemo, useState } from 'react';
import { Check, ChevronDown, X, Dices, ArrowLeft, ImageOff } from 'lucide-react';
import {
  allSelectableSources,
  sourceKey,
  findCategory,
  findSubcategory,
  categories,
  languageCategories,
  type Mode,
  type SelectableSource,
  type SoundCategory,
} from '@/data/words';
import {
  groupSourcesForPicker,
  toggleableKeysForCategory,
  isSelectableCategory,
} from '@/components/pickerGroups';
import { r2ImagePaths, applyRememberedStage } from '@/lib/images';
import { formatWordDisplay } from '@/lib/formatters';

export type CustomTarget = {
  word: string;
  source: SelectableSource;
};

type Props = {
  mode: Mode;
  onDone: (targets: CustomTarget[]) => void;
  onClose: () => void;
};

export const CUSTOM_TARGET_COUNT = 12;

function categoryForSource(source: SelectableSource): SoundCategory {
  return findCategory(source.categoryId) ?? categories[0] ?? languageCategories[0];
}

function imageUrlFor(word: string, source: SelectableSource): string {
  const cat = categoryForSource(source);
  const sub = findSubcategory(cat, source.subId);
  const plan = r2ImagePaths(word, cat, sub, source.groupId);
  const reordered = applyRememberedStage(plan);
  return reordered.find((a) => a.url)?.url ?? plan.firstUrl;
}

/**
 * Two-step setup for a Custom Scene: pick target categories (same layout as
 * the Mixed Practice picker), then pick up to 12 words from the combined
 * pool. Only the picked words appear in the scene sidebar (no padding to 12).
 */
export function CustomSceneSetup({ mode, onDone, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickedWords, setPickedWords] = useState<Map<string, CustomTarget>>(new Map());

  const sources = useMemo(
    () => allSelectableSources(mode).filter((s) => isSelectableCategory(s.categoryId)),
    [mode],
  );
  const categoryGroups = useMemo(() => groupSourcesForPicker(sources), [sources]);

  const chosenSources = useMemo(
    () => sources.filter((s) => selected.has(sourceKey(s))),
    [sources, selected],
  );
  const poolWords = useMemo(() => {
    const seen = new Set<string>();
    const out: CustomTarget[] = [];
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

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    const group = categoryGroups.find((g) => g.categoryId === categoryId);
    if (!group) return;
    const catKeys = toggleableKeysForCategory(group);
    const allSelected = catKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) catKeys.forEach((k) => next.delete(k));
      else catKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const toggleExpanded = (categoryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleWord = (target: CustomTarget) => {
    const key = target.word.toLowerCase();
    setPickedWords((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < CUSTOM_TARGET_COUNT) next.set(key, target);
      return next;
    });
  };

  const randomPick = () => {
    const shuffled = [...poolWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPickedWords(new Map(shuffled.slice(0, CUSTOM_TARGET_COUNT).map((t) => [t.word.toLowerCase(), t])));
  };

  // Only the picked words are used; the sidebar shows just these (no padding to 12).
  const buildTargets = (): CustomTarget[] => Array.from(pickedWords.values());

  const totalWords = poolWords.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                title="Back to categories"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {step === 1 ? 'Choose target categories' : 'Choose target words'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: category selection (same layout as mixed picker) */}
        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-sm text-gray-500 mb-4">
                Tick a category to select all of its sounds, or use the arrow to pick individual sounds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                {categoryGroups.map((group) => {
                  const catKeys = toggleableKeysForCategory(group);
                  const allSelected = catKeys.length > 0 && catKeys.every((k) => selected.has(k));
                  const someSelected = group.sources.some((s) => selected.has(sourceKey(s)));
                  const isOpen = expanded.has(group.categoryId);
                  return (
                    <div
                      key={group.categoryId}
                      className={`rounded-xl border transition-colors ${
                        isOpen ? 'border-gray-300 bg-gray-50/50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <button
                          onClick={() => toggleCategory(group.categoryId)}
                          aria-label={`Select all ${group.categoryLabel}`}
                          className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            allSelected
                              ? 'bg-gray-900 border-gray-900 text-white'
                              : someSelected
                              ? 'bg-gray-300 border-gray-400'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {allSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span className="flex-1 text-sm font-bold text-gray-800 truncate">{group.categoryLabel}</span>
                        <button
                          onClick={() => toggleExpanded(group.categoryId)}
                          aria-expanded={isOpen}
                          className="w-7 h-7 shrink-0 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="flex flex-col gap-1 px-2.5 pb-2.5">
                          {group.sources.map((s) => {
                            const key = sourceKey(s);
                            const active = selected.has(key);
                            const label = s.groupLabel ?? s.subLabel;
                            return (
                              <button
                                key={key}
                                onClick={() => toggle(key)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                                  active
                                    ? `${s.accentSoft} ring-1 ring-current`
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                              >
                                <span className="truncate">{label}</span>
                                <span className="opacity-60 ml-2">{s.words.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <span className="text-sm text-gray-500">
                {chosenSources.length > 0 ? (
                  <>{chosenSources.length} group{chosenSources.length > 1 ? 's' : ''} selected · {totalWords} words</>
                ) : (
                  'Select at least one group'
                )}
              </span>
              <button
                onClick={() => setStep(2)}
                disabled={chosenSources.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 2: word selection with image previews */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  Pick up to {CUSTOM_TARGET_COUNT} words{' '}
                  <span className="font-normal text-gray-400">({pickedWords.size}/{CUSTOM_TARGET_COUNT} selected)</span>
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
                  const sel = pickedWords.has(word.toLowerCase());
                  return (
                    <button
                      key={`${source.subId}-${source.groupId}-${word}`}
                      onClick={() => toggleWord({ word, source })}
                      className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                        sel ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="aspect-square bg-gray-50">
                        <WordPreview word={word} source={source} />
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <span className="text-xs text-gray-500">
                {pickedWords.size === 0
                  ? 'Select at least one word'
                  : `${pickedWords.size} word${pickedWords.size === 1 ? '' : 's'} selected`}
              </span>
              <button
                onClick={() => onDone(buildTargets())}
                disabled={pickedWords.size === 0}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Start
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WordPreview({ word, source }: { word: string; source: SelectableSource }) {
  const url = imageUrlFor(word, source);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300 p-2">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={word}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="w-full h-full object-contain"
      draggable={false}
    />
  );
}
