import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookCard from "./BookCard.vue";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";

vi.mock("@/composables/useGameIntroSpeech", () => ({
    speakGameIntro: vi.fn(),
    stopGameIntroSpeech: vi.fn(),
}));

const book = {
    id: 7,
    slug: "the-big-toot",
    title: "The Big Toot",
    excerpt: "A toot so big it blew the roof off.",
    cover_image: { id: 3, media_path: "https://cdn.test/cover.jpg" },
};

function mountCard(props = { book }) {
    return mount(BookCard, {
        props,
        global: {
            stubs: {
                Link: {
                    name: "Link",
                    props: ["href"],
                    template: '<a :href="href"><slot /></a>',
                },
            },
        },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("BookCard", () => {
    it("shows the cover, title and excerpt", () => {
        const wrapper = mountCard();

        expect(wrapper.get(".book-card-cover").attributes("src")).toBe(
            book.cover_image.media_path
        );
        expect(wrapper.get("h2").text()).toBe(book.title);
        expect(wrapper.text()).toContain(book.excerpt);
    });

    it("links Read to the book", () => {
        const wrapper = mountCard();

        expect(wrapper.findComponent({ name: "Link" }).props("href")).toBe(
            "/books/the-big-toot"
        );
    });

    it("does without a cover or an excerpt", () => {
        const wrapper = mountCard({
            book: { ...book, cover_image: null, excerpt: null },
        });

        expect(wrapper.find(".book-card-cover").exists()).toBe(false);
        expect(speakGameIntro).toHaveBeenCalledWith("The Big Toot");
    });

    it("reads the title and excerpt aloud, without markup, and stops when it closes", () => {
        const wrapper = mountCard({
            book: { ...book, title: "<b>The Big Toot</b>" },
        });

        expect(speakGameIntro).toHaveBeenCalledWith(
            "The Big Toot. A toot so big it blew the roof off."
        );
        wrapper.unmount();
        expect(stopGameIntroSpeech).toHaveBeenCalled();
    });

    it("emits cancel from its cancel button", async () => {
        const wrapper = mountCard();

        await wrapper.get(".world-card-cancel").trigger("click");

        expect(wrapper.emitted("cancel")).toHaveLength(1);
    });
});
