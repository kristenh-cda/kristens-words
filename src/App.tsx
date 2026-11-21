import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { RotateCcw, ImageIcon } from 'lucide-react';
import {
  categories,
  findCategory,
  findSubcategory,
  getWordList,
  slugifyWord,
  displayLabel,
  categoryListFor,
  type Mode,
  type SoundCategory,
  type SelectableSource,
  type Subcategory,
} from '@/data/words';
import { ArrowLeftRight } from 'lucide-react';
import { r2ImagePaths, resolveFirstUrl } from '@/lib/images';
import { FilterBar } from '@/components/FilterBar';
import { Flashcard } from '@/components/Flashcard';
import { MultiFlashcard } from '@/components/MultiFlashcard';
import type { CardSlot } from '@/components/FlashcardView';
import { StatsBar } from '@/components/StatsBar';
import { MixedModePicker } from '@/components/MixedModePicker';
import { SceneGrid } from '@/components/SceneGrid';
import { SceneViewer } from '@/components/SceneViewer';
import { HideAndDescribe, randomPlayerPair, type Player } from '@/components/games/HideAndDescribe';
import { CustomSceneSetup, type CustomTarget } from '@/components/CustomSceneSetup';
import { CustomSceneBoard } from '@/components/CustomSceneBoard';
import { ActivitiesGrid } from '@/components/ActivitiesGrid';
import { MemoryGame } from '@/components/games/MemoryGame';
import { TicTacToeGame } from '@/components/games/TicTacToeGame';
import { ConnectFourGame } from '@/components/games/ConnectFourGame';
import { DiceGame } from '@/components/games/DiceGame';
import { DotsAndBoxesGame } from '@/components/games/DotsAndBoxesGame';
import { WhackAMoleGame } from '@/components/games/WhackAMoleGame';
import { HiddenTreasureGame } from '@/components/games/HiddenTreasureGame';
import { SpinnerGame } from '@/components/games/SpinnerGame';
import {
  FlashcardSettingsOverlay,
  SettingsIconButton,
  loadFlashcardSettings,
  saveFlashcardSettings,
  type FlashcardSettings,
} from '@/components/FlashcardSettings';

function FloralMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 9c0-2.5 1.2-4.5 3-5.5 0 2-1 4-3 5.5Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 9c0-2.5-1.2-4.5-3-5.5 0 2 1 4 3 5.5Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 9c0 0 2.2 1 3.8 3.2M12 9c0 0-2.2 1-3.8 3.2" />
      <path d="M12 12.2c1.2 2.4 1.2 4.8 0 7.8-1.2-3-1.2-5.4 0-7.8Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M12 12.2c1.2 2.4 1.2 4.8 0 7.8-1.2-3-1.2-5.4 0-7.8" />
    </svg>
  );
}

function firstGroupId(subId: string): string | null {
  for (const c of categories) {
    const s = c.subcategories.find((sub) => sub.id === subId);
    if (s?.groups?.length) return s.groups[0].id;
  }
  return null;
}

type MixedDeck = {
  words: string[];
  wordSources: { subId: string; groupId: string | null }[];
  sources: SelectableSource[];
};

export default function App() {
  const [mode, setMode] = useState<Mode>('Ready-Play-Speech');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  // Increments each time the deck wraps forward past the end (and decrements on
  // a backward wrap). Baked into card React keys so a card that reappears after
  // a full loop gets a fresh key, forcing React to remount it with stage=0.
  const [loopCount, setLoopCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [tries, setTries] = useState(0);
  const [seenSet, setSeenSet] = useState<Set<number>>(new Set());
  const [localShuffle, setLocalShuffle] = useState<string[] | null>(null);
  const [shuffled, setShuffled] = useState(false);
  const preShuffleOrder = useRef<{ words: string[]; sources: { subId: string; groupId: string | null }[] } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mixedDeck, setMixedDeck] = useState<MixedDeck | null>(null);
  const [showMixedPicker, setShowMixedPicker] = useState(false);
  const [showSceneGrid, setShowSceneGrid] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showTicTacToe, setShowTicTacToe] = useState(false);
  const [showConnectFour, setShowConnectFour] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [showWhackAMole, setShowWhackAMole] = useState(false);
  const [showHiddenTreasure, setShowHiddenTreasure] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [sceneGridMode, setSceneGridMode] = useState<'scenes' | 'hide' | 'custom'>('scenes');
  const [hidePlayers, setHidePlayers] = useState<[Player, Player] | null>(null);
  const [hideScores, setHideScores] = useState<[number, number]>([0, 0]);
  const [customSceneTitle, setCustomSceneTitle] = useState<string | null>(null);
  const [showCustomSetup, setShowCustomSetup] = useState(false);
  const [customTargets, setCustomTargets] = useState<CustomTarget[] | null>(null);
  const [settings, setSettings] = useState<FlashcardSettings>(loadFlashcardSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [multiDeck, setMultiDeck] = useState<MixedDeck | null>(null);

  const updateSettings = (patch: Partial<FlashcardSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveFlashcardSettings(next);
      return next;
    });
  };

  const cat = categoryId ? findCategory(categoryId) : undefined;
  const sub = cat && subId ? findSubcategory(cat, subId) : undefined;
  const isSceneCategory = cat?.kind === 'scene';
  const hasSelection = Boolean(cat && sub);

  // In mixed mode, words come from the mixed deck; otherwise from the selected
  // subcategory (or a locally shuffled copy when the user pressed Shuffle).
  const activeDeck = mixedDeck ?? multiDeck;
  const baseWords = activeDeck ? activeDeck.words : getWordList(sub, groupId);
  const words = activeDeck ? activeDeck.words : (localShuffle ?? baseWords);
  const total = words.length;
  const safeIndex = total > 0 ? Math.min(cardIndex, total - 1) : 0;
  const word = words[safeIndex] ?? '';

  // Resolve the SoundCategory + Subcategory for a given word index. In mixed mode,
  // each word may come from a different subcategory/category than the active one.
  const fallbackCat = cat ?? categoryListFor(mode)[0];
  const resolveContext = (i: number): { sc: SoundCategory; s: Subcategory | undefined; sid: string; gid: string | null } => {
    if (activeDeck) {
      const src = activeDeck.wordSources[i];
      const sc = src ? findCategory(activeDeck.sources.find((x) => x.subId === src.subId)?.categoryId ?? '') ?? fallbackCat : fallbackCat;
      const sid = src?.subId ?? subId ?? '';
      const gid = src?.groupId ?? null;
      const s = sid ? findSubcategory(sc, sid) : undefined;
      return { sc, s, sid, gid };
    }
    return { sc: fallbackCat, s: sub, sid: subId ?? '', gid: groupId };
  };

  const { sc: activeCategory, s: currentSub, sid: currentSubId, gid: currentGroupId } = resolveContext(safeIndex);

  // Determine subId/groupId for the NEXT card (for image preloading).
  const nextIndex = total > 0 ? (safeIndex + 1) % total : 0;
  const nextWord = words[nextIndex] ?? '';
  const nextCtx = resolveContext(nextIndex);
  const nextImageUrl = useMemo(
    () => (nextWord ? resolveFirstUrl(r2ImagePaths(nextWord, nextCtx.sc, nextCtx.s, nextCtx.gid)) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextWord, nextCtx.sc.id, nextCtx.sid, nextCtx.gid],
  );

  // Build the slots for multi-card display (page starting at safeIndex, up to cardCount).
  const pageCount = Math.min(cardCount, Math.max(total, 1));

  // Master deck: an array of card objects storing ONLY pure target metadata —
  // word, category, subcategory, groupId, and a unique id. No static image URLs
  // or exhausted attempt states are attached here; the image path is resolved
  // dynamically in the render component via r2ImagePaths so a card always
  // renders fresh from the primary R2 path, even on a second/third pass.
  // Swaps deep-copy the array, splice the card out of its slot, and push it to
  // the very end; the array length never changes, so slot indexing stays
  // stable and the next card naturally shifts into the emptied slot.
  type DeckCard = CardSlot & { id: string };
  const instCounter = useRef(0);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  // Swap queue: cards from the target pool not currently visible. Each swap
  // pulls from the front and pushes the swapped-out card to the back, cycling
  // through ALL targets before repeating. Reset on category/sub/group change.
  const swapQueueRef = useRef<DeckCard[]>([]);

  // Rebuild the deck whenever the underlying word list changes.
  useEffect(() => {
    const newDeck = words.map((w, i) => {
      const ctx = resolveContext(i);
      return {
        id: `inst-${++instCounter.current}`,
        word: w,
        category: ctx.sc,
        subId: ctx.sid,
        groupId: ctx.gid,
      };
    });
    setDeck(newDeck);
    // Reset the swap queue: empty until a swap is requested, then populated
    // lazily from the full target pool minus the current deck.
    swapQueueRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, mixedDeck, multiDeck, localShuffle]);

  const slots: CardSlot[] = useMemo(() => {
    if (total <= 0 || deck.length === 0) return [];
    const out: CardSlot[] = [];
    for (let k = 0; k < pageCount; k++) {
      const pos = (safeIndex + k) % total;
      const card = deck[pos];
      if (!card || !card.word) continue; // boundary guard: skip invalid/empty slots
      out.push(card);
    }
    return out;
  }, [deck, total, safeIndex, pageCount]);

  // Slots for the deck preview: every full card object in the deck.
  const deckSlots: CardSlot[] = useMemo(() => {
    if (deck.length === 0) return [];
    return deck;
  }, [deck]);

  // Compute display labels for the selected category path(s).
  const subLabels = useMemo(() => {
    if (activeDeck) {
      const labels = new Set<string>();
      for (const src of activeDeck.sources) {
        labels.add(displayLabel(src.categoryId, src.subId, src.groupId));
      }
      return Array.from(labels).filter(Boolean);
    }
    if (multiSelected.size > 0) {
      // Multi-select mode before a deck exists yet — show chosen paths.
      const labels = new Set<string>();
      for (const key of multiSelected) {
        const [sid, gid] = key.includes('::') ? [key.split('::')[0], key.split('::')[1]] : [key, null];
        labels.add(displayLabel(categoryId ?? '', sid, gid));
      }
      return Array.from(labels).filter(Boolean);
    }
    if (cat && sub) {
      return [displayLabel(cat.id, sub.id, groupId)];
    }
    return [];
  }, [activeDeck, multiSelected, categoryId, cat, sub, groupId]);

  // Default group under a subcategory prefers /ar/ (e.g. r-medial-ar) when present.
  const preferredGroupId = (s: { groups?: { id: string }[] } | undefined): string | null => {
    if (!s?.groups?.length) return null;
    const ar = s.groups.find((g) => g.id === 'ar' || g.id.endsWith('-ar'));
    return (ar ?? s.groups[0]).id;
  };

  const handleCategoryChange = (id: string) => {
    const nextCat = findCategory(id);
    if (!nextCat || nextCat.subcategories.length === 0) return;
    if (categoryId === id) {
      setMixedDeck(null);
      setLocalShuffle(null); setShuffled(false);
      setCategoryId(null);
      setSubId(null);
      setGroupId(null);
      setCardIndex(0);
      setCorrect(0);
      setTries(0);
      setSeenSet(new Set());
      return;
    }
    const c = nextCat;
    const firstSub = c.subcategories[0];
    setMixedDeck(null);
    setLocalShuffle(null); setShuffled(false);
    setCategoryId(id);
    setSubId(firstSub.id);
    setGroupId(preferredGroupId(firstSub));
    setCardIndex(0);
    setCorrect(0);
    setTries(0);
    setSeenSet(new Set());
  };

  const handleSubChange = (id: string) => {
    const s = cat ? findSubcategory(cat, id) : undefined;
    setMixedDeck(null);
    setLocalShuffle(null); setShuffled(false);
    setSubId(id);
    setGroupId(preferredGroupId(s));
    setCardIndex(0);
    setCorrect(0);
    setTries(0);
    setSeenSet(new Set());
  };

  const handleGroupChange = (id: string) => {
    setMixedDeck(null);
    setLocalShuffle(null); setShuffled(false);
    setGroupId(id);
    setCardIndex(0);
  };

  const handleMultiToggleSub = (id: string) => {
    const s = cat ? findSubcategory(cat, id) : undefined;
    if (!s) return;
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (!s.words && s.groups) {
        // Selecting a subcategory also selects all of its sub-sounds;
        // deselecting removes the subcategory and every sub-sound.
        const keys = [s.id, ...s.groups.map((g) => `${s.id}::${g.id}`)];
        const allSelected = keys.every((k) => next.has(k));
        keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      } else {
        if (next.has(s.id)) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  };

  const handleMultiToggleGroup = (sid: string, gid: string) => {
    const key = `${sid}::${gid}`;
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartMixed = (shuffledWords: string[], sources: SelectableSource[]) => {
    const wordToSource = new Map<string, { subId: string; groupId: string | null }>();
    for (const s of sources) {
      for (const w of s.words) {
        if (!wordToSource.has(slugifyWord(w))) {
          wordToSource.set(slugifyWord(w), { subId: s.subId, groupId: s.groupId });
        }
      }
    }
    const wordSources = shuffledWords.map((w) => wordToSource.get(slugifyWord(w)) ?? { subId: subId ?? '', groupId });
    setMixedDeck({ words: shuffledWords, wordSources, sources });
    setShuffled(false);
    setCardIndex(0);
    setSeenSet(new Set());
    setShowMixedPicker(false);
  };

  const swapMode = () => {
    setMode((m) => (m === 'language' ? 'speech' : 'language'));
    setMixedDeck(null);
    setLocalShuffle(null); setShuffled(false);
    setCategoryId(null);
    setSubId(null);
    setGroupId(null);
    setCardIndex(0);
    setCorrect(0);
    setTries(0);
    setSeenSet(new Set());
    setFullscreen(false);
  };

  const exitMixed = () => {
    setMixedDeck(null);
    setLocalShuffle(null); setShuffled(false);
    setCardIndex(0);
    setSeenSet(new Set());
  };

  const markSeen = (i: number) =>
    setSeenSet((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const next = () => {
    if (cardCount > 1) {
      for (let k = 0; k < pageCount; k++) markSeen((safeIndex + k) % total);
      const nextStart = safeIndex + pageCount;
      if (nextStart >= total) {
        setCardIndex(0);
        setLoopCount((c) => c + 1);
      } else {
        setCardIndex(nextStart);
      }
      return;
    }
    markSeen(safeIndex);
    if (safeIndex >= total - 1) setLoopCount((c) => c + 1);
    setCardIndex((i) => (i + 1) % total);
  };
  const prev = () => {
    if (cardCount > 1) {
      const prevStart = safeIndex - pageCount;
      if (prevStart < 0) setLoopCount((c) => c - 1);
      setCardIndex(prevStart < 0 ? 0 : prevStart);
      return;
    }
    if (safeIndex <= 0) setLoopCount((c) => c - 1);
    setCardIndex((i) => (i - 1 + total) % total);
  };

  // Build the full target pool for the current selection (all words in the
  // active subcategory/group, not just the ones in the deck). Used to seed the
  // swap queue on the first swap.
  const buildSwapPool = (): DeckCard[] => {
    if (activeDeck) {
      // In mixed/multi mode, the pool is the entire deck's word list.
      return words.map((w, i) => {
        const ctx = resolveContext(i);
        return {
          id: `pool-${i}-${Date.now()}`,
          word: w,
          category: ctx.sc,
          subId: ctx.sid,
          groupId: ctx.gid,
        };
      });
    }
    // Single-category mode: pool is all words in the selected sub/group.
    const poolWords = getWordList(sub, groupId);
    return poolWords.map((w) => {
      const ctx = resolveContext(0);
      return {
        id: `pool-${w}-${Date.now()}`,
        word: w,
        category: ctx.sc,
        subId: ctx.sid,
        groupId: ctx.gid,
      };
    });
  };

  // Queue-based swap: pull the next unused card from the front of the queue,
  // replace slot i in place, and push the swapped-out card to the back.
  const handleSwapCard = (pageOffset: number) => {
    if (total < 2 || deck.length < 2) return;
    if (pageOffset < 0 || pageOffset >= pageCount) return;
    const i = (safeIndex + pageOffset) % total;
    const newDeck = [...deck];
    const originalCard = newDeck[i];
    if (!originalCard) return;

    // Lazily seed the swap queue on first use with all pool cards not in the deck.
    if (swapQueueRef.current.length === 0) {
      const pool = buildSwapPool();
      const deckWords = new Set(deck.map((c) => c.word));
      swapQueueRef.current = pool.filter((c) => !deckWords.has(c.word));
      // If the pool is smaller than or equal to the deck, replenish with the
      // full pool so swapping always has something to show.
      if (swapQueueRef.current.length === 0) {
        swapQueueRef.current = pool.filter((c) => c.word !== originalCard.word);
      }
    }

    // Take the next card from the front of the queue.
    const nextCard = swapQueueRef.current.shift();
    if (!nextCard) return;

    // Replace slot i in place — no index shifting.
    newDeck[i] = { ...nextCard, id: `${nextCard.word}-${Date.now()}` };
    // Push the original card to the back of the queue so it cycles back.
    swapQueueRef.current.push(originalCard);
    setDeck(newDeck);
  };

  const resetSession = () => {
    setCorrect(0);
    setTries(0);
    setSeenSet(new Set());
    setCardIndex(0);
  };

  // Replace the active deck with only the user-selected preview cards.
  const handleConfirmSelection = useCallback((selected: CardSlot[]) => {
    if (selected.length === 0) return;
    const newDeck = selected.map((s) => ({
      id: `sel-${++instCounter.current}`,
      word: s.word,
      category: s.category,
      subId: s.subId,
      groupId: s.groupId,
    }));
    setDeck(newDeck);
    swapQueueRef.current = [];
    setCardIndex(0);
    setSeenSet(new Set());
    setCorrect(0);
    setTries(0);
    // Override the word list so total/safeIndex reflect the filtered deck.
    if (mixedDeck) {
      setMixedDeck({
        ...mixedDeck,
        words: newDeck.map((c) => c.word),
        wordSources: newDeck.map((c) => ({ subId: c.subId, groupId: c.groupId })),
      });
    } else if (multiDeck) {
      setMultiDeck({
        ...multiDeck,
        words: newDeck.map((c) => c.word),
        wordSources: newDeck.map((c) => ({ subId: c.subId, groupId: c.groupId })),
      });
    } else {
      setLocalShuffle(newDeck.map((c) => c.word));
    }
  }, [mixedDeck, multiDeck]);

  // Deck for multi-select mode: every selected subcategory/group, shuffled together.
  useEffect(() => {
    if (multiSelected.size === 0) {
      setMultiDeck((d) => (d ? null : d));
      return;
    }
    const sources: SelectableSource[] = [];
    for (const key of multiSelected) {
      const [sid, gid] = key.includes('::') ? [key.split('::')[0], key.split('::')[1]] : [key, null];
      for (const c of categoryListFor(mode)) {
        const s = findSubcategory(c, sid);
        if (!s) continue;
        if (!gid && s.groups) {
          // A whole subcategory selected in multi mode: every sub-sound joins the deck.
          for (const g of s.groups) {
            sources.push({
              categoryId: c.id,
              categoryLabel: c.label,
              subId: s.id,
              subLabel: s.label,
              groupId: g.id,
              groupLabel: g.label,
              words: g.words,
              accent: c.accent,
              accentSoft: c.accentSoft,
            });
          }
          break;
        }
        if (gid) {
          const g = s.groups?.find((gr) => gr.id === gid);
          if (!g) continue;
          sources.push({
            categoryId: c.id,
            categoryLabel: c.label,
            subId: s.id,
            subLabel: s.label,
            groupId: g.id,
            groupLabel: g.label,
            words: g.words,
            accent: c.accent,
            accentSoft: c.accentSoft,
          });
        } else if (s.words) {
          sources.push({
            categoryId: c.id,
            categoryLabel: c.label,
            subId: s.id,
            subLabel: s.label,
            groupId: null,
            groupLabel: null,
            words: s.words,
            accent: c.accent,
            accentSoft: c.accentSoft,
          });
        }
        break;
      }
    }
    if (sources.length === 0) {
      setMultiDeck(null);
      return;
    }
    const wordToSource = new Map<string, { subId: string; groupId: string | null }>();
    for (const s of sources) {
      for (const w of s.words) {
        if (!wordToSource.has(slugifyWord(w))) {
          wordToSource.set(slugifyWord(w), { subId: s.subId, groupId: s.groupId });
        }
      }
    }
    const pool: string[] = [];
    const wordSources: { subId: string; groupId: string | null }[] = [];
    for (const s of sources) {
      for (const w of s.words) {
        pool.push(w);
        wordSources.push(wordToSource.get(slugifyWord(w)) ?? { subId: s.subId, groupId: s.groupId });
      }
    }
    const indices = Array.from({ length: pool.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setMultiDeck({
      words: indices.map((i) => pool[i]),
      wordSources: indices.map((i) => wordSources[i]),
      sources,
    });
    setCardIndex(0);
    setSeenSet(new Set());
    setLocalShuffle(null); setShuffled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiSelected, multiMode, mode]);

  const toggleMultiMode = () => {
    setMultiMode((m) => {
      if (m) {
        // Leaving multi-select clears its selections and any deck it built.
        setMultiSelected(new Set());
        setMultiDeck(null);
      }
      return !m;
    });
  };

  const shuffleDeck = () => {
    if (total <= 1) return;
    const current = activeDeck;
    if (!shuffled) {
      preShuffleOrder.current = current
        ? { words: [...current.words], sources: current.wordSources.map((s) => ({ ...s })) }
        : { words: [...baseWords], sources: [] };
    }
    setShuffled(true);
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (mixedDeck) {
      setMixedDeck({
        ...mixedDeck,
        words: indices.map((i) => mixedDeck.words[i]),
        wordSources: indices.map((i) => mixedDeck.wordSources[i]),
      });
    } else if (multiDeck) {
      setMultiDeck({
        ...multiDeck,
        words: indices.map((i) => multiDeck.words[i]),
        wordSources: indices.map((i) => multiDeck.wordSources[i]),
      });
    } else {
      const baseWords = getWordList(sub, groupId);
      const shuffled = indices.map((i) => baseWords[i]);
      setLocalShuffle(shuffled);
    }
    setCardIndex(0);
    setSeenSet(new Set());
  };

  const unshuffleDeck = () => {
    const saved = preShuffleOrder.current;
    if (!saved) return;
    if (mixedDeck) {
      setMixedDeck({ ...mixedDeck, words: saved.words, wordSources: saved.sources });
    } else if (multiDeck) {
      setMultiDeck({ ...multiDeck, words: saved.words, wordSources: saved.sources });
    } else {
      setLocalShuffle(null);
    }
    setShuffled(false);
    setCardIndex(0);
    setSeenSet(new Set());
  };

  const keyboardHandler = useMemo(
    () => (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeIndex, total, fullscreen, cardCount, pageCount],
  );

  return (
    <div className="min-h-screen relative flex flex-col pt-[env(safe-area-inset-top)]" tabIndex={0} onKeyDown={keyboardHandler}>
      <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
        <img
          src="https://pub-c53fff4920214dd59d4a14590b17acae.r2.dev/seasonal/background.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-100/0 via-gray-100/0 to-gray-100/0" />
      </div>
      <header className="w-full bg-gradient-to-b from-white/100 via-white/80 to-white/60 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/ready-play-speech.png"
              alt=""
              className="w-8 h-8 object-contain"
              draggable={false}
            />
            <h1 className="font-title text-[30px] text-gray-600 leading-tight tracking-tight">
              Kristen's Words
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={swapMode}
              aria-label="Switch between speech sounds and language"
              title="Switch between speech sounds and language"
              className="w-9 h-9 shrink-0 rounded-full bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center shadow-sm transition-all active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <StatsBar correct={correct} tries={tries} onReset={resetSession} />
          </div>
        </div>
      </header>

      {/* Filter bar stays available at all times so the word list can be changed mid-session */}
      {(
        <FilterBar
          mode={mode}
          categoryId={categoryId}
          subId={subId}
          groupId={groupId}
          multiMode={multiMode}
          multiSelected={multiSelected}
          onToggleMultiMode={toggleMultiMode}
          onMultiToggleSub={handleMultiToggleSub}
          onMultiToggleGroup={handleMultiToggleGroup}
          onCategoryChange={handleCategoryChange}
          onSubChange={handleSubChange}
          onGroupChange={handleGroupChange}
          onShowMixed={() => setShowMixedPicker(true)}
          onShowScenes={() => setShowSceneGrid(true)}
          onShowActivities={() => setShowActivities(true)}
          onClearSelection={() => {
            setCategoryId(null);
            setSubId(null);
            setGroupId(null);
            setMixedDeck(null);
            setLocalShuffle(null); setShuffled(false);
            setMultiSelected(new Set());
            setCardIndex(0);
          }}
        />
      )}

      {/* Lobby centered in the space between the header/filters and the bottom of the screen; min-h ensures it never overlaps the header/filter bar above */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-4 pb-6">
        <div className="w-full max-w-5xl max-h-full overflow-y-auto">
          {isSceneCategory ? (
            <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 mx-auto mb-4 flex items-center justify-center text-white">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Picture Scenes</h2>
              <p className="text-sm text-gray-500 mb-6">
                Open the gallery to pick a scene. Drag chips onto the picture to mark things you find.
              </p>
              <button
                onClick={() => setShowSceneGrid(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors active:scale-95"
              >
                <ImageIcon className="w-4 h-4" />
                Open scene gallery
              </button>
            </div>
          ) : hasSelection || activeDeck || multiSelected.size > 0 ? (
            cardCount > 1 ? (
              <MultiFlashcard
                slots={slots}
                total={total}
                start={safeIndex}
                loopCount={loopCount}
                pageSize={pageCount}
                seenSet={seenSet}
                fullscreen={fullscreen}
                cardCount={cardCount}
                onCardCountChange={setCardCount}
                subLabels={subLabels}
                previewSlots={deckSlots}
                onNext={next}
                onPrev={prev}
                onShuffle={shuffleDeck} onUnshuffle={unshuffleDeck} shuffled={shuffled} showMixedBadge={Boolean(activeDeck)}
                onCorrect={() => setCorrect((c) => c + 1)}
                onTryAgain={() => setTries((t) => t + 1)}
                onSeen={markSeen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
                onSwapCard={handleSwapCard}
                settings={settings}
                onShowSettings={() => setShowSettings(true)}
                onConfirmSelection={handleConfirmSelection}
              />
            ) : (
              <Flashcard
                key={activeDeck ? `mixed-${safeIndex}-p${loopCount}` : `${categoryId}-${subId}-${groupId}-${safeIndex}-p${loopCount}`}
                word={word}
                category={activeCategory}
                subId={currentSubId}
                groupId={currentGroupId}
                index={safeIndex}
                total={total}
                seenSet={seenSet}
                fullscreen={fullscreen}
                cardCount={cardCount}
                onCardCountChange={setCardCount}
                subLabels={subLabels}
                previewSlots={deckSlots}
                nextImageUrl={nextImageUrl}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
                onCorrect={() => setCorrect((c) => c + 1)}
                onTryAgain={() => setTries((t) => t + 1)}
                onNext={next}
                onPrev={prev}
                onJump={(i) => setCardIndex(i)}
                onShuffle={shuffleDeck} onUnshuffle={unshuffleDeck} shuffled={shuffled} showMixedBadge={Boolean(activeDeck)}
                settings={settings}
                onShowSettings={() => setShowSettings(true)}
                onConfirmSelection={handleConfirmSelection}
              />
            )
          ) : null}
        </div>
      </main>

      {showMixedPicker && (
        <MixedModePicker mode={mode} onStart={handleStartMixed} onClose={() => setShowMixedPicker(false)} />
      )}

      <FlashcardSettingsOverlay
        open={showSettings}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setShowSettings(false)}
      />

      {showSceneGrid && !activeScene && (
        <SceneGrid
          mode={sceneGridMode}
          onModeChange={setSceneGridMode}
          onPickScene={(title, gridMode) => {
            if (gridMode === 'custom') {
              setCustomSceneTitle(title);
              setShowCustomSetup(true);
              return;
            }
            if (gridMode === 'hide') {
              setHidePlayers((prev) => prev ?? randomPlayerPair());
            } else {
              setHidePlayers(null);
              setHideScores([0, 0]);
            }
            setActiveScene(title);
            setShowSceneGrid(false);
          }}
          onClose={() => {
            setShowSceneGrid(false);
            setSceneGridMode('scenes');
            setHidePlayers(null);
            setHideScores([0, 0]);
          }}
        />
      )}

      {activeScene && hidePlayers && (
        <HideAndDescribe
          title={activeScene}
          players={hidePlayers}
          scores={hideScores}
          onPlayersChange={setHidePlayers}
          onScore={(p, delta) =>
            setHideScores((prev) => {
              const next: [number, number] = [...prev];
              next[p] += delta;
              return next;
            })
          }
          onBack={() => {
            setActiveScene(null);
            setShowSceneGrid(true);
          }}
          onClose={() => {
            setActiveScene(null);
            setHidePlayers(null);
            setHideScores([0, 0]);
          }}
        />
      )}

      {activeScene && !hidePlayers && (
        <SceneViewer
          title={activeScene}
          onClose={() => setActiveScene(null)}
          onBack={() => {
            setActiveScene(null);
            setShowSceneGrid(true);
          }}
          onCorrect={() => setCorrect((c) => c + 1)}
          onTryAgain={() => setTries((t) => t + 1)}
        />
      )}

      {showCustomSetup && customSceneTitle && (
        <CustomSceneSetup
          mode={mode}
          onDone={(targets) => {
            setCustomTargets(targets);
            setShowCustomSetup(false);
            setShowSceneGrid(false);
          }}
          onClose={() => {
            setShowCustomSetup(false);
            setCustomSceneTitle(null);
          }}
        />
      )}

      {customSceneTitle && customTargets && !showCustomSetup && (
        <CustomSceneBoard
          sceneTitle={customSceneTitle}
          targets={customTargets}
          onBack={() => {
            setCustomTargets(null);
            setCustomSceneTitle(null);
            setShowSceneGrid(true);
            setSceneGridMode('custom');
          }}
          onClose={() => {
            setCustomTargets(null);
            setCustomSceneTitle(null);
            setShowCustomSetup(false);
          }}
          onCorrect={() => setCorrect((c) => c + 1)}
          onTryAgain={() => setTries((t) => t + 1)}
        />
      )}

      {/* Reopening the scene grid must restore Hide & Describe when that mode was active */}

      {showActivities && (
        <ActivitiesGrid
          onClose={() => setShowActivities(false)}
          onLaunchSpinner={() => {
            setShowActivities(false);
            setShowSpinner(true);
          }}
          onLaunchMemory={() => {
            setShowActivities(false);
            setShowMemoryGame(true);
          }}
          onLaunchTicTacToe={() => {
            setShowActivities(false);
            setShowTicTacToe(true);
          }}
          onLaunchConnectFour={() => {
            setShowActivities(false);
            setShowConnectFour(true);
          }}
          onLaunchDice={() => {
            setShowActivities(false);
            setShowDice(true);
          }}
          onLaunchDots={() => {
            setShowActivities(false);
            setShowDots(true);
          }}
          onLaunchWhackAMole={() => {
            setShowActivities(false);
            setShowWhackAMole(true);
          }}
          onLaunchHiddenTreasure={() => {
            setShowActivities(false);
            setShowHiddenTreasure(true);
          }}
        />
      )}

      {showMemoryGame && <MemoryGame mode={mode} onClose={() => setShowMemoryGame(false)} />}

      {showSpinner && <SpinnerGame mode={mode} onClose={() => setShowSpinner(false)} />}

      {showTicTacToe && <TicTacToeGame mode={mode} onClose={() => setShowTicTacToe(false)} />}

      {showConnectFour && <ConnectFourGame mode={mode} onClose={() => setShowConnectFour(false)} />}

      {showDice && <DiceGame mode={mode} onClose={() => setShowDice(false)} />}

      {showDots && <DotsAndBoxesGame mode={mode} onClose={() => setShowDots(false)} />}

      {showWhackAMole && <WhackAMoleGame mode={mode} onClose={() => setShowWhackAMole(false)} />}

      {showHiddenTreasure && <HiddenTreasureGame mode={mode} onClose={() => setShowHiddenTreasure(false)} />}
    </div>
  );
}
