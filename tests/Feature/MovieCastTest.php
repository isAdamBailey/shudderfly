<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
use App\Models\MovieFavorite;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MovieCastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.tmdb.api_key' => 'test-key',
            'services.tmdb.base_api_url' => 'https://api.themoviedb.org/3',
            'services.tmdb.base_image_url' => 'https://image.tmdb.org/t/p/w200',
        ]);
    }

    public function test_movie_cast_page_is_displayed(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        MovieFavorite::query()->create([
            'tmdb_id' => 550,
            'title' => 'Fight Club',
            'image_path' => '/poster.jpg',
        ]);

        $response = $this->get(route('movie-cast.index'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('MovieCast/Index')
                ->where('tmdbImageBaseUrl', 'https://image.tmdb.org/t/p/w200')
                ->where('title', null)
                ->has('favorites', 1)
                ->where('favorites.0.id', 550)
                ->where('favorites.0.title', 'Fight Club')
        );
    }

    public function test_movie_cast_page_accepts_title_query_param(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('movie-cast.index', ['title' => 'Toy Story']));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('MovieCast/Index')
                ->where('title', 'Toy Story')
        );
    }

    public function test_movie_cast_search_returns_filtered_results(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Http::fake([
            'api.themoviedb.org/3/search/movie*' => Http::response([
                'results' => [
                    [
                        'id' => 862,
                        'title' => 'Toy Story',
                        'release_date' => '1995-11-22',
                        'poster_path' => '/toy.jpg',
                    ],
                ],
            ]),
            'api.themoviedb.org/3/movie/862/release_dates*' => Http::response([
                'results' => [
                    [
                        'iso_3166_1' => 'US',
                        'release_dates' => [
                            ['certification' => 'G'],
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson(route('movie-cast.search', ['query' => 'Toy Story']));

        $response->assertOk()
            ->assertJson([
                [
                    'id' => 862,
                    'title' => 'Toy Story',
                    'release_date' => '1995-11-22',
                    'poster_path' => '/toy.jpg',
                ],
            ]);
    }

    public function test_movie_cast_search_excludes_restricted_certifications(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        Http::fake([
            'api.themoviedb.org/3/search/movie*' => Http::response([
                'results' => [
                    [
                        'id' => 550,
                        'title' => 'Fight Club',
                        'release_date' => '1999-10-15',
                        'poster_path' => '/fight.jpg',
                    ],
                ],
            ]),
            'api.themoviedb.org/3/movie/550/release_dates*' => Http::response([
                'results' => [
                    [
                        'iso_3166_1' => 'US',
                        'release_dates' => [
                            ['certification' => 'R'],
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson(route('movie-cast.search', ['query' => 'Fight Club']));

        $response->assertOk()->assertExactJson([]);
    }

    public function test_authenticated_user_can_add_and_remove_shared_favorite(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $storeResponse = $this->postJson(route('movie-cast.favorites.store'), [
            'id' => 862,
            'title' => 'Toy Story',
            'image_path' => '/toy.jpg',
        ]);

        $storeResponse->assertOk()
            ->assertJson([
                [
                    'id' => 862,
                    'title' => 'Toy Story',
                    'image_path' => '/toy.jpg',
                ],
            ]);

        $this->assertDatabaseHas('movie_favorites', [
            'tmdb_id' => 862,
            'title' => 'Toy Story',
        ]);

        $destroyResponse = $this->deleteJson(route('movie-cast.favorites.destroy', 862));

        $destroyResponse->assertOk()->assertExactJson([]);
        $this->assertDatabaseMissing('movie_favorites', ['tmdb_id' => 862]);
    }

    public function test_movie_cast_routes_require_authentication(): void
    {
        $this->get(route('movie-cast.index'))->assertRedirect(route('login'));
        $this->getJson(route('movie-cast.search', ['query' => 'Toy Story']))
            ->assertUnauthorized();
        $this->postJson(route('movie-cast.favorites.store'), [
            'id' => 1,
            'title' => 'Test',
        ])->assertUnauthorized();
        $this->post(route('movie-cast.share'), [
            'tmdb_id' => 862,
            'title' => 'Toy Story',
        ])->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_share_movie_to_chat(): void
    {
        Event::fake();

        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('movie-cast.share'), [
            'tmdb_id' => 862,
            'title' => 'Toy Story',
            'image_path' => '/toy.jpg',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'movie_tmdb_id' => 862,
            'movie_title' => 'Toy Story',
            'movie_image_path' => '/toy.jpg',
            'message' => __('messages.movie_shared', ['title' => 'Toy Story']),
        ]);

        Event::assertDispatched(MessageCreated::class);
    }
}
