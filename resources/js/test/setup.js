import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Mock Inertia.js
vi.mock("@inertiajs/vue3", () => ({
  Head: {
    name: "Head",
    template: "<div></div>"
  },
  Link: {
    name: "Link",
    template: "<a><slot /></a>",
    props: ["href"]
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
    transform: vi.fn()
  })),
  usePage: vi.fn(() => ({
    props: {
      auth: {
        user: null
      },
      search: null
    }
  })),
  router: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

// Common component mocks (used in multiple test files)
vi.mock("@/Components/Button.vue", () => ({
  default: { name: "Button", template: "<button><slot /></button>" }
}));

vi.mock("@/Components/SearchInput.vue", () => ({
  default: {
    name: "SearchInput",
    template: "<div class='search-input' />",
    props: ["routeName", "label", "class"]
  }
}));

vi.mock("@/Layouts/AuthenticatedLayout.vue", () => ({
  default: {
    name: "AuthenticatedLayout",
    template:
      "<div class='authenticated-layout'><header><slot name='header' /></header><main><slot /></main></div>"
  }
}));

// Mock Deferred component (used in Book/Show.vue)
vi.mock("@/Components/Deferred.vue", () => ({
  default: { name: "Deferred", template: "<div><slot /></div>" }
}));

// Provide $page and route as global mocks for all tests
config.global.mocks = {
  $page: {
    props: {
      auth: {
        user: { permissions_list: [] }
      },
      search: null,
      theme: ""
    }
  },
  route: (name) => `/${name}`
};

// Mock window.speechSynthesis with getVoices function
Object.defineProperty(window, "speechSynthesis", {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [{ name: "Test Voice", lang: "en-US" }])
  },
  writable: true
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

if (typeof window !== "undefined") {
  window.SpeechSynthesisUtterance = function () {};
  window.speechSynthesis = {
    speak: () => {},
    getVoices: () => [],
    cancel: () => {}
  };
}
