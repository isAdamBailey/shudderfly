import { useGlobalTimer } from "@/composables/useGlobalTimer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("composables/useGlobalTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    window.speechSynthesis.speak.mockClear();
    useGlobalTimer().stop();
  });

  afterEach(() => {
    useGlobalTimer().stop();
    vi.useRealTimers();
  });

  it("is a shared singleton across calls", () => {
    const a = useGlobalTimer();
    const b = useGlobalTimer();
    a.start(30 * 60);
    expect(b.active.value).toBe(true);
    expect(b.fraction.value).toBeCloseTo(0.5, 2);
  });

  it("shrinks the fraction as time elapses", () => {
    const t = useGlobalTimer();
    t.start(60 * 60);
    expect(t.fraction.value).toBeCloseTo(1, 2);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(t.fraction.value).toBeCloseTo(0.5, 1);
  });

  it("announces once and goes inactive at zero", () => {
    const t = useGlobalTimer();
    t.start(15 * 60);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(t.active.value).toBe(false);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60 * 1000);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("stop() halts the timer without announcing", () => {
    const t = useGlobalTimer();
    t.start(30 * 60);
    t.stop();
    expect(t.active.value).toBe(false);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
