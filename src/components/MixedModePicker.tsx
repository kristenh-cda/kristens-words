import { Fragment, useMemo, useState } from 'react';
import { X, Check, Layers, ChevronDown } from 'lucide-react';
import { allSelectableSources, sourceKey, type SelectableSource, type Mode } from '@/data/words';
import { groupSourcesForPicker, toggleableKeysForCategory, isSelectableCategory, isEarlySoundsCategory, type PickerCategoryGroup } from '@/components/pickerGroups';

type Props = {
  mode: Mode;
  onStart: (words: string[], sources: SelectableSource[]) => void;
  onClose: () => void;
  /** Optional secondary action shown beside the Select button (e.g. play without target words). */
  secondaryAction?: { label: string; onClick: () => void };
  /** Overrides the main action label (defaults to "Select"). */
  startLabel?: string;
  heading?: string;
  subheading?: string;
};

function sourceLabel(s: SelectableSource): string {
  return s.groupLabel ?? s.subLabel;
}

export function MixedModePicker({ mode, onStart, onClose, secondaryAction, startLabel, heading, subheading }: Props) {
  const sources = useMemo(
    () => allSelectableSources(mode).filter((s) => isSelectableCategory(s.categoryId)),
    [mode],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (group: PickerCategoryGroup) => {
    const catKeys = toggleableKeysForCategory(group);
    const allSelected = catKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        catKeys.forEach((k) => next.delete(k));
      } else {
        catKeys.forEach((k) => next.add(k));
      }
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

  const chosenSources = sources.filter((s) => selected.has(sourceKey(s)));
  const totalWords = chosenSources.reduce((sum, s) => sum + s.words.length, 0);

  const categoryGroups = useMemo(() => groupSourcesForPicker(sources), [sources]);

  const start = () => {
    if (chosenSources.length === 0) return;
    const pool: string[] = [];
    chosenSources.forEach((s) => s.words.forEach((w) => pool.push(w)));
    onStart(pool, chosenSources);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">{heading ?? 'Mixed Practice'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">
            {subheading ?? 'Tick a category to select all of its sounds, or use the arrow to pick individual sounds.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {categoryGroups.map((group, idx) => {
              const isEarly = isEarlySoundsCategory(group.categoryId);
              const prevGroup = idx > 0 ? categoryGroups[idx - 1] : null;
              const showDivider = isEarly && prevGroup && !isEarlySoundsCategory(prevGroup.categoryId);
              const catKeys = toggleableKeysForCategory(group);
              const allSelected = catKeys.length > 0 && catKeys.every((k) => selected.has(k));
              const groupKeys = [
                ...group.sources.map((s) => sourceKey(s)),
                ...(group.subGroups ?? []).flatMap((sub) => sub.sources.map((s) => sourceKey(s))),
              ];
              const someSelected = groupKeys.some((k) => selected.has(k));
              const isOpen = expanded.has(group.categoryId);

              return (
                <Fragment key={group.categoryId}>
                  {showDivider && (
                    <div className="col-span-full flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Early Sounds</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}
                <div
                  className={`rounded-xl border transition-colors ${
                    isOpen ? 'border-gray-300 bg-gray-50/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Category header: checkbox + label + expand arrow */}
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      onClick={() => toggleCategory(group)}
                      aria-label={`Select all ${group.categoryLabel}`}
                      title={allSelected ? 'Deselect all' : 'Select all'}
                      className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        allSelected
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : someSelected
                          ? 'bg-gray-300 border-gray-400 text-white'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {allSelected && <Check className="w-3.5 h-3.5" />}
                      {!allSelected && someSelected && <span className="block w-2 h-0.5 bg-gray-700 rounded" />}
                    </button>
                    <span className="flex-1 text-sm font-bold text-gray-800 truncate">{group.categoryLabel}</span>
                    <button
                      onClick={() => toggleExpanded(group.categoryId)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      title={isOpen ? 'Collapse' : 'Pick individual sounds'}
                      className="w-7 h-7 shrink-0 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-transform duration-200"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Subcategory column, opens below the header */}
                  {isOpen && (
                    <div className="flex flex-col gap-1 px-2.5 pb-2.5">
                      {group.sources.map((s) => {
                        const key = sourceKey(s);
                        const active = selected.has(key);
                        const label = sourceLabel(s);
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
                      {group.subGroups?.map((sub) => (
                        <div key={sub.categoryId} className="mt-1">
                          <div className="flex items-center gap-1.5 px-1 py-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-1">{sub.categoryLabel}</p>
                            <button
                              onClick={() => toggleCategory(sub)}
                              aria-label={`Select all ${sub.categoryLabel}`}
                              title={sub.sources.every((s) => selected.has(sourceKey(s))) ? 'Deselect all' : 'Select all'}
                              className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                sub.sources.every((s) => selected.has(sourceKey(s)))
                                  ? 'bg-gray-900 border-gray-900 text-white'
                                  : sub.sources.some((s) => selected.has(sourceKey(s)))
                                  ? 'bg-gray-300 border-gray-400 text-white'
                                  : 'bg-white border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {sub.sources.every((s) => selected.has(sourceKey(s))) && <Check className="w-2.5 h-2.5" />}
                              {!sub.sources.every((s) => selected.has(sourceKey(s))) && sub.sources.some((s) => selected.has(sourceKey(s))) && (
                                <span className="block w-1.5 h-0.5 bg-gray-700 rounded" />
                              )}
                            </button>
                          </div>
                          {sub.sources.map((s) => {
                            const key = sourceKey(s);
                            const active = selected.has(key);
                            const label = sourceLabel(s);
                            return (
                              <button
                                key={key}
                                onClick={() => toggle(key)}
                                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
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
                      ))}
                    </div>
                  )}
                </div>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <span className="text-sm text-gray-500">
            {chosenSources.length > 0 ? (
              <>{chosenSources.length} group{chosenSources.length > 1 ? 's' : ''} selected · {totalWords} words</>
            ) : (
              'Select at least one group'
            )}
          </span>
          <div className="flex items-center gap-2">
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-300 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
            <button
              onClick={start}
              disabled={chosenSources.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {startLabel ?? 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
