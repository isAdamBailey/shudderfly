import {
  applySpeechSettingsToUtterance,
  getStoredAppLocale,
} from "@/composables/speechVoice";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { useTranslations } from "@/composables/useTranslations";
import { computed, ref, watch } from "vue";

// A single shared countdown timer for the whole app, backed by the global server
// state (see useWorldClockSync). The timer is stored as an absolute end time, so
// when one user starts it every client derives the same countdown — corrected by
// the server-time offset so clock skew doesn't matter. The red timer pie is
// therefore identical for everyone, on every page.

const HOUR_MS = 60 * 60 * 1000;

const { state, serverOffsetMs } = useWorldClockSync();

const remainingMs = ref(0);
const active = ref(false);
let intervalId = null;
// The end time we've already announced "Time's up!" for, so each timer fires the
// announcement exactly once even after a reconcile re-applies the same state.
let announcedFor = 0;

const endMs = () => {
  if (!state.timerEndsAt) return 0;
  const parsed = Date.parse(state.timerEndsAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clear = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

// Speak "Time's up!" using the user's stored speech settings, independent of any
// mounted component so it fires even when the timer finishes on another page.
const announce = (text, appLocale) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    applySpeechSettingsToUtterance(utterance, voices, appLocale);
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("Error announcing timer:", e);
  }
};

const update = () => {
  const end = endMs();
  if (!end) {
    remainingMs.value = 0;
    active.value = false;
    clear();
    return;
  }
  const serverNow = Date.now() + serverOffsetMs.value;
  const rem = Math.max(0, end - serverNow);
  remainingMs.value = rem;
  if (rem <= 0) {
    // Only announce if this client actually observed the timer counting down
    // (active was true on the previous tick). On initial page load the server
    // may report an end time that already passed before this client
    // connected — that should stay silent.
    const wasActive = active.value;
    active.value = false;
    clear();
    if (wasActive && announcedFor !== end) {
      announcedFor = end;
      const { t } = useTranslations();
      announce(t("world_clock.timer_done"), getStoredAppLocale());
    }
  } else {
    active.value = true;
  }
};

// Drive the countdown whenever the shared end time changes (a timer started or
// stopped by anyone). A single interval keeps every clock in sync.
watch(
  () => state.timerEndsAt,
  () => {
    const end = endMs();
    // Allow a fresh timer (or a re-used duration) to announce again.
    if (end && end > Date.now() + serverOffsetMs.value) announcedFor = 0;
    clear();
    update();
    if (active.value) intervalId = setInterval(update, 250);
  },
  { immediate: true }
);

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000));
const fraction = computed(() => Math.min(1, remainingMs.value / HOUR_MS));

export function useGlobalTimer() {
  const sync = useWorldClockSync();

  // Reconcile only the timer fields from the response so we pick up the
  // server's authoritative end time + clock offset without disturbing any
  // unsaved appearance/city edits.
  const start = async (seconds) => {
    const data = await sync.push("world-clock.timer.start", "post", { seconds });
    sync.reconcileTimer(data);
  };
  const stop = async () => {
    const data = await sync.push("world-clock.timer.stop", "delete");
    sync.reconcileTimer(data);
  };

  return { active, remainingMs, remainingSeconds, fraction, start, stop };
}
