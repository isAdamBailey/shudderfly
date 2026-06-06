import { reactive, toRaw, watch } from "vue";

const STORAGE_KEY = "shudderfly.worldClock";

const DEFAULTS = {
  facePreset: "theme",
  handPreset: "classic",
  numerals: "arabic",
  secondHandMode: "smooth",
  cities: []
};

function sanitize(raw) {
  const clean = {};
  if (typeof raw.facePreset === "string") clean.facePreset = raw.facePreset;
  if (typeof raw.handPreset === "string") clean.handPreset = raw.handPreset;
  if (typeof raw.numerals === "string") clean.numerals = raw.numerals;
  if (typeof raw.secondHandMode === "string")
    clean.secondHandMode = raw.secondHandMode;
  if (Array.isArray(raw.cities)) {
    clean.cities = raw.cities
      .filter((c) => c && c.timezone && c.name)
      .map((c) => ({
        name: String(c.name),
        timezone: String(c.timezone),
        country: c.country ? String(c.country) : ""
      }));
  }
  return clean;
}

export function useWorldClockPreferences(defaultCities = [], maxCities = 6) {
  const prefs = reactive({ ...DEFAULTS });

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) Object.assign(prefs, sanitize(JSON.parse(stored)));
  } catch (e) {
    console.error("Error loading world clock preferences:", e);
  }

  prefs.cities = prefs.cities.slice(0, maxCities);

  if (!prefs.cities.length) {
    prefs.cities = defaultCities.slice(0, maxCities).map((c) => ({
      name: c.name,
      timezone: c.timezone,
      country: c.country || ""
    }));
  }

  let timer = null;
  watch(
    prefs,
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(prefs)));
        } catch (e) {
          console.error("Error saving world clock preferences:", e);
        }
      }, 300);
    },
    { deep: true }
  );

  const hasCity = (city) =>
    prefs.cities.some(
      (c) => c.timezone === city.timezone && c.name === city.name
    );

  function addCity(city) {
    if (prefs.cities.length >= maxCities) return false;
    if (hasCity(city)) return false;
    prefs.cities.push({
      name: city.name,
      timezone: city.timezone,
      country: city.country || ""
    });
    return true;
  }

  function removeCity(city) {
    prefs.cities = prefs.cities.filter(
      (c) => !(c.timezone === city.timezone && c.name === city.name)
    );
  }

  return { prefs, addCity, removeCity, hasCity, maxCities };
}
