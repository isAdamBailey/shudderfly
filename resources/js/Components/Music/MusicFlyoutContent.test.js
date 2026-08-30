import MusicFlyoutContent from "@/Components/Music/MusicFlyoutContent.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

global.route = vi.fn((name, params) => {
    if (name === "music.destroy" && params != null) {
        return `/music/${params}`;
    }
    return `/${name}`;
});

const mockCanAdmin = ref(true);
const mockIsFlyoutOpen = ref(true);
const mockSetSongsList = vi.fn();
const mockRemoveSongFromList = vi.fn();
const mockSetSearch = vi.fn();
const mockSetFilter = vi.fn();

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canAdmin: mockCanAdmin,
    }),
}));

vi.mock("@/composables/useMusicPlayer", () => ({
    useMusicPlayer: () => ({
        currentSong: ref(null),
        isPlaying: ref(false),
        playSong: vi.fn(),
        toggleCurrentSongPlayback: vi.fn(),
        setSongsList: mockSetSongsList,
        removeSongFromList: mockRemoveSongFromList,
        setSearch: mockSetSearch,
        setFilter: mockSetFilter,
        isFlyoutOpen: mockIsFlyoutOpen,
    }),
}));

vi.mock("@inertiajs/vue3", () => ({
    router: {
        post: vi.fn(),
    },
}));

vi.mock("@/composables/useConfirmDialog", () => ({
    useConfirmDialog: () => ({
        show: ref(false),
        message: ref(""),
        title: ref(""),
        confirmLabel: ref(""),
        cancelLabel: ref(""),
        confirmVariant: ref("primary"),
        ask: () => Promise.resolve(true),
        onConfirmed: () => {},
        onCancelled: () => {},
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key) => key,
    }),
}));

describe("MusicFlyoutContent admin add song", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCanAdmin.value = true;

        document.head.innerHTML =
            '<meta name="csrf-token" content="test-token" />';

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    song: { id: 99, title: "New Song", is_manual: true },
                }),
        });
    });

    const mountContent = () =>
        mount(MusicFlyoutContent, {
            props: {
                songs: { data: [], next_page_url: null },
                search: "",
                filter: "",
                scrollRootEl: null,
            },
        });

    it("shows the Add button for admins", () => {
        const wrapper = mountContent();

        const buttons = wrapper.findAll("button").map((b) => b.text());
        expect(buttons).toContain("Add");
    });

    it("hides the Add button for non-admins", () => {
        mockCanAdmin.value = false;
        const wrapper = mountContent();

        const buttons = wrapper.findAll("button").map((b) => b.text());
        expect(buttons).not.toContain("Add");
    });

    it("submits the pasted input to music.store and emits reload on success", async () => {
        const wrapper = mountContent();

        const addButton = wrapper
            .findAll("button")
            .find((b) => b.text() === "Add");
        await addButton.trigger("click");
        await nextTick();

        const input = wrapper.find('input[type="text"]');
        await input.setValue(
            "Learn Animal Sounds | Moo Cow Song: https://music.youtube.com/watch?v=86IrHVH43mQ&feature=share."
        );
        await wrapper.find("form").trigger("submit.prevent");
        await nextTick();
        await nextTick();

        expect(global.fetch).toHaveBeenCalledWith(
            "/music.store",
            expect.objectContaining({ method: "POST" })
        );
        expect(wrapper.emitted("reload")).toBeTruthy();
    });

    it("shows an inline error when the add request fails", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: () =>
                Promise.resolve({
                    error: "Not a valid YouTube video ID or URL.",
                }),
        });

        const wrapper = mountContent();

        const addButton = wrapper
            .findAll("button")
            .find((b) => b.text() === "Add");
        await addButton.trigger("click");
        await nextTick();

        await wrapper.find('input[type="text"]').setValue("garbage");
        await wrapper.find("form").trigger("submit.prevent");
        await nextTick();
        await nextTick();

        expect(wrapper.text()).toContain(
            "Not a valid YouTube video ID or URL."
        );
        expect(wrapper.emitted("reload")).toBeFalsy();
    });
});

describe("MusicFlyoutContent queued sync", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockCanAdmin.value = true;
        mockIsFlyoutOpen.value = true;

        document.head.innerHTML =
            '<meta name="csrf-token" content="test-token" />';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mountContent = () =>
        mount(MusicFlyoutContent, {
            props: {
                songs: { data: [], next_page_url: null },
                search: "",
                filter: "",
                scrollRootEl: null,
            },
        });

    /** Queue the POST response, then a status response for every later poll. */
    const stubFetch = (status) => {
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: { state: "queued", message: "q", done: false },
                    }),
            })
            .mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ status }),
            });
    };

    const clickSync = async (wrapper) => {
        const syncButton = wrapper
            .findAll("button")
            .find((b) => b.text() === "Sync");
        await syncButton.trigger("click");
        await nextTick();
        await nextTick();
    };

    const statusPolls = () =>
        global.fetch.mock.calls.filter((c) => c[0] === "/music.sync-status")
            .length;

    it("posts to music.sync and shows the queued status without waiting for the work", async () => {
        stubFetch({ state: "success", message: "done", done: true });
        const wrapper = mountContent();

        await clickSync(wrapper);

        expect(global.fetch).toHaveBeenCalledWith(
            "/music.sync",
            expect.objectContaining({ method: "POST" })
        );
        expect(wrapper.text()).toContain("music.sync_queued");
    });

    it("polls sync status and stops once the job reports done", async () => {
        stubFetch({ state: "success", message: "Synced 4 songs", done: true });

        const wrapper = mountContent();
        await clickSync(wrapper);

        await vi.advanceTimersByTimeAsync(4000);
        await nextTick();

        expect(statusPolls()).toBe(1);
        expect(wrapper.text()).toContain("Synced 4 songs");
        expect(wrapper.emitted("reload")[0][0]).toEqual({
            filter: null,
            search: null,
        });

        // Done, so no further polls are scheduled.
        await vi.advanceTimersByTimeAsync(20000);
        expect(statusPolls()).toBe(1);
    });

    it("does not refetch the song list when the sync failed", async () => {
        stubFetch({ state: "error", message: "API key missing", done: true });

        const wrapper = mountContent();
        await clickSync(wrapper);

        await vi.advanceTimersByTimeAsync(4000);
        await nextTick();

        expect(wrapper.text()).toContain("API key missing");
        expect(wrapper.emitted("reload")).toBeFalsy();
    });

    it("does not let the 5 minute deadline expire while the flyout is closed", async () => {
        stubFetch({ state: "success", message: "Synced 4 songs", done: true });

        const wrapper = mountContent();
        await clickSync(wrapper);

        // Closed for longer than the whole polling window.
        mockIsFlyoutOpen.value = false;
        await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
        expect(statusPolls()).toBe(0);

        // Reopening must still find a live poller, not a timed-out one.
        mockIsFlyoutOpen.value = true;
        await vi.advanceTimersByTimeAsync(4000);
        await nextTick();
        expect(statusPolls()).toBe(1);
        expect(wrapper.text()).toContain("Synced 4 songs");
    });

    it("reports a timeout rather than silently clearing the banner", async () => {
        stubFetch({ state: "running", message: "Syncing…", done: false });

        const wrapper = mountContent();
        await clickSync(wrapper);

        await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
        await nextTick();

        expect(wrapper.text()).toContain("music.sync_timed_out");
    });

    it("skips polling requests while the flyout is closed, then resumes", async () => {
        stubFetch({ state: "success", message: "Synced 4 songs", done: true });

        const wrapper = mountContent();
        await clickSync(wrapper);

        mockIsFlyoutOpen.value = false;
        await vi.advanceTimersByTimeAsync(12000);
        expect(statusPolls()).toBe(0);

        mockIsFlyoutOpen.value = true;
        await vi.advanceTimersByTimeAsync(4000);
        await nextTick();
        expect(statusPolls()).toBe(1);
        expect(wrapper.text()).toContain("Synced 4 songs");
    });
});
