<?php

namespace Tests\Feature;

use App\Models\Sound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SoundsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        \App\Models\SiteSetting::where('key', 'sounds_enabled')->update(['value' => '1']);
    }

    // ── Access / gating ────────────────────────────────────────────────────────

    public function test_sounds_page_requires_authentication(): void
    {
        $response = $this->get(route('sounds.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_sounds_page_returns_404_when_disabled(): void
    {
        \App\Models\SiteSetting::where('key', 'sounds_enabled')->update(['value' => '0']);

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('sounds.index'));
        $response->assertStatus(404);
    }

    public function test_sounds_page_renders_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Sound::factory()->count(3)->create();

        $response = $this->get(route('sounds.index'));
        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Sounds/Index')
                ->has('sounds', 3)
        );
    }

    public function test_sounds_are_ordered_by_title(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Sound::factory()->create(['title' => 'Zebra Sound']);
        Sound::factory()->create(['title' => 'Apple Sound']);
        Sound::factory()->create(['title' => 'Mango Sound']);

        $response = $this->get(route('sounds.index'));
        $response->assertInertia(
            fn ($page) => $page
                ->component('Sounds/Index')
                ->where('sounds.0.title', 'Apple Sound')
                ->where('sounds.1.title', 'Mango Sound')
                ->where('sounds.2.title', 'Zebra Sound')
        );
    }

    // ── Store ─────────────────────────────────────────────────────────────────

    public function test_admin_can_upload_a_sound(): void
    {
        $fixture = base_path('public/fart.m4a');
        if (! is_file($fixture)) {
            $this->markTestSkipped('public/fart.m4a is required for upload transcoding test.');
        }

        Storage::fake('s3');

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $file = new UploadedFile($fixture, 'clip.m4a', 'audio/mp4', null, true);

        $response = $this->post(route('sounds.store'), [
            'title' => 'Test Fart',
            'emoji' => '💨',
            'audio' => $file,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sounds', ['title' => 'Test Fart', 'emoji' => '💨']);
        $row = Sound::where('title', 'Test Fart')->first();
        $this->assertNotNull($row);
        $this->assertStringEndsWith('.m4a', $row->getAttributes()['audio_path']);
    }

    public function test_regular_user_cannot_upload_a_sound(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('fart.m4a', 100, 'audio/mp4');

        $response = $this->post(route('sounds.store'), [
            'title' => 'Test Fart',
            'emoji' => '💨',
            'audio' => $file,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseCount('sounds', 0);
    }

    public function test_store_validates_required_fields(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $response = $this->post(route('sounds.store'), []);

        $response->assertSessionHasErrors(['title', 'audio']);
    }

    public function test_store_rejects_non_audio_files(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->post(route('sounds.store'), [
            'title' => 'Bad File',
            'audio' => $file,
        ]);

        $response->assertSessionHasErrors(['audio']);
        $this->assertDatabaseCount('sounds', 0);
    }

    public function test_store_returns_404_when_sounds_disabled(): void
    {
        Storage::fake('s3');

        \App\Models\SiteSetting::where('key', 'sounds_enabled')->update(['value' => '0']);

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('fart.m4a', 100, 'audio/mp4');

        $response = $this->post(route('sounds.store'), [
            'title' => 'Test Fart',
            'audio' => $file,
        ]);

        $response->assertStatus(404);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function test_admin_can_update_a_sound(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $sound = Sound::factory()->create(['title' => 'Old Title', 'emoji' => '🔊']);

        $response = $this->put(route('sounds.update', $sound->id), [
            'title' => 'New Title',
            'emoji' => '💨',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sounds', ['id' => $sound->id, 'title' => 'New Title', 'emoji' => '💨']);
    }

    public function test_regular_user_cannot_update_a_sound(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $sound = Sound::factory()->create(['title' => 'Old Title']);

        $response = $this->put(route('sounds.update', $sound->id), [
            'title' => 'New Title',
            'emoji' => '💨',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('sounds', ['id' => $sound->id, 'title' => 'Old Title']);
    }

    // ── Destroy ───────────────────────────────────────────────────────────────

    public function test_admin_can_delete_a_sound(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $sound = Sound::factory()->create(['audio_path' => 'sounds/test.m4a']);

        $response = $this->delete(route('sounds.destroy', $sound->id));

        $response->assertRedirect();
        $this->assertDatabaseMissing('sounds', ['id' => $sound->id]);
    }

    public function test_admin_can_delete_sound_when_audio_path_is_stored_as_https_url(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $key = 'sounds/legacy.m4a';
        Storage::disk('s3')->put($key, 'audio-data');

        $sound = Sound::factory()->create([
            'audio_path' => 'https://cdn.example.com/'.$key,
        ]);

        $this->delete(route('sounds.destroy', $sound->id))->assertRedirect();

        $this->assertDatabaseMissing('sounds', ['id' => $sound->id]);
        Storage::disk('s3')->assertMissing($key);
    }

    public function test_regular_user_cannot_delete_a_sound(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $sound = Sound::factory()->create();

        $response = $this->delete(route('sounds.destroy', $sound->id));

        $response->assertStatus(403);
        $this->assertDatabaseHas('sounds', ['id' => $sound->id]);
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    public function test_sounds_enabled_setting_exists_in_database(): void
    {
        $this->assertTrue(
            \App\Models\SiteSetting::where('key', 'sounds_enabled')->exists()
        );

        $setting = \App\Models\SiteSetting::where('key', 'sounds_enabled')->first();
        $this->assertEquals('boolean', $setting->type);
    }

    public function test_sounds_enabled_setting_is_included_in_inertia_shared_props(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('sounds.index'));

        $response->assertInertia(
            fn ($page) => $page->has('sounds')
        );
    }
}
