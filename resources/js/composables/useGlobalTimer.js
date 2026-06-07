import { computed, ref } from "vue";

// A single shared countdown timer for the whole app. Every clock (including the
// nav logo clock) reads this same state, so the red timer pie is identical
// everywhere. Module-level singleton — controls live in one place (the World
// Clock customizer) but the visual applies to all clocks.

const HOUR_MS = 60 * 60 * 1000;
const STORAGE_KEY = "shudderfly.worldClock.timer";

const endTime = ref(0);
const remainingMs = ref(0);
const active = ref(false);
let intervalId = null;
let completed = false;

const clear = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

// Persisting only happens on start/stop/completion (not on every 250ms tick)
// so a running countdown survives a refresh without adding storage writes to
// the hot loop — `endTime` alone is enough to recompute everything on load.
const clearStored = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing timer state:", e);
  }
};

const persistEndTime = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime: value }));
  } catch (e) {
    console.error("Error saving timer state:", e);
  }
};

// Speak "Time's up!" using the user's stored speech settings, independent of
// any mounted component so it fires even when the timer finishes on another
// page (the logo clock keeps the timer visible app-wide).
const announce = (text) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(localStorage.getItem("speechRate") || "1");
    utterance.pitch = parseFloat(localStorage.getItem("speechPitch") || "1");
    utterance.volume = parseFloat(localStorage.getItem("speechVolume") || "1");
    const voices = window.speechSynthesis.getVoices();
    const index = parseInt(localStorage.getItem("selectedVoiceIndex") || "0", 10);
    if (voices && voices[index]) utterance.voice = voices[index];
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("Error announcing timer:", e);
  }
};

const update = () => {
  const rem = Math.max(0, endTime.value - Date.now());
  remainingMs.value = rem;
  if (rem <= 0 && active.value) {
    active.value = false;
    clear();
    clearStored();
    if (!completed) {
      completed = true;
      announce("Time's up!");
    }
  }
};

const start = (seconds) => {
  completed = false;
  endTime.value = Date.now() + seconds * 1000;
  remainingMs.value = seconds * 1000;
  active.value = true;
  clear();
  intervalId = setInterval(update, 250);
  persistEndTime(endTime.value);
};

const stop = () => {
  active.value = false;
  completed = false;
  remainingMs.value = 0;
  clear();
  clearStored();
};

// Resume a countdown that was already running before a refresh/reload. Only
// `endTime` (a fixed timestamp) needs to be stored — remaining time is
// recomputed from the current clock, so the countdown picks up exactly where
// it should be rather than resetting.
(function restore() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (e) {
    console.error("Error loading timer state:", e);
  }

  const storedEndTime = Number(stored?.endTime);
  const remaining = storedEndTime - Date.now();
  if (!Number.isFinite(storedEndTime) || remaining <= 0) {
    if (stored) clearStored();
    return;
  }

  endTime.value = storedEndTime;
  remainingMs.value = remaining;
  active.value = true;
  intervalId = setInterval(update, 250);
})();

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000));
const fraction = computed(() => Math.min(1, remainingMs.value / HOUR_MS));

export function useGlobalTimer() {
  return { active, remainingMs, remainingSeconds, fraction, start, stop };
}
