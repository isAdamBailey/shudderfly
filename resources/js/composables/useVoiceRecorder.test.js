import {
    pickMimeType,
    reasonFor,
    useVoiceRecorder,
} from "@/composables/useVoiceRecorder";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const { mockStopSpeech, mockPauseMusic, mockStopVoiceClip } = vi.hoisted(
    () => ({
        mockStopSpeech: vi.fn(),
        mockPauseMusic: vi.fn(),
        mockStopVoiceClip: vi.fn(),
    })
);

vi.mock("@/composables/useVoiceClipPlayback", () => ({
    stopVoiceClip: mockStopVoiceClip,
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({ stopSpeech: mockStopSpeech }),
}));

vi.mock("@/composables/useMusicPlayer", () => ({
    useMusicPlayer: () => ({ pause: mockPauseMusic }),
}));

class FakeRecorder {
    static isTypeSupported(type) {
        return FakeRecorder.supported.includes(type);
    }
    constructor(stream, options) {
        this.mimeType = options?.mimeType ?? "";
        this.state = "inactive";
        FakeRecorder.last = this;
    }
    start() {
        this.state = "recording";
    }
    stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voice"]) });
        this.onstop?.();
    }
}

FakeRecorder.supported = ["audio/webm;codecs=opus", "audio/webm"];

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] };

function setup(options) {
    let recorder;
    const wrapper = mount(
        defineComponent({
            setup() {
                recorder = useVoiceRecorder(options);
                return () => h("div");
            },
        })
    );
    return { recorder, wrapper };
}

describe("useVoiceRecorder", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        window.MediaRecorder = FakeRecorder;
        navigator.mediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue(stream),
        };
        URL.createObjectURL = vi.fn(() => "blob:clip");
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete window.MediaRecorder;
        delete navigator.mediaDevices;
    });

    it("records, stops on tap, and leaves a clip to preview", async () => {
        const { recorder } = setup();

        await recorder.start();
        expect(recorder.state.value).toBe("recording");
        expect(FakeRecorder.last.mimeType).toBe("audio/webm;codecs=opus");

        vi.advanceTimersByTime(3000);
        recorder.stop();

        expect(recorder.state.value).toBe("recorded");
        expect(recorder.clip.value.url).toBe("blob:clip");
        expect(recorder.clip.value.extension).toBe("webm");
        expect(recorder.clip.value.duration).toBeCloseTo(3, 0);
        expect(track.stop).toHaveBeenCalled();
    });

    it("stops on its own at the cap", async () => {
        const { recorder } = setup({ maxSeconds: 5 });

        await recorder.start();
        vi.advanceTimersByTime(5250);

        expect(recorder.state.value).toBe("recorded");
        expect(recorder.clip.value.duration).toBe(5);
    });

    it("silences speech, the music and voice clips before recording", async () => {
        const { recorder } = setup();

        await recorder.start();

        expect(mockStopSpeech).toHaveBeenCalled();
        expect(mockPauseMusic).toHaveBeenCalled();
        expect(mockStopVoiceClip).toHaveBeenCalled();
    });

    it("opens the mic once when tapped twice during the permission prompt", async () => {
        const { recorder } = setup();

        await Promise.all([recorder.start(), recorder.start()]);

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });

    it("doesn't record if the builder closes during the permission prompt", async () => {
        let grant;
        navigator.mediaDevices.getUserMedia.mockReturnValue(
            new Promise((resolve) => (grant = resolve))
        );
        const { recorder, wrapper } = setup();

        const starting = recorder.start();
        wrapper.unmount();
        grant(stream);
        await starting;

        expect(recorder.state.value).not.toBe("recording");
        expect(track.stop).toHaveBeenCalled();
    });

    it("discards a clip", async () => {
        const { recorder } = setup();
        await recorder.start();
        recorder.stop();

        recorder.discard();

        expect(recorder.state.value).toBe("idle");
        expect(recorder.clip.value).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:clip");
    });

    it("says recording is unsupported without MediaRecorder", async () => {
        delete window.MediaRecorder;
        const { recorder } = setup();

        await recorder.start();

        expect(recorder.error.value).toBe("unsupported");
        expect(recorder.state.value).toBe("idle");
    });

    it("says the mic is blocked when permission is denied", async () => {
        navigator.mediaDevices.getUserMedia.mockRejectedValue(
            Object.assign(new Error("no"), { name: "NotAllowedError" })
        );
        const { recorder } = setup();

        await recorder.start();

        expect(recorder.error.value).toBe("denied");
    });

    it("maps getUserMedia errors to a reason", () => {
        expect(reasonFor({ name: "NotFoundError" })).toBe("no_mic");
        expect(reasonFor({ name: "SecurityError" })).toBe("denied");
        expect(reasonFor({ name: "AbortError" })).toBe("error");
    });

    it("falls back to MP4 where WebM isn't recordable (Safari)", () => {
        const safari = { isTypeSupported: (type) => type === "audio/mp4" };
        expect(pickMimeType(safari)).toBe("audio/mp4");
    });
});
