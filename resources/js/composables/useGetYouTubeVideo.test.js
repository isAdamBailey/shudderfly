import {
    isEmbeddableYouTubeVideo,
    isYouTubePlaylist,
    youTubeVideoId,
} from "@/composables/useGetYouTubeVideo";
import { describe, expect, it } from "vitest";

describe("isEmbeddableYouTubeVideo", () => {
    it.each([
        ["https://www.youtube.com/watch?v=abc123", true],
        ["https://youtu.be/abc123", true],
        ["https://music.youtube.com/watch?v=abc123", true],
        ["https://www.youtube.com/playlist?list=PL123", false],
        ["https://www.youtube.com/", false],
        ["https://vimeo.com/12345", false],
        ["not a url", false],
        [null, false],
    ])("%s -> %s", (url, expected) => {
        expect(isEmbeddableYouTubeVideo(url)).toBe(expected);
    });

    it("still parses playlists and ids for VideoWrapper", () => {
        expect(
            isYouTubePlaylist("https://www.youtube.com/playlist?list=PL1")
        ).toBe(true);
        expect(youTubeVideoId("https://www.youtube.com/watch?v=abc")).toBe(
            "abc"
        );
    });
});
