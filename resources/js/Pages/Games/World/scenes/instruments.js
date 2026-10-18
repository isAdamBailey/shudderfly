import { BASS_DRUM } from "./drumLayout.js";
import { HARP } from "./harpLayout.js";
import { ORGAN_FOOTPRINT } from "./organLayout.js";

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

/** Whether interactable `item` is an instrument. */
export function isInstrument(item) {
    return Object.hasOwn(INSTRUMENT_FOOTPRINTS, item.type);
}
