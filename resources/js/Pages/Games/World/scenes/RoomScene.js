import { applyCamera, disposeTree } from "../three/useWorldRenderer.js";
import { ROOM_SIZES } from "./roomLayout.js";

// The `kind: "room"` scene graph (issue #130): a dollhouse room with its
// front wall taken away, lit warm from the front. For now a plain box with
// its doors and the Butt standing in it; the room engine (Phase 5) gives it
// wallpaper and floor tokens, its own lights, toys and walking. It only
// draws: Room3D.vue owns the state.

const COLORS = {
    background: "#1c1917",
    floor: "#a16207",
    back: "#fde68a",
    sides: "#fcd34d",
    skirting: "#78350f",
};
const SKIRTING = 14; // units tall
const SHADOW_MAP = 1024;

/**
 * Builds a room from its scene data (`room`: { size, interactables }), with
 * the Butt at `butt` ({ x, z }). Returns { scene, camera, layout(L),
 * sync(view, dt), dispose() }.
 */
export function createRoomScene(THREE, kit, { room, butt: buttAt }) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 1);
    scene.add(camera);

    const made = new THREE.Group(); // everything here that isn't the kit's
    scene.add(made);

    const { w: width, d: depth } = room.size;

    // --- Light ---------------------------------------------------------------

    made.add(new THREE.HemisphereLight("#fff7ed", "#78350f", 1.1));
    const key = new THREE.DirectionalLight("#fde68a", 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    key.shadow.bias = -0.0005;
    key.position.set(width * 0.3, width, depth + width);
    key.target.position.set(width / 2, 0, depth / 2);
    made.add(key, key.target);

    // --- Box -----------------------------------------------------------------

    const material = (color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const sides = material(COLORS.sides);

    /** A `w` × `h` plane, its middle at `at`, turned `turn` about y. */
    function plane(mat, w, h, at, turn = 0) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        mesh.position.set(...at);
        mesh.rotation.y = turn;
        mesh.receiveShadow = true;
        made.add(mesh);
        return mesh;
    }

    const floor = plane(material(COLORS.floor), width, depth, [
        width / 2,
        0,
        depth / 2,
    ]);
    floor.rotation.x = -Math.PI / 2;
    const back = plane(material(COLORS.back), width, 1, [width / 2, 0, 0]);
    const left = plane(sides, depth, 1, [0, 0, depth / 2], Math.PI / 2);
    const right = plane(sides, depth, 1, [width, 0, depth / 2], -Math.PI / 2);

    const skirting = new THREE.Mesh(
        new THREE.BoxGeometry(width, SKIRTING, 4),
        material(COLORS.skirting)
    );
    skirting.position.set(width / 2, SKIRTING / 2, 2);
    made.add(skirting);

    // --- Doors and the Butt --------------------------------------------------

    const doors = room.interactables
        .filter((item) => item.type === "door")
        .map((item) => {
            const puppet = kit.emojiMesh(item.emoji, {
                size: ROOM_SIZES.door.height,
                shadows: false,
            });
            puppet.group.position.set(item.x, 0, (item.z ?? 0) + 3);
            scene.add(puppet.group);
            return puppet;
        });

    const butt = kit.castMesh("butt", { size: ROOM_SIZES.butt });
    butt.setMove("idle");
    butt.group.position.set(buttAt.x, 0, buttAt.z);
    scene.add(butt.group);

    const puppets = [butt, ...doors];
    let reduced = null;
    let L = null;

    /** Sizes the walls and points the camera for the stage. */
    function layout(nextLayout) {
        L = nextLayout;
        const h = L.wallHeight;
        for (const wall of [back, left, right]) {
            wall.scale.y = h;
            wall.position.y = h / 2;
        }
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

    /** Poses the room for one frame; whether anything changed.
     * `view`: { reduced } (prefers reduced motion). */
    function sync(view, dt) {
        if (!L) return false;
        let changed = false;
        if (view.reduced !== reduced) {
            reduced = view.reduced;
            for (const puppet of puppets) puppet.setReducedMotion(reduced);
            changed = true;
        }
        for (const puppet of puppets) changed = puppet.tick(dt) || changed;
        return changed;
    }

    return {
        scene,
        camera,
        layout,
        sync,
        dispose() {
            disposeTree(made);
            for (const puppet of puppets) puppet.dispose();
        },
    };
}
