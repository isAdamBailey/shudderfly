import UploadsIndex from "@/Pages/Uploads/Index.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouteMock } from "../../vitest.setup.js";

// Mock route globally
global.route = createRouteMock();

// Mock usePage
const mockUsePage = vi.fn();

vi.mock("@inertiajs/vue3", async () => {
    const actual = await vi.importActual("@inertiajs/vue3");
    return {
        ...actual,
        Head: {
            name: "Head",
            template: "<head><slot /></head>",
        },
        Link: {
            name: "Link",
            template: '<a :href="href"><slot /></a>',
            props: ["href"],
        },
        router: {
            get: vi.fn(),
        },
        usePage: () => mockUsePage(),
    };
});

// Mock composables
vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
    }),
}));

// Mock child components
vi.mock("@/Layouts/AuthenticatedLayout.vue", () => ({
    default: {
        name: "AuthenticatedLayout",
        template:
            '<div class="authenticated-layout"><div class="header"><slot name="header" /></div><slot /></div>',
    },
}));

vi.mock("@/Components/Button.vue", () => ({
    default: {
        name: "Button",
        template:
            '<button :disabled="disabled" :class="{ active: isActive }" @click="$emit(\'click\')"><slot /></button>',
        props: ["disabled", "isActive"],
        emits: ["click"],
    },
}));

vi.mock("@/Pages/Uploads/UploadsGrid.vue", () => ({
    default: {
        name: "UploadsGrid",
        template: '<div class="uploads-grid">Grid</div>',
        props: ["photos"],
    },
}));

vi.mock("@/Components/ScrollTop.vue", () => ({
    default: {
        name: "ScrollTop",
        template: '<div class="scroll-top">Scroll</div>',
    },
}));

describe("Uploads/Index Component - Site Settings", () => {
    const mockPhotos = {
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 25,
        total: 0,
    };

    beforeEach(() => {
        // Reset window location
        delete window.location;
        window.location = { search: "" };

        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });
    });

    it("shows music filter button when music_enabled is true", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );

        expect(musicButton).toBeTruthy();
        expect(musicButton.exists()).toBe(true);
    });

    it("hides music filter button when music_enabled is false", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: false,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );

        expect(musicButton).toBeFalsy();
    });

    it("shows YouTube filter button when youtube_enabled is true", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const youtubeButton = buttons.find((btn) =>
            btn.html().includes("ri-youtube-line")
        );

        expect(youtubeButton).toBeTruthy();
    });

    it("hides YouTube filter button when youtube_enabled is false", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: false,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const youtubeButton = buttons.find((btn) =>
            btn.html().includes("ri-youtube-line")
        );

        expect(youtubeButton).toBeFalsy();
    });

    it("shows snapshot filter button when snapshot_enabled is true", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const snapshotButton = buttons.find((btn) =>
            btn.html().includes("ri-camera-line")
        );

        expect(snapshotButton).toBeTruthy();
    });

    it("hides snapshot filter button when snapshot_enabled is false", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: false,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });
        const snapshotButton = buttons.find((btn) =>
            btn.html().includes("ri-camera-line")
        );

        expect(snapshotButton).toBeFalsy();
    });

    it("always shows popular, random, and old filter buttons regardless of settings", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: false,
                    youtube_enabled: false,
                    snapshot_enabled: false,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });

        // Check for popular (star), random (dice), and old (history) buttons
        const popularButton = buttons.find((btn) =>
            btn.html().includes("ri-star-line")
        );
        const randomButton = buttons.find((btn) =>
            btn.html().includes("ri-dice-line")
        );
        const oldButton = buttons.find((btn) =>
            btn.html().includes("ri-history-line")
        );

        expect(popularButton).toBeTruthy();
        expect(randomButton).toBeTruthy();
        expect(oldButton).toBeTruthy();
    });

    it("shows all filter buttons when all settings are enabled", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                    youtube_enabled: true,
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });

        // Should have 6 buttons: popular, music, youtube, snapshot, random, old
        expect(buttons.length).toBeGreaterThanOrEqual(6);

        const popularButton = buttons.find((btn) =>
            btn.html().includes("ri-star-line")
        );
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );
        const youtubeButton = buttons.find((btn) =>
            btn.html().includes("ri-youtube-line")
        );
        const snapshotButton = buttons.find((btn) =>
            btn.html().includes("ri-camera-line")
        );
        const randomButton = buttons.find((btn) =>
            btn.html().includes("ri-dice-line")
        );
        const oldButton = buttons.find((btn) =>
            btn.html().includes("ri-history-line")
        );

        expect(popularButton).toBeTruthy();
        expect(musicButton).toBeTruthy();
        expect(youtubeButton).toBeTruthy();
        expect(snapshotButton).toBeTruthy();
        expect(randomButton).toBeTruthy();
        expect(oldButton).toBeTruthy();
    });

    it("shows minimum buttons when all conditional settings are disabled", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: false,
                    youtube_enabled: false,
                    snapshot_enabled: false,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });

        // Should have only 3 buttons: popular, random, old
        expect(buttons.length).toBe(3);

        // Verify music, youtube, and snapshot buttons don't exist
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );
        const youtubeButton = buttons.find((btn) =>
            btn.html().includes("ri-youtube-line")
        );
        const snapshotButton = buttons.find((btn) =>
            btn.html().includes("ri-camera-line")
        );

        expect(musicButton).toBeFalsy();
        expect(youtubeButton).toBeFalsy();
        expect(snapshotButton).toBeFalsy();
    });

    it("handles missing settings object gracefully", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                // Settings completely missing - component should handle with optional chaining
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        // Should render without errors
        expect(wrapper.exists()).toBe(true);

        // All conditional buttons should be hidden when settings are undefined
        const buttons = wrapper.findAllComponents({ name: "Button" });
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );

        expect(musicButton).toBeFalsy();
    });

    it("handles null setting values", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: null,
                    youtube_enabled: null,
                    snapshot_enabled: null,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        const buttons = wrapper.findAllComponents({ name: "Button" });

        // All conditional buttons should be hidden when null
        const musicButton = buttons.find((btn) =>
            btn.html().includes("ri-music-line")
        );
        const youtubeButton = buttons.find((btn) =>
            btn.html().includes("ri-youtube-line")
        );
        const snapshotButton = buttons.find((btn) =>
            btn.html().includes("ri-camera-line")
        );

        expect(musicButton).toBeFalsy();
        expect(youtubeButton).toBeFalsy();
        expect(snapshotButton).toBeFalsy();
    });

    it("correctly computes isMusicEnabled as computed property", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        expect(wrapper.vm.isMusicEnabled).toBe(true);
    });

    it("correctly computes isYouTubeEnabled as computed property", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    youtube_enabled: false,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        expect(wrapper.vm.isYouTubeEnabled).toBe(false);
    });

    it("correctly computes isSnapshotEnabled as computed property", () => {
        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    snapshot_enabled: "1",
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        // Should handle string "1" as truthy
        expect(wrapper.vm.isSnapshotEnabled).toBeTruthy();
    });

    it("displays correct title when music filter is active", () => {
        window.location.search = "?filter=music";

        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    music_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        expect(wrapper.vm.title).toBe("Songs");
    });

    it("displays correct title when YouTube filter is active", () => {
        window.location.search = "?filter=youtube";

        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    youtube_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        expect(wrapper.vm.title).toBe("YouTube videos");
    });

    it("displays correct title when snapshot filter is active", () => {
        window.location.search = "?filter=snapshot";

        mockUsePage.mockReturnValue({
            props: {
                search: null,
                settings: {
                    snapshot_enabled: true,
                },
            },
        });

        const wrapper = mount(UploadsIndex, {
            props: {
                photos: mockPhotos,
            },
        });

        expect(wrapper.vm.title).toBe("Screenshots");
    });
});
