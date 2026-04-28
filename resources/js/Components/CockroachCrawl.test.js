import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@inertiajs/vue3", () => ({
    usePage: vi.fn(),
}));

import CockroachCrawl from "@/Components/CockroachCrawl.vue";
import { usePage } from "@inertiajs/vue3";

describe("CockroachCrawl", () => {
    beforeEach(() => {
        usePage.mockReturnValue({
            props: {
                settings: {
                    cockroaches_enabled: "0",
                },
            },
        });
    });

    it("does not render when cockroaches are disabled", () => {
        const wrapper = mount(CockroachCrawl);

        expect(wrapper.find(".cockroach-crawl").exists()).toBe(false);
    });

    it("renders header cockroaches when enabled", () => {
        usePage.mockReturnValue({
            props: {
                settings: {
                    cockroaches_enabled: "1",
                },
            },
        });

        const wrapper = mount(CockroachCrawl, {
            props: {
                area: "header",
            },
        });

        expect(wrapper.findAll(".cockroach-track")).toHaveLength(4);
        expect(wrapper.findAll("img[src='/img/cockroach.png']")).toHaveLength(4);
    });

    it("renders more cockroaches in the footer", () => {
        usePage.mockReturnValue({
            props: {
                settings: {
                    cockroaches_enabled: true,
                },
            },
        });

        const wrapper = mount(CockroachCrawl, {
            props: {
                area: "footer",
            },
        });

        expect(wrapper.findAll(".cockroach-track")).toHaveLength(6);
    });
});
