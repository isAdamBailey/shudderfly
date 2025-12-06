import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Accordion from "@/Components/Accordion.vue";

describe("Accordion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders with title", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            expect(wrapper.text()).toContain("Test Accordion");
        });

        it("renders slot content", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            expect(wrapper.text()).toContain("Test Content");
        });
    });

    describe("Open/Close behavior", () => {
        it("starts closed by default", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            // Content should be hidden initially
            expect(wrapper.vm.isOpen).toBe(false);
        });

        it("starts open when defaultOpen is true", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                    defaultOpen: true,
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            expect(wrapper.vm.isOpen).toBe(true);
        });

        it("toggles open/closed when button is clicked", async () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            expect(wrapper.vm.isOpen).toBe(false);

            const button = wrapper.find("button");
            await button.trigger("click");
            await nextTick();

            expect(wrapper.vm.isOpen).toBe(true);

            await button.trigger("click");
            await nextTick();

            expect(wrapper.vm.isOpen).toBe(false);
        });

        it("rotates arrow icon when opened", async () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const arrow = wrapper.find("i.ri-arrow-down-s-line");
            expect(arrow.classes()).not.toContain("rotate-180");

            const button = wrapper.find("button");
            await button.trigger("click");
            await nextTick();

            expect(arrow.classes()).toContain("rotate-180");
        });
    });

    describe("Badge display", () => {
        it("does not show badge by default", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const badge = wrapper.find(".bg-red-600");
            expect(badge.exists()).toBe(false);
        });

        it("shows badge when showBadge is true", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                    showBadge: true,
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const badge = wrapper.find(".bg-red-600");
            expect(badge.exists()).toBe(true);
        });

        it("badge has correct title attribute", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                    showBadge: true,
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const badge = wrapper.find(".bg-red-600");
            expect(badge.attributes("title")).toBe(
                "You have unread notifications"
            );
        });
    });

    describe("Dark background", () => {
        it("applies dark background classes when darkBackground is true", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                    darkBackground: true,
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const container = wrapper.find("div");
            expect(container.classes()).toContain("bg-gray-800");
        });

        it("does not apply dark background classes by default", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const container = wrapper.find("div");
            expect(container.classes()).not.toContain("bg-gray-800");
        });
    });

    describe("Accessibility", () => {
        it("has a button element for toggling", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "Test Accordion",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const button = wrapper.find("button");
            expect(button.exists()).toBe(true);
            expect(button.attributes("type")).toBe("button");
        });

        it("button contains the title", () => {
            const wrapper = mount(Accordion, {
                props: {
                    title: "My Accordion Title",
                },
                slots: {
                    default: "<div>Test Content</div>",
                },
            });

            const button = wrapper.find("button");
            expect(button.text()).toContain("My Accordion Title");
        });
    });
});

