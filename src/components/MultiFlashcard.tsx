import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Shuffle, Check, Minus, X, PlayCircle, RefreshCw, Layers, Undo2 } from 'lucide-react';
import { FlashcardView, type CardSlot } from '@/components/FlashcardView';
import { CardCountStepper } from '@/components/CardCountStepper';
import { DeckPreview } from '@/components/DeckPreview';
import { GamesIcon } from '@/components/GamesIcon';
import { DataStats } from '@/components/DataStats';
import { useRecorder } from '@/hooks/useRecorder';
import { RecordingControls } from '@/components/RecordingControls';
import { SettingsIconButton, type FlashcardSettings } from '@/components/FlashcardSettings';

type Props = {
  slots: CardSlot[];
  total: number; // total words in the deck
  correct: number;
  tries: number;
  start: number; // global index of the first slot shown
  loopCount: number; // increments on each deck wrap; baked into card keys for fresh remounts
  pageSize: number;
  seenSet: Set<number>;
  fullscreen: boolean;
  cardCount: number;
  onCardCountChange: (n: number) => void;
  /** Sub-most category labels selected (e.g. ["/gr/", "/kr/"]). */
  subLabels: string[];
  /** Slots for deck preview. */
  previewSlots: CardSlot[];
  onNext: () => void;
  onPrev: () => void;
  onShuffle?: () => void;
  onUnshuffle?: () => void;
  shuffled?: boolean;
  showMixedBadge?: boolean;
  onCorrect: () => void;
  onTryAgain: () => void;
  onSeen: (i: number) => void;
  onToggleFullscreen: () => void;
  onSwapCard?: (pageOffset: number) => void;
  settings: FlashcardSettings;
  onShowSettings: () => void;
  onConfirmSelection?: (selected: CardSlot[]) => void;
};

const SWIPE_MS = 180;
const SWIPE_THRESHOLD = 80;

export function MultiFlashcard({
  slots,
  total,
  correct,
  tries,
  start,
  loopCount,
  pageSize,
  seenSet,
  fullscreen,
  cardCount,
  onCardCountChange,
  subLabels,
  previewSlots,
  onNext,
  onPrev,
  onShuffle,
  onUnshuffle,
  shuffled,
  showMixedBadge,
  onCorrect,
  onTryAgain,
  onSeen,
  onToggleFullscreen,
  onSwapCard,
  settings,
  onShowSettings,
  onConfirmSelection,
}: Props) {
  const recorder = useRecorder();
  const { error } = recorder;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipe, setSwipe] = useState<'left' | 'right' | null>(null);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);

  const visibleCardCount = slots.length;
  const gridCols =
    visibleCardCount === 9
      ? 'grid-cols-3 lg:grid-cols-5'
      : visibleCardCount > 6
      ? visibleCardCount <= 8
        ? 'grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4'
        : 'grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
      : visibleCardCount === 1
      ? 'grid-cols-1'
      : visibleCardCount === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : visibleCardCount === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : visibleCardCount === 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3';

  const canPrev = total > 0;
  const canNext = total > 0;

  const goNext = () => {
    if (swipe || !canNext) return;
    setSwipe('left');
    setTimeout(() => {
      onNext();
      setSwipe(null);
      setEnterFrom('right');
    }, SWIPE_MS);
  };
  const goPrev = () => {
    if (swipe || !canPrev) return;
    setSwipe('right');
    setTimeout(() => {
      onPrev();
      setSwipe(null);
      setEnterFrom('left');
    }, SWIPE_MS);
  };

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

  const fitWrapperClass = 'w-full h-full min-h-0 flex items-stretch justify-center';

  const fitGridClass = `grid ${gridCols} gap-2 sm:gap-3 w-full h-full min-h-0`;

  const swipeClass =
    swipe === 'left'
      ? '-translate-x-full opacity-0'
      : swipe === 'right'
      ? 'translate-x-full opacity-0'
      : enterFrom === 'left'
      ? 'animate-card-enter-left'
      : enterFrom === 'right'
      ? 'animate-card-enter-right'
      : 'translate-x-0 opacity-100';

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        <div
          className="flex-1 min-h-0 p-1 sm:p-2 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={`${start}-${enterFrom ?? 'static'}`}
            className={`w-full h-full transition-all duration-200 ease-in ${swipeClass}`}
          >
            <div className={fitWrapperClass}>
              <div className={fitGridClass} style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
                {slots.map((slot, i) => {
                  const globalIndex = start + i;
                  return (
                    <div key={`${slot.id ?? (slot.inst !== undefined ? `inst-${slot.inst}` : `${globalIndex}-${slot.word}`)}-p${loopCount}-${i}`} className="relative min-h-0 min-w-0 h-full">
                      <FlashcardView
                        slot={slot}
                        index={globalIndex}
                        total={total}
                        seen={seenSet.has(globalIndex)}
                        fullscreen
                        showCardCount={settings.showCardCount}
                        showText={settings.showText}
                        onSeen={() => onSeen(globalIndex)}
                        onSwapCard={settings.showSwapButton ? onSwapCard : undefined}
                        pageOffset={i}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar (not overlay) */}
        <div className="shrink-0 bg-black/60 backdrop-blur px-3 py-3">
          <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-1 sm:gap-4 sm:px-2 lg:px-6 2xl:px-10">
            {/* Left corner: mic (optional) + check/dash when anchored left */}
            <div className="flex items-center gap-2">
              {settings.showRecordButton && recordButton()}
              {settings.feedbackButtons === 'left' && (
                <>
                  <button onClick={onCorrect} className="action-btn bg-green-500 hover:bg-green-600 active:scale-95">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={onTryAgain} className="action-btn bg-orange-500 hover:bg-orange-600 active:scale-95">
                    <Minus className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Centered prev / next (plus check/dash when centered) */}
            <div className="min-w-0 flex flex-wrap items-center justify-center gap-2">
              {settings.feedbackButtons === 'center' && (
                <>
                  <button onClick={onCorrect} className="action-btn bg-green-500 hover:bg-green-600 active:scale-95">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={onTryAgain} className="action-btn bg-orange-500 hover:bg-orange-600 active:scale-95">
                    <Minus className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={goPrev} disabled={!canPrev} className="action-btn px-6 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:hover:bg-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-full bg-gray-800 text-white text-sm font-semibold tabular-nums">
                {start + 1}/{total}
              </span>
              <button onClick={goNext} disabled={!canNext} className="action-btn px-6 bg-gray-700 text-white hover:bg-gray-800 active:scale-95 disabled:opacity-40 disabled:hover:bg-gray-700">
                <ChevronRight className="w-4 h-4" />
              </button>
              {settings.showDataPill && <DataStats correct={correct} tries={tries} />}
            </div>

            {/* Right corner: check/dash when anchored right, then exit */}
            <div className="flex items-center justify-end gap-2 justify-self-end">
              {settings.feedbackButtons === 'right' && (
                <>
                  <button onClick={onCorrect} className="action-btn bg-green-500 hover:bg-green-600 active:scale-95">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={onTryAgain} className="action-btn bg-orange-500 hover:bg-orange-600 active:scale-95">
                    <Minus className="w-4 h-4" />
                  </button>
                </>
              )}
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

          <button
            onClick={onShuffle ?? (() => {})}
            className={`inline-flex items-center gap-2 px-4 h-10 rounded-full text-lg font-semibold transition-colors active:scale-95 border ${
              shuffled
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-300 hover:bg-indigo-700'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            title={shuffled ? 'Deck is shuffled' : 'Shuffle the deck'}
          >
            <Shuffle className="w-5 h-5" />
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
