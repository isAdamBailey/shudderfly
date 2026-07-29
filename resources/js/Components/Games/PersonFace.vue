<script setup>
import { computed, ref } from "vue";
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();

const props = defineProps({
    /** Pupil offset in px, relative to the eye centre. */
    gazeX: { type: Number, default: 0 },
    gazeY: { type: Number, default: 0 },
    /** Leaning-in look: raised brows, squinted eyes, wide mouth. */
    anticipating: { type: Boolean, default: false },
    /** Chomp: squashed mouth, head gulp, crumb burst. */
    gulping: { type: Boolean, default: false },
    /** Bump on every chomp so the burst animation restarts. */
    chompCount: { type: Number, default: 0 },
    /**
     * Chicken pox spots. x/y/size are percentages of the face box, so they
     * ride along with the head bob and stay put once placed.
     */
    poxDots: { type: Array, default: () => [] },
    /**
     * null  -> mouth idles with the chewing animation (Costco Food Poop).
     * true  -> held open. false -> held shut (Brussels Sprout Chicken Pox).
     */
    mouthOpen: { type: Boolean, default: null },
    /** Scales the mouth down as difficulty rises. */
    mouthScale: { type: Number, default: 1 },
    label: { type: String, default: null },
});

const faceEl = ref(null);
const mouthEl = ref(null);

const mouthControlled = computed(() => props.mouthOpen !== null);
const resolvedLabel = computed(
    () => props.label ?? t("games.person_face.default_aria")
);

defineExpose({ faceEl, mouthEl });
</script>

<template>
    <div
        class="person"
        :class="{
            anticipating,
            gulping,
            'mouth-controlled': mouthControlled,
            'mouth-open': mouthControlled && mouthOpen,
        }"
        :aria-label="resolvedLabel"
    >
        <div
            ref="faceEl"
            class="person-face"
            :style="{
                '--gaze-x': `${gazeX}px`,
                '--gaze-y': `${gazeY}px`,
                '--mouth-scale': mouthScale,
            }"
        >
            <span
                class="person-brow person-brow-left"
                aria-hidden="true"
            ></span>
            <span
                class="person-brow person-brow-right"
                aria-hidden="true"
            ></span>
            <span class="person-eye person-eye-left" aria-hidden="true">
                <span class="person-pupil"></span>
            </span>
            <span class="person-eye person-eye-right" aria-hidden="true">
                <span class="person-pupil"></span>
            </span>
            <span
                class="person-cheek person-cheek-left"
                aria-hidden="true"
            ></span>
            <span
                class="person-cheek person-cheek-right"
                aria-hidden="true"
            ></span>
            <span
                v-for="dot in poxDots"
                :key="dot.id"
                class="pox-dot"
                aria-hidden="true"
                :style="{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: `${dot.size}%`,
                    height: `${dot.size}%`,
                }"
            ></span>
            <div class="person-mouth" aria-hidden="true">
                <span class="person-teeth"></span>
                <span class="person-tongue"></span>
                <div ref="mouthEl" class="mouth-hitbox"></div>
            </div>
            <div
                v-if="gulping"
                :key="chompCount"
                class="chomp-burst"
                aria-hidden="true"
            >
                <span></span><span></span><span></span><span></span
                ><span></span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.person {
    /*
     * Sized from the wrapper's own box (height: 100%) rather than viewport
     * units alone, so it shrinks to fit whatever room a short/landscape
     * viewport actually gives it instead of overflowing off-screen. The
     * px/vmin caps just keep it from ballooning on very tall containers.
     */
    position: relative;
    height: min(100%, 320px, 64vmin);
    width: auto;
    aspect-ratio: 300 / 320;
    max-width: min(300px, 64vw);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: headBob 3.6s ease-in-out infinite;
}

.person.gulping {
    animation: headGulp 0.46s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.person-face {
    /* Percentage of .person's own box, so it scales with it directly
     * instead of drifting out of sync via separate viewport units. */
    position: relative;
    width: 73%;
    height: 72%;
    border-radius: 45% 45% 50% 50%;
    border: 4px solid #f2c7a6;
    background: radial-gradient(
            circle at 30% 26%,
            rgba(255, 255, 255, 0.3),
            transparent 36%
        ),
        linear-gradient(180deg, #ffd9bd 0%, #f4be95 100%);
    box-shadow: inset 0 -8px 16px rgba(138, 72, 35, 0.22),
        0 10px 20px rgba(0, 0, 0, 0.34);
}

.person-brow {
    position: absolute;
    top: 22%;
    width: 19%;
    height: 5.5%;
    border-radius: 999px;
    background: #c79b76;
    transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.person-brow-left {
    left: 20%;
    transform: rotate(-7deg);
}

.person-brow-right {
    right: 20%;
    transform: rotate(7deg);
}

.person.anticipating .person-brow-left {
    transform: translateY(-6px) rotate(-15deg);
}

.person.anticipating .person-brow-right {
    transform: translateY(-6px) rotate(15deg);
}

.person-eye {
    position: absolute;
    top: 30%;
    width: 21%;
    height: 18%;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #ffffff 0%, #efe1d4 100%);
    box-shadow: inset 0 2px 5px rgba(96, 48, 24, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: height 0.18s ease;
}

.person-eye-left {
    left: 19%;
}

.person-eye-right {
    right: 19%;
}

.person-pupil {
    width: 46%;
    height: 58%;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 30%, #6a3d2a 0%, #1c0d08 72%);
    transform: translate(var(--gaze-x, 0px), var(--gaze-y, 0px));
    transition: transform 0.12s ease-out;
}

.person-pupil::after {
    content: "";
    position: absolute;
    top: 22%;
    left: 30%;
    width: 26%;
    height: 26%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
}

.person.anticipating .person-eye {
    height: 21%;
}

.person-cheek {
    position: absolute;
    top: 55%;
    width: 17%;
    height: 12%;
    border-radius: 50%;
    background: radial-gradient(
        circle,
        rgba(255, 138, 116, 0.6) 0%,
        transparent 70%
    );
    opacity: 0.45;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.person-cheek-left {
    left: 11%;
}

.person-cheek-right {
    right: 11%;
}

.person.anticipating .person-cheek,
.person.gulping .person-cheek {
    opacity: 0.9;
    transform: scale(1.18);
}

.pox-dot {
    position: absolute;
    z-index: 4;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
        circle at 36% 32%,
        #ff8f8f 0%,
        #e0453f 55%,
        #a51f22 100%
    );
    box-shadow: 0 0 0 2px rgba(255, 170, 160, 0.45),
        inset 0 -1px 2px rgba(90, 10, 10, 0.5);
    animation: poxPop 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.person-mouth {
    /* Percentage of .person-face, matching the eyes/brows/cheeks, so it
     * scales with the head instead of drifting out of proportion via
     * separate viewport units. */
    position: absolute;
    left: 50%;
    top: 69%;
    transform: translate(-50%, -50%);
    width: 53%;
    height: 40%;
    border-radius: 0 0 999px 999px;
    border: 4px solid #340f0f;
    border-top: 0;
    background: radial-gradient(circle at 50% 28%, #170404 0%, #080102 76%);
    overflow: hidden;
    animation: mouthChew 1.45s ease-in-out infinite;
    transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.person.anticipating .person-mouth {
    animation: none;
    transform: translate(-50%, -50%) scaleX(1.08) scaleY(1.4);
}

.person.gulping .person-mouth {
    animation: none;
    transform: translate(-50%, -50%) scaleX(0.94) scaleY(0.5);
}

/*
 * Externally driven mouth (Brussels Sprout Chicken Pox): no idle chew, the
 * open/shut states are the target the player has to time. Anchored to its
 * top edge (instead of the default center) so a wide-open scaleY grows
 * downward only — a centered scale would balloon up into the eyes.
 */
.person.mouth-controlled .person-mouth {
    animation: none;
    transform-origin: 50% 0%;
    transform: translate(-50%, 0) scale(var(--mouth-scale, 1)) scaleX(0.86)
        scaleY(0.24);
}

.person.mouth-controlled.mouth-open .person-mouth {
    transform: translate(-50%, 0) scale(var(--mouth-scale, 1)) scaleX(1.1)
        scaleY(1.45);
}

.person.mouth-controlled.gulping .person-mouth {
    transform: translate(-50%, 0) scale(var(--mouth-scale, 1)) scaleX(0.94)
        scaleY(0.5);
}

.person-teeth {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 82%;
    height: 17%;
    border-radius: 0 0 45% 45%;
    background: linear-gradient(180deg, #fffdf8 0%, #f0e2d2 100%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.person-tongue {
    position: absolute;
    left: 50%;
    bottom: -8%;
    width: 76%;
    height: 52%;
    border-radius: 999px 999px 40% 40%;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #ff7c7c 0%, #e35f72 100%);
    opacity: 0.95;
}

.mouth-hitbox {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    pointer-events: none;
}

.chomp-burst {
    position: absolute;
    left: 50%;
    top: 67%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 5;
}

.chomp-burst span {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: #e8b04b;
    box-shadow: inset 0 0 0 1px rgba(120, 70, 20, 0.45);
    animation: crumbFly 0.5s ease-out forwards;
}

.chomp-burst span:nth-child(1) {
    --tx: -36px;
    --ty: -28px;
}
.chomp-burst span:nth-child(2) {
    --tx: 34px;
    --ty: -24px;
}
.chomp-burst span:nth-child(3) {
    --tx: -20px;
    --ty: -40px;
}
.chomp-burst span:nth-child(4) {
    --tx: 22px;
    --ty: -38px;
}
.chomp-burst span:nth-child(5) {
    --tx: 2px;
    --ty: -46px;
}

@keyframes mouthChew {
    0% {
        transform: translate(-50%, -50%) scaleY(1);
    }
    45% {
        transform: translate(-50%, -50%) scaleY(0.9);
    }
    100% {
        transform: translate(-50%, -50%) scaleY(1);
    }
}

@keyframes headBob {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-5px);
    }
}

@keyframes headGulp {
    0% {
        transform: translateY(0) scale(1, 1);
    }
    35% {
        transform: translateY(7px) scale(1.05, 0.94);
    }
    70% {
        transform: translateY(-2px) scale(0.98, 1.03);
    }
    100% {
        transform: translateY(0) scale(1, 1);
    }
}

@keyframes crumbFly {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1) rotate(0deg);
    }
    100% {
        opacity: 0;
        transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.4)
            rotate(140deg);
    }
}

@keyframes poxPop {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.2);
    }
    60% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.35);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .person,
    .person.gulping,
    .person-mouth {
        animation: none;
    }

    .person-mouth,
    .person-pupil,
    .person-brow,
    .person-cheek,
    .person-eye {
        transition: none;
    }

    .chomp-burst span {
        animation: none;
        opacity: 0;
    }

    .pox-dot {
        animation: none;
    }
}
</style>
