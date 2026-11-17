import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGarageCount } from "./useGarageCount.js";

describe("useGarageCount", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it("starts at 0 on a new device", () => {
        expect(useGarageCount().count.value).toBe(0);
    });

    it("counts each opening and remembers it", () => {
        const first = useGarageCount();
        first.opened();
        first.opened();

        expect(first.count.value).toBe(2);
        expect(useGarageCount().count.value).toBe(2);
    });

    it("ignores a count that isn't one", () => {
        localStorage.setItem("games.world.garage.opened", "lots");

        expect(useGarageCount().count.value).toBe(0);
    });

    it("still counts the visit when storage is blocked", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        const garage = useGarageCount();
        garage.opened();

        expect(garage.count.value).toBe(1);
    });
});
