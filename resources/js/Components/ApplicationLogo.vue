<template>
    <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
    >
        <!-- Outer Circle -->
        <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="black"
            stroke-width="10"
        />
        <circle cx="50" cy="50" r="5" fill="white" />
        <circle cx="150" cy="50" r="5" fill="white" />
        <circle cx="50" cy="150" r="5" fill="white" />
        <circle cx="150" cy="150" r="5" fill="white" />
        <circle cx="100" cy="30" r="5" fill="white" />
        <circle cx="100" cy="170" r="5" fill="white" />
        <circle cx="30" cy="100" r="5" fill="white" />
        <circle cx="170" cy="100" r="5" fill="white" />

        <g v-if="!isChristmas" id="fly">
            <g id="fly-body-and-wings">
                <g id="fly-wings">
                    <ellipse
                        cx="70"
                        cy="85"
                        rx="35"
                        ry="15"
                        fill="lightgray"
                        opacity="0.7"
                    />
                    <ellipse
                        cx="130"
                        cy="85"
                        rx="35"
                        ry="15"
                        fill="lightgray"
                        opacity="0.7"
                    />
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,-2; 0,2; 0,-2"
                        dur="0.1s"
                        repeatCount="indefinite"
                    />
                </g>

                <g id="fly-body">
                    <ellipse cx="100" cy="100" rx="30" ry="60" fill="black" />
                    <circle cx="100" cy="60" r="20" fill="black" />
                    <circle cx="90" cy="55" r="7" fill="blue" />
                    <circle cx="110" cy="55" r="7" fill="blue" />
                    <circle cx="90" cy="55" r="3" fill="white" />
                    <circle cx="110" cy="55" r="3" fill="white" />
                    <path
                        d="M 90 70 Q 100 80 110 70"
                        stroke="white"
                        stroke-width="2"
                        fill="none"
                    />
                </g>
            </g>
            <!-- Add rotation animation -->
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="30s"
                repeatCount="indefinite"
            />
        </g>

        <g v-if="isChristmas" id="snowman">
            <!-- Bottom snowball -->
            <circle
                cx="100"
                cy="140"
                r="30"
                fill="white"
                stroke="#e0e0e0"
                stroke-width="2"
            />

            <!-- Middle snowball -->
            <circle
                cx="100"
                cy="100"
                r="22"
                fill="white"
                stroke="#e0e0e0"
                stroke-width="2"
            />

            <!-- Head -->
            <circle
                cx="100"
                cy="70"
                r="15"
                fill="white"
                stroke="#e0e0e0"
                stroke-width="2"
            />

            <!-- Top Hat -->
            <rect x="85" y="52" width="30" height="5" fill="black" />
            <!-- Hat brim adjusted -->
            <rect x="87.5" y="40" width="25" height="12" fill="black" />
            <!-- Hat body adjusted -->
            <rect x="87.5" y="39" width="25" height="2" fill="#333" />

            <!-- Eyes -->
            <circle cx="95" cy="65" r="2" fill="black" />
            <circle cx="105" cy="65" r="2" fill="black" />

            <!-- Carrot nose -->
            <path
                d="M 100 70 L 107 71"
                fill="none"
                stroke="#ff8c00"
                stroke-width="2"
                stroke-linecap="round"
            />

            <!-- Smile -->
            <path
                d="M 95 75 Q 100 78 105 75"
                fill="none"
                stroke="black"
                stroke-width="1"
            />

            <!-- Buttons -->
            <circle cx="100" cy="90" r="2" fill="black" />
            <circle cx="100" cy="100" r="2" fill="black" />
            <circle cx="100" cy="110" r="2" fill="black" />

            <!-- Left arm -->
            <path
                d="M 78 100 L 60 90"
                fill="none"
                stroke="brown"
                stroke-width="2"
            />
            <path
                d="M 60 90 L 57 95"
                fill="none"
                stroke="brown"
                stroke-width="1.5"
            />
            <path
                d="M 60 90 L 62 95"
                fill="none"
                stroke="brown"
                stroke-width="1.5"
            />

            <!-- Right arm -->
            <path
                d="M 122 100 L 140 90"
                fill="none"
                stroke="brown"
                stroke-width="2"
            />
            <path
                d="M 140 90 L 137 95"
                fill="none"
                stroke="brown"
                stroke-width="1.5"
            />
            <path
                d="M 140 90 L 142 95"
                fill="none"
                stroke="brown"
                stroke-width="1.5"
            />

            <!-- Scarf -->
            <path
                d="M 87 80 Q 100 85 113 80"
                fill="none"
                stroke="red"
                stroke-width="4"
            />
            <path
                d="M 87 80 L 92 95"
                fill="none"
                stroke="red"
                stroke-width="4"
            />

            <!-- Rotation Animation -->
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="30s"
                repeatCount="indefinite"
            />
        </g>
    </svg>
</template>

<script setup>
import { computed } from "vue";

const isChristmas = computed(() => {
    const today = new Date();
    return today.getMonth() === 11; // December
});
</script>
