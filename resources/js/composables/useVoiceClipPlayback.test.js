import {
    playVoiceClip,
    stopVoiceClip,
    useVoiceClipPlayback,
} from "@/composables/useVoiceClipPlayback";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useVoiceClipPlayback", () => {
    let rejects;

    beforeEach(() => {
        rejects = [];
        vi.stubGlobal(
            "Audio",
            vi.fn(function (src) {
                this.src = src;
                this.pause = vi.fn();
                this.addEventListener = vi.fn();
                this.removeEventListener = vi.fn();
                this.play = () =>
                    new Promise((resolve, reject) => rejects.push(reject));
            })
        );
    });

    afterEach(() => {
        stopVoiceClip();
        vi.unstubAllGlobals();
    });

    it("plays one clip at a time", () => {
        const { playingSrc } = useVoiceClipPlayback();

        playVoiceClip("a.m4a");
        playVoiceClip("b.m4a");

        expect(playingSrc.value).toBe("b.m4a");
    });

    it("keeps the new clip when the one it replaced rejects", async () => {
        const { playingSrc } = useVoiceClipPlayback();

        playVoiceClip("a.m4a");
        playVoiceClip("b.m4a");
        rejects[0](new DOMException("aborted", "AbortError"));
        await Promise.resolve();

        expect(playingSrc.value).toBe("b.m4a");
    });
});
