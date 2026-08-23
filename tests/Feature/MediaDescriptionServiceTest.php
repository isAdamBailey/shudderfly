<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Services\MediaDescriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Laravel\Facades\Image;
use Tests\TestCase;

class MediaDescriptionServiceTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

    private const MODEL = 'Qwen/Qwen2.5-VL-72B-Instruct';

    private function configureService(bool $enabled = true, ?string $token = 'test-token'): void
    {
        config([
            'services.huggingface.api_token' => $token,
            'services.huggingface.vision_endpoint' => self::ENDPOINT,
            'services.huggingface.vision_model' => self::MODEL,
        ]);

        SiteSetting::updateOrCreate(
            ['key' => 'ai_descriptions_enabled'],
            ['value' => $enabled ? '1' : '0', 'type' => 'boolean']
        );
    }

    private function imageBytes(int $width = 40, int $height = 30): string
    {
        return (string) Image::createImage($width, $height)->encode(new JpegEncoder(85));
    }

    private function fakeResponse(string $content): void
    {
        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [['message' => ['content' => $content]]],
            ], 200),
        ]);
    }

    private function service(): MediaDescriptionService
    {
        return app(MediaDescriptionService::class);
    }

    public function test_it_returns_the_generated_sentence(): void
    {
        $this->configureService();
        $this->fakeResponse('A small dog sleeping on a blue couch.');

        $this->assertSame(
            'A small dog sleeping on a blue couch.',
            $this->service()->describe($this->imageBytes())
        );
    }

    public function test_it_sends_the_image_as_a_base64_data_url(): void
    {
        $this->configureService();
        $this->fakeResponse('A small dog sleeping on a blue couch.');

        $this->service()->describe($this->imageBytes());

        Http::assertSent(function (Request $request) {
            return $request->url() === self::ENDPOINT
                && $request->hasHeader('Authorization', 'Bearer test-token')
                && data_get($request->data(), 'model') === self::MODEL
                && data_get($request->data(), 'messages.0.role') === 'system'
                && data_get($request->data(), 'messages.1.content.0.type') === 'text'
                && data_get($request->data(), 'messages.1.content.1.type') === 'image_url'
                && str_starts_with(
                    (string) data_get($request->data(), 'messages.1.content.1.image_url.url'),
                    'data:image/jpeg;base64,'
                );
        });
    }

    public function test_it_strips_wrapping_quotes(): void
    {
        $this->configureService();
        $this->fakeResponse('"A small dog sleeping on a blue couch."');

        $this->assertSame(
            'A small dog sleeping on a blue couch.',
            $this->service()->describe($this->imageBytes())
        );
    }

    public function test_it_skips_the_request_entirely_when_the_setting_is_off(): void
    {
        $this->configureService(enabled: false);
        Http::fake();

        $this->assertNull($this->service()->describe($this->imageBytes()));

        Http::assertNothingSent();
    }

    public function test_it_skips_the_request_when_the_token_is_missing(): void
    {
        $this->configureService(token: '');
        Http::fake();

        $this->assertNull($this->service()->describe($this->imageBytes()));

        Http::assertNothingSent();
    }

    public function test_it_returns_null_on_an_error_response(): void
    {
        $this->configureService();
        Http::fake(['router.huggingface.co/*' => Http::response(['error' => 'bad request'], 400)]);

        $this->assertNull($this->service()->describe($this->imageBytes()));
    }

    public function test_it_returns_null_on_a_connection_exception(): void
    {
        $this->configureService();
        Http::fake(['router.huggingface.co/*' => fn () => throw new ConnectionException('timed out')]);

        $this->assertNull($this->service()->describe($this->imageBytes()));
    }

    public function test_it_rejects_empty_short_and_markdown_content(): void
    {
        $this->configureService();

        foreach (['', 'A dog.', '## A small dog sleeping on a couch', '**A small dog on a couch**'] as $content) {
            $this->fakeResponse($content);

            $this->assertNull(
                $this->service()->describe($this->imageBytes()),
                "Expected null for content: {$content}"
            );
        }
    }

    public function test_resolve_caption_wraps_the_description_in_a_paragraph(): void
    {
        $this->configureService();
        $this->fakeResponse('A small dog sleeping on a blue couch.');

        $this->assertSame(
            '<p>A small dog sleeping on a blue couch.</p>',
            $this->service()->resolveCaption('<p><br></p>', $this->imageBytes())
        );
    }

    public function test_resolve_caption_escapes_markup_in_the_description(): void
    {
        $this->configureService();
        $this->fakeResponse('A sign reading <b>Open</b> & ready.');

        $this->assertSame(
            '<p>A sign reading &lt;b&gt;Open&lt;/b&gt; &amp; ready.</p>',
            $this->service()->resolveCaption(null, $this->imageBytes())
        );
    }

    public function test_resolve_caption_leaves_apostrophes_readable(): void
    {
        $this->configureService();
        $this->fakeResponse("A child's toy on the floor.");

        // Entities here would be read aloud verbatim by speech synthesis and
        // indexed into Meilisearch, since neither decodes them.
        $this->assertSame(
            "<p>A child's toy on the floor.</p>",
            $this->service()->resolveCaption(null, $this->imageBytes())
        );
    }

    public function test_resolve_caption_ignores_a_false_source(): void
    {
        $this->configureService();
        Http::fake();

        // file_get_contents() returns false, which reaches this untyped.
        $this->assertNull($this->service()->resolveCaption(null, false));

        Http::assertNothingSent();
    }

    public function test_resolve_caption_never_overwrites_text_the_user_typed(): void
    {
        $this->configureService();
        Http::fake();

        $this->assertSame(
            '<p>My own caption</p>',
            $this->service()->resolveCaption('<p>My own caption</p>', $this->imageBytes())
        );

        Http::assertNothingSent();
    }

    public function test_resolve_caption_keeps_existing_content_when_generation_fails(): void
    {
        $this->configureService();
        Http::fake(['router.huggingface.co/*' => Http::response([], 500)]);

        $this->assertSame('<p><br></p>', $this->service()->resolveCaption('<p><br></p>', $this->imageBytes()));
    }

    public function test_resolve_caption_keeps_existing_content_when_the_image_is_undecodable(): void
    {
        $this->configureService();
        Http::fake();

        $this->assertNull($this->service()->resolveCaption(null, 'not an image'));

        Http::assertNothingSent();
    }

    public function test_prepend_description_keeps_the_existing_content_underneath(): void
    {
        $this->configureService();
        $this->fakeResponse('A small dog sleeping on a blue couch.');

        $this->assertSame(
            '<p>A small dog sleeping on a blue couch.</p><p>Alex took this screenshot.</p>',
            $this->service()->prependDescription('<p>Alex took this screenshot.</p>', $this->imageBytes())
        );
    }

    public function test_prepend_description_keeps_the_existing_content_when_generation_fails(): void
    {
        $this->configureService();
        Http::fake(['router.huggingface.co/*' => Http::response([], 500)]);

        $this->assertSame(
            '<p>Alex took this screenshot.</p>',
            $this->service()->prependDescription('<p>Alex took this screenshot.</p>', $this->imageBytes())
        );
    }

    public function test_prepend_description_is_skipped_when_disabled(): void
    {
        $this->configureService(enabled: false);
        Http::fake();

        $this->assertSame(
            '<p>Alex took this screenshot.</p>',
            $this->service()->prependDescription('<p>Alex took this screenshot.</p>', $this->imageBytes())
        );

        Http::assertNothingSent();
    }

    public function test_prepend_description_replaces_blank_existing_content(): void
    {
        $this->configureService();
        $this->fakeResponse('A small dog sleeping on a blue couch.');

        $this->assertSame(
            '<p>A small dog sleeping on a blue couch.</p>',
            $this->service()->prependDescription('<p><br></p>', $this->imageBytes())
        );
    }
}
