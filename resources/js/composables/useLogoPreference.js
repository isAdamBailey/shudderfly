import { reactive, toRaw, watch } from "vue";

// Lets the user replace the top-left nav logo with a configured clock. State is
// a module-level singleton reactive object so a write from the World Clock page
// is reflected live in the nav (localStorage alone is not cross-component
// reactive). The choice persists in localStorage across reloads.

const STORAGE_KEY = "shudderfly.worldClock.logo";

const DEFAULT = {
  enabled: false,
  cityName: "",
  timezone: "",
  facePreset: "theme",
  handPreset: "classic",
  numerals: "none"
};

const logo = reactive({ ...DEFAULT });

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") Object.assign(logo, parsed);
  }
} catch (e) {
  console.error("Error loading logo preference:", e);
}

watch(
  logo,
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(logo)));
    } catch (e) {
      console.error("Error saving logo preference:", e);
    }
  },
  { deep: true }
);

export function useLogoPreference() {
  function setLogoClock(config) {
    Object.assign(logo, {
      enabled: true,
      cityName: config.cityName || "",
      timezone: config.timezone || "",
      facePreset: config.facePreset || "classic",
      handPreset: config.handPreset || "classic",
      numerals: config.numerals || "none"
    });
  }

  function clearLogoClock() {
    Object.assign(logo, { ...DEFAULT });
  }

  return { logo, setLogoClock, clearLogoClock };
}
