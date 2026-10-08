import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
    CAST_MOVE_DATA,
    castMovesCss,
} from "@/Components/Games/Cast/castMoveData.js";
import { CAST, CAST_MOVES, castInDom, TOOT_FOODS } from "./characters.js";

const read = (path) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("the cast registry", () => {
    it("has every Toot Food, tooting at its own pitch", () => {
        for (const food of TOOT_FOODS) {
            expect(CAST[food.type]).toMatchObject({
                emoji: food.emoji,
                tootPitch: food.pitch,
            });
        }
    });

    it("only gives characters moves from CAST_MOVES", () => {
        for (const [id, member] of Object.entries(CAST)) {
            for (const move of member.moves) {
                expect(CAST_MOVES, `${id}: ${move}`).toContain(move);
            }
        }
    });

    it("only gives sounds to moves the character has", () => {
        for (const [id, member] of Object.entries(CAST)) {
            for (const move of Object.keys(member.sounds ?? {})) {
                expect(member.moves, id).toContain(move);
            }
        }
    });

    it("only greets with a move the character has", () => {
        for (const [id, member] of Object.entries(CAST)) {
            if (member.greet) expect(member.moves, id).toContain(member.greet);
        }
    });

    it("defines every CAST_MOVE in the shared move data, and nothing else", () => {
        expect(Object.keys(CAST_MOVE_DATA).sort()).toEqual(
            [...CAST_MOVES].sort()
        );
    });

    it("draws every CAST_MOVE in CastMember's stylesheet, and nothing else", () => {
        const drawn = new Set(
            [...castMovesCss().matchAll(/\.cast-move-([a-z-]+)/g)].map(
                (m) => m[1]
            )
        );

        expect([...drawn].sort()).toEqual([...CAST_MOVES].sort());
    });

    // castMesh.test.js holds the WebGL drawer to the same list.

    it("matches the cast ids the server's scenes may use", () => {
        const php = read("app/Support/GamesWorld.php");
        const ids = php
            .match(/const CAST = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((id) => id.slice(1, -1));

        expect(ids.sort()).toEqual(Object.keys(CAST).sort());
    });

    it("matches the moves the server's toys may play", () => {
        const php = read("app/Support/GamesWorld.php");
        const moves = php
            .match(/const MOVES = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((move) => move.slice(1, -1));

        expect(moves).toEqual(CAST_MOVES);
    });

    it("names every character in every language", () => {
        for (const locale of ["en", "es", "fr"]) {
            const messages = read(`lang/${locale}/messages.php`);
            for (const { nameKey } of Object.values(CAST)) {
                expect(messages, `${locale}: ${nameKey}`).toContain(
                    `'${nameKey}' =>`
                );
            }
        }
    });

    it("draws only the emoji-less Face in the DOM, whatever the drawer", () => {
        expect(castInDom("face")).toBe(true);
        expect(castInDom("toilet")).toBe(false);
        expect(castInDom("constructor")).toBe(false);
        expect(castInDom(undefined)).toBe(false);
    });
});
