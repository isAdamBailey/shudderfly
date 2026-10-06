<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * No clip could be produced: the provider failed, is not configured, or
 * the file could not be stored. The client falls back to the device voice.
 */
class AiVoiceUnavailable extends RuntimeException {}
