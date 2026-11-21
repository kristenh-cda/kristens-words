import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, RefreshCw } from 'lucide-react';
import { findSubcategory, type SoundCategory } from '@/data/words';
import {
  r2ImagePaths,
  prefetchR2Image,
  applyRememberedStage,
  rememberSuccess,
  PLACEHOLDER_DATA_URI,
} from '@/lib/images';
import { formatWordDisplay } from '@/lib/formatters';

export type CardSlot = {
  word: string;
  category: SoundCategory;
  subId: string;
  groupId: string | null;
  /** Unique instance id for this card occurrence (move timestamp baked in); used as the React key. */
  id?: string;
  /** Legacy numeric instance id, still honored for keys. */
  inst?: number;
};

type Props = {
  slot: CardSlot;
  index: number; // global index in the deck
  total: number;
  seen: boolean;
  fullscreen?: boolean;
  showCardCount?: boolean;
  showText?: boolean;
  onToggleFullscreen?: () => void;
  onSeen: () => void;
  onSwapCard?: (pageOffset: number) => void;
  pageOffset?: number;
};

export function FlashcardView({ slot, index, total, seen, fullscreen = false, showCardCount = true, showText = true, onToggleFullscreen, onSeen, onSwapCard, pageOffset = 0 }: Props) {
  const { word, category, subId, groupId } = slot;

  const sub = useMemo(() => findSubcategory(category, subId), [category, subId]);
  const plan = useMemo(() => r2ImagePaths(word, category, sub, groupId ?? null), [word, category, sub, groupId]);
  const attempts = useMemo(() => applyRememberedStage(plan), [plan]);

  const [stage, setStage] = useState(0);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [flash, setFlash] = useState<'correct' | 'try' | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStage(0);
    setImageStatus('loading');
  }, [plan]);

  // Handle cached images: if the browser already has the image, onLoad may
  // not fire, so check synchronously after mount.
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setImageStatus('loaded');
      } else {
        setImageStatus('error');
      }
    }
  }, [plan]);

  const attempt = attempts[stage];
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
    setImageStatus('error');
    setStage((prev) => Math.min(prev + 1, attempts.length - 1));
  };

  useEffect(() => {
    if (plan.firstUrl) prefetchR2Image(plan.firstUrl);
  }, [plan.firstUrl]);

  // Report seen whenever a card successfully loads or is skipped via flash.
  useEffect(() => {
    onSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const ringClass =
    flash === 'correct'
      ? 'ring-4 ring-green-400'
      : flash === 'try'
      ? 'ring-4 ring-red-400'
      : seen
      ? 'ring-2 ring-green-200'
      : 'ring-1 ring-gray-100';

  return (
    <div
      className={`relative bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${ringClass} ${
        fullscreen ? 'h-full rounded-2xl' : ''
      }`}
    >
      <div
        className={`relative w-full flex items-center justify-center bg-white overflow-hidden ${
          fullscreen ? 'flex-1 min-h-0' : 'aspect-square max-h-[46svh]'
        }`}
      >
        {isIconStage || imageStatus === 'error' ? (
          <img
            key={`${word}-${slot.id ?? ''}-placeholder`}
            src={PLACEHOLDER_DATA_URI}
            alt={word}
            className="w-full h-full object-contain p-4 select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <img
            key={`${word}-${slot.id ?? ''}-${index}-${attempt.url}`}
            ref={imgRef}
            src={attempt.url ?? undefined}
            alt={isFallback ? `Placeholder for ${word}` : word}
            width={1200}
            height={1200}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onError={handleImgError}
            onLoad={handleImgLoad}
            className={`w-full h-full object-contain transition-opacity duration-200 select-none pointer-events-none ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            } ${isFallback ? 'p-4' : ''}`}
          />
        )}
        {showCardCount && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900/60 text-white text-[10px] tabular-nums">
            {index + 1}/{total}
          </span>
        )}
        {onSwapCard && (
          <button
            onClick={() => onSwapCard(pageOffset)}
            className={`absolute left-2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur transition-colors active:scale-95 ${
              showCardCount ? 'top-10' : 'top-2'
            }`}
            title="Swap this card for the next word in the deck"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {onToggleFullscreen && !fullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 py-3 flex flex-col items-center gap-2">
        {showText && (
          <h2 className="text-xl font-medium text-gray-800 tracking-tight text-balance text-center">
            {formatWordDisplay(word, category.id, subId)}
          </h2>
        )}
      </div>
    </div>
  );
}

// Kept for callers that apply a per-card flash effect externally.
export function applyCardFlash(flash: 'correct' | 'try' | null): string {
  return flash === 'correct' ? 'ring-4 ring-green-400' : flash === 'try' ? 'ring-4 ring-red-400' : '';
}
