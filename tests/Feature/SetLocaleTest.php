<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetLocaleTest extends TestCase
{
    use RefreshDatabase;

    private function searchLabel($response): string
    {
        return $response->viewData('page')['props']['translations']['search.label'];
    }

    public function test_stored_user_locale_takes_precedence_over_accept_language()
    {
        $user = User::factory()->create([
            'locale' => 'es',
        ]);

        $response = $this
            ->actingAs($user)
            ->withHeaders(['Accept-Language' => 'en-US,en;q=0.9'])
            ->get('/profile');

        $this->assertSame('Buscar', $this->searchLabel($response));
    }

    public function test_locale_is_auto_detected_from_accept_language_when_not_set()
    {
        $user = User::factory()->create([
            'locale' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->withHeaders(['Accept-Language' => 'es-ES,es;q=0.9'])
            ->get('/profile');

        $this->assertSame('Buscar', $this->searchLabel($response));
    }

    public function test_locale_falls_back_to_english_for_unsupported_accept_language()
    {
        $user = User::factory()->create([
            'locale' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->withHeaders(['Accept-Language' => 'fr-FR,fr;q=0.9'])
            ->get('/profile');

        $this->assertSame('Search', $this->searchLabel($response));
    }

    public function test_guest_locale_is_detected_from_accept_language()
    {
        $response = $this
            ->withHeaders(['Accept-Language' => 'es-ES,es;q=0.9'])
            ->get('/login');

        $this->assertSame('Buscar', $this->searchLabel($response));
    }
}
