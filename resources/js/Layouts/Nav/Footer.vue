<template>
    <footer class="mt-auto border-t border-gray-100 bg-theme-primary">
        <div class="max-w-7xl mx-auto pt-12 lg:pt-20 pb-12">
            <div
                class="text-center underline hover:font-bold text-theme-secondary pb-8"
            >
                <a :href="route('rules')">Rules and Instructions</a>
            </div>
            <div class="text-center text-sm font-bold text-theme-secondary">
                &copy; {{ new Date().getFullYear() }} Shudderfly
            </div>
        </div>
    </footer>
</template>
