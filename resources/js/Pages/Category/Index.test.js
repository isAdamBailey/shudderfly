import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import CategoryIndex from "@/Pages/Category/Index.vue";

// Mock the useInfiniteScroll composable
vi.mock("@/composables/useInfiniteScroll", () => ({
    useInfiniteScroll: vi.fn(),
}));

import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { usePage } from "@inertiajs/vue3";
import { createRouteMock } from "../../vitest.setup.js";

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

        // Mock usePage with default theme
        usePage.mockReturnValue({
            props: {
                auth: { user: { permissions_list: [] } },
                theme: "",
            },
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
                            theme: "",
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

    it("displays themed category title with Halloween theme", async () => {
        usePage.mockReturnValue({
            props: {
                auth: { user: { permissions_list: [] } },
                theme: "halloween",
            },
        });

        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "halloween",
                        },
                    },
                },
            },
        });

        expect(themedWrapper.text()).toContain("Halloween Books");
    });

    it("displays themed category title with Christmas theme", async () => {
        usePage.mockReturnValue({
            props: {
                auth: { user: { permissions_list: [] } },
                theme: "christmas",
            },
        });

        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "christmas",
                        },
                    },
                },
            },
        });

        expect(themedWrapper.text()).toContain("Christmas Books");
    });

    it("displays themed category title with fireworks theme", async () => {
        usePage.mockReturnValue({
            props: {
                auth: { user: { permissions_list: [] } },
                theme: "fireworks",
            },
        });

        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "fireworks",
                        },
                    },
                },
            },
        });

        expect(themedWrapper.text()).toContain("4th of July Books");
    });

    it("displays fallback title for themed category when no theme is active", async () => {
        usePage.mockReturnValue({
            props: {
                auth: { user: { permissions_list: [] } },
                theme: "",
            },
        });

        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "",
                        },
                    },
                },
            },
        });

        expect(themedWrapper.text()).toContain("Themed Books");
    });

    it("renders ApplicationLogo for themed category", async () => {
        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "halloween",
                        },
                    },
                },
            },
        });

        const logo = themedWrapper.findComponent({ name: "ApplicationLogo" });
        expect(logo.exists()).toBe(true);
        expect(logo.classes()).toContain("w-12");
        expect(logo.classes()).toContain("h-12");
    });

    it("does not render ApplicationLogo for non-themed categories", async () => {
        const regularWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "fiction",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "halloween",
                        },
                    },
                },
            },
        });

        const logo = regularWrapper.findComponent({ name: "ApplicationLogo" });
        expect(logo.exists()).toBe(false);
    });

    it("does not render ApplicationLogo for popular category", async () => {
        const popularWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "popular",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "",
                        },
                    },
                },
            },
        });

        const logo = popularWrapper.findComponent({ name: "ApplicationLogo" });
        expect(logo.exists()).toBe(false);
    });

    it("renders themed category with proper flex layout including logo", async () => {
        const themedWrapper = mount(CategoryIndex, {
            props: {
                categoryName: "themed",
                books: mockBooks,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            theme: "christmas",
                        },
                    },
                },
            },
        });

        const flexContainer = themedWrapper.find(".flex.items-center.gap-3");
        expect(flexContainer.exists()).toBe(true);
        expect(
            flexContainer.findComponent({ name: "ApplicationLogo" }).exists()
        ).toBe(true);
        expect(flexContainer.find("h2").exists()).toBe(true);
    });
});
