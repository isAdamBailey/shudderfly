import { ref } from "vue";

// One voice clip plays at a time across the page: every player, and the
// timeline's speak button for a voice-only message, go through here.
const playingSrc = ref(null);
let audio = null;

export function stopVoiceClip() {
    if (audio) {
        audio.removeEventListener("ended", stopVoiceClip);
        audio.pause();
        audio = null;
    }
    playingSrc.value = null;
}

export function playVoiceClip(src) {
    stopVoiceClip();
    if (!src) return;
    const el = new Audio(src);
    audio = el;
    el.addEventListener("ended", stopVoiceClip);
    playingSrc.value = src;
    // A clip cut short by switching to another rejects; only stop if this
    // one is still the clip playing.
    el.play().catch(() => {
        if (audio === el) stopVoiceClip();
    });
}

export function useVoiceClipPlayback() {
    return { playingSrc, playVoiceClip, stopVoiceClip };
}
