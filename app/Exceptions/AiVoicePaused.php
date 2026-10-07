<?php

namespace App\Exceptions;

/**
 * The provider is paused after repeated connection failures, so no request
 * was made. Expected while it lasts: the pause is logged once, when it starts.
 */
class AiVoicePaused extends AiVoiceUnavailable {}
