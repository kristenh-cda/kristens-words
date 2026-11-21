import { useState } from 'react';
import { Mic, Pause, Play, Plus, Square } from 'lucide-react';
import type { RecorderHook } from '@/hooks/useRecorder';
import { RecordingWaveformDialog } from '@/components/RecordingWaveformDialog';

type Props = Pick<
  RecorderHook,
  | 'status'
  | 'isPlaying'
  | 'currentTime'
  | 'duration'
  | 'waveform'
  | 'waveformLoading'
  | 'waveformError'
  | 'record'
  | 'stopRecording'
  | 'togglePlayback'
  | 'seekAndPlay'
>;

export function RecordingControls({
  status,
  isPlaying,
  currentTime,
  duration,
  waveform,
  waveformLoading,
  waveformError,
  record,
  stopRecording,
  togglePlayback,
  seekAndPlay,
}: Props) {
  const [waveformOpen, setWaveformOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (status === 'recording') {
              void stopRecording();
            } else {
              void record();
            }
          }}
          className={`action-btn ${status === 'recording' ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
          title={status === 'recording' ? 'Stop recording' : 'Record'}
          aria-label={status === 'recording' ? 'Stop recording' : 'Record'}
        >
          {status === 'recording' ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        {status === 'recorded' && (
          <>
            <button
              onClick={togglePlayback}
              className="action-btn bg-blue-600 hover:bg-blue-700"
              title={isPlaying ? 'Pause recording' : 'Play recording'}
              aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setWaveformOpen(true)}
              className="action-btn bg-slate-500 hover:bg-slate-600"
              title="Open recording waveform"
              aria-label="Open recording waveform"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <RecordingWaveformDialog
        open={waveformOpen}
        onClose={() => setWaveformOpen(false)}
        waveform={waveform}
        waveformLoading={waveformLoading}
        waveformError={waveformError}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlayback={togglePlayback}
        onSeekAndPlay={seekAndPlay}
      />
    </>
  );
}
