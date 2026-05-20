export const ALLOWED_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "💩"];

export const REACTION_EMOJI_NAMES = {
    "👍": "thumbs up",
    "❤️": "heart",
    "😂": "laughing",
    "😮": "surprised",
    "😢": "sad",
    "💩": "poop",
};

export function useGroupedReactions(groupedReactions) {
    const getGrouped = () => groupedReactions?.value ?? groupedReactions ?? {};

    const getReactionCount = (emoji) => {
        const grouped = getGrouped();
        if (!grouped[emoji]) {
            return 0;
        }
        return grouped[emoji].count || 0;
    };

    const getReactionUsers = (emoji) => {
        const grouped = getGrouped();
        if (!grouped[emoji]) {
            return [];
        }
        return grouped[emoji].users || [];
    };

    const getSelectedReactions = () => {
        return ALLOWED_REACTION_EMOJIS.filter(
            (emoji) => getReactionCount(emoji) > 0
        );
    };

    const hasUserReacted = (emoji, currentUserId) => {
        if (!currentUserId) {
            return false;
        }
        const users = getReactionUsers(emoji);
        return users.some((user) => user.id === currentUserId);
    };

    const hasAnyReactions = () => getSelectedReactions().length > 0;

    return {
        getReactionCount,
        getReactionUsers,
        getSelectedReactions,
        hasUserReacted,
        hasAnyReactions,
    };
}
