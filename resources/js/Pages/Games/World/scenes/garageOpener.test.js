import { describe, expect, it } from "vitest";
import { createOpener, OPENER } from "./garageOpener.js";

/** Ticks `opener` `seconds` on in small steps; the ends it reached. */
function run(opener, seconds, reduced = false) {
    const reached = [];
    for (let t = 0; t < seconds; t += 0.05) {
        const { arrived } = opener.tick(0.05, reduced);
        if (arrived) reached.push(arrived);
    }
    return reached;
}

describe("the garage door opener", () => {
    it("starts closed, still and dark", () => {
        const opener = createOpener();
        expect(opener.position).toBe(0);
        expect(opener.moving).toBe(false);
        expect(opener.lit).toBe(false);
    });

    it("opens the door all the way on a press, reaching the top once", () => {
        const opener = createOpener();
        opener.press();
        expect(opener.moving).toBe(true);
        expect(run(opener, OPENER.travel + 1)).toEqual(["open"]);
        expect(opener.position).toBe(1);
        expect(opener.moving).toBe(false);
    });

    it("stops the door on a press while it moves, and reverses it on the next", () => {
        const opener = createOpener();
        opener.press();
        run(opener, OPENER.travel / 2);
        opener.press();
        const stoppedAt = opener.position;
        expect(stoppedAt).toBeGreaterThan(0.3);
        expect(stoppedAt).toBeLessThan(0.7);
        expect(run(opener, 1)).toEqual([]);
        expect(opener.position).toBe(stoppedAt);

        // Sent back the way it came: down, not up.
        opener.press();
        expect(run(opener, OPENER.travel)).toEqual(["closed"]);
        expect(opener.position).toBe(0);
    });

    it("closes an open door on a press, then opens it again", () => {
        const opener = createOpener();
        opener.press();
        run(opener, OPENER.travel + 1);
        opener.press();
        expect(run(opener, OPENER.travel + 1)).toEqual(["closed"]);
        opener.press();
        expect(run(opener, OPENER.travel + 1)).toEqual(["open"]);
    });

    it("lights up on a press and stays lit a few seconds after the door stops", () => {
        const opener = createOpener();
        opener.press();
        expect(opener.lit).toBe(true);
        run(opener, OPENER.travel + 0.1);
        expect(opener.moving).toBe(false);
        expect(opener.lit).toBe(true);
        run(opener, OPENER.light - 0.5);
        expect(opener.lit).toBe(true);
        // Going out is a change to draw.
        let changed = false;
        for (let t = 0; t < 1; t += 0.05) {
            changed = opener.tick(0.05, false).changed || changed;
        }
        expect(opener.lit).toBe(false);
        expect(changed).toBe(true);
        expect(opener.tick(0.05, false).changed).toBe(false);
    });

    it("moves the door at once under reduced motion", () => {
        const opener = createOpener();
        opener.press();
        expect(opener.tick(0.016, true)).toEqual({
            changed: true,
            arrived: "open",
        });
        expect(opener.position).toBe(1);
        opener.press();
        expect(opener.tick(0.016, true).arrived).toBe("closed");
        expect(opener.position).toBe(0);
    });

    it("keeps the light on its full time after a press stops the door", () => {
        const opener = createOpener();
        opener.press();
        run(opener, 1);
        opener.press();
        run(opener, OPENER.light - 0.5);
        expect(opener.lit).toBe(true);
        run(opener, 1);
        expect(opener.lit).toBe(false);
    });
});
