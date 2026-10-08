import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOUND_NAMES } from "./sounds.js";

describe("world sounds", () => {
    it("matches the names the server's toys may use", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const names = php
            .match(/const SOUNDS = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((name) => name.slice(1, -1));

        expect(names.sort()).toEqual([...SOUND_NAMES].sort());
    });
});
