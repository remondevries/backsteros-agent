import { afterEach, describe, expect, test } from "bun:test";
import { resolveAppBuildSha } from "./build-meta.ts";

describe("resolveAppBuildSha", () => {
  const previousAppBuildSha = process.env.APP_BUILD_SHA;
  const previousKamalVersion = process.env.KAMAL_VERSION;

  afterEach(() => {
    if (previousAppBuildSha === undefined) {
      delete process.env.APP_BUILD_SHA;
    } else {
      process.env.APP_BUILD_SHA = previousAppBuildSha;
    }
    if (previousKamalVersion === undefined) {
      delete process.env.KAMAL_VERSION;
    } else {
      process.env.KAMAL_VERSION = previousKamalVersion;
    }
  });

  test("prefers APP_BUILD_SHA env", () => {
    process.env.APP_BUILD_SHA = "env-sha";
    delete process.env.KAMAL_VERSION;
    expect(resolveAppBuildSha()).toBe("env-sha");
  });

  test("falls back to KAMAL_VERSION", () => {
    delete process.env.APP_BUILD_SHA;
    process.env.KAMAL_VERSION = "kamal-sha";
    expect(resolveAppBuildSha()).toBe("kamal-sha");
  });
});
