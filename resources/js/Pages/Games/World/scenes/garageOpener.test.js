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
            reversed: false,
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

    it("starts where it was left, still and dark", () => {
        const open = createOpener({ position: 1, last: 1 });
        expect(open.position).toBe(1);
        expect(open.moving).toBe(false);
        expect(open.lit).toBe(false);
        // Up, so the next press brings it down.
        open.press();
        expect(run(open, OPENER.travel + 1)).toEqual(["closed"]);

        const partWay = createOpener({ position: 0.4, last: 1 });
        expect(partWay.position).toBe(0.4);
        // Stopped on its way up, so the next press sends it back down.
        partWay.press();
        expect(run(partWay, OPENER.travel)).toEqual(["closed"]);
    });

    it("keeps a saved position on the door", () => {
        expect(createOpener({ position: 7 }).position).toBe(1);
        expect(createOpener({ position: -1 }).position).toBe(0);
        expect(createOpener({ position: "nonsense" }).position).toBe(0);
    });

    it("rests where it will stop: its end while it moves, or where it stopped", () => {
        const opener = createOpener();
        expect(opener.rest()).toEqual({ position: 0, last: -1 });
        opener.press();
        run(opener, OPENER.travel / 2);
        // Left on its way up, it's gone up by the time anyone's back.
        expect(opener.rest()).toEqual({ position: 1, last: 1 });
        opener.press();
        const { position } = opener;
        expect(opener.rest()).toEqual({ position, last: 1 });
        // And it starts again where it rests.
        const again = createOpener(opener.rest());
        expect(again.position).toBe(position);
    });

    it("goes back up when it comes down on something under it", () => {
        const opener = createOpener({ position: 1, last: 1 });
        opener.press();
        run(opener, OPENER.travel / 2);
        const { reversed } = opener.tick(0.05, false, true);
        expect(reversed).toBe(true);
        expect(opener.rest()).toEqual({ position: 1, last: 1 });
        expect(run(opener, OPENER.travel)).toEqual(["open"]);
    });

    it("doesn't care what's under it on the way up", () => {
        const opener = createOpener();
        opener.press();
        expect(opener.tick(0.05, false, true).reversed).toBe(false);
        expect(opener.rest()).toEqual({ position: 1, last: 1 });
    });

    it("won't start down from the top with something under it", () => {
        const opener = createOpener({ position: 1, last: 1 });
        opener.press();
        expect(opener.tick(0.05, false, true)).toEqual({
            changed: false,
            arrived: null,
            reversed: true,
        });
        expect(opener.moving).toBe(false);
        expect(opener.position).toBe(1);
        expect(opener.rest()).toEqual({ position: 1, last: 1 });
        // So nothing reaches the top again to count.
        expect(run(opener, 1)).toEqual([]);
        // Clear of it, the next press brings it down.
        opener.press();
        expect(run(opener, OPENER.travel + 1)).toEqual(["closed"]);
    });
});
