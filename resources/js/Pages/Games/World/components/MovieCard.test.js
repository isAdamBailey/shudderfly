import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MovieCard from "./MovieCard.vue";
import { speakGameIntro } from "@/composables/useGameIntroSpeech";

vi.mock("@/composables/useGameIntroSpeech", () => ({
    speakGameIntro: vi.fn(),
    stopGameIntroSpeech: vi.fn(),
}));

const movie = {
    id: 862,
    title: "Toy Story",
    image_path: "/toy.jpg",
    cover: "https://image.tmdb.test/w200/toy.jpg",
};

function mountCard(props = { movie }) {
    return mount(MovieCard, {
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

describe("MovieCard", () => {
    it("shows the poster and title, and reads the title aloud", () => {
        const wrapper = mountCard();

        expect(wrapper.get(".movie-card-poster").attributes("src")).toBe(
            movie.cover
        );
        expect(wrapper.get("h2").text()).toBe("Toy Story");
        expect(speakGameIntro).toHaveBeenCalledWith("Toy Story");
    });

    it("links Watch to the movie on the Movies page", () => {
        const wrapper = mountCard();

        expect(wrapper.findComponent({ name: "Link" }).props("href")).toBe(
            "/movie-cast?title=Toy+Story&movieId=862"
        );
    });

    it("does without a poster", () => {
        const wrapper = mountCard({ movie: { ...movie, cover: null } });

        expect(wrapper.find(".movie-card-poster").exists()).toBe(false);
    });
});
