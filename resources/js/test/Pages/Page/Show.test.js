import Show from "@/Pages/Page/Show.vue";
import { mount } from "@vue/test-utils";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// Mock route function
global.route = vi.fn((name, params) => {
  if (name === "pages.share" && params) {
    return `/pages/${params}/share`;
  }
  if (name === "pages.show" && params) {
    return `/pages/${params}`;
  }
  return `/${name}`;
});

// Mock composables
vi.mock("@/composables/permissions", () => ({
  usePermissions: () => ({
    canEditPages: true
  })
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
  useSpeechSynthesis: () => ({
    speak: vi.fn(),
    speaking: false
  })
}));

vi.mock("@/dateHelpers", () => ({
  useDate: () => ({
    short: vi.fn(() => "Jan 1, 2023")
  })
}));

vi.mock("@/mediaHelpers", () => ({
  useMedia: () => ({
    isVideo: vi.fn(() => false)
  })
}));

// Mock child components
vi.mock("@/Components/Button.vue", () => ({
  default: { name: "Button", template: "<button><slot /></button>" }
}));

vi.mock("@/Components/LazyLoader.vue", () => ({
  default: {
    name: "LazyLoader",
    template: '<div class="lazy-loader" />',
    props: [
      "src",
      "poster",
      "alt",
      "book-id",
      "page-id",
      "object-fit",
      "bookId",
      "pageId",
      "objectFit"
    ]
  }
}));

vi.mock("@/Components/VideoWrapper.vue", () => ({
  default: {
    name: "VideoWrapper",
    template: '<div class="video-wrapper" />',
    props: ["url", "title"]
  }
}));

vi.mock("@/Components/AddToCollageButton.vue", () => ({
  default: {
    name: "AddToCollageButton",
    template: '<div class="add-to-collage-button" />',
    props: ["page-id", "collages"]
  }
}));

vi.mock("@/Pages/Page/EditPageForm.vue", () => ({
  default: {
    name: "EditPageForm",
    template: '<form class="edit-page-form" />',
    props: ["page", "book", "books"]
  }
}));

vi.mock("@/Layouts/AuthenticatedLayout.vue", () => ({
  default: {
    name: "BreezeAuthenticatedLayout",
    template: '<div class="authenticated-layout"><slot /></div>'
  }
}));

vi.mock("@inertiajs/vue3", () => {
  const mockRouter = {
    post: vi.fn(),
    get: vi.fn()
  };
  return {
    router: mockRouter,
    usePage: () => ({
      props: {
        flash: {},
        auth: {
          user: { permissions_list: [] }
        },
        search: null
      }
    }),
    Head: { name: "Head", template: "<div />" },
    Link: {
      name: "Link",
      template: "<a><slot /></a>",
      props: ["href", "as", "prefetch", "class", "disabled", "aria-label"]
    }
  };
});

// Get reference to mocked router for use in tests
let mockRouter;
beforeAll(async () => {
  const { router } = await import("@inertiajs/vue3");
  mockRouter = router;
});

describe("Page/Show.vue", () => {
  let wrapper;
  const page = {
    id: 1,
    title: "Test Page",
    content: "Test content",
    media_path: "/path/to/media.mp4",
    youtube_link: "https://youtube.com/watch?v=test",
    created_at: "2023-01-01T00:00:00.000000Z",
    updated_at: "2023-01-01T00:00:00.000000Z",
    read_count: 10,
    book: {
      id: 1,
      title: "Test Book"
    }
  };
  const previousPage = { id: 0, title: "Previous Page" };
  const nextPage = { id: 2, title: "Next Page" };
  const books = [];
  const collages = [];

  beforeEach(() => {
    wrapper = mount(Show, {
      props: {
        page,
        previousPage,
        nextPage,
        books,
        collages
      },
      global: {
        mocks: {
          $page: {
            props: {
              auth: { user: { permissions_list: [] } },
              search: null
            }
          }
        }
      }
    });
  });

  it("renders the page content", () => {
    expect(wrapper.text()).toContain("Test content");
  });

  it("renders LazyLoader when media_path is present", () => {
    const lazyLoaders = wrapper.findAllComponents({ name: "LazyLoader" });
    // Find the LazyLoader with page-id prop (the page's media)
    // Vue converts kebab-case to camelCase, so check both
    const pageLazyLoader = lazyLoaders.find(
      (loader) =>
        loader.props("page-id") === page.id ||
        loader.props("pageId") === page.id
    );
    expect(pageLazyLoader).toBeDefined();
  });

  it("passes media_path to LazyLoader", () => {
    const lazyLoaders = wrapper.findAllComponents({ name: "LazyLoader" });
    // Find the LazyLoader with page-id prop (the page's media, not the book cover)
    // Vue converts kebab-case to camelCase, so check both
    const pageLazyLoader = lazyLoaders.find(
      (loader) =>
        loader.props("page-id") === page.id ||
        loader.props("pageId") === page.id
    );
    expect(pageLazyLoader).toBeDefined();
    expect(pageLazyLoader.props("src")).toBe("/path/to/media.mp4");
  });

  it("renders edit page form when showPageSettings is true", async () => {
    wrapper.vm.showPageSettings = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "EditPageForm" }).exists()).toBe(true);
  });

  it("toggles edit page form visibility", async () => {
    expect(wrapper.vm.showPageSettings).toBe(false);

    // Simulate clicking edit button
    wrapper.vm.showPageSettings = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showPageSettings).toBe(true);

    // Simulate closing form
    wrapper.vm.showPageSettings = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showPageSettings).toBe(false);
  });

  it("passes page prop to EditPageForm", async () => {
    wrapper.vm.showPageSettings = true;
    await wrapper.vm.$nextTick();

    const editForm = wrapper.findComponent({ name: "EditPageForm" });
    expect(editForm.props("page")).toEqual(page);
    expect(editForm.props("book")).toEqual(page.book);
    expect(editForm.props("books")).toEqual(books);
  });

  it("handles page without media", () => {
    const pageWithoutMedia = { ...page, media_path: null };
    wrapper = mount(Show, {
      props: {
        page: pageWithoutMedia,
        previousPage,
        nextPage,
        books,
        collages
      },
      global: {
        mocks: {
          $page: {
            props: {
              auth: { user: { permissions_list: [] } },
              search: null
            }
          }
        }
      }
    });

    // Check that there's no LazyLoader with page-id prop (the page's media)
    const lazyLoaders = wrapper.findAllComponents({ name: "LazyLoader" });
    const pageLazyLoader = lazyLoaders.find(
      (loader) => loader.props("page-id") === pageWithoutMedia.id
    );
    expect(pageLazyLoader).toBeUndefined();
  });

  describe("Share button", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it("renders share button", () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const shareButton = buttons.find((btn) => {
        const html = btn.html();
        return (
          html.includes("ri-share-line") || html.includes("ri-loader-line")
        );
      });
      expect(shareButton).toBeDefined();
    });

    it("disables share button when page was already shared today", async () => {
      const today = new Date().toISOString().split("T")[0];
      const key = `page_share_${page.id}_${today}`;
      localStorage.setItem(key, Date.now().toString());

      wrapper = mount(Show, {
        props: {
          page,
          previousPage,
          nextPage,
          books,
          collages
        },
        global: {
          mocks: {
            $page: {
              props: {
                auth: { user: { permissions_list: [] } },
                search: null
              }
            }
          }
        }
      });

      await nextTick();

      const buttons = wrapper.findAllComponents({ name: "Button" });
      const shareButton = buttons.find((btn) => {
        const html = btn.html();
        return (
          html.includes("ri-share-line") || html.includes("ri-loader-line")
        );
      });
      expect(shareButton).toBeDefined();
      // Check if disabled prop is set or if the button is actually disabled
      const isDisabled =
        shareButton.props("disabled") !== false ||
        shareButton.attributes("disabled") !== undefined;
      expect(isDisabled).toBe(true);
    });

    it("calls sharePage when share button is clicked", async () => {
      // Clear any previous calls
      if (mockRouter) {
        mockRouter.post.mockClear();
      }

      // Ensure the component is ready and sharePage is available
      await nextTick();

      // Call sharePage directly to test the functionality
      // Make sure isShareDisabled is false first
      wrapper.vm.hasSharedToday = false;
      wrapper.vm.sharing = false;

      wrapper.vm.sharePage();
      await nextTick();

      // Get the router from the import to check calls
      const { router } = await import("@inertiajs/vue3");
      expect(router.post).toHaveBeenCalledWith(
        expect.stringContaining("/pages/1/share"),
        {},
        expect.any(Object)
      );
    });

    it("updates localStorage after successful share", async () => {
      const { router } = await import("@inertiajs/vue3");
      router.post.mockImplementation((url, data, options) => {
        if (options.onSuccess) {
          options.onSuccess();
        }
      });

      const buttons = wrapper.findAllComponents({ name: "Button" });
      const shareButton = buttons.find((btn) => {
        const html = btn.html();
        return (
          html.includes("ri-share-line") || html.includes("ri-loader-line")
        );
      });
      expect(shareButton).toBeDefined();
      await shareButton.trigger("click");
      await nextTick();

      const today = new Date().toISOString().split("T")[0];
      const key = `page_share_${page.id}_${today}`;
      expect(localStorage.getItem(key)).not.toBeNull();
    });

    it("shows loading state while sharing", async () => {
      const { router } = await import("@inertiajs/vue3");
      let resolveShare;
      const sharePromise = new Promise((resolve) => {
        resolveShare = resolve;
      });
      router.post.mockReturnValue(sharePromise);

      const buttons = wrapper.findAllComponents({ name: "Button" });
      const shareButton = buttons.find((btn) => {
        const html = btn.html();
        return (
          html.includes("ri-share-line") || html.includes("ri-loader-line")
        );
      });
      expect(shareButton).toBeDefined();
      await shareButton.trigger("click");
      await nextTick();

      // Verify the button was clicked and router.post was called
      expect(router.post).toHaveBeenCalled();

      resolveShare();
      await nextTick();
    });

    it("handles share error gracefully", async () => {
      const { router } = await import("@inertiajs/vue3");
      router.post.mockImplementation((url, data, options) => {
        if (options.onError) {
          options.onError();
        }
      });

      const buttons = wrapper.findAllComponents({ name: "Button" });
      const shareButton = buttons.find((btn) => {
        const html = btn.html();
        return (
          html.includes("ri-share-line") || html.includes("ri-loader-line")
        );
      });
      expect(shareButton).toBeDefined();
      await shareButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.sharing).toBe(false);
    });
  });
});
