import { describe, expect, test } from "bun:test";
import { isDevIosSimulation, isIosDevice, isIosStandaloneWebApp } from "./iosStandalone";

describe("iosStandalone dev simulation", () => {
  test("is disabled outside dev builds", () => {
    expect(isDevIosSimulation()).toBe(false);
  });

  test("isIosDevice follows user agent when simulation is off", () => {
    expect(isIosDevice()).toBe(false);
  });

  test("isIosStandaloneWebApp is false in test environment", () => {
    expect(isIosStandaloneWebApp()).toBe(false);
  });
});
