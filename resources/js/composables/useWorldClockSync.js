/* global route */
import { nextTick, reactive, ref } from "vue";

// The single source of truth for the World Clock, shared by every user. State
// is a module-level singleton: it is hydrated from server props on load, pushed
// to the server (debounced by callers) on local change, and reconciled live via
// a Pusher/Echo broadcast. Replaces the old per-user localStorage storage so the
// chosen cities, appearance, timer, and logo clock are identical for everyone.

const DEFAULT_LOGO = {
  enabled: false,
  cityName: "",
  timezone: "",
  facePreset: "theme",
  handPreset: "classic",
  numerals: "none"
};

const state = reactive({
  cities: [],
  facePreset: "theme",
  handPreset: "classic",
  numerals: "arabic",
  secondHandMode: "smooth",
  logo: { ...DEFAULT_LOGO },
  timerEndsAt: null
});

// Difference between the server clock and this client's clock, recomputed from
// every payload's `server_now`. The timer countdown applies this offset so all
// clients agree on how much time is left regardless of local clock skew.
const serverOffsetMs = ref(0);

// True while we are applying a server payload, so the local save watchers can
// skip — otherwise an incoming change would echo straight back as a new save.
let applyingRemote = false;
let echoReady = false;
let echoAttempts = 0;
// Bumped on every full remote apply (hydrate / Echo broadcast). A pending
// debounced local save captures the epoch when scheduled and bails if it has
// changed, so a genuine remote update can't be clobbered by a stale save.
let remoteEpochValue = 0;

const isApplyingRemote = () => applyingRemote;
const remoteEpoch = () => remoteEpochValue;

function assignPayload(payload) {
  if (!payload || typeof payload !== "object") return;
  if (Array.isArray(payload.cities)) state.cities = payload.cities;
  if (typeof payload.face_preset === "string")
    state.facePreset = payload.face_preset;
  if (typeof payload.hand_preset === "string")
    state.handPreset = payload.hand_preset;
  if (typeof payload.numerals === "string") state.numerals = payload.numerals;
  if (typeof payload.second_hand_mode === "string")
    state.secondHandMode = payload.second_hand_mode;
  if (payload.logo && typeof payload.logo === "object") {
    // Mutate in place so references held by components (the nav logo) stay live.
    Object.assign(state.logo, DEFAULT_LOGO, payload.logo);
  }
  state.timerEndsAt = payload.timer_ends_at || null;

  if (payload.server_now) {
    const parsed = Date.parse(payload.server_now);
    if (!Number.isNaN(parsed)) serverOffsetMs.value = parsed - Date.now();
  }
}

// Apply full state that originated from the server (initial hydration or a live
// broadcast from another client) without triggering the local save watchers.
// Bumps the remote epoch so any in-flight local save is superseded.
function applyRemote(payload) {
  applyingRemote = true;
  remoteEpochValue += 1;
  assignPayload(payload);
  nextTick(() => {
    applyingRemote = false;
  });
}

// Apply only the timer fields from a server response. Used by the originating
// client after starting/stopping a timer to pick up the authoritative absolute
// end time + clock offset, WITHOUT touching cities/appearance/logo (which would
// clobber any local edit that hasn't been saved yet).
function reconcileTimer(payload) {
  if (!payload || typeof payload !== "object") return;
  state.timerEndsAt = payload.timer_ends_at || null;
  if (payload.server_now) {
    const parsed = Date.parse(payload.server_now);
    if (!Number.isNaN(parsed)) serverOffsetMs.value = parsed - Date.now();
  }
}

// Idempotent: called from both the layout (app-wide, for the nav logo + timer)
// and the World Clock page. Each Inertia navigation carries fresh server props.
function hydrate(initial) {
  applyRemote(initial);
}

// Persist a change to the server and return the fresh state. The originating
// client's local state is already authoritative, so we deliberately do NOT
// re-apply the full response here — that would overwrite fields the user is
// still editing. Other clients receive the change via the Echo broadcast; the
// X-Socket-ID header excludes this client from it, preventing a feedback loop.
async function push(routeName, method, body = {}) {
  try {
    const headers = {};
    const socketId = window.Echo?.socketId?.();
    if (socketId) headers["X-Socket-ID"] = socketId;

    const response = await window.axios.request({
      url: route(routeName),
      method,
      data: body,
      headers
    });
    return response.data;
  } catch (e) {
    console.error(`Error syncing world clock (${routeName}):`, e);
    return null;
  }
}

// Subscribe once to the broadcast channel. Mirrors the retry/guard pattern used
// for the messages channel; degrades silently when Echo/Pusher is unavailable.
function setupEcho() {
  if (echoReady) return;
  if (!window.Echo) {
    // Give up after ~10s: Pusher may be unconfigured, in which case the app
    // still works via server reconcile + fresh props on each navigation.
    if (echoAttempts++ >= 20) return;
    setTimeout(setupEcho, 500);
    return;
  }
  try {
    window.Echo.private("world-clock").listen(".WorldClockUpdated", (payload) =>
      applyRemote(payload)
    );
    echoReady = true;
  } catch (e) {
    console.error("Error setting up world clock Echo listener:", e);
  }
}

export function useWorldClockSync() {
  setupEcho();
  return {
    state,
    serverOffsetMs,
    hydrate,
    applyRemote,
    reconcileTimer,
    push,
    isApplyingRemote,
    remoteEpoch
  };
}
