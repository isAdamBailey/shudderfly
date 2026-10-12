import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useEmojiRise", () => {
    let useEmojiRise;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.resetModules();
        ({ useEmojiRise } = await import("@/composables/useEmojiRise"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("adds the requested number of particles", () => {
        const { particles, spawnEmojiRise } = useEmojiRise();

        spawnEmojiRise(4);

        expect(particles.value).toHaveLength(4);
        particles.value.forEach((particle) => {
            expect(particle.emoji || particle.figure).toBeTruthy();
            expect(particle.left).toBeGreaterThanOrEqual(5);
            expect(particle.left).toBeLessThanOrEqual(95);
        });
    });

    it("can rise Guster as a figure, not an emoji", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.2);
        const { particles, spawnEmojiRise } = useEmojiRise();

        spawnEmojiRise(1);

        expect(particles.value[0].figure).toBe("guster");
        expect(particles.value[0].emoji).toBeUndefined();
        vi.restoreAllMocks();
    });

    it("defaults to spawning 6 particles", () => {
        const { particles, spawnEmojiRise } = useEmojiRise();

        spawnEmojiRise();

        expect(particles.value).toHaveLength(6);
    });

    it("removes particles after their animation finishes", () => {
        const { particles, spawnEmojiRise } = useEmojiRise();

        spawnEmojiRise(2);
        expect(particles.value).toHaveLength(2);

        vi.advanceTimersByTime(5000);

        expect(particles.value).toHaveLength(0);
    });
});
