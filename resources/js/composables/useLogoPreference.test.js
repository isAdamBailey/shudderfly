import { useLogoPreference } from "@/composables/useLogoPreference";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("composables/useLogoPreference", () => {
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
    useLogoPreference().clearLogoClock();
    window.axios.request.mockClear();
  });

  it("setLogoClock enables the chosen clock and pushes to the server", () => {
    const { logo, setLogoClock } = useLogoPreference();
    setLogoClock({ cityName: "Tokyo", timezone: "Asia/Tokyo" });

    expect(logo.enabled).toBe(true);
    expect(logo.timezone).toBe("Asia/Tokyo");
    expect(logo.cityName).toBe("Tokyo");

    expect(window.axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/world-clock/logo",
        method: "put",
        data: {
          enabled: true,
          cityName: "Tokyo",
          timezone: "Asia/Tokyo"
        }
      })
    );
  });

  it("clearLogoClock resets to the default logo and pushes", () => {
    const { logo, setLogoClock, clearLogoClock } = useLogoPreference();
    setLogoClock({ cityName: "Paris", timezone: "Europe/Paris" });
    expect(logo.enabled).toBe(true);

    clearLogoClock();
    expect(logo.enabled).toBe(false);
    expect(logo.timezone).toBe("");

    expect(window.axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "/api/world-clock/logo",
        method: "put",
        data: { enabled: false, cityName: "", timezone: "" }
      })
    );
  });
});
