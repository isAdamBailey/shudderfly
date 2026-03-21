<template>
    <div v-if="visible" class="fart-overlay">
        <svg
            class="fart-svg"
            viewBox="0 0 200 140"
            xmlns="http://www.w3.org/2000/svg"
        >
            <!-- main cloud puffs -->
            <circle cx="70"  cy="80" r="35" fill="url(#fartGrad)"  opacity="0.7" />
            <circle cx="110" cy="75" r="40" fill="url(#fartGrad)"  opacity="0.65" />
            <circle cx="90"  cy="90" r="30" fill="url(#fartGrad2)" opacity="0.6" />
            <circle cx="55"  cy="70" r="25" fill="url(#fartGrad)"  opacity="0.55" />
            <circle cx="130" cy="85" r="28" fill="url(#fartGrad2)" opacity="0.5" />
            <circle cx="140" cy="65" r="22" fill="url(#fartGrad)"  opacity="0.45" />
            <circle cx="100" cy="60" r="30" fill="url(#fartGrad2)" opacity="0.5" />
            <circle cx="80"  cy="95" r="20" fill="url(#fartGrad)"  opacity="0.4" />

            <!-- stink lines -->
            <path d="M60,45 Q55,35 60,25" fill="none" stroke="#8ba834" stroke-width="2.5" stroke-linecap="round" opacity="0.6">
                <animate attributeName="d" values="M60,45 Q55,35 60,25;M60,45 Q65,35 60,25;M60,45 Q55,35 60,25" dur="1.5s" repeatCount="indefinite" />
            </path>
            <path d="M95,40 Q90,28 95,18" fill="none" stroke="#8ba834" stroke-width="2.5" stroke-linecap="round" opacity="0.6">
                <animate attributeName="d" values="M95,40 Q90,28 95,18;M95,40 Q100,28 95,18;M95,40 Q90,28 95,18" dur="1.8s" repeatCount="indefinite" />
            </path>
            <path d="M130,48 Q125,36 130,26" fill="none" stroke="#8ba834" stroke-width="2.5" stroke-linecap="round" opacity="0.5">
                <animate attributeName="d" values="M130,48 Q125,36 130,26;M130,48 Q135,36 130,26;M130,48 Q125,36 130,26" dur="1.3s" repeatCount="indefinite" />
            </path>

            <defs>
                <radialGradient id="fartGrad">
                    <stop offset="0%"   stop-color="#d4e157" stop-opacity="0.6" />
                    <stop offset="100%" stop-color="#9e9d24" stop-opacity="0.2" />
                </radialGradient>
                <radialGradient id="fartGrad2">
                    <stop offset="0%"   stop-color="#c0ca33" stop-opacity="0.5" />
                    <stop offset="100%" stop-color="#827717" stop-opacity="0.15" />
                </radialGradient>
            </defs>
        </svg>
    </div>
</template>

<script setup>
defineProps({
    visible: { type: Boolean, default: false },
});
</script>

<style scoped>
.fart-overlay {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 40vmin;
    z-index: 15;
    pointer-events: none;
    animation: fartAppear 0.6s ease-out forwards;
}

.fart-svg {
    width: 100%;
    height: auto;
    display: block;
    animation: fartPulse 0.8s ease-in-out infinite alternate;
}

@keyframes fartAppear {
    0%   { opacity: 0; transform: translateY(-50%) scale(0.3); }
    60%  { opacity: 1; transform: translateY(-50%) scale(1.15); }
    100% { opacity: 0.9; transform: translateY(-50%) scale(1); }
}

@keyframes fartPulse {
    0%   { transform: scale(1)    rotate(-2deg); }
    100% { transform: scale(1.08) rotate(2deg); }
}
</style>
