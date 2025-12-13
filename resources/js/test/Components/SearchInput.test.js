import { router } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

let SearchInput;

beforeEach(async () => {
  vi.resetModules();
  // Ensure we use the real component instead of the setup mock
  vi.doUnmock("@/Components/SearchInput.vue");
  SearchInput = (await import("@/Components/SearchInput.vue")).default;
  // Provide a global route helper if not present
  // eslint-disable-next-line no-undef
  if (typeof route === "undefined") {
    // eslint-disable-next-line no-undef
    globalThis.route = (name) => name;
  }
  router.get.mockClear();
});

describe("Components/SearchInput.vue", () => {
  beforeEach(() => {
    router.get.mockClear();
  });

  it("renders input and toggle", async () => {
    const wrapper = mount(SearchInput, {
      global: {
        // Use the mocked module
        stubs: {}
      }
    });
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.length).toBe(2);
    expect(radios[0].text()).toContain("Books");
    expect(radios[1].text()).toContain("ALL");
  });

  it("defaults target to books when URL is root and updates placeholder", async () => {
    // Mock window.location.pathname to be "/" (root)
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true
    });

    const wrapper = mount(SearchInput);
    // Books should be selected by default when URL is "/"
    const books = wrapper.findAll('[role="radio"]')[0];
    expect(books.attributes("aria-checked")).toBe("true");
    expect(wrapper.find('input[type="search"]').attributes("placeholder")).toBe(
      "Search Books!"
    );
    // Switch to Uploads
    await wrapper.findAll('[role="radio"]')[1].trigger("click");
    expect(
      wrapper.findAll('[role="radio"]')[1].attributes("aria-checked")
    ).toBe("true");
    expect(wrapper.find('input[type="search"]').attributes("placeholder")).toBe(
      "Search ALL!"
    );
  });

  it("does not navigate when toggling target", async () => {
    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[0].trigger("click"); // Books
    expect(router.get).not.toHaveBeenCalled();
  });

  it("navigates to pictures.index on Enter when target is uploads", async () => {
    // Mock window.location.pathname to be something other than "/" so uploads is default
    Object.defineProperty(window, "location", {
      value: { pathname: "/pictures" },
      writable: true
    });

    const wrapper = mount(SearchInput);
    // Ensure uploads is selected (should be default when pathname is not "/" or "/books")
    const uploads = wrapper.findAll('[role="radio"]')[1];
    if (uploads.attributes("aria-checked") !== "true") {
      await uploads.trigger("click");
    }
    const input = wrapper.find('input[type="search"]');
    await input.setValue("cats");
    await input.trigger("keyup.enter");
    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toBe("/pictures");
    expect(router.get.mock.calls[0][1]).toMatchObject({ search: "cats" });
  });

  it("navigates to books.index on Enter when target is books", async () => {
    const wrapper = mount(SearchInput);
    // Switch to Books
    await wrapper.findAll('[role="radio"]')[0].trigger("click");
    const input = wrapper.find('input[type="search"]');
    await input.setValue("dogs");
    await input.trigger("keyup.enter");
    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toBe("/books");
    expect(router.get.mock.calls[0][1]).toMatchObject({ search: "dogs" });
  });
});
