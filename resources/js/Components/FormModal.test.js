import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FormModal from "./FormModal.vue";

const mountFormModal = (props = {}, slots = {}) =>
    mount(FormModal, {
        props: { show: true, title: "Add Pages", ...props },
        slots: {
            default: "<div>Form body</div>",
            ...slots,
        },
        global: {
            stubs: {
                Modal: {
                    template: "<div><slot /></div>",
                },
                teleport: true,
            },
        },
    });

describe("FormModal", () => {
    it("renders the title and body slot", () => {
        const wrapper = mountFormModal();

        expect(wrapper.text()).toContain("Add Pages");
        expect(wrapper.text()).toContain("Form body");
    });

    it("emits close when the close button is clicked", async () => {
        const wrapper = mountFormModal();

        await wrapper.find("button").trigger("click");

        expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("hides the close button when closeable is false", () => {
        const wrapper = mountFormModal({ closeable: false });

        expect(wrapper.find("button").exists()).toBe(false);
    });

    it("renders the footer slot only when provided", () => {
        const withoutFooter = mountFormModal();
        expect(withoutFooter.text()).not.toContain("Save");

        const withFooter = mountFormModal(
            {},
            { footer: '<button type="button">Save</button>' }
        );
        expect(withFooter.text()).toContain("Save");
    });
});
