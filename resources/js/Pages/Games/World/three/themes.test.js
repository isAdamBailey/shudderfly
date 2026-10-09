import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NIGHTS, WORLD_THEMES, worldNight, worldTheme } from "./themes.js";

// What RoadScene.js showNight eases between day and night.
const NIGHT_FIELDS = [
    "skyTop",
    "skyBottom",
    "ridgeTint",
    "lit",
    "litIntensity",
    "key",
    "ambient",
];

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
        for (const theme of Object.keys(NIGHTS).filter(Boolean)) {
            expect(themes).toContain(theme);
        }
    });
});

describe("worldNight", () => {
    const dim = (look) => look.key.intensity + look.ambient.intensity;

    it("lights the windows under a darker sky in every season", () => {
        for (const theme of ["", "christmas", "halloween", "fireworks"]) {
            const night = worldNight(theme);
            expect(night.lit, theme).not.toBeNull();
            expect(dim(night), theme).toBeLessThanOrEqual(
                dim(worldTheme(theme))
            );
        }
        expect(dim(worldNight(""))).toBeLessThan(dim(worldTheme("")));
    });

    it("keeps the season: snow stays on the ground at Christmas", () => {
        expect(worldNight("christmas").grass).toBe(
            worldTheme("christmas").grass
        );
        expect(worldNight("christmas").drifter).toBe("❄️");
        expect(worldNight("fireworks")).toEqual(worldTheme("fireworks"));
        expect(worldNight("constructor")).toEqual(worldNight(""));
    });

    it("only changes what the road can ease without rebuilding", () => {
        for (const night of Object.values(NIGHTS)) {
            for (const field of Object.keys(night)) {
                expect(NIGHT_FIELDS).toContain(field);
            }
        }
    });
});
