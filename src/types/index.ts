// ─── Image Parameters ───────────────────────────────────────────────────────

export interface ImageParams {
  /** Brightness/gain 0–100 */
  gain: number;
  /** Display width percentage 0–100 */
  width: number;
  /** Zoom factor 0.5–5.0 */
  zoom: number;
}

export type ImageParamKey = keyof ImageParams;

export const IMAGE_PARAM_LIMITS: Record<ImageParamKey, { min: number; max: number; step: number; unit: string }> = {
  gain:  { min: 0,   max: 100, step: 1,   unit: '' },
  width: { min: 10,  max: 100, step: 1,   unit: '%' },
  zoom:  { min: 0.5, max: 5.0, step: 0.1, unit: 'x' },
};

export const DEFAULT_IMAGE_PARAMS: ImageParams = {
  gain: 50,
  width: 100,
  zoom: 1.0,
};

// ─── Voice Commands ──────────────────────────────────────────────────────────

export interface VoiceCommand {
  parameter: ImageParamKey;
  action: 'set' | 'increase' | 'decrease';
  value: number;
}

export interface CommandLogEntry {
  id: string;
  timestamp: Date;
  transcript: string;
  command: VoiceCommand | null;
  applied: boolean;
  error?: string;
}

// ─── ASR Status ──────────────────────────────────────────────────────────────

export type AsrStatus = 'idle' | 'loading' | 'ready' | 'recording' | 'error';

// ─── Sherpa-ONNX Worker Messages ─────────────────────────────────────────────

export interface SherpaModelConfig {
  /** Base URL directory containing sherpa-onnx WASM + bundled model data (e.g. '/sherpa-onnx/') */
  sherpaBaseUrl: string;
  sampleRate: number;
}

export type WorkerInMessage =
  | { type: 'INIT'; config: SherpaModelConfig }
  | { type: 'AUDIO_DATA'; samples: Float32Array }
  | { type: 'STOP' };

export type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'TRANSCRIPT'; text: string; isFinal: boolean }
  | { type: 'LOADING'; progress: number }
  | { type: 'ERROR'; message: string };
