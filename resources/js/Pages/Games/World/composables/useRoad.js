import { usePage } from "@inertiajs/vue3";
import { CAST, TOOT_FOODS } from "@/constants/characters.js";
import { useToot } from "@/composables/useToot";
import { deadband } from "@/utils/math";
import {
    useParallax,
    usePreferredReducedMotion,
    useTransition,
} from "@vueuse/core";
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { clamp, useGamesWorld } from "./useGamesWorld.js";
import { useIdlerPhysics } from "./useIdlerPhysics.js";

const IDLER_SETBACK = 260; // px before its neighbouring landmark
const IDLER_EXCITE_RADIUS = 180;
// How many rows of roadside idlers there are, nearest the horizon first
// (each drawer has a depth per row: RoadScene.vue's IDLER_DEPTHS,
// roadLayout's ROWS.idlers).
const IDLER_ROWS = 3;
// How close to the Butt a food has to land to make it toot.
const FEED_RADIUS = 70; // px

const PEEK_DEADBAND = 0.005;

/**
 * Everything the road does, for whichever drawer shows it (issue #130): the
 * DOM road (scenes/RoadScene.vue, the no-WebGL fallback) and the WebGL road
 * (scenes/Road3D.vue) draw the same state, take the same gestures and expose
 * the same API to the stage.
 *
 * `props` are the scene's ({ scene, stage }); `emit` its emit. The drawer
 * supplies what only it knows:
 * - toWorldX(event, gestureLeft): the road x under a pointer.
 * - buttPuffAt(): where a toot from the Butt shows its puff, in the
 *   drawer's coordinates for `puffs`.
 * - idlerDxToWorld(idler, dx): road px for an idler's screen offset, if the
 *   drawer draws idlers at a different scale (default: the same).
 * - ownLoop: run useGamesWorld's own rAF loop (the DOM road). The WebGL road
 *   steps the world from the renderer's frame instead.
 * - peekTarget: the element the tilt peek follows the pointer over.
 */
export function useRoad(props, emit, options) {
    const {
        toWorldX,
        buttPuffAt,
        idlerDxToWorld = (idler, dx) => dx,
        ownLoop = true,
        peekTarget,
    } = options;

    const page = usePage();

    const prefersReducedMotion = usePreferredReducedMotion();
    const reduced = computed(() => prefersReducedMotion.value === "reduce");

    // useGamesWorld speaks in landmarks (slug, distance, name, landmark
    // emoji); the scene registry speaks in interactables. The original item
    // rides along so arrival can hand it to the stage untouched.
    const roadLandmarks = computed(() =>
        props.scene.interactables.map((item) => ({
            slug: item.id,
            distance: item.x,
            name: item.label,
            landmark: item.emoji,
            cast: item.cast,
            item,
        }))
    );

    // "confirmSlug" is the road's freeze: set when a landmark is activated,
    // it stops the peach until the stage calls release().
    const world = useGamesWorld(roadLandmarks, {
        isReducedMotion: () => reduced.value,
        onArrive: (landmark) => emit("activate", landmark.item),
    });
    const { landmarks, peach, camera, state, nearestLandmark } = world;

    // --- Roadside cast -----------------------------------------------------

    const {
        puffs,
        toot,
        unlock: unlockToot,
    } = useToot(page.props.fartSoundUrl);

    const idlerPhysicsCtl = useIdlerPhysics({
        isBlocked: () => Boolean(state.confirmSlug),
        isReducedMotion: () => reduced.value,
        onDrop: feedIfOnButt,
    });
    const { idlerPhysics } = idlerPhysicsCtl;

    const idlers = computed(() =>
        landmarks.value.map((landmark, i) => {
            const x = landmark.x - IDLER_SETBACK;
            const p = idlerPhysics[landmark.slug];
            return {
                slug: landmark.slug,
                cast: TOOT_FOODS[i % TOOT_FOODS.length].type,
                x,
                // Which row back from the road it stands in, varied for a
                // layered feel.
                row: i % IDLER_ROWS,
                phase: i * 0.37,
                excited: Math.abs(peach.x - x) < IDLER_EXCITE_RADIUS,
                // Screen px: the sideways offset moves the idler, the height
                // goes to the drawer as lift so its shadow stays put.
                dx: p?.dx ?? 0,
                lift: -(p?.dy ?? 0),
                // A little spin while airborne, driven by whatever
                // horizontal speed the toss carried.
                tilt: p?.airborne ? clamp(p.vx / 15, -35, 35) : 0,
            };
        })
    );

    // --- The Butt ------------------------------------------------------------

    // CastMember in the DOM, a castMesh puppet in WebGL: both play().
    const buttCast = shallowRef(null);

    /** A Toot Food dropped or thrown onto the Butt makes it toot at that
     * food's pitch, the way feeding it does in Toot Foods. */
    function feedIfOnButt(slug, dx) {
        const idler = idlers.value.find((i) => i.slug === slug);
        if (
            !idler ||
            Math.abs(idler.x + idlerDxToWorld(idler, dx) - peach.x) >
                FEED_RADIUS
        ) {
            return;
        }
        toot(idler.cast, buttPuffAt());
        buttCast.value?.play("toot");
    }

    // The walking bob, as height above the road so the shadow stays put.
    // 12px of travel, never below 0, so the body never sinks into its own
    // shadow.
    const peachLift = computed(() => (1 - Math.cos(peach.bob * 6)) * 6);

    // --- Lifecycle ---------------------------------------------------------

    onMounted(() => {
        if (ownLoop) world.start();
    });

    /** Tab hidden: stop the loop. Restarting resets the frame clock, so
     * returning can't land a single giant dt and teleport the peach. */
    function pause() {
        interrupt();
        if (ownLoop) world.stop();
    }

    function resume() {
        if (ownLoop) world.start();
    }

    /** Window blur: the keyup for a held arrow goes to whatever took focus,
     * so without this the peach keeps walking to the end of the road while
     * we're away. A toss's listeners and rAF loop shouldn't run unattended
     * either. */
    function interrupt() {
        world.setWalk(0);
        idlerPhysicsCtl.cancelActiveDrag();
    }

    // --- Pointer ---------------------------------------------------------

    // The stage can't move while a finger is down, so its left edge is
    // measured once per gesture (by the stage) instead of on every move.
    let gestureLeft = 0;

    const dragGesture = {
        move(event) {
            event.preventDefault();
            world.updateDrag(toWorldX(event, gestureLeft));
        },
        end: () => world.endDrag(),
        // Abandoned, not dropped: the peach stays put and no card opens.
        cancel: () => world.cancelDrag(),
    };

    const panGesture = {
        move(event) {
            event.preventDefault();
            world.updatePan(event.clientX);
        },
        end: () => world.endPan(),
        cancel: () => world.endPan(),
    };

    function onPeachPointerDown(event) {
        if (state.confirmSlug || event.button > 0) return;
        gestureLeft = props.stage.beginGesture(dragGesture);
        world.startDrag();
    }

    /** Only the bare background pans; the peach drags and landmarks click. */
    function onBackgroundPointerDown(event) {
        if (state.confirmSlug || event.button > 0) return;
        gestureLeft = props.stage.beginGesture(panGesture);
        world.startPan(event.clientX);
    }

    function onIdlerPointerDown(slug, event) {
        idlerPhysicsCtl.onPointerDown(slug, event);
    }

    // --- Keyboard ----------------------------------------------------------

    const landmarkEls = {};

    function setLandmarkEl(slug, el) {
        if (el) landmarkEls[slug] = el;
        else delete landmarkEls[slug];
    }

    function onLandmarkFocus(slug) {
        // Focus walks the peach there, so the keyboard route is a real
        // equivalent of dragging rather than a hidden list of links.
        if (state.confirmSlug) return;
        world.walkToLandmark(slug);
        // Focusing an off-screen button makes the browser scroll the (hidden)
        // overflow of the stage; the camera is the only thing allowed to
        // move the view, and a stray scrollLeft would offset every pointer
        // coordinate.
        props.stage.resetScroll();
    }

    const WALK_KEYS = { ArrowLeft: -1, ArrowRight: 1 };

    function onKeydown(event) {
        const dir = WALK_KEYS[event.key];
        if (!dir) return;
        event.preventDefault();
        world.setWalk(dir);
    }

    function onKeyup(event) {
        const dir = WALK_KEYS[event.key];
        if (dir) world.stopWalk(dir);
    }

    /** Enter on the stage itself visits whichever landmark the peach is
     * already standing at. */
    function activateNearest() {
        if (state.confirmSlug) return;
        const landmark = nearestLandmark.value;
        if (landmark) world.openConfirm(landmark.slug);
    }

    /** The stage is done with an activation that showed nothing: just
     * unfreeze, leaving the peach and focus where they are. */
    function unfreeze() {
        world.closeConfirm();
    }

    /** The activation's card was cancelled: unfreeze and put focus back on
     * the landmark the peach was considering. */
    function release() {
        const id = state.confirmSlug;
        world.closeConfirm();
        nextTick(() => {
            landmarkEls[id]?.focus({ preventScroll: true });
            props.stage.resetScroll();
        });
    }

    // A landmark that is a cast member greets the Butt when it walks up (the
    // toilet flushes), with whatever `greet` move the registry gives it.
    const landmarkCasts = {};

    function setLandmarkCast(slug, cast) {
        if (cast) landmarkCasts[slug] = cast;
        else delete landmarkCasts[slug];
    }

    watch(
        () => nearestLandmark.value?.slug,
        (slug) => {
            const cast = nearestLandmark.value?.cast;
            const greet = cast && CAST[cast].greet;
            if (greet) landmarkCasts[slug]?.play(greet);
        }
    );

    // --- Peek ----------------------------------------------------------------

    // The same useParallax the book cover uses. Both drawers turn it into a
    // small shift of the view; see each for what it moves.
    const { tilt, roll } = useParallax(peekTarget, {
        // Doubled so tilt/roll span [-1, 1] and the drawers' maxima are the
        // actual px rather than half of them.
        mouseTiltAdjust: (i) => i * 2,
        mouseRollAdjust: (i) => i * 2,
        deviceOrientationTiltAdjust: (i) => i * 2,
        deviceOrientationRollAdjust: (i) => i * 2,
    });

    // Deadband first: raw deviceorientation jitters by fractions of a degree
    // even on a stationary table, and without this the view never fully
    // settles. It also screens out the NaN useParallax emits before the stage
    // has been measured, which would otherwise latch inside useTransition —
    // see deadband().
    // Clamped because the device-orientation path is unbounded in a way the
    // mouse path is not: gamma runs to 90deg, which the doubling above turns
    // into 2, and a phone held sideways would otherwise swing twice as far as
    // the maxima promise.
    // useParallax names its outputs for a device's axes, not the screen's:
    // `tilt` is the horizontal source ((x - w/2)/w) and `roll` the vertical
    // one. Mapping them the other way round peeks 90deg off-axis. `roll` is
    // negated so both axes carry the view the same way the pointer moves.
    //
    // Kept as two scalar tweens rather than one array source: a computed
    // returning a fresh array is never Object.is-equal to the last, so
    // useTransition's watch would refire on every jittering
    // deviceorientation event and restart a 150ms rAF chain forever —
    // exactly the settling the deadband exists to produce.
    const rawPeekX = computed(() =>
        reduced.value ? 0 : clamp(deadband(tilt.value, PEEK_DEADBAND), -1, 1)
    );
    const rawPeekY = computed(() =>
        reduced.value ? 0 : clamp(deadband(-roll.value, PEEK_DEADBAND), -1, 1)
    );
    const peekX = useTransition(rawPeekX, { duration: 150 });
    const peekY = useTransition(rawPeekY, { duration: 150 });

    const api = {
        setBounds: world.setBounds,
        pause,
        resume,
        interrupt,
        onKeydown,
        onKeyup,
        activateNearest,
        unfreeze,
        release,
    };

    return {
        world,
        landmarks,
        peach,
        camera,
        nearestLandmark,
        reduced,
        idlers,
        puffs,
        unlockToot,
        buttCast,
        peachLift,
        peekX,
        peekY,
        onPeachPointerDown,
        onBackgroundPointerDown,
        onIdlerPointerDown,
        onLandmarkFocus,
        setLandmarkEl,
        setLandmarkCast,
        api,
    };
}
