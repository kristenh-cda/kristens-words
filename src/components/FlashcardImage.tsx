import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import {
  r2ImagePaths,
  applyRememberedStage,
  rememberSuccess,
} from '@/lib/images';
import { findSubcategory, type SoundCategory } from '@/data/words';

type Props = {
  word: string;
  category: SoundCategory;
  subId: string;
  groupId: string | null;
  className?: string;
};

/**
 * Resolves and displays the best available image for a flashcard word using
 * the shared R2 resolution plan (svg/png/jpg with pattern memory).
 */
export function FlashcardImage({ word, category, subId, groupId, className = '' }: Props) {
  const sub = useMemo(() => findSubcategory(category, subId), [category, subId]);
  const plan = useMemo(() => r2ImagePaths(word, category, sub, groupId), [word, category, sub, groupId]);
  const attempts = useMemo(() => applyRememberedStage(plan), [plan]);

  const [stage, setStage] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const failedImageUrlsRef = useRef(new Set<string>());
  const attempt = attempts[stage];

  useEffect(() => {
    failedImageUrlsRef.current.clear();
    setStage(0);
    setImgReady(false);
  }, [plan]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) {
      setImgReady(true);
    } else if (attempt?.url && !failedImageUrlsRef.current.has(attempt.url)) {
      failedImageUrlsRef.current.add(attempt.url);
      setStage((prev) => Math.min(prev + 1, attempts.length - 1));
    }
  }, [attempt?.url, attempts.length]);

  const isIconStage = attempt?.stage === 'icon' || stage >= attempts.length - 1;
  const isPlaceholderStage = attempt?.stage === 'placeholder';
  const isFallback = isPlaceholderStage || isIconStage;

  const handleImgLoad = () => {
    setImgReady(true);
    if (attempt && attempt.stage !== 'icon' && attempt.stage !== 'placeholder') {
      rememberSuccess(plan.sound, plan.position, attempt.stage, plan.wordKey);
    }
  };

  const handleImgError = () => {
    if (attempt?.url && failedImageUrlsRef.current.has(attempt.url)) return;
    if (attempt?.url) failedImageUrlsRef.current.add(attempt.url);
    setImgReady(false);
    setStage((prev) => Math.min(prev + 1, attempts.length - 1));
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-white ${className}`}>
      {isIconStage ? (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-300 p-4">
          <ImageOff className="w-10 h-10" aria-hidden="true" />
          <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center">No picture</p>
        </div>
      ) : (
        <img
          key={attempt.url}
          ref={imageRef}
          src={attempt.url ?? undefined}
          alt={isFallback ? `Placeholder for ${word}` : word}
          width={1200}
          height={1200}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={handleImgError}
          onLoad={handleImgLoad}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imgReady ? 'opacity-100' : 'opacity-0'
          } ${isFallback ? 'p-3' : ''}`}
        />
      )}
    </div>
  );
}
