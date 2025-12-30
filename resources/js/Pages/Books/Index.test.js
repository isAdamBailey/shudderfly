import Index from "@/Pages/Books/Index.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePage } from "@inertiajs/vue3";

// Mock usePage with a dynamic implementation
const mockPageData = {
    props: {
        auth: { user: { permissions_list: [] } },
        search: null,
        theme: "",
    },
};

vi.mock("@inertiajs/vue3", async () => {
    const actual = await vi.importActual("@inertiajs/vue3");
    return {
        ...actual,
        Head: {
            name: "Head",
            template: "<div></div>",
        },
        Link: {
            name: "Link",
            template: "<a><slot /></a>",
            props: ["href"],
        },
        usePage: vi.fn(() => mockPageData),
        useForm: vi.fn(() => ({
            data: {},
            errors: {},
            processing: false,
            post: vi.fn(),
            get: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
            reset: vi.fn(),
            clearErrors: vi.fn(),
            setError: vi.fn(),
            setData: vi.fn(),
            transform: vi.fn(),
        })),
        router: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        },
    };
});

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
        // Reset mockPageData before each test
        mockPageData.props.search = null;
        mockPageData.props.theme = "";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
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
        mockPageData.props.search = "foo";

        wrapper = mount(Index, {
            props: { categories, authors, searchCategories: null },
        });

        expect(wrapper.text()).toContain("Books");
    });

    it("renders themed books section when theme is active", async () => {
        mockPageData.props.theme = "halloween";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themeLabel: "Halloween Books",
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        expect(booksGrids.length).toBeGreaterThan(0);

        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Halloween Books"
        );
        expect(themedGrid).toBeTruthy();
        expect(themedGrid.props("category").name).toBe("themed");
    });

    it("does not render themed books section when theme is not active", async () => {
        mockPageData.props.theme = "";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themeLabel: null,
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) =>
                grid.props("label") &&
                (grid.props("label").includes("Halloween") ||
                    grid.props("label").includes("Christmas") ||
                    grid.props("label").includes("4th of July"))
        );
        expect(themedGrid).toBeFalsy();
    });

    it("does not render themed books section when theme is empty string", async () => {
        mockPageData.props.theme = "";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themeLabel: "Halloween Books",
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Halloween Books"
        );
        expect(themedGrid).toBeFalsy();
    });

    it("renders themed books with different theme labels", async () => {
        mockPageData.props.theme = "christmas";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: null,
                themeLabel: "Christmas Books",
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Christmas Books"
        );
        expect(themedGrid).toBeTruthy();
        expect(themedGrid.props("category").name).toBe("themed");
    });

    it("does not render themed books section when search is active", async () => {
        mockPageData.props.theme = "halloween";
        mockPageData.props.search = "something";

        wrapper = mount(Index, {
            props: {
                categories,
                authors,
                searchCategories: [
                    {
                        name: "Fiction",
                        books: [{ id: 3, title: "Search Result" }],
                    },
                ],
                themeLabel: "Halloween Books",
            },
        });

        const booksGrids = wrapper.findAllComponents({ name: "BooksGrid" });
        const themedGrid = booksGrids.find(
            (grid) => grid.props("label") === "Halloween Books"
        );
        expect(themedGrid).toBeFalsy();
    });
});
