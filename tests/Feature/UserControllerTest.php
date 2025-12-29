<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_view_user_profiles()
    {
        $viewer = User::factory()->create();
        $profileUser = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $response = $this->actingAs($viewer)->get(route('users.show', $profileUser->email));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Users/Show')
            ->has('profileUser')
            ->where('profileUser.name', 'Test User')
            ->where('profileUser.email', 'test@example.com')
            ->has('stats')
            ->has('recentMessages')
        );
    }

    public function test_guests_cannot_view_user_profiles()
    {
        $profileUser = User::factory()->create();

        $response = $this->get(route('users.show', $profileUser->email));

        $response->assertRedirect(route('login'));
    }

    public function test_user_profile_shows_correct_book_count()
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create(['name' => 'Book Author']);

        Book::factory()->count(3)->create(['author' => 'Book Author', 'read_count' => 100]);
        Book::factory()->count(2)->create(['author' => 'Different Author', 'read_count' => 50]);

        $response = $this->actingAs($viewer)->get(route('users.show', $author->email));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->where('stats.totalBooksCount', 3)
            ->has('stats.topBooks', 3)
            ->has('stats.recentBooks', 3)
        );
    }

    public function test_user_profile_shows_correct_message_count()
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();

        Message::factory()->count(5)->create(['user_id' => $author->id]);
        Message::factory()->count(3)->create(['user_id' => $viewer->id]);

        $response = $this->actingAs($viewer)->get(route('users.show', $author->email));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->where('stats.messagesCount', 5)
        );
    }

    public function test_user_profile_shows_recent_messages()
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();

        Message::factory()->count(15)->create(['user_id' => $author->id]);

        $response = $this->actingAs($viewer)->get(route('users.show', $author->email));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('recentMessages', 10) // Should only show 10 most recent
        );
    }

    public function test_404_for_nonexistent_user()
    {
        $viewer = User::factory()->create();

        $response = $this->actingAs($viewer)->get(route('users.show', 'nonexistent@example.com'));

        $response->assertStatus(404);
    }
}
