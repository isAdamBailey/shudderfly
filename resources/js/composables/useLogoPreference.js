import { useWorldClockSync } from "@/composables/useWorldClockSync";

// Lets users replace the top-left nav logo with a configured clock. The choice
// is now part of the shared server state (see useWorldClockSync), so the same
// logo clock shows for everyone. The logo only records WHICH city is pinned —
// its appearance (face/hands/numerals) is the shared global appearance, so the
// nav logo always matches the clocks on the World Clock page. `logo` is the
// live shared object, mutated in place so the nav logo updates app-wide.

export function useLogoPreference() {
  const sync = useWorldClockSync();
  const logo = sync.state.logo;

  function logoPayload() {
    return {
      enabled: logo.enabled,
      cityName: logo.cityName,
      timezone: logo.timezone
    };
  }

  function setLogoClock(config) {
    Object.assign(logo, {
      enabled: true,
      cityName: config.cityName || "",
      timezone: config.timezone || ""
    });
    sync.push("world-clock.logo.update", "put", logoPayload());
  }

  function clearLogoClock() {
    Object.assign(logo, { enabled: false, cityName: "", timezone: "" });
    sync.push("world-clock.logo.update", "put", logoPayload());
  }

  return { logo, setLogoClock, clearLogoClock };
}
