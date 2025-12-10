<script setup>
import { computed } from 'vue';
import { getAvatarById } from '@/constants/avatars';

const props = defineProps({
    user: {
        type: Object,
        default: null,
    },
    avatar: {
        type: String,
        default: null,
    },
    size: {
        type: String,
        default: 'md',
        validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value),
    },
});

const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
};

const avatarId = computed(() => {
    if (props.avatar) {
        return props.avatar;
    }
    if (props.user?.avatar) {
        return props.user.avatar;
    }
    return null;
});

const avatarData = computed(() => {
    if (avatarId.value) {
        return getAvatarById(avatarId.value);
    }
    return null;
});

const initials = computed(() => {
    if (!props.user?.name) {
        return '?';
    }
    const name = props.user.name.trim();
    if (!name) {
        return '?';
    }
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
});

const initialsUrl = computed(() => {
    if (!props.user) {
        return null;
    }
    if (props.user.avatar_url && props.user.avatar_url.startsWith('http')) {
        return props.user.avatar_url;
    }
    const colors = [
        '6366f1', '8b5cf6', 'ec4899', 'f59e0b',
        '10b981', '06b6d4', 'f97316', '84cc16',
    ];
    const colorIndex = props.user.id ? (props.user.id % colors.length) : 0;
    const backgroundColor = colors[colorIndex];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials.value)}&background=${backgroundColor}&color=ffffff&size=100&bold=true`;
});

const showInitials = computed(() => {
    return !avatarData.value;
});

const sizePixels = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
};

const svgWithDimensions = computed(() => {
    if (!avatarData.value) return null;
    const svg = avatarData.value.svg;
    const size = sizePixels[props.size] || 40;
    // Ensure SVG has explicit width and height for Safari iOS compatibility
    if (svg.includes('viewBox') && !svg.includes('width=')) {
        return svg.replace(
            /<svg([^>]*)>/,
            `<svg$1 width="${size}" height="${size}">`
        );
    }
    return svg;
});
</script>

<template>
    <div
        :class="[
            sizeClasses[size],
            'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
        ]"
    >
        <div
            v-if="avatarData && !showInitials && svgWithDimensions"
            :class="sizeClasses[size]"
            class="rounded-full flex items-center justify-center"
            v-html="svgWithDimensions"
        ></div>

        <img
            v-else-if="initialsUrl"
            :src="initialsUrl"
            :alt="initials"
            class="w-full h-full object-cover rounded-full"
            loading="eager"
            decoding="async"
        />

        <span
            v-else
            class="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-full"
        >
            {{ initials }}
        </span>
    </div>
</template>

