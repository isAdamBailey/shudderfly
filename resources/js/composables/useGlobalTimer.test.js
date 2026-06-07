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

describe("composables/useGlobalTimer persistence", () => {
  const STORAGE_KEY = "shudderfly.worldClock.timer";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    window.speechSynthesis.speak.mockClear();
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    useGlobalTimer().stop();
    localStorage.removeItem(STORAGE_KEY);
    vi.useRealTimers();
  });

  it("writes only the end time on start, and clears it on stop (no per-tick writes)", () => {
    const t = useGlobalTimer();
    t.start(10 * 60);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({
      endTime: Date.now() + 10 * 60 * 1000
    });

    vi.advanceTimersByTime(60 * 1000);
    // Still the original end time — ticking doesn't rewrite storage.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).endTime).toBe(
      Date.now() - 60 * 1000 + 10 * 60 * 1000
    );

    t.stop();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears the persisted end time once the countdown finishes naturally", () => {
    const t = useGlobalTimer();
    t.start(60);
    vi.advanceTimersByTime(60 * 1000);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("resumes a still-running countdown from the stored end time on reload", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ endTime: Date.now() + 10 * 60 * 1000 })
    );

    vi.resetModules();
    const { useGlobalTimer: reloadedUseGlobalTimer } = await import(
      "@/composables/useGlobalTimer"
    );
    const t = reloadedUseGlobalTimer();

    expect(t.active.value).toBe(true);
    expect(t.remainingSeconds.value).toBe(10 * 60);

    t.stop();
  });

  it("discards an already-expired stored end time without re-announcing", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime: Date.now() - 1000 }));

    vi.resetModules();
    const { useGlobalTimer: reloadedUseGlobalTimer } = await import(
      "@/composables/useGlobalTimer"
    );
    const t = reloadedUseGlobalTimer();

    expect(t.active.value).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
