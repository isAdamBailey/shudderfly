import { CAST_MOVES } from "@/constants/characters.js";
import { approach } from "@/utils/math";
import { own } from "@/utils/object";
import {
    lookMaterial,
    NIGHT,
    roomDaylight,
    roomDecorations,
    roomLook,
    TRIM,
} from "../three/roomLooks.js";
import { applyCamera, disposeTree } from "../three/useWorldRenderer.js";
import { clockFinish, clockTexture } from "../three/clockFaces.js";
import { MODELS } from "../three/models.js";
import { bassDrum } from "../three/bassDrum.js";
import { harp } from "../three/harp.js";
import { pipeOrgan } from "../three/pipeOrgan.js";
import { itemBox, itemPose, ROOM_SIZES, wallHeightOf } from "./roomLayout.js";
import { bookcaseGeometry, booksMesh } from "./bookshelf.js";
import { doorwayGeometry } from "./doorway.js";
import { entertainmentCenterGeometry } from "./entertainmentCenter.js";
import { exitSigns } from "./exitSign.js";
import { pictureFrame } from "../three/pictureFrame.js";
import { fireplaceGeometry } from "./fireplace.js";
import { kitchenCounterGeometry } from "./kitchenCounter.js";
import { ORGAN } from "./organLayout.js";
import { floorGeometry, stairsFootprint, stairsGeometry } from "./staircase.js";
import { createWallCrawlers } from "./wallCrawlers.js";

// The `kind: "room"` scene graph (issue #130): a dollhouse room with its
// front wall taken away. Walls and floor come from the room's `walls` looks
// (three/roomLooks.js). The daylight in through the open front (the one
// light that casts shadows) is the same in every room: enough to see by
// with every lamp off, dimmed to moonlight at night. Its `lights` are lamps
// you can switch, adding to the daylight by day, all on at nightfall. Its
// doors and toys stand where the data puts them, a toy that is a character
// as its cast puppet, and the Butt walks the floor. It only draws:
// Room3D.vue owns the state (useRoom) and hands it over each frame through
// sync().

const BACKGROUND = "#1c1917";
const SKIRTING = 14; // units tall
const CEILING_EDGE = 10; // units: the trim along the walls' tops
const SHADOW_MAP = 1024;
// The daylight's share of the light: a sky fill and a key that casts the
// shadows, at `level` in every room (Guster's House's, which got it
// right). Enough by day to see by with the lamps off; at night (NIGHT.dim)
// dark enough that the lamps are what light it.
const DAYLIGHT_INTENSITY = { fill: 2.2, key: 2, level: 0.7 };
// Lamps fall off with distance (decay 1): this scales an intensity so a
// lamp has it at about this many units away.
const LAMP_REACH = 250;
// How bright a switched-on bulb's own glyph glows, apart from the light it casts.
const BULB_ON = 2;
// How brightly the Butt glows in a room with every lamp off.
const BUTT_GLOW = 0.25;
// A lamp drawn as its own glyph (no toy is its bulb), units tall.
const LAMP_GLYPH = 44;
// How long night takes to fall or lift when dark mode flips, s.
const NIGHTFALL = 0.3;
// A candle (a light marked `flicker`) wavers about its brightness, by up
// to this share of it, a step every this many s: often enough to read as
// a flame, seldom enough that a candlelit room isn't redrawn every frame.
const FLICKER = { amount: 0.18, step: 0.09 };
// A flat-screen TV: how far it stands off its wall, units.
const SCREEN_DEPTH = 6;
// A picture's or photo's backing, round the edge of its <img>.
const PICTURE_BACKING = "#1c1410";
// What an instrument interactable is drawn as, by its type: each model is
// { group, tick(dt, reduced) } and its own way to be played.
export const INSTRUMENTS = { organ: pipeOrgan, harp, drum: bassDrum };

/**
 * Builds a room from its scene data (`room`: { size, walls, lights,
 * photos, interactables }), with the Butt at `butt` ({ x, z }), in the light of
 * seasonal `theme` (at `night` in dark mode), its EXIT signs reading
 * `exitWord`. Returns { scene, camera, layout(L), sync(view, dt),
 * animate(id, move), pressKey(id, zone, key), pluckString(id, n, delay),
 * hitDrum(id, edge), toggleLight(id),
 * setNight(on), dispose() }.
 */
export function createRoomScene(
    THREE,
    kit,
    {
        room,
        butt: buttAt,
        theme,
        night: startAtNight = false,
        exitWord = "Exit",
    }
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
    // Dimmed by the season's dusk (Halloween), the same all visit.
    const day = DAYLIGHT_INTENSITY.level * (daylight.dim ?? 1);
    const fill = new THREE.HemisphereLight();
    const key = new THREE.DirectionalLight();
    made.add(fill);
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

    // Dark mode: 0 by day, 1 at night, between while night falls.
    let night = startAtNight ? 1 : 0;
    let nightTarget = night;
    const scratch = new THREE.Color();
    /** The daylight `n` of the way to night: dimmer, and toward moonlight. */
    function showDaylight(n) {
        const dim = 1 + (NIGHT.dim - 1) * n;
        const toward = NIGHT.tint * n;
        fill.color.set(daylight.sky).lerp(scratch.set(NIGHT.sky), toward);
        fill.groundColor
            .set(daylight.ground)
            .lerp(scratch.set(NIGHT.ground), toward);
        fill.intensity = DAYLIGHT_INTENSITY.fill * day * dim;
        key.color.set(daylight.key).lerp(scratch.set(NIGHT.key), toward);
        key.intensity = DAYLIGHT_INTENSITY.key * day * dim;
        showButtGlow();
    }

    // The Butt's own faint glow (buttGlow, made with the Butt below), so it
    // can still be found in the dark: all of it while every lamp is off,
    // some at night with them on.
    function showButtGlow() {
        const lit = lamps.some((lamp) => lamp.on);
        buttGlow.emissiveIntensity = BUTT_GLOW * (lit ? night / 2 : 1);
    }

    // The room's lamps. Off is no light rather than a hidden one: the
    // number of lights is part of every lit material's shader, so hiding
    // one would recompile them all. A toy that switches one lamp is its
    // bulb, so the light is moved onto that glyph (below); a lamp no toy
    // is the bulb of may be drawn as its own `emoji`.
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
        return { data, light, intensity, on: true, bulb: false };
    });
    // Things that glow while any of their lamps is on: { lamps, set(on) }.
    const glows = [];
    // Glyph materials copied to glow (glowing()), freed with the room.
    const glowMaterials = [];

    function showLamps() {
        for (const lamp of lamps) {
            lamp.light.intensity = lamp.on ? lamp.intensity : 0;
        }
        for (const glow of glows) {
            const on = glow.lamps.some((lamp) => lamp.on);
            glow.set(on);
        }
        showButtGlow();
    }

    // Candles' flicker: a few sines out of step, so it never repeats.
    let flame = 0;
    let sinceFlicker = 0;
    const flickering = lamps.filter((lamp) => lamp.data.flicker);
    /** Wavers each lit candle, a step at a time; whether any did. Still
     * under reduced motion. */
    function flicker(dt) {
        if (reduced) return false;
        flame += dt;
        sinceFlicker += dt;
        if (sinceFlicker < FLICKER.step) return false;
        sinceFlicker = 0;
        let any = false;
        for (const [i, lamp] of flickering.entries()) {
            if (!lamp.on) continue;
            const t = flame * 9 + i * 2.1;
            const waver =
                (Math.sin(t) + Math.sin(t * 2.3 + 1) + Math.sin(t * 5.7)) / 3;
            lamp.light.intensity =
                lamp.intensity * (1 + FLICKER.amount * waver);
            any = true;
        }
        return any;
    }

    const lampsOf = (ids) => lamps.filter((lamp) => ids.includes(lamp.data.id));

    /** Gives `puppet`'s glyph its own copy of its material, able to glow in
     * `color`, named `name`; switches its glow. */
    function glowing(puppet, color, name) {
        let glyph = null;
        puppet.body.traverse((node) => {
            if (node.isMesh) glyph = node;
        });
        const lit = glyph.material.clone();
        lit.emissive = new THREE.Color(color);
        lit.emissiveMap = lit.map;
        glyph.material = lit;
        glyph.name = name;
        return lit;
    }

    /** A glow switch for `puppet`'s glyph, in `color`. */
    function glowSwitch(puppet, color) {
        const material = glowing(puppet, color, "bulb");
        glowMaterials.push(material);
        return (on) => (material.emissiveIntensity = on ? BULB_ON : 0);
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

    // Stairs, open doorways (doorway.js), the Library's bookcases
    // (bookshelf.js), entertainment centers (entertainmentCenter.js),
    // fireplaces (fireplace.js) and kitchen counters (kitchenCounter.js)
    // are built into the room, in wood and stone
    // coloured in their vertices; the books on
    // the shelves are one instanced mesh.
    const shelves = room.shelves ?? [];
    const entertainment = room.entertainment ?? [];
    const fireplaces = room.fireplaces ?? [];
    const counters = room.counters ?? [];
    const doorways = room.interactables.filter((item) => item.open);
    const wood = [
        stairs,
        doorways,
        shelves,
        entertainment,
        fireplaces,
        counters,
    ].some((list) => list.length)
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
    for (const unit of entertainment) {
        woodwork(entertainmentCenterGeometry(THREE, unit));
    }
    for (const unit of fireplaces) woodwork(fireplaceGeometry(THREE, unit));
    for (const unit of counters) woodwork(kitchenCounterGeometry(THREE, unit));
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

    const crawlers = room.crawlers
        ? createWallCrawlers(THREE, width, height)
        : null;
    if (crawlers) scene.add(crawlers.group);

    // --- Things in the room and the Butt -------------------------------------

    const things = new Map();
    // Each modelled thing's own switch (its setOn: a radio's dial, a
    // lamp's shade), by its id.
    const switches = new Map();
    // Instruments (INSTRUMENTS), by id: built into the room, but played,
    // so they're ticked.
    const instruments = new Map();
    for (const item of room.interactables) {
        // Built into the room above, not played with.
        if (item.stairs || item.open) continue;
        const instrument = own(INSTRUMENTS, item.type);
        if (instrument) {
            const built = instrument(THREE);
            const pose = itemPose(item);
            built.group.position.set(pose.x, pose.y, pose.z);
            built.group.rotation.y = pose.turn;
            made.add(built.group);
            instruments.set(item.id, built);
            continue;
        }
        // A TV, or a picture: a thin panel, framed if it says. What you see
        // on it is in the overlay (a <video>, or the picture's <img>).
        if (item.image) {
            made.add(pictureMesh(item));
            continue;
        }
        if (item.screen) {
            made.add(panelMesh(item, "#0b0b0f"));
            continue;
        }
        const size = itemBox(item).height;
        // Hung on the back wall (up it, against it): no shadow under it.
        // One standing on something (a radio on its cabinet) has one.
        const shadows = !((item.y ?? 0) > 0 && !item.z);
        // A prop modelled in 3D (three/models.js), lit like the room.
        const model = MODELS[item.model]?.(THREE) ?? null;
        // A lamp's own light drives its glow (below), so only the others
        // are switched by id.
        if (model?.userData.setOn && !item.light) {
            switches.set(item.id, model.userData.setOn);
        }
        const puppet = model
            ? kit.modelMesh(model, { size, shadows, moves: CAST_MOVES })
            : item.cast
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
        // A switch for one lamp is its bulb, and the light sits on it (in
        // a modelled lamp, at its `bulb`); one for several (`light: [ids]`)
        // glows with them where it is. A model lights up its own way.
        const switched = lampsOf([item.light ?? []].flat());
        if (switched.length > 0) {
            glows.push({
                lamps: switched,
                // A model lights up its own way, or not at all: its last
                // mesh isn't a glyph to glow.
                set: model
                    ? model.userData.setOn ?? (() => {})
                    : glowSwitch(puppet, switched[0].data.color),
            });
            if (typeof item.light === "string") {
                switched[0].bulb = true;
                switched[0].light.position.set(
                    pose.x,
                    pose.y + size * (model?.userData.bulb ?? 0.5),
                    pose.z
                );
            }
        }
        scene.add(puppet.group);
        things.set(item.id, puppet);
    }

    // The room's photos: a panel each, like a picture's. The photo is in the
    // overlay.
    for (const photo of room.photos ?? []) made.add(pictureMesh(photo));

    // Lamps drawn as their own glyph (a wall lamp), hung by its middle.
    const fixtures = lamps
        .filter((lamp) => lamp.data.emoji && !lamp.bulb)
        .map((lamp) => {
            const { data } = lamp;
            const puppet = kit.emojiMesh(data.emoji, {
                size: LAMP_GLYPH,
                shadows: false,
            });
            puppet.group.position.set(data.x, data.y - LAMP_GLYPH / 2, data.z);
            glows.push({
                lamps: [lamp],
                set: glowSwitch(puppet, data.color),
            });
            scene.add(puppet.group);
            return puppet;
        });

    const butt = kit.castMesh("butt", { size: ROOM_SIZES.butt });
    butt.setMove("idle");
    butt.group.position.set(buttAt.x, 0, buttAt.z);
    scene.add(butt.group);
    const buttGlow = glowing(butt, "#ffffff", "butt-glow");
    showDaylight(night);
    showLamps();

    /** A thin panel on its wall, `color`: a TV's screen or a picture's
     * backing. What it shows is in the overlay. */
    function panelMesh(item, color) {
        const { width: w, height: h } = itemBox(item);
        const pose = itemPose(item);
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, SCREEN_DEPTH),
            new THREE.MeshStandardMaterial({
                color,
                roughness: 0.25,
                metalness: 0.3,
            })
        );
        panel.position.set(pose.x, pose.y + h / 2, pose.z);
        panel.rotation.y = pose.turn;
        panel.translateZ(SCREEN_DEPTH / 2);
        return panel;
    }

    /** A picture or photo's backing panel, in its frame
     * (three/pictureFrame.js) if `image.frame` names one. */
    function pictureMesh(item) {
        const panel = panelMesh(item, PICTURE_BACKING);
        const { w, h, frame: style } = item.image;
        const frame = style && pictureFrame(THREE, style, w, h);
        if (!frame) return panel;
        const pose = itemPose(item);
        frame.position.set(pose.x, pose.y, pose.z);
        frame.rotation.y = pose.turn;
        const group = new THREE.Group();
        group.add(panel, frame);
        return group;
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
     *   thrown,     // [{ id, x, y, z, ground, tilt }]: things picked up
     *               // or thrown (useThrowables), stood on `ground` and
     *               // lifted off it, so their shadow stays under them
     * }
     */
    function sync(view, dt) {
        if (!laidOut) return false;
        let changed = false;
        if (view.reduced !== reduced) {
            reduced = view.reduced;
            for (const puppet of puppets) puppet.setReducedMotion(reduced);
            // Candles stop wavering at their own brightness.
            showLamps();
            changed = true;
        }
        if (view.camera && view.camera.x !== camera.position.x) {
            applyCamera(camera, view.camera);
            aimLight(view.camera.x);
            changed = true;
        }
        for (const t of view.thrown ?? []) {
            const puppet = things.get(t.id);
            if (!puppet) continue;
            const spot = puppet.group.position;
            if (spot.x !== t.x || spot.y !== t.ground || spot.z !== t.z) {
                spot.set(t.x, t.ground, t.z);
                changed = true;
            }
            puppet.set({ lift: t.y - t.ground, tilt: t.tilt });
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
        if (night !== nightTarget) {
            night = reduced
                ? nightTarget
                : approach(night, nightTarget, dt / NIGHTFALL);
            showDaylight(night);
            changed = true;
        }
        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        if (crawlers?.tick(dt, reduced)) changed = true;
        if (flicker(dt)) changed = true;
        for (const instrument of instruments.values()) {
            changed = instrument.tick(dt, reduced) || changed;
        }
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
        /** Plays `move` on the Butt (a one-shot: a toot when it's fed). */
        animateButt(move) {
            butt.play(move);
        },
        /** Presses white key `key` of zone `zone` on organ `id`: it goes
         * down and its pipe sounds. */
        pressKey(id, zone, key) {
            instruments.get(id)?.press?.(zone * ORGAN.whiteKeys + key);
        },
        /** Plucks string `n` of harp `id`, `delay` s from now: it rings. */
        pluckString(id, n, delay = 0) {
            instruments.get(id)?.pluck?.(n, delay);
        },
        /** Hits bass drum `id` `edge` out from its head's middle: it swings
         * and its head ripples. */
        hitDrum(id, edge = 0) {
            instruments.get(id)?.hit?.(edge);
        },
        /** Switches modelled thing `id`'s own light (a radio's dial while
         * it plays). */
        setOn(id, on) {
            switches.get(id)?.(on);
        },
        /** Switches room light `id` (or lights `[ids]`, together: off if
         * any is on); whether they're now on. */
        toggleLight(id) {
            const switched = lampsOf([id].flat());
            if (switched.length === 0) return null;
            const on = !switched.some((lamp) => lamp.on);
            for (const lamp of switched) lamp.on = on;
            showLamps();
            return on;
        },
        /** Night falls (or lifts) over the next frames: dark mode flipped.
         * At nightfall every lamp comes on. */
        setNight(on) {
            nightTarget = on ? 1 : 0;
            if (!on) return;
            for (const lamp of lamps) lamp.on = true;
            showLamps();
        },
        dispose() {
            crawlers?.dispose();
            books?.dispose();
            signs.dispose();
            disposeTree(made);
            for (const material of glowMaterials) material.dispose();
            buttGlow.dispose();
            for (const puppet of [...puppets, ...decorations, ...fixtures]) {
                puppet.dispose();
            }
        },
    };
}
