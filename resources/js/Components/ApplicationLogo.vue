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

        <!-- Fly Group: Positioned at (100, 100) and Rotating Around its Own Center -->
        <g id="fly">
            <g id="fly-body-and-wings">
                <!-- Fly Wings -->
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

                <!-- Fly Body -->
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
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,-2; 0,2; 0,-2"
                        dur="0.3s"
                        repeatCount="indefinite"
                    />
                </g>
            </g>

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
