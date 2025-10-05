import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SongListItem from "@/Components/SongListItem.vue";

describe("SongListItem", () => {
    let wrapper;
    const mockSong = {
        id: 1,
        title: "Test Song Title",
        youtube_video_id: "dQw4w9WgXcQ",
        thumbnail_url: "https://example.com/thumbnail.jpg",
        published_at: "2023-01-15T10:30:00Z",
        view_count: 1500000,
        duration: "PT3M45S",
        description: "Test song description",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders song information correctly", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        expect(wrapper.find("h3").text()).toBe("Test Song Title");
        expect(wrapper.find("img").attributes("src")).toBe(
            "https://example.com/thumbnail.jpg"
        );
        expect(wrapper.text()).toContain("Jan 15, 2023");
        expect(wrapper.text()).toContain("3:45");
    });

    it("shows fallback thumbnail when image fails to load", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: { ...mockSong, thumbnail_url: null },
                currentSong: null,
                isPlaying: false,
            },
        });

        // When thumbnail_url is null, it should use the YouTube fallback URL
        expect(wrapper.find("img").exists()).toBe(true);
        const expectedUrl = `https://img.youtube.com/vi/${mockSong.youtube_video_id}/maxresdefault.jpg`;
        expect(wrapper.find("img").attributes("src")).toBe(expectedUrl);
    });

    it("handles image error by showing fallback", async () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        const img = wrapper.find("img");
        await img.trigger("error");

        // After error, should show fallback
        expect(wrapper.find(".ri-music-2-line").exists()).toBe(true);
    });

    it("shows play button by default", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        expect(wrapper.find(".ri-play-fill").exists()).toBe(true);
        expect(wrapper.find(".ri-pause-fill").exists()).toBe(false);
    });

    it("shows pause button when current song is playing", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: mockSong,
                isPlaying: true,
            },
        });

        expect(wrapper.find(".ri-pause-fill").exists()).toBe(true);
        expect(wrapper.find(".ri-play-fill").exists()).toBe(false);
    });

    it("shows currently playing indicator when song is current", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: mockSong,
                isPlaying: true,
            },
        });

        const indicator = wrapper.find(".animate-pulse");
        expect(indicator.exists()).toBe(true);
    });

    it("emits play event when clicked", async () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        await wrapper.trigger("click");

        expect(wrapper.emitted()).toHaveProperty("play");
        expect(wrapper.emitted("play")[0]).toEqual([mockSong]);
    });

    it("formats duration correctly for different formats", () => {
        // Test hours format
        const songWithHours = { ...mockSong, duration: "PT1H23M45S" };
        wrapper = mount(SongListItem, {
            props: {
                song: songWithHours,
                currentSong: null,
                isPlaying: false,
            },
        });
        expect(wrapper.text()).toContain("1:23:45");

        // Test minutes only
        const songMinutesOnly = { ...mockSong, duration: "PT4M12S" };
        wrapper = mount(SongListItem, {
            props: {
                song: songMinutesOnly,
                currentSong: null,
                isPlaying: false,
            },
        });
        expect(wrapper.text()).toContain("4:12");
    });

    it("applies dark mode classes correctly", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        const container = wrapper.find("div");
        expect(container.classes()).toContain("dark:bg-gray-800");
        expect(container.classes()).toContain("dark:hover:bg-gray-700");
        expect(container.classes()).toContain("border-b-2");
        expect(container.classes()).toContain("dark:border-gray-600");
    });

    it("handles missing song data gracefully", () => {
        const incompleteSong = {
            id: 1,
            title: "Test Song",
            youtube_video_id: "test123",
            // Missing other optional fields
        };

        wrapper = mount(SongListItem, {
            props: {
                song: incompleteSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        expect(wrapper.find("h3").text()).toBe("Test Song");
        expect(() => wrapper.html()).not.toThrow();
    });

    it("changes play button color when current song is playing", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: mockSong,
                isPlaying: true,
            },
        });

        const playButton = wrapper.find(".w-10.h-10");
        expect(playButton.classes()).toContain("bg-green-600");
        expect(playButton.classes()).toContain("hover:bg-green-700");
    });

    it("uses fallback thumbnail URL when thumbnail_url is not provided", () => {
        const songWithoutThumbnail = { ...mockSong, thumbnail_url: null };
        wrapper = mount(SongListItem, {
            props: {
                song: songWithoutThumbnail,
                currentSong: null,
                isPlaying: false,
            },
        });

        // Should use YouTube thumbnail fallback
        const expectedUrl = `https://img.youtube.com/vi/${mockSong.youtube_video_id}/maxresdefault.jpg`;
        expect(wrapper.find("img").attributes("src")).toBe(expectedUrl);
    });

    it("has proper responsive design classes", () => {
        wrapper = mount(SongListItem, {
            props: {
                song: mockSong,
                currentSong: null,
                isPlaying: false,
            },
        });

        const container = wrapper.find("div");
        expect(container.classes()).toContain("transition-colors");
        expect(container.classes()).toContain("duration-200");
    });
});
