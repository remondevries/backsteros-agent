export type LlmExtractTaskId = string;

export type LlmExtractTaskDefinition<TOutput> = {
  id: LlmExtractTaskId;
  description: string;
  systemInstruction: string;
  buildUserPrompt: (message: string, context?: Record<string, unknown>) => string;
  parseOutput: (raw: unknown) => TOutput;
  heuristicExtract?: (message: string, context?: Record<string, unknown>) => TOutput;
};

export type RunLlmExtractOptions = {
  context?: Record<string, unknown>;
  signal?: AbortSignal;
};

export class LlmExtractError extends Error {
  readonly taskId: string;
  readonly isRetryable: boolean;

  constructor(
    taskId: string,
    message: string,
    options: { isRetryable?: boolean } = {},
  ) {
    super(message);
    this.name = "LlmExtractError";
    this.taskId = taskId;
    this.isRetryable = options.isRetryable ?? false;
  }
}
