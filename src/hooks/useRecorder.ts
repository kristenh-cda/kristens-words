import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'recorded';

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
  const recordingStartRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  // AudioContext fallback state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const usingFallbackRef = useRef(false);

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
  }, []);

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
  }, []);

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
    clearAudio();
    setStatus('idle');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Recording is not supported in this browser. Please try Safari or Chrome.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
      setError(friendlyMicError(err));
      setStatus('idle');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    } finally {
      recordingStartRef.current = false;
    }
  }, [clearAudio, finishRecording]);

  const playback = useCallback(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch((err) => {
      setError('Could not play the recording. Please try again.');
      console.error('Could not play the recording.', err);
    });
  }, []);

  const togglePlayback = useCallback(() => {
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
  }, []);

  const seekAndPlay = useCallback((time: number) => {
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
  }, []);

  useEffect(() => {
    return () => {
      waveformRequestRef.current += 1;
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
