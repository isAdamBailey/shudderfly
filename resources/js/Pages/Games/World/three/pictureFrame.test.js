import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { frameBorder, PICTURE_FRAMES, pictureFrame } from "./pictureFrame.js";

describe("picture frames", () => {
    it("are the ones GamesWorld::PICTURE_FRAMES names, with its borders", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const borders = Object.fromEntries(
            [
                ...php
                    .match(/const PICTURE_FRAMES = \[([^\]]*)\]/)[1]
                    .matchAll(/'([^']+)' => (\d+)/g),
            ].map(([, name, border]) => [name, Number(border)])
        );
        expect(
            Object.fromEntries(
                Object.keys(PICTURE_FRAMES).map((name) => [
                    name,
                    frameBorder(name),
                ])
            )
        ).toEqual(borders);
    });

    it.each(Object.keys(PICTURE_FRAMES))(
        "%s reaches its border past the picture all round, off the wall",
        (name) => {
            const border = frameBorder(name);
            const box = new THREE.Box3().setFromObject(
                pictureFrame(THREE, name, 120, 160)
            );
            expect(box.min.x).toBeCloseTo(-60 - border);
            expect(box.max.x).toBeCloseTo(60 + border);
            expect(box.min.y).toBeCloseTo(-border);
            expect(box.max.y).toBeCloseTo(160 + border);
            expect(box.min.z).toBeGreaterThanOrEqual(0);
        }
    );

    it("leaves the picture itself clear", () => {
        const frame = pictureFrame(THREE, "ornate", 120, 160);
        const ray = new THREE.Raycaster(
            new THREE.Vector3(0, 80, 50),
            new THREE.Vector3(0, 0, -1)
        );
        expect(ray.intersectObject(frame, true)).toHaveLength(0);
        // Just past the picture's edge is the frame.
        ray.set(new THREE.Vector3(60 + 8, 80, 50), new THREE.Vector3(0, 0, -1));
        expect(ray.intersectObject(frame, true).length).toBeGreaterThan(0);
    });

    it("is nothing for a style there isn't, with no border", () => {
        expect(pictureFrame(THREE, "nope", 100, 100)).toBeNull();
        expect(frameBorder("nope")).toBe(0);
        expect(frameBorder(undefined)).toBe(0);
    });
});
