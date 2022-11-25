<template>
  <div
      v-if="editor"
      class="rounded-md border border-gray-300 bg-white shadow-sm"
  >
    <WysiwygButton
        icon="P"
        title="set paragraph"
        :is-active="editor.isActive('paragraph')"
        @click.prevent="editor.chain().focus().setParagraph().run()"
    />

    <WysiwygButton
        icon="H2"
        title="toggle h2"
        :is-active="editor.isActive('heading', { level: 2 })"
        @click.prevent="editor.chain().focus().toggleHeading({ level: 2 }).run()"
    />

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

    <WysiwygButton
        icon="UL"
        title="toggle unordered list"
        :is-active="editor.isActive('bulletList')"
        @click.prevent="editor.chain().focus().toggleBulletList().run()"
    />

    <WysiwygButton
        icon="<"
        title="undo last action"
        @click.prevent="editor.chain().focus().undo().run()"
    />

    <WysiwygButton
        icon=">"
        title="redo last action"
        @click.prevent="editor.chain().focus().redo().run()"
    />

    <EditorContent :editor="editor"/>
  </div>
</template>

<script setup>
import {useEditor, EditorContent} from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import {defineProps} from "vue";
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
      class: "prose max-w-full h-48 my-2 mx-5 border-t overflow-y-auto focus:outline-none",
    },
  },
  extensions: [
    StarterKit,
  ],
  onUpdate: () => {
    emit("update:modelValue", editor.value.getHTML());
  },
  content: props.modelValue,
});
</script>
