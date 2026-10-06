<?php

namespace App\Exceptions;

/**
 * Generating the clip would take today's new-clip characters past the
 * ai_voice_daily_character_limit setting. A subclass of AiVoiceUnavailable,
 * so callers that only care whether a clip exists need not tell them apart.
 */
class AiVoiceBudgetExceeded extends AiVoiceUnavailable {}
