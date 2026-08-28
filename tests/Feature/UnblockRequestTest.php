<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\Sound;
use App\Models\UnblockRequest;
use App\Models\User;
use App\Notifications\UnblockRequested;
use App\Services\ContentBlockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
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

    /**
     * The real emailed link, built the way the notification builds it.
     */
    private function approveUrl(User $admin, ?UnblockRequest $unblockRequest = null): string
    {
        return UnblockRequested::unblockUrl(
            $unblockRequest ?? UnblockRequest::factory()->create(),
            $admin
        );
    }

    private function performUrl(User $admin, ?UnblockRequest $unblockRequest = null): string
    {
        return URL::temporarySignedRoute('unblock-requests.perform', now()->addMinutes(30), [
            'unblockRequest' => ($unblockRequest ?? UnblockRequest::factory()->create())->id,
            'user' => $admin->id,
        ]);
    }

    /**
     * Opening the link again must refuse, and must leave newly blocked
     * content alone — that is the whole point of the change.
     */
    private function assertLinkIsDead(User $admin, UnblockRequest $unblockRequest): void
    {
        $page = $this->blockedPage();

        $this->post($this->performUrl($admin, $unblockRequest))
            ->assertOk()
            ->assertSee('unblock-already-handled-page', false);

        $this->assertTrue($page->fresh()->blocked);
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

    public function test_a_second_request_on_the_same_day_is_refused(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertOk();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertStatus(429)
            ->assertJson(['sent' => false]);

        $this->assertSame(1, UnblockRequest::where('user_id', $requester->id)->count());
    }

    public function test_a_request_is_allowed_again_the_next_day(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertOk();

        $this->travel(25)->hours();
        $this->blockedPage();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertOk()
            ->assertJson(['sent' => true]);

        $this->assertSame(2, UnblockRequest::where('user_id', $requester->id)->count());
    }

    public function test_a_new_request_supersedes_the_previous_one(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        $this->actingAs($requester)->postJson(route('unblock-requests.store'))->assertOk();
        $first = UnblockRequest::where('user_id', $requester->id)->sole();

        $this->travel(25)->hours();
        $this->actingAs($requester)->postJson(route('unblock-requests.store'))->assertOk();

        $this->assertNotNull($first->fresh()->resolved_at);
        $this->assertLinkIsDead($this->admin(), $first);
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

    public function test_the_link_only_works_once(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $this->post($this->performUrl($admin, $request))
            ->assertOk()
            ->assertSee(__('messages.unblock_request.done_heading'));

        $this->assertLinkIsDead($admin, $request);
    }

    public function test_the_landing_page_refuses_an_already_resolved_request(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create(['resolved_at' => now()]);
        $page = $this->blockedPage();

        $this->get($this->approveUrl($admin, $request))
            ->assertOk()
            ->assertSee('unblock-already-handled-page', false)
            ->assertDontSee('unblock-form', false);

        $this->assertTrue($page->fresh()->blocked);
    }

    public function test_unblocking_from_the_dashboard_kills_the_emailed_link(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $this->actingAs($admin)->post(route('pages.unblock-all'))->assertRedirect();

        $this->assertNotNull($request->fresh()->resolved_at);
        $this->assertLinkIsDead($admin, $request);
    }

    public function test_the_bell_unblocks_and_kills_the_emailed_link(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $page = $this->blockedPage();

        $this->actingAs($admin)
            ->postJson(route('unblock-requests.unblock', $request))
            ->assertOk();

        $this->assertFalse($page->fresh()->blocked);
        $this->assertNotNull($request->fresh()->resolved_at);
        $this->assertLinkIsDead($admin, $request);
    }

    /**
     * The bug this guards: unblock from the device notification, then again
     * from the bell entry for the same ask.
     */
    public function test_the_bell_refuses_an_ask_already_honored_from_the_email(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $this->post($this->performUrl($admin, $request))->assertOk();

        $laterBlock = $this->blockedPage();

        $this->actingAs($admin)
            ->postJson(route('unblock-requests.unblock', $request))
            ->assertStatus(409);

        $this->assertTrue($laterBlock->fresh()->blocked);
    }

    public function test_a_failed_bell_unblock_leaves_the_request_usable(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $this->mock(ContentBlockService::class, function ($mock) {
            $mock->shouldReceive('unblockAll')->andThrow(new \RuntimeException('db down'));
        });

        $this->actingAs($admin)
            ->postJson(route('unblock-requests.unblock', $request))
            ->assertStatus(500);

        $this->assertNull($request->fresh()->resolved_at);
    }

    public function test_a_user_without_edit_pages_cannot_use_the_bell_endpoint(): void
    {
        $request = UnblockRequest::factory()->create();

        $this->actingAs(User::factory()->create())
            ->postJson(route('unblock-requests.unblock', $request))
            ->assertForbidden();

        $this->assertNull($request->fresh()->resolved_at);
    }

    public function test_honoring_an_ask_clears_the_bell_entries(): void
    {
        $admin = $this->admin();
        $other = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $admin->notify(new UnblockRequested($request, User::factory()->create(), 1));
        $other->notify(new UnblockRequested($request, User::factory()->create(), 1));

        $this->actingAs($admin)
            ->postJson(route('unblock-requests.unblock', $request))
            ->assertOk();

        // Every admin's copy goes, not just the one who acted: the ask is
        // answered for all of them.
        $this->assertSame(0, DatabaseNotification::where('type', UnblockRequested::class)->count());

        $this->actingAs($admin)
            ->getJson(route('profile.notifications'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_a_spent_ask_clears_only_its_own_bell_entry(): void
    {
        $admin = $this->admin();
        $spent = UnblockRequest::factory()->create(['resolved_at' => now()]);
        $live = UnblockRequest::factory()->create();
        $this->blockedPage();

        $admin->notify(new UnblockRequested($spent, User::factory()->create(), 1));
        $admin->notify(new UnblockRequested($live, User::factory()->create(), 1));

        $this->actingAs($admin)
            ->postJson(route('unblock-requests.unblock', $spent))
            ->assertStatus(409);

        // The live ask is another child's and still needs answering.
        $remaining = DatabaseNotification::where('type', UnblockRequested::class)->get();
        $this->assertCount(1, $remaining);
        $this->assertSame($live->id, $remaining->first()->data['unblock_request_id']);
        $this->assertNull($live->fresh()->resolved_at);
    }

    public function test_unblocking_from_the_dashboard_clears_the_bell_entries(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $admin->notify(new UnblockRequested($request, User::factory()->create(), 1));

        $this->actingAs($admin)->post(route('pages.unblock-all'))->assertRedirect();

        $this->assertSame(0, DatabaseNotification::where('type', UnblockRequested::class)->count());
    }

    public function test_a_failed_unblock_leaves_the_request_usable(): void
    {
        $admin = $this->admin();
        $request = UnblockRequest::factory()->create();
        $this->blockedPage();

        $this->mock(ContentBlockService::class, function ($mock) {
            $mock->shouldReceive('unblockAll')->andThrow(new \RuntimeException('db down'));
        });

        $this->post($this->performUrl($admin, $request))->assertStatus(500);

        $this->assertNull($request->fresh()->resolved_at);
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

    public function test_an_honored_request_still_uses_up_the_day(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        $this->actingAs($requester)->postJson(route('unblock-requests.store'))->assertOk();

        // The admin acts on it, then something new gets blocked. Being
        // answered does not hand back the day's ask, or the limit would only
        // ever be as long as an admin's response time.
        $this->actingAs($this->admin())->post(route('pages.unblock-all'))->assertRedirect();
        $this->blockedPage();

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertStatus(429)
            ->assertJson(['sent' => false]);

        $this->assertSame(1, UnblockRequest::where('user_id', $requester->id)->count());
    }

    public function test_the_dashboard_still_reports_asked_today_after_the_request_is_honored(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        $this->actingAs($requester)->postJson(route('unblock-requests.store'))->assertOk();
        $this->actingAs($this->admin())->post(route('pages.unblock-all'))->assertRedirect();
        $this->blockedPage();

        $this->actingAs($requester)
            ->get(route('users.show', ['user' => $requester->email]))
            ->assertInertia(fn ($page) => $page->where('unblockAskedToday', true));
    }

    public function test_a_request_nobody_received_does_not_use_up_the_day(): void
    {
        $admin = $this->admin();
        $this->blockedPage();
        $requester = User::factory()->create();

        // Every send fails: no admin heard the ask.
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('mail down'));

        $this->actingAs($requester)
            ->postJson(route('unblock-requests.store'))
            ->assertStatus(500)
            ->assertJson(['sent' => false]);

        $this->assertSame(0, UnblockRequest::count());
        $this->assertFalse(UnblockRequest::askedToday($requester));
    }

    public function test_the_dashboard_reports_whether_the_user_asked_today(): void
    {
        Notification::fake();

        $this->admin();
        $this->blockedPage();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('users.show', ['user' => $user->email]))
            ->assertInertia(fn ($page) => $page->where('unblockAskedToday', false));

        $this->actingAs($user)->postJson(route('unblock-requests.store'))->assertOk();

        $this->actingAs($user)
            ->get(route('users.show', ['user' => $user->email]))
            ->assertInertia(fn ($page) => $page->where('unblockAskedToday', true));
    }
}
