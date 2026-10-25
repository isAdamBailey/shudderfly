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
import {
    fromView,
    viewSize,
    viewYaw,
    WALLS,
    wallBehind,
} from "../composables/views.js";
import { clockFinish, clockTexture } from "../three/clockFaces.js";
import { MODELS } from "../three/models.js";
import { createOtherPuppets } from "../three/otherPuppets.js";
import { bassDrum } from "../three/bassDrum.js";
import { harp } from "../three/harp.js";
import { pipeOrgan } from "../three/pipeOrgan.js";
import {
    hungUp,
    itemBox,
    itemPose,
    ROOM_SIZES,
    wallFacing,
    wallHeightOf,
    wallOf,
} from "./roomLayout.js";
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

// The `kind: "room"` scene graph (issue #130): a dollhouse room, its four
// walls built and whichever is between the camera and the room taken away
// (issue #183), with anything nearer than the floor in view. Walls and
// floor come from the room's `walls` looks (three/roomLooks.js). The
// daylight from behind the camera (the one light that casts shadows) is
// the same in every room: enough to see by
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
// How far nearer the camera than the floor in view (the layout's `band`)
// still shows, units: the Butt at the front edge stands out past it.
const NEAR_SLACK = ROOM_SIZES.butt / 2;
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
    // How deep the floor in view runs from the wall the camera faces.
    let band = depth;
    /** Where the daylight shines from, and at, for projection.js camera
     * `cam` (in its view's frame) over a floor `deep` units deep: from
     * behind the camera at wherever it's looking, from the same angle a
     * room the size of the frame would have, so a long hall isn't lit from
     * a mile up. */
    function lightAim(cam, deep) {
        const room = (x, y, z) => fromView(cam.view, { x, y, z });
        return {
            from: room(cam.x - span * 0.2, span, deep + span),
            at: room(cam.x, 0, deep / 2),
        };
    }
    function aimLight(cam) {
        const { from, at } = lightAim(cam, band);
        key.position.copy(from);
        key.target.position.copy(at);
    }
    aimLight({ x: width / 2 });
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

    /** Where `wall` stands: its middle on the floor, its length, and its
     * turn to face into the room (views.js: it's the back wall of a camera
     * facing it). */
    function wallLine(wall) {
        const view = { wall, size: room.size };
        const along = viewSize(view).w;
        return {
            middle: fromView(view, { x: along / 2, z: 0 }),
            along,
            turn: viewYaw(view),
        };
    }

    // Each wall's look (the ends' is `sides`) by its length, made once:
    // look → length → material.
    const wallMaterials = new Map();
    function wallMaterial(wall, along) {
        const finish = look[wall] ?? look.sides;
        if (!wallMaterials.has(finish)) wallMaterials.set(finish, new Map());
        const byLength = wallMaterials.get(finish);
        if (!byLength.has(along)) {
            byLength.set(along, lookMaterial(THREE, finish, along, height));
        }
        return byLength.get(along);
    }

    // The four walls, each stood on the floor at its middle and turned to
    // face into the room, with its skirting and the ceiling edge along its
    // top. Wall → everything on it (hang()), hidden with it while it's the
    // one behind the camera (showWalls()).
    const walls = Object.fromEntries(
        WALLS.map((wall) => {
            const { middle, along, turn } = wallLine(wall);
            const box = new THREE.Group();
            box.position.set(middle.x, 0, middle.z);
            box.rotation.y = turn;
            box.add(
                plane(wallMaterial(wall, along), along, height, [
                    0,
                    height / 2,
                    0,
                ]),
                trimBox([along, CEILING_EDGE, 6], [0, height, 3]),
                trimBox([along, SKIRTING, 4], [0, SKIRTING / 2, 2])
            );
            made.add(box);
            return [wall, [box]];
        })
    );

    /** The wall `thing` is on (roomLayout.js wallOf()), or null. */
    const wallIn = (thing) => wallOf(thing, room.size);

    /** Hangs `object` on `wall`, to be hidden with it. A thing standing in
     * the room (no wall), or in a corner, is never hidden. */
    function hang(wall, object) {
        walls[wall]?.push(object);
    }

    // The faced wall's dressing, the kit's: the season's decorations
    // (garlands and cobwebs, hung by their middles) and any crawlers. Only
    // the wall faced is dressed (the ends, seen edge on, would cost a draw
    // call a decoration for little to see), so a wall's is made when it's
    // first faced, and hidden while it isn't.
    const dressings = new Map();
    function dressingFor(wall) {
        if (dressings.has(wall)) return dressings.get(wall);
        const { middle, along, turn } = wallLine(wall);
        const group = new THREE.Group();
        group.position.set(middle.x, 0, middle.z);
        group.rotation.y = turn;
        const puppets = roomDecorations(theme).map((d) => {
            const puppet = kit.emojiMesh(d.emoji, {
                size: d.size,
                shadows: false,
            });
            puppet.group.position.set(
                (d.u - 0.5) * along,
                d.v * height - d.size / 2,
                4
            );
            group.add(puppet.group);
            return puppet;
        });
        const crawling =
            room.crawlers && createWallCrawlers(THREE, along, height);
        if (crawling) {
            crawling.group.position.x = -along / 2;
            group.add(crawling.group);
        }
        scene.add(group);
        const dressing = { group, puppets, crawling };
        dressings.set(wall, dressing);
        return dressing;
    }

    // Flat cards (cast puppets and emoji, not models, nor anything posed on
    // a wall it names): turned to face the camera (layout()).
    const cards = [];
    // The camera's turn, which the cards share.
    let yaw = 0;

    /** Thing `id`'s `puppet` was picked up or thrown: it's in the room now,
     * a card, not hidden with any wall. */
    const loose = new Set();
    function loosen(id, puppet) {
        if (loose.has(id)) return;
        loose.add(id);
        for (const hung of Object.values(walls)) {
            const at = hung.indexOf(puppet.group);
            if (at >= 0) hung.splice(at, 1);
        }
        puppet.group.visible = true;
        puppet.group.rotation.y = yaw;
        if (!cards.includes(puppet)) cards.push(puppet);
    }

    // The faced walls' dressings, whose crawlers crawl.
    let dressed = [];
    /** Shows every wall but the one behind a camera facing any of `faced`
     * (two while it turns from one to the other), and dresses those. */
    function showWalls(...faced) {
        const behind = faced.map(wallBehind);
        for (const [wall, hung] of Object.entries(walls)) {
            for (const object of hung) {
                object.visible = !behind.includes(wall);
            }
        }
        for (const dressing of dressed) dressing.group.visible = false;
        dressed = faced.map(dressingFor);
        for (const dressing of dressed) dressing.group.visible = true;
    }
    showWalls("back");

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
    // past the near edge of the floor in view: a skirt there in the
    // background colour, moved there for each view (layout()).
    const across = Math.max(width, depth);
    const skirt =
        wells.length > 0
            ? plane(
                  new THREE.MeshBasicMaterial({ color: BACKGROUND }),
                  across,
                  across,
                  [width / 2, -across / 2, depth]
              )
            : null;
    if (skirt) made.add(skirt);

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
    /** Builds `geometry` in wood into the room, on `wall` (if it's on
     * one), posed as `pose` if it says, and returns its mesh. */
    function woodwork(wall, geometry, pose = null) {
        const mesh = new THREE.Mesh(geometry, wood);
        if (pose) {
            mesh.position.set(pose.x, 0, pose.z);
            mesh.rotation.y = pose.turn;
        }
        mesh.castShadow = !pose;
        mesh.receiveShadow = true;
        made.add(mesh);
        hang(wall, mesh);
        return mesh;
    }
    for (const item of stairs) {
        woodwork(wallIn(item), stairsGeometry(THREE, item, height));
    }
    for (const shelf of shelves) {
        woodwork("back", bookcaseGeometry(THREE, shelf));
    }
    /** Builds a unit flat against its wall (the back unless it names
     * one): `geometry` makes it as if on the back wall at x 0, and it's
     * turned out from its wall to where it stands. */
    function builtIn(unit, geometry) {
        const mesh = woodwork(
            unit.wall ?? "back",
            geometry({ ...unit, x: 0 }),
            {
                x: unit.x,
                z: unit.z ?? 0,
                turn: wallFacing(unit.wall).turn,
            }
        );
        mesh.castShadow = true;
    }
    for (const unit of entertainment) {
        builtIn(unit, (u) => entertainmentCenterGeometry(THREE, u));
    }
    for (const unit of fireplaces) {
        builtIn(unit, (u) => fireplaceGeometry(THREE, u));
    }
    for (const unit of counters) {
        builtIn(unit, (u) => kitchenCounterGeometry(THREE, u));
    }
    if (doorways.length > 0) {
        const doorway = doorwayGeometry(THREE);
        for (const item of doorways) {
            woodwork(wallIn(item), doorway, itemPose(item));
        }
    }
    const books = booksMesh(THREE, shelves);
    if (books) {
        made.add(books);
        hang("back", books);
    }

    // A red EXIT sign over every way out (exitSign.js), on its door's wall.
    const signs = exitSigns(THREE, room, exitWord);
    scene.add(signs.group);
    for (const [door, sign] of signs.signs) hang(wallIn(door), sign);

    // --- Things in the room and the Butt -------------------------------------

    const things = new Map();
    // Each modelled thing's own switch (its setOn: a radio's dial, a
    // lamp's shade), by its id.
    const switches = new Map();
    // Each modelled thing that swings (a clock's pendulum), where it
    // stands, with its userData: swing, beat, and any chime and tune.
    const swings = [];
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
            hang(wallIn(item), built.group);
            instruments.set(item.id, built);
            continue;
        }
        // A TV, or a picture: a thin panel, framed if it says. What you see
        // on it is in the overlay (a <video>, or the picture's <img>).
        if (item.image || item.screen) {
            const mesh = item.image
                ? pictureMesh(item)
                : panelMesh(item, "#0b0b0f");
            made.add(mesh);
            hang(wallIn(item), mesh);
            continue;
        }
        const size = itemBox(item).height;
        // Hung on a wall (up it, against it): no shadow under it. One
        // standing on something (a radio on its cabinet) has one.
        const shadows = !hungUp(item, room.size);
        // A prop modelled in 3D (three/models.js), lit like the room.
        const model = MODELS[item.model]?.(THREE) ?? null;
        // A lamp's own light drives its glow (below), so only the others
        // are switched by id.
        if (model?.userData.setOn && !item.light) {
            switches.set(item.id, model.userData.setOn);
        }
        if (model?.userData.swing) {
            swings.push({ ...model.userData, x: item.x, z: item.z ?? 0 });
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
        hang(wallIn(item), puppet.group);
        if (!model && !item.wall) cards.push(puppet);
        things.set(item.id, puppet);
    }

    // The room's photos: a panel each, like a picture's. The photo is in the
    // overlay.
    for (const photo of room.photos ?? []) {
        const mesh = pictureMesh(photo);
        made.add(mesh);
        hang(wallIn(photo), mesh);
    }

    // Lamps drawn as their own glyph (a wall lamp), hung by its middle on
    // its wall.
    const fixtures = lamps
        .filter((lamp) => lamp.data.emoji && !lamp.bulb)
        .map((lamp) => {
            const { data } = lamp;
            const puppet = kit.emojiMesh(data.emoji, {
                size: LAMP_GLYPH,
                shadows: false,
            });
            const pose = itemPose(data);
            puppet.group.position.set(pose.x, data.y - LAMP_GLYPH / 2, pose.z);
            puppet.group.rotation.y = pose.turn;
            glows.push({
                lamps: [lamp],
                set: glowSwitch(puppet, data.color),
            });
            scene.add(puppet.group);
            hang(wallIn(data), puppet.group);
            return puppet;
        });

    const butt = kit.castMesh("butt", { size: ROOM_SIZES.butt });
    butt.setMove("idle");
    // Other people's butts in the room (issue #174), the same size.
    const otherPuppets = createOtherPuppets(kit, scene);
    otherPuppets.setSize(ROOM_SIZES.butt);
    butt.group.position.set(buttAt.x, 0, buttAt.z);
    scene.add(butt.group);
    cards.push(butt);
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
    // The projection.js camera last applied: Room3D hands over a new one
    // only when it moves.
    let shown = null;

    /** Points the camera for the stage, at the wall its view faces: the
     * wall behind it hidden, with anything nearer than the floor in view
     * (`L.band` deep), and the cards standing in the room turned to it. */
    function layout(L) {
        laidOut = true;
        const cam = L.camera;
        const faced = cam.view?.wall ?? "back";
        band = L.band;
        camera.near = Math.max(1, cam.z - band - NEAR_SLACK);
        camera.far = cam.z + depth;
        applyCamera(camera, cam);
        shown = cam;
        showWalls(faced);
        turnCards(viewYaw(cam.view));
        if (skirt) {
            // Across the middle of the wall in view, so it covers every pan.
            const edge = fromView(cam.view, {
                x: viewSize(cam.view).w / 2,
                z: band,
            });
            skirt.position.set(edge.x, -across / 2, edge.z);
            skirt.rotation.y = yaw;
        }

        // The daylight comes from behind the camera, and follows it along
        // the wall it faces.
        aimLight(cam);
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

    /** The cards (and others) turned to `turn`, the camera's yaw. */
    function turnCards(turn) {
        yaw = turn;
        for (const card of cards) card.group.rotation.y = yaw;
        otherPuppets.setTurn(yaw);
    }

    /** Starts a quarter turn from laid-out room `from` to `to` (as
     * layout() takes them, each facing its own wall): both walls behind
     * them hidden, and only what's nearer than both floors in view cut
     * away. Returns `pose(s)`, which puts the camera, its light and the
     * cards `s` (0 to 1) of the way round. layout(to) finishes it. */
    function swing(from, to) {
        const [a, b] = [from.camera, to.camera];
        applyCamera(camera, a);
        camera.near = Math.max(
            1,
            Math.min(a.z - from.band, b.z - to.band) - NEAR_SLACK
        );
        camera.far = Math.max(a.z, b.z) + Math.max(width, depth);
        camera.updateProjectionMatrix();
        shown = null;
        showWalls(a.view.wall, b.view.wall);
        const v = (p) => new THREE.Vector3(p.x, p.y, p.z);
        const [eye, light] = [lightAim(a, from.band), lightAim(b, to.band)];
        const ends = {
            camera: [v(fromView(a.view, a)), v(fromView(b.view, b))],
            key: [v(eye.from), v(light.from)],
            target: [v(eye.at), v(light.at)],
        };
        // The short way round: a quarter turn, never three.
        const start = viewYaw(a.view);
        const by = viewYaw(b.view) - start;
        const turn = Math.atan2(Math.sin(by), Math.cos(by));
        return (s) => {
            camera.position.lerpVectors(...ends.camera, s);
            key.position.lerpVectors(...ends.key, s);
            key.target.position.lerpVectors(...ends.target, s);
            camera.rotation.set(0, start + turn * s, 0);
            turnCards(start + turn * s);
        };
    }

    /**
     * Poses the room for one frame; whether anything changed. `view`: {
     *   butt: { x, z, facing, walking },
     *   buttLift,   // units, the walking bob
     *   others,     // useOthers', each with its own `lift` in units
     *   reduced,    // prefers reduced motion
     *   time,       // s on the room's clock, which a pendulum swings to
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
            otherPuppets.setReducedMotion(reduced);
            // Candles stop wavering at their own brightness.
            showLamps();
            changed = true;
        }
        if (view.camera && view.camera !== shown) {
            applyCamera(camera, view.camera);
            shown = view.camera;
            aimLight(view.camera);
            changed = true;
        }
        for (const t of view.thrown ?? []) {
            const puppet = things.get(t.id);
            if (!puppet) continue;
            loosen(t.id, puppet);
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
        changed =
            otherPuppets.sync(view.others ?? [], (other) => other, dt) ||
            changed;
        if (night !== nightTarget) {
            night = reduced
                ? nightTarget
                : approach(night, nightTarget, dt / NIGHTFALL);
            showDaylight(night);
            changed = true;
        }
        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        for (const { crawling } of dressed) {
            if (crawling && crawling.tick(dt, reduced)) changed = true;
        }
        for (const { swing } of swings) {
            changed = swing(view.time ?? 0, reduced) || changed;
        }
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
        swing,
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
        /** What swings to the room's clock, where it stands: [{ x, z,
         * beat, chime, tune }], a tick at the end of each swing, every
         * `beat` s, a dong every `chime` s (when it has one), and its
         * tune every `tune`th. */
        swinging: swings,
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
            for (const dressing of dressings.values()) {
                for (const puppet of dressing.puppets) puppet.dispose();
                if (dressing.crawling) dressing.crawling.dispose();
            }
            books?.dispose();
            signs.dispose();
            disposeTree(made);
            for (const material of glowMaterials) material.dispose();
            buttGlow.dispose();
            otherPuppets.dispose();
            for (const puppet of [...puppets, ...fixtures]) {
                puppet.dispose();
            }
        },
    };
}
