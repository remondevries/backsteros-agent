import { DotScrollLoader } from "./DotScrollLoader";

export type VoiceTurnPhase = "listening" | "processing";

const PHASE_LABELS: Record<VoiceTurnPhase, string> = {
  listening: "Listening…",
  processing: "Processing…",
};

export function VoiceTurnBubble({ phase }: { phase: VoiceTurnPhase }) {
  return (
    <div className="chat-turn voice-turn">
      <div className="chat-message user">
        <div
          className={`voice-turn-shell bubble voice-turn-shell-${phase}`}
          aria-live="polite"
        >
          <div className="voice-turn-status voice-turn-status-visible">
            <DotScrollLoader
              aria-label={phase === "listening" ? "Listening" : "Processing"}
              intervalMs={phase === "processing" ? 200 : 140}
            />
            <span className="voice-turn-label">{PHASE_LABELS[phase]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
