import { computed, ref } from "vue";

// A single shared countdown timer for the whole app. Every clock (including the
// nav logo clock) reads this same state, so the red timer pie is identical
// everywhere. Module-level singleton — controls live in one place (the World
// Clock customizer) but the visual applies to all clocks.

const HOUR_MS = 60 * 60 * 1000;

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
};

const stop = () => {
  active.value = false;
  completed = false;
  remainingMs.value = 0;
  clear();
};

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000));
const fraction = computed(() => Math.min(1, remainingMs.value / HOUR_MS));

export function useGlobalTimer() {
  return { active, remainingMs, remainingSeconds, fraction, start, stop };
}
