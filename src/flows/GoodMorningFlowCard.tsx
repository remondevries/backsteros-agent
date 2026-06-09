import { useCallback, useEffect, useState } from "react";
import {
  GOOD_MORNING_LABEL,
  isMorningReviewChipVisible,
  markMorningReviewUsedToday,
} from "../chat/morningReview";
import { runGoodMorningFlow, submitGoodMorningFeel } from "../lib/api";

type FlowPhase = "idle" | "running" | "feel" | "submitting-feel" | "done";

export function GoodMorningFlowCard({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(() => isMorningReviewChipVisible());
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [feelAnswer, setFeelAnswer] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible(isMorningReviewChipVisible());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const startMorning = useCallback(async () => {
    setPhase("running");
    setError(null);
    setResponse(null);

    try {
      await runGoodMorningFlow();
      markMorningReviewUsedToday();
      setVisible(false);
      setPhase("feel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Good morning flow failed");
      setPhase("idle");
    }
  }, []);

  const submitFeel = useCallback(async () => {
    const answer = feelAnswer.trim();
    if (!answer) return;

    setPhase("submitting-feel");
    setError(null);

    try {
      const result = await submitGoodMorningFeel(answer);
      setResponse(result.response);
      setFeelAnswer("");
      setPhase("done");
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feel line");
      setPhase("feel");
    }
  }, [feelAnswer, onComplete]);

  if (!visible && phase === "idle") {
    return null;
  }

  return (
    <section className="app-dashboard-section dashboard-flow-card">
      <div className="app-dashboard-section-header">
        <h2 className="app-dashboard-section-title">{GOOD_MORNING_LABEL}</h2>
      </div>

      {phase === "idle" && (
        <div className="dashboard-flow-body">
          <p className="app-dashboard-summary">
            Run your morning routine: update today&apos;s daily note, sync Whoop, and load the day.
          </p>
          <button type="button" className="app-dashboard-action" onClick={() => void startMorning()}>
            Start {GOOD_MORNING_LABEL.toLowerCase()}
          </button>
        </div>
      )}

      {phase === "running" && (
        <p className="app-dashboard-empty">Running morning routine…</p>
      )}

      {(phase === "feel" || phase === "submitting-feel") && (
        <div className="dashboard-flow-body">
          <p className="app-dashboard-summary">How do you feel, and how was your sleep?</p>
          <textarea
            className="dashboard-flow-textarea"
            value={feelAnswer}
            onChange={(event) => setFeelAnswer(event.target.value)}
            placeholder="I feel rested and ready for the day…"
            rows={3}
            disabled={phase === "submitting-feel"}
          />
          <button
            type="button"
            className="app-dashboard-action"
            disabled={!feelAnswer.trim() || phase === "submitting-feel"}
            onClick={() => void submitFeel()}
          >
            {phase === "submitting-feel" ? "Saving…" : "Save feel line"}
          </button>
        </div>
      )}

      {phase === "done" && response && (
        <div className="dashboard-flow-body">
          <p className="dashboard-flow-response">{response}</p>
        </div>
      )}

      {error && <p className="dashboard-flow-error">{error}</p>}
    </section>
  );
}
