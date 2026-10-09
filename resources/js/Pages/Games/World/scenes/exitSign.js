import { canvasTexture } from "../three/useWorldRenderer.js";
import { itemBox, itemPose } from "./roomLayout.js";

/**
 * The red EXIT sign over a room's ways out (issue #130): its `exit` door,
 * and any other door that goes the same way (the far end of a long
 * Library room). Stairs are left out; they plainly lead away. The sign
 * glows on its own (unlit material), so a dim room still shows it, without
 * adding a light. `THREE` is passed in, as in the other scene modules.
 */

// In world units: the sign's size, and how far over the door's top it hangs.
export const EXIT_SIGN = { width: 96, height: 34, depth: 8, gap: 24 };

const HOUSING = "#1c1917";
const FACE = "#450a0a";
const GLOW = "#ff3b30";

/** Whether door `item` in `room` is a way out: the exit, or a door to
 * where the exit goes. */
export function leadsOut(room, item) {
    if (item.type !== "door" || item.stairs) return false;
    if (item.exit) return true;
    const exit = room.interactables.find((i) => i.exit);
    return Boolean(exit) && item.to === exit.to && item.toSpot === exit.toSpot;
}

/** Where the sign over door `item` hangs: its middle, turned with the door. */
export function exitSignPose(item) {
    const pose = itemPose(item);
    return {
        ...pose,
        y: pose.y + itemBox(item).height + EXIT_SIGN.gap + EXIT_SIGN.height / 2,
    };
}

/** The signs over `room`'s ways out, reading `word` (translated), as a
 * group to add to the scene; `dispose()` frees what they share. */
export function exitSigns(THREE, room, word) {
    const group = new THREE.Group();
    const doors = room.interactables.filter((item) => leadsOut(room, item));
    if (doors.length === 0) return { group, dispose() {} };

    const { width, height, depth } = EXIT_SIGN;
    // The word as big as the face takes it, glowing: drawn soft and wide,
    // then sharp on top.
    const texture = canvasTexture(THREE, 256, 96, (ctx) => {
        const text = word.toUpperCase();
        ctx.fillStyle = FACE;
        ctx.fillRect(0, 0, 256, 96);
        ctx.font = "900 80px sans-serif";
        const size = Math.min(80, (80 * 236) / ctx.measureText(text).width);
        ctx.font = `900 ${size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = GLOW;
        ctx.shadowColor = GLOW;
        for (const blur of [28, 12, 0]) {
            ctx.shadowBlur = blur;
            ctx.fillText(text, 128, 52);
        }
    });
    // Its light on the wall round it: a soft red halo, added to whatever
    // is behind, so the sign seems to shine without a real light.
    const haloTexture = canvasTexture(THREE, 128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255, 50, 35, 0.6)");
        g.addColorStop(0.45, "rgba(255, 40, 30, 0.22)");
        g.addColorStop(1, "rgba(255, 40, 30, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    });
    const housing = new THREE.BoxGeometry(width + 6, height + 6, depth);
    const housingMaterial = new THREE.MeshStandardMaterial({ color: HOUSING });
    const face = new THREE.PlaneGeometry(width, height);
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const halo = new THREE.PlaneGeometry(width * 2.6, height * 5);
    const haloMaterial = new THREE.MeshBasicMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    for (const door of doors) {
        const pose = exitSignPose(door);
        const sign = new THREE.Group();
        const glow = new THREE.Mesh(face, faceMaterial);
        glow.position.z = depth / 2 + 0.5;
        const shine = new THREE.Mesh(halo, haloMaterial);
        shine.position.z = -depth / 2 + 0.5;
        sign.add(shine, new THREE.Mesh(housing, housingMaterial), glow);
        sign.position.set(pose.x, pose.y, pose.z + depth / 2);
        sign.rotation.y = pose.turn;
        group.add(sign);
    }

    return {
        group,
        dispose() {
            for (const thing of [
                housing,
                face,
                halo,
                housingMaterial,
                faceMaterial,
                haloMaterial,
                texture,
                haloTexture,
            ]) {
                thing.dispose();
            }
        },
    };
}
