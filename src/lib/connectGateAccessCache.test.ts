import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  clearConnectGateAccessCache,
  isConnectGateAccessCached,
  writeConnectGateAccessCache,
} from "./connectGateAccessCache";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  globalThis.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

afterEach(() => {
  clearConnectGateAccessCache();
});

describe("connectGateAccessCache", () => {
  test("starts uncached", () => {
    expect(isConnectGateAccessCached()).toBe(false);
  });

  test("write marks access as cached", () => {
    writeConnectGateAccessCache();
    expect(isConnectGateAccessCached()).toBe(true);
  });

  test("clear removes cached access", () => {
    writeConnectGateAccessCache();
    clearConnectGateAccessCache();
    expect(isConnectGateAccessCached()).toBe(false);
  });
});
