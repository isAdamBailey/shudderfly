import { CAST_MOVES } from "@/constants/characters.js";
import {
    lookMaterial,
    roomDaylight,
    roomLook,
    TRIM,
} from "../three/roomLooks.js";
import { applyCamera, disposeTree } from "../three/useWorldRenderer.js";
import { itemBox, ROOM_SIZES, wallHeightOf } from "./roomLayout.js";

// The `kind: "room"` scene graph (issue #130): a dollhouse room with its
// front wall taken away. Walls and floor come from the room's `walls` looks
// (three/roomLooks.js); the light from its `ambient` level (daylight in
// through the open front, the one light that casts shadows) and its `lights`
// (lamps you can switch). Its doors and toys stand where the data puts them,
// a toy that is a character as its cast puppet, and the Butt walks the
// floor. It only draws: Room3D.vue owns the state (useRoom) and hands it
// over each frame through sync().

const BACKGROUND = "#1c1917";
const SKIRTING = 14; // units tall
const CEILING_EDGE = 10; // units: the trim along the walls' tops
const SHADOW_MAP = 1024;
// The daylight's share of the light, at ambient 1: a sky fill and a key
// that casts the shadows.
const DAYLIGHT = { fill: 2.2, key: 2 };
// Lamps fall off with distance (decay 1): this scales an intensity so a
// lamp has it at about this many units away.
const LAMP_REACH = 250;
const BULB = 12; // units across
const BULB_OFF = "#44403c";

/**
 * Builds a room from its scene data (`room`: { size, walls, ambient, lights,
 * interactables }), with the Butt at `butt` ({ x, z }), in the light of
 * seasonal `theme`. Returns { scene,
 * camera, layout(L), sync(view, dt), animate(id, move), toggleLight(id),
 * dispose() }.
 */
export function createRoomScene(THREE, kit, { room, butt: buttAt, theme }) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 1);
    scene.add(camera);

    const made = new THREE.Group(); // everything here that isn't the kit's
    scene.add(made);

    const { w: width, d: depth } = room.size;
    const look = roomLook(room.walls);

    // --- Light ---------------------------------------------------------------

    const ambient = room.ambient ?? 1;
    const daylight = roomDaylight(theme);
    made.add(
        new THREE.HemisphereLight(
            daylight.sky,
            daylight.ground,
            ambient * DAYLIGHT.fill
        )
    );
    const key = new THREE.DirectionalLight(
        daylight.key,
        ambient * DAYLIGHT.key
    );
    key.castShadow = true;
    key.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.5;
    key.position.set(width * 0.3, width, depth + width);
    key.target.position.set(width / 2, 0, depth / 2);
    made.add(key, key.target);

    // The room's lamps, each with a bulb that glows while it's on. Off is
    // no light rather than a hidden one: the number of lights is part of
    // every lit material's shader, so hiding one would recompile them all.
    const bulbGeometry = new THREE.SphereGeometry(BULB / 2, 12, 8);
    const lamps = (room.lights ?? []).map((data) => {
        const intensity = data.intensity * LAMP_REACH;
        const light = new THREE.PointLight(
            data.color,
            intensity,
            width * 1.5,
            1
        );
        light.position.set(data.x, data.y, data.z);
        // Unlit, so it shows its colour whatever the light.
        const bulb = new THREE.Mesh(
            bulbGeometry,
            new THREE.MeshBasicMaterial({ color: data.color })
        );
        bulb.position.copy(light.position);
        made.add(light, bulb);
        return {
            id: data.id,
            light,
            bulb,
            color: data.color,
            intensity,
            on: true,
        };
    });

    function showLamp(lamp) {
        lamp.light.intensity = lamp.on ? lamp.intensity : 0;
        lamp.bulb.material.color.set(lamp.on ? lamp.color : BULB_OFF);
    }

    // --- Box -----------------------------------------------------------------

    /** A `w` × `h` plane in `material`, its middle at `at`, turned `turn`
     * about y. */
    function plane(material, w, h, at, turn = 0) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.set(...at);
        mesh.rotation.y = turn;
        mesh.receiveShadow = true;
        return mesh;
    }

    const trim = new THREE.MeshStandardMaterial({
        color: TRIM,
        roughness: 0.8,
    });
    function trimBox(size, at) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), trim);
        mesh.position.set(...at);
        return mesh;
    }

    const floor = plane(
        lookMaterial(THREE, look.floor, width, depth),
        width,
        depth,
        [width / 2, 0, depth / 2]
    );
    floor.rotation.x = -Math.PI / 2;
    made.add(floor);

    // The walls: their height is set by the room, so they're built once.
    const height = wallHeightOf(room);
    const sides = lookMaterial(THREE, look.sides, depth, height);
    made.add(
        plane(lookMaterial(THREE, look.back, width, height), width, height, [
            width / 2,
            height / 2,
            0,
        ]),
        plane(sides, depth, height, [0, height / 2, depth / 2], Math.PI / 2),
        plane(
            sides,
            depth,
            height,
            [width, height / 2, depth / 2],
            -Math.PI / 2
        ),
        // The ceiling edge, along the back and both sides.
        trimBox([width, CEILING_EDGE, 6], [width / 2, height, 3]),
        trimBox([6, CEILING_EDGE, depth], [3, height, depth / 2]),
        trimBox([6, CEILING_EDGE, depth], [width - 3, height, depth / 2])
    );

    made.add(trimBox([width, SKIRTING, 4], [width / 2, SKIRTING / 2, 2]));

    // --- Things in the room and the Butt -------------------------------------

    const things = new Map();
    for (const item of room.interactables) {
        const size = itemBox(item).height;
        // On a wall rather than the floor: no shadow under it.
        const shadows = !((item.y ?? 0) > 0);
        const puppet = item.cast
            ? kit.castMesh(item.cast, { size, shadows })
            : // A prop can play any move.
              kit.emojiMesh(item.emoji, { size, shadows, moves: CAST_MOVES });
        if (item.cast) puppet.setMove("idle");
        // Against the back wall, a hair in front of it.
        puppet.group.position.set(item.x, item.y ?? 0, (item.z ?? 0) + 3);
        scene.add(puppet.group);
        things.set(item.id, puppet);
    }

    const butt = kit.castMesh("butt", { size: ROOM_SIZES.butt });
    butt.setMove("idle");
    butt.group.position.set(buttAt.x, 0, buttAt.z);
    scene.add(butt.group);

    const puppets = [butt, ...things.values()];
    let reduced = null;
    let laidOut = false;

    /** Points the camera for the stage. */
    function layout(L) {
        laidOut = true;
        const cam = L.camera;
        camera.far = cam.z + depth;
        applyCamera(camera, cam);

        const shadow = key.shadow.camera;
        const reach = Math.max(width, depth);
        shadow.left = -reach;
        shadow.right = reach;
        shadow.top = reach;
        shadow.bottom = -reach;
        shadow.near = 1;
        shadow.far = width * 4;
        shadow.updateProjectionMatrix();
    }

    /**
     * Poses the room for one frame; whether anything changed. `view`: {
     *   butt: { x, z, facing, walking },
     *   buttLift,   // units, the walking bob
     *   reduced,    // prefers reduced motion
     * }
     */
    function sync(view, dt) {
        if (!laidOut) return false;
        let changed = false;
        if (view.reduced !== reduced) {
            reduced = view.reduced;
            for (const puppet of puppets) puppet.setReducedMotion(reduced);
            changed = true;
        }
        const at = butt.group.position;
        if (at.x !== view.butt.x || at.z !== view.butt.z) {
            at.set(view.butt.x, 0, view.butt.z);
            changed = true;
        }
        butt.set({
            lift: view.buttLift,
            facing: view.butt.facing < 0 ? "left" : "right",
        });
        butt.setMove(view.butt.walking ? "walk" : "idle");
        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        return changed;
    }

    return {
        scene,
        camera,
        layout,
        sync,
        /** Plays `move` on the thing `id` (a one-shot). */
        animate(id, move) {
            things.get(id)?.play(move);
        },
        /** Switches room light `id`; whether it's now on. */
        toggleLight(id) {
            const lamp = lamps.find((l) => l.id === id);
            if (!lamp) return null;
            lamp.on = !lamp.on;
            showLamp(lamp);
            return lamp.on;
        },
        dispose() {
            disposeTree(made);
            for (const puppet of puppets) puppet.dispose();
        },
    };
}
