import { useCallback, useEffect, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import {
  downloadOfflineImages,
  inspectOfflineImages,
  type OfflineImageProgress,
} from '@/lib/offlineImageSync';

export function OfflineImageSyncButton() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [progress, setProgress] = useState<OfflineImageProgress | null>(null);

  const refreshProgress = useCallback(async () => {
    try {
      setProgress(await inspectOfflineImages());
    } catch (error) {
      console.warn('Could not inspect cached offline images.', error);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refreshProgress();
    };
    const handleOffline = () => setIsOnline(false);

    void refreshProgress();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshProgress]);

  const startDownload = async () => {
    setProgress((current) => current && { ...current, isDownloading: true, failedItems: [] });
    try {
      const result = await downloadOfflineImages(setProgress);
      if (result.failedItems.length > 0) {
        console.warn('Some offline images could not be downloaded.', result.failedItems);
      }
    } catch (error) {
      console.warn('Offline image download failed.', error);
      await refreshProgress();
    }
  };

  if (!isOnline || !progress || progress.cachedCount >= progress.totalCount) return null;

  const failedCount = progress.failedItems.length;
  const label = `${progress.isDownloading ? 'Downloading' : 'Download'} Offline Images (${progress.cachedCount}/${progress.totalCount})`;

  return (
    <button
      type="button"
      onClick={startDownload}
      disabled={progress.isDownloading}
      aria-label={label}
      title={failedCount > 0 ? `${failedCount} images still need downloading; select to retry.` : label}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-[10px] font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-wait disabled:opacity-70 sm:text-xs"
    >
      {progress.isDownloading
        ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}
