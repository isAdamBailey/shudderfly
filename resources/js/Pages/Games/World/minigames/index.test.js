import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MINIGAME_NAMES, minigameComponent } from "./index.js";

describe("minigames", () => {
    it("matches the names the server's minigames may use", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const names = php
            .match(/const MINIGAMES = \[([^\]]*)\]/)[1]
            .match(/'([a-z-]+)'/g)
            .map((name) => name.slice(1, -1));

        expect(names.sort()).toEqual([...MINIGAME_NAMES].sort());
    });

    it("has a component for each, and none for a name it doesn't know", () => {
        for (const name of MINIGAME_NAMES) {
            expect(minigameComponent(name)).toBeTruthy();
        }
        expect(minigameComponent("nope")).toBeNull();
        expect(minigameComponent("constructor")).toBeNull();
    });
});
