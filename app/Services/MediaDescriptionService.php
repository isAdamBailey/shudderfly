<?php

namespace App\Services;

use App\Support\AiFeature;
use App\Support\Content;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Interfaces\ImageInterface;
use Intervention\Image\Laravel\Facades\Image;

/**
 * Describes an uploaded image in one short sentence using a vision-language
 * model, via either the Hugging Face Inference Providers router or the
 * Anthropic API (config('services.ai_provider')).
 *
 * Every failure mode returns null: callers use the description only when the
 * uploader left the caption blank, so a missing one is never an error.
 */
class MediaDescriptionService
{
    private const MAX_TOKENS = 40;

    private const TEMPERATURE = 0.2;

    private const CONNECT_TIMEOUT_SECONDS = 5;

    /**
     * Kept deliberately short: the whole job has to finish inside the queue's
     * retry_after (90s), or the worker re-reserves a job that is still running
     * and the upload is written twice.
     */
    private const REQUEST_TIMEOUT_SECONDS = 15;

    private const RETRY_TIMES = 2;

    private const RETRY_SLEEP_MS = 1000;

    private const MIN_DESCRIPTION_LENGTH = 10;

    /**
     * Longest edge sent to the model. Vision-language models tokenize images
     * by pixel area (fixed-size patches), so this is the main lever on input
     * token cost, not just payload size — 640px is plenty for a one-sentence
     * caption.
     */
    private const MAX_EDGE_PIXELS = 640;

    private const JPEG_QUALITY = 85;

    private const SYSTEM_PROMPT = 'Write one short, plain sentence describing what is in this photo. '
        .'No preamble, no markdown, no lists, no quotes. '
        .'Do not guess names of people. Do not mention that it is a photo or image.';

    private ?bool $enabled = null;

    /**
     * The caption a page should be saved with.
     *
     * Returns $existingContent untouched whenever the uploader typed anything,
     * and never throws: a failed description just leaves the caption as-is.
     *
     * @param  string|ImageInterface|null  $source  Image bytes, or an image the
     *                                              caller already decoded. It is
     *                                              downscaled in place, so pass a
     *                                              decoded image only once you are
     *                                              done with it.
     */
    public function resolveCaption(?string $existingContent, string|ImageInterface|null $source): ?string
    {
        if (! Content::isBlank($existingContent)) {
            return $existingContent;
        }

        return $this->describeAsParagraph($source) ?? $existingContent;
    }

    /**
     * The caption for media the app itself already captioned, such as the
     * attribution line on a video snapshot.
     *
     * The generated sentence goes first and $existingContent is kept after it,
     * so the description reads as the caption and the existing text as a note
     * under it. Never throws: a failed description leaves the content as-is.
     *
     * @param  string|ImageInterface|null  $source  Image bytes, or an image the
     *                                              caller already decoded. It is
     *                                              downscaled in place, so pass a
     *                                              decoded image only once you are
     *                                              done with it.
     */
    public function prependDescription(?string $existingContent, string|ImageInterface|null $source): ?string
    {
        if (Content::isBlank($existingContent)) {
            return $this->resolveCaption($existingContent, $source);
        }

        $paragraph = $this->describeAsParagraph($source);

        return $paragraph === null ? $existingContent : $paragraph.$existingContent;
    }

    /**
     * The description of $source as a single HTML paragraph, or null whenever
     * one could not be produced.
     */
    private function describeAsParagraph(string|ImageInterface|null $source): ?string
    {
        if ($source === null || $source === '' || ! $this->isEnabled()) {
            return null;
        }

        $prepared = $this->toJpeg($source);
        $description = $prepared === null ? null : $this->describe($prepared);

        if ($description === null) {
            return null;
        }

        // ENT_NOQUOTES, not e(): this is text content, not an attribute value,
        // and escaping quotes would leak "&#039;" into speech synthesis, page
        // titles and the Meilisearch index, none of which decode entities.
        return '<p>'.htmlspecialchars($description, ENT_NOQUOTES, 'UTF-8').'</p>';
    }

    /**
     * @param  string  $imageBytes  JPEG bytes of an already-downscaled image.
     */
    public function describe(string $imageBytes): ?string
    {
        if (! $this->isEnabled()) {
            return null;
        }

        return config('services.ai_provider') === 'anthropic'
            ? $this->describeViaAnthropic($imageBytes)
            : $this->describeViaHuggingFace($imageBytes);
    }

    private function describeViaHuggingFace(string $imageBytes): ?string
    {
        $token = config('services.huggingface.api_token');

        if (! is_string($token) || trim($token) === '') {
            Log::warning('Media description skipped: missing Hugging Face token');

            return null;
        }

        try {
            $response = $this->httpClient()
                ->withToken($token)
                ->post((string) config('services.huggingface.vision_endpoint'), [
                    'model' => (string) config('services.huggingface.vision_model'),
                    'max_tokens' => self::MAX_TOKENS,
                    'temperature' => self::TEMPERATURE,
                    'messages' => [
                        ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                        ['role' => 'user', 'content' => [
                            ['type' => 'text', 'text' => 'Describe this image.'],
                            ['type' => 'image_url', 'image_url' => [
                                'url' => 'data:image/jpeg;base64,'.base64_encode($imageBytes),
                            ]],
                        ]],
                    ],
                ]);

            return $this->handleResponse($response, fn ($body) => (string) data_get($body, 'choices.0.message.content', ''));
        } catch (\Throwable $exception) {
            Log::warning('Media description generation exception', [
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function describeViaAnthropic(string $imageBytes): ?string
    {
        $apiKey = config('services.anthropic.api_key');

        if (! is_string($apiKey) || trim($apiKey) === '') {
            Log::warning('Media description skipped: missing Anthropic API key');

            return null;
        }

        try {
            $response = $this->httpClient()
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => (string) config('services.anthropic.api_version'),
                ])
                ->post((string) config('services.anthropic.endpoint'), [
                    'model' => (string) config('services.anthropic.vision_model'),
                    'max_tokens' => self::MAX_TOKENS,
                    // No `temperature`: sampling params are rejected with a 400
                    // on newer Claude tiers (e.g. Sonnet 5, Opus 5).
                    'system' => self::SYSTEM_PROMPT,
                    'messages' => [
                        ['role' => 'user', 'content' => [
                            ['type' => 'image', 'source' => [
                                'type' => 'base64',
                                'media_type' => 'image/jpeg',
                                'data' => base64_encode($imageBytes),
                            ]],
                            ['type' => 'text', 'text' => 'Describe this image.'],
                        ]],
                    ],
                ]);

            return $this->handleResponse($response, fn ($body) => (string) data_get($body, 'content.0.text', ''));
        } catch (\Throwable $exception) {
            Log::warning('Media description generation exception', [
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function httpClient(): PendingRequest
    {
        return Http::connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS)
            ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS, function ($exception): bool {
                if ($exception instanceof ConnectionException) {
                    return true;
                }
                if ($exception instanceof RequestException && $exception->response) {
                    return $exception->response->serverError() || $exception->response->status() === 429;
                }

                return false;
            }, false);
    }

    private function handleResponse(Response $response, \Closure $extractText): ?string
    {
        if (! $response->successful()) {
            Log::warning('Media description generation failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $description = $this->normalize($extractText($response->json()));

        if ($description === null) {
            Log::warning('Media description generation returned unusable content', [
                'body' => $response->body(),
            ]);
        }

        return $description;
    }

    /**
     * Downscale to MAX_EDGE_PIXELS and re-encode as JPEG so the base64 payload
     * stays small and the format is one every vision model accepts.
     */
    private function toJpeg(string|ImageInterface $source): ?string
    {
        try {
            $image = $source instanceof ImageInterface ? $source : Image::decode($source);

            return (string) $image
                ->scaleDown(self::MAX_EDGE_PIXELS, self::MAX_EDGE_PIXELS)
                ->encode(new JpegEncoder(self::JPEG_QUALITY));
        } catch (\Throwable $exception) {
            Log::warning('Media description image preparation failed', [
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function isEnabled(): bool
    {
        return $this->enabled ??= AiFeature::enabled();
    }

    /**
     * Strip the wrapping the model sometimes adds and reject anything that is
     * not a plain sentence.
     */
    private function normalize(string $text): ?string
    {
        $text = trim($text, " \t\n\r\0\x0B\"'`");

        if (preg_match('/^#|\n#|```|\*\*/', $text)) {
            return null;
        }

        if (mb_strlen($text) < self::MIN_DESCRIPTION_LENGTH) {
            return null;
        }

        return $text;
    }
}
