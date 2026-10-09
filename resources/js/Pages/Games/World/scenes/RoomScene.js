import { CAST_MOVES } from "@/constants/characters.js";
import {
    lookMaterial,
    roomDaylight,
    roomDecorations,
    roomLook,
    TRIM,
} from "../three/roomLooks.js";
import { applyCamera, disposeTree } from "../three/useWorldRenderer.js";
import { clockFinish, clockTexture } from "../three/clockFaces.js";
import { itemBox, itemPose, ROOM_SIZES, wallHeightOf } from "./roomLayout.js";
import { bookcaseGeometry, booksMesh } from "./bookshelf.js";
import { doorwayGeometry } from "./doorway.js";
import { exitSigns } from "./exitSign.js";
import { floorGeometry, stairsFootprint, stairsGeometry } from "./staircase.js";

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
// How bright a switched-on bulb's own glyph glows, apart from the light it casts.
const BULB_ON = 2;
// A flat-screen TV: how far it stands off its wall, units.
const SCREEN_DEPTH = 6;

/**
 * Builds a room from its scene data (`room`: { size, walls, ambient, lights,
 * interactables }), with the Butt at `butt` ({ x, z }), in the light of
 * seasonal `theme`, its EXIT signs reading `exitWord`. Returns { scene,
 * camera, layout(L), sync(view, dt), animate(id, move), toggleLight(id),
 * dispose() }.
 */
export function createRoomScene(
    THREE,
    kit,
    { room, butt: buttAt, theme, exitWord = "Exit" }
) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 1);
    scene.add(camera);

    const made = new THREE.Group(); // everything here that isn't the kit's
    scene.add(made);

    const { w: width, d: depth } = room.size;
    const look = roomLook(room.walls);
    // Walls are sized from the framed width, so a long hall isn't a tall one.
    const height = wallHeightOf(room);
    const span = height * 2;

    // --- Light ---------------------------------------------------------------

    const daylight = roomDaylight(theme);
    const ambient = (room.ambient ?? 1) * (daylight.dim ?? 1);
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
    // Aimed at wherever the camera is looking, from the same angle a room
    // the size of the frame would have: a long hall isn't lit from a mile up.
    function aimLight(x) {
        key.position.set(x - span * 0.2, span, depth + span);
        key.target.position.set(x, 0, depth / 2);
    }
    aimLight(width / 2);
    made.add(key, key.target);

    // The room's lamps. Off is no light rather than a hidden one: the
    // number of lights is part of every lit material's shader, so hiding
    // one would recompile them all. A toy that switches a lamp is the
    // bulb, so the light is moved onto that glyph (below).
    const lamps = (room.lights ?? []).map((data) => {
        const intensity = data.intensity * LAMP_REACH;
        const light = new THREE.PointLight(
            data.color,
            intensity,
            width * 1.5,
            1
        );
        light.position.set(data.x, data.y, data.z);
        made.add(light);
        return {
            id: data.id,
            light,
            color: data.color,
            intensity,
            on: true,
            bulb: null,
        };
    });
    const bulbs = [];

    function showLamp(lamp) {
        lamp.light.intensity = lamp.on ? lamp.intensity : 0;
        if (lamp.bulb) lamp.bulb.emissiveIntensity = lamp.on ? BULB_ON : 0;
    }

    function glyphOf(puppet) {
        let mesh = null;
        puppet.body.traverse((node) => {
            if (node.isMesh) mesh = node;
        });
        return mesh;
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

    // Stairs are drawn as a flight, not a card; a flight down is a well
    // cut out of the floor.
    const stairs = room.interactables.filter((item) => item.stairs);
    const wells = stairs
        .filter((item) => item.stairs === "down")
        .map(stairsFootprint);
    const floor = new THREE.Mesh(
        floorGeometry(THREE, width, depth, wells),
        lookMaterial(THREE, look.floor, width, depth)
    );
    floor.receiveShadow = true;
    made.add(floor);

    // A well goes below the floor, which the camera could otherwise see
    // past the floor's front edge: a skirt there in the background colour.
    if (wells.length > 0) {
        made.add(
            plane(
                new THREE.MeshBasicMaterial({ color: BACKGROUND }),
                width,
                depth,
                [width / 2, -depth / 2, depth]
            )
        );
    }

    // Stairs, open doorways (doorway.js) and the Library's bookcases
    // (bookshelf.js) are built into the room, in wood coloured in their
    // vertices; the books on the shelves are one instanced mesh.
    const shelves = room.shelves ?? [];
    const doorways = room.interactables.filter((item) => item.open);
    const wood =
        stairs.length + doorways.length + shelves.length > 0
            ? new THREE.MeshStandardMaterial({
                  vertexColors: true,
                  roughness: 0.8,
              })
            : null;
    function woodwork(geometry, pose = null) {
        const mesh = new THREE.Mesh(geometry, wood);
        if (pose) {
            mesh.position.set(pose.x, 0, pose.z);
            mesh.rotation.y = pose.turn;
        }
        mesh.castShadow = !pose;
        mesh.receiveShadow = true;
        made.add(mesh);
    }
    for (const item of stairs) woodwork(stairsGeometry(THREE, item, height));
    for (const shelf of shelves) woodwork(bookcaseGeometry(THREE, shelf));
    if (doorways.length > 0) {
        const doorway = doorwayGeometry(THREE);
        for (const item of doorways) woodwork(doorway, itemPose(item));
    }
    const books = booksMesh(THREE, shelves);
    if (books) made.add(books);

    // A red EXIT sign over every way out (exitSign.js).
    const signs = exitSigns(THREE, room, exitWord);
    scene.add(signs.group);

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

    made.add(
        trimBox([width, SKIRTING, 4], [width / 2, SKIRTING / 2, 2]),
        trimBox([4, SKIRTING, depth], [2, SKIRTING / 2, depth / 2]),
        trimBox([4, SKIRTING, depth], [width - 2, SKIRTING / 2, depth / 2])
    );

    // The season's decorations on the back wall (garlands, cobwebs), hung
    // by their middles. They never move, so they aren't ticked.
    const decorations = roomDecorations(theme).map((d) => {
        const puppet = kit.emojiMesh(d.emoji, { size: d.size, shadows: false });
        puppet.group.position.set(d.u * width, d.v * height - d.size / 2, 4);
        scene.add(puppet.group);
        return puppet;
    });

    // --- Things in the room and the Butt -------------------------------------

    const things = new Map();
    for (const item of room.interactables) {
        // Built into the room above, not played with.
        if (item.stairs || item.open) continue;
        if (item.screen) {
            made.add(screenMesh(item));
            continue;
        }
        const size = itemBox(item).height;
        // On a wall rather than the floor: no shadow under it.
        const shadows = !((item.y ?? 0) > 0);
        const puppet = item.cast
            ? kit.castMesh(item.cast, { size, shadows })
            : item.face
              ? kit.paintedMesh(clockTexture(THREE, item.face), {
                    size,
                    shadows,
                    moves: CAST_MOVES,
                    ...clockFinish(item.face),
                })
              : // A prop can play any move.
                kit.emojiMesh(item.emoji, { size, shadows, moves: CAST_MOVES });
        if (item.cast) puppet.setMove("idle");
        const pose = itemPose(item);
        puppet.group.position.set(pose.x, pose.y, pose.z);
        puppet.group.rotation.y = pose.turn;
        const lamp = lamps.find((entry) => entry.id === item.light);
        if (lamp) {
            const glyph = glyphOf(puppet);
            const lit = glyph.material.clone();
            lit.emissive = new THREE.Color(lamp.color);
            lit.emissiveMap = lit.map;
            lit.emissiveIntensity = BULB_ON;
            glyph.material = lit;
            glyph.name = "bulb";
            lamp.bulb = lit;
            bulbs.push(lit);
            lamp.light.position.set(pose.x, pose.y + size / 2, pose.z);
        }
        scene.add(puppet.group);
        things.set(item.id, puppet);
    }

    const butt = kit.castMesh("butt", { size: ROOM_SIZES.butt });
    butt.setMove("idle");
    butt.group.position.set(buttAt.x, 0, buttAt.z);
    scene.add(butt.group);

    /** A flat-screen TV (`screen`: { w, h }): a thin black panel on its
     * wall. What it plays is a <video> over it in the overlay. */
    function screenMesh(item) {
        const { width: w, height: h } = itemBox(item);
        const pose = itemPose(item);
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, SCREEN_DEPTH),
            new THREE.MeshStandardMaterial({
                color: "#0b0b0f",
                roughness: 0.25,
                metalness: 0.3,
            })
        );
        panel.position.set(pose.x, pose.y + h / 2, pose.z);
        panel.rotation.y = pose.turn;
        panel.translateZ(SCREEN_DEPTH / 2);
        return panel;
    }

    const puppets = [butt, ...things.values()];
    let reduced = null;
    let laidOut = false;

    /** Points the camera for the stage. */
    function layout(L) {
        laidOut = true;
        const cam = L.camera;
        camera.far = cam.z + depth;
        applyCamera(camera, cam);

        aimLight(cam.x);
        const shadow = key.shadow.camera;
        const reach = Math.max(span, depth);
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
     *   camera,     // the view, when a long hall has scrolled
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
        if (view.camera && view.camera.x !== camera.position.x) {
            applyCamera(camera, view.camera);
            aimLight(view.camera.x);
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
            books?.dispose();
            signs.dispose();
            disposeTree(made);
            for (const material of bulbs) material.dispose();
            for (const puppet of [...puppets, ...decorations]) {
                puppet.dispose();
            }
        },
    };
}
