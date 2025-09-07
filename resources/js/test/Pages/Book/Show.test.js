import Show from "@/Pages/Book/Show.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

// Mock composables
vi.mock("@/composables/useInfiniteScroll", () => ({
  useInfiniteScroll: () => ({
    items: [
      { id: 1, title: "Page 1", content: "Content 1" },
      { id: 2, title: "Page 2", content: "Content 2" }
    ],
    infiniteScrollRef: ref(null),
    setItemLoading: vi.fn()
  })
}));

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

// Mock child components
vi.mock("@/Components/Button.vue", () => ({
  default: { name: "Button", template: "<button><slot /></button>" }
}));

vi.mock("@/Components/ScrollTop.vue", () => ({
  default: { name: "ScrollTop", template: '<div class="scroll-top" />' }
}));

vi.mock("@/Components/SearchInput.vue", () => ({
  default: {
    name: "SearchInput",
    template: '<div class="search-input" />',
    props: ["routeName", "label"]
  }
}));

vi.mock("@/Components/LazyLoader.vue", () => ({
  default: {
    name: "LazyLoader",
    template: '<div class="lazy-loader" />',
    props: ["src", "object-fit", "fill-container"]
  }
}));

vi.mock("@/Components/VideoWrapper.vue", () => ({
  default: {
    name: "VideoWrapper",
    template: '<div class="video-wrapper" />',
    props: ["url", "controls"]
  }
}));

vi.mock("@/Components/ValidationErrors.vue", () => ({
  default: {
    name: "BreezeValidationErrors",
    template: '<div class="validation-errors" />'
  }
}));

vi.mock("@/Pages/Book/SimilarBooks.vue", () => ({
  default: {
    name: "SimilarBooks",
    template: '<div class="similar-books" />',
    props: ["books", "label"]
  }
}));

vi.mock("@/Pages/Book/DeleteBookForm.vue", () => ({
  default: {
    name: "DeleteBookForm",
    template: '<form class="delete-book-form" />',
    props: ["book"]
  }
}));

vi.mock("@/Pages/Book/EditBookForm.vue", () => ({
  default: {
    name: "EditBookForm",
    template: '<form class="edit-book-form" />',
    props: ["book", "authors", "categories"]
  }
}));

vi.mock("@/Pages/Book/NewPageForm.vue", () => ({
  default: {
    name: "NewPageForm",
    template: '<form class="new-page-form" />',
    props: ["book"]
  }
}));

vi.mock("@/Pages/Book/BulkActionsForm.vue", () => ({
  default: {
    name: "BulkActionsForm",
    template: '<form class="bulk-actions-form" />',
    props: ["book", "books", "selectedPages"],
    emits: ["close-form", "selection-changed"]
  }
}));

vi.mock("@/Pages/Book/DeletePageForm.vue", () => ({
  default: {
    name: "DeletePageForm",
    template: '<form class="delete-page-form" />',
    props: ["page"]
  }
}));

describe("Book/Show.vue", () => {
  let wrapper;
  const book = {
    id: 1,
    title: "Test Book",
    author: "Test Author",
    description: "Test description",
    created_at: "2023-01-01T00:00:00.000000Z",
    updated_at: "2023-01-01T00:00:00.000000Z",
    read_count: 10
  };
  const pages = {
    data: [
      { id: 1, title: "Page 1", content: "Content 1" },
      { id: 2, title: "Page 2", content: "Content 2" }
    ],
    total: 2
  };
  const authors = [{ id: 1, name: "Test Author" }];
  const categories = [{ id: 1, name: "Test Category" }];
  const books = [
    { id: 1, title: "Test Book" },
    { id: 2, title: "Another Book" }
  ];

  beforeEach(() => {
    wrapper = mount(Show, {
      props: {
        book,
        pages,
        authors,
        categories,
        books
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

  it("renders the book cover", () => {
    expect(wrapper.findComponent({ name: "BookCover" }).exists()).toBe(true);
  });

  it("renders the book title within the cover", () => {
    expect(wrapper.text()).toContain("Test Book");
  });

  it("renders the book author", () => {
    expect(wrapper.text()).toContain("Test Author");
  });

  it("renders the book creation date", () => {
    expect(wrapper.text()).toContain("Jan 1, 2023");
  });

  it("renders pages grid", () => {
    expect(wrapper.text()).toContain("Content 1");
    expect(wrapper.text()).toContain("Content 2");
  });

  it("renders ScrollTop component", () => {
    expect(wrapper.findComponent({ name: "ScrollTop" }).exists()).toBe(true);
  });

  // SearchInput is now in the global layout header, not inside Book/Show

  it("renders edit book form when bookSettingsOpen is true", async () => {
    wrapper.vm.bookSettingsOpen = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "EditBookForm" }).exists()).toBe(true);
  });

  it("renders new page form when pageSettingsOpen is true", async () => {
    wrapper.vm.pageSettingsOpen = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "NewPageForm" }).exists()).toBe(true);
  });

  it("toggles book settings visibility", async () => {
    expect(wrapper.vm.bookSettingsOpen).toBe(false);

    // Simulate clicking edit book button
    wrapper.vm.bookSettingsOpen = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.bookSettingsOpen).toBe(true);

    // Simulate closing form
    wrapper.vm.bookSettingsOpen = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.bookSettingsOpen).toBe(false);
  });

  it("toggles page settings visibility", async () => {
    expect(wrapper.vm.pageSettingsOpen).toBe(false);

    // Simulate clicking add page button
    wrapper.vm.pageSettingsOpen = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.pageSettingsOpen).toBe(true);

    // Simulate closing form
    wrapper.vm.pageSettingsOpen = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.pageSettingsOpen).toBe(false);
  });

  // Bulk Actions Tests
  describe("bulk actions functionality", () => {
    it("renders bulk actions button when user can edit pages", () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const bulkActionButton = buttons.find((button) =>
        button.text().includes("Bulk Actions")
      );
      expect(bulkActionButton.exists()).toBe(true);
    });

    it("toggles bulk actions mode", async () => {
      expect(wrapper.vm.bulkActionsOpen).toBe(false);

      wrapper.vm.toggleBulkActions();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.bulkActionsOpen).toBe(true);
    });

    it("renders bulk actions form when bulkActionsOpen is true", async () => {
      wrapper.vm.bulkActionsOpen = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: "BulkActionsForm" }).exists()).toBe(
        true
      );
    });

    it("closes other forms when bulk actions is opened", async () => {
      wrapper.vm.pageSettingsOpen = true;
      wrapper.vm.bookSettingsOpen = true;

      wrapper.vm.toggleBulkActions();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.pageSettingsOpen).toBe(false);
      expect(wrapper.vm.bookSettingsOpen).toBe(false);
      expect(wrapper.vm.bulkActionsOpen).toBe(true);
    });

    it("clears selected pages when bulk actions is closed", async () => {
      wrapper.vm.selectedPages = [1, 2, 3];
      wrapper.vm.bulkActionsOpen = true;

      wrapper.vm.toggleBulkActions();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.bulkActionsOpen).toBe(false);
      expect(wrapper.vm.selectedPages).toEqual([]);
    });

    it("toggles page selection", () => {
      expect(wrapper.vm.selectedPages).toEqual([]);

      wrapper.vm.togglePageSelection(1);
      expect(wrapper.vm.selectedPages).toEqual([1]);

      wrapper.vm.togglePageSelection(2);
      expect(wrapper.vm.selectedPages).toEqual([1, 2]);

      wrapper.vm.togglePageSelection(1);
      expect(wrapper.vm.selectedPages).toEqual([2]);
    });

    it("shows checkboxes when in bulk actions mode", async () => {
      wrapper.vm.bulkActionsOpen = true;
      await wrapper.vm.$nextTick();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("makes page containers clickable in bulk actions mode", async () => {
      wrapper.vm.bulkActionsOpen = true;
      await wrapper.vm.$nextTick();

      const pageContainers = wrapper.findAll(".cursor-pointer");
      expect(pageContainers.length).toBeGreaterThan(0);
    });

    it("handles selection changed event from bulk actions form", () => {
      const newSelection = [1, 2, 3];
      wrapper.vm.handleSelectionChanged(newSelection);

      expect(wrapper.vm.selectedPages).toEqual(newSelection);
    });
  });
});
