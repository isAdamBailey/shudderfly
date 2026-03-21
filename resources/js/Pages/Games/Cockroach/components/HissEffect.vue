<template>
    <div class="hiss-effect">HISSSSS!</div>
</template>

<style scoped>
.hiss-effect {
    position: absolute;
    top: -20%;
    right: -10%;
    font-size: 2.5vmin;
    font-weight: 900;
    color: #ffcc00;
    text-shadow:
        -1px -1px 0 #333,
        1px -1px 0 #333,
        -1px 1px 0 #333,
        1px 1px 0 #333,
        0 0 8px rgba(255, 200, 0, 0.6);
    pointer-events: none;
    animation: hissPop 0.85s ease-out forwards;
    z-index: 30;
    white-space: nowrap;
}

@keyframes hissPop {
    0%   { opacity: 1; transform: scale(0.5) translateY(0); }
    50%  { opacity: 1; transform: scale(1.3) translateY(-30%); }
    100% { opacity: 0; transform: scale(1)   translateY(-60%); }
}
</style>
