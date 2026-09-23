import SharedExcerpt from "@/Components/Messages/SharedExcerpt.vue";
import { EXCERPT_LIMIT } from "@/utils/text";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("SharedExcerpt", () => {
    it("renders nothing without text", () => {
        const wrapper = mount(SharedExcerpt, { props: { text: null } });

        expect(wrapper.find("p").exists()).toBe(false);
    });

    it("renders nothing when the text is only markup", () => {
        const wrapper = mount(SharedExcerpt, { props: { text: "<p> </p>" } });

        expect(wrapper.find("p").exists()).toBe(false);
    });

    it("strips markup and collapses whitespace", () => {
        const wrapper = mount(SharedExcerpt, {
            props: { text: "<p>Hello   <strong>there</strong></p>" },
        });

        expect(wrapper.text()).toBe("Hello there");
    });

    it("truncates long text with an ellipsis", () => {
        const wrapper = mount(SharedExcerpt, {
            props: { text: "a".repeat(EXCERPT_LIMIT + 10) },
        });

        // lodash counts the ellipsis inside the limit.
        expect(wrapper.text()).toBe(`${"a".repeat(EXCERPT_LIMIT - 1)}…`);
    });

    it("cuts on a word boundary rather than mid-word", () => {
        const wrapper = mount(SharedExcerpt, {
            props: { text: "lorem ipsum ".repeat(30) },
        });

        expect(wrapper.text()).toMatch(/\bipsum…$|\blorem…$/);
    });

    it("leaves text within the limit untouched", () => {
        const wrapper = mount(SharedExcerpt, {
            props: { text: "a".repeat(EXCERPT_LIMIT) },
        });

        expect(wrapper.text()).toBe("a".repeat(EXCERPT_LIMIT));
    });
});
