import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import UserTagList from "@/Components/UserTagList.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = vi.fn((name, params) => {
    if (name === "music.share" && params != null) {
        return `/music/${params}/share`;
    }
    if (name === "pages.share" && params != null) {
        return `/pages/${params}/share`;
    }
    return `/${name}`;
});

const mockPost = vi.fn();
const mockCloseFlyout = vi.fn();

vi.mock("@/composables/useMusicPlayer", () => ({
    useMusicPlayer: () => ({
        closeFlyout: mockCloseFlyout,
    }),
}));

vi.mock("@inertiajs/vue3", () => ({
    router: {
        post: (...args) => mockPost(...args),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: "Alice" } },
            users: [{ id: 2, name: "Bob" }],
            settings: { messaging_enabled: "1" },
        },
    }),
}));

// Resolved by the test once it has asserted on the state while the confirm
// dialog is open, so the tag menu can be inspected mid-flight.
let resolveConfirm = null;
const confirmAsk = vi.fn(
    () =>
        new Promise((resolve) => {
            resolveConfirm = resolve;
        })
);

vi.mock("@/composables/useConfirmDialog", () => ({
    useConfirmDialog: () => ({
        show: { value: false },
        message: { value: "" },
        title: { value: "" },
        confirmLabel: { value: "" },
        cancelLabel: { value: "" },
        confirmVariant: { value: "primary" },
        ask: (...args) => confirmAsk(...args),
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

describe("ShareToChatButton song kind", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        resolveConfirm = null;
        confirmAsk.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveConfirm = resolve;
                })
        );
        mockPost.mockImplementation((_url, _data, options) => {
            options?.onSuccess?.();
        });
    });

    const mountSongShareButton = () =>
        mount(ShareToChatButton, {
            props: { kind: "song", songId: 5 },
            global: {
                stubs: {
                    Teleport: { template: "<div><slot /></div>" },
                },
            },
        });

    // The component awaits the confirm dialog before posting; settle both the
    // confirmation and the render that follows it.
    const confirmShare = async (ok = true) => {
        resolveConfirm?.(ok);
        await nextTick();
        await nextTick();
    };

    it("posts to music.share when share without tag is selected", async () => {
        const wrapper = mountSongShareButton();

        await wrapper.find("button").trigger("click");
        await nextTick();

        const userTagList = wrapper.findComponent(UserTagList);
        expect(userTagList.exists()).toBe(true);
        userTagList.vm.$emit("select-none");
        await confirmShare();

        expect(mockPost).toHaveBeenCalledWith(
            "/music/5/share",
            { tagged_user_ids: [] },
            expect.objectContaining({ preserveScroll: true })
        );
    });

    it("stores once-per-day localStorage key after sharing song", async () => {
        const wrapper = mountSongShareButton();

        await wrapper.find("button").trigger("click");
        await nextTick();

        wrapper.findComponent(UserTagList).vm.$emit("select-none");
        await confirmShare();

        const today = new Date().toISOString().split("T")[0];
        expect(localStorage.getItem(`song_share_5_${today}`)).not.toBeNull();
    });

    it("closes the music flyout after sharing a song", async () => {
        const wrapper = mountSongShareButton();

        await wrapper.find("button").trigger("click");
        await nextTick();

        wrapper.findComponent(UserTagList).vm.$emit("select-none");
        await confirmShare();

        expect(mockCloseFlyout).toHaveBeenCalled();
    });

    it("closes the tag menu before the confirm dialog opens", async () => {
        const wrapper = mountSongShareButton();

        await wrapper.find("button").trigger("click");
        await nextTick();
        expect(wrapper.findComponent(UserTagList).exists()).toBe(true);

        wrapper.findComponent(UserTagList).vm.$emit("select", {
            id: 2,
            name: "Bob",
        });
        await nextTick();

        // Confirm dialog is still awaiting an answer, and the menu is already
        // gone so it can't cover the dialog's buttons.
        expect(confirmAsk).toHaveBeenCalled();
        expect(wrapper.findComponent(UserTagList).exists()).toBe(false);
        expect(mockPost).not.toHaveBeenCalled();

        await confirmShare();

        expect(mockPost).toHaveBeenCalledWith(
            "/music/5/share",
            { tagged_user_ids: [2] },
            expect.objectContaining({ preserveScroll: true })
        );
    });

    it("leaves the tag menu closed and posts nothing when the share is cancelled", async () => {
        const wrapper = mountSongShareButton();

        await wrapper.find("button").trigger("click");
        await nextTick();

        wrapper.findComponent(UserTagList).vm.$emit("select", {
            id: 2,
            name: "Bob",
        });
        await confirmShare(false);

        expect(mockPost).not.toHaveBeenCalled();
        expect(wrapper.findComponent(UserTagList).exists()).toBe(false);
    });
});
