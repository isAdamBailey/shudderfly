import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import BookCoverCard from "@/Components/BookCoverCard.vue";
import { createRouteMock } from "../vitest.setup.js";

// Use the shared route mock function from setup.js
global.route = createRouteMock();
window.route = global.route;

describe("BookCoverCard", () => {
    let wrapper;
    const mockBook = {
        id: 1,
        title: "Test Book",
        slug: "test-book",
        excerpt: "This is a test excerpt",
        cover_image: {
            media_path: "/images/test-cover.jpg",
        },
        loading: false,
    };

    beforeEach(() => {
        wrapper = mount(BookCoverCard, {
            props: {
                book: mockBook,
            },
        });
    });

    it("renders the book title", () => {
        expect(wrapper.text()).toContain("Test Book");
    });

    it("renders the book excerpt when provided", () => {
        expect(wrapper.text()).toContain("This is a test excerpt");
    });

    it("does not render excerpt when not provided", async () => {
        const bookWithoutExcerpt = { ...mockBook, excerpt: null };
        await wrapper.setProps({ book: bookWithoutExcerpt });

        const excerptElement = wrapper.find("p.italic");
        expect(excerptElement.exists()).toBe(false);
    });

    it("applies default title size classes", () => {
        const title = wrapper.find("h2");
        const classes = title.attributes("class");
        expect(classes).toContain("text-base");
        expect(classes).toContain("sm:text-lg");
    });

    it("applies custom title size when provided", async () => {
        await wrapper.setProps({ titleSize: "text-lg sm:text-xl" });

        const title = wrapper.find("h2");
        const classes = title.attributes("class");
        expect(classes).toContain("text-lg");
        expect(classes).toContain("sm:text-xl");
    });

    it("displays loading spinner when book is loading", async () => {
        await wrapper.setProps({ book: { ...mockBook, loading: true } });

        const spinner = wrapper.find(".animate-spin");
        expect(spinner.exists()).toBe(true);
        expect(spinner.find("i.ri-loader-line").exists()).toBe(true);
    });

    it("hides loading spinner when book is not loading", () => {
        const spinner = wrapper.find(".animate-spin");
        expect(spinner.exists()).toBe(false);
    });

    it("renders mini-book styling classes", () => {
        expect(wrapper.find(".mini-book").exists()).toBe(true);
        expect(wrapper.find(".mini-book__texture").exists()).toBe(true);
        expect(wrapper.find(".mini-book__spine").exists()).toBe(true);
        expect(wrapper.find(".mini-book__border").exists()).toBe(true);
        expect(wrapper.find(".mini-book__title").exists()).toBe(true);
    });

    it("applies dark overlay for text readability", () => {
        const overlay = wrapper.find(".bg-black\\/25");
        expect(overlay.exists()).toBe(true);
    });

    it("applies correct text styling to title", () => {
        const title = wrapper.find("h2");
        const classes = title.attributes("class");
        expect(classes).toContain("font-heading");
        expect(classes).toContain("uppercase");
        expect(classes).toContain("text-white");
        expect(classes).toContain("font-bold");
        expect(classes).toContain("tracking-[0.08em]");
        expect(classes).toContain("line-clamp-2");
    });

    it("applies correct text styling to excerpt", () => {
        const excerpt = wrapper.find("p.italic");
        const classes = excerpt.attributes("class");
        expect(classes).toContain("text-white/90");
        expect(classes).toContain("text-xs");
        expect(classes).toContain("italic");
        expect(classes).toContain("line-clamp-2");
    });

    it("renders image with cover_image path", () => {
        const image = wrapper.find("img");
        expect(image.exists()).toBe(true);
        // LazyLoader component uses a placeholder, so just verify an image renders
        expect(image.attributes("src")).toBeTruthy();
    });

    it("renders with aspect-[3/4] container by default", () => {
        const container = wrapper.find("a");
        expect(container.classes()).toContain("w-full");
        expect(container.classes()).toContain("aspect-[3/4]");
    });

    it("applies custom container class when provided", async () => {
        await wrapper.setProps({ containerClass: "w-60 h-60" });

        const container = wrapper.find("a");
        expect(container.classes()).toContain("w-60");
        expect(container.classes()).toContain("h-60");
    });

    it("applies hover effects classes", () => {
        const container = wrapper.find("a");
        expect(container.classes()).toContain("hover:opacity-80");
        expect(container.classes()).toContain("hover:shadow");
    });
});
