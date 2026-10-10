import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOSTED_GAMES, hostedGame } from "./hostedGames.js";

describe("hosted games", () => {
    it("has every game the server lists", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Http/Controllers/GameController.php`,
            "utf8"
        );
        // The keys of the array GameController::games() returns: each game
        // is `'<slug>' => [`, its fields `'name' => ...` (no bracket).
        const body = php
            .split("public static function games(): array")[1]
            .split(/\n {4}}\n/)[0];
        const names = [...body.matchAll(/'([a-z-]+)' => \[/g)].map(
            ([, name]) => name
        );

        expect(names.sort()).toEqual([...HOSTED_GAMES].sort());
    });

    it("loads a component for each game, and none for anything else", () => {
        for (const name of HOSTED_GAMES) {
            expect(hostedGame(name)).toEqual(expect.any(Function));
        }
        expect(hostedGame("toot-catch")).toBeNull();
        expect(hostedGame("constructor")).toBeNull();
    });
});
