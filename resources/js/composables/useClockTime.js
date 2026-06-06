import { computed, onMounted, onUnmounted, ref, unref } from "vue";

// Pure helper: given an IANA timezone and a Date, return the local clock parts.
// DST is handled by the browser's Intl engine. `hours` is a 0-12 fractional
// value (including minute/second contributions) so the hour hand sweeps
// smoothly. Exported separately so it can be unit-tested without mounting.

// Intl.DateTimeFormat is comparatively expensive to construct and this runs on
// every animation frame for every clock, so cache one formatter per timezone.
const formatterCache = new Map();
function getFormatter(timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function getZonedParts(timeZone, date) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const read = (type) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  let hour24 = read("hour");
  // Some engines render midnight as "24" with hour12:false.
  if (hour24 === 24) hour24 = 0;
  const minutes = read("minute");
  const seconds = read("second");
  const milliseconds = date.getMilliseconds();

  return {
    hour24,
    minutes,
    seconds,
    milliseconds,
    hours: (hour24 % 12) + minutes / 60 + seconds / 3600
  };
}

// A single shared animation loop drives every clock on the page, so adding more
// clocks does not add more timers. The loop only runs while at least one clock
// is mounted.
const now = ref(Date.now());
let rafId = null;
let subscribers = 0;

function tick() {
  now.value = Date.now();
  rafId = requestAnimationFrame(tick);
}

function startTicking() {
  subscribers += 1;
  if (subscribers === 1 && typeof requestAnimationFrame === "function") {
    tick();
  }
}

function stopTicking() {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers === 0 && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function useClockTime(timezone) {
  onMounted(startTicking);
  onUnmounted(stopTicking);

  const parts = computed(() =>
    getZonedParts(unref(timezone) || "UTC", new Date(now.value))
  );

  return {
    hours: computed(() => parts.value.hours),
    minutes: computed(() => parts.value.minutes),
    seconds: computed(() => parts.value.seconds),
    milliseconds: computed(() => parts.value.milliseconds),
    hour24: computed(() => parts.value.hour24)
  };
}
