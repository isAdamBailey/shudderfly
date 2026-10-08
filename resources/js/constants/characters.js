export const BUTT = "🍑";
export const COCKROACH = "🪳";
export const TOILET = "🚽";
export const POOP = "💩";
export const PIZZA = "🍕";
export const SPROUT = "🥬";

// The six fart-makers, shared by Toot Foods and the Games World roadside.
// pitch = playbackRate for the toot (bigger food = lower).
export const TOOT_FOODS = [
    { type: "blueberries", emoji: "🫐", pitch: 1.4 },
    { type: "grapes", emoji: "🍇", pitch: 1.22 },
    { type: "strawberry", emoji: "🍓", pitch: 1.1 },
    { type: "taco", emoji: "🌮", pitch: 1.0 },
    { type: "apple", emoji: "🍎", pitch: 0.92 },
    { type: "sprout", emoji: SPROUT, pitch: 0.78 },
];

// Every move a cast member can make. Components/Games/Cast/castMoveData.js
// defines each one, one-to-one (a test holds the two together), and both
// drawers play that data: CastMember as CSS, castMesh in WebGL. So a move is
// drawn the same on every character that has it, in the DOM and in 3D.
export const CAST_MOVES = [
    "idle",
    "excited",
    "hop",
    "walk",
    "wiggle",
    "toot",
    "thrown",
    "eat",
    "bounce",
    "flush",
    "gulp",
    "scuttle",
    "hiss",
    "wobble",
    "chomp",
];

// A Toot Food's tootPitch is the pitch the Butt toots at after eating it.
const FOOD_MOVES = ["idle", "hop", "excited"];

/**
 * The cast registry, keyed by id: who the world can show and how. Scene data
 * refers to cast members by these ids (mirrored in App\Support\GamesWorld::CAST),
 * and the cast kit draws them: CastMember.vue in the DOM, castMesh.js in
 * WebGL (issue #130).
 *
 * - emoji: the glyph, the same one the games use. Absent for `face`, which is
 *   drawn by PersonFace instead.
 * - nameKey: translation key for the character's name.
 * - moves: the CAST_MOVES this character does.
 * - tootPitch: playbackRate for its toot (bigger = lower); absent if it
 *   doesn't toot.
 * - greet: a one-shot from its moves, played when the Butt comes up to it.
 *
 * The Toot Foods are generated from TOOT_FOODS, so the sprout the Butt eats
 * and the sprout Sprout Pox flings are one character.
 */
export const CAST = {
    butt: {
        emoji: BUTT,
        nameKey: "games.cast.butt",
        moves: ["idle", "walk", "wiggle", "toot", "thrown", "eat"],
        tootPitch: 1,
    },
    poop: {
        emoji: POOP,
        nameKey: "games.cast.poop",
        moves: ["idle", "bounce", "toot"],
        tootPitch: 0.85,
    },
    toilet: {
        emoji: TOILET,
        nameKey: "games.cast.toilet",
        moves: ["idle", "flush", "gulp"],
        greet: "flush",
    },
    cockroach: {
        emoji: COCKROACH,
        nameKey: "games.cast.cockroach",
        moves: ["idle", "scuttle", "hiss", "toot"],
        tootPitch: 1.5,
        // Moves that make a sound wherever this character plays them.
        sounds: { hiss: "hiss" },
    },
    pizza: {
        emoji: PIZZA,
        nameKey: "games.cast.pizza",
        moves: ["idle", "wobble"],
    },
    face: {
        nameKey: "games.cast.face",
        moves: ["idle", "chomp"],
    },
    ...Object.fromEntries(
        TOOT_FOODS.map((food) => [
            food.type,
            {
                emoji: food.emoji,
                nameKey: `games.cast.${food.type}`,
                moves: FOOD_MOVES,
                tootPitch: food.pitch,
            },
        ])
    ),
};

/** Whether cast member `id` is drawn in the DOM even in the WebGL world: one
 * with no emoji (the Face, drawn by PersonFace). castMesh gives it only an
 * anchor, and a scene lays CastMember over that. */
export function castInDom(id) {
    return Object.prototype.hasOwnProperty.call(CAST, id) && !CAST[id].emoji;
}
