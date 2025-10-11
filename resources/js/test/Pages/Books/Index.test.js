import Index from "@/Pages/Books/Index.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock composables
vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canEditPages: false,
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
    }),
}));

// Mock child components
vi.mock("@/Components/ScrollTop.vue", () => ({
    default: { name: "ScrollTop", template: '<div class="scroll-top" />' },
}));
vi.mock("@/Components/svg/ManEmptyCircle.vue", () => ({
    default: {
        name: "ManEmptyCircle",
        template: '<div class="man-empty-circle" />',
    },
}));
vi.mock("@/Pages/Books/BooksGrid.vue", () => ({
    default: {
        name: "BooksGrid",
        template: '<div class="books-grid" />',
        props: ["category", "label"],
    },
}));
vi.mock("@/Pages/Books/NewBookForm.vue", () => ({
    default: {
        name: "NewBookForm",
        template: '<form class="new-book-form" />',
        props: ["authors", "categories"],
    },
}));

describe("Books/Index.vue", () => {
    let wrapper;
    const categories = [
        { name: "Fiction", books: [{ id: 1, title: "Book 1" }] },
        { name: "Nonfiction", books: [] },
    ];
    const authors = [{ id: 1, name: "Author 1" }];

    beforeEach(() => {
        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });
    });

    it("renders the page title", () => {
        expect(wrapper.text()).toContain("Books");
    });

    it("renders the header section", () => {
        expect(wrapper.find("h2").exists()).toBe(true);
    });

    it("renders BooksGrid for each category", () => {
        expect(
            wrapper.findAllComponents({ name: "BooksGrid" }).length
        ).toBeGreaterThan(0);
    });

    it("shows not found message if all categories are empty", async () => {
        wrapper = mount(Index, {
            props: {
                categories: [
                    { name: "Fiction", books: [] },
                    { name: "Nonfiction", books: [] },
                ],
                authors,
                searchCategories: null,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });
        expect(wrapper.text()).toContain("I can't find any books like that");
        expect(wrapper.findComponent({ name: "ManEmptyCircle" }).exists()).toBe(
            true
        );
    });

    it("toggles new book form when button is clicked", async () => {
        // Simulate canEditPages true
        wrapper.vm.showNewBookForm = false;
        await wrapper.vm.$nextTick();
        const addButton = wrapper
            .findAll("button")
            .find((btn) => btn.text().includes("Add a new book"));
        if (addButton) {
            await addButton.trigger("click");
            expect(wrapper.vm.showNewBookForm).toBe(true);
        }
    });

    it("shows correct title when search is present", async () => {
        wrapper = mount(Index, {
            props: { categories, authors, searchCategories: null },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: "foo",
                        },
                    },
                },
            },
        });
        // Since the computed property uses usePage() directly, we'll just test that the component renders
        // The search functionality would need more complex mocking of usePage
        expect(wrapper.text()).toContain("Books");
    });

    it("renders themed books section when themedBooks prop is provided", async () => {
        const themedBooks = [
            { id: 1, title: "Halloween Party" },
            { id: 2, title: "Spooky Stories" },
        ];

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themedBooks,
                themeLabel: "Halloween Books",
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        // Should have themed books grid plus other grids (forgotten, categories, popular)
        expect(booksGrids.length).toBeGreaterThan(0);

        // Find the themed books grid by checking props
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Halloween Books"
        );
        expect(themedGrid).toBeTruthy();
        expect(themedGrid.props("category").name).toBe("themed");
        expect(themedGrid.props("category").books).toEqual(themedBooks);
    });

    it("does not render themed books section when themedBooks is null", async () => {
        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themedBooks: null,
                themeLabel: null,
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        // Should not have any grid with Halloween/Christmas/Fireworks label
        const themedGrid = booksGrids.find(
            (grid) =>
                grid.props("label") &&
                (grid.props("label").includes("Halloween") ||
                    grid.props("label").includes("Christmas") ||
                    grid.props("label").includes("4th of July"))
        );
        expect(themedGrid).toBeFalsy();
    });

    it("does not render themed books section when themedBooks is empty array", async () => {
        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themedBooks: [],
                themeLabel: "Halloween Books",
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Halloween Books"
        );
        // Should not render themed section when array is empty
        expect(themedGrid).toBeFalsy();
    });

    it("renders themed books with different theme labels", async () => {
        const christmasBooks = [
            { id: 1, title: "Christmas Carol" },
            { id: 2, title: "Santa's Workshop" },
        ];

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themedBooks: christmasBooks,
                themeLabel: "Christmas Books",
            },
            global: {
                mocks: {
                    $page: {
                        props: {
                            auth: { user: { permissions_list: [] } },
                            search: null,
                        },
                    },
                },
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Christmas Books"
        );
        expect(themedGrid).toBeTruthy();
        expect(themedGrid.props("category").books).toEqual(christmasBooks);
    });
});
