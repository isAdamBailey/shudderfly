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

        <g v-if="!isChristmas && !isJuly" id="fly">
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
            <!-- Rotation Animation -->
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="30s"
                repeatCount="indefinite"
            />
            
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
        </g>

        <g v-if="isJuly" id="firework">
            <!-- Rocket body -->
            <rect x="90" y="60" width="20" height="80" fill="#333" />
            
            <!-- Rocket nose cone -->
            <path d="M90 60 L100 45 L110 60 Z" fill="red" />
            
            <!-- Rocket fins -->
            <path d="M90 140 L75 155 L90 155 Z" fill="red" />
            <path d="M110 140 L125 155 L110 155 Z" fill="red" />
            
            <!-- Spark trail -->
            <g id="sparks">
                <!-- Main spark core -->
                <circle cx="100" cy="140" r="4" fill="yellow">
                    <animate attributeName="r" values="4;3;4" dur="0.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="145" r="3" fill="orange">
                    <animate attributeName="r" values="3;2;3" dur="0.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="150" r="3" fill="red">
                    <animate attributeName="r" values="3;2;3" dur="0.3s" repeatCount="indefinite" />
                </circle>
                
                <!-- Spark particles with varied paths -->
                <g id="spark-particles">
                    <!-- Yellow sparks -->
                    <circle cx="95" cy="145" r="1.2" fill="yellow">
                        <animate attributeName="cy" values="145;155" dur="0.4s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="95;93;95" dur="0.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="105" cy="145" r="1.2" fill="yellow">
                        <animate attributeName="cy" values="145;155" dur="0.4s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="105;107;105" dur="0.4s" repeatCount="indefinite" />
                    </circle>
                    
                    <!-- Orange sparks -->
                    <circle cx="98" cy="148" r="1.2" fill="orange">
                        <animate attributeName="cy" values="148;158" dur="0.5s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="98;96;98" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="102" cy="148" r="1.2" fill="orange">
                        <animate attributeName="cy" values="148;158" dur="0.5s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="102;104;102" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                    
                    <!-- Red sparks -->
                    <circle cx="97" cy="146" r="1.2" fill="red">
                        <animate attributeName="cy" values="146;156" dur="0.6s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="97;95;97" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="103" cy="146" r="1.2" fill="red">
                        <animate attributeName="cy" values="146;156" dur="0.6s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="103;105;103" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                    
                    <!-- Additional spark particles -->
                    <circle cx="96" cy="144" r="1" fill="yellow">
                        <animate attributeName="cy" values="144;154" dur="0.45s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="96;94;96" dur="0.45s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="104" cy="144" r="1" fill="yellow">
                        <animate attributeName="cy" values="144;154" dur="0.45s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="104;106;104" dur="0.45s" repeatCount="indefinite" />
                    </circle>
                    
                    <!-- New spark particles -->
                    <circle cx="94" cy="147" r="1" fill="orange">
                        <animate attributeName="cy" values="147;157" dur="0.55s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="94;92;94" dur="0.55s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="106" cy="147" r="1" fill="orange">
                        <animate attributeName="cy" values="147;157" dur="0.55s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="106;108;106" dur="0.55s" repeatCount="indefinite" />
                    </circle>
                    
                    <circle cx="93" cy="149" r="0.8" fill="red">
                        <animate attributeName="cy" values="149;159" dur="0.65s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="93;91;93" dur="0.65s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="107" cy="149" r="0.8" fill="red">
                        <animate attributeName="cy" values="149;159" dur="0.65s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="107;109;107" dur="0.65s" repeatCount="indefinite" />
                    </circle>
                    
                    <!-- Fast moving sparks -->
                    <circle cx="92" cy="143" r="0.7" fill="yellow">
                        <animate attributeName="cy" values="143;153" dur="0.35s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="92;90;92" dur="0.35s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="108" cy="143" r="0.7" fill="yellow">
                        <animate attributeName="cy" values="143;153" dur="0.35s" repeatCount="indefinite" />
                        <animate attributeName="cx" values="108;110;108" dur="0.35s" repeatCount="indefinite" />
                    </circle>
                </g>
            </g>
            
            <!-- Takeoff animation -->
            <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-40"
                dur="2s"
                begin="0s"
                fill="freeze"
            />
            
            <!-- Rotation animation -->
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 100 100"
                to="360 100 100"
                dur="30s"
                begin="2s"
                repeatCount="indefinite"
            />
        </g>
    </svg>
</template>

<script setup>
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const page = usePage();
const isChristmas = computed(() => page.props.theme === 'christmas');
const isJuly = computed(() => page.props.theme === 'fireworks');
</script>
