// The gut Guster travels, laid out like a textbook belly: the small
// intestine coils back and forth in the middle, drops into the cecum at
// the bottom left, and the colon frames it — up the left side, across the
// top under the stomach, down the right side — before the sigmoid swings
// back to the middle and the rectum runs down to the exit. The tube never
// crosses itself, and its walls keep apart (intestinePath.test.js).
//
// The path is drawn by a turtle of straight runs and circular arcs, so
// every bend is round. Each piece names its section, and the section sets
// how wide the tube is there (half its width, `hw`).

export const WORLD_WIDTH = 1000;
// How far the wall reaches past the lining, on each side.
export const WALL = 8;
const SAMPLE_STEP = 4;

const SECTIONS = {
    small: { hw: 46 },
    large: { hw: 60 },
};

const START = { x: 600, y: 330, heading: 90 };

// [kind, length or radius, turn in degrees (+ turns clockwise on screen), section]
const PIECES = [
    ["line", 40, 0, "small"],
    ["arc", 70, 90, "small"],
    ["line", 220, 0, "small"],
    ["arc", 70, -180, "small"],
    ["line", 380, 0, "small"],
    ["arc", 70, 180, "small"],
    ["line", 380, 0, "small"],
    ["arc", 70, -180, "small"],
    ["line", 380, 0, "small"],
    ["arc", 70, 180, "small"],
    ["line", 485, 0, "small"],
    // The cecum, then the colon up, across and down.
    ["arc", 105, 90, "large"],
    ["line", 680, 0, "large"],
    ["arc", 105, 90, "large"],
    ["line", 590, 0, "large"],
    ["arc", 105, 90, "large"],
    ["line", 835, 0, "large"],
    // The sigmoid swings back to the middle.
    ["arc", 105, 90, "large"],
    ["line", 180, 0, "large"],
    ["arc", 105, -90, "large"],
    ["line", 100, 0, "large"],
];

const rad = (deg) => (deg * Math.PI) / 180;

// Samples the path every SAMPLE_STEP for steering and collisions, and
// writes it as SVG lines and arcs (one path per section, so each can be
// stroked at its own width) for drawing: a few commands, not a point each.
function build() {
    const points = [];
    const runs = [];
    let { x, y, heading } = START;
    let s = 0;

    const push = (section) => {
        points.push({ x, y, s, heading, hw: SECTIONS[section].hw, section });
    };
    push(PIECES[0][3]);

    for (const [kind, size, turn, section] of PIECES) {
        const length = kind === "line" ? size : size * rad(Math.abs(turn));
        const steps = Math.max(1, Math.round(length / SAMPLE_STEP));
        const step = length / steps;
        // A clockwise arc's centre lies to the traveller's right (heading + 90).
        const side = Math.sign(turn);
        const cx = x + size * Math.cos(rad(heading + 90 * side));
        const cy = y + size * Math.sin(rad(heading + 90 * side));
        const startAngle = heading - 90 * side;
        const startHeading = heading;

        // Each section starts where the last ended, so their joins meet.
        if (runs.at(-1)?.section !== section) {
            runs.push({ section, d: `M ${x.toFixed(1)} ${y.toFixed(1)}` });
        }

        for (let i = 1; i <= steps; i++) {
            if (kind === "line") {
                x += step * Math.cos(rad(heading));
                y += step * Math.sin(rad(heading));
            } else {
                const turned = (turn * i) / steps;
                x = cx + size * Math.cos(rad(startAngle + turned));
                y = cy + size * Math.sin(rad(startAngle + turned));
                heading = startHeading + turned;
            }
            s += step;
            push(section);
        }

        const to = `${x.toFixed(1)} ${y.toFixed(1)}`;
        runs.at(-1).d +=
            kind === "line"
                ? ` L ${to}`
                : ` A ${size} ${size} 0 0 ${turn > 0 ? 1 : 0} ${to}`;
    }

    return { points, runs, length: s };
}

const BUILT = build();

export const PATH_POINTS = BUILT.points;
export const PATH_LENGTH = BUILT.length;
export const PATH_START = PATH_POINTS[0];
const PATH_END = PATH_POINTS[PATH_POINTS.length - 1];

// The way out, just past the end of the rectum.
export const EXIT = {
    x: PATH_END.x + 26 * Math.cos(rad(PATH_END.heading)),
    y: PATH_END.y + 26 * Math.sin(rad(PATH_END.heading)),
};

const lowest = Math.max(EXIT.y, ...PATH_POINTS.map((p) => p.y + p.hw));
// Room below for the way out and a little dark.
export const WORLD_HEIGHT = Math.ceil(lowest + 90);

export const SECTION_PATHS = BUILT.runs.map((run) => ({
    ...run,
    hw: SECTIONS[run.section].hw,
}));
// The whole centreline, for the minimap.
export const PATH_D = BUILT.runs.map((run) => run.d).join(" ");

// Chevrons along the middle of the tube, pointing the way through.
export const FLOW_MARKS = PATH_POINTS.filter(
    (p, i) =>
        i > 0 &&
        i < PATH_POINTS.length - 30 &&
        i % Math.round(140 / SAMPLE_STEP) === 0
);

const distance2 = (i, x, y) =>
    (PATH_POINTS[i].x - x) ** 2 + (PATH_POINTS[i].y - y) ** 2;

/**
 * The centreline point nearest (x, y), found by walking along the path
 * from `near` while it gets closer. The tube folds back on itself, so a
 * search of the whole path could pick a coil on the other side of a wall;
 * every bend is rounder than the tube is wide, so from inside the tube the
 * walk finds the one nearest point.
 */
export function nearestPoint(x, y, near) {
    let best = near;
    for (const dir of [1, -1]) {
        while (
            PATH_POINTS[best + dir] &&
            distance2(best + dir, x, y) < distance2(best, x, y)
        ) {
            best += dir;
        }
    }
    return best;
}
