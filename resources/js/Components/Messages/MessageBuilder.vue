<script setup>
/* global route */
import SpeakButton from "@/Components/SpeakButton.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import UserTagList from "@/Components/UserTagList.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { router, useForm } from "@inertiajs/vue3";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

// Organized by semantic/functional categories for AAC
// "people" holds only person words (pronouns live in commonStarters instead)
const people = [
    "Mom",
    "Dad",
    "sister",
    "brother",
    "grandma",
    "grandpa",
    "friend",
    "teacher",
];
const bodyParts = [
    "my tummy",
    "my head",
    "my legs",
    "my back",
    "my throat",
    "my ear",
    "my nose",
    "my feet",
    "my belly button",
];
// "actions" holds action verbs only (am/is moved out as state-of-being, not actions)
const actions = [
    "hurt",
    "hurts",
    "need",
    "want",
    "love",
    "like",
    "feel",
    "go",
    "stop",
    "play",
    "dance",
    "wiggle",
    "giggle",
];
const feelings = [
    "happy",
    "sad",
    "tired",
    "scared",
    "sick",
    "good",
    "bad",
    "excited",
    "hungry",
    "thirsty",
    "silly",
];
const descriptors = ["very", "really", "a little", "so much", "not"];
const commonStarters = [
    "I want",
    "I need",
    "I feel",
    "I am",
    "I like",
    "I love",
    "I have",
    "I want to",
    "I need to",
];
const things = [
    "a hug",
    "a snack",
    "a drink",
    "a break",
    "a toy",
    "a blanket",
    "some food",
    "some water",
    "some medicine",
    "some rest",
    "some help",
    "food",
    "water",
    "medicine",
    "rest",
    "help",
    "the bathroom",
    "my bed",
    "a silly joke",
];
const quickPhrases = [
    "I love you",
    "thank you",
    "please help",
    "I'm okay",
    "yes",
    "no",
    "let's play!",
    "I'm silly!",
];

const selection = ref([]);
const inputValue = ref("");
// Preview uses inputValue as source of truth, with selection as fallback for compatibility
const preview = computed(() => {
    return inputValue.value.trim() || selection.value.join(" ").trim();
});
const keyboardInputRef = ref(null);

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

// Compact category toolbar: each entry is one icon that opens the shared pane
// below the keyboard. "tools" is the actions pane ("Things you can do"); the
// rest are AAC word/phrase groups. Category colors are kept (Fitzgerald-style
// coding aids AAC users) but darkened to -700 so white chip text clears WCAG
// large-text contrast (>=3:1).
const wordCategories = [
    {
        key: "quick",
        icon: "ri-chat-quote-fill",
        label: t("flyout.quick_messages"),
        chip: "bg-blue-700 hover:bg-blue-800",
        tint: "text-blue-600 dark:text-blue-300",
        type: "phrase",
        items: quickPhrases,
    },
    {
        key: "starters",
        icon: "ri-play-circle-fill",
        label: t("flyout.common_starters"),
        chip: "bg-teal-700 hover:bg-teal-800",
        tint: "text-teal-600 dark:text-teal-300",
        type: "phrase",
        items: commonStarters,
    },
    {
        key: "things",
        icon: "ri-gift-fill",
        label: t("flyout.things_i_need"),
        chip: "bg-orange-700 hover:bg-orange-800",
        tint: "text-orange-600 dark:text-orange-300",
        type: "phrase",
        items: things,
    },
    {
        key: "people",
        icon: "ri-user-fill",
        label: t("flyout.people"),
        chip: "bg-purple-700 hover:bg-purple-800",
        tint: "text-purple-600 dark:text-purple-300",
        type: "word",
        items: people,
    },
    {
        key: "body",
        icon: "ri-body-scan-fill",
        label: t("flyout.body_parts"),
        chip: "bg-red-700 hover:bg-red-800",
        tint: "text-red-600 dark:text-red-300",
        type: "phrase",
        items: bodyParts,
    },
    {
        key: "actions",
        icon: "ri-run-fill",
        label: t("flyout.actions"),
        chip: "bg-green-700 hover:bg-green-800",
        tint: "text-green-600 dark:text-green-300",
        type: "word",
        items: actions,
    },
    {
        key: "feelings",
        icon: "ri-emotion-happy-fill",
        label: t("flyout.feelings"),
        chip: "bg-yellow-700 hover:bg-yellow-800",
        tint: "text-yellow-600 dark:text-yellow-300",
        type: "word",
        items: feelings,
    },
    {
        key: "howmuch",
        icon: "ri-contrast-fill",
        label: t("flyout.how_much"),
        chip: "bg-indigo-700 hover:bg-indigo-800",
        tint: "text-indigo-600 dark:text-indigo-300",
        type: "word",
        items: descriptors,
    },
];

const toolbar = [
    {
        key: "tools",
        icon: "ri-tools-fill",
        label: t("builder.actions"),
        tint: "text-slate-700 dark:text-slate-200",
    },
    ...wordCategories,
];

// Which pane is expanded. Default to Quick messages so content is visible the
// moment the keyboard opens; clicking the active icon collapses the pane.
const activeCategory = ref("quick");
const activePane = computed(() =>
    wordCategories.find((c) => c.key === activeCategory.value)
);

function selectCategory(key) {
    activeCategory.value = activeCategory.value === key ? null : key;
}

function handleChip(category, item) {
    if (category.type === "phrase") {
        addPhrase(item);
        if (item) speak(item);
    } else {
        addWord(item);
    }
}
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

const form = useForm({
    message: "",
    tagged_user_ids: [],
});

const props = defineProps({
    users: {
        type: Array,
        default: () => [],
    },
    mode: {
        type: String,
        default: "message",
        validator: (value) => ["message", "comment"].includes(value),
    },
    messageId: {
        type: Number,
        default: null,
    },
});

const emit = defineEmits(["messagePosted", "commentPosted"]);

const isCommentMode = computed(() => props.mode === "comment");

const FAVORITES_KEY = "message_builder_favorites_v1";
const MAX_FAVORITES = 5;
const favorites = ref([]);
const addFeedback = ref(false);
const justAdded = ref(null);

// User tagging autocomplete
const showUserSuggestions = ref(false);
const userSuggestions = ref([]);
const selectedSuggestionIndex = ref(-1);
const mentionQuery = ref("");
const mentionStartPos = ref(-1);
// Track user IDs for mentions: maps mention text (e.g., "@Colin Lowe") to user ID
const mentionUserIds = ref(new Map());
const isAtMax = computed(() => {
    const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
    return len >= MAX_FAVORITES;
});

const canSaveFavorite = computed(() => {
    const hasPreview =
        typeof preview.value === "string" && preview.value.trim().length > 0;
    const hasInputValue =
        typeof inputValue.value === "string" &&
        inputValue.value.trim().length > 0;
    const hasSelection = Array.isArray(selection.value)
        ? selection.value.length > 0
        : false;
    const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
    return (hasPreview || hasInputValue || hasSelection) && len < MAX_FAVORITES;
});

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) || [];
            const arr = Array.isArray(parsed)
                ? parsed
                : Object.values(parsed || {});
            favorites.value = arr.slice(0, MAX_FAVORITES);
        } else {
            favorites.value = [];
        }
    } catch (e) {
        favorites.value = [];
    }
}

function saveFavorites() {
    try {
        const arr = Array.isArray(favorites.value)
            ? favorites.value.slice(0, MAX_FAVORITES)
            : [];
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
    } catch (e) {
        //
    }
}

function addFavorite() {
    if (!canSaveFavorite.value) return;
    // Use inputValue if it has content, otherwise use preview
    // This ensures typed text is saved correctly
    const textToSave = inputValue.value.trim() || preview.value.trim() || "";
    if (!textToSave) return;

    // Normalize the text (remove extra spaces) for comparison
    const normalizedText = textToSave.split(/\s+/).join(" ");
    const alreadyExists = favorites.value.some(
        (fav) => fav.split(/\s+/).join(" ") === normalizedText
    );

    if (!alreadyExists) {
        favorites.value.unshift(normalizedText);
        if (favorites.value.length > MAX_FAVORITES) favorites.value.pop();
        saveFavorites();
        justAdded.value = normalizedText;
        addFeedback.value = true;

        // Clear any existing timeouts
        if (feedbackTimeoutId !== null) {
            clearTimeout(feedbackTimeoutId);
        }
        if (justAddedTimeoutId !== null) {
            clearTimeout(justAddedTimeoutId);
        }

        feedbackTimeoutId = setTimeout(() => {
            addFeedback.value = false;
            feedbackTimeoutId = null;
        }, 2000);

        justAddedTimeoutId = setTimeout(() => {
            justAdded.value = null;
            justAddedTimeoutId = null;
        }, 1500);
    }
}

async function removeFavorite(index) {
    const text = favorites.value[index] || "this favorite";
    const okPromise = askConfirm(`Remove favorite: "${text}"?`);
    speak(t("builder.delete_confirm_speak", { text }));
    const ok = await okPromise;
    if (!ok) {
        return;
    }
    favorites.value.splice(index, 1);
    saveFavorites();
}

function applyFavorite(text) {
    inputValue.value = text;
    const words = text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
    selection.value = words;
}

function autoGrowTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
}

function handleInputChange(event) {
    const currentValue = event?.target?.value ?? inputValue.value;
    inputValue.value = currentValue;
    checkForMentions(
        currentValue,
        event?.target?.selectionStart ?? currentValue.length
    );
    const words = inputValue.value
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
    selection.value = words;
}

function handleTextareaInput(event) {
    handleInputChange(event);
    autoGrowTextarea(event.target);
}

function checkForMentions(text, cursorPos) {
    if (!text || props.users.length === 0) {
        showUserSuggestions.value = false;
        return;
    }

    // If cursorPos is not available, use end of text
    const effectiveCursorPos =
        cursorPos !== undefined && cursorPos !== null ? cursorPos : text.length;

    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, effectiveCursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
        showUserSuggestions.value = false;
        return;
    }

    // Check if there's a space or newline after @ (meaning mention is complete)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
        showUserSuggestions.value = false;
        return;
    }

    // Get the query after @
    mentionQuery.value = textAfterAt.toLowerCase();
    mentionStartPos.value = lastAtIndex;

    // Filter users based on query
    if (mentionQuery.value.length > 0) {
        userSuggestions.value = props.users
            .filter((user) =>
                user.name.toLowerCase().includes(mentionQuery.value)
            )
            .slice(0, 5); // Limit to 5 suggestions
    } else {
        userSuggestions.value = props.users.slice(0, 5);
    }

    showUserSuggestions.value = userSuggestions.value.length > 0;
    selectedSuggestionIndex.value = -1;
}

function insertMention(user) {
    if (!keyboardInputRef.value || !user) {
        return;
    }

    const userId = user.id ?? user.user_id ?? user.ID;
    const userName = user.name ?? user.user_name ?? user.Name;

    if (!userName) {
        return;
    }

    const text = inputValue.value;
    const beforeMention = text.substring(0, mentionStartPos.value);
    const mentionText = `@${userName}`;
    const afterMention = text
        .substring(mentionStartPos.value)
        .replace(/@[\w\s]*/, `${mentionText} `);

    inputValue.value = beforeMention + afterMention;

    if (userId !== undefined && userId !== null) {
        const parsedUserId = parseInt(userId, 10);
        if (!isNaN(parsedUserId)) {
            mentionUserIds.value.set(mentionText, parsedUserId);
        }
    }

    keyboardInputRef.value.value = inputValue.value;
    // Auto-grow textarea after inserting mention
    autoGrowTextarea(keyboardInputRef.value);
    keyboardInputRef.value.dispatchEvent(new Event("input", { bubbles: true }));

    showUserSuggestions.value = false;
    mentionQuery.value = "";
    mentionStartPos.value = -1;

    // Clear any existing cursor timeout
    if (cursorTimeoutId !== null) {
        clearTimeout(cursorTimeoutId);
    }

    cursorTimeoutId = setTimeout(() => {
        if (keyboardInputRef.value) {
            const newCursorPos = beforeMention.length + mentionText.length + 2;
            keyboardInputRef.value.setSelectionRange(
                newCursorPos,
                newCursorPos
            );
            keyboardInputRef.value.focus();
        }
        cursorTimeoutId = null;
    }, 0);
}

function handleKeydown(event) {
    if (!showUserSuggestions.value) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedSuggestionIndex.value = Math.min(
            selectedSuggestionIndex.value + 1,
            userSuggestions.value.length - 1
        );
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedSuggestionIndex.value = Math.max(
            selectedSuggestionIndex.value - 1,
            -1
        );
    } else if (event.key === "Enter" && selectedSuggestionIndex.value >= 0) {
        event.preventDefault();
        insertMention(userSuggestions.value[selectedSuggestionIndex.value]);
    } else if (event.key === "Escape") {
        showUserSuggestions.value = false;
    }
}

// Watch for changes to inputValue and sync with the actual input element
watch(
    () => inputValue.value,
    (newValue) => {
        if (
            keyboardInputRef.value &&
            keyboardInputRef.value.value !== newValue
        ) {
            keyboardInputRef.value.value = newValue;
            // Auto-grow when value changes programmatically
            autoGrowTextarea(keyboardInputRef.value);
        }
    }
);

let inputHandlers = null;
let mountTimeoutId = null;
let cursorTimeoutId = null;
let feedbackTimeoutId = null;
let justAddedTimeoutId = null;

onMounted(() => {
    loadFavorites();
    const builderFunctions = registerBuilderFunctions();
    if (isCommentMode.value && props.messageId) {
        setCommentInput(props.messageId, builderFunctions);
        setActiveCommentInput(props.messageId);
    } else {
        setAddWord(addWord);
        setAddPhrase(addPhrase);
        setGetPreview(() => preview.value);
        setActiveMessageInput();
    }

    // Focus the input immediately so the on-screen keyboard opens first and the
    // user can start typing right away. Kept close to the mount (no long delay)
    // to stay within the tap gesture that mobile browsers require to raise the
    // keyboard.
    if (keyboardInputRef.value) {
        keyboardInputRef.value.focus({ preventScroll: true });
    }

    mountTimeoutId = setTimeout(() => {
        if (keyboardInputRef.value && typeof document !== "undefined") {
            autoGrowTextarea(keyboardInputRef.value);
            const inputEl = keyboardInputRef.value;

            const handleInput = (e) => {
                const value = e.target.value;
                if (value !== inputValue.value) {
                    inputValue.value = value;
                    const cursorPos = e.target.selectionStart ?? value.length;
                    checkForMentions(value, cursorPos);
                    autoGrowTextarea(e.target);
                }
            };

            const handleChange = (e) => {
                const value = e.target.value;
                if (value !== inputValue.value) {
                    inputValue.value = value;
                }
            };

            const handleClickOutside = (e) => {
                if (
                    !e.target.closest(".user-suggestions-container") &&
                    !e.target.closest(".message-input")
                ) {
                    showUserSuggestions.value = false;
                }
            };

            inputEl.addEventListener("input", handleInput);
            inputEl.addEventListener("change", handleChange);
            document.addEventListener("click", handleClickOutside);

            inputHandlers = {
                element: inputEl,
                input: handleInput,
                change: handleChange,
                clickOutside: handleClickOutside,
            };
        }
    }, 200);
});

onUnmounted(() => {
    if (isCommentMode.value && props.messageId) {
        removeCommentInput(props.messageId);
    }

    if (mountTimeoutId !== null) {
        clearTimeout(mountTimeoutId);
        mountTimeoutId = null;
    }
    if (cursorTimeoutId !== null) {
        clearTimeout(cursorTimeoutId);
        cursorTimeoutId = null;
    }
    if (feedbackTimeoutId !== null) {
        clearTimeout(feedbackTimeoutId);
        feedbackTimeoutId = null;
    }
    if (justAddedTimeoutId !== null) {
        clearTimeout(justAddedTimeoutId);
        justAddedTimeoutId = null;
    }

    // Clean up event listeners
    if (inputHandlers) {
        inputHandlers.element.removeEventListener("input", inputHandlers.input);
        inputHandlers.element.removeEventListener(
            "change",
            inputHandlers.change
        );
        if (inputHandlers.clickOutside && typeof document !== "undefined") {
            document.removeEventListener("click", inputHandlers.clickOutside);
        }
        inputHandlers = null;
    }
});

function addWord(word) {
    const inputElement = keyboardInputRef.value;
    const currentValue = inputElement?.value ?? inputValue.value;

    if (word === "@") {
        const newValue = currentValue + "@";
        inputValue.value = newValue;
        if (inputElement) {
            inputElement.value = newValue;
            inputElement.dispatchEvent(new Event("input", { bubbles: true }));
            setTimeout(() => {
                checkForMentions(newValue, newValue.length);
                inputElement.focus();
            }, 50);
        }
        return;
    }

    const words = currentValue
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
    const lastWord = words[words.length - 1];

    if (lastWord === word) {
        return;
    }

    let newValue;
    if (currentValue.trim() && !currentValue.endsWith(" ")) {
        newValue = currentValue + " " + word;
    } else {
        newValue = currentValue + word;
    }

    inputValue.value = newValue;
    if (inputElement) {
        inputElement.value = newValue;
        inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const newWords = newValue
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
    selection.value = newWords;
}

function addPhrase(phrase) {
    const inputElement = keyboardInputRef.value;
    const currentValue = inputElement?.value ?? inputValue.value;

    let newValue;
    if (currentValue.trim() && !currentValue.endsWith(" ")) {
        newValue = currentValue + " " + phrase;
    } else {
        newValue = currentValue + phrase;
    }

    inputValue.value = newValue;
    if (inputElement) {
        inputElement.value = newValue;
        inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const newWords = newValue
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
    selection.value = newWords;
}

const {
    setAddWord,
    setAddPhrase,
    setGetPreview,
    setActiveMessageInput,
    setCommentInput,
    removeCommentInput,
    setActiveCommentInput,
} = useMessageBuilder();

const registerBuilderFunctions = () => ({
    addWord,
    addPhrase,
    getPreview: () => preview.value,
});

const handleInputFocus = () => {
    if (isCommentMode.value && props.messageId) {
        setActiveCommentInput(props.messageId);
        return;
    }
    setActiveMessageInput();
};

function removeLast() {
    const currentText = inputValue.value.trim();
    const words = currentText.split(/\s+/).filter((w) => w.length > 0);

    if (words.length > 0) {
        words.pop();
        inputValue.value = words.join(" ");
        selection.value = words;
    } else {
        inputValue.value = "";
        selection.value = [];
    }
}

function reset() {
    inputValue.value = "";
    selection.value = [];
    showUserSuggestions.value = false;
    mentionQuery.value = "";
    mentionStartPos.value = -1;
    mentionUserIds.value.clear();
}

function suggestRandom() {
    const allWords = [
        ...people,
        ...bodyParts,
        ...actions,
        ...feelings,
        ...descriptors,
        ...things,
        ...commonStarters,
        ...quickPhrases,
    ];
    const randomCount = 3 + Math.floor(Math.random() * 2);
    const selected = [];
    for (let i = 0; i < randomCount; i++) {
        const word = allWords[Math.floor(Math.random() * allWords.length)];
        if (!selected.includes(word)) {
            selected.push(word);
        }
    }
    inputValue.value = selected.join(" ");
    selection.value = selected;
}

function sayIt() {
    const inputElement = keyboardInputRef.value;
    const currentText = inputElement?.value?.trim() || inputValue.value.trim();

    if (!currentText) {
        return;
    }

    if (inputElement && inputElement.value !== inputValue.value) {
        inputValue.value = inputElement.value;
    }

    speak(currentText);
}

function collectTaggedUserIds(messageText) {
    const taggedUserIds = [];

    for (const [mentionText, userId] of mentionUserIds.value.entries()) {
        if (messageText.includes(mentionText)) {
            const id = parseInt(userId, 10);
            if (!isNaN(id)) {
                taggedUserIds.push(id);
            }
        } else {
            const mentionWithoutAt = mentionText.startsWith("@")
                ? mentionText.substring(1)
                : mentionText;
            const escapedMention = mentionWithoutAt.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );
            const mentionPattern = new RegExp(
                `@${escapedMention}(?=\\s|$|[^\\w\\s])`,
                "i"
            );

            if (mentionPattern.test(messageText)) {
                const id = parseInt(userId, 10);
                if (!isNaN(id)) {
                    taggedUserIds.push(id);
                }
            }
        }
    }

    return taggedUserIds;
}

function clearAfterSubmit() {
    inputValue.value = "";
    selection.value = [];
    mentionUserIds.value.clear();
}

function postMessage() {
    if (!preview.value?.trim() || form.processing) {
        return;
    }

    const messageText = preview.value;
    speak(t("message.posting", { text: messageText }));

    form.message = messageText;
    form.tagged_user_ids = collectTaggedUserIds(messageText);

    form.post(route("messages.store"), {
        preserveScroll: true,
        onSuccess: () => {
            clearAfterSubmit();
            form.reset();
            emit("messagePosted");
        },
        onError: () => {},
    });
}

const commentProcessing = ref(false);

function postComment() {
    if (
        !isCommentMode.value ||
        !props.messageId ||
        !preview.value?.trim() ||
        commentProcessing.value
    ) {
        return;
    }

    const commentText = preview.value;
    speak(t("comment.posting", { text: commentText }));
    commentProcessing.value = true;

    router.post(
        route("messages.comments.store", props.messageId),
        {
            comment: commentText,
            tagged_user_ids: collectTaggedUserIds(commentText),
        },
        {
            preserveScroll: true,
            onSuccess: () => {
                clearAfterSubmit();
                emit("commentPosted", props.messageId);
            },
            onFinish: () => {
                commentProcessing.value = false;
            },
        }
    );
}

function submitContent() {
    if (isCommentMode.value) {
        postComment();
        return;
    }
    postMessage();
}

const submitDisabled = computed(
    () => form.processing || commentProcessing.value || !preview.value?.trim()
);

const submitLabel = computed(() =>
    isCommentMode.value
        ? t("message.post_comment")
        : t("builder.post_to_timeline")
);

defineExpose({
    submitContent,
    submitDisabled,
    submitLabel,
});
</script>

<template>
    <div class="flex h-full min-h-0 w-full flex-col bg-white dark:bg-slate-800">
        <!-- Message Input: stays at the top, above the toolbar + keyboard -->
        <div class="shrink-0 px-3 pt-3 pb-2">
            <div
                :class="[
                    'min-h-11 flex items-start px-3 py-2 rounded-md border-2 bg-blue-50 dark:bg-slate-700 text-sm font-medium transition-shadow',
                    speaking
                        ? 'border-green-400 ring-2 ring-green-400 animate-pulse'
                        : 'border-blue-300 dark:border-blue-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400 dark:focus-within:ring-blue-500',
                ]"
            >
                <div class="flex items-center justify-between w-full relative">
                    <textarea
                        ref="keyboardInputRef"
                        v-model="inputValue"
                        autofocus
                        class="message-input flex-1 text-gray-700 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-300 break-words text-base md:text-lg font-bold leading-tight bg-transparent border-none outline-none focus:outline-none resize-none overflow-hidden min-h-[3.5rem] max-h-[200px]"
                        :placeholder="t('builder.placeholder')"
                        rows="2"
                        @input="handleTextareaInput"
                        @change="handleInputChange"
                        @keydown="handleKeydown"
                        @focus="handleInputFocus"
                    />

                    <!-- User Suggestions Dropdown -->
                    <div
                        v-if="showUserSuggestions"
                        class="user-suggestions-container absolute top-full left-0 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[100] max-h-60 overflow-y-auto"
                    >
                        <UserTagList
                            :users="userSuggestions"
                            :selected-index="selectedSuggestionIndex"
                            @select="insertMention"
                        />
                    </div>
                    <SpeakButton
                        class="ml-3 self-start"
                        :disabled="speaking"
                        :aria-label="t('builder.say_message_aria')"
                        icon-class="ri-speak-fill text-lg"
                        @click="sayIt"
                    />
                </div>
            </div>
        </div>

        <!-- Category toolbar: compact icons; each opens the shared pane below.
             Horizontally scrollable so it stays a single row above the keyboard. -->
        <div
            class="shrink-0 border-y border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50"
            role="tablist"
            :aria-label="t('flyout.prebuilt_messages')"
        >
            <div class="flex gap-1 overflow-x-auto px-2 py-2">
                <button
                    v-for="tab in toolbar"
                    :key="tab.key"
                    type="button"
                    role="tab"
                    :aria-selected="activeCategory === tab.key"
                    :title="tab.label"
                    :class="[
                        'flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        activeCategory === tab.key
                            ? 'bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-700 dark:ring-slate-600'
                            : 'hover:bg-white/70 dark:hover:bg-slate-700/60',
                    ]"
                    @click="selectCategory(tab.key)"
                >
                    <i :class="[tab.icon, 'text-2xl leading-none', tab.tint]"></i>
                    <span
                        class="text-[10px] font-semibold leading-tight text-center text-gray-700 dark:text-gray-200"
                    >
                        {{ tab.label }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Shared expandable pane: shows the selected category's content -->
        <div
            v-show="activeCategory"
            class="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        >
            <!-- "Things you can do" tools pane -->
            <div v-if="activeCategory === 'tools'">
                <div class="flex items-center gap-2 flex-wrap">
                    <button
                        class="px-4 py-3 rounded-md bg-blue-600 dark:bg-blue-500 text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 font-bold text-2xl"
                        type="button"
                        :title="t('builder.tag_user')"
                        :aria-label="t('builder.tag_user_aria')"
                        @click="addWord('@')"
                    >
                        @
                    </button>
                    <button
                        class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md hover:bg-slate-600 dark:hover:bg-slate-500"
                        type="button"
                        :title="t('builder.remove_last_word')"
                        :aria-label="t('builder.remove_last_word_aria')"
                        @click="removeLast"
                    >
                        <i class="ri-delete-back-2-line text-2xl"></i>
                    </button>

                    <button
                        class="px-4 py-3 rounded-md bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white shadow-md font-semibold flex items-center gap-2"
                        type="button"
                        :title="t('builder.clear_all')"
                        :aria-label="t('builder.clear_all_aria')"
                        @click="reset"
                    >
                        <i class="ri-delete-bin-line text-2xl"></i>
                    </button>

                    <button
                        class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md hover:bg-slate-600 dark:hover:bg-slate-500"
                        type="button"
                        :title="t('builder.surprise')"
                        :aria-label="t('builder.surprise_aria')"
                        @click="suggestRandom"
                    >
                        <i class="ri-shuffle-line text-2xl"></i>
                    </button>

                    <button
                        class="ml-2 p-3 rounded-md shadow-md flex items-center"
                        :class="
                            canSaveFavorite
                                ? 'bg-rose-600 text-white hover:bg-rose-700 dark:hover:bg-rose-500'
                                : 'bg-gray-400 dark:bg-gray-600 text-white opacity-60 cursor-not-allowed'
                        "
                        type="button"
                        :title="
                            canSaveFavorite
                                ? t('builder.save_favorite')
                                : isAtMax
                                ? t('builder.max_favorites', {
                                      count: MAX_FAVORITES,
                                  })
                                : t('builder.build_to_save')
                        "
                        :aria-label="
                            canSaveFavorite
                                ? t('builder.save_favorite')
                                : t('builder.save_favorite_disabled')
                        "
                        :aria-disabled="!canSaveFavorite"
                        :disabled="!canSaveFavorite"
                        @click="addFavorite"
                    >
                        <i class="ri-heart-add-fill text-2xl mr-2"></i>
                        <span class="sr-only">Save favorite</span>
                    </button>

                    <div
                        v-if="addFeedback"
                        class="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-md"
                    >
                        <i class="ri-check-line"></i>
                        <span class="text-sm">{{ t("builder.saved") }}</span>
                    </div>
                </div>

                <!-- Saved Favorites -->
                <div
                    v-if="favorites.length"
                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                    <div
                        class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    >
                        {{ t("builder.saved_favorites") }}
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div
                            v-for="(f, i) in favorites"
                            :key="`fav-${i}`"
                            class="flex items-center max-w-full bg-rose-600 rounded-md overflow-hidden"
                            :class="{ 'ring-2 ring-green-400': justAdded === f }"
                        >
                            <button
                                type="button"
                                class="flex items-center gap-2 min-w-0 min-h-11 px-3 py-2 text-white text-sm font-semibold text-left hover:bg-rose-700 transition-colors"
                                :title="f"
                                :aria-label="
                                    t('builder.apply_favorite', { favorite: f })
                                "
                                @click="applyFavorite(f)"
                            >
                                <i
                                    class="ri-heart-fill text-base shrink-0"
                                    aria-hidden="true"
                                ></i>
                                <span class="break-words">{{ f }}</span>
                            </button>
                            <button
                                type="button"
                                class="shrink-0 min-h-11 min-w-11 flex items-center justify-center text-white bg-rose-700 hover:bg-red-700"
                                :title="
                                    t('builder.remove_favorite', {
                                        favorite: f,
                                    })
                                "
                                :aria-label="
                                    t('builder.remove_favorite', {
                                        favorite: f,
                                    })
                                "
                                @click="removeFavorite(i)"
                            >
                                <i class="ri-close-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Word / phrase category pane -->
            <div v-else-if="activePane" class="flex flex-wrap gap-2">
                <button
                    v-for="(item, i) in activePane.items"
                    :key="`${activePane.key}-${i}`"
                    type="button"
                    :class="[
                        'px-4 py-2 rounded-full text-white text-xl font-semibold shadow-md transition-colors',
                        activePane.chip,
                    ]"
                    @click="handleChip(activePane, item)"
                >
                    {{ item }}
                </button>
            </div>
        </div>

        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || t('common.ok')"
            :cancel-label="confirmCancelLabel || t('common.cancel')"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />
    </div>
</template>
