const INITIAL_RETRY_MS = 2_000;
const MAX_RETRIES = 3;

export function isLinearRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota exceeded|rate limit|ratelimited|too many requests|\b429\b/i.test(message);
}

export async function withLinearRateLimitRetry<T>(
  action: () => Promise<T>,
  options?: { label?: string },
): Promise<T> {
  let attempt = 0;
  let waitMs = INITIAL_RETRY_MS;

  while (true) {
    try {
      return await action();
    } catch (error) {
      attempt += 1;
      if (!isLinearRateLimitError(error) || attempt > MAX_RETRIES) {
        throw error;
      }
      if (options?.label) {
        console.warn(
          `${options.label} rate limited — retry ${attempt}/${MAX_RETRIES} in ${Math.round(waitMs / 1000)}s`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      waitMs = Math.min(waitMs * 2, 60_000);
    }
  }
}
