import Index from "@/Pages/Books/Index.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { router } from "@inertiajs/vue3";

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
            reload: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        },
    };
});

// Mock composables
const mockCanEditPages = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        get canEditPages() {
            return mockCanEditPages();
        },
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: vi.fn(),
        speaking: false,
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, replacements = {}) => {
            const translations = {
                "search.not_found_books": "I can't find any books like that",
            };
            let translation = translations[key] || key;
            Object.keys(replacements).forEach((placeholder) => {
                translation = translation.replace(
                    new RegExp(`:${placeholder}`, "g"),
                    replacements[placeholder]
                );
            });
            return translation;
        },
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
vi.mock("@/Pages/Books/NewBookForm.vue", () => ({
    // Loaded with defineAsyncComponent, which unwraps `default` only from
    // something that looks like an ES module.
    __esModule: true,
    default: {
        name: "NewBookForm",
        template: '<form class="new-book-form-stub" />',
        props: ["authors", "categories"],
    },
}));
vi.mock("@/Components/FormModal.vue", () => ({
    default: {
        name: "FormModal",
        template: '<div v-if="show"><slot /></div>',
        props: ["show", "title", "submitRef"],
    },
}));
vi.mock("@/Pages/Books/BooksGrid.vue", () => ({
    default: {
        name: "BooksGrid",
        template: '<div class="books-grid" />',
        props: ["category", "label"],
    },
}));

describe("Books/Index.vue", () => {
    let wrapper;
    const categories = [
        { name: "Fiction", books: [{ id: 1, title: "Book 1" }] },
        { name: "Nonfiction", books: [] },
    ];

    beforeEach(() => {
        // Reset mockPageData before each test
        mockPageData.props.search = null;
        mockPageData.props.theme = "";

        wrapper = mount(Index, {
            props: {
                categories,
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
                searchCategories: null,
            },
        });
        expect(wrapper.text()).toContain("I can't find any books like that");
        expect(wrapper.findComponent({ name: "ManEmptyCircle" }).exists()).toBe(
            true
        );
    });

    it("shows correct title when search is present", async () => {
        mockPageData.props.search = "foo";

        wrapper = mount(Index, {
            props: { categories, searchCategories: null },
        });

        expect(wrapper.text()).toContain("Books");
    });

    it("renders themed books section when theme is active", async () => {
        mockPageData.props.theme = "halloween";

        wrapper = mount(Index, {
            props: {
                categories,
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

    describe("new book", () => {
        const newBookButton = (w) =>
            w
                .findAll("button")
                .find((button) => button.text() === "book.new_book_title");

        it("hides the New Book button from people who cannot edit pages", () => {
            expect(newBookButton(wrapper)).toBeUndefined();
        });

        it("opens the new-book form and closes it when the form emits close-form", async () => {
            mockCanEditPages.mockReturnValue(true);
            wrapper = mount(Index, {
                props: {
                    categories,
                    searchCategories: null,
                    authors: [{ id: 1, name: "Ada" }],
                },
            });
            mockCanEditPages.mockReturnValue(false);

            const form = () => wrapper.findComponent({ name: "NewBookForm" });
            expect(form().exists()).toBe(false);

            await newBookButton(wrapper).trigger("click");
            await flushPromises();
            expect(router.reload).not.toHaveBeenCalled();
            expect(form().props("authors")).toEqual([{ id: 1, name: "Ada" }]);
            expect(form().props("categories")).toEqual(categories);

            await form().vm.$emit("close-form");
            expect(form().exists()).toBe(false);
        });

        it("asks for the authors only when the form first opens", async () => {
            router.reload.mockClear();
            mockCanEditPages.mockReturnValue(true);
            wrapper = mount(Index, {
                props: { categories, searchCategories: null },
            });
            mockCanEditPages.mockReturnValue(false);

            expect(router.reload).not.toHaveBeenCalled();
            await newBookButton(wrapper).trigger("click");
            expect(router.reload).toHaveBeenCalledWith(
                expect.objectContaining({ only: ["authors"] })
            );

            // Reopening while that request is in flight doesn't send another.
            await wrapper
                .findComponent({ name: "FormModal" })
                .vm.$emit("close");
            await newBookButton(wrapper).trigger("click");
            expect(router.reload).toHaveBeenCalledTimes(1);
        });
    });
});
