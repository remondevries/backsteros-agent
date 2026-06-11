import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_SIDECAR_TOKEN, getSidecarToken } from "./config.ts";

describe("getSidecarToken", () => {
  let previousToken: string | undefined;

  beforeEach(() => {
    previousToken = process.env.SIDECAR_TOKEN;
  });

  afterEach(() => {
    if (previousToken === undefined) delete process.env.SIDECAR_TOKEN;
    else process.env.SIDECAR_TOKEN = previousToken;
  });

  test("defaults to dev token when SIDECAR_TOKEN is unset", () => {
    delete process.env.SIDECAR_TOKEN;
    expect(getSidecarToken()).toBe(DEFAULT_SIDECAR_TOKEN);
  });

  test("reads SIDECAR_TOKEN from env when set", () => {
    process.env.SIDECAR_TOKEN = "custom-token";
    expect(getSidecarToken()).toBe("custom-token");
  });
});
