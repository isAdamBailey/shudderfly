import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Mock Inertia.js
vi.mock("@inertiajs/vue3", () => ({
    Head: {
        name: "Head",
        template: "<div></div>",
    },
    Link: {
        name: "Link",
        template: "<a><slot /></a>",
        props: ["href"],
    },
    Deferred: {
        name: "Deferred",
        template: "<div><slot /></div>",
    },
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
    usePage: vi.fn(() => ({
        props: {
            auth: {
                user: null,
            },
            search: null,
        },
    })),
    router: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

// Common component mocks (used in multiple test files)
vi.mock("@/Components/Button.vue", () => ({
    default: { name: "Button", template: "<button><slot /></button>" },
}));

vi.mock("@/Components/SearchInput.vue", () => ({
    default: {
        name: "SearchInput",
        template: "<div class='search-input' />",
        props: ["label", "initialTarget"],
    },
}));

vi.mock("@/Layouts/AuthenticatedLayout.vue", () => ({
    default: {
        name: "AuthenticatedLayout",
        template:
            "<div class='authenticated-layout'><header><slot name='header' /></header><main><slot /></main></div>",
    },
}));

// Enhanced route mocking for Laravel routes
export const ROUTE_MAPPINGS = {
    "music.index": "/music",
    "music.sync": "/music/sync",
    "music.increment-read-count": (params) =>
        `/music/${params}/increment-read-count`,
    "pictures.index": "/pictures",
    "books.index": "/books",
    "books.show": (params) => `/books/${params.book}`,
    "categories.show": (params) => `/categories/${params.categoryName}`,
};

export const createRouteMock = () =>
    vi.fn((name, params) => {
        if (typeof ROUTE_MAPPINGS[name] === "function") {
            return ROUTE_MAPPINGS[name](params);
        }

        return ROUTE_MAPPINGS[name] || name;
    });

global.route = createRouteMock();

// Mock window.route for global access
window.route = global.route;

// Provide $page and route as global mocks for all tests
config.global.mocks = {
    $page: {
        props: {
            auth: {
                user: { permissions_list: [] },
            },
            search: null,
            theme: "",
        },
    },
    route: global.route,
};

// Mock window.speechSynthesis with getVoices function
Object.defineProperty(window, "speechSynthesis", {
    value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn(() => [{ name: "Test Voice", lang: "en-US" }]),
    },
    writable: true,
});

// Mock SpeechSynthesisUtterance globally
global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
    text: "",
    voice: null,
    volume: 1,
    rate: 1,
    pitch: 1,
}));

// Ensure window object exists and has speechSynthesis
if (typeof window !== "undefined") {
    window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;

    // Enhanced speechSynthesis mock to prevent async issues
    window.speechSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn(() => [{ name: "Test Voice", lang: "en-US" }]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
