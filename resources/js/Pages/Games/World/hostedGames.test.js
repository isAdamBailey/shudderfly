import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOSTED_GAMES, hostedGame } from "./hostedGames.js";

describe("hosted games", () => {
    it("matches the games the server plays inside the world", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const names = php
            .match(/const HOSTED = \[([^\]]*)\]/)[1]
            .match(/'([a-z-]+)'/g)
            .map((name) => name.slice(1, -1));

        expect(names.sort()).toEqual([...HOSTED_GAMES].sort());
    });

    it("loads a component for each, and none for a game that still has a page", () => {
        for (const name of HOSTED_GAMES) {
            expect(hostedGame(name)).toEqual(expect.any(Function));
        }
        expect(hostedGame("sprout-pox")).toBeNull();
        expect(hostedGame("constructor")).toBeNull();
    });
});
