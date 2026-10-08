/*
 * The cast's moves as data: one entry per name in CAST_MOVES
 * (constants/characters.js), shared by both drawers. CastMember (the DOM)
 * plays them as the CSS this module generates (castMovesCss), and castMesh
 * (WebGL) samples the same frames with sampleMove(), so a move looks the
 * same wherever a character is drawn (issue #130).
 *
 * A move:
 * - duration: seconds per play.
 * - easing: a CSS keyword from EASINGS, or cubic-bezier points. It applies to
 *   each interval between frames, as CSS does.
 * - loop: plays forever (an ongoing move) rather than once (a one-shot,
 *   played with CastMember's play()).
 * - origin: the pivot as CSS transform-origin fractions [x, y], y from the
 *   top; the middle when absent.
 * - body: frames [offsets, pose]. A pose is CSS-like: tx/ty in px (ty < 0 is
 *   up), rot in degrees (clockwise), sx/sy scale; anything left out is the
 *   identity. Applied as translate, then rotate, then scale.
 * - shadow: frames [offsets, scale] for the ground shadow, for moves that
 *   leave the ground.
 * - still: the pose under reduced motion, when it isn't the identity.
 */

export const EASINGS = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
};

const BOTTOM = [0.5, 1];

const WIGGLE = [
    [[0, 1], {}],
    [[0.25], { rot: -10 }],
    [[0.75], { rot: 10 }],
];

const GULP = {
    duration: 0.35,
    easing: "ease-out",
    origin: BOTTOM,
    body: [
        [[0, 1], {}],
        [[0.4], { sx: 1.12, sy: 0.86 }],
    ],
};

const HOP_SHADOW = [
    [[0, 1], 1],
    [[0.5], 0.8],
];

export const CAST_MOVE_DATA = {
    idle: {
        duration: 2.4,
        easing: "ease-in-out",
        loop: true,
        body: [
            [[0, 1], {}],
            [[0.5], { ty: -6 }],
        ],
        shadow: [
            [[0, 1], 1],
            [[0.5], 0.88],
        ],
    },
    excited: {
        duration: 0.6,
        easing: "ease-in-out",
        loop: true,
        body: [
            [[0, 1], { sx: 1.15, sy: 1.15 }],
            [[0.5], { ty: -10, sx: 1.15, sy: 1.15 }],
        ],
        shadow: HOP_SHADOW,
        // Still a visible state change, just not a moving one.
        still: { sx: 1.15, sy: 1.15 },
    },
    hop: {
        duration: 0.6,
        easing: "ease-in-out",
        loop: true,
        body: [
            [[0, 1], {}],
            [[0.5], { ty: -10 }],
        ],
        shadow: HOP_SHADOW,
    },
    walk: {
        duration: 0.5,
        easing: "ease-in-out",
        loop: true,
        body: [
            [[0, 1], { rot: -4 }],
            [[0.5], { rot: 4, ty: -2 }],
        ],
    },
    wiggle: {
        duration: 0.5,
        easing: "ease-in-out",
        loop: true,
        origin: [0.5, 0.9],
        body: WIGGLE,
    },
    toot: {
        duration: 0.45,
        easing: "ease-out",
        origin: BOTTOM,
        body: [
            [[0, 1], {}],
            [[0.3], { sx: 1.18, sy: 0.84 }],
            [[0.6], { sx: 0.92, sy: 1.1 }],
        ],
    },
    thrown: {
        duration: 0.6,
        easing: "linear",
        loop: true,
        body: [
            [[0], {}],
            [[1], { rot: 360 }],
        ],
    },
    eat: GULP,
    bounce: {
        duration: 0.8,
        easing: [0.3, 0, 0.7, 1],
        loop: true,
        body: [
            [[0, 1], { ty: 0, sx: 1.12, sy: 0.88 }],
            [[0.15], { ty: -4, sx: 0.92, sy: 1.08 }],
            [[0.5], { ty: -22 }],
        ],
        shadow: [
            [[0, 1], 1.05],
            [[0.5], 0.65],
        ],
    },
    flush: {
        duration: 0.9,
        easing: "ease-in-out",
        origin: BOTTOM,
        body: [
            [[0, 1], {}],
            [[0.2, 0.6], { rot: -6, sx: 1.04, sy: 1.04 }],
            [[0.4, 0.8], { rot: 6, sx: 1.04, sy: 1.04 }],
        ],
    },
    gulp: GULP,
    scuttle: {
        duration: 0.18,
        easing: "linear",
        loop: true,
        body: [
            [[0, 1], {}],
            [[0.5], { tx: 2, rot: 2 }],
        ],
    },
    hiss: {
        duration: 0.5,
        easing: "ease-in-out",
        body: [
            [[0, 1], {}],
            [[0.2, 0.6], { tx: -2, sx: 1.1, sy: 1.1 }],
            [[0.4, 0.8], { tx: 2, sx: 1.1, sy: 1.1 }],
        ],
    },
    wobble: {
        duration: 1.4,
        easing: "ease-in-out",
        loop: true,
        origin: [0.5, 0.9],
        body: WIGGLE,
    },
    chomp: GULP,
};

/** Squash and stretch on touching down after a throw. Not a move: both
 * drawers play it themselves when a lifted character lands. */
export const LANDING = {
    duration: 0.22,
    easing: "ease-out",
    origin: BOTTOM,
    body: [
        [[0, 1], {}],
        [[0.35], { sx: 1.2, sy: 0.8 }],
        [[0.7], { sx: 0.95, sy: 1.05 }],
    ],
};

/** Lift (px) a character must fall from for touching down to squash it; a
 * walking bob is lower than this. */
export const LANDING_HEIGHT = 24;

export const IDENTITY_POSE = Object.freeze({
    tx: 0,
    ty: 0,
    rot: 0,
    sx: 1,
    sy: 1,
});

// --- Sampling (castMesh) ----------------------------------------------------

// The frames flattened to [{ at, value }], sorted by offset, with poses'
// identity defaults filled in: made once per frame list, since castMesh
// samples every animating puppet every frame.
const flattened = new WeakMap();
function keyframes(frames) {
    if (!flattened.has(frames)) {
        flattened.set(
            frames,
            frames
                .flatMap(([offsets, value]) =>
                    offsets.map((at) => ({
                        at,
                        value:
                            typeof value === "number"
                                ? value
                                : { ...IDENTITY_POSE, ...value },
                    }))
                )
                .sort((a, b) => a.at - b.at)
        );
    }
    return flattened.get(frames);
}

// A CSS cubic-bezier timing function: solve x(t) = p for t, return y(t).
function bezier([x1, y1, x2, y2]) {
    const coord = (t, a, b) =>
        3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
    return (p) => {
        if (p <= 0 || p >= 1) return p;
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (coord(mid, x1, x2) < p) lo = mid;
            else hi = mid;
        }
        return coord((lo + hi) / 2, y1, y2);
    };
}

const easingFns = new Map();
function easingFn(easing) {
    const points = typeof easing === "string" ? EASINGS[easing] : easing;
    if (!easingFns.has(points)) easingFns.set(points, bezier(points));
    return easingFns.get(points);
}

function interpolate(frames, p, ease, mix) {
    const list = keyframes(frames);
    let before = list[0];
    let after = list[list.length - 1];
    for (const frame of list) {
        if (frame.at <= p) before = frame;
        if (frame.at >= p) {
            after = frame;
            break;
        }
    }
    if (after.at === before.at) return mix(before.value, after.value, 0);
    return mix(
        before.value,
        after.value,
        ease((p - before.at) / (after.at - before.at))
    );
}

const lerp = (a, b, k) => a + (b - a) * k;

// Poses here are always whole (keyframes() fills them in).
function mixPose(a, b, k) {
    return {
        tx: lerp(a.tx, b.tx, k),
        ty: lerp(a.ty, b.ty, k),
        rot: lerp(a.rot, b.rot, k),
        sx: lerp(a.sx, b.sx, k),
        sy: lerp(a.sy, b.sy, k),
        shadow: 1,
    };
}

/**
 * A move's pose `seconds` into it: { tx, ty, rot, sx, sy, shadow }. A loop
 * wraps; a one-shot holds its last frame. `move` is a CAST_MOVE_DATA entry
 * (or LANDING).
 */
export function sampleMove(move, seconds) {
    const raw = seconds / move.duration;
    const p = move.loop ? ((raw % 1) + 1) % 1 : Math.min(Math.max(raw, 0), 1);
    const ease = easingFn(move.easing);
    const pose = interpolate(move.body, p, ease, mixPose);
    if (move.shadow) pose.shadow = interpolate(move.shadow, p, ease, lerp);
    return pose;
}

/** A move's pose under reduced motion. */
export function stillPose(move) {
    return { ...IDENTITY_POSE, ...(move?.still ?? {}), shadow: 1 };
}

// --- CSS (CastMember) -------------------------------------------------------

const percent = (offsets) => offsets.map((at) => `${at * 100}%`).join(", ");

function cssEasing(easing) {
    return typeof easing === "string"
        ? easing
        : `cubic-bezier(${easing.join(", ")})`;
}

function cssTransform(pose) {
    const p = { ...IDENTITY_POSE, ...pose };
    return `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg) scale(${p.sx}, ${p.sy})`;
}

function cssKeyframes(name, frames, transform) {
    const steps = frames
        .map(
            ([offsets, value]) =>
                `${percent(offsets)} { transform: ${transform(value)}; }`
        )
        .join("\n  ");
    return `@keyframes ${name} {\n  ${steps}\n}`;
}

function cssAnimation(name, move) {
    const timing = `${move.duration}s ${cssEasing(move.easing)}`;
    return move.loop
        ? // Looping moves take --cast-delay, so a row of idlers doesn't
          // bob in unison. One-shots always play from their start.
          `animation: ${name} ${timing} infinite; animation-delay: var(--cast-delay, 0s);`
        : `animation: ${name} ${timing};`;
}

function cssOrigin(move) {
    const [x, y] = move.origin ?? [0.5, 0.5];
    return `transform-origin: ${x * 100}% ${y * 100}%;`;
}

/**
 * The stylesheet CastMember plays moves with: a `.cast-move-<name>` class per
 * move on the root, animating `.cast-body` and, for moves that leave the
 * ground, `.cast-shadow`; the landing squash on `.cast-squash`; and every
 * move stilled under reduced motion.
 */
export function castMovesCss() {
    const rules = [];
    for (const [name, move] of Object.entries(CAST_MOVE_DATA)) {
        rules.push(
            `.cast-move-${name} .cast-body { ${cssAnimation(
                `cast-${name}`,
                move
            )} ${cssOrigin(move)} }`,
            cssKeyframes(`cast-${name}`, move.body, cssTransform)
        );
        if (move.shadow) {
            rules.push(
                `.cast-move-${name} .cast-shadow { ${cssAnimation(
                    `cast-${name}-shadow`,
                    move
                )} }`,
                cssKeyframes(
                    `cast-${name}-shadow`,
                    move.shadow,
                    (k) => `translateX(-50%) scale(${k})`
                )
            );
        }
    }
    rules.push(
        `.cast-landing .cast-squash { ${cssAnimation(
            "cast-land",
            LANDING
        )} ${cssOrigin(LANDING)} }`,
        cssKeyframes("cast-land", LANDING.body, cssTransform)
    );

    const stills = Object.entries(CAST_MOVE_DATA)
        .filter(([, move]) => move.still)
        .map(
            ([name, move]) =>
                `.cast-move-${name} .cast-body { transform: ${cssTransform(
                    move.still
                )}; }`
        );
    rules.push(
        `@media (prefers-reduced-motion: reduce) {
  .cast-member .cast-body, .cast-member .cast-shadow, .cast-landing .cast-squash { animation: none; }
  ${stills.join("\n  ")}
}`
    );
    return rules.join("\n");
}

const STYLE_ID = "cast-moves";

/** Adds the moves stylesheet to the document, once. */
export function installCastMoves(
    doc = typeof document === "undefined" ? null : document
) {
    if (!doc || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = castMovesCss();
    doc.head.appendChild(style);
}
