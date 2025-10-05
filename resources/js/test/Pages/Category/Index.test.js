import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import CategoryIndex from "@/Pages/Category/Index.vue";

// Mock the useInfiniteScroll composable
vi.mock("@/composables/useInfiniteScroll", () => ({
    useInfiniteScroll: vi.fn(),
}));

import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { createRouteMock } from "../../setup.js";

// Use the shared route mock function from setup.js
global.route = createRouteMock();
window.route = global.route;

describe("Category Index", () => {
    let wrapper;
    const mockBooks = {
        data: [
            {
                id: 1,
                title: "Test Book 1",
                slug: "test-book-1",
                excerpt: "Test excerpt 1",
                cover_image: { media_path: "/images/test1.jpg" },
                loading: false,
            },
            {
                id: 2,
                title: "Test Book 2",
                slug: "test-book-2",
                excerpt: "Test excerpt 2",
                cover_image: { media_path: "/images/test2.jpg" },
                loading: false,
            },
        ],
        current_page: 1,
        last_page: 2,
        next_page_url: "http://localhost/categories/fiction?page=2",
        total: 20,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Create proper reactive mock that matches the real useInfiniteScroll behavior
        const mockItems = ref(
            mockBooks.data.map((book) => ({ ...book, loading: false }))
        );
        const mockInfiniteScrollRef = ref(null);
        const mockSetItemLoading = vi.fn((book) => {
            book.loading = true;
        });

        useInfiniteScroll.mockReturnValue({
            items: mockItems,
            infiniteScrollRef: mockInfiniteScrollRef,
            setItemLoading: mockSetItemLoading,
        });

        wrapper = mount(CategoryIndex, {
            props: {
                categoryName: "fiction",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                        },
                    },
                },
            },
        });
    });

    it("renders the page title with capitalized category name", () => {
        expect(wrapper.text()).toContain("Fiction");
    });

    it("renders the header section with category title", () => {
        const header = wrapper.find("h2");
        expect(header.exists()).toBe(true);
        expect(header.text()).toBe("Fiction");
    });

    it("renders book cover cards for each book", () => {
        // Check for mini-book elements which are rendered by BookCoverCard
        const bookCards = wrapper.findAll(".mini-book");
        expect(bookCards.length).toBe(2);
    });

    it("displays books in a grid layout", () => {
        const grid = wrapper.find(".grid");
        expect(grid.exists()).toBe(true);
        expect(grid.classes()).toContain("grid-cols-2");
        expect(grid.classes()).toContain("sm:grid-cols-3");
        expect(grid.classes()).toContain("md:grid-cols-4");
        expect(grid.classes()).toContain("lg:grid-cols-5");
        expect(grid.classes()).toContain("xl:grid-cols-6");
    });

    it("calls useInfiniteScroll with correct parameters", () => {
        expect(useInfiniteScroll).toHaveBeenCalledWith(
            mockBooks.data,
            expect.any(Object) // computed ref
        );
    });

    it("renders empty state when no books are available", async () => {
        const emptyMockItems = ref([]);
        useInfiniteScroll.mockReturnValue({
            items: emptyMockItems,
            infiniteScrollRef: ref(null),
            setItemLoading: vi.fn(),
        });

        const emptyWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "empty-category",
                books: { data: [], current_page: 1, last_page: 1 },
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                        },
                    },
                },
            },
        });

        // Check that the empty state message is in the page text
        expect(emptyWrapper.text()).toContain(
            "No books found in this category"
        );
        // Verify no book cards are rendered
        const bookCards = emptyWrapper.findAll(".mini-book");
        expect(bookCards.length).toBe(0);
    });

    it("capitalizes category name correctly", async () => {
        const lowerCaseWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "science-fiction",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                        },
                    },
                },
            },
        });

        expect(lowerCaseWrapper.text()).toContain("Science-fiction");
    });

    it("passes paginated books data to useInfiniteScroll", () => {
        expect(useInfiniteScroll).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: 1, title: "Test Book 1" }),
                expect.objectContaining({ id: 2, title: "Test Book 2" }),
            ]),
            expect.any(Object)
        );
    });

    it("renders the authenticated layout", () => {
        expect(wrapper.find(".authenticated-layout").exists()).toBe(true);
    });

    it("renders books with correct structure", () => {
        const books = wrapper.findAll(".mini-book");
        expect(books.length).toBeGreaterThan(0);
    });
});
