import { approach } from "@/utils/math";
import { CURTAIN } from "../scenes/stageLayout.js";

// The auditorium's stage curtain: two drapes of deep red velvet under a
// valance with a gold fringe. Open, each drape is gathered back to its end
// of the stage, its folds deep; drawn shut, they meet in the middle, their
// folds shallow, and hide the stage. Drawing it takes CURTAIN.draw s, at
// once under reduced motion.
//
// Built in world units in curtain `item`'s own space (scenes/stageLayout.js):
// its plane on z = 0, its middle on x = 0, from the stage (y = 0) up to the
// top of the walls. The room poses it.

const VELVET = "#8b1a1a";
const GOLD = "#c9a227";
// How many columns of vertices each fold of a drape has.
const PER_FOLD = 8;

/** The curtain `item` ({ w, y }) in a room with walls `wallHeight` tall,
 * open: { group, tick(dt, reduced), setOpen(open) }. */
export function stageCurtain(THREE, item, wallHeight) {
    const group = new THREE.Group();
    const { w } = item;
    const top = wallHeight - (item.y ?? 0);
    // The drapes tuck up behind the valance.
    const tall = top - CURTAIN.valance + 6;

    const velvet = new THREE.MeshStandardMaterial({
        color: VELVET,
        roughness: 0.85,
        side: THREE.DoubleSide,
    });
    const gold = new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.7,
        roughness: 0.35,
    });

    // The drapes, the left one's outer end on the stage's left end and
    // the right one's mirrored: each a sheet pleated in z (layDrapes()).
    const columns = CURTAIN.folds * PER_FOLD;
    const drapes = [-1, 1].map((side) => {
        const geometry = new THREE.PlaneGeometry(1, tall, columns, 1);
        geometry.translate(0, tall / 2, 0);
        const mesh = new THREE.Mesh(geometry, velvet);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return { side, geometry };
    });

    // The valance across the top, in front of the drapes, and its fringe.
    const valance = new THREE.Mesh(
        new THREE.BoxGeometry(w, CURTAIN.valance, 12),
        velvet
    );
    valance.position.set(0, top - CURTAIN.valance / 2, 10);
    const fringe = new THREE.Mesh(
        new THREE.BoxGeometry(w, CURTAIN.fringe, 14),
        gold
    );
    fringe.position.set(0, top - CURTAIN.valance + CURTAIN.fringe / 2, 10);
    group.add(valance, fringe);

    /** Lays the drapes out `open` of the way back (0 shut, 1 open). */
    function layDrapes(open) {
        const wide = w / 2 + (CURTAIN.gathered - w / 2) * open;
        const { drawn, gathered } = CURTAIN.depth;
        const deep = drawn + (gathered - drawn) * open;
        for (const { side, geometry } of drapes) {
            const p = geometry.attributes.position;
            for (let i = 0; i < p.count; i += 1) {
                // Across the drape from its outer end (0) to its inner (1).
                const u = (i % (columns + 1)) / columns;
                p.setX(i, side * (w / 2 - u * wide));
                p.setZ(i, deep * Math.sin(u * CURTAIN.folds * Math.PI * 2));
            }
            p.needsUpdate = true;
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
        }
    }

    // How far open it is (0 to 1), and how far it's going.
    let open = 1;
    let target = 1;
    layDrapes(open);

    return {
        group,
        /** Draws it on toward where it's going; whether it moved. */
        tick(dt, reduced) {
            if (open === target) return false;
            open = reduced ? target : approach(open, target, dt / CURTAIN.draw);
            // Eased in and out.
            layDrapes(open * open * (3 - 2 * open));
            return true;
        },
        /** Starts it drawing open, or shut. */
        setOpen(on) {
            target = on ? 1 : 0;
        },
    };
}
