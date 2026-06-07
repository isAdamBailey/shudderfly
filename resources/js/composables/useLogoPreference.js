import { useWorldClockSync } from "@/composables/useWorldClockSync";

// Lets users replace the top-left nav logo with a configured clock. The choice
// is now part of the shared server state (see useWorldClockSync), so the same
// logo clock shows for everyone. `logo` is the live shared object — mutated in
// place so the nav logo updates app-wide. Public API is unchanged.

export function useLogoPreference() {
  const sync = useWorldClockSync();
  const logo = sync.state.logo;

  function setLogoClock(config) {
    Object.assign(logo, {
      enabled: true,
      cityName: config.cityName || "",
      timezone: config.timezone || "",
      facePreset: config.facePreset || "classic",
      handPreset: config.handPreset || "classic",
      numerals: config.numerals || "none"
    });
    sync.push("world-clock.logo.update", "put", { ...logo });
  }

  function clearLogoClock() {
    Object.assign(logo, {
      enabled: false,
      cityName: "",
      timezone: "",
      facePreset: "theme",
      handPreset: "classic",
      numerals: "none"
    });
    sync.push("world-clock.logo.update", "put", { ...logo });
  }

  return { logo, setLogoClock, clearLogoClock };
}
