import ActionMenuItem from "@/Components/ActionMenuItem.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("ActionMenuItem.vue", () => {
    it("renders the label and icon", () => {
        const wrapper = mount(ActionMenuItem, {
            props: { icon: "ri-share-line", label: "Share to chat" },
        });

        expect(wrapper.text()).toContain("Share to chat");
        expect(wrapper.find("i").classes()).toContain("ri-share-line");
        expect(wrapper.attributes("role")).toBe("menuitem");
    });

    it("emits click", async () => {
        const wrapper = mount(ActionMenuItem, { props: { label: "Block" } });

        await wrapper.trigger("click");

        expect(wrapper.emitted("click")).toHaveLength(1);
    });

    it("does not emit click when disabled", async () => {
        const wrapper = mount(ActionMenuItem, {
            props: { label: "Block", disabled: true },
        });

        expect(wrapper.attributes("disabled")).toBeDefined();

        await wrapper.trigger("click");

        expect(wrapper.emitted("click")).toBeUndefined();
    });

    it("highlights the active row and swaps its accent colour for white", () => {
        const wrapper = mount(ActionMenuItem, {
            props: {
                icon: "ri-add-line",
                iconClass: "text-emerald-600",
                label: "Add Pages",
                active: true,
            },
        });

        expect(wrapper.classes()).toContain("bg-blue-600");
        expect(wrapper.find("i").classes()).toContain("text-white");
        expect(wrapper.find("i").classes()).not.toContain("text-emerald-600");
    });
});
