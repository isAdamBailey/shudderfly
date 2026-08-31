import { describe, it, expect } from "vitest";
import { deadband } from "./math";

describe("deadband", () => {
    it("passes through a value past the threshold", () => {
        expect(deadband(0.5, 0.005)).toBe(0.5);
        expect(deadband(-0.5, 0.005)).toBe(-0.5);
    });

    it("zeroes the jitter inside the threshold", () => {
        expect(deadband(0.004, 0.005)).toBe(0);
        expect(deadband(-0.004, 0.005)).toBe(0);
        expect(deadband(0, 0.005)).toBe(0);
    });

    it("zeroes NaN, which a bare magnitude test would let through", () => {
        // useParallax emits NaN until the element has been measured; letting it
        // reach useTransition latches the tween at NaN permanently.
        expect(Math.abs(NaN) > 0.005).toBe(false);
        expect(deadband(NaN, 0.005)).toBe(0);
    });

    it("zeroes an infinite value", () => {
        expect(deadband(Infinity, 0.005)).toBe(0);
        expect(deadband(-Infinity, 0.005)).toBe(0);
    });
});
