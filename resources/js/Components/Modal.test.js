import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import Modal from "./Modal.vue";

let wrappers = [];

const mountModal = (props = {}, slotButtonText = "Focusable") => {
    const wrapper = mount(Modal, {
        props: { show: true, ...props },
        slots: {
            default: `<button type="button">${slotButtonText}</button>`,
        },
        attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
};

afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.style.overflow = null;
});

describe("Modal", () => {
    it("restores focus to the previously focused element on close", async () => {
        const trigger = document.createElement("button");
        trigger.textContent = "Open";
        document.body.appendChild(trigger);
        trigger.focus();
        expect(document.activeElement).toBe(trigger);

        const wrapper = mountModal({ show: false });
        await wrapper.setProps({ show: true });
        await nextTick();

        await wrapper.setProps({ show: false });
        await nextTick();

        expect(document.activeElement).toBe(trigger);
        trigger.remove();
    });

    it("locks body scroll while open and unlocks when the last modal closes", async () => {
        const wrapper = mountModal({ show: true });
        await nextTick();
        expect(document.body.style.overflow).toBe("hidden");

        await wrapper.setProps({ show: false });
        await nextTick();
        expect(document.body.style.overflow).toBe("");
    });

    it("keeps body scroll locked while a nested modal is still open", async () => {
        const base = mountModal({ show: true }, "Base");
        await nextTick();

        const nested = mountModal({ show: true }, "Nested");
        await nextTick();

        await nested.setProps({ show: false });
        await nextTick();

        expect(document.body.style.overflow).toBe("hidden");

        await base.setProps({ show: false });
        await nextTick();
        expect(document.body.style.overflow).toBe("");
    });

    it("only closes the topmost modal on Escape", async () => {
        const base = mountModal({ show: true }, "Base");
        await nextTick();

        const nested = mountModal({ show: true }, "Nested");
        await nextTick();

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await nextTick();

        expect(nested.emitted("close")).toBeTruthy();
        expect(base.emitted("close")).toBeFalsy();
    });
});
