import { CAST } from "@/constants/characters.js";
import {
    CAST_MOVE_DATA,
    IDENTITY_POSE,
    LANDING,
    LANDING_HEIGHT,
    sampleMove,
    stillPose,
} from "../castMoveData.js";

// The WebGL drawer of the cast kit (issue #130): CastMember.vue's twin. A
// character is its emoji, drawn once into a cached texture and shown on a lit,
// alpha-tested plane facing the camera, so it takes the scene's light and
// casts a real shadow, plus the same soft contact shadow CastMember draws. It
// plays the same moves from the same data (castMoveData.js), with the same
// lift, tilt, facing, landing squash, one-shots and reduced motion.
//
// The Face has no emoji: in 3D it is drawn as CastMember (PersonFace) in the
// scene's DOM overlay at the puppet's projected point, so its own SVG
// animations keep working. castMesh("face") is that anchor: a contact shadow
// and nothing else, marked `domOverlay`.
//
// Sizes and move offsets are world units; scenes use 1 unit = 1 CSS px where
// the camera is at scale 1, so a move's px look as they do in the DOM.

const TEXTURE_PX = 320;
// The glyph's em as a share of its texture; the rest is room for glyphs that
// overhang their em box.
const GLYPH_FILL = 0.8;
export const EMOJI_FONT =
    '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

// As CastMember: the contact shadow is at 1/2 size this many px up.
const SHADOW_FALLOFF = 120;
const DEG = Math.PI / 180;
const SETTABLE = ["size", "lift", "tilt", "facing"];
const REST = Object.freeze({ ...IDENTITY_POSE, shadow: 1 });

function defaultCanvas(px) {
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    return canvas;
}

/**
 * The cast kit for one renderer: puppets for cast members and for plain emoji
 * props, sharing one texture and one material per glyph and one geometry for
 * all of them. dispose() frees everything it made.
 *
 * `createCanvas(px)` makes a square 2D canvas; tests pass a stub.
 * `onSound(name)` is called when a puppet plays a one-shot its character
 * has a sound for (CAST's `sounds`), even under reduced motion, which skips
 * only the animation.
 */
export function createCastKit(
    THREE,
    { createCanvas = defaultCanvas, onSound = () => {} } = {}
) {
    const materials = new Map();
    const plane = new THREE.PlaneGeometry(1, 1);
    const ground = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    let blobMaterial = null;

    function glyphTexture(glyph) {
        const canvas = createCanvas(TEXTURE_PX);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.font = `${TEXTURE_PX * GLYPH_FILL}px ${EMOJI_FONT}`;
            ctx.textAlign = "center";
            // Centre the glyph's real ink, not its font box, so it stands on
            // the bottom of its em like the DOM glyph does.
            const m = ctx.measureText(glyph);
            const ascent = m.actualBoundingBoxAscent ?? 0;
            const descent = m.actualBoundingBoxDescent ?? 0;
            ctx.textBaseline = "alphabetic";
            ctx.fillText(
                glyph,
                TEXTURE_PX / 2,
                TEXTURE_PX / 2 + (ascent - descent) / 2
            );
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    function glyphMaterial(glyph) {
        if (!materials.has(glyph)) {
            materials.set(
                glyph,
                new THREE.MeshStandardMaterial({
                    map: glyphTexture(glyph),
                    // Cut out rather than blended: no sorting, and the shadow
                    // pass uses the same cut-out, so the shadow is the glyph's
                    // silhouette.
                    alphaTest: 0.5,
                    // A left-facing puppet is mirrored with a negative scale.
                    side: THREE.DoubleSide,
                    roughness: 0.85,
                    metalness: 0,
                })
            );
        }
        return materials.get(glyph);
    }

    function contactShadowMaterial() {
        if (!blobMaterial) {
            const px = 64;
            const canvas = createCanvas(px);
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const g = ctx.createRadialGradient(
                    px / 2,
                    px / 2,
                    0,
                    px / 2,
                    px / 2,
                    px / 2
                );
                g.addColorStop(0, "rgba(0,0,0,0.3)");
                g.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, px, px);
            }
            blobMaterial = new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(canvas),
                transparent: true,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
            });
        }
        return blobMaterial;
    }

    /** Pivots `group` about `origin` (CSS transform-origin fractions, y from
     * the top) and applies a pose to it. `inner` is the group's one child,
     * whose own origin is the puppet's feet. */
    function applyPose(group, inner, pose, origin, size) {
        const ox = ((origin?.[0] ?? 0.5) - 0.5) * size;
        const oy = (1 - (origin?.[1] ?? 0.5)) * size;
        // CSS y runs down and rotates clockwise; the world's y runs up.
        group.position.set(ox + pose.tx, oy - pose.ty, 0);
        group.rotation.z = -pose.rot * DEG;
        group.scale.set(pose.sx, pose.sy, 1);
        inner.position.set(-ox, -oy, 0);
    }

    function nested(parent) {
        const outer = new THREE.Group();
        const inner = new THREE.Group();
        outer.add(inner);
        parent.add(outer);
        return [outer, inner];
    }

    function puppet({
        glyph,
        moves,
        size,
        phase = 0,
        shadows = true,
        domOverlay = false,
        sounds = {},
    }) {
        const group = new THREE.Group();

        const blob = new THREE.Mesh(ground, contactShadowMaterial());
        blob.position.y = 0.5;
        blob.renderOrder = -1;
        blob.visible = shadows;
        group.add(blob);

        // lift → tilt (about the body's middle) → landing squash → move.
        const lift = new THREE.Group();
        group.add(lift);
        const [tilt, tiltInner] = nested(lift);
        const [squash, squashInner] = nested(tiltInner);
        const [body, bodyInner] = nested(squashInner);

        let glyphMesh = null;
        if (glyph) {
            glyphMesh = new THREE.Mesh(plane, glyphMaterial(glyph));
            glyphMesh.castShadow = shadows;
            bodyInner.add(glyphMesh);
        }

        const state = {
            size,
            lift: 0,
            tilt: 0,
            facing: "right",
            move: null,
            moveTime: phase,
            oneShot: null,
            oneShotTime: 0,
            landingTime: null,
            reduced: false,
            dirty: true,
        };

        function layout() {
            const s = state.size;
            if (glyphMesh) {
                const mirror = state.facing === "left" ? -1 : 1;
                glyphMesh.scale.set(
                    (mirror * s) / GLYPH_FILL,
                    s / GLYPH_FILL,
                    1
                );
                glyphMesh.position.set(0, s / 2, 0);
            }
            lift.position.y = state.lift;
            tilt.position.y = s / 2;
            tilt.rotation.z = -state.tilt * DEG;
            tiltInner.position.y = -s / 2;
        }

        function moveData(name) {
            return name && moves.includes(name) ? CAST_MOVE_DATA[name] : null;
        }

        const instance = {
            group,
            // The posed body, under the lift, tilt and squash: what a move
            // moves. A DOM overlay (the Face) can follow it.
            body,
            domOverlay,

            /** The ongoing move, or null to stand still. A move the character
             * doesn't have stands still too. Restarts like a CSS class swap. */
            setMove(name) {
                const next = moveData(name) ? name : null;
                if (next === state.move) return;
                state.move = next;
                state.moveTime = phase;
                state.dirty = true;
            },

            /** Plays a one-shot over the ongoing move. Ignored for a move the
             * character doesn't have, and under reduced motion. */
            play(name) {
                if (!moveData(name)) return;
                if (sounds[name]) onSound(sounds[name]);
                if (state.reduced) return;
                state.oneShot = name;
                state.oneShotTime = 0;
                state.dirty = true;
            },

            /** { size, lift (units above the ground), tilt (degrees),
             * facing ("left" | "right") }; anything left out is kept. */
            set(props) {
                const before = state.lift;
                for (const key of SETTABLE) {
                    if (props[key] !== undefined && props[key] !== state[key]) {
                        state[key] = props[key];
                        state.dirty = true;
                    }
                }
                if (
                    state.lift <= 0 &&
                    before > LANDING_HEIGHT &&
                    !state.reduced
                ) {
                    state.landingTime = 0;
                }
            },

            /** Takes it out of the scene. Its geometry, materials and
             * textures are the kit's, freed by the kit's dispose(). */
            dispose() {
                group.removeFromParent();
            },

            setReducedMotion(reduced) {
                if (reduced === state.reduced) return;
                state.reduced = reduced;
                if (reduced) {
                    state.oneShot = null;
                    state.landingTime = null;
                }
                state.dirty = true;
            },

            /** Advances the moves by dt seconds and poses the puppet. Returns
             * whether anything changed, so the renderer can skip a frame. */
            tick(dt) {
                const ongoing = moveData(state.move);
                let animating = false;
                let pose;

                if (state.reduced) {
                    pose = stillPose(ongoing);
                } else if (state.oneShot) {
                    state.oneShotTime += dt;
                    const shot = CAST_MOVE_DATA[state.oneShot];
                    if (state.oneShotTime >= shot.duration) {
                        state.oneShot = null;
                        state.moveTime = phase;
                    }
                    pose = sampleMove(shot, state.oneShotTime);
                    animating = true;
                } else if (ongoing) {
                    state.moveTime += dt;
                    pose = sampleMove(ongoing, state.moveTime);
                    animating = true;
                } else {
                    pose = REST;
                }
                const origin = (
                    state.oneShot ? CAST_MOVE_DATA[state.oneShot] : ongoing
                )?.origin;

                let squashPose = IDENTITY_POSE;
                if (state.landingTime !== null) {
                    state.landingTime += dt;
                    squashPose = sampleMove(LANDING, state.landingTime);
                    if (state.landingTime >= LANDING.duration) {
                        state.landingTime = null;
                    }
                    animating = true;
                }

                if (!animating && !state.dirty) return false;
                state.dirty = false;

                layout();
                applyPose(body, bodyInner, pose, origin, state.size);
                applyPose(
                    squash,
                    squashInner,
                    squashPose,
                    LANDING.origin,
                    state.size
                );

                // As CastMember: shrinks as the body rises, times the move's
                // own shadow beat.
                const height = Math.max(state.lift, 0);
                const k =
                    (SHADOW_FALLOFF / (SHADOW_FALLOFF + height)) * pose.shadow;
                blob.scale.set(state.size * 0.8 * k, 1, state.size * 0.35 * k);
                return true;
            },
        };

        instance.tick(0);
        return instance;
    }

    return {
        /** A cast member by id, drawn from CAST. `phase` (seconds) starts its
         * looping moves part-way through, like CastMember's --cast-delay.
         * `shadows: false` for one that isn't standing on the ground (on a
         * billboard, say). */
        castMesh(id, { size = 64, phase = 0, shadows = true } = {}) {
            const member = CAST[id];
            if (!member) throw new Error(`Unknown cast member "${id}"`);
            return puppet({
                glyph: member.emoji ?? null,
                moves: member.moves,
                size,
                phase,
                shadows,
                domOverlay: !member.emoji,
                sounds: member.sounds,
            });
        },

        /** A prop that isn't a character (a sign, a landmark, a cloud): the
         * same look, and only the `moves` it's given (a toy's wiggle).
         * `shadows: false` for things in the air. */
        emojiMesh(glyph, { size = 64, shadows = true, moves = [] } = {}) {
            return puppet({ glyph, moves, size, shadows });
        },

        dispose() {
            for (const material of materials.values()) {
                material.map?.dispose();
                material.dispose();
            }
            materials.clear();
            blobMaterial?.map?.dispose();
            blobMaterial?.dispose();
            blobMaterial = null;
            plane.dispose();
            ground.dispose();
        },
    };
}
