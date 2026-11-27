import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Image as ImageIcon, Puzzle, Boxes } from 'lucide-react';
import { categoryListFor, orderedSpeechCategories, earlySoundsCategories, type Mode, type SoundCategory, type Subcategory } from '@/data/words';
import { isSelectableCategory } from '@/components/pickerGroups';

export type MultiSelectionScope = 'category' | 'subcategory' | 'group';

type Props = {
  mode: Mode;
  categoryId: string | null;
  subId: string | null;
  groupId: string | null;
  onCategoryChange: (id: string) => void;
  onSubChange: (id: string) => void;
  onGroupChange: (id: string) => void;
  onShowMixed: () => void;
  onShowScenes: () => void;
  onShowActivities: () => void;
  onClearSelection: () => void;
  multiMode: boolean;
  multiSelectionScope: MultiSelectionScope;
  multiSelected: Set<string>;
  onToggleMultiMode: (scope: MultiSelectionScope) => void;
  onMultiToggleCategory: (categoryId: string) => void;
  onMultiToggleSub: (subId: string) => void;
  onMultiToggleGroup: (subId: string, groupId: string) => void;
};

function subSourceKeys(s: Subcategory): string[] {
  if (s.words) return [s.id];
  if (s.groups) return s.groups.map((g) => `${s.id}::${g.id}`);
  return [];
}

// Display order for vocalic /r/ groups under Medial and Final (bar only —
// the underlying data order is untouched).
const VOCALIC_GROUP_ORDER = ['ar', 'or', 'ear', 'air', 'ire', 'er'];

function sortGroupsForDisplay<T extends { id: string }>(groups: T[] | undefined, subId: string): T[] | undefined {
  if (!groups || (subId !== 'r-medial' && subId !== 'r-final')) return groups;
  const rank = (id: string) => {
    const suffix = id.replace(/^r-(medial|final)-/, '');
    const idx = VOCALIC_GROUP_ORDER.indexOf(suffix);
    return idx === -1 ? VOCALIC_GROUP_ORDER.length : idx;
  };
  return [...groups].sort((a, b) => rank(a.id) - rank(b.id));
}

export function FilterBar({
  mode,
  categoryId,
  subId,
  groupId,
  onCategoryChange,
  onSubChange,
  onGroupChange,
  onShowMixed,
  onShowScenes,
  onShowActivities,
  onClearSelection,
  multiMode,
  multiSelectionScope,
  multiSelected,
  onToggleMultiMode,
  onMultiToggleCategory,
  onMultiToggleSub,
  onMultiToggleGroup,
}: Props) {
  const allCategories = mode === 'language' ? categoryListFor(mode) : orderedSpeechCategories();
  const soundCategories = allCategories.filter((c) => c.kind !== 'scene');
  const earlySounds = mode === 'language' ? [] : earlySoundsCategories();
  const cat = allCategories.find((c) => c.id === categoryId);
  const sub = cat?.subcategories.find((s) => s.id === subId);
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [earlySoundsOpen, setEarlySoundsOpen] = useState(false);

  const showGroups = Boolean(sub?.groups && sub.groups.length > 0);
  const subsRowExists = Boolean(cat && cat.subcategories.length > 1);
  // Multi button sits at the end of the subcategory row whenever a subcategory
  // row exists — before the divider pipe and any sub-subcategories.
  const multiInSubsRow = subsRowExists;
  const multiInGroupsRow = !multiInSubsRow;

  const isSubSelected = (s: Subcategory) => {
    const keys = subSourceKeys(s);
    return keys.length > 0 && keys.every((k) => multiSelected.has(k));
  };
  const isCategorySelected = (c: SoundCategory) => {
    const keys = c.subcategories
      .filter((s) => !(c.id === 's' && s.id === 's-ts'))
      .flatMap(subSourceKeys);
    return keys.length > 0 && keys.every((k) => multiSelected.has(k));
  };

  const handleCategoryClick = (id: string) => {
    if (multiMode && multiSelectionScope === 'category') onMultiToggleCategory(id);
    else if (!multiMode || id !== categoryId) onCategoryChange(id);
  };

  const multiButton = (inGroupsRow: boolean) => {
    const scope = inGroupsRow ? 'group' : 'subcategory';
    const label = inGroupsRow ? 'Select multiple sound groups' : 'Select multiple subcategories';
    const active = multiMode && multiSelectionScope === scope;
    return (
      <button
        onClick={() => onToggleMultiMode(scope)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`shrink-0 w-9 h-8 flex items-center justify-center transition-all active:scale-95 ${
          inGroupsRow
            ? `rounded-lg border ${
              active
                  ? 'bg-gray-800 text-white border-gray-900 shadow-sm ring-2 ring-gray-500'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
              }`
            : `rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-400 ${
                  active ? 'text-gray-900 ring-2 ring-gray-800' : 'text-gray-500 hover:text-gray-800'
              }`
        }`}
      >
        <Boxes className="w-4 h-4" />
      </button>
    );
  };

  const categoryMultiButton = (
    <button
      onClick={() => onToggleMultiMode('category')}
      aria-pressed={multiMode && multiSelectionScope === 'category'}
      aria-label="Select multiple main categories"
      title="Select multiple main categories"
      className={`flex h-12 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-gray-300 active:scale-95 ${
        multiMode && multiSelectionScope === 'category' ? 'text-gray-900 ring-2 ring-gray-800' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      <Boxes className="h-5 w-5" />
    </button>
  );

  const subcategoryRow =
    cat && cat.subcategories.length > 1 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {cat.subcategories.map((s) => {
          const active = multiMode ? isSubSelected(s) : s.id === subId;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (multiMode) onMultiToggleSub(s.id);
                else onSubChange(s.id);
              }}
              aria-pressed={active}
              className={`px-4 py-2 rounded-lg text-base font-semibold border transition-all duration-200 ${
                active
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {s.label}
            </button>
          );
        })}
        {multiInSubsRow && multiButton(false)}
      </div>
    ) : null;

  const groupsRow =
    sub?.groups && sub.groups.length > 0 ? (
      <div
        className={`flex flex-wrap items-center gap-1.5 ${
          subcategoryRow && mode !== 'language' ? 'pl-3 border-l-2 border-gray-300' : ''
        }`}
      >
        {(sortGroupsForDisplay(sub.groups, sub.id) ?? sub.groups).map((g) => {
          const key = `${sub.id}::${g.id}`;
          const active = multiMode ? multiSelected.has(key) : g.id === groupId;
          return (
            <button
              key={g.id}
              onClick={() => {
                if (multiMode) onMultiToggleGroup(sub.id, g.id);
                else onGroupChange(g.id);
              }}
              className={`px-4 py-2 rounded-lg text-base font-semibold border transition-all duration-200 ${
                active
                  ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {g.label}
            </button>
          );
        })}
        {multiInGroupsRow && multiButton(true)}
      </div>
    ) : null;

  return (
    <div
      className={`relative w-full transition-all duration-200 ${
        soundsOpen ? 'bg-white/60 backdrop-blur border-b border-gray-200' : ''
      }`}
    >
      {/* Toggle sitting on the line at the bottom of the main header */}
      <button
        onClick={() => {
          if (soundsOpen) onClearSelection();
          setSoundsOpen((o) => !o);
        }}
        aria-expanded={soundsOpen}
        aria-label={soundsOpen ? 'Hide filter bar' : 'Show filter bar'}
        title={soundsOpen ? 'Hide filter bar' : 'Show filter bar'}
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 z-10 w-8 h-8 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-800 shadow-sm flex items-center justify-center transition-all active:scale-95"
      >
        {soundsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {soundsOpen && (
        <div className="max-w-5xl mx-auto px-4 py-2 space-y-2">
          {/* Sound buttons | split | Mixed / Scenes / Activities stacked (right) */}
          <div className="flex items-stretch gap-3 pt-1">
<div className="flex-1 min-w-0 flex flex-col items-center gap-2">
  {(mode === 'language'
    ? [soundCategories.slice(0, 4), soundCategories.slice(4)]
    : [soundCategories.slice(0, 7), soundCategories.slice(7, 13)]
  ).map((row, rowIndex) =>
    row.length > 0 && (
      <div key={rowIndex} className="flex flex-wrap items-center justify-center gap-2">
        {row.map((c) => {
          const active = multiMode && multiSelectionScope === 'category' ? isCategorySelected(c) : c.id === categoryId;
          const empty = c.disabled || c.subcategories.length === 0 || !isSelectableCategory(c.id);
          return (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.id)}
              disabled={empty}
              aria-pressed={active}
              title={empty ? 'Coming soon' : undefined}
              className={`px-7 py-3.5 rounded-full text-[22px] font-bold tracking-wider border transition-all duration-200 ${
                active
                  ? `${c.accentSoft} ring-2 ${c.ring} shadow-sm`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${empty ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {c.label}
            </button>
          );
        })}

        {/* Inline Early Sounds Toggle placed at the END of Row 2 (rowIndex === 1) */}
        {rowIndex === 1 && (
          <>
            {mode !== 'language' && (
              <button
                onClick={() => setEarlySoundsOpen((o) => !o)}
                aria-expanded={earlySoundsOpen}
                aria-label="Early sounds"
                title="Early sounds"
                className="w-12 h-12 rounded-full border transition-all duration-200 bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center shrink-0 active:scale-95"
              >
                {earlySoundsOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>
            )}
            {categoryMultiButton}
          </>
        )}
      </div>
    )
  )}

  {/* Expanded Early Sounds Row (renders right below when opened) */}
  {mode !== 'language' && earlySoundsOpen && (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      {earlySounds.map((c) => {
    const active = multiMode && multiSelectionScope === 'category' ? isCategorySelected(c) : c.id === categoryId;
        const empty = c.disabled || c.subcategories.length === 0 || !isSelectableCategory(c.id);
        return (
          <button
            key={c.id}
        onClick={() => handleCategoryClick(c.id)}
            disabled={empty}
            aria-pressed={active}
            title={empty ? 'Coming soon' : undefined}
            className={`px-7 py-3.5 rounded-full text-[21px] font-bold border transition-all duration-200 ${
              active
                ? `${c.accentSoft} ring-2 ${c.ring} shadow-sm`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${empty ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  )}
</div>

            <div className="shrink-0 flex items-center pl-3 border-l-2 border-gray-300">
              <div className="flex flex-col items-center gap-1.5 px-6">
              <button
                onClick={onShowMixed}
                aria-label="Mixed practice"
                title="Mixed practice"
                className="w-9 h-9 shrink-0 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={onShowScenes}
                aria-label="Picture scenes"
                title="Picture scenes"
                className="w-9 h-9 shrink-0 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onShowActivities}
                aria-label="Activities"
                title="Activities"
                className="w-9 h-9 shrink-0 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <Puzzle className="w-4 h-4" />
              </button>
              </div>
            </div>
          </div>

          {/* Subcategories | sub-subcategories, side by side on one row */}
          {subcategoryRow || groupsRow ? (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-2">
              {subcategoryRow}
              {groupsRow}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
