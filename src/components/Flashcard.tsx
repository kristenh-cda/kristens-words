import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Minus,
  ChevronLeft,
  ChevronRight,
  Shuffle as ShuffleIcon,
  Layers,
  Undo2,
  X,
  PlayCircle,
} from 'lucide-react';
import { findSubcategory, type SoundCategory } from '@/data/words';
import { useRecorder } from '@/hooks/useRecorder';
import { RecordingControls } from '@/components/RecordingControls';
import { CardCountStepper } from '@/components/CardCountStepper';
import { DeckPreview } from '@/components/DeckPreview';
import { GamesIcon } from '@/components/GamesIcon';
import { DataStats } from '@/components/DataStats';
import type { CardSlot } from '@/components/FlashcardView';
import {
  r2ImagePaths,
  prefetchR2Image,
  preloadImage,
  applyRememberedStage,
  rememberSuccess,
  PLACEHOLDER_DATA_URI,
} from '@/lib/images';
import { formatWordDisplay } from '@/lib/formatters';
import { SettingsIconButton, type FlashcardSettings } from '@/components/FlashcardSettings';

type Props = {
  word: string;
  category: SoundCategory;
  subId: string;
  groupId: string | null;
  index: number;
  total: number;
  correct: number;
  tries: number;
  seenSet: Set<number>;
  fullscreen: boolean;
  cardCount: number;
  onCardCountChange: (n: number) => void;
  /** Sub-most category labels selected (e.g. ["/gr/"] or ["/gr/", "/kr/"]). */
  subLabels: string[];
  /** Slots for deck preview. */
  previewSlots: CardSlot[];
  /** The next card's first image URL, for preloading into the browser cache. */
  nextImageUrl?: string;
  onToggleFullscreen: () => void;
  onCorrect: () => void;
  onTryAgain: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJump: (i: number) => void;
  onShuffle?: () => void;
  onUnshuffle?: () => void;
  shuffled?: boolean;
  showMixedBadge?: boolean;
  settings: FlashcardSettings;
  onShowSettings: () => void;
  onConfirmSelection?: (selected: CardSlot[]) => void;
};

const SWIPE_MS = 180;
const SWIPE_THRESHOLD = 80;

export function Flashcard({
  word,
  category,
  subId,
  groupId,
  index,
  total,
  correct,
  tries,
  seenSet,
  fullscreen,
  cardCount,
  onCardCountChange,
  subLabels,
  previewSlots,
  nextImageUrl,
  onToggleFullscreen,
  onCorrect,
  onTryAgain,
  onNext,
  onPrev,
  onJump,
  onShuffle,
  onUnshuffle,
  shuffled,
  showMixedBadge,
  settings,
  onShowSettings,
  onConfirmSelection,
}: Props) {
  const recorder = useRecorder();
  const { error } = recorder;

  const sub = useMemo(() => findSubcategory(category, subId), [category, subId]);
  const plan = useMemo(() => r2ImagePaths(word, category, sub, groupId ?? null), [word, category, sub, groupId]);

  const attempts = useMemo(() => applyRememberedStage(plan), [plan]);

  const [stage, setStage] = useState(0);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [swipe, setSwipe] = useState<'left' | 'right' | null>(null);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const failedImageUrlsRef = useRef(new Set<string>());
  const attempt = attempts[stage];

  useEffect(() => {
    failedImageUrlsRef.current.clear();
    setStage(0);
    setImageStatus('loading');
  }, [plan]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) {
      setImageStatus('loaded');
    } else if (attempt?.url && !failedImageUrlsRef.current.has(attempt.url)) {
      failedImageUrlsRef.current.add(attempt.url);
      setStage((prev) => Math.min(prev + 1, attempts.length - 1));
    }
  }, [attempt?.url, attempts.length]);

  const isIconStage = attempt?.stage === 'icon' || stage >= attempts.length - 1;
  const isPlaceholderStage = attempt?.stage === 'placeholder';
  const isFallback = isPlaceholderStage || isIconStage;

  const handleImgLoad = () => {
    setImageStatus('loaded');
    if (attempt && attempt.stage !== 'icon' && attempt.stage !== 'placeholder') {
      rememberSuccess(plan.sound, plan.position, attempt.stage, plan.wordKey);
    }
  };

  const handleImgError = () => {
    if (attempt?.url && failedImageUrlsRef.current.has(attempt.url)) return;
    if (attempt?.url) failedImageUrlsRef.current.add(attempt.url);
    setImageStatus('error');
    setStage((prev) => Math.min(prev + 1, attempts.length - 1));
  };

  useEffect(() => {
    if (plan.firstUrl) prefetchR2Image(plan.firstUrl);
  }, [plan.firstUrl]);

  useEffect(() => {
    if (!nextImageUrl) return;
    preloadImage(nextImageUrl);
  }, [nextImageUrl]);

  const goNext = () => {
    if (swipe) return;
    setSwipe('left');
    setTimeout(() => {
      onNext();
      setSwipe(null);
      setEnterFrom('right');
    }, SWIPE_MS);
  };
  const goPrev = () => {
    if (swipe) return;
    setSwipe('right');
    setTimeout(() => {
      onPrev();
      setSwipe(null);
      setEnterFrom('left');
    }, SWIPE_MS);
  };

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) {
      touchStart.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    touchStart.current = null;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (dx < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  const recordButton = () => {
    return <RecordingControls {...recorder} />;
  };

  const isScene = category.kind === 'scene';

  const feedbackButtons = (
    <>
      <button onClick={onCorrect} className="action-btn bg-green-500 hover:bg-green-600 active:scale-95">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onTryAgain} className="action-btn bg-orange-500 hover:bg-orange-600 active:scale-95">
        <Minus className="w-4 h-4" />
      </button>
    </>
  );

  const card = (
    <div
      className={`relative bg-white overflow-hidden transition-all duration-300 flex flex-col ring-1 ring-gray-100 w-full h-full rounded-2xl`}
    >
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-white">
        {isIconStage || imageStatus === 'error' ? (
          <img
            key={`${word}-placeholder`}
            src={PLACEHOLDER_DATA_URI}
            alt={word}
            className="w-full h-full object-contain p-6 select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <img
            key={`${word}-${index}-${attempt.url}`}
            ref={imgRef}
            src={attempt.url ?? undefined}
            alt={isFallback ? `Placeholder for ${word}` : word}
            width={isScene ? 1600 : 1200}
            height={isScene ? 1000 : 1200}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onError={handleImgError}
            onLoad={handleImgLoad}
            className={`w-full h-full object-contain transition-opacity duration-200 select-none pointer-events-none ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            } ${isFallback ? 'p-6' : ''}`}
          />
        )}
        {isPlaceholderStage && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gray-900/70 text-[11px] text-white uppercase tracking-widest">
            No image
          </p>
        )}
      </div>

      <div className={`shrink-0 text-center px-6 py-3 sm:py-4 ${settings.showText ? '' : 'py-1'}`}>
        {settings.showText && (
          <h2 className="font-medium text-gray-800 tracking-tight text-balance text-3xl sm:text-4xl xl:text-6xl">
            {formatWordDisplay(word, category.id, subId)}
          </h2>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div
            key={`${index}-${enterFrom ?? 'static'}`}
            className={`w-full h-full transition-all duration-200 ease-in ${
              swipe === 'left'
                ? '-translate-x-full opacity-0'
                : swipe === 'right'
                ? 'translate-x-full opacity-0'
                : enterFrom === 'left'
                ? 'animate-card-enter-left'
                : enterFrom === 'right'
                ? 'animate-card-enter-right'
                : 'translate-x-0 opacity-100'
            }`}
          >
            {card}
          </div>
        </div>

        {/* Bottom bar (not overlay) */}
        <div className="shrink-0 bg-black/60 backdrop-blur px-3 py-3">
          <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-1 sm:gap-4 sm:px-2 lg:px-6 2xl:px-10">
            {/* Left corner: mic (optional) + check/dash when anchored left */}
            <div className="flex items-center gap-2">
              {settings.showRecordButton && recordButton()}
              {settings.feedbackButtons === 'left' && feedbackButtons}
            </div>

            {/* Centered prev / next (plus check/dash when centered) */}
            <div className="min-w-0 flex flex-wrap items-center justify-center gap-2">
              {settings.feedbackButtons === 'center' && feedbackButtons}
              <button onClick={goPrev} className="action-btn px-8 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-full bg-gray-800 text-white text-sm font-semibold tabular-nums">
                {index + 1}/{total}
              </span>
              <button onClick={goNext} className="action-btn px-8 bg-gray-700 text-white hover:bg-gray-800 active:scale-95">
                <ChevronRight className="w-4 h-4" />
              </button>
              {settings.showDataPill && <DataStats correct={correct} tries={tries} />}
            </div>

            {/* Right corner: check/dash when anchored right, then exit */}
            <div className="flex items-center justify-end gap-2 justify-self-end">
              {settings.feedbackButtons === 'right' && feedbackButtons}
              <button
                onClick={onToggleFullscreen}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-500 transition-colors hover:text-gray-400 active:scale-95"
                title="Exit fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && <p className="mt-1 text-center text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  // Regular (non-fullscreen) view: compact lobby.
  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Card counter stepper */}
          <CardCountStepper value={cardCount} min={1} max={10} onChange={onCardCountChange} />

          {onShuffle && (
            <>
              <button
                onClick={onShuffle}
                className={`inline-flex items-center gap-2 px-4 h-10 rounded-full text-lg font-semibold transition-colors active:scale-95 border ${
                  shuffled
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-300 hover:bg-indigo-700'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
                title={shuffled ? 'Deck is shuffled' : 'Shuffle the deck'}
              >
                <ShuffleIcon className="w-5 h-5" />
                {shuffled ? 'Shuffled' : 'Shuffle'}
              </button>
              {shuffled && onUnshuffle && (
                <button
                  onClick={onUnshuffle}
                  className="w-10 h-10 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-800 flex items-center justify-center transition-colors active:scale-95"
                  title="Un-shuffle the deck"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {showMixedBadge && (
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-indigo-600 text-white" title="Mixed mode">
              <Layers className="w-3.5 h-3.5" />
            </span>
          )}
          {/* Sub-most category labels */}
          {subLabels.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {subLabels.join(', ')}
            </span>
          )}

          {/* Card count text */}
          <span className="px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium tabular-nums">
            {total} cards
          </span>

          <SettingsIconButton onClick={onShowSettings} />
        </div>

        <div className="flex items-center justify-center gap-3">
          <DeckPreview slots={previewSlots} total={total} onConfirmSelection={onConfirmSelection} />
          <button
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-[#4a5378] text-white text-2xl font-semibold hover:bg-[#3d4568] active:scale-95 transition-colors shadow-lg"
          >
            <PlayCircle className="w-8 h-8" />
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
