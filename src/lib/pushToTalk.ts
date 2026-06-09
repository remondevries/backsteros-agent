import { releaseMicrophoneStream, requestMicrophoneAccess } from "./mic";

const TARGET_SAMPLE_RATE = 16_000;

export type PushToTalkRecorder = {
  prime: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Float32Array;
  destroy: () => void;
  isRecording: () => boolean;
};

function mergeChunks(chunks: Float32Array[]): Float32Array {
  if (chunks.length === 0) return new Float32Array(0);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return input;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = position - left;
    output[index] = input[left] * (1 - fraction) + input[right] * fraction;
  }
  return output;
}

export async function createPushToTalkRecorder(): Promise<PushToTalkRecorder> {
  const access = await requestMicrophoneAccess();
  if ("code" in access) {
    throw new Error(access.message);
  }

  const { stream, sampleRate: nativeSampleRate } = access;
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const monitorGain = audioContext.createGain();
  monitorGain.gain.value = 0;
  const nativeChunks: Float32Array[] = [];
  let recording = false;

  processor.onaudioprocess = (event) => {
    if (!recording) return;
    const input = event.inputBuffer.getChannelData(0);
    nativeChunks.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(monitorGain);
  monitorGain.connect(audioContext.destination);

  return {
    prime: async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    },
    startRecording: () => {
      nativeChunks.length = 0;
      recording = true;
    },
    stopRecording: () => {
      recording = false;
      const native = mergeChunks(nativeChunks);
      nativeChunks.length = 0;
      return downsampleTo16k(native, nativeSampleRate || audioContext.sampleRate);
    },
    destroy: () => {
      recording = false;
      nativeChunks.length = 0;
      processor.disconnect();
      source.disconnect();
      void audioContext.close();
      releaseMicrophoneStream(stream);
    },
    isRecording: () => recording,
  };
}
