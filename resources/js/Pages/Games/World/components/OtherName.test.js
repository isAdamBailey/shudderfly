import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import OtherName from "./OtherName.vue";

describe("OtherName", () => {
    it("shows the avatar they picked before their name", () => {
        const wrapper = mount(OtherName, {
            props: {
                user: { id: 2, name: "Butt Friend", avatar: "bigears-7" },
            },
        });

        expect(wrapper.find("svg").exists()).toBe(true);
        expect(wrapper.find("img").exists()).toBe(false);
        expect(wrapper.find(".other-name-text").text()).toBe("Butt Friend");
        expect(wrapper.attributes("aria-hidden")).toBe("true");
    });

    it("shows their initials when they never picked one", () => {
        const wrapper = mount(OtherName, {
            props: { user: { id: 2, name: "Guster Fan", avatar: null } },
        });

        expect(wrapper.find("svg").exists()).toBe(false);
        expect(wrapper.find("img").attributes("alt")).toBe("GF");
        expect(wrapper.find(".other-name-text").text()).toBe("Guster Fan");
    });
});
