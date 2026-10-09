import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { useDarkMode } from "./useDarkMode";

const html = document.documentElement;

/** Lets the MutationObserver's callback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => html.classList.remove("dark"));

describe("useDarkMode", () => {
    it("starts from the class on <html>", () => {
        html.classList.add("dark");
        const scope = effectScope();
        const dark = scope.run(useDarkMode);

        expect(dark.value).toBe(true);
        scope.stop();
    });

    it("follows the class on and off", async () => {
        const scope = effectScope();
        const dark = scope.run(useDarkMode);
        expect(dark.value).toBe(false);

        html.classList.add("dark");
        await settle();
        expect(dark.value).toBe(true);

        html.classList.remove("dark");
        await settle();
        expect(dark.value).toBe(false);
        scope.stop();
    });

    it("stops following once its scope is gone", async () => {
        const scope = effectScope();
        const dark = scope.run(useDarkMode);
        scope.stop();

        html.classList.add("dark");
        await settle();
        expect(dark.value).toBe(false);
    });
});
