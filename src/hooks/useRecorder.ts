import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'recorded';

export type RecorderHook = {
  status: RecorderStatus;
  error: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  waveform: number[];
  waveformLoading: boolean;
  waveformError: string | null;
  record: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playback: () => void;
  togglePlayback: () => void;
  seekAndPlay: (time: number) => void;
  reset: () => void;
};

// iOS Safari supports MediaRecorder from 14.3 but only mp4/aac containers in
// some versions; prefer those before webm.
const MIME_CANDIDATES = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // keep looking
    }
  }
  return null;
}

function friendlyMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Microphone access is blocked. On iPad: open Settings → Safari → Microphone, choose "Allow", then reload this page.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found. Please connect a microphone and try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The microphone is already in use by another app. Close it and try again.';
  }
  const msg = err instanceof Error ? err.message : 'Could not access the microphone.';
  return `Microphone error: ${msg}`;
}

// 16-bit PCM WAV encoder for the AudioContext fallback used when MediaRecorder
// is missing or fails on iOS WebKit.
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  let samples = 0;
  for (const c of chunks) samples += c.length;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);
  let offset = 44;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, c[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function useRecorder(): RecorderHook {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [waveformError, setWaveformError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const waveformRequestRef = useRef(0);
  const decodedAudioRef = useRef<AudioBuffer | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackGainRef = useRef<GainNode | null>(null);
  const playbackStartedAtRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackRequestRef = useRef(0);
  const recordingStartRef = useRef(false);
  const cancelRecordingStartRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  // AudioContext fallback state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const usingFallbackRef = useRef(false);

  const stopBufferPlayback = useCallback((preservePosition: boolean) => {
    playbackRequestRef.current += 1;
    if (playbackFrameRef.current !== null) {
      cancelAnimationFrame(playbackFrameRef.current);
      playbackFrameRef.current = null;
    }

    const source = playbackSourceRef.current;
    const gain = playbackGainRef.current;
    const context = playbackContextRef.current;
    if (source && preservePosition && context) {
      const bufferDuration = decodedAudioRef.current?.duration ?? 0;
      playbackOffsetRef.current = Math.min(
        bufferDuration,
        Math.max(0, context.currentTime - playbackStartedAtRef.current),
      );
    } else if (!preservePosition) {
      playbackOffsetRef.current = 0;
    }

    playbackSourceRef.current = null;
    playbackGainRef.current = null;
    if (source) {
      source.onended = () => {
        source.disconnect();
        gain?.disconnect();
      };
      if (context && context.state === 'running' && gain) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.012);
        try {
          source.stop(now + 0.013);
        } catch (err) {
          console.error('Could not stop the recording playback source.', err);
          source.disconnect();
          gain.disconnect();
        }
      } else {
        try {
          source.stop();
        } catch (err) {
          console.error('Could not stop the recording playback source.', err);
        }
        source.disconnect();
        gain?.disconnect();
      }
    }

    setIsPlaying(false);
    if (preservePosition) setCurrentTime(playbackOffsetRef.current);
  }, []);

  const playDecodedAudio = useCallback(async (offset: number) => {
    const buffer = decodedAudioRef.current;
    if (!buffer) return false;
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;

    const requestId = ++playbackRequestRef.current;
    let context = playbackContextRef.current;
    try {
      if (!context || context.state === 'closed') {
        context = new Ctx();
        playbackContextRef.current = context;
      }
      if (context.state !== 'running') await context.resume();
      if (requestId !== playbackRequestRef.current) return true;

      const safeOffset = Math.min(Math.max(0, offset), buffer.duration);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.01);
      source.connect(gain);
      gain.connect(context.destination);
      playbackSourceRef.current = source;
      playbackGainRef.current = gain;
      playbackOffsetRef.current = safeOffset;
      playbackStartedAtRef.current = context.currentTime - safeOffset;

      source.onended = () => {
        if (playbackSourceRef.current !== source) return;
        playbackSourceRef.current = null;
        playbackGainRef.current = null;
        source.disconnect();
        gain.disconnect();
        if (playbackFrameRef.current !== null) {
          cancelAnimationFrame(playbackFrameRef.current);
          playbackFrameRef.current = null;
        }
        playbackOffsetRef.current = 0;
        setCurrentTime(buffer.duration);
        setIsPlaying(false);
      };
      source.start(0, safeOffset);
      setCurrentTime(safeOffset);
      setIsPlaying(true);

      const updateProgress = () => {
        if (playbackSourceRef.current !== source || !playbackContextRef.current) return;
        setCurrentTime(
          Math.min(buffer.duration, playbackContextRef.current.currentTime - playbackStartedAtRef.current),
        );
        playbackFrameRef.current = requestAnimationFrame(updateProgress);
      };
      playbackFrameRef.current = requestAnimationFrame(updateProgress);
      return true;
    } catch (err) {
      if (requestId === playbackRequestRef.current) {
        setError('Could not play the recording. Please try again.');
      }
      console.error('Could not play the decoded recording.', err);
      return false;
    }
  }, []);

  const ensureAudioElement = useCallback(() => {
    if (audioElRef.current) return audioElRef.current;
    const audio = new Audio();
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audioElRef.current = audio;
    return audio;
  }, []);

  const clearAudio = useCallback(() => {
    waveformRequestRef.current += 1;
    stopBufferPlayback(false);
    decodedAudioRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.removeAttribute('src');
      audioElRef.current.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setWaveform([]);
    setWaveformLoading(false);
    setWaveformError(null);
  }, [stopBufferPlayback]);

  const generateWaveform = useCallback(async (blob: Blob) => {
    const requestId = ++waveformRequestRef.current;
    setWaveformLoading(true);
    let context: AudioContext | null = null;
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Audio waveform decoding is not supported in this browser.');

      context = new Ctx();
      const audioBuffer = await context.decodeAudioData(await blob.arrayBuffer());
      if (requestId !== waveformRequestRef.current) return;
      decodedAudioRef.current = audioBuffer;
      const audioElement = audioElRef.current;
      if (audioElement && !audioElement.paused) {
        const offset = Math.min(audioElement.currentTime, audioBuffer.duration);
        audioElement.pause();
        playbackOffsetRef.current = offset;
        void playDecodedAudio(offset);
      }
      const samples = audioBuffer.getChannelData(0);
      const barCount = 80;
      const samplesPerBar = Math.max(1, Math.ceil(samples.length / barCount));
      const peaks: number[] = [];
      for (let start = 0; start < samples.length; start += samplesPerBar) {
        let peak = 0;
        const end = Math.min(start + samplesPerBar, samples.length);
        for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
        peaks.push(peak);
      }
      const maxPeak = Math.max(...peaks, 0);
      const normalized = peaks.map((peak) => (maxPeak > 0 ? Math.max(0.08, peak / maxPeak) : 0));
      if (requestId === waveformRequestRef.current) {
        setWaveform(normalized);
        setDuration(audioBuffer.duration);
        setWaveformError(null);
        setWaveformLoading(false);
      }
    } catch (err) {
      if (requestId === waveformRequestRef.current) {
        setWaveformError('The recording could not be displayed as a waveform in this browser.');
        setWaveformLoading(false);
      }
      console.error('Could not decode the recording waveform.', err);
    } finally {
      if (context && context.state !== 'closed') {
        void context.close().catch((err) => console.error('Could not close the waveform audio context.', err));
      }
    }
  }, [playDecodedAudio]);

  const setAudioSource = useCallback((blob: Blob) => {
    clearAudio();
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    const audio = ensureAudioElement();
    audio.src = url;
    audio.load();
    void generateWaveform(blob);
  }, [clearAudio, ensureAudioElement, generateWaveform]);

  const finishRecording = useCallback((blob: Blob) => {
    if (blob.size === 0) {
      setStatus('idle');
      setError('No audio was recorded. Please try again.');
      return;
    }
    setAudioSource(blob);
    setStatus('recorded');
  }, [setAudioSource]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    chunksRef.current = [];
    pcmChunksRef.current = [];
    clearAudio();
  }, [clearAudio]);

  const stopRecording = useCallback(async () => {
    if (recordingStartRef.current && !mediaRecorderRef.current && !usingFallbackRef.current) {
      cancelRecordingStartRef.current = true;
      setStatus('idle');
      return;
    }

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const handleStop = () => resolve();
        mr.addEventListener('stop', handleStop, { once: true });
        try {
          mr.stop();
        } catch (err) {
          mr.removeEventListener('stop', handleStop);
          setError('Could not stop the recording. Please try again.');
          resolve();
        }
      });
    }
    if (mediaRecorderRef.current === mr) mediaRecorderRef.current = null;

    if (usingFallbackRef.current) {
      const processor = processorRef.current;
      const source = sourceNodeRef.current;
      const ctx = audioCtxRef.current;
      if (processor) {
        processor.onaudioprocess = null;
        processor.disconnect();
      }
      if (source) source.disconnect();
      processorRef.current = null;
      sourceNodeRef.current = null;
      audioCtxRef.current = null;
      usingFallbackRef.current = false;
      const sampleRate = ctx?.sampleRate ?? 44100;
      const hasAudio = pcmChunksRef.current.some((chunk) => chunk.length > 0);
      const blob = hasAudio ? encodeWav(pcmChunksRef.current, sampleRate) : new Blob();
      pcmChunksRef.current = [];
      finishRecording(blob);
      if (ctx) void ctx.close().catch((err) => console.error('Could not close the recording audio context.', err));
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [finishRecording]);

  const record = useCallback(async () => {
    if (
      recordingStartRef.current ||
      usingFallbackRef.current ||
      mediaRecorderRef.current?.state === 'recording'
    ) return;
    recordingStartRef.current = true;
    cancelRecordingStartRef.current = false;
    clearAudio();
    setStatus('starting');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Recording is not supported in this browser. Please try Safari or Chrome.');
        setStatus('idle');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (cancelRecordingStartRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus('idle');
        return;
      }
      chunksRef.current = [];
      pcmChunksRef.current = [];

      let started = false;
      if (typeof MediaRecorder !== 'undefined') {
        try {
          const mimeType = pickMimeType();
          const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          mr.addEventListener('stop', () => {
            const blob = new Blob(chunksRef.current, { type: mr.mimeType || mimeType || 'audio/webm' });
            chunksRef.current = [];
            if (mediaRecorderRef.current === mr) mediaRecorderRef.current = null;
            finishRecording(blob);
          }, { once: true });
          mr.onerror = () => setError('Something went wrong while recording. Please try again.');
          mr.start();
          mediaRecorderRef.current = mr;
          usingFallbackRef.current = false;
          started = true;
        } catch {
          // iOS WebKit can throw a MIME/NotSupportedError even when
          // isTypeSupported reports success — fall through to the AudioContext path.
          started = false;
        }
      }

      if (!started) {
        const Ctx: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) {
          setError('Recording is not supported in this browser.');
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        audioCtxRef.current = ctx;
        sourceNodeRef.current = source;
        processorRef.current = processor;
        usingFallbackRef.current = true;
      }

      setStatus('recording');
    } catch (err) {
      if (!cancelRecordingStartRef.current) setError(friendlyMicError(err));
      setStatus('idle');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    } finally {
      recordingStartRef.current = false;
      cancelRecordingStartRef.current = false;
    }
  }, [clearAudio, finishRecording]);

  const playback = useCallback(() => {
    if (decodedAudioRef.current) {
      stopBufferPlayback(false);
      playbackOffsetRef.current = 0;
      void playDecodedAudio(0);
      return;
    }
    const audio = audioElRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch((err) => {
      setError('Could not play the recording. Please try again.');
      console.error('Could not play the recording.', err);
    });
  }, [playDecodedAudio, stopBufferPlayback]);

  const togglePlayback = useCallback(() => {
    if (decodedAudioRef.current) {
      if (playbackSourceRef.current) {
        stopBufferPlayback(true);
      } else {
        const offset = playbackOffsetRef.current >= (decodedAudioRef.current?.duration ?? 0)
          ? 0
          : playbackOffsetRef.current;
        void playDecodedAudio(offset);
      }
      return;
    }
    const audio = audioElRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration)) {
      audio.currentTime = 0;
    }
    void audio.play().catch((err) => {
      setError('Could not play the recording. Please try again.');
      console.error('Could not play the recording.', err);
    });
  }, [playDecodedAudio, stopBufferPlayback]);

  const seekAndPlay = useCallback((time: number) => {
    if (decodedAudioRef.current) {
      const target = Math.min(Math.max(0, time), decodedAudioRef.current.duration);
      stopBufferPlayback(false);
      playbackOffsetRef.current = target;
      void playDecodedAudio(target);
      return;
    }
    const audio = audioElRef.current;
    if (!audio) return;
    const maxTime = Number.isFinite(audio.duration) ? audio.duration : Math.max(0, time);
    audio.currentTime = Math.max(0, Math.min(time, maxTime));
    if (audio.paused) {
      void audio.play().catch((err) => {
        setError('Could not play the recording. Please try again.');
        console.error('Could not play the recording.', err);
      });
    }
  }, [playDecodedAudio, stopBufferPlayback]);

  useEffect(() => {
    return () => {
      waveformRequestRef.current += 1;
      playbackRequestRef.current += 1;
      if (playbackFrameRef.current !== null) cancelAnimationFrame(playbackFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.onplay = null;
        audioElRef.current.onpause = null;
        audioElRef.current.ontimeupdate = null;
        audioElRef.current.onloadedmetadata = null;
        audioElRef.current.onended = null;
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const ctx = audioCtxRef.current;
      if (ctx) void ctx.close().catch(() => {});
      const playbackContext = playbackContextRef.current;
      if (playbackContext) void playbackContext.close().catch(() => {});
    };
  }, []);

  return {
    status,
    error,
    isPlaying,
    currentTime,
    duration,
    waveform,
    waveformLoading,
    waveformError,
    record,
    stopRecording,
    playback,
    togglePlayback,
    seekAndPlay,
    reset,
  };
}
