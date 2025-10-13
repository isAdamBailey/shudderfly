import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import MusicIndex from "@/Pages/Music/Index.vue";

// Mock the useInfiniteScroll composable
vi.mock("@/composables/useInfiniteScroll", () => ({
    useInfiniteScroll: vi.fn(),
}));

import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { createRouteMock } from "../../setup.js";

const mockRouter = {
    get: vi.fn(),
    post: vi.fn(),
};

const mockUsePage = vi.fn(() => ({
    props: {
        search: null,
    },
}));

// Mock components
const mockComponents = {
    Head: { template: "<head><slot /></head>" },
    Link: {
        template: '<a :href="href"><slot /></a>',
        props: ["href"],
    },
    BreezeAuthenticatedLayout: {
        template:
            '<div class="authenticated-layout"><div class="header"><slot name="header" /></div><slot /></div>',
    },
    Button: {
        template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        props: ["disabled"],
        emits: ["click"],
    },
    MusicPlayer: {
        template:
            '<div class="music-player" v-if="currentSong">Music Player</div>',
        props: ["currentSong"],
        emits: ["close", "playing"],
    },
    SongListItem: {
        template:
            '<div class="song-item" @click="$emit(\'play\', song)">{{ song.title }}</div>',
        props: ["song", "currentSong", "isPlaying"],
        emits: ["play"],
    },
    ScrollTop: {
        template: '<div class="scroll-top">Scroll Top</div>',
    },
    ManEmptyCircle: {
        template: '<div class="man-empty-circle">Man Empty Circle</div>',
    },
};

describe("Music Index", () => {
    let wrapper;
    const mockSongs = {
        data: [
            {
                id: 1,
                title: "Test Song 1",
                youtube_video_id: "test1",
                published_at: "2023-01-15T10:30:00Z",
            },
            {
                id: 2,
                title: "Test Song 2",
                youtube_video_id: "test2",
                published_at: "2023-01-16T10:30:00Z",
            },
        ],
        next_page_url: "http://localhost/music?page=2",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Create proper reactive mock that matches the real useInfiniteScroll behavior
        const mockItems = ref(
            mockSongs.data.map((song) => ({ ...song, loading: false }))
        );
        const mockInfiniteScrollRef = ref(null);

        useInfiniteScroll.mockReturnValue({
            items: mockItems,
            infiniteScrollRef: mockInfiniteScrollRef,
        });

        // Mock window object methods
        global.window = {
            ...global.window,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            location: {
                search: "",
                href: "http://localhost/music",
            },
            history: {
                replaceState: vi.fn(),
            },
        };
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount();
        }
    });

    const createWrapper = (props = {}) => {
        return mount(MusicIndex, {
            props: {
                songs: mockSongs,
                search: "",
                canSync: false,
                ...props,
            },
            global: {
                components: mockComponents,
                properties: {
                    route: global.route,
                },
                mocks: {
                    route: global.route,
                    $router: mockRouter,
                    $inertia: {
                        router: mockRouter,
                    },
                },
                provide: {
                    usePage: mockUsePage,
                },
            },
            attachTo: document.body, // Ensure proper DOM attachment for events
        });
    };

    it("renders the music page with title", () => {
        wrapper = createWrapper();

        expect(wrapper.find("h2").text()).toBe("Latest music");
        expect(wrapper.find(".authenticated-layout").exists()).toBe(true);
    });

    it("shows sync button for admin users", () => {
        wrapper = createWrapper({ canSync: true });

        const buttons = wrapper.findAll("button");
        const syncButton = buttons.find((btn) => btn.text().includes("Sync"));
        expect(syncButton.exists()).toBe(true);
    });

    it("hides sync button for non-admin users", () => {
        wrapper = createWrapper({ canSync: false });

        const buttons = wrapper.findAll("button");
        const syncButton = buttons.find((btn) => btn.text().includes("Sync"));
        expect(syncButton?.exists() || false).toBe(false);
    });

    it("disables sync button when syncing", async () => {
        wrapper = createWrapper({ canSync: true });

        // Set the syncing state directly on the component
        wrapper.vm.syncing = true;
        await nextTick();

        const buttons = wrapper.findAll("button");
        const syncButton = buttons.find((btn) =>
            btn.text().includes("Syncing")
        );
        expect(syncButton.exists()).toBe(true);
        expect(syncButton.attributes("disabled")).toBeDefined();
    });

    it("renders song list when songs are available", () => {
        wrapper = createWrapper();

        expect(wrapper.text()).toContain("Test Song 1");
        expect(wrapper.text()).toContain("Test Song 2");

        const songContainers = wrapper.findAll(".flex.items-center.p-4");
        expect(songContainers).toHaveLength(2);
    });

    it("shows no songs message when songs array is empty", () => {
        // Mock empty items before wrapper creation
        useInfiniteScroll.mockReturnValue({
            items: { value: [] },
            infiniteScrollRef: { value: null },
        });

        wrapper = createWrapper({
            songs: { data: [], next_page_url: null },
        });

        expect(wrapper.text()).toContain("I can't find any music like that");
    });

    it("shows search-specific no results message", () => {
        // Mock empty items before wrapper creation
        useInfiniteScroll.mockReturnValue({
            items: { value: [] },
            infiniteScrollRef: { value: null },
        });

        wrapper = createWrapper({
            songs: { data: [], next_page_url: null },
            search: "nonexistent song",
        });

        expect(wrapper.text()).toContain("I can't find any music like that");
    });

    it("updates current song when song is played", async () => {
        wrapper = createWrapper();

        // Directly call the playSong method instead of triggering DOM events
        wrapper.vm.playSong(mockSongs.data[0]);
        await nextTick();

        expect(wrapper.vm.currentSong).toEqual(mockSongs.data[0]);
    });

    it("closes music player when close event is emitted", async () => {
        wrapper = createWrapper();

        // First play a song
        wrapper.vm.playSong(mockSongs.data[0]);
        await nextTick();

        expect(wrapper.vm.currentSong).toBeTruthy();

        // Now close the player
        wrapper.vm.closeMusicPlayer();

        expect(wrapper.vm.currentSong).toBe(null);
        expect(wrapper.vm.isPlaying).toBe(false);
    });

    it("handles playing state changes", async () => {
        wrapper = createWrapper();

        wrapper.vm.handlePlayingState(true);
        expect(wrapper.vm.isPlaying).toBe(true);

        wrapper.vm.handlePlayingState(false);
        expect(wrapper.vm.isPlaying).toBe(false);
    });

    it("shows loading indicator when next page is available", () => {
        wrapper = createWrapper({
            songs: {
                ...mockSongs,
                next_page_url: "http://localhost/music?page=2",
            },
        });

        // Should show loading indicator when there are items AND next_page_url exists
        expect(wrapper.text()).toContain("Loading more songs");
    });

    // New tests for specificSong prop functionality
    it("auto-plays song when specificSong prop is provided", async () => {
        const specificSong = mockSongs.data[0];

        wrapper = createWrapper({ specificSong });

        // Wait for the watch to trigger
        await nextTick();

        // The song should be set as current
        expect(wrapper.vm.currentSong).toEqual(specificSong);
    });

    it("does not auto-play when specificSong prop is null", async () => {
        wrapper = createWrapper({ specificSong: null });
        await nextTick();

        expect(wrapper.vm.currentSong).toBe(null);
    });

    it("does not auto-play specificSong if a song is already playing", async () => {
        wrapper = createWrapper({ specificSong: null });

        // Manually set a current song first
        wrapper.vm.currentSong = mockSongs.data[0];
        await nextTick();

        // Now update the prop with a different song
        await wrapper.setProps({ specificSong: mockSongs.data[1] });
        await nextTick();

        // Should still be the first song, not the one from the prop
        expect(wrapper.vm.currentSong.id).toBe(1);
    });

    it("auto-plays specificSong when provided after mount", async () => {
        wrapper = createWrapper({ specificSong: null });
        await nextTick();

        expect(wrapper.vm.currentSong).toBe(null);

        // Now provide a specific song
        await wrapper.setProps({ specificSong: mockSongs.data[1] });
        await nextTick();

        expect(wrapper.vm.currentSong).toEqual(mockSongs.data[1]);
    });
});
