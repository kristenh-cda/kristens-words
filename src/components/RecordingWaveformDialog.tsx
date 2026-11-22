import { useEffect } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  waveform: number[];
  waveformLoading: boolean;
  waveformError: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayback: () => void;
  onSeekAndPlay: (time: number) => void;
};

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function RecordingWaveformDialog({
  open,
  onClose,
  waveform,
  waveformLoading,
  waveformError,
  isPlaying,
  currentTime,
  duration,
  onTogglePlayback,
  onSeekAndPlay,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const seekToPosition = (position: number) => {
    if (duration <= 0) return;
    onSeekAndPlay(Math.max(0, Math.min(1, position)) * duration);
  };
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return createPortal((
    <div
      className="counter-main-popup fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recording-waveform-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="recording-waveform-title" className="text-lg font-semibold text-slate-800">
            Recording waveform
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close waveform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {waveformLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500 sm:h-56 md:h-64" role="status">
            Preparing waveform…
          </div>
        ) : waveform.length > 0 ? (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Recording waveform. Tap or use the arrow keys to play from a position."
            aria-valuemin={0}
            aria-valuemax={Math.max(1, Math.ceil(duration))}
            aria-valuenow={Math.floor(currentTime)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            className="relative flex h-40 cursor-pointer touch-manipulation items-center gap-[2px] rounded-xl bg-slate-50 px-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-56 md:h-64"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const horizontalPadding = 12;
              seekToPosition(
                (event.clientX - rect.left - horizontalPadding) /
                  (rect.width - horizontalPadding * 2),
              );
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                seekToPosition(progress - 0.05);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                seekToPosition(progress + 0.05);
              } else if (event.key === 'Home') {
                event.preventDefault();
                seekToPosition(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                seekToPosition(1);
              }
            }}
          >
            <div className="absolute inset-x-3 bottom-2 top-2 flex items-center gap-[2px]">
              {waveform.map((amplitude, index) => (
                <span
                  key={index}
                  className={`min-w-0 flex-1 rounded-full ${index / waveform.length <= progress ? 'bg-blue-600' : 'bg-slate-300'}`}
                  style={{ height: `${Math.max(8, amplitude * 100)}%` }}
                />
              ))}
              <span
                className="pointer-events-none absolute bottom-0 top-0 w-0.5 -translate-x-1/2 rounded-full bg-blue-900"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500 sm:h-56 md:h-64">
            {waveformError ?? 'Waveform is unavailable.'}
          </div>
        )}

        <p className="mt-3 text-center text-sm text-slate-500">Tap the waveform to play from that point.</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlayback}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <div className="flex flex-1 justify-between text-sm tabular-nums text-slate-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        {waveformError && waveform.length > 0 && (
          <p className="mt-3 text-sm text-amber-700">{waveformError}</p>
        )}
      </div>
    </div>
  ), document.body);
}
