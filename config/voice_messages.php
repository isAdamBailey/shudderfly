<?php

return [
    // Longest voice clip, in seconds. The Message Builder stops recording
    // here and the server rejects (and the transcode trims) anything longer.
    'max_seconds' => (int) env('VOICE_MESSAGE_MAX_SECONDS', 60),

    // Largest upload, in kilobytes. A minute of browser-recorded speech is
    // well under 1 MB; this leaves room for Safari's AAC.
    'max_kilobytes' => (int) env('VOICE_MESSAGE_MAX_KILOBYTES', 5120),
];
