import { useWorldClockPreferences } from "@/composables/useWorldClockPreferences";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

let sync;
let prefs;

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

    // Initialize after stubs are in place so setupEcho() doesn't schedule retries.
    if (!sync) {
      sync = useWorldClockSync();
      ({ prefs } = useWorldClockPreferences(6));
    }
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

  it("does not re-save a change that arrived from a remote broadcast", async () => {
    window.axios.request.mockClear();
    // A live update from another client must update local state without echoing
    // back as a new save (which would cause a feedback loop).
    sync.applyRemote({
      face_preset: "minimal",
      server_now: new Date().toISOString()
    });
    await nextTick();
    vi.advanceTimersByTime(300);
    expect(prefs.facePreset).toBe("minimal");
    expect(window.axios.request).not.toHaveBeenCalled();
  });
});
