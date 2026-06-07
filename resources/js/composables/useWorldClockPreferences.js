import { watch } from "vue";
import { useWorldClockSync } from "@/composables/useWorldClockSync";

// Clock cities + appearance presets, backed by the shared server state (see
// useWorldClockSync). The reactive `prefs` object IS the global state, so any
// change a user makes is debounced and pushed to the server, then broadcast to
// everyone. Public API is unchanged from the old localStorage version.

// Cities are seeded server-side now, so this no longer takes default cities.
export function useWorldClockPreferences(maxCities = 6) {
  const sync = useWorldClockSync();
  const prefs = sync.state;

  let timer = null;
  watch(
    () => [
      prefs.cities,
      prefs.facePreset,
      prefs.handPreset,
      prefs.numerals,
      prefs.secondHandMode
    ],
    () => {
      // Skip saves triggered by an incoming server payload — otherwise the
      // remote update would echo straight back as a new write.
      if (sync.isApplyingRemote()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        sync.push("world-clock.settings.update", "put", {
          cities: prefs.cities,
          face_preset: prefs.facePreset,
          hand_preset: prefs.handPreset,
          numerals: prefs.numerals,
          second_hand_mode: prefs.secondHandMode
        });
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
