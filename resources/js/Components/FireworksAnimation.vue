<template>
    <div :class="{ fireworks: $page.props.theme === 'fireworks' }">
        <div class="spark-1"></div>
        <div class="spark-2"></div>
        <div class="spark-3"></div>
        <div class="spark-4"></div>
        <div class="spark-5"></div>
        <div class="burst red" style="left: 25%; top: 50%;"></div>
        <div class="burst blue" style="left: 50%; top: 50%;"></div>
        <div class="burst green" style="left: 75%; top: 50%;"></div>
        <div class="burst purple" style="left: 15%; top: 50%;"></div>
        <div class="burst orange" style="left: 85%; top: 50%;"></div>
        <div class="content">
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
</script>

<style scoped>
    /* Fireworks Animation */
    .fireworks {
        position: relative;
        overflow: hidden;
    }

    .fireworks .spark-1,
    .fireworks .spark-2,
    .fireworks .spark-3,
    .fireworks .spark-4,
    .fireworks .spark-5 {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0) 70%
        );
        box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7),
            0 0 0 0 rgba(255, 255, 255, 0.7), 0 0 0 0 rgba(0, 0, 255, 0.7);
        animation: fireworks 2s infinite;
        z-index: 1;
    }

    .fireworks .content {
        position: relative;
        z-index: 2;
    }

    .fireworks .spark-1 {
        left: 10%;
        top: 50%;
        animation-delay: 0s;
    }

    .fireworks .spark-2 {
        left: 25%;
        top: 50%;
        animation-delay: 0.5s;
    }

    .fireworks .spark-3 {
        left: 50%;
        top: 50%;
        animation-delay: 1s;
    }

    .fireworks .spark-4 {
        left: 75%;
        top: 50%;
        animation-delay: 1.5s;
    }

    .fireworks .spark-5 {
        left: 90%;
        top: 50%;
        animation-delay: 0.75s;
    }

    @keyframes fireworks {
        0% {
            transform: translate(0, 0) scale(1);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7),
                0 0 0 0 rgba(255, 255, 255, 0.7), 0 0 0 0 rgba(0, 0, 255, 0.7);
        }
        50% {
            transform: translate(0, -40px) scale(1.5);
            box-shadow: 0 0 0 30px rgba(255, 0, 0, 0),
                0 0 0 60px rgba(255, 255, 255, 0), 0 0 0 90px rgba(0, 0, 255, 0);
        }
        100% {
            transform: translate(0, 0) scale(1);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0),
                0 0 0 0 rgba(255, 255, 255, 0), 0 0 0 0 rgba(0, 0, 255, 0);
        }
    }

    /* Add circular burst elements */
    .fireworks .burst {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0) 70%
        );
        animation: burst 2s infinite;
    }

    .fireworks .burst.red {
        background: radial-gradient(
            circle,
            rgba(255, 0, 0, 0.8) 0%,
            rgba(255, 0, 0, 0) 70%
        );
    }

    .fireworks .burst.blue {
        background: radial-gradient(
            circle,
            rgba(0, 0, 255, 0.8) 0%,
            rgba(0, 0, 255, 0) 70%
        );
    }

    .fireworks .burst.green {
        background: radial-gradient(
            circle,
            rgba(0, 255, 0, 0.8) 0%,
            rgba(0, 255, 0, 0) 70%
        );
    }

    .fireworks .burst.purple {
        background: radial-gradient(
            circle,
            rgba(128, 0, 128, 0.8) 0%,
            rgba(128, 0, 128, 0) 70%
        );
    }

    .fireworks .burst.orange {
        background: radial-gradient(
            circle,
            rgba(255, 165, 0, 0.8) 0%,
            rgba(255, 165, 0, 0) 70%
        );
    }

    @keyframes burst {
        0% {
            width: 6px;
            height: 6px;
            opacity: 1;
        }
        50% {
            width: 60px;
            height: 60px;
            opacity: 0.5;
        }
        100% {
            width: 6px;
            height: 6px;
            opacity: 0;
        }
    }
</style> 