<?php

namespace Tests\Feature;

use App\Http\Controllers\GameController;
use App\Support\GamesWorld;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Validates the whole scene registry rather than any one scene, so every
 * scene added later is checked by the same rules without a new test.
 */
class GamesWorldScenesTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_game_has_a_place_on_the_road(): void
    {
        $placed = collect(GamesWorld::definitions()['road']['interactables'])
            ->where('type', 'game')
            ->pluck('game')
            ->all();

        $this->assertEqualsCanonicalizing(array_keys(GameController::games()), $placed);
    }

    public function test_interactable_ids_are_unique_within_a_scene(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            $ids = array_column($scene['interactables'], 'id');
            $this->assertSame(array_unique($ids), $ids, "{$sceneId} has duplicate ids");
        }
    }

    public function test_scenes_fill_in_games(): void
    {
        $boom = collect(GamesWorld::scenes()['road']['interactables'])->firstWhere('id', 'boom');

        $this->assertSame('Poop Boom', $boom['label']);
        $this->assertSame('🚽', $boom['emoji']);
        $this->assertSame(4200, $boom['x']);
        $this->assertSame([
            'slug' => 'boom',
            'name' => 'Poop Boom',
            'emoji' => '💩',
            'description' => __('messages.games.boom.description'),
            'landmark' => '🚽',
        ], $boom['card']);
    }
}
