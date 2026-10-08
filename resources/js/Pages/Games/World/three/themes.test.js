import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WORLD_THEMES, worldTheme } from "./themes.js";

describe("worldTheme", () => {
    it("is the default look for no theme or an unknown one", () => {
        expect(worldTheme("")).toEqual(worldTheme(null));
        expect(worldTheme("constructor")).toEqual(worldTheme(""));
        expect(worldTheme("").drifter).toBe("☁️");
    });

    it("has every seasonal theme the server can send", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Http/Middleware/HandleInertiaRequests.php`,
            "utf8"
        );
        const themes = php
            .match(/const THEMES = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((name) => name.slice(1, -1));

        expect(Object.keys(WORLD_THEMES).sort()).toEqual(themes.sort());
        expect(worldTheme("christmas").drifter).toBe("❄️");
        expect(worldTheme("fireworks").skyTop).toBe("#0b1230");
        expect(worldTheme("halloween").hill).toBe("#3a1854");
    });
});
