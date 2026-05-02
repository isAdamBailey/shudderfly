import { router } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/composables/useTranslations", () => ({
  useTranslations: () => ({
    t: (key, replacements = {}) => {
      const translations = {
        "search.placeholder": replacements.target
          ? `Search ${replacements.target}!`
          : "Search!",
        "search.books": "Books",
        "search.photos": "Photos"
      };
      return translations[key] || key;
    },
    translations: {
      value: {}
    }
  })
}));

let SearchInput;

beforeEach(async () => {
  vi.resetModules();
  vi.doUnmock("@/Components/SearchInput.vue");
  SearchInput = (await import("@/Components/SearchInput.vue")).default;
  if (typeof route === "undefined") {
    globalThis.route = (name) => name;
  }
  router.get.mockClear();
});

describe("Components/SearchInput.vue", () => {
  beforeEach(() => {
    router.get.mockClear();
  });

  it("shows target toggle and keeps input hidden initially", async () => {
    const wrapper = mount(SearchInput);
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.length).toBe(2);
    expect(radios[0].text()).toContain("Search Books");
    expect(radios[1].text()).toContain("Search Photos");
    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
  });

  it("expands search input after selecting a target", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true
    });

    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[0].trigger("click");

    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.findAll('[role="radio"]')[0].text()).toContain("Books");
    expect(wrapper.findAll('[role="radio"]')[1].text()).toContain("Photos");
    expect(wrapper.find('input[type="search"]').attributes("placeholder")).toBe(
      "Search Books!"
    );

    await wrapper.findAll('[role="radio"]')[1].trigger("click");
    expect(wrapper.find('input[type="search"]').attributes("placeholder")).toBe(
      "Search Photos!"
    );
  });

  it("does not navigate when selecting target", async () => {
    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[0].trigger("click");
    expect(router.get).not.toHaveBeenCalled();
  });

  it("does not navigate when input is cleared", async () => {
    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[0].trigger("click");
    const input = wrapper.find('input[type="search"]');
    await input.setValue("dogs");
    await input.setValue("");
    expect(router.get).not.toHaveBeenCalled();
  });

  it("navigates to pictures.index on Enter when target is uploads", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/pictures" },
      writable: true
    });

    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[1].trigger("click");

    const input = wrapper.find('input[type="search"]');
    await input.setValue("cats");
    await input.trigger("keyup.enter");

    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toBe("/pictures");
    expect(router.get.mock.calls[0][1]).toMatchObject({ search: "cats" });
  });

  it("navigates to books.index on Enter when target is books", async () => {
    const wrapper = mount(SearchInput);
    await wrapper.findAll('[role="radio"]')[0].trigger("click");

    const input = wrapper.find('input[type="search"]');
    await input.setValue("dogs");
    await input.trigger("keyup.enter");

    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get.mock.calls[0][0]).toBe("/books");
    expect(router.get.mock.calls[0][1]).toMatchObject({ search: "dogs" });
  });
});
