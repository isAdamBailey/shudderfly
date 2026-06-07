import { useWorldClockPreferences } from "@/composables/useWorldClockPreferences";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// One shared watcher for the file, mirroring the singleton in the app.
const sync = useWorldClockSync();
const { prefs } = useWorldClockPreferences(6);

describe("composables/useWorldClockPreferences", () => {
  beforeEach(() => {
    window.Echo = {
      socketId: () => "socket-123",
      private: () => ({ listen: () => {} })
    };
    window.axios = {
      request: vi.fn().mockResolvedValue({
        data: { server_now: new Date().toISOString() }
      })
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves an appearance change after the debounce", async () => {
    prefs.facePreset = "night";
    await nextTick();
    vi.advanceTimersByTime(300);
    expect(window.axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/world-clock/settings",
        method: "put"
      })
    );
  });

  it("does not write a stale value when a remote update supersedes the edit", async () => {
    window.axios.request.mockClear();
    prefs.facePreset = "ornate";
    await nextTick();
    // A genuine remote change arrives before the debounce fires.
    sync.applyRemote({
      face_preset: "minimal",
      server_now: new Date().toISOString()
    });
    await nextTick();
    vi.advanceTimersByTime(300);
    expect(window.axios.request).not.toHaveBeenCalled();
  });
});
