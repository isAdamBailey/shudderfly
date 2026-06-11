import { useGlobalTimer } from "@/composables/useGlobalTimer";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// Drive the shared end time the way the server would, so the timer derives its
// countdown from it. server_now == current time means a zero clock-skew offset.
const setTimer = (sync, msFromNow) => {
  const now = new Date();
  sync.applyRemote({
    timer_ends_at:
      msFromNow == null ? null : new Date(now.getTime() + msFromNow).toISOString(),
    server_now: now.toISOString()
  });
};

describe("composables/useGlobalTimer", () => {
  let sync;

  beforeEach(async () => {
    window.Echo = {
      socketId: () => "socket-123",
      private: () => ({ listen: () => {} })
    };
    sync = useWorldClockSync();
    setTimer(sync, null);
    await nextTick();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    window.speechSynthesis.speak.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a shared singleton across calls", async () => {
    const a = useGlobalTimer();
    const b = useGlobalTimer();
    setTimer(sync, 30 * 60 * 1000);
    await nextTick();
    await nextTick();
    expect(b.active.value).toBe(true);
    expect(a.fraction.value).toBeCloseTo(0.5, 2);
  });

  it("shrinks the fraction as time elapses", async () => {
    const t = useGlobalTimer();
    setTimer(sync, 60 * 60 * 1000);
    await nextTick();
    await nextTick();
    expect(t.fraction.value).toBeCloseTo(1, 2);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(t.fraction.value).toBeCloseTo(0.5, 1);
  });

  it("announces once and goes inactive at zero", async () => {
    const t = useGlobalTimer();
    setTimer(sync, 15 * 60 * 1000);
    await nextTick();
    await nextTick();
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(t.active.value).toBe(false);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60 * 1000);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it("does not announce on load when the timer already elapsed before this client connected", async () => {
    const t = useGlobalTimer();
    // Simulate hydration from server props where the timer ended in the past,
    // before this browser ever observed it counting down.
    setTimer(sync, -60 * 1000);
    await nextTick();
    await nextTick();
    expect(t.active.value).toBe(false);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("clearing the shared timer halts it without announcing", async () => {
    const t = useGlobalTimer();
    setTimer(sync, 30 * 60 * 1000);
    await nextTick();
    await nextTick();
    setTimer(sync, null);
    await nextTick();
    await nextTick();
    expect(t.active.value).toBe(false);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("start and stop push to the server", async () => {
    vi.useRealTimers();
    window.axios = {
      request: vi.fn().mockResolvedValue({
        data: { timer_ends_at: null, server_now: new Date().toISOString() }
      })
    };
    const { start, stop } = useGlobalTimer();

    await start(300);
    expect(window.axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/world-clock/timer",
        method: "post",
        data: { seconds: 300 }
      })
    );

    await stop();
    expect(window.axios.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/world-clock/timer", method: "delete" })
    );
  });
});
