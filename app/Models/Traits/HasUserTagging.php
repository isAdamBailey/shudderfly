<?php

namespace App\Models\Traits;

use App\Models\User;

trait HasUserTagging
{
    /**
     * Parse tagged usernames from content.
     * Returns array of usernames (without @ symbol).
     * Extracts the name after @ and looks it up directly.
     *
     * @param  string  $contentField  The name of the field containing the text (e.g., 'message', 'comment')
     * @return array<string>
     */
    public function getTaggedUsernames(string $contentField = 'message'): array
    {
        $content = $this->getAttribute($contentField);

        if (empty($content)) {
            return [];
        }

        // Extract all @mentions - match @ followed by word characters and spaces until punctuation/end
        // Try to match full usernames first, then partial matches
        $allUserNames = User::pluck('name')->toArray();

        if (empty($allUserNames)) {
            return [];
        }

        $foundUsernames = [];

        // First, try to match full usernames (with spaces)
        // Pattern matches @username followed by:
        // - whitespace (\s)
        // - end of string ($)
        // - any non-word, non-whitespace character ([^\w\s]) - handles punctuation like , . ! ? etc.
        foreach ($allUserNames as $userName) {
            $pattern = '/@'.preg_quote($userName, '/').'(?=\s|$|[^\w\s])/i';
            if (preg_match($pattern, $content)) {
                $foundUsernames[] = $userName;
            }
        }

        // Then, extract simple @mentions (single word) and look them up
        preg_match_all('/@([a-zA-Z0-9_]+)(?=\s|$|[^\w])/', $content, $matches);
        $simpleMentions = $matches[1] ?? [];

        foreach ($simpleMentions as $mention) {
            // Check if this mention is already covered by a full username match
            $alreadyMatched = false;
            foreach ($foundUsernames as $found) {
                if (stripos($found, $mention) === 0) {
                    $alreadyMatched = true;
                    break;
                }
            }

            if (! $alreadyMatched) {
                // Look up the mention directly - if it matches a user name exactly, use it
                $user = User::whereRaw('LOWER(name) = LOWER(?)', [$mention])->first();
                if ($user) {
                    $foundUsernames[] = $user->name;
                }
            }
        }

        return array_unique($foundUsernames);
    }

    /**
     * Get tagged user IDs from content.
     * Returns array of user IDs by looking up the matched name directly.
     *
     * @param  string  $contentField  The name of the field containing the text (e.g., 'message', 'comment')
     * @return array<int>
     */
    public function getTaggedUserIds(string $contentField = 'message'): array
    {
        $usernames = $this->getTaggedUsernames($contentField);

        if (empty($usernames)) {
            return [];
        }

        // Get user IDs by looking up the name directly (case-insensitive)
        $userIds = [];
        foreach ($usernames as $username) {
            $user = User::whereRaw('LOWER(name) = LOWER(?)', [trim($username)])->first();
            if ($user) {
                $userIds[] = $user->id;
            }
        }

        return array_unique($userIds);
    }
}

