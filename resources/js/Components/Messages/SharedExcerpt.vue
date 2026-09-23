<script setup>
import { SHARED_MEDIA_WIDTH_CLASS } from "@/Components/Messages/sharedMedia";
import { EXCERPT_LIMIT, stripHtml } from "@/utils/text";
import truncate from "lodash/truncate";
import { computed } from "vue";

// A one-glance caption under shared content in the timeline: the item's own
// description, stripped of markup and cut to a couple of lines. Renders
// nothing when the item has no description.
const props = defineProps({
    text: { type: String, default: null },
});

const excerpt = computed(() =>
    truncate(stripHtml(props.text), {
        length: EXCERPT_LIMIT,
        separator: " ",
        omission: "…",
    })
);
</script>

<template>
    <p
        v-if="excerpt"
        :class="`mt-1 ${SHARED_MEDIA_WIDTH_CLASS} text-sm text-gray-600 dark:text-gray-400`"
    >
        {{ excerpt }}
    </p>
</template>
