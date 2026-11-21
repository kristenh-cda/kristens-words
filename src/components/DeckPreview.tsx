import { useState } from 'react';
import { LayoutGrid, X, ImageOff, Check } from 'lucide-react';
import type { CardSlot } from '@/components/FlashcardView';
import { r2ImagePaths, resolveFirstUrl, rememberSuccess, type ImagePlan } from '@/lib/images';
import { findSubcategory, type SoundCategory } from '@/data/words';
import { formatWordDisplay } from '@/lib/formatters';

type Props = {
  slots: CardSlot[];
  total: number;
  /** Called with the selected card slots when the user confirms selection. */
  onConfirmSelection?: (selected: CardSlot[]) => void;
};

export function DeckPreview({ slots, total, onConfirmSelection }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const previewPlans = slots.map((slot) => {
    const sub = findSubcategory(slot.category, slot.subId);
    return r2ImagePaths(slot.word, slot.category, sub, slot.groupId);
  });
  const previewUrls = previewPlans.map((plan) => resolveFirstUrl(plan));

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-gray-700 border border-gray-200 text-lg font-semibold hover:bg-gray-50 active:scale-95 transition-colors shadow-sm"
        title="Preview the deck"
      >
        <LayoutGrid className="w-5 h-5" />
        Preview
      </button>
    );
  }

  const toggleSelection = (i: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelectedIndices(new Set(slots.map((_, i) => i)));

  const clearAll = () => setSelectedIndices(new Set());

  const confirmSelection = () => {
    if (onConfirmSelection) {
      const selected = slots.filter((_, i) => selectedIndices.has(i));
      onConfirmSelection(selected);
    }
    setExpanded(false);
    setSelectedIndices(new Set());
  };

  const hasSelection = selectedIndices.size > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { setExpanded(false); setSelectedIndices(new Set()); }}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-800">Deck Preview · {total} cards</h3>
            {hasSelection && (
              <span className="text-xs font-medium text-indigo-600">{selectedIndices.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Select all
            </button>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => { setExpanded(false); setSelectedIndices(new Set()); }}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {slots.map((slot, i) => (
              <PreviewTile
                key={slot.inst ?? i}
                word={slot.word}
                url={previewUrls[i]}
                plan={previewPlans[i]}
                slotCategory={slot.category}
                slotSubId={slot.subId}
                selected={selectedIndices.has(i)}
                onToggle={() => toggleSelection(i)}
              />
            ))}
          </div>
        </div>
        {onConfirmSelection && (
          <div className="shrink-0 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {hasSelection ? `${selectedIndices.size} cards will make up the deck` : 'Select cards to customize the deck'}
            </span>
            <button
              onClick={confirmSelection}
              disabled={!hasSelection}
              className="px-5 py-2 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Select
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTile({
  word,
  url,
  plan,
  slotCategory,
  slotSubId,
  selected,
  onToggle,
}: {
  word: string;
  url: string;
  plan: ImagePlan;
  slotCategory?: SoundCategory;
  slotSubId?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stageIndex, setStageIndex] = useState(() => {
    const idx = plan.attempts.findIndex((a) => a.url === url);
    return idx >= 0 ? idx : 0;
  });
  const attempt = plan.attempts[stageIndex];
  const noImage = !attempt || attempt.stage === 'placeholder' || attempt.stage === 'icon';

  return (
    <button
      onClick={onToggle}
      className={`flex flex-col items-center gap-1 rounded-lg border-2 overflow-hidden transition-all ${
        selected ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center">
        {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
        {noImage ? (
          <ImageOff className="w-6 h-6 text-gray-300" />
        ) : (
          <img
            key={attempt.url}
            src={attempt.url ?? undefined}
            alt={word}
            loading="lazy"
            decoding="async"
            onLoad={() => {
              setLoaded(true);
              if (attempt.stage !== 'placeholder' && attempt.stage !== 'icon') {
                rememberSuccess(plan.sound, plan.position, attempt.stage, plan.wordKey);
              }
            }}
            onError={() => {
              setFailed(false);
              setLoaded(false);
              setStageIndex((prev) => {
                const next = Math.min(prev + 1, plan.attempts.length - 1);
                if (next === prev) setFailed(true);
                return next;
              });
            }}
            className={`w-full h-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {selected && (
          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
            <Check className="w-3 h-3" />
          </span>
        )}
      </div>
      <span className="text-[10px] text-gray-500 truncate w-full text-center leading-tight px-1 pb-0.5">
        {formatWordDisplay(word, slotCategory?.id, slotSubId)}
      </span>
    </button>
  );
}
