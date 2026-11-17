import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GarageClicker from "./GarageClicker.vue";
import { CLICKERS } from "../composables/useGarageStyles.js";

const LABEL = "games.world.toys.garage_button";

const mountClicker = (props) => mount(GarageClicker, { props });

const presses = (wrapper) => wrapper.emitted("press")?.length ?? 0;

describe("GarageClicker", () => {
    it.each(["wall", "fob", "visor"])(
        "presses the opener from its %s clicker's button",
        async (clicker) => {
            const wrapper = mountClicker({ clicker });
            await wrapper.get(`[aria-label="${LABEL}"]`).trigger("click");
            expect(presses(wrapper)).toBe(1);
        }
    );

    it("presses from the keypad on four digits and Enter, and not on fewer", async () => {
        const wrapper = mountClicker({ clicker: "keypad" });
        const key = (name) =>
            wrapper.get(`[aria-label="${LABEL}"] [data-key="${name}"]`);
        for (const digit of ["1", "2"]) await key(digit).trigger("click");
        await key("enter").trigger("click");
        expect(presses(wrapper)).toBe(0);
        for (const digit of ["4", "3", "2", "1"]) {
            await key(digit).trigger("click");
        }
        await key("enter").trigger("click");
        expect(presses(wrapper)).toBe(1);
    });

    it.each(CLICKERS)(
        "shows the opener's light on its %s clicker's lamp",
        async (clicker) => {
            const wrapper = mountClicker({ clicker, lit: false });
            expect(wrapper.find(".lamp.on").exists()).toBe(false);
            await wrapper.setProps({ lit: true });
            expect(wrapper.find(".lamp.on").exists()).toBe(true);
        }
    );

    it("asks for the next clicker and the next door from its swap buttons", async () => {
        const wrapper = mountClicker({ clicker: "wall" });
        await wrapper
            .get('[aria-label="games.world.garage.swap_clicker"]')
            .trigger("click");
        await wrapper
            .get('[aria-label="games.world.garage.swap_door"]')
            .trigger("click");
        expect(wrapper.emitted("next-clicker")).toHaveLength(1);
        expect(wrapper.emitted("next-door")).toHaveLength(1);
        expect(presses(wrapper)).toBe(0);
    });
});
