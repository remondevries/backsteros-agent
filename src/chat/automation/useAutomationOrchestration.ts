import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import {
  createFlowAssistantMessage,
  markFlowFollowUpEnqueued,
  scheduleFlowFollowUp,
  shouldScheduleFlowFollowUp,
} from "./followUp";
import { resolveInitialRunFollowUpStep } from "./orchestration";
import { getAutomationDefinition, getRegisteredAutomationFlowIds } from "./registry";
import type { AutomationFlowId, FollowUpQuestionnaireStep } from "./types";
import { getFollowUpPromptStep, getFollowUpQuestionnaireStep } from "./types";

type ComposerFocus = () => void;

type QuestionnaireState = {
  flowId: AutomationFlowId;
  runId: string;
  stepId: string;
  questionIndex: number;
  answers: string[];
  submitPayload: string | null;
};

export function useAutomationOrchestration({
  messagesRef,
  enqueueReveal,
  setMessages,
  setComposerQuickActionId,
  focusComposer,
}: {
  messagesRef: React.RefObject<ChatMessage[]>;
  enqueueReveal: (reveal: () => void, id?: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setComposerQuickActionId: React.Dispatch<React.SetStateAction<string | null>>;
  focusComposer: ComposerFocus;
}) {
  const [awaitingState, setAwaitingState] = useState<Partial<Record<AutomationFlowId, string>>>({});
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireState | null>(null);
  const enqueuedFollowUpRef = useRef(new Set<string>());

  const clearRegisteredAutomationState = useCallback(() => {
    setAwaitingState({});
    setQuestionnaireState(null);
  }, []);

  const clearEnqueuedFollowUps = useCallback(() => {
    enqueuedFollowUpRef.current.clear();
  }, []);

  const isAwaitingFollowUp = useCallback(
    (flowId: AutomationFlowId) => awaitingState[flowId] != null,
    [awaitingState],
  );

  const getAwaitingAnswerQuickActionId = useCallback(
    (flowId: AutomationFlowId) => awaitingState[flowId],
    [awaitingState],
  );

  const resetAwaitingFollowUp = useCallback((flowId: AutomationFlowId) => {
    setAwaitingState((current) => {
      if (current[flowId] == null) return current;
      const next = { ...current };
      delete next[flowId];
      return next;
    });
    setQuestionnaireState((current) => (current?.flowId === flowId ? null : current));
  }, []);

  const getQuestionnaireSubmitPayload = useCallback(() => {
    return questionnaireState?.submitPayload ?? null;
  }, [questionnaireState]);

  const clearQuestionnaireSubmitPayload = useCallback(() => {
    setQuestionnaireState((current) =>
      current ? { ...current, submitPayload: null } : current,
    );
  }, []);

  const revealQuestionnaireQuestion = useCallback(
    (
      definition: NonNullable<ReturnType<typeof getAutomationDefinition>>,
      step: FollowUpQuestionnaireStep,
      runId: string,
      questionIndex: number,
    ) => {
      const question = step.questions[questionIndex];
      if (!question) return;

      setMessages((current) => [
        ...current,
        createFlowAssistantMessage({
          text: question,
          flowVariant: definition.flowVariant,
          flowRunId: runId,
        }),
      ]);
      setComposerQuickActionId(step.composerQuickActionId);
      setAwaitingState((current) => ({
        ...current,
        [definition.id]: step.interimAnswerQuickActionId,
      }));
      setQuestionnaireState((current) => {
        if (questionIndex === 0 || !current || current.flowId !== definition.id || current.runId !== runId) {
          return {
            flowId: definition.id,
            runId,
            stepId: step.id,
            questionIndex,
            answers: [],
            submitPayload: null,
          };
        }
        return { ...current, questionIndex, submitPayload: null };
      });
      focusComposer();
    },
    [focusComposer, setComposerQuickActionId, setMessages],
  );

  const scheduleQuestionnaireQuestion = useCallback(
    (flowId: AutomationFlowId, runId: string, stepId: string, questionIndex: number) => {
      const definition = getAutomationDefinition(flowId);
      const step = definition ? getFollowUpQuestionnaireStep(definition, stepId) : undefined;
      if (!definition || !step) return;

      const pacingKey = step.questionPacingKey(runId, questionIndex);
      scheduleFlowFollowUp({
        enqueueReveal,
        pacingKey,
        onReveal: () => {
          revealQuestionnaireQuestion(definition, step, runId, questionIndex);
        },
      });
    },
    [enqueueReveal, revealQuestionnaireQuestion],
  );

  const scheduleQuestionnaireStart = useCallback(
    (flowId: AutomationFlowId, runId: string, stepId: string) => {
      const definition = getAutomationDefinition(flowId);
      const step = definition ? getFollowUpQuestionnaireStep(definition, stepId) : undefined;
      if (!definition || !step) return;

      const pacingKey = step.pacingKey(runId);
      if (
        !shouldScheduleFlowFollowUp({
          messages: messagesRef.current,
          runId,
          pacingKey,
          enqueuedKeys: enqueuedFollowUpRef.current,
          hasPromptForRun: step.hasQuestionnaireStartedForRun,
        })
      ) {
        return;
      }

      markFlowFollowUpEnqueued(enqueuedFollowUpRef.current, pacingKey);
      scheduleQuestionnaireQuestion(flowId, runId, stepId, 0);
    },
    [messagesRef, scheduleQuestionnaireQuestion],
  );

  const scheduleFollowUpPrompt = useCallback(
    (flowId: AutomationFlowId, runId: string, stepId: string) => {
      const definition = getAutomationDefinition(flowId);
      const step = definition ? getFollowUpPromptStep(definition, stepId) : undefined;
      if (!definition || !step) return;

      const pacingKey = step.pacingKey(runId);
      if (
        !shouldScheduleFlowFollowUp({
          messages: messagesRef.current,
          runId,
          pacingKey,
          enqueuedKeys: enqueuedFollowUpRef.current,
          hasPromptForRun: step.hasPromptForRun,
        })
      ) {
        return;
      }

      markFlowFollowUpEnqueued(enqueuedFollowUpRef.current, pacingKey);

      scheduleFlowFollowUp({
        enqueueReveal,
        pacingKey,
        onReveal: () => {
          const prompt =
            typeof step.prompt === "function" ? step.prompt({ runId }) : step.prompt;

          setMessages((current) => {
            if (step.hasPromptForRun(current, runId)) return current;
            return [
              ...current,
              createFlowAssistantMessage({
                text: prompt,
                flowVariant: definition.flowVariant,
                flowRunId: runId,
              }),
            ];
          });
          setComposerQuickActionId(step.composerQuickActionId);
          setAwaitingState((current) => ({
            ...current,
            [flowId]: step.answerQuickActionId,
          }));
          focusComposer();
        },
      });
    },
    [enqueueReveal, focusComposer, messagesRef, setComposerQuickActionId, setMessages],
  );

  const tryHandleQuestionnaireAnswer = useCallback(
    ({
      flowId,
      text,
      appendUserMessage,
    }: {
      flowId: AutomationFlowId;
      text: string;
      appendUserMessage: (message: ChatMessage) => void;
    }):
      | { status: "continue" }
      | { status: "submit"; payload: string; submitQuickActionId: string }
      | null => {
      const definition = getAutomationDefinition(flowId);
      const active = questionnaireState;
      if (!definition || !active || active.flowId !== flowId) return null;

      const step = getFollowUpQuestionnaireStep(definition, active.stepId);
      if (!step || !awaitingState[flowId]) return null;

      const nextAnswers = [...active.answers, text];

      if (nextAnswers.length < step.questions.length) {
        appendUserMessage({
          id: crypto.randomUUID(),
          role: "user",
          text,
          createdAt: Date.now(),
          quickActionId: step.interimAnswerQuickActionId,
          flowVariant: definition.flowVariant,
        });
        setQuestionnaireState({
          ...active,
          questionIndex: nextAnswers.length,
          answers: nextAnswers,
        });
        scheduleQuestionnaireQuestion(flowId, active.runId, step.id, nextAnswers.length);
        return { status: "continue" };
      }

      const payload = step.serializeAnswers(nextAnswers);
      setQuestionnaireState({
        ...active,
        answers: nextAnswers,
        submitPayload: payload,
      });
      setAwaitingState((current) => {
        const next = { ...current };
        delete next[flowId];
        return next;
      });
      setComposerQuickActionId(null);
      return {
        status: "submit",
        payload,
        submitQuickActionId: step.submitQuickActionId,
      };
    },
    [awaitingState, questionnaireState, scheduleQuestionnaireQuestion],
  );

  const onRegisteredAutomationRunPresentationComplete = useCallback(
    (quickActionId: string | undefined, runId: string) => {
      for (const flowId of getRegisteredAutomationFlowIds()) {
        const definition = getAutomationDefinition(flowId);
        if (!definition?.isInitialRun(quickActionId)) continue;

        const followUpStep = resolveInitialRunFollowUpStep(definition);
        if (!followUpStep) continue;

        if (followUpStep.kind === "followUpQuestionnaire") {
          scheduleQuestionnaireStart(flowId, runId, followUpStep.id);
        } else {
          scheduleFollowUpPrompt(flowId, runId, followUpStep.id);
        }
        return true;
      }

      return false;
    },
    [scheduleFollowUpPrompt, scheduleQuestionnaireStart],
  );

  return {
    awaitingState,
    questionnaireState,
    isAwaitingFollowUp,
    getAwaitingAnswerQuickActionId,
    resetAwaitingFollowUp,
    scheduleFollowUpPrompt,
    scheduleQuestionnaireStart,
    onRegisteredAutomationRunPresentationComplete,
    tryHandleQuestionnaireAnswer,
    getQuestionnaireSubmitPayload,
    clearQuestionnaireSubmitPayload,
    clearRegisteredAutomationState,
    clearEnqueuedFollowUps,
  };
}

export type AutomationOrchestration = ReturnType<typeof useAutomationOrchestration>;
