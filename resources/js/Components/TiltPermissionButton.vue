<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { useDeviceOrientationPermission } from "@/composables/useDeviceOrientationPermission";
import { usePreferredReducedMotion } from "@vueuse/core";
import { computed } from "vue";

const { t } = useTranslations();
const { needsPermission, request } = useDeviceOrientationPermission();

// Both consumers zero the tilt out under reduced motion, so asking for the
// sensor would buy a permission prompt and nothing else.
const prefersReducedMotion = usePreferredReducedMotion();
const offerTilt = computed(
    () => needsPermission.value && prefersReducedMotion.value !== "reduce"
);
</script>

<template>
    <!-- Renders on iOS only, and only until the sheet has been answered: every
         other engine delivers `deviceorientation` unprompted and never sees
         this. Tapping it is the user gesture Safari demands. -->
    <button
        v-if="offerTilt"
        type="button"
        class="tilt-permission"
        @click="request"
    >
        <i class="ri-compass-3-line" aria-hidden="true"></i>
        {{ t("general.enable_tilt") }}
    </button>
</template>

<style scoped>
.tilt-permission {
    /* Both callers want the same top-right placement, so it lives here rather
       than being reinvented at each one; only stacking differs, via the
       --tilt-chip-z custom property. */
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: var(--tilt-chip-z, 2);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    border-radius: 9999px;
    background: rgb(0 0 0 / 0.55);
    padding: 0.35rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
}

.tilt-permission:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 3px;
}
</style>
