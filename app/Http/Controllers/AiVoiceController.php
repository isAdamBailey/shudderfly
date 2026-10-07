<?php

namespace App\Http\Controllers;

use App\Exceptions\AiVoiceBudgetExceeded;
use App\Exceptions\AiVoiceUnavailable;
use App\Http\Middleware\SetLocale;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AiVoiceController extends Controller
{
    /**
     * The URL of the AI voice clip for the given text, generating it on the
     * first request. A spent daily budget is a 429 and any other failure a
     * 503; either way the client falls back to the device voice.
     */
    public function speak(Request $request, AiVoiceService $service): JsonResponse
    {
        return $this->clip($request, $service, ahead: false);
    }

    /**
     * The same, for a clip the client expects to play soon. It records no
     * play and stops short of the share of the budget kept for live plays;
     * its own route keeps it off the live-play throttle.
     */
    public function prefetch(Request $request, AiVoiceService $service): JsonResponse
    {
        return $this->clip($request, $service, ahead: true);
    }

    private function clip(Request $request, AiVoiceService $service, bool $ahead): JsonResponse
    {
        abort_unless(AiVoice::enabled(), 404);

        // Validate the words that will actually be spoken, so text that is
        // only "@"s and whitespace fails `required` like an empty string.
        if (is_string($request->input('text'))) {
            $request->merge(['text' => AiVoiceService::normalize($request->input('text'))]);
        }

        $validated = $request->validate([
            'text' => ['required', 'string', 'max:'.AiVoiceService::MAX_CHARACTERS],
            'locale' => ['required', Rule::in(SetLocale::SUPPORTED_LOCALES)],
            'voice' => ['nullable', 'string', 'max:64'],
            'speed' => ['nullable', 'numeric', 'between:0.5,2'],
        ]);

        try {
            $clip = $service->clipFor(
                $validated['text'],
                $validated['locale'],
                $validated['voice'] ?? null,
                (float) ($validated['speed'] ?? 1),
                $ahead,
            );
        } catch (AiVoiceBudgetExceeded) {
            return response()->json(['message' => 'AI voice daily limit reached.'], 429);
        } catch (AiVoiceUnavailable) {
            // Already logged by the service with the provider's response.
            return response()->json(['message' => 'AI voice unavailable.'], 503);
        }

        return response()->json(['url' => $clip->url]);
    }
}
