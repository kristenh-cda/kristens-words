import { sourceKey, MIXED_PRACTICE_ORDER, MIXED_PRACTICE_EARLY_SOUNDS_ORDER, type SelectableSource } from '@/data/words';

export const S_BLENDS_CATEGORY_ID = 's-blends';
export const R_BLENDS_CATEGORY_ID = 'r-blends-picker';
export const L_BLENDS_CATEGORY_ID = 'l-blends-picker';
export const R_INITIAL_CATEGORY_ID = 'r-initial-picker';
export const VOCALIC_R_CATEGORY_ID = 'vocalic-r-picker';
export const TH_VOICELESS_SUBGROUP_ID = 'th-voiceless';

/** Subcategory IDs that belong to the /th/ Voiceless subgroup. */
const TH_VOICELESS_SUB_IDS = new Set(['th-voiceless-initial', 'th-voiceless-medial', 'th-voiceless-final', 'th-thr']);

/** Categories hidden from all target pickers (main filter bar + mixed pickers). */
export const UNSELECTABLE_CATEGORY_IDS = new Set(['n', 'p', 'b', 'm', 'h', 'w', 'y', 'phonological-awareness']);

export function isSelectableCategory(categoryId: string): boolean {
  return !UNSELECTABLE_CATEGORY_IDS.has(categoryId);
}

export type PickerCategoryGroup = {
  categoryId: string;
  categoryLabel: string;
  sources: SelectableSource[];
  subGroups?: PickerCategoryGroup[];
};

/**
 * Group sources for mixed-pick UIs only. Blend subcategories are elevated out
 * of their parent sound category into synthetic top-level blend categories
 * ("/s/ Blends", "/r/ Blends", "/l/ Blends"). /r/ initial becomes its own
 * top-level category and medial+final /r/ group under "Vocalic /r/" with
 * Medial/Final subgroups. This does not affect the main filter bar.
 * /ts/ stays under /s/ but is excluded from the /s/ toggle.
 */
export function groupSourcesForPicker(sources: SelectableSource[]): PickerCategoryGroup[] {
  const groups: PickerCategoryGroup[] = [];
  const index = new Map<string, PickerCategoryGroup>();

  for (const s of sources) {
    let catId = s.categoryId;
    let catLabel = s.categoryLabel;
    if (s.categoryId === 's' && s.subId === 's-blends') {
      catId = S_BLENDS_CATEGORY_ID;
      catLabel = '/s/ Blends';
    } else if (s.categoryId === 'l' && s.subId === 'l-blends') {
      catId = L_BLENDS_CATEGORY_ID;
      catLabel = '/l/ Blends';
    } else if (s.categoryId === 'r' && s.subId === 'r-blends') {
      catId = R_BLENDS_CATEGORY_ID;
      catLabel = '/r/ Blends';
    } else if (s.categoryId === 'r' && s.subId === 'r-initial') {
      catId = R_INITIAL_CATEGORY_ID;
      catLabel = '/r/ Initial';
    } else if (s.categoryId === 'r' && (s.subId === 'r-medial' || s.subId === 'r-final')) {
      catId = VOCALIC_R_CATEGORY_ID;
      catLabel = 'Vocalic /r/';
    }
    let group = index.get(catId);
    if (!group) {
      group = { categoryId: catId, categoryLabel: catLabel, sources: [] };
      index.set(catId, group);
      groups.push(group);
    }
    group.sources.push(s);
  }

  // Vocalic /r/: organize its medial/final sources into Medial and Final
  // subgroups so they render nested instead of as a flat list.
  const vocalic = index.get(VOCALIC_R_CATEGORY_ID);
  if (vocalic) {
    const medial: SelectableSource[] = [];
    const final: SelectableSource[] = [];
    for (const s of vocalic.sources) {
      (s.subId === 'r-medial' ? medial : final).push(s);
    }
    const subGroups: PickerCategoryGroup[] = [];
    if (medial.length > 0) subGroups.push({ categoryId: 'r-medial', categoryLabel: 'Medial', sources: medial });
    if (final.length > 0) subGroups.push({ categoryId: 'r-final', categoryLabel: 'Final', sources: final });
    if (subGroups.length > 0) {
      vocalic.subGroups = subGroups;
      vocalic.sources = [];
    }
  }

  // /th/: split voiceless sources into a "Voiceless" subgroup with its own
  // checkmark that selects θ initial, θ medial, θ final, and /thr/.
  const th = index.get('th');
  if (th) {
    const voiceless: SelectableSource[] = [];
    const remaining: SelectableSource[] = [];
    for (const s of th.sources) {
      (TH_VOICELESS_SUB_IDS.has(s.subId) ? voiceless : remaining).push(s);
    }
    if (voiceless.length > 0) {
      th.subGroups = [{ categoryId: TH_VOICELESS_SUBGROUP_ID, categoryLabel: 'Voiceless', sources: voiceless }];
      th.sources = remaining;
    }
  }

  // Picker order: use the explicit MIXED_PRACTICE_ORDER from words.ts.
  // Also filter out any group whose underlying category is disabled.
  const orderIndex = new Map(MIXED_PRACTICE_ORDER.map((id, i) => [id, i]));
  const earlySoundsIndex = new Map(MIXED_PRACTICE_EARLY_SOUNDS_ORDER.map((id, i) => [id, i]));
  const filtered = groups.filter((g) => {
    // Map synthetic picker IDs back to their real category ID for the disabled check.
    const realCatId =
      g.categoryId === S_BLENDS_CATEGORY_ID ? 's' :
      g.categoryId === L_BLENDS_CATEGORY_ID ? 'l' :
      g.categoryId === R_BLENDS_CATEGORY_ID ? 'r' :
      g.categoryId === R_INITIAL_CATEGORY_ID ? 'r' :
      g.categoryId === VOCALIC_R_CATEGORY_ID ? 'r' :
      g.categoryId;
    return isSelectableCategory(realCatId);
  });
  filtered.sort((a, b) => {
    const ai = orderIndex.get(a.categoryId);
    const bi = orderIndex.get(b.categoryId);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    // Early sounds sort after main sounds, in their own order
    const aei = earlySoundsIndex.get(a.categoryId);
    const bei = earlySoundsIndex.get(b.categoryId);
    if (aei !== undefined && bei !== undefined) return aei - bei;
    if (aei !== undefined) return 1;
    if (bei !== undefined) return -1;
    return 0;
  });
  return filtered;
}

/** Whether a category belongs to the early-sounds section of mixed practice. */
export function isEarlySoundsCategory(categoryId: string): boolean {
  return MIXED_PRACTICE_EARLY_SOUNDS_ORDER.includes(categoryId);
}

/**
 * Keys affected by a category header toggle. /ts/ is excluded from the /s/
 * toggle and must be clicked individually.
 */
export function toggleableKeysForCategory(group: PickerCategoryGroup): string[] {
  const fromSources = group.sources
    .filter((s) => !(group.categoryId === 's' && s.subId === 's-ts'))
    .map((s) => sourceKey(s));
  const fromSubGroups = (group.subGroups ?? []).flatMap((sub) => sub.sources.map((s) => sourceKey(s)));
  return [...fromSources, ...fromSubGroups];
}
