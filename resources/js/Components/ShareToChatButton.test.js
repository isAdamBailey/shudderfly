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

vi.mock("@/composables/useConfirmDialog", () => ({
  useConfirmDialog: () => ({
    show: { value: false },
    message: { value: "" },
    title: { value: "" },
    confirmLabel: { value: "" },
    cancelLabel: { value: "" },
    confirmVariant: { value: "primary" },
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

describe("ShareToChatButton song kind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it("posts to music.share when share without tag is selected", async () => {
    const wrapper = mountSongShareButton();

    await wrapper.find("button").trigger("click");
    await nextTick();

    const userTagList = wrapper.findComponent(UserTagList);
    expect(userTagList.exists()).toBe(true);
    userTagList.vm.$emit("select-none");
    await nextTick();

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
    await nextTick();

    const today = new Date().toISOString().split("T")[0];
    expect(localStorage.getItem(`song_share_5_${today}`)).not.toBeNull();
  });

  it("closes the music flyout after sharing a song", async () => {
    const wrapper = mountSongShareButton();

    await wrapper.find("button").trigger("click");
    await nextTick();

    wrapper.findComponent(UserTagList).vm.$emit("select-none");
    await nextTick();

    expect(mockCloseFlyout).toHaveBeenCalled();
  });
});
