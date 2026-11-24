import { slugifyWord, type SoundCategory, type Subcategory } from '@/data/words';

const R2_BASE = 'https://pub-c53fff4920214dd59d4a14590b17acae.r2.dev';
const SCENES_PATH = 'picture%20scenes';

/** Sanitize a path segment: trim, lowercase, spaces -> hyphens. */
function sanitize(part: string): string {
  return part.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Capitalize each space-separated word segment, preserving %20 between words.
 * "ice cream" -> "Ice%20Cream", "lion" -> "Lion".
 */
function capitalizeWord(word: string): string {
  return word
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
    .join('%20');
}

/** Lowercase filename for R2 assets; spaces are encoded as %20. */
function lowercaseSlug(word: string): string {
  return encodeURIComponent(word.trim().toLowerCase()).replace(/%20/g, '%20');
}

/**
 * Derive the R2 "sound" path segment from the active sound category.
 * For picture scenes (no sound), we group under `scenes`.
 */
function soundSegment(category: SoundCategory | undefined | null): string {
  if (!category) return 'speech';
  if (category.kind === 'scene') return 'scenes';
  if (category.kind === 'language') return `language/${encodeSpaces((category.label ?? '').toLowerCase())}`;
  return sanitize(category.id ?? '');
}

/** Encode spaces as %20 while leaving the rest of the segment intact. */
function encodeSpaces(part: string): string {
  return part.trim().replace(/\s+/g, '%20');
}

/**
 * Derive the R2 "position" path segment from the selected subcategory/group.
 *  - If a group is selected, the group label (e.g. "/air/", "/gr/") is used.
 *  - Otherwise the subcategory label (e.g. "Initial", "Medial", "Final") is used.
 */
/**
 * For /th/ subcategories, the R2 folder name uses an IPA symbol (ð or θ)
 * followed by a literal space and then "initial/medial/final" — e.g. the
 * subcategory "θ Initial" maps to the URL segment "%CE%B8%20initial". The
 * special chars must be URL-encoded and the space preserved (not hyphenated).
 */
function thPositionSegment(label: string | undefined | null): string | null {
  const m = /^([ðθ])\s+(initial|medial|final)$/i.exec((label ?? '').trim());
  if (!m) return null;
  const ipa = m[1].toLowerCase() === 'ð' ? '%C3%B0%20' : '%CE%B8%20';
  return `${ipa}${m[2].toLowerCase()}`;
}

function positionSegment(sub: Subcategory | undefined | null, groupId: string | null, category?: SoundCategory | null): string {
  // Inside positionSegment() in src/lib/images.ts:

if (category?.id === 'verbs' || category?.label?.toLowerCase() === 'verbs') {
  const subLabel = (sub?.label ?? '').toLowerCase();
  const groupLabel = (groupId ?? '').toLowerCase();
  const subString = `${subLabel} ${groupLabel}`;
  // ---------------------------------------------------------------------------
  // SPECIAL CASE: Irregular Past Tense Verbs (Language Category)
  // Maps age groups ("Early (3-4yrs)", "Mid (4-6yrs)", "Later (6-8+yrs)")
  // directly to R2 bucket paths: "irregular past tense/early", etc.
  // ---------------------------------------------------------------------------
if (category?.kind === 'language' && sub?.label?.toLowerCase()?.includes('irregular past tense')) {
  if (groupId) {
    const g = sub.groups?.find((x) => x.id === groupId);
    const groupLabel = (g?.label ?? groupId ?? '').toLowerCase();

    if (groupLabel.includes('early')) return 'irregular past tense/early';
    if (groupLabel.includes('mid'))   return 'irregular past tense/mid';
    if (groupLabel.includes('later')) return 'irregular past tense/later';
  }
  return 'irregular past tense';
}
  // Regular Past Tense sound-ending subcategories (/t/, /d/, /id/)
  if (subString.includes('regular past tense') || sub?.id === 'regular-past-tense') {
    if (subString.includes('t'))  return 'regular past tense/t';
    if (subString.includes('d'))  return 'regular past tense/d';
    if (subString.includes('ed') || subString.includes('ed')) return 'regular past tense/ed';
    
    return 'regular past tense'; // Fallback for root folder
  }
}
  // Fix pronoun subcategory pathing (e.g. "he / his" -> "he")
if (category?.id === 'pronouns' || category?.kind === 'language') {
  const subString = `${sub?.id ?? ''} ${sub?.label ?? ''}`.toLowerCase();

  if (subString.includes('she')) return 'she';
  if (subString.includes('they')) return 'they';
  if (subString.includes('he')) return 'he';
}

  // Standard language category handling
  if (category?.kind === 'language') {
    return sub ? encodeSpaces((sub.label ?? '').toLowerCase()) : 'all';
  }

  if (sub?.groups && groupId) {
    const g = sub.groups.find((x) => x.id === groupId);
    if (g) {
      // Special case: /w/ + /r/ medial group maps to the literal "w+r" folder.
      if (g.id === 'r-medial-wr') {
        return 'medial/w+r';
      }
      const th = thPositionSegment(g.label ?? '');
      if (th) return th;
      const cleanGroup = sanitize((g.label ?? '').replace(/[\\/]/g, '').trim());
      const subLabel = (sub.label ?? '').toLowerCase();
      if (subLabel === 'blends') {
        return `blends/${cleanGroup}`;
      }
      if (subLabel === 'medial' || subLabel === 'final' || subLabel === 'initial') {
        return `${sanitize(sub.label ?? '')}/${cleanGroup}`;
      }
      return cleanGroup;
    }
  }

  if (sub) {
    const th = thPositionSegment(sub.label ?? '');
    if (th) return th;
    // "1 Syllable" / "2 Syllable" folders use a literal space (e.g. /ng/1%20syllable)
    const syl = /^(\d)\s+syllables?$/i.exec((sub.label ?? '').trim());
    if (syl) return `${syl[1]}%20syllable`;
    const subLabel = (sub.label ?? '').toLowerCase();
    if (subLabel === 'blends') {
      const g = sub.groups?.find((x) => x.id === groupId);
      if (g) return `blends/${sanitize((g.label ?? '').replace(/[\\/]/g, '').trim())}`;
    }
    if ((subLabel === 'medial' || subLabel === 'final') && sub.groups) {
      const g = sub.groups.find((x) => x.id === groupId);
      if (g) return `${sanitize(sub.label ?? '')}/${sanitize((g.label ?? '').replace(/[\\/]/g, '').trim())}`;
    }
    const fromLabel = sanitize((sub.label ?? '').replace(/[\\/]/g, '').trim());
    if (fromLabel) return fromLabel;
  }
  return 'initial';
}

export type AttemptStage =
  | 'r2-lower-svg'
  | 'r2-cap-svg'
  | 'r2-lower-png'
  | 'r2-cap-png'
  | 'r2-lower-jpg'
  | 'r2-cap-jpg'
  | 'placeholder'
  | 'icon';

export type ImageAttempt = {
  stage: AttemptStage;
  url: string | null;
};

export type ImagePlan = {
  attempts: ImageAttempt[];
  firstUrl: string;
  sound: string;
  position: string;
  wordKey: string;
};

/**
 * A single static placeholder image (inline SVG data URI) shown when no R2
 * asset is found. Identical for every word so the UI is consistent.
 */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f3f4f6"/><rect x="40" y="40" width="720" height="720" rx="32" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/><g transform="translate(400 370)" fill="none" stroke="#cbd5e1" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><rect x="-130" y="-95" width="260" height="190" rx="24"/><circle cx="-60" cy="-40" r="24"/><path d="M-130 75 L-20 -15 L45 55 L130 -25 L130 95 L-130 95 Z"/></g><text x="400" y="570" font-family="system-ui,sans-serif" font-size="44" font-weight="700" fill="#94a3b8" text-anchor="middle">No image</text></svg>`;
export const PLACEHOLDER_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;
const CAPITALIZED_ASSET_WORDS = new Set(['friday', 'thursday', 'tuesday']);

/**
 * Build the ordered image-resolution plan for a flashcard word.
 *
 * Default stage order:
 *  1. lowercase .svg
 *  2. capitalized .svg
 *  3. lowercase .png
 *  4. capitalized .png
 *  5. lowercase .jpg
 *  6. capitalized .jpg
 * Known title-case assets are tried first when their R2 filename is capitalized.
 *  7. Single static placeholder image
 *  8. Static Lucide icon (final safety net)
 */
export function r2ImagePaths(
  word: string,
  category: SoundCategory | undefined | null,
  sub: Subcategory | undefined | null,
  groupId: string | null | undefined,
): ImagePlan {
  const safeWord = word ?? '';
  try {
    const sound = soundSegment(category);
    const position = positionSegment(sub, groupId ?? null, category);
    return {
      attempts: buildImageAttempts(safeWord, sound, position),
      firstUrl: `${R2_BASE}/${sound}/${position}/${lowercaseSlug(safeWord)}.svg`,
      sound,
      position,
      wordKey: safeWord.trim().toLowerCase(),
    };
  } catch {
    // Fallback plan: never crash the UI — return a placeholder-only plan.
    return {
      attempts: [
        { stage: 'placeholder', url: PLACEHOLDER_DATA_URI },
        { stage: 'icon', url: null },
      ],
      firstUrl: PLACEHOLDER_DATA_URI,
      sound: 'speech',
      position: 'initial',
      wordKey: safeWord.trim().toLowerCase(),
    };
  }
}

/** Build the ordered image-resolution attempts for a word at a sound/position path. */
export function buildImageAttempts(word: string, sound: string, position: string): ImageAttempt[] {
  const base = `${R2_BASE}/${sound}/${position}`;
  const lower = lowercaseSlug(word);
  const cap = capitalizeWord(word);
  const attempts: ImageAttempt[] = [
    { stage: 'r2-lower-svg', url: `${base}/${lower}.svg` },
    { stage: 'r2-cap-svg', url: `${base}/${cap}.svg` },
    { stage: 'r2-lower-png', url: `${base}/${lower}.png` },
    { stage: 'r2-cap-png', url: `${base}/${cap}.png` },
    { stage: 'r2-lower-jpg', url: `${base}/${lower}.jpg` },
    { stage: 'r2-cap-jpg', url: `${base}/${cap}.jpg` },
  ];

  if (CAPITALIZED_ASSET_WORDS.has(word.trim().toLowerCase())) {
    const capitalizedSvg = attempts.splice(1, 1)[0];
    attempts.unshift(capitalizedSvg);
  }

  return [
    ...attempts,
    { stage: 'placeholder', url: PLACEHOLDER_DATA_URI },
    { stage: 'icon', url: null },
  ];
}

/** Return the remote image candidates in the same order used by card rendering. */
export function r2ImageCandidates(plan: ImagePlan): string[] {
  return plan.attempts
    .filter(
      (attempt): attempt is ImageAttempt & { url: string } =>
        attempt.url !== null && attempt.stage !== 'placeholder' && attempt.stage !== 'icon',
    )
    .map((attempt) => attempt.url);
}

/* ----------------------------- picture scenes ----------------------------- */

const CUSTOM_SCENES_PATH = 'custom%20scenes';

/** Known custom scenes uploaded to the R2 bucket (no directory listing over HTTP). */
export const CUSTOM_SCENE_TITLES = [
  'Halloween',
  'Ocean',
  'Space',
  'Jungle',
  'Circus',
  'Dinosaur Land',
  'Ice Cream Shop',
  'Farm',
  'Pirate Ship',
  'Camping',
  'Zoo',
  'Beach Day',
];

/** Build the Cloudflare R2 URL for a custom scene JPG. Lowercase slug, spaces encoded as %20. */
export function customSceneImageUrl(title: string): string {
  const slug = title.trim().replace(/\s+/g, '%20').toLowerCase();
  return `${R2_BASE}/${CUSTOM_SCENES_PATH}/${slug}.jpg`;
}

/** Build the Cloudflare R2 URL for a picture scene PNG. Spaces are encoded as %20. */
export function sceneImageUrl(title: string): string {
  const slug = title.trim().replace(/\s+/g, '%20');
  return `${R2_BASE}/${SCENES_PATH}/${slug}.png`;
}

/** Convert a scene title/filename slug into a clean, human-readable label. */
export function sceneLabel(title: string): string {
  return title
    .trim()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
    .join(' ');
}

/* ----------------------------- pattern memory ----------------------------- */

const PATTERN_KEY = 'flashcard-image-pattern';
const PATTERN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type PatternEntry = { stage: AttemptStage; ts: number };
type PatternMap = Record<string, PatternEntry>;

function loadPatterns(): PatternMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PATTERN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PatternMap;
    const now = Date.now();
    for (const key of Object.keys(parsed)) {
      if (now - parsed[key].ts > PATTERN_TTL_MS) delete parsed[key];
    }
    return parsed;
  } catch {
    return {};
  }
}

function savePatterns(map: PatternMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PATTERN_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function rememberSuccess(
  sound: string,
  position: string,
  stage: AttemptStage,
  word: string,
): void {
  const map = loadPatterns();
  map[`${sound}/${position}/${word.trim().toLowerCase()}`] = { stage, ts: Date.now() };
  savePatterns(map);
}

export function applyRememberedStage(plan: ImagePlan): ImageAttempt[] {
  const remembered = loadPatterns()[`${plan.sound}/${plan.position}/${plan.wordKey}`]?.stage;
  if (!remembered) return plan.attempts;
  const idx = plan.attempts.findIndex((a) => a.stage === remembered);
  if (idx <= 0) return plan.attempts;
  const [hit] = plan.attempts.splice(idx, 1);
  plan.attempts.unshift(hit);
  return plan.attempts;
}

/** Resolve the URL most likely to load successfully for a card (honors pattern memory). */
export function resolveFirstUrl(plan: ImagePlan): string {
  const reordered = applyRememberedStage(plan);
  return reordered.find((a) => a.url)?.url ?? plan.firstUrl;
}

/* ------------------------------- prefetching ------------------------------- */

export function prefetchR2Image(url: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

export function preloadImage(url: string): void {
  const img = new Image();
  img.src = url;
}
