import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGarageStyles } from "./useGarageStyles.js";

describe("the Garage's clicker and door styles", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it("start on the beige wall button and the sectional door", () => {
        const { clicker, door } = useGarageStyles();
        expect(clicker.value).toBe("wall");
        expect(door.value).toBe("sectional");
    });

    it("each cycle through every style and back round", () => {
        const styles = useGarageStyles();
        const clickers = [1, 2, 3, 4].map(() => {
            styles.nextClicker();
            return styles.clicker.value;
        });
        expect(clickers).toEqual(["fob", "visor", "keypad", "wall"]);
        const doors = [1, 2, 3].map(() => {
            styles.nextDoor();
            return styles.door.value;
        });
        expect(doors).toEqual(["roll-up", "carriage", "sectional"]);
    });

    it("are remembered on this device for the next visit", () => {
        const first = useGarageStyles();
        first.nextClicker();
        first.nextDoor();
        first.nextDoor();
        const next = useGarageStyles();
        expect(next.clicker.value).toBe("fob");
        expect(next.door.value).toBe("carriage");
    });

    it("fall back to the defaults for a style that's no longer one", () => {
        localStorage.setItem("games.world.garage.clicker", "teleporter");
        localStorage.setItem("games.world.garage.door", "portcullis");
        const { clicker, door } = useGarageStyles();
        expect(clicker.value).toBe("wall");
        expect(door.value).toBe("sectional");
    });

    it("still swap when storage is blocked, just without remembering", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        const styles = useGarageStyles();
        expect(styles.clicker.value).toBe("wall");
        styles.nextClicker();
        expect(styles.clicker.value).toBe("fob");
    });
});
