import { useCallback, useState } from "react";
import {
  GOOD_NIGHT_LABEL,
  GOOD_NIGHT_REFLECTION_QUESTIONS,
  GOOD_NIGHT_REFLECTION_COUNT,
} from "../chat/goodNight";
import { AssistantMessageContent } from "../chat/AssistantMessageContent";
import { runGoodNightFlow, submitGoodNightReflection } from "../lib/api";

type FlowPhase = "idle" | "running" | "reflect" | "submitting" | "done";

export function GoodNightFlowCard({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [answers, setAnswers] = useState<string[]>(
    () => Array.from({ length: GOOD_NIGHT_REFLECTION_COUNT }, () => ""),
  );
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startGoodNight = useCallback(async () => {
    setPhase("running");
    setError(null);
    setResponse(null);

    try {
      const result = await runGoodNightFlow();
      setResponse(result.response);
      setPhase("reflect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Good night flow failed");
      setPhase("idle");
    }
  }, []);

  const submitReflection = useCallback(async () => {
    if (answers.some((answer) => !answer.trim())) {
      setError("Please answer all reflection prompts.");
      return;
    }

    setPhase("submitting");
    setError(null);

    try {
      const result = await submitGoodNightReflection(answers.map((answer) => answer.trim()));
      setResponse(result.response);
      setAnswers(Array.from({ length: GOOD_NIGHT_REFLECTION_COUNT }, () => ""));
      setPhase("done");
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save evening reflection");
      setPhase("reflect");
    }
  }, [answers, onComplete]);

  return (
    <section className="app-dashboard-section dashboard-flow-card">
      <div className="app-dashboard-section-header">
        <h2 className="app-dashboard-section-title">{GOOD_NIGHT_LABEL}</h2>
      </div>

      {phase === "idle" && (
        <div className="dashboard-flow-body">
          <p className="app-dashboard-summary">
            Wrap up the day: update your daily note, roll Linear tasks forward, and reflect.
          </p>
          <button type="button" className="app-dashboard-action" onClick={() => void startGoodNight()}>
            Start {GOOD_NIGHT_LABEL.toLowerCase()}
          </button>
        </div>
      )}

      {phase === "running" && (
        <p className="app-dashboard-empty">Running evening routine…</p>
      )}

      {(phase === "reflect" || phase === "submitting") && (
        <div className="dashboard-flow-body">
          {response && (
            <div className="dashboard-flow-response dashboard-flow-opening-message">
              <AssistantMessageContent content={response} />
            </div>
          )}
          <p className="dashboard-flow-intro">Evening reflection</p>
          {GOOD_NIGHT_REFLECTION_QUESTIONS.map((question, index) => (
            <label key={question} className="dashboard-flow-field">
              <span className="dashboard-flow-label">{question}</span>
              <textarea
                className="dashboard-flow-textarea"
                value={answers[index] ?? ""}
                onChange={(event) => {
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  });
                }}
                rows={2}
                disabled={phase === "submitting"}
              />
            </label>
          ))}
          <button
            type="button"
            className="app-dashboard-action"
            disabled={phase === "submitting"}
            onClick={() => void submitReflection()}
          >
            {phase === "submitting" ? "Saving reflection…" : "Save evening reflection"}
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
