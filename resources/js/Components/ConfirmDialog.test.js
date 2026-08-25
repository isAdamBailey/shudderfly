import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "./ConfirmDialog.vue";

const mountDialog = (props = {}) =>
    mount(ConfirmDialog, {
        props: { show: true, message: "Are you sure?", ...props },
        global: {
            stubs: {
                Modal: {
                    template: "<div><slot /></div>",
                },
                teleport: true,
            },
        },
    });

describe("ConfirmDialog", () => {
    it("renders labels for both buttons when none are passed", () => {
        const wrapper = mountDialog();
        const buttons = wrapper.findAll("button");

        expect(buttons).toHaveLength(2);
        buttons.forEach((button) => {
            expect(button.text().trim()).not.toBe("");
        });
    });

    it("uses the provided labels when they are passed", () => {
        const wrapper = mountDialog({
            confirmLabel: "Unblock",
            cancelLabel: "Never mind",
        });
        const buttons = wrapper.findAll("button");

        expect(buttons[0].text()).toBe("Never mind");
        expect(buttons[1].text()).toBe("Unblock");
    });

    it("labels the danger confirm button too", () => {
        const wrapper = mountDialog({ confirmVariant: "danger" });
        const buttons = wrapper.findAll("button");

        expect(buttons[1].text().trim()).not.toBe("");
    });

    it("disables the confirm button when confirmDisabled is set", () => {
        const wrapper = mountDialog({ confirmDisabled: true });
        const buttons = wrapper.findAll("button");

        expect(buttons[1].attributes("disabled")).toBeDefined();
    });
});
