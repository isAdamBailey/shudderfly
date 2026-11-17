import { describe, expect, it } from "vitest";
import { createKeypad } from "./garageKeypad.js";

// Which digits doesn't matter: only how many.
const typed = (keypad, digits) => [...digits].forEach(() => keypad.digit());

describe("the Garage's outdoor keypad", () => {
    it("opens on any four digits followed by Enter", () => {
        const keypad = createKeypad();
        typed(keypad, "1234");
        expect(keypad.enter()).toBe(true);
    });

    it("takes another code straight after", () => {
        const keypad = createKeypad();
        typed(keypad, "1234");
        keypad.enter();
        expect(keypad.entered).toBe(0);
        typed(keypad, "9081");
        expect(keypad.enter()).toBe(true);
    });

    it("does nothing on Enter with fewer than four, and starts over", () => {
        const keypad = createKeypad();
        typed(keypad, "12");
        expect(keypad.enter()).toBe(false);
        expect(keypad.entered).toBe(0);
        typed(keypad, "34");
        expect(keypad.enter()).toBe(false);
    });

    it("counts the digits in so far, ignoring any past four", () => {
        const keypad = createKeypad();
        typed(keypad, "12");
        expect(keypad.entered).toBe(2);
        typed(keypad, "34567");
        expect(keypad.entered).toBe(4);
        expect(keypad.enter()).toBe(true);
    });
});
