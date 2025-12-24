import { computed, ref, watch } from "vue";

/**
 * Composable for user tagging/mentioning functionality in text inputs.
 * Provides autocomplete suggestions when users type @ followed by a username.
 *
 * @param {Object} options
 * @param {import('vue').Ref<Array>} options.users - Array of user objects with id and name
 * @param {import('vue').Ref<HTMLElement|null>} options.textareaRef - Ref to the textarea element
 * @param {import('vue').Ref<string>} options.inputValue - Ref to the input value
 * @returns {Object} Object containing reactive state and functions for tagging
 */
export function useUserTagging({ users, textareaRef, inputValue }) {
  const showUserSuggestions = ref(false);
  const userSuggestions = ref([]);
  const selectedSuggestionIndex = ref(-1);
  const mentionQuery = ref("");
  const mentionStartPos = ref(-1);
  // Track user IDs for mentions: maps mention text (e.g., "@Colin Lowe") to user ID
  const mentionUserIds = ref(new Map());
  let cursorTimeoutId = null;

  /**
   * Check for @ mentions in the text and show suggestions if found.
   * @param {string} text - The text to check
   * @param {number} cursorPos - The cursor position in the text
   */
  function checkForMentions(text, cursorPos) {
    if (!text || !users.value || users.value.length === 0) {
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
      userSuggestions.value = users.value
        .filter((user) => user.name.toLowerCase().includes(mentionQuery.value))
        .slice(0, 5); // Limit to 5 suggestions
    } else {
      userSuggestions.value = users.value.slice(0, 5);
    }

    showUserSuggestions.value = userSuggestions.value.length > 0;
    selectedSuggestionIndex.value = -1;
  }

  /**
   * Insert a mention into the text at the current mention position.
   * @param {Object} user - User object with id and name
   */
  function insertMention(user) {
    if (!textareaRef.value || !user) {
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

    textareaRef.value.value = inputValue.value;
    textareaRef.value.dispatchEvent(new Event("input", { bubbles: true }));

    showUserSuggestions.value = false;
    mentionQuery.value = "";
    mentionStartPos.value = -1;

    // Clear any existing cursor timeout
    if (cursorTimeoutId !== null) {
      clearTimeout(cursorTimeoutId);
    }

    cursorTimeoutId = setTimeout(() => {
      if (textareaRef.value) {
        const newCursorPos = beforeMention.length + mentionText.length + 2;
        textareaRef.value.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.value.focus();
      }
      cursorTimeoutId = null;
    }, 0);
  }

  /**
   * Handle keyboard navigation in the suggestions dropdown.
   * @param {KeyboardEvent} event - The keyboard event
   */
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

  /**
   * Get tagged user IDs from the current input value.
   * @param {string} text - The text to extract tagged user IDs from
   * @returns {Array<number>} Array of user IDs
   */
  function getTaggedUserIds(text) {
    const taggedUserIds = [];

    for (const [mentionText, userId] of mentionUserIds.value.entries()) {
      if (text.includes(mentionText)) {
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

        if (mentionPattern.test(text)) {
          const id = parseInt(userId, 10);
          if (!isNaN(id)) {
            taggedUserIds.push(id);
          }
        }
      }
    }

    return taggedUserIds;
  }

  /**
   * Clear all mention tracking data.
   */
  function clearMentions() {
    mentionUserIds.value.clear();
    showUserSuggestions.value = false;
    mentionQuery.value = "";
    mentionStartPos.value = -1;
    selectedSuggestionIndex.value = -1;
  }

  return {
    // State
    showUserSuggestions,
    userSuggestions,
    selectedSuggestionIndex,
    mentionUserIds,
    // Functions
    checkForMentions,
    insertMention,
    handleKeydown,
    getTaggedUserIds,
    clearMentions,
  };
}

