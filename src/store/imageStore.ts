import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type ImageParams,
  type ImageParamKey,
  type CommandLogEntry,
  type VoiceCommand,
  type AsrStatus,
  DEFAULT_IMAGE_PARAMS,
  IMAGE_PARAM_LIMITS,
} from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface ImageStoreState {
  // ── Image parameters ──────────────────────────────────────────────
  params: ImageParams;

  // ── Command log ───────────────────────────────────────────────────
  commandLog: CommandLogEntry[];

  // ── Voice / ASR state ─────────────────────────────────────────────
  asrStatus: AsrStatus;
  loadingProgress: number;       // 0-100 during ASR model loading
  currentTranscript: string;
  isListening: boolean;
  ollamaAvailable: boolean;
  error: string | null;
}

interface ImageStoreActions {
  setParam: (param: ImageParamKey, value: number) => void;
  applyCommand: (command: VoiceCommand) => void;
  resetParams: () => void;

  addLogEntry: (entry: Omit<CommandLogEntry, 'id'>) => void;
  clearLog: () => void;

  setAsrStatus: (status: AsrStatus) => void;
  setLoadingProgress: (progress: number) => void;
  setCurrentTranscript: (text: string) => void;
  setListening: (listening: boolean) => void;
  setOllamaAvailable: (available: boolean) => void;
  setError: (error: string | null) => void;
}

type ImageStore = ImageStoreState & ImageStoreActions;

export const useImageStore = create<ImageStore>()(
  devtools(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────
      params: { ...DEFAULT_IMAGE_PARAMS },
      commandLog: [],
      asrStatus: 'idle',
      loadingProgress: 0,
      currentTranscript: '',
      isListening: false,
      ollamaAvailable: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────
      setParam: (param, value) => {
        const { min, max } = IMAGE_PARAM_LIMITS[param];
        set((state) => ({
          params: { ...state.params, [param]: clamp(value, min, max) },
        }));
      },

      applyCommand: (command) => {
        const { params } = get();
        const { min, max } = IMAGE_PARAM_LIMITS[command.parameter];
        let newValue: number;

        switch (command.action) {
          case 'set':
            newValue = command.value;
            break;
          case 'increase':
            newValue = params[command.parameter] + command.value;
            break;
          case 'decrease':
            newValue = params[command.parameter] - command.value;
            break;
          default:
            return;
        }

        set((state) => ({
          params: {
            ...state.params,
            [command.parameter]: clamp(newValue, min, max),
          },
        }));
      },

      resetParams: () => set({ params: { ...DEFAULT_IMAGE_PARAMS } }),

      addLogEntry: (entry) => {
        const full: CommandLogEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set((state) => ({
          commandLog: [full, ...state.commandLog].slice(0, 100),
        }));
      },

      clearLog: () => set({ commandLog: [] }),

      setAsrStatus: (status) => set({ asrStatus: status }),
      setLoadingProgress: (progress) => set({ loadingProgress: progress }),
      setCurrentTranscript: (text) => set({ currentTranscript: text }),
      setListening: (listening) => set({ isListening: listening }),
      setOllamaAvailable: (available) => set({ ollamaAvailable: available }),
      setError: (error) => set({ error }),
    }),
    { name: 'image-store' }
  )
);
