<template>
    <footer class="mt-auto border-t border-gray-100 bg-rainbow">
        <FireworksAnimation>
            <div class="max-w-7xl mx-auto pt-12 lg:pt-20 pb-12">
                <div
                    class="text-center underline hover:font-bold text-gray-100 pb-8"
                >
                    <a :href="route('rules')">Rules and Instructions</a>
                </div>
                <div class="text-center text-sm font-bold text-gray-100">
                    &copy; {{ new Date().getFullYear() }} Shudderfly
                </div>
            </div>
        </FireworksAnimation>
    </footer>
</template>

<script setup>
import FireworksAnimation from "@/Components/FireworksAnimation.vue";
</script>
