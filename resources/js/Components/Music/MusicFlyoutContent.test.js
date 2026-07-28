import MusicFlyoutContent from "@/Components/Music/MusicFlyoutContent.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

global.route = vi.fn((name, params) => {
    if (name === "music.destroy" && params != null) {
        return `/music/${params}`;
    }
    return `/${name}`;
});

const mockCanAdmin = ref(true);
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
