<?php

namespace App\Exceptions;

/**
 * The provider is paused after repeated connection failures, so no request
 * was made. Expected while it lasts: playback falls back to the device voice.
 */
class AiVoicePaused extends AiVoiceUnavailable {}
