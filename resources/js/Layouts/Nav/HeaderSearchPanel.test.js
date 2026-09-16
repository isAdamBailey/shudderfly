import { useHeaderSearch } from "@/composables/useHeaderSearch";
import HeaderSearchButton from "@/Layouts/Nav/HeaderSearchButton.vue";
import HeaderSearchPanel from "@/Layouts/Nav/HeaderSearchPanel.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({ t: (key) => key }),
}));

const mountHeader = () =>
    mount(
        {
            components: { HeaderSearchButton, HeaderSearchPanel },
            template: "<div><HeaderSearchButton /><HeaderSearchPanel /></div>",
        },
        { attachTo: document.body }
    );

describe("Header search", () => {
    let wrapper;

    afterEach(() => {
        useHeaderSearch().close({ restoreFocus: false });
        wrapper?.unmount();
    });

    it("opens the panel from the header button and closes it again", async () => {
        wrapper = mountHeader();
        const trigger = wrapper.find(
            'button[aria-controls="header-search-panel"]'
        );
        expect(trigger.attributes("aria-expanded")).toBe("false");
        expect(wrapper.find("#header-search-panel").exists()).toBe(false);

        await trigger.trigger("click");
        expect(trigger.attributes("aria-expanded")).toBe("true");
        expect(wrapper.find("#header-search-panel").exists()).toBe(true);

        await trigger.trigger("click");
        expect(wrapper.find("#header-search-panel").exists()).toBe(false);
    });

    it("opens on '/' but not while typing in a field", async () => {
        wrapper = mountHeader();
        const input = document.createElement("input");
        document.body.appendChild(input);

        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "/", bubbles: true })
        );
        await nextTick();
        expect(useHeaderSearch().isOpen.value).toBe(false);

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
        await nextTick();
        expect(useHeaderSearch().isOpen.value).toBe(true);

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await nextTick();
        expect(useHeaderSearch().isOpen.value).toBe(false);
        input.remove();
    });
});

describe("siteSearchQuery", () => {
    it("only reads the search prop on the books and photos indexes", async () => {
        const { siteSearchQuery } = await import(
            "@/composables/useHeaderSearch"
        );
        const props = { search: " dogs " };
        expect(siteSearchQuery({ url: "/photos?search=dogs", props })).toBe(
            "dogs"
        );
        expect(siteSearchQuery({ url: "/books", props })).toBe("dogs");
        expect(siteSearchQuery({ url: "/music?search=dogs", props })).toBe("");
    });
});
