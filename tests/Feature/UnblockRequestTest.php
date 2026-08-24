<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\Sound;
use App\Models\User;
use App\Notifications\UnblockRequested;
use App\Services\ContentBlockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class UnblockRequestTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        // Admins always hold `edit pages` too.
        $admin->givePermissionTo(['admin', 'edit pages']);

        return $admin;
    }

    private function blockedPage(): Page
    {
        return Page::factory()->for(Book::factory()->create())->create(['blocked' => true]);
    }

    private function approveUrl(User $admin): string
    {
        return URL::temporarySignedRoute('unblock-requests.approve', now()->addDay(), [
            'user' => $admin->id,
        ]);
    }

    private function performUrl(User $admin): string
    {
        return URL::temporarySignedRoute('unblock-requests.perform', now()->addMinutes(30), [
            'user' => $admin->id,
        ]);
    }

    public function test_normal_user_request_notifies_every_admin(): void
    {
        Notification::fake();

        $admins = collect([$this->admin(), $this->admin()]);
        $bystander = User::factory()->create();
        $requester = User::factory()->create();
        $this->blockedPage();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertOk()
            ->assertJson(['sent' => true]);

        Notification::assertSentTo($admins->all(), UnblockRequested::class);
        Notification::assertNotSentTo([$bystander, $requester], UnblockRequested::class);
    }

    public function test_user_who_can_edit_pages_cannot_request(): void
    {
        Notification::fake();

        $this->admin();
        $editor = User::factory()->create();
        $editor->givePermissionTo('edit pages');
        $this->blockedPage();

        $this->actingAs($editor)
            ->postJson(route('unblock-requests.store'))
            ->assertForbidden();

        Notification::assertNothingSent();
    }

    public function test_request_sends_nothing_when_no_content_is_blocked(): void
    {
        Notification::fake();

        $this->admin();

        $this->actingAs(User::factory()->create())
            ->postJson(route('unblock-requests.store'))
            ->assertOk()
            ->assertJson(['sent' => false]);

        Notification::assertNothingSent();
    }

    public function test_request_is_throttled_after_repeated_attempts(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($requester)
                ->postJson(route('unblock-requests.store'))
                ->assertOk();
        }

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertStatus(429);
    }

    public function test_unattended_get_renders_the_form_without_unblocking(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();

        // Mail scanners and link rewriters fetch URLs unattended. They do not
        // run scripts or submit forms, so the GET must change nothing.
        $this->get($this->approveUrl($admin))
            ->assertOk()
            ->assertSee('unblock-form', false);

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_the_posted_form_unblocks_everything(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();
        $sound = Sound::factory()->create(['blocked' => true]);

        // No login step: the admin opens this from their email client.
        $this->post($this->performUrl($admin))
            ->assertOk()
            ->assertSee(__('messages.unblock_request.done_heading'));

        $this->assertFalse($page->fresh()->blocked);
        $this->assertFalse($sound->fresh()->blocked);
    }

    public function test_perform_shows_a_failure_screen_when_unblocking_throws(): void
    {
        $admin = $this->admin();
        $this->blockedPage();

        $this->mock(ContentBlockService::class, function ($mock) {
            $mock->shouldReceive('unblockAll')->andThrow(new \RuntimeException('db down'));
        });

        // The viewer has no other feedback channel, so a failure must say so.
        $this->post($this->performUrl($admin))
            ->assertStatus(500)
            ->assertSee(__('messages.unblock_request.failed_heading'));
    }

    public function test_perform_rejects_a_tampered_signature(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();

        $this->post($this->performUrl($admin).'&tampered=1')->assertForbidden();

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_perform_rejects_a_user_who_is_no_longer_admin(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();
        $url = $this->performUrl($admin);

        $admin->revokePermissionTo('admin');

        $this->post($url)->assertForbidden();

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_signed_link_rejects_a_tampered_signature(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();

        $response = $this->get($this->approveUrl($admin).'&tampered=1');

        $response->assertForbidden();
        // Assert the standalone Blade page rendered, NOT the Inertia error
        // shell. Checking for a translated string is useless here: the whole
        // translations array is shared into every Inertia response.
        $response->assertDontSee('data-page', false);
        $response->assertSee('unblock-expired-page', false);

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_signed_link_rejects_an_expired_signature(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();
        $url = $this->approveUrl($admin);

        $this->travel(2)->days();

        $this->get($url)->assertForbidden();

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_signed_link_rejects_a_user_who_is_no_longer_admin(): void
    {
        $admin = $this->admin();
        $page = $this->blockedPage();
        $url = $this->approveUrl($admin);

        $admin->revokePermissionTo('admin');

        $response = $this->get($url);

        $response->assertForbidden();
        // Must be the standalone page, not the Inertia shell: the recipient is
        // opening this from an email client and is very likely logged out. A
        // revoked admin is a different state from an expired link, and says so.
        $response->assertDontSee('data-page', false);
        $response->assertSee('unblock-no-access-page', false);

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_blocked_count_is_visible_to_a_normal_user(): void
    {
        $user = User::factory()->create();
        $this->blockedPage();
        Sound::factory()->create(['blocked' => true]);

        $this->actingAs($user)
            ->get(route('users.show', ['user' => $user->email]))
            ->assertInertia(fn ($page) => $page->where('blockedCount', 2));
    }
}
