/**
 * Captures microphone audio at 16 kHz (required by Sherpa-ONNX models)
 * using a ScriptProcessorNode for broad browser compatibility.
 *
 * NOTE: ScriptProcessorNode is deprecated in the Web Audio API spec.
 * For production use, migrate to AudioWorkletNode.
 */

export type AudioCallback = (samples: Float32Array) => void;

const TARGET_SAMPLE_RATE = 16_000;
const BUFFER_SIZE = 4_096; // ~256 ms at 16 kHz

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  async start(onAudioData: AudioCallback): Promise<void> {
    if (this.audioContext) {
      throw new Error('AudioCapture is already running. Call stop() first.');
    }

    // Request mono microphone with noise/echo suppression
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // AudioContext at 16 kHz – the browser will resample from the device rate
    this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode fires onaudioprocess with PCM Float32 samples
    this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const channelData = event.inputBuffer.getChannelData(0);
      // slice() creates a copy so the original buffer isn't recycled underneath us
      onAudioData(channelData.slice());
    };

    this.sourceNode.connect(this.processorNode);
    // Must be connected to destination or the browser may garbage-collect the node
    this.processorNode.connect(this.audioContext.destination);
  }

  stop(): void {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    void this.audioContext?.close();

    this.processorNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
    this.audioContext = null;
  }

  get sampleRate(): number {
    return TARGET_SAMPLE_RATE;
  }
}
