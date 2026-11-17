import { afterEach, describe, expect, it, vi } from "vitest";
import {
    garageDoorOpen,
    saveGarageDoor,
    savedGarageDoor,
} from "./garageDoorState.js";

describe("where the Garage's door was left", () => {
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("is shut until it's been left anywhere", () => {
        expect(savedGarageDoor()).toEqual({ position: 0, last: -1 });
        expect(garageDoorOpen()).toBe(false);
    });

    it("remembers it on this device", () => {
        saveGarageDoor({ position: 1, last: 1 });
        expect(savedGarageDoor()).toEqual({ position: 1, last: 1 });
        expect(garageDoorOpen()).toBe(true);
    });

    it("is only open to go through all the way up", () => {
        saveGarageDoor({ position: 0.6, last: 1 });
        expect(savedGarageDoor()).toEqual({ position: 0.6, last: 1 });
        expect(garageDoorOpen()).toBe(false);
    });

    it("is shut when storage holds nonsense", () => {
        for (const junk of ["{", '"open"', '{"position":3}', "null"]) {
            localStorage.setItem("games.world.garage.position", junk);
            expect(savedGarageDoor()).toEqual({ position: 0, last: -1 });
        }
    });

    it("is shut, and saving does nothing, when storage is blocked", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        expect(() => saveGarageDoor({ position: 1, last: 1 })).not.toThrow();
        expect(savedGarageDoor()).toEqual({ position: 0, last: -1 });
    });
});
