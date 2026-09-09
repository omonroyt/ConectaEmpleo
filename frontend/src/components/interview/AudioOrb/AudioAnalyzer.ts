import { clamp } from "./orbConfig";
export interface AudioLevels {
  volume: number;
  bass: number;
  mids: number;
  highs: number;
}
export type AudioSource = HTMLMediaElement | MediaStream | AnalyserNode;
export interface AudioConnection {
  analyser: AnalyserNode;
  resume(): Promise<void>;
  /** Disconnects this branch. Never stops caller-owned stream tracks. */
  dispose(): Promise<void>;
}
// Media elements can only be associated with one source node for their lifetime.
const mediaSources = new WeakMap<
  HTMLMediaElement,
  {
    context: AudioContext;
    source: MediaElementAudioSourceNode;
    refs: number;
    owned: boolean;
  }
>();
export async function connectAudio(
  source: AudioSource,
  options: { context?: AudioContext; monitor?: boolean } = {},
): Promise<AudioConnection> {
  if ("getFloatTimeDomainData" in source)
    return {
      analyser: source,
      resume: async () => {
        if (source.context.state === "suspended")
          await (source.context as AudioContext).resume();
      },
      dispose: async () => {},
    };
  const isElement = "tagName" in source;
  const cached = isElement
    ? mediaSources.get(source as HTMLMediaElement)
    : undefined;
  if (cached && options.context && options.context !== cached.context)
    throw new Error(
      "Este elemento ya pertenece a otro AudioContext. Reutiliza el mismo contexto.",
    );
  const context = cached?.context ?? options.context ?? new AudioContext();
  if (context.state === "closed")
    throw new Error(
      "El contexto de este elemento está cerrado. Crea un elemento de audio nuevo.",
    );
  const ownsContext = !cached && !options.context;
  let node: MediaElementAudioSourceNode | MediaStreamAudioSourceNode;
  try {
    node =
      cached?.source ??
      (isElement
        ? context.createMediaElementSource(source as HTMLMediaElement)
        : context.createMediaStreamSource(source as MediaStream));
  } catch (error) {
    if (ownsContext) await context.close();
    throw error;
  }
  if (isElement && !cached) {
    mediaSources.set(source as HTMLMediaElement, {
      context,
      source: node as MediaElementAudioSourceNode,
      refs: 0,
      owned: ownsContext,
    });
    // One audible path, preserved when the visualizer disconnects.
    node.connect(context.destination);
  }
  const record = isElement
    ? mediaSources.get(source as HTMLMediaElement)!
    : undefined;
  if (record) record.refs++;
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.65;
  node.connect(analyser);
  if (!isElement && options.monitor) analyser.connect(context.destination);
  let disposed = false;
  return {
    analyser,
    resume: async () => {
      if (!disposed && context.state === "suspended") await context.resume();
    },
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      node.disconnect(analyser);
      analyser.disconnect();
      if (record) {
        record.refs--;
        if (record.owned && record.refs === 0 && context.state !== "closed") {
          node.disconnect();
          await context.close();
        }
      } else if (ownsContext && context.state !== "closed")
        await context.close();
    },
  };
}
export class AudioAnalyzer {
  readonly levels: AudioLevels = { volume: 0, bass: 0, mids: 0, highs: 0 };
  private waveform = new Float32Array(0);
  private frequencies = new Uint8Array(0);
  constructor(public analyser?: AnalyserNode) {}
  sample(dt: number, sensitivity = 1): AudioLevels {
    const node = this.analyser;
    let volume = 0,
      bass = 0,
      mids = 0,
      highs = 0;
    if (node) {
      if (this.waveform.length !== node.fftSize) {
        this.waveform = new Float32Array(node.fftSize);
        this.frequencies = new Uint8Array(node.frequencyBinCount);
      }
      node.getFloatTimeDomainData(this.waveform);
      node.getByteFrequencyData(this.frequencies);
      for (let i = 0; i < this.waveform.length; i++)
        volume += this.waveform[i] ** 2;
      volume = clamp(
        Math.sqrt(volume / this.waveform.length) * 3.5 * sensitivity,
      );
      bass = this.band(40, 250) * sensitivity;
      mids = this.band(250, 2400) * sensitivity;
      highs = this.band(2400, 10000) * sensitivity;
    }
    const a = 1 - Math.exp(-Math.min(dt, 0.1) / 0.085);
    this.levels.volume += (volume - this.levels.volume) * a;
    this.levels.bass += (clamp(bass) - this.levels.bass) * a;
    this.levels.mids += (clamp(mids) - this.levels.mids) * a;
    this.levels.highs += (clamp(highs) - this.levels.highs) * a;
    return this.levels;
  }
  private band(from: number, to: number) {
    const hz = this.analyser!.context.sampleRate / this.analyser!.fftSize;
    const start = Math.max(1, Math.floor(from / hz));
    const end = Math.min(this.frequencies.length, Math.ceil(to / hz));
    let sum = 0;
    for (let i = start; i < end; i++) sum += this.frequencies[i];
    return end > start ? sum / ((end - start) * 255) : 0;
  }
}
