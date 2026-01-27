<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class YouTubeProxyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $response = $this->get(route('youtube.iframe-api'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_access_youtube_iframe_api(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Http::fake([
            'www.youtube.com/iframe_api' => Http::response('var YT = {};', 200),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $response->assertStatus(200);
    }

    public function test_youtube_iframe_api_returns_javascript_content_type(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Http::fake([
            'www.youtube.com/iframe_api' => Http::response('var YT = {};', 200),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $response->assertHeader('Content-Type', 'application/javascript');
    }

    public function test_youtube_iframe_api_proxies_youtube_script(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Cache::flush();
        
        $mockScript = 'var YT = { Player: function() {} };';
        
        Http::fake([
            'www.youtube.com/iframe_api' => Http::response($mockScript, 200),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $response->assertStatus(200);
        $content = $response->getContent();
        $this->assertStringContainsString($mockScript, $content);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://www.youtube.com/iframe_api';
        });
    }

    public function test_youtube_iframe_api_caches_response(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $mockScript = 'var YT = { Player: function() {} };';
        
        Http::fake([
            'www.youtube.com/iframe_api' => Http::response($mockScript, 200),
        ]);

        $response1 = $this->get(route('youtube.iframe-api'));
        $response1->assertStatus(200);

        $response2 = $this->get(route('youtube.iframe-api'));
        $response2->assertStatus(200);

        Http::assertSentCount(1);
    }

    public function test_youtube_iframe_api_handles_http_errors_gracefully(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Cache::flush();

        Http::fake([
            'www.youtube.com/iframe_api' => Http::response('Error', 500),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $response->assertStatus(503);
    }

    public function test_youtube_iframe_api_handles_network_errors_gracefully(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Http::fake(function () {
            throw new \Exception('Network error');
        });

        $response = $this->get(route('youtube.iframe-api'));

        $response->assertStatus(503);
    }

    public function test_youtube_iframe_api_sets_cache_headers(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Cache::flush();

        Http::fake([
            'www.youtube.com/iframe_api' => Http::response('var YT = {};', 200),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $cacheControl = $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=3600', $cacheControl);
    }

    public function test_youtube_iframe_api_sets_cors_headers(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Cache::flush();

        Http::fake([
            'www.youtube.com/iframe_api' => Http::response('var YT = {};', 200),
        ]);

        $response = $this->get(route('youtube.iframe-api'));

        $this->assertTrue($response->headers->has('Access-Control-Allow-Origin'));
    }

    public function test_youtube_iframe_api_cache_can_be_cleared(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $mockScript = 'var YT = { Player: function() {} };';
        
        Http::fake([
            'www.youtube.com/iframe_api' => Http::response($mockScript, 200),
        ]);

        $this->get(route('youtube.iframe-api'));

        $this->assertTrue(Cache::has('youtube_iframe_api'));

        Cache::forget('youtube_iframe_api');

        $this->assertFalse(Cache::has('youtube_iframe_api'));
    }
}
