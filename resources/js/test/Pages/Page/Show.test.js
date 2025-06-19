import Show from "@/Pages/Page/Show.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/Components/BookTitle.vue", () => ({
  default: {
    name: "BookTitle",
    template: '<div class="book-title"><slot /></div>',
    props: ["book"]
  }
}));

vi.mock("@/Components/LazyLoader.vue", () => ({
  default: {
    name: "LazyLoader",
    template: '<div class="lazy-loader" />',
    props: ["src", "poster", "alt", "book-id", "page-id", "object-fit"]
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

  it("renders the book title", () => {
    expect(wrapper.findComponent({ name: "BookTitle" }).exists()).toBe(true);
  });

  it("renders the page content", () => {
    expect(wrapper.text()).toContain("Test content");
  });

  it("renders LazyLoader when media_path is present", () => {
    expect(wrapper.findComponent({ name: "LazyLoader" }).exists()).toBe(true);
  });

  it("passes media_path to LazyLoader", () => {
    const lazyLoader = wrapper.findComponent({ name: "LazyLoader" });
    expect(lazyLoader.props("src")).toBe("/path/to/media.mp4");
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

    expect(wrapper.findComponent({ name: "LazyLoader" }).exists()).toBe(false);
  });
});
