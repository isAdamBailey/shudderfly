import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

// jsdom lays nothing out, so unless a test gives it a size the game is 0×0:
// the toilet sits at its edge and every dropped poop misses.
let wrapper;
let kit;
// Spies on shared prototypes, put back after each test. (restoreAllMocks
// would also wipe the setup file's ResizeObserver stand-in.)
let spies = [];

function play() {
    kit = { toot: vi.fn(), playSound: vi.fn(), finish: vi.fn() };
    wrapper = mount(App, { props: { kit }, attachTo: document.body });
}

async function drop() {
    await wrapper.get(".poop").trigger("mousedown");
    document.dispatchEvent(new MouseEvent("mouseup"));
    await vi.advanceTimersByTimeAsync(50);
}

describe("Poop Boom", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
        spies.forEach((spy) => spy.mockRestore());
        spies = [];
    });

    it("bonks through the world when the poop misses", async () => {
        play();

        await drop();

        expect(kit.playSound).toHaveBeenCalledWith("bonk");
        expect(kit.finish).not.toHaveBeenCalled();
    });

    it("hands the score to the world after the last miss", async () => {
        play();

        for (let miss = 0; miss < 5; miss++) {
            await drop();
            await vi.advanceTimersByTimeAsync(1200);
        }

        expect(kit.finish).toHaveBeenCalledOnce();
        expect(kit.finish).toHaveBeenCalledWith({ score: 0 });
    });

    it("toots the poop in at the splash, and stops if the host closes then", async () => {
        // A real-sized box, so a drop can land in the bowl.
        const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
        spies.push(rect);
        rect.mockReturnValue({
            left: 0,
            top: 0,
            width: 400,
            height: 600,
            right: 400,
            bottom: 600,
        });
        play();
        // The toilet starts in the middle heading right at 2px a frame, and
        // a poop let go at the top takes about 37 frames to reach the bowl.
        await wrapper.get(".poop").trigger("mousedown");
        document.dispatchEvent(
            new MouseEvent("mousemove", { clientX: 274, clientY: 120 })
        );
        document.dispatchEvent(new MouseEvent("mouseup"));
        await vi.advanceTimersByTimeAsync(1000);

        expect(kit.toot).toHaveBeenCalledWith("poop", {
            x: expect.closeTo(0.68, 1),
            y: 0.81,
        });
        const frame = vi.spyOn(window, "requestAnimationFrame");
        spies.push(frame);

        wrapper.unmount();
        wrapper = null;
        await vi.advanceTimersByTimeAsync(1200);

        expect(frame).not.toHaveBeenCalled();
    });

    it("stops when the host closes after a miss", async () => {
        play();
        await drop();
        const frame = vi.spyOn(window, "requestAnimationFrame");
        spies.push(frame);

        wrapper.unmount();
        wrapper = null;
        await vi.advanceTimersByTimeAsync(1200);

        expect(frame).not.toHaveBeenCalled();
    });
});
