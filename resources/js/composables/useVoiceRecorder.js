import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { stopVoiceClip } from "@/composables/useVoiceClipPlayback";
import { onUnmounted, ref } from "vue";

// Preferred first. Chrome and Firefox take WebM/Opus; Safari only records
// MP4/AAC. The server transcodes whichever arrives to M4A.
const MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
];

const EXTENSIONS = { webm: "webm", mp4: "m4a", ogg: "ogg" };

export function pickMimeType(recorder = window.MediaRecorder) {
    if (typeof recorder?.isTypeSupported !== "function") return "";
    return MIME_TYPES.find((type) => recorder.isTypeSupported(type)) ?? "";
}

// The translation key (`voice.<reason>`) for why recording couldn't start.
export function reasonFor(error) {
    switch (error?.name) {
        case "NotAllowedError":
        case "SecurityError":
            return "denied";
        case "NotFoundError":
        case "OverconstrainedError":
            return "no_mic";
        default:
            return "error";
    }
}

/**
 * Records a voice clip on the device (getUserMedia + MediaRecorder, never the
 * Web Speech API). Tap start, tap stop; it stops by itself at `maxSeconds`.
 * Starting silences speech, the music and any playing voice clip so none of
 * them lands in the clip.
 *
 * state: "idle" → "recording" → "recorded" (a clip to preview, post or
 * discard). `error` holds the reason recording couldn't start.
 */
export function useVoiceRecorder({ maxSeconds = 60 } = {}) {
    const { stopSpeech } = useSpeechSynthesis();
    const { pause: pauseMusic } = useMusicPlayer();

    const state = ref("idle");
    const elapsed = ref(0);
    const clip = ref(null); // { blob, url, duration, extension }
    const error = ref(null);

    let recorder = null;
    let stream = null;
    let chunks = [];
    let startedAt = 0;
    let ticker = null;
    // Waiting on the permission prompt: a second tap mustn't open the mic
    // twice, and closing the builder meanwhile mustn't start recording.
    let starting = false;
    let unmounted = false;

    const releaseMic = () => {
        clearInterval(ticker);
        ticker = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
    };

    const discard = () => {
        if (clip.value?.url) URL.revokeObjectURL(clip.value.url);
        clip.value = null;
        elapsed.value = 0;
        state.value = "idle";
    };

    const stop = () => {
        if (recorder?.state === "recording") recorder.stop();
    };

    const start = async () => {
        error.value = null;
        if (starting || state.value === "recording") return;

        if (
            typeof window.MediaRecorder !== "function" ||
            !navigator.mediaDevices?.getUserMedia
        ) {
            error.value = "unsupported";
            return;
        }

        stopSpeech();
        pauseMusic();
        stopVoiceClip();

        starting = true;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
        } catch (e) {
            error.value = reasonFor(e);
            return;
        } finally {
            starting = false;
        }
        if (unmounted) {
            releaseMic();
            return;
        }

        discard();
        const mimeType = pickMimeType();
        try {
            recorder = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined
            );
        } catch (e) {
            releaseMic();
            error.value = "unsupported";
            return;
        }

        chunks = [];
        recorder.ondataavailable = (event) => {
            if (event.data?.size) chunks.push(event.data);
        };
        recorder.onstop = () => {
            const duration = Math.min(
                (Date.now() - startedAt) / 1000,
                maxSeconds
            );
            releaseMic();
            const type = recorder.mimeType || mimeType || "audio/webm";
            const blob = new Blob(chunks, { type });
            chunks = [];
            if (!blob.size) {
                error.value = "error";
                state.value = "idle";
                return;
            }
            clip.value = {
                blob,
                url: URL.createObjectURL(blob),
                duration,
                extension: EXTENSIONS[type.split(/[/;]/)[1]] ?? "webm",
            };
            state.value = "recorded";
        };

        startedAt = Date.now();
        elapsed.value = 0;
        recorder.start();
        state.value = "recording";
        ticker = setInterval(() => {
            elapsed.value = Math.min(
                Math.floor((Date.now() - startedAt) / 1000),
                maxSeconds
            );
            if (elapsed.value >= maxSeconds) stop();
        }, 250);
    };

    onUnmounted(() => {
        unmounted = true;
        if (recorder) recorder.onstop = null;
        stop();
        releaseMic();
        discard();
    });

    return { state, elapsed, clip, error, start, stop, discard };
}
