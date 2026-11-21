const PROGRESSIVE_SUB_IDS = new Set([
  'present-progressive',
  'present_progressive',
  'verbs-progressive',
]);

const THIRD_PERSON_SUB_IDS = new Set([
  'third-person-singular',
  'third_person_singular',
  '3rd-person-singular',
  'verbs-3rd-person',
]);

function toThirdPersonSingular(ingWord: string): string {
  const base = ingWord.toLowerCase().trim();
  if (!base.endsWith('ing')) return base;
  const stem = base.slice(0, -3);
  // Irregular / Edge-case overrides
  const manualOverrides: Record<string, string> = {
    having: 'has',
    doing: 'does',
    going: 'goes',
    flying: 'flies',
    crying: 'cries',
    trying: 'tries',
    tying: 'ties',
    skiing: 'skis',
    dancing: 'dances',
    opening: 'opens',
    listening: 'listens',
    happening: 'happens',
    hopping: 'hops',
  };
  if (manualOverrides[base]) return manualOverrides[base];
  // Bases that genuinely end in a double letter (falling -> falls, kissing -> kisses,
  // sniffing -> sniffs) keep both letters; do not treat them as doubled short vowels.
  if (/ss$/.test(stem)) return `${stem}es`;
  if (/(ll|ff)$/.test(stem)) return `${stem}s`;
  if (/zz$/.test(stem)) return `${stem}es`;
  // Rule 1: Double consonants from short vowel verbs (e.g., cutting -> cut -> cuts, running -> run -> runs)
  if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
    const singleConsonantStem = stem.slice(0, -1);
    return `${singleConsonantStem}s`;
  }
  // Rule 2: Consonant + y ending (e.g., carrying -> carries)
  if (stem.endsWith('y') && !'aeiou'.includes(stem[stem.length - 2] || '')) {
    return `${stem.slice(0, -1)}ies`;
  }
  // Rule 3: s, x, z, ch, sh endings add 'es' (e.g., washing -> washes, catching -> catches)
  if (/(s|x|z|ch|sh)$/.test(stem)) {
    return `${stem}es`;
  }
  // Rule 4: Silent 'e' verbs where 'e' was dropped before '-ing' (e.g., waking -> wake -> wakes,
  // waving -> wave -> waves). A short-vowel base like "cut" would double its final consonant in
  // -ing (handled by Rule 1), so an un-doubled vowel+consonant ending means a silent 'e' was
  // dropped. Vowel teams (eating -> eat -> eats) and w/y endings (blowing -> blows) are excluded.
  if (/[bcdfgklmnptvz]$/.test(stem)) {
    const vowel = stem[stem.length - 2];
    const before = stem[stem.length - 3];
    if (/[aeiou]/.test(vowel) && !(before && /[aeiou]/.test(before))) {
      return `${stem}es`;
    }
  }
  // Default fallback: stem + s
  return `${stem}s`;
}

export function formatWordDisplay(word: string, categoryId?: string, subId?: string): string {
  if (!word) return '';
  const lower = word.toLowerCase().trim();

  // Format Present Progressive: "____ is sleeping"
  if (categoryId === 'verbs' && subId && PROGRESSIVE_SUB_IDS.has(subId)) {
    return `____ is ${lower}`;
  }
  // Format 3rd Person Singular: "____ sleeps"
  if (categoryId === 'verbs' && subId && THIRD_PERSON_SUB_IDS.has(subId)) {
    const transformed = toThirdPersonSingular(lower);
    return `____ ${transformed}`;
  }

  // Pronouns: capitalize first letter and add a trailing period
  // ("he is baking" -> "He is baking.")
  if (categoryId === 'pronouns') {
    const withPeriod = lower.endsWith('.') ? lower : `${lower}.`;
    return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
  }

  return lower;
}
