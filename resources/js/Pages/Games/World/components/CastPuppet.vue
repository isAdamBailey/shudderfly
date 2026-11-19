<script setup>
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { DAYLIGHT_INTENSITY, roomDaylight } from "../three/roomLooks.js";
import {
    loadThree,
    MAX_PIXEL_RATIO,
    supportsWebGL,
} from "../three/useWorldRenderer.js";

// A cast member in a minigame as it is in the world: its lit 3D puppet
// (castMesh.js), not the flat DOM drawing, on a little see-through canvas of
// its own, lit like a room on an everyday day (not the season's, nor
// at night). Minigames get it as kit.CastPuppet
// (minigames/index.js). Where WebGL can't be had it draws CastMember
// instead, so the game still plays. Sized by its font-size, like
// CastMember: its box is BOX em square, the puppet standing at the bottom.
const props = defineProps({
    id: { type: String, required: true },
    /** The ongoing move, or null to stand still. */
    move: { type: String, default: "idle" },
});

const BOX = 1.4;
// World units the camera shows across (and up); the puppet is SIZE tall.
const SIZE = 100;
const VIEW = SIZE * 1.25;
const FLOOR = 12;
const MAX_DT = 0.05;

const motion = usePreferredReducedMotion();
const reduced = computed(() => motion.value === "reduce");

const canvasEl = ref(null);
const flatRef = ref(null);
// "loading", "3d" or "flat".
const drawn = ref("loading");

let renderer = null;
let castKit = null;
let puppet = null;
let scene = null;
let camera = null;
let frame = 0;
let last = 0;
let resized = null;
let gone = false;

// Drawn only while the pose changes: the loop sleeps once a tick changes
// nothing (standing still) and wake() starts it again.
function loop(now) {
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    if (!puppet.tick(dt)) {
        frame = 0;
        return;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
}

function wake() {
    if (!puppet || frame || gone) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
}

function fit() {
    const { clientWidth: w, clientHeight: h } = canvasEl.value;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
}

/** Frees the 3D puppet's renderer, kit and canvas size watch. */
function teardown() {
    cancelAnimationFrame(frame);
    frame = 0;
    resized?.disconnect();
    puppet?.dispose();
    castKit?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    puppet = castKit = renderer = resized = null;
}

// Anything that fails on the way (no WebGL, three not loading, a GPU that
// can't compile it) leaves the flat CastMember instead.
async function build() {
    try {
        if (!supportsWebGL()) throw new Error("No WebGL");
        const THREE = await loadThree();
        if (gone) return;
        draw3d(THREE);
    } catch {
        teardown();
        drawn.value = "flat";
    }
}

function draw3d(THREE) {
    renderer = new THREE.WebGLRenderer({
        canvas: canvasEl.value,
        alpha: true,
        antialias: true,
    });
    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    );

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(
        -VIEW / 2,
        VIEW / 2,
        VIEW - FLOOR,
        -FLOOR,
        -500,
        500
    );
    camera.position.set(0, 0, 200);

    // A room's everyday daylight, from behind the camera and up to the left.
    const daylight = roomDaylight("");
    const { fill, key, level } = DAYLIGHT_INTENSITY;
    scene.add(
        new THREE.HemisphereLight(daylight.sky, daylight.ground, fill * level)
    );
    const sun = new THREE.DirectionalLight(daylight.key, key * level);
    sun.position.set(-40, 120, 200);
    scene.add(sun);

    castKit = createCastKit(THREE);
    puppet = castKit.castMesh(props.id, { size: SIZE, shadows: false });
    puppet.setReducedMotion(reduced.value);
    puppet.setMove(props.move);
    scene.add(puppet.group);

    drawn.value = "3d";
    // Its first call sizes and draws the puppet.
    resized = new ResizeObserver(fit);
    resized.observe(canvasEl.value);
    wake();
}

watch(
    () => props.move,
    (move) => {
        puppet?.setMove(move);
        wake();
    }
);
watch(reduced, (still) => {
    puppet?.setReducedMotion(still);
    wake();
});

onMounted(build);

onBeforeUnmount(() => {
    gone = true;
    teardown();
});

defineExpose({
    /** Plays a one-shot move (a toot, a gulp) over the ongoing one. */
    play(name) {
        if (puppet) {
            puppet.play(name);
            wake();
        } else {
            flatRef.value?.play?.(name);
        }
    },
});
</script>

<template>
    <span class="cast-puppet" :style="{ '--box': `${BOX}em` }">
        <canvas
            v-show="drawn === '3d'"
            ref="canvasEl"
            class="cast-puppet-canvas"
            aria-hidden="true"
        />
        <CastMember
            v-if="drawn === 'flat'"
            :id="id"
            ref="flatRef"
            class="cast-puppet-flat"
            :move="reduced ? null : move"
        />
    </span>
</template>

<style scoped>
.cast-puppet {
    position: relative;
    display: inline-block;
    width: var(--box);
    height: var(--box);
    line-height: 1;
}

.cast-puppet-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.cast-puppet-flat {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
}
</style>
