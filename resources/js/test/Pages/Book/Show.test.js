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

  it("opens pages tab when book has no pages", async () => {
    const wrapperWithNoPages = mount(Show, {
      props: {
        book,
        pages: { data: [], total: 0 },
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

    expect(wrapperWithNoPages.vm.activeTab).toBe('pages');
  });

  // SearchInput is now in the global layout header, not inside Book/Show

  it("renders edit book form when activeTab is 'book'", async () => {
    wrapper.vm.activeTab = 'book';
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "EditBookForm" }).exists()).toBe(true);
  });

  it("renders new page form when activeTab is 'pages'", async () => {
    wrapper.vm.activeTab = 'pages';
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "NewPageForm" }).exists()).toBe(true);
  });

  it("toggles book settings visibility using setActiveTab", async () => {
    expect(wrapper.vm.activeTab).toBe(null);

    // Simulate clicking edit book button
    wrapper.vm.setActiveTab('book');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.activeTab).toBe('book');

    // Simulate clicking same tab again to close
    wrapper.vm.setActiveTab('book');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.activeTab).toBe(null);
  });

  it("toggles page settings visibility using setActiveTab", async () => {
    expect(wrapper.vm.activeTab).toBe(null);

    // Simulate clicking add page button
    wrapper.vm.setActiveTab('pages');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.activeTab).toBe('pages');

    // Simulate clicking same tab again to close
    wrapper.vm.setActiveTab('pages');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.activeTab).toBe(null);
  });

  // Bulk Actions Tests
  describe("bulk actions functionality", () => {
    it("renders bulk actions tab when user can edit pages", () => {
      const tabButtons = wrapper.findAll('button');
      const bulkActionTab = tabButtons.find((button) =>
        button.text().includes("Bulk Actions")
      );
      expect(bulkActionTab.exists()).toBe(true);
    });

    it("toggles bulk actions mode using setActiveTab", async () => {
      expect(wrapper.vm.activeTab).toBe(null);

      wrapper.vm.setActiveTab('bulk');
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.activeTab).toBe('bulk');
    });

    it("renders bulk actions form when activeTab is 'bulk'", async () => {
      wrapper.vm.activeTab = 'bulk';
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: "BulkActionsForm" }).exists()).toBe(
        true
      );
    });

    it("switches between tabs correctly", async () => {
      // Start with pages tab
      wrapper.vm.setActiveTab('pages');
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.activeTab).toBe('pages');

      // Switch to bulk actions
      wrapper.vm.setActiveTab('bulk');
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.activeTab).toBe('bulk');
    });

    it("clears selected pages when switching away from bulk actions", async () => {
      wrapper.vm.selectedPages = [1, 2, 3];
      wrapper.vm.activeTab = 'bulk';

      // Switch to pages tab
      wrapper.vm.setActiveTab('pages');
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.activeTab).toBe('pages');
      expect(wrapper.vm.selectedPages).toEqual([]);
    });

    it("closes all tabs using closeAllTabs", async () => {
      wrapper.vm.activeTab = 'bulk';
      wrapper.vm.selectedPages = [1, 2, 3];

      wrapper.vm.closeAllTabs();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.activeTab).toBe(null);
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
      wrapper.vm.activeTab = 'bulk';
      await wrapper.vm.$nextTick();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("makes page containers clickable in bulk actions mode", async () => {
      wrapper.vm.activeTab = 'bulk';
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
