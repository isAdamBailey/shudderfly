import { describe, expect, it } from "vitest";
import { GARAGE_DOORS } from "../composables/useGarageStyles.js";
import { DOOR_STYLES } from "./garageDoor.js";

describe("the Garage's door styles", () => {
    it("can build every door the swap button cycles through", () => {
        expect(Object.keys(DOOR_STYLES)).toEqual(GARAGE_DOORS);
    });
});
