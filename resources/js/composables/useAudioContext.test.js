import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A minimal AudioContext stub whose `state` and `resume` we can inspect.
function makeAudioContextClass() {
    const instances = [];
    class FakeAudioContext {
        constructor() {
            this.state = "suspended";
            this.onstatechange = null;
            this.resume = vi.fn(() => {
                this.state = "running";
                return Promise.resolve();
            });
            instances.push(this);
        }
    }
    FakeAudioContext.instances = instances;
    return FakeAudioContext;
}

describe("composables/useAudioContext", () => {
    let FakeAudioContext;

    beforeEach(() => {
        vi.resetModules();
        FakeAudioContext = makeAudioContextClass();
        vi.stubGlobal("AudioContext", FakeAudioContext);
        // Ensure the webkit fallback isn't picked up ahead of AudioContext.
        // (jsdom has no webkitAudioContext by default.)
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("creates exactly one AudioContext and reuses it across calls", async () => {
        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const first = getAudioContext();
        const second = getAudioContext();
        const third = getAudioContext();

        expect(first).toBe(second);
        expect(second).toBe(third);
        expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it("resumes the context when Safari leaves it suspended", async () => {
        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const ctx = getAudioContext();
        expect(ctx.resume).toHaveBeenCalled();
    });

    it("resumes the context when Safari leaves it interrupted", async () => {
        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const ctx = getAudioContext();
        ctx.resume.mockClear();
        ctx.state = "interrupted";

        getAudioContext();
        expect(ctx.resume).toHaveBeenCalled();
    });

    it("does not resume when the context is already running", async () => {
        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const ctx = getAudioContext();
        ctx.state = "running";
        ctx.resume.mockClear();

        getAudioContext();
        expect(ctx.resume).not.toHaveBeenCalled();
    });

    it("unlockAudio awaits resume and returns the shared context", async () => {
        const { unlockAudio, getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const ctx = await unlockAudio();
        expect(ctx).toBe(getAudioContext());
        expect(ctx.resume).toHaveBeenCalled();
        expect(ctx.state).toBe("running");
    });

    it("re-resumes on statechange when interrupted", async () => {
        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );

        const ctx = getAudioContext();
        ctx.resume.mockClear();
        ctx.state = "interrupted";

        // Simulate Safari firing the interruption.
        ctx.onstatechange?.();
        expect(ctx.resume).toHaveBeenCalled();
    });

    it("returns null when Web Audio is unsupported", async () => {
        vi.resetModules();
        vi.stubGlobal("AudioContext", undefined);
        vi.stubGlobal("webkitAudioContext", undefined);

        const { getAudioContext } = await import(
            "@/composables/useAudioContext"
        );
        expect(getAudioContext()).toBeNull();
    });
});
