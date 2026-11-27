import { describe, expect, it } from "vitest";
import { FEED_COUNT, FOODS, findFood } from "./foods.js";

describe("Costco Food Poop foods", () => {
    it("draws every food one way, and names it", () => {
        for (const food of FOODS) {
            expect(Boolean(food.emoji) !== Boolean(food.glyph)).toBe(true);
            expect(food.label).toMatch(/^games\.costco_pizza_poop\./);
        }
    });

    it("gives every food its own id", () => {
        const ids = FOODS.map((f) => f.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("feeds three, and falls back to the first food", () => {
        expect(FEED_COUNT).toBe(3);
        expect(findFood("nope")).toBe(FOODS[0]);
    });
});
