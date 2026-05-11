import type { WorkerInMessage, WorkerOutMessage, SherpaModelConfig, AsrStatus } from '../../types';

export type TranscriptCallback = (text: string, isFinal: boolean) => void;
export type StatusCallback = (status: AsrStatus, message?: string, progress?: number) => void;

/**
 * Manages the Sherpa-ONNX Web Worker lifecycle and provides a clean API
 * for audio processing and transcript callbacks.
 */
export class SherpaService {
  private worker: Worker | null = null;
  private onTranscript: TranscriptCallback | null = null;
  private onStatusChange: StatusCallback | null = null;

  /**
   * Spawns the worker, sends the INIT message and waits for READY.
   * Rejects with an Error if initialization fails or times out.
   */
  async initialize(
    config: SherpaModelConfig,
    onTranscript: TranscriptCallback,
    onStatus: StatusCallback
  ): Promise<void> {
    this.onTranscript = onTranscript;
    this.onStatusChange = onStatus;

    this.worker = new Worker(
      new URL('../../workers/sherpa.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onerror = (err) => {
      this.onStatusChange?.('error', err.message ?? 'Worker error');
    };

    // Default message handler (after READY)
    this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      this.handleMessage(event.data);
    };

    onStatus('loading');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sherpa-ONNX initialization timed out after 3 min. Check that WASM and model files are present in /public.'));
      }, 180_000);

      // Temporary override to catch READY / ERROR during init
      this.worker!.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data;

        if (msg.type === 'READY') {
          clearTimeout(timeout);
          // Restore default handler
          this.worker!.onmessage = (e: MessageEvent<WorkerOutMessage>) =>
            this.handleMessage(e.data);
          this.onStatusChange?.('ready');
          resolve();
        } else if (msg.type === 'ERROR') {
          clearTimeout(timeout);
          this.worker!.onmessage = (e: MessageEvent<WorkerOutMessage>) =>
            this.handleMessage(e.data);
          reject(new Error(msg.message));
        } else {
          // Pass LOADING progress through during init
          this.handleMessage(msg);
        }
      };

      const initMsg: WorkerInMessage = { type: 'INIT', config };
      this.worker!.postMessage(initMsg);
    });
  }

  private handleMessage(msg: WorkerOutMessage): void {
    switch (msg.type) {
      case 'READY':
        this.onStatusChange?.('ready');
        break;
      case 'TRANSCRIPT':
        this.onTranscript?.(msg.text, msg.isFinal);
        break;
      case 'LOADING':
        this.onStatusChange?.('loading', undefined, msg.progress);
        break;
      case 'ERROR':
        this.onStatusChange?.('error', msg.message);
        break;
    }
  }

  /**
   * Sends PCM Float32 audio samples to the worker.
   * Buffer ownership is transferred for zero-copy performance.
   */
  sendAudio(samples: Float32Array): void {
    if (!this.worker) return;
    // Create a copy before transfer so the caller's reference isn't detached
    const copy = samples.slice();
    const msg: WorkerInMessage = { type: 'AUDIO_DATA', samples: copy };
    this.worker.postMessage(msg, [copy.buffer]);
  }

  destroy(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' } satisfies WorkerInMessage);
      this.worker.terminate();
      this.worker = null;
    }
    this.onTranscript = null;
    this.onStatusChange = null;
  }
}
