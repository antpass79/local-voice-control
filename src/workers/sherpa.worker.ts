/**
 * Sherpa-ONNX ASR Web Worker
 *
 * Uses the pre-bundled WASM release from sherpa-onnx (v1.10.30 en-asr-zipformer).
 * All model data is embedded in the .data file — no separate ONNX files needed.
 *
 * Required files in /public/sherpa-onnx/:
 *   sherpa-onnx-asr.js               (high-level JS wrapper)
 *   sherpa-onnx-wasm-main-asr.js     (Emscripten runtime)
 *   sherpa-onnx-wasm-main-asr.wasm   (WASM binary)
 *   sherpa-onnx-wasm-main-asr.data   (bundled model data)
 *
 * Run scripts/setup.ps1 to download these files automatically.
 */

import type { WorkerInMessage, WorkerOutMessage, SherpaModelConfig } from '../types';

// ─── High-level API types (from sherpa-onnx-asr.js) ──────────────────────────

interface OnlineStream {
  acceptWaveform(sampleRate: number, samples: Float32Array): void;
  free(): void;
}

interface OnlineRecognizer {
  createStream(): OnlineStream;
  isReady(stream: OnlineStream): boolean;
  decode(stream: OnlineStream): void;
  isEndpoint(stream: OnlineStream): boolean;
  reset(stream: OnlineStream): void;
  getResult(stream: OnlineStream): { text: string };
  free(): void;
}

// ─── Module-level state ───────────────────────────────────────────────────────

let recognizer: OnlineRecognizer | null = null;
let stream: OnlineStream | null = null;
let configuredSampleRate = 16_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url} (HTTP ${res.status}). ` +
      `Make sure the file exists in public/sherpa-onnx/ — run scripts/setup.ps1 to download it.`
    );
  }
  return res.text();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function initSherpa(config: SherpaModelConfig): Promise<void> {
  post({ type: 'LOADING', progress: 10 });

  const baseUrl = config.sherpaBaseUrl.endsWith('/')
    ? config.sherpaBaseUrl
    : config.sherpaBaseUrl + '/';

  configuredSampleRate = config.sampleRate;

  // Step 1: fetch + eval sherpa-onnx-asr.js to define createOnlineRecognizer globally.
  // Indirect eval runs in global (worker) scope so the function lands on `self`.
  const asrCode = await fetchText(`${baseUrl}sherpa-onnx-asr.js`);
  // eslint-disable-next-line no-eval
  (0, eval)(asrCode);

  post({ type: 'LOADING', progress: 30 });

  // Step 2: fetch the Emscripten WASM JS (we eval it after setting Module.locateFile).
  const wasmCode = await fetchText(`${baseUrl}sherpa-onnx-wasm-main-asr.js`);

  post({ type: 'LOADING', progress: 50 });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(
        'Sherpa-ONNX WASM initialization timed out (3 min). ' +
        'Check that .wasm and .data files are present in public/sherpa-onnx/.'
      ));
    }, 180_000);

    // ES module workers don't have importScripts, but Emscripten uses
    // `typeof importScripts == "function"` to detect the worker environment
    // and enable readAsync/readBinary. Without it, the WASM never loads.
    const g = self as unknown as Record<string, unknown>;
    if (typeof g['importScripts'] !== 'function') {
      g['importScripts'] = () => {};
    }

    // Must be set BEFORE eval-ing the WASM JS so the module picks up our callbacks.
    g.Module = {
      locateFile: (filename: string) => `${baseUrl}${filename}`,
      onRuntimeInitialized() {
        clearTimeout(timeout);
        try {
          post({ type: 'LOADING', progress: 90 });
          const createFn = g.createOnlineRecognizer as (mod: unknown) => OnlineRecognizer;
          recognizer = createFn(g.Module);
          stream = recognizer.createStream();
          post({ type: 'LOADING', progress: 100 });
          post({ type: 'READY' });
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      },
    };

    try {
      // eslint-disable-next-line no-eval
      (0, eval)(wasmCode);
    } catch (err) {
      clearTimeout(timeout);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ─── Audio processing ─────────────────────────────────────────────────────────

function processAudio(samples: Float32Array): void {
  if (!recognizer || !stream) return;

  stream.acceptWaveform(configuredSampleRate, samples);

  while (recognizer.isReady(stream)) {
    recognizer.decode(stream);
  }

  const result = recognizer.getResult(stream);
  const text = (result.text ?? '').trim();

  if (recognizer.isEndpoint(stream)) {
    if (text.length > 0) {
      post({ type: 'TRANSCRIPT', text, isFinal: true });
    }
    recognizer.reset(stream);
  } else if (text.length > 0) {
    post({ type: 'TRANSCRIPT', text, isFinal: false });
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanup(): void {
  stream?.free();
  stream = null;
  recognizer?.free();
  recognizer = null;
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerInMessage>): Promise<void> => {
  const msg = event.data;

  switch (msg.type) {
    case 'INIT':
      try {
        await initSherpa(msg.config);
      } catch (err) {
        post({
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Sherpa-ONNX failed to initialize.',
        });
      }
      break;

    case 'AUDIO_DATA':
      try {
        processAudio(msg.samples);
      } catch (err) {
        post({
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Audio processing error',
        });
      }
      break;

    case 'STOP':
      cleanup();
      break;
  }
};
