import { BASS_DRUM } from "./drumLayout.js";
import { HARP } from "./harpLayout.js";
import { ORGAN_FOOTPRINT } from "./organLayout.js";
import { FOOTPRINTS } from "../three/footprints.js";

/**
 * The instruments a room can have, by interactable type, each with the
 * floor it stands on in its own space ({ x0, x1, z0, z1 }, as itemPoint()
 * takes it). The Butt keeps off each (useRoom.js), so it never stands over
 * what's played, and each is played on buttons of its own over what's
 * drawn (Room3D.vue), not an emoji button. RoomScene.js draws them (a test
 * keeps its models in step).
 */
export const INSTRUMENT_FOOTPRINTS = {
    organ: ORGAN_FOOTPRINT,
    // From the column's crown to the neck's scroll, as deep as it is.
    harp: { x0: -126, x1: 126, z0: 0, z1: HARP.depth },
    // The cradle's posts, and its feet back to the wall.
    drum: {
        x0: -(BASS_DRUM.radius + 24),
        x1: BASS_DRUM.radius + 24,
        z0: 0,
        z1: 2 * BASS_DRUM.z,
    },
};

// How close the Butt comes to the edge of a stage: up to it, to play
// what's on it, not half its own width off as from an instrument.
const STAGE_CLEARANCE = 20;

/** The floor the Butt keeps off in `room` (useRoom.js): each instrument's
 * (INSTRUMENT_FOOTPRINTS), and a room's `stage` ({ w, d }) along the back
 * wall, whose instruments are played from in front. Each is { item, x0,
 * x1, z0, z1 } in the space of `item` (as itemPoint() takes it), with the
 * `clearance` the Butt keeps from it if it says. */
export function blockedFloor(room) {
    const floors = room.interactables
        .filter(isInstrument)
        .map((item) => ({ item, ...INSTRUMENT_FOOTPRINTS[item.type] }));
    // Selected modeled fixtures can block the floor too. Use the same
    // footprint as the rendered prop so collision cannot drift from it.
    floors.push(
        ...room.interactables
            .filter((item) => item.blocksMovement && FOOTPRINTS[item.model])
            .map((item) => {
                const footprint = FOOTPRINTS[item.model];
                const size = item.size ?? 80;
                return {
                    item,
                    x0: (-footprint.w * size) / 2,
                    x1: (footprint.w * size) / 2,
                    z0: 0,
                    z1: footprint.d * size,
                };
            })
    );
    // The bath blocks its raised sides and wall edge, but leaves an entry in
    // the front apron so the Butt can walk into the basin. The small
    // clearance matches the low shell, rather than closing that opening with
    // the full body-width clearance used for solid fixtures.
    floors.push(
        ...room.interactables
            .filter((item) => item.model === "bathtub" && FOOTPRINTS.bathtub)
            .flatMap((item) => {
                const { w, d } = FOOTPRINTS.bathtub;
                const size = item.size ?? 80;
                const half = (w * size) / 2;
                const entryHalf = (w * size * 0.68) / 2;
                const edge = 0.08 * size;
                const clearance = 12;
                return [
                    { item, x0: -half, x1: half, z0: 0, z1: edge, clearance },
                    { item, x0: -half, x1: -entryHalf, z0: d * size - edge, z1: d * size, clearance },
                    { item, x0: entryHalf, x1: half, z0: d * size - edge, z1: d * size, clearance },
                    { item, x0: -half, x1: -half + edge, z0: edge, z1: d * size - edge, clearance },
                    { item, x0: half - edge, x1: half, z0: edge, z1: d * size - edge, clearance },
                ];
            })
    );
    if (room.stage) {
        const { w, d } = room.stage;
        floors.push({
            item: { x: w / 2, z: 0 },
            x0: -w / 2,
            x1: w / 2,
            z0: 0,
            z1: d,
            clearance: STAGE_CLEARANCE,
        });
    }
    return floors;
}

/** Whether interactable `item` is an instrument. */
export function isInstrument(item) {
    return Object.hasOwn(INSTRUMENT_FOOTPRINTS, item.type);
}
