import { describe, expect, test } from "bun:test";
import {
  cachedRequest,
  invalidateRequestCache,
  peekCached,
  REQUEST_CACHE_KEYS,
} from "./requestCache";

describe("requestCache", () => {
  test("returns cached value within ttl", async () => {
    invalidateRequestCache();
    let calls = 0;

    const fetcher = async () => {
      calls += 1;
      return { ok: true };
    };

    await cachedRequest(REQUEST_CACHE_KEYS.health, fetcher, { ttlMs: 60_000 });
    await cachedRequest(REQUEST_CACHE_KEYS.health, fetcher, { ttlMs: 60_000 });

    expect(calls).toBe(1);
    expect(peekCached<{ ok: boolean }>(REQUEST_CACHE_KEYS.health, 60_000)).toEqual({ ok: true });
  });

  test("force bypasses cache", async () => {
    invalidateRequestCache();
    let calls = 0;

    const fetcher = async () => {
      calls += 1;
      return calls;
    };

    await cachedRequest("test-key", fetcher, { ttlMs: 60_000 });
    await cachedRequest("test-key", fetcher, { ttlMs: 60_000, force: true });

    expect(calls).toBe(2);
  });
});
