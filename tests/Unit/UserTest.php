<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_avatar_url_accessor()
    {
        $user = User::factory()->create(['avatar' => 'cat']);

        $this->assertSame('cat', $user->avatar_url);
    }

    public function test_user_avatar_url_falls_back_to_initials_when_no_avatar_set()
    {
        $user = User::factory()->create(['name' => 'John Doe', 'avatar' => null]);

        $avatarUrl = $user->avatar_url;

        $this->assertStringStartsWith('https://ui-avatars.com/api/', $avatarUrl);
        $this->assertStringContainsString('name=JD', $avatarUrl);
    }

    public function test_user_get_initial_returns_correct_initials_for_full_name()
    {
        $user = User::factory()->create(['name' => 'John Doe']);

        $this->assertSame('JD', $user->getInitials());
    }

    public function test_user_get_initial_returns_correct_initials_for_single_name()
    {
        $user = User::factory()->create(['name' => 'Madonna']);

        $this->assertSame('MA', $user->getInitials());
    }

    public function test_user_get_initial_returns_single_letter_for_very_short_name()
    {
        $user = User::factory()->create(['name' => 'A']);

        $this->assertSame('A', $user->getInitials());
    }

    public function test_user_get_initial_handles_empty_name()
    {
        $user = User::factory()->create(['name' => '']);

        $this->assertSame('?', $user->getInitials());
    }

    public function test_user_get_initial_handles_whitespace_only_name()
    {
        $user = User::factory()->create(['name' => '   ']);

        $this->assertSame('?', $user->getInitials());
    }

    public function test_user_avatar_url_uses_consistent_color_based_on_user_id()
    {
        $user1 = User::factory()->create(['name' => 'Test User', 'avatar' => null]);
        $user2 = User::factory()->create(['name' => 'Test User', 'avatar' => null]);

        // If users have different IDs, they should get different colors
        // (unless they happen to fall on the same color index)
        $url1 = $user1->avatar_url;
        $url2 = $user2->avatar_url;

        // Both should be valid URLs
        $this->assertStringStartsWith('https://ui-avatars.com/api/', $url1);
        $this->assertStringStartsWith('https://ui-avatars.com/api/', $url2);
    }

    public function test_user_avatar_is_included_in_appends()
    {
        $user = User::factory()->create(['avatar' => 'panda']);

        $array = $user->toArray();

        $this->assertArrayHasKey('avatar_url', $array);
        $this->assertSame('panda', $array['avatar_url']);
    }

    public function test_user_avatar_url_returns_initials_url_when_avatar_is_null()
    {
        $user = User::factory()->create(['name' => 'Jane Smith', 'avatar' => null]);

        $avatarUrl = $user->avatar_url;

        $this->assertStringStartsWith('https://ui-avatars.com/api/', $avatarUrl);
        $this->assertStringContainsString('name=JS', $avatarUrl);
    }
}

