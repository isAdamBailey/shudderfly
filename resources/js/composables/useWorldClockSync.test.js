import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useWorldClockSync } from "@/composables/useWorldClockSync";

// A minimal Echo stub so setupEcho() completes instead of polling forever.
beforeEach(() => {
  window.Echo = {
    socketId: () => "socket-123",
    private: () => ({ listen: () => {} })
  };
});

describe("useWorldClockSync", () => {
  it("applies a remote payload to state and computes the server offset", async () => {
    const sync = useWorldClockSync();
    const serverNow = new Date(Date.now() + 60000).toISOString(); // 1 min ahead

    sync.applyRemote({
      cities: [{ name: "Berlin", timezone: "Europe/Berlin", country: "Germany" }],
      face_preset: "night",
      hand_preset: "ornate",
      numerals: "roman",
      second_hand_mode: "tick",
      logo: { enabled: true, cityName: "Berlin" },
      timer_ends_at: null,
      server_now: serverNow
    });

    expect(sync.state.cities[0].name).toBe("Berlin");
    expect(sync.state.facePreset).toBe("night");
    expect(sync.state.secondHandMode).toBe("tick");
    expect(sync.state.logo.enabled).toBe(true);
    // Server is ~60s ahead of the client.
    expect(sync.serverOffsetMs.value).toBeGreaterThan(50000);
    expect(sync.serverOffsetMs.value).toBeLessThan(70000);
  });

  it("flags applyingRemote during apply and clears it after a tick", async () => {
    const sync = useWorldClockSync();

    sync.applyRemote({ face_preset: "classic", server_now: new Date().toISOString() });
    expect(sync.isApplyingRemote()).toBe(true);

    await nextTick();
    expect(sync.isApplyingRemote()).toBe(false);
  });

  it("push sends the socket id header and returns the response without clobbering local state", async () => {
    window.axios = {
      request: vi.fn().mockResolvedValue({
        data: { face_preset: "minimal", server_now: new Date().toISOString() }
      })
    };

    const sync = useWorldClockSync();
    // Local edit the user is in the middle of making.
    sync.state.facePreset = "classic";

    const data = await sync.push("world-clock.settings.update", "put", {
      face_preset: "classic"
    });

    expect(window.axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/world-clock/settings",
        method: "put",
        headers: expect.objectContaining({ "X-Socket-ID": "socket-123" })
      })
    );
    // push returns the server payload but must NOT overwrite local state — that
    // would clobber an edit the user is still making.
    expect(data.face_preset).toBe("minimal");
    expect(sync.state.facePreset).toBe("classic");
  });
});
