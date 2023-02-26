<template>
    <div
        v-if="editor"
        class="rounded-md text-dark-800 dark:text-white border border-gray-300 bg-white dark:bg-gray-800 shadow-sm"
    >
        <WysiwygButton
            icon="B"
            title="toggle bold"
            :is-active="editor.isActive('bold')"
            @click.prevent="editor.chain().focus().toggleBold().run()"
        />

        <WysiwygButton
            icon="I"
            title="toggle italic"
            :is-active="editor.isActive('italic')"
            @click.prevent="editor.chain().focus().toggleItalic().run()"
        />

        <EditorContent :editor="editor" />
    </div>
</template>

<script setup>
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { defineProps } from "vue";
import WysiwygButton from "@/Components/WysiwygButton.vue";

const emit = defineEmits(["update:modelValue"]);

const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
});

const editor = useEditor({
    editorProps: {
        attributes: {
            class: "prose dark:text-white max-w-full h-48 my-2 mx-5 border-t overflow-y-auto focus:outline-none",
        },
    },
    extensions: [StarterKit],
    onUpdate: () => {
        emit("update:modelValue", editor.value.getHTML());
    },
    content: props.modelValue,
});
</script>
