import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({ fail: false, renderers: [] }));

vi.mock("three", async (importOriginal) => {
    const THREE = await importOriginal();
    class WebGLRenderer {
        constructor() {
            if (fake.fail) throw new Error("Error creating WebGL context.");
            this.shadowMap = {};
            this.render = vi.fn();
            this.setSize = vi.fn();
            this.setPixelRatio = vi.fn();
            this.dispose = vi.fn();
            this.forceContextLoss = vi.fn();
            fake.renderers.push(this);
        }
    }
    return { ...THREE, WebGLRenderer };
});

import { supportsWebGL, useWorldRenderer } from "./useWorldRenderer.js";

// A rAF we step by hand.
let frames = [];
let now = 0;
function runFrame(ms = 16) {
    now += ms;
    const due = frames;
    frames = [];
    due.forEach((fn) => fn(now));
}

// Restored one by one: restoreAllMocks would also wipe vitest.setup.js's
// global mocks (ResizeObserver).
const spies = [];
function spy(object, method) {
    const s = vi.spyOn(object, method);
    spies.push(s);
    return s;
}

beforeEach(() => {
    fake.fail = false;
    fake.renderers = [];
    frames = [];
    spy(window, "requestAnimationFrame").mockImplementation((fn) => {
        frames.push(fn);
        return frames.length;
    });
    spy(window, "cancelAnimationFrame").mockImplementation(() => {
        frames = [];
    });
    spy(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
    spies.splice(0).forEach((s) => s.mockRestore());
    delete window.WebGL2RenderingContext;
});

describe("supportsWebGL", () => {
    it("is false without WebGL2", () => {
        expect(supportsWebGL()).toBe(false);
    });

    it("is true when a WebGL2 context can be made, and gives it back", () => {
        window.WebGL2RenderingContext = function () {};
        const loseContext = vi.fn();
        HTMLCanvasElement.prototype.getContext.mockReturnValue({
            getExtension: () => ({ loseContext }),
        });

        expect(supportsWebGL()).toBe(true);
        expect(loseContext).toHaveBeenCalled();
    });

    it("is false when the context can't be made", () => {
        window.WebGL2RenderingContext = function () {};
        expect(supportsWebGL()).toBe(false);
    });
});

describe("useWorldRenderer", () => {
    const scene = {};
    const camera = {};

    it("says so when the renderer can't be made", async () => {
        fake.fail = true;
        const renderer = useWorldRenderer();

        expect(await renderer.init(document.createElement("canvas"))).toBe(
            false
        );
        expect(renderer.kit).toBeNull();
    });

    it("caps the pixel ratio at 2", async () => {
        window.devicePixelRatio = 3;
        const renderer = useWorldRenderer();
        await renderer.init(document.createElement("canvas"));

        expect(fake.renderers[0].setPixelRatio).toHaveBeenCalledWith(2);
        window.devicePixelRatio = 1;
    });

    it("draws only on frames where something changed", async () => {
        const renderer = useWorldRenderer();
        await renderer.init(document.createElement("canvas"));
        const gl = fake.renderers[0];
        let moving = false;
        const hook = vi.fn(() => moving);
        renderer.onFrame(hook);
        renderer.show(scene, camera);

        runFrame(); // the first frame after show() always draws
        expect(gl.render).toHaveBeenCalledTimes(1);

        runFrame();
        runFrame();
        expect(gl.render).toHaveBeenCalledTimes(1);
        expect(hook).toHaveBeenCalledTimes(3);

        moving = true;
        runFrame();
        expect(gl.render).toHaveBeenCalledTimes(2);

        moving = false;
        renderer.invalidate();
        runFrame();
        expect(gl.render).toHaveBeenCalledTimes(3);
    });

    it("hands hooks the frame time, capped so a stall can't teleport", async () => {
        const renderer = useWorldRenderer();
        await renderer.init(document.createElement("canvas"));
        const hook = vi.fn(() => false);
        renderer.onFrame(hook);

        runFrame();
        runFrame(16);
        runFrame(2000);

        expect(hook.mock.calls.map(([dt]) => dt)).toEqual([0, 0.016, 0.05]);
    });

    it("stops while paused and restarts with a fresh clock", async () => {
        const renderer = useWorldRenderer();
        await renderer.init(document.createElement("canvas"));
        const hook = vi.fn(() => false);
        renderer.onFrame(hook);
        runFrame();

        renderer.pause();
        runFrame();
        expect(hook).toHaveBeenCalledTimes(1);

        renderer.resume();
        runFrame(5000);
        expect(hook).toHaveBeenCalledTimes(2);
        expect(hook.mock.calls[1][0]).toBe(0);
    });

    it("frees the context, the cast kit and its hooks on dispose", async () => {
        const renderer = useWorldRenderer();
        await renderer.init(document.createElement("canvas"));
        const kitDispose = vi.spyOn(renderer.kit, "dispose");
        const hook = vi.fn(() => true);
        renderer.onFrame(hook);

        renderer.dispose();
        runFrame();

        expect(kitDispose).toHaveBeenCalled();
        expect(fake.renderers[0].dispose).toHaveBeenCalled();
        expect(fake.renderers[0].forceContextLoss).toHaveBeenCalled();
        expect(hook).not.toHaveBeenCalled();
    });
});
