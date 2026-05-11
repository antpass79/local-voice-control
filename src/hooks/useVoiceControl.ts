import { useRef, useCallback, useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import { SherpaService } from '../services/asr/sherpaService';
import { AudioCapture } from '../services/asr/audioCapture';
import { parseCommand, checkOllamaHealth } from '../services/llm/ollamaService';
import type { SherpaModelConfig } from '../types';

/**
 * Hook that wires together AudioCapture → SherpaService → LLM parsing → Zustand store.
 */
export function useVoiceControl() {
  const sherpaRef = useRef<SherpaService | null>(null);
  const audioRef = useRef<AudioCapture | null>(null);

  const {
    setAsrStatus,
    setLoadingProgress,
    setCurrentTranscript,
    setListening,
    setOllamaAvailable,
    setError,
    applyCommand,
    addLogEntry,
  } = useImageStore();

  // ── Health-check Ollama on mount ────────────────────────────────────────────
  useEffect(() => {
    checkOllamaHealth().then(setOllamaAvailable);
  }, [setOllamaAvailable]);

  // ── Initialize Sherpa-ONNX ASR ──────────────────────────────────────────────
  const initializeSherpa = useCallback(
    async (config: SherpaModelConfig) => {
      // Destroy previous instance if any
      sherpaRef.current?.destroy();
      sherpaRef.current = null;

      const service = new SherpaService();
      sherpaRef.current = service;

      await service.initialize(
        config,
        async (text, isFinal) => {
          setCurrentTranscript(text);

          if (!isFinal || text.trim().length === 0) return;

          // ── Parse final transcript via LLM ─────────────────────────────────
          const timestamp = new Date();
          try {
            const command = await parseCommand(text);

            if (command) {
              applyCommand(command);
              addLogEntry({ transcript: text, command, applied: true, timestamp });
            } else {
              addLogEntry({
                transcript: text,
                command: null,
                applied: false,
                timestamp,
                error: 'No matching command recognized',
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'LLM parse failed';
            addLogEntry({
              transcript: text,
              command: null,
              applied: false,
              timestamp,
              error: message,
            });
          }

          setCurrentTranscript('');
        },
        (status, message, progress) => {
          setAsrStatus(status);
          if (typeof progress === 'number') setLoadingProgress(progress);
          if (status === 'ready') { setLoadingProgress(100); setError(null); }
          if (status === 'error' && message) setError(message);
        }
      );
    },
    [setAsrStatus, setLoadingProgress, setCurrentTranscript, setError, applyCommand, addLogEntry]
  );

  // ── Start microphone capture ────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (audioRef.current) return; // already running

    const capture = new AudioCapture();
    audioRef.current = capture;

    await capture.start((samples) => {
      sherpaRef.current?.sendAudio(samples);
    });

    setListening(true);
    setAsrStatus('recording');
  }, [setListening, setAsrStatus]);

  // ── Stop microphone capture ─────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    audioRef.current?.stop();
    audioRef.current = null;
    setListening(false);
    setCurrentTranscript('');
    // Return to ready if Sherpa is initialized, otherwise idle
    setAsrStatus(sherpaRef.current ? 'ready' : 'idle');
  }, [setListening, setCurrentTranscript, setAsrStatus]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      sherpaRef.current?.destroy();
    };
  }, []);

  return { initializeSherpa, startListening, stopListening };
}
