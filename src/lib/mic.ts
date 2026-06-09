export type MicrophoneAccessResult = {
  stream: MediaStream;
  sampleRate: number;
};

export type MicrophoneAccessError = {
  code: "unsupported" | "denied" | "failed";
  message: string;
};

const PREFERRED_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function isMicrophoneSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function requestMicrophoneAccess(): Promise<
  MicrophoneAccessResult | MicrophoneAccessError
> {
  if (!isMicrophoneSupported()) {
    return {
      code: "unsupported",
      message: "Microphone access is not available in this environment.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: PREFERRED_CONSTRAINTS,
    });
    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings();
    return {
      stream,
      sampleRate: settings?.sampleRate ?? 48_000,
    };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        code: "denied",
        message: "Microphone permission was denied.",
      };
    }

    return {
      code: "failed",
      message: error instanceof Error ? error.message : "Failed to access microphone.",
    };
  }
}

export function releaseMicrophoneStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
