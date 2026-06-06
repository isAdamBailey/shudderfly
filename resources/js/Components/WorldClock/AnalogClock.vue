<script>
// Module-scoped so every AnalogClock instance gets a distinct id (the gradient
// def id must be unique across all clocks on the page).
let uidCounter = 0;
</script>

<script setup>
import { useClockTime } from "@/composables/useClockTime";
import { useGlobalTimer } from "@/composables/useGlobalTimer";
import { getFacePreset } from "@/world-clock/presets/faces";
import { getHandPreset } from "@/world-clock/presets/hands";
import { computed, toRef } from "vue";

const props = defineProps({
  timezone: { type: String, required: true },
  cityName: { type: String, default: "" },
  size: { type: Number, default: 280 },
  facePreset: { type: String, default: "classic" },
  handPreset: { type: String, default: "classic" },
  numerals: { type: String, default: "arabic" }, // 'arabic' | 'roman' | 'none'
  showSeconds: { type: Boolean, default: true },
  secondHandMode: { type: String, default: "smooth" } // 'smooth' | 'tick'
});

// Fixed deep-red countdown pie, shared by every clock via the global timer.
// Drawn before the ticks/numerals/hands so they stay visible on top.
const TIMER_COLOR = "#b91c1c";
const { active: timerActive, fraction: timerFraction } = useGlobalTimer();

// Unique id so multiple clocks don't collide on gradient defs.
const uid = `wc-${(uidCounter += 1)}`;

const face = computed(() => getFacePreset(props.facePreset));
const hand = computed(() => getHandPreset(props.handPreset));
const numeralStyle = computed(() => props.numerals || face.value.numerals);

const CENTER = 50;
const { hours, minutes, seconds, milliseconds } = useClockTime(
  toRef(props, "timezone")
);

// Time-timer pie: a wedge from 12 o'clock spanning the remaining time, which
// shrinks back toward 12 as the countdown runs. Maps to the 60-minute dial.
const TIMER_RADIUS = 44;
const timerWedge = computed(() => {
  if (!timerActive.value) return null;
  const f = Math.max(0, Math.min(1, timerFraction.value));
  if (f <= 0) return null;
  if (f >= 1) return { full: true };
  const angle = f * 360;
  const rad = ((angle - 90) * Math.PI) / 180;
  const endX = CENTER + TIMER_RADIUS * Math.cos(rad);
  const endY = CENTER + TIMER_RADIUS * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  return {
    full: false,
    d: `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - TIMER_RADIUS} A ${TIMER_RADIUS} ${TIMER_RADIUS} 0 ${largeArc} 1 ${endX} ${endY} Z`
  };
});

const hourAngle = computed(() => (hours.value % 12) * 30);
const minuteAngle = computed(() => minutes.value * 6 + seconds.value * 0.1);
const secondAngle = computed(() => {
  const s =
    props.secondHandMode === "smooth"
      ? seconds.value + milliseconds.value / 1000
      : seconds.value;
  return s * 6;
});

// 60 tick marks; every 5th is a major tick.
const ticks = computed(() => {
  const marks = [];
  for (let i = 0; i < 60; i += 1) {
    const isMajor = i % 5 === 0;
    if (!isMajor && !face.value.showMinorTicks) continue;
    const angle = (i * 6 * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    const outer = 47;
    const inner = isMajor ? 39 : 43;
    marks.push({
      key: i,
      x1: CENTER + sin * outer,
      y1: CENTER + cos * outer,
      x2: CENTER + sin * inner,
      y2: CENTER + cos * inner,
      color: isMajor ? face.value.tickColor : face.value.tickMinorColor,
      width: isMajor ? 1.4 : 0.6
    });
  }
  return marks;
});

const ROMAN = [
  "XII",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI"
];

const numeralLabels = computed(() => {
  if (numeralStyle.value === "none") return [];
  const radius = 37;
  return Array.from({ length: 12 }, (_, idx) => {
    const hour = idx === 0 ? 12 : idx;
    const angle = (idx * 30 * Math.PI) / 180;
    return {
      key: idx,
      x: CENTER + Math.sin(angle) * radius,
      y: CENTER - Math.cos(angle) * radius,
      label: numeralStyle.value === "roman" ? ROMAN[idx] : String(hour)
    };
  });
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="cityName ? `Clock for ${cityName}` : 'Analog clock'"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient
        v-if="face.gradient"
        :id="`${uid}-grad`"
        cx="50%"
        cy="45%"
        r="60%"
      >
        <stop offset="0%" :stop-color="face.gradient[0]" />
        <stop offset="100%" :stop-color="face.gradient[1]" />
      </radialGradient>
    </defs>

    <!-- Face background -->
    <circle
      :cx="CENTER"
      :cy="CENTER"
      r="48"
      :fill="face.gradient ? `url(#${uid}-grad)` : face.faceFill"
    />

    <!-- Countdown timer pie (shared, always deep red) -->
    <template v-if="timerWedge">
      <circle
        v-if="timerWedge.full"
        :cx="CENTER"
        :cy="CENTER"
        :r="TIMER_RADIUS"
        :fill="TIMER_COLOR"
      />
      <path v-else :d="timerWedge.d" :fill="TIMER_COLOR" />
    </template>

    <!-- Rim -->
    <circle
      :cx="CENTER"
      :cy="CENTER"
      r="48"
      fill="none"
      :stroke="face.rimColor"
      :stroke-width="face.rimWidth"
    />

    <!-- Tick marks -->
    <line
      v-for="tick in ticks"
      :key="`tick-${tick.key}`"
      :x1="tick.x1"
      :y1="tick.y1"
      :x2="tick.x2"
      :y2="tick.y2"
      :stroke="tick.color"
      :stroke-width="tick.width"
      stroke-linecap="round"
    />

    <!-- Numerals -->
    <text
      v-for="numeral in numeralLabels"
      :key="`num-${numeral.key}`"
      :x="numeral.x"
      :y="numeral.y"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="face.numeralColor"
      :font-family="face.numeralFont"
      font-size="9"
      font-weight="600"
      class="wc-numeral"
    >
      {{ numeral.label }}
    </text>

    <!-- Hands -->
    <g :transform="`translate(${CENTER} ${CENTER}) rotate(${hourAngle})`">
      <path :d="hand.hour" :fill="face.handColor" />
    </g>
    <g :transform="`translate(${CENTER} ${CENTER}) rotate(${minuteAngle})`">
      <path :d="hand.minute" :fill="face.handColor" />
    </g>
    <g
      v-if="showSeconds"
      :transform="`translate(${CENTER} ${CENTER}) rotate(${secondAngle})`"
    >
      <path :d="hand.second" :fill="face.secondColor" />
    </g>

    <!-- Center cap -->
    <circle :cx="CENTER" :cy="CENTER" r="2.6" :fill="face.capColor" />
  </svg>
</template>

<style scoped>
.wc-numeral {
  user-select: none;
}
</style>
