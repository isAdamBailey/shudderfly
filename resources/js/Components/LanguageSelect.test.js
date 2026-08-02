import LanguageSelect from "@/Components/LanguageSelect.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const options = [
    { value: "", label: "Automatic", flag: "🌐" },
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "es", label: "Español", flag: "🇪🇸" },
    { value: "fr", label: "Français", flag: "🇫🇷" },
];

const mountSelect = (props = {}) =>
    mount(LanguageSelect, {
        attachTo: document.body,
        props: { options, modelValue: "", ...props },
    });

describe("LanguageSelect", () => {
    it("shows the selected option on the trigger", () => {
        const wrapper = mountSelect({ modelValue: "fr" });

        expect(wrapper.find("button").text()).toContain("Français");
    });

    it("keeps the list closed until the trigger is clicked", async () => {
        const wrapper = mountSelect();

        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false);

        await wrapper.find("button").trigger("click");

        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true);
        expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
    });

    it("emits the chosen value and closes", async () => {
        const wrapper = mountSelect();

        await wrapper.find("button").trigger("click");
        await wrapper.findAll('[role="option"]')[3].trigger("click");

        expect(wrapper.emitted("update:modelValue")).toEqual([["fr"]]);
        expect(wrapper.emitted("change")).toEqual([["fr"]]);
        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false);
    });

    it("does not emit when the current value is re-selected", async () => {
        const wrapper = mountSelect({ modelValue: "es" });

        await wrapper.find("button").trigger("click");
        await wrapper.findAll('[role="option"]')[2].trigger("click");

        expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    });

    it("marks the selected option with aria-selected", async () => {
        const wrapper = mountSelect({ modelValue: "es" });

        await wrapper.find("button").trigger("click");

        const selected = wrapper
            .findAll('[role="option"]')
            .filter((o) => o.attributes("aria-selected") === "true");

        expect(selected).toHaveLength(1);
        expect(selected[0].text()).toContain("Español");
    });

    it("opens with arrow down and selects with enter", async () => {
        const wrapper = mountSelect({ modelValue: "en" });

        await wrapper.trigger("keydown", { key: "ArrowDown" });
        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true);

        // Active starts on the selected option ("en"), so one more press lands on "es".
        await wrapper.trigger("keydown", { key: "ArrowDown" });
        await wrapper.trigger("keydown", { key: "Enter" });

        expect(wrapper.emitted("update:modelValue")).toEqual([["es"]]);
    });

    it("wraps around when arrowing past the last option", async () => {
        const wrapper = mountSelect({ modelValue: "fr" });

        await wrapper.trigger("keydown", { key: "ArrowDown" });
        await wrapper.trigger("keydown", { key: "ArrowDown" });
        await wrapper.trigger("keydown", { key: "Enter" });

        expect(wrapper.emitted("update:modelValue")).toEqual([[""]]);
    });

    it("closes on escape without emitting", async () => {
        const wrapper = mountSelect();

        await wrapper.find("button").trigger("click");
        await wrapper.trigger("keydown", { key: "Escape" });

        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false);
        expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    });

    it("does not open when disabled", async () => {
        const wrapper = mountSelect({ disabled: true });

        await wrapper.find("button").trigger("click");

        expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false);
    });
});
