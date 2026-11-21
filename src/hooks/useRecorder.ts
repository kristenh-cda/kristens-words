import { useCallback, useEffect, useRef, useState } from 'react';

type RecorderStatus = 'idle' | 'recording' | 'recorded';

type RecorderHook = {
  status: RecorderStatus;
  error: string | null;
  record: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playback: () => void;
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // AudioContext fallback state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const usingFallbackRef = useRef(false);

  const setAudioSource = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (audioElRef.current) {
      audioElRef.current.src = url;
    } else {
      audioElRef.current = new Audio(url);
    }
  };

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    chunksRef.current = [];
    pcmChunksRef.current = [];
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        mr.onstop = () => resolve();
        try {
          mr.stop();
        } catch {
          resolve();
        }
      });
    }
    mediaRecorderRef.current = null;

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
      const blob = encodeWav(pcmChunksRef.current, sampleRate);
      pcmChunksRef.current = [];
      setAudioSource(blob);
      setStatus('recorded');
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const record = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Recording is not supported in this browser. Please try Safari or Chrome.');
      return;
    }
    try {
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
          mr.onstop = () => {
            setAudioSource(new Blob(chunksRef.current, { type: mr.mimeType || mimeType || 'audio/webm' }));
            setStatus('recorded');
          };
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
    }
  }, []);

  const playback = useCallback(() => {
    const el = audioElRef.current;
    if (el) {
      el.currentTime = 0;
      void el.play();
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioElRef.current) audioElRef.current.pause();
      const ctx = audioCtxRef.current;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, []);

  return { status, error, record, stopRecording, playback, reset };
}
