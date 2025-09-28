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
                stubs: {},
            },
        });
        expect(wrapper.find('input[type="search"]').exists()).toBe(true);
        const radios = wrapper.findAll('[role="radio"]');
        expect(radios.length).toBe(3);
        expect(radios[0].text()).toContain("Books");
        expect(radios[1].text()).toContain("Uploads");
        expect(radios[2].text()).toContain("Music");
    });

    it("defaults target to uploads and updates placeholder", async () => {
        const wrapper = mount(SearchInput);
        // Uploads should be selected by default
        const uploads = wrapper.findAll('[role="radio"]')[1];
        expect(uploads.attributes("aria-checked")).toBe("true");
        expect(
            wrapper.find('input[type="search"]').attributes("placeholder")
        ).toBe("Search Uploads!");
        // Switch to Books
        await wrapper.findAll('[role="radio"]')[0].trigger("click");
        expect(
            wrapper.findAll('[role="radio"]')[0].attributes("aria-checked")
        ).toBe("true");
        expect(
            wrapper.find('input[type="search"]').attributes("placeholder")
        ).toBe("Search Books!");
    });

    it("does not navigate when toggling target", async () => {
        const wrapper = mount(SearchInput);
        await wrapper.findAll('[role="radio"]')[0].trigger("click"); // Books
        expect(router.get).not.toHaveBeenCalled();
    });

    it("navigates to pictures.index on Enter when target is uploads", async () => {
        const wrapper = mount(SearchInput);
        const input = wrapper.find('input[type="search"]');
        await input.setValue("cats");
        await input.trigger("keyup.enter");
        expect(router.get).toHaveBeenCalledTimes(1);
        expect(router.get.mock.calls[0][0]).toBe("/pictures.index");
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
        expect(router.get.mock.calls[0][0]).toBe("/books.index");
        expect(router.get.mock.calls[0][1]).toMatchObject({ search: "dogs" });
    });
});
