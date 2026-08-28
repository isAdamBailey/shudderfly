<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\UserTaggingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    /** Newest games first (Games index list order). Name/description are
     * translated at call time, so this can't be a compile-time const.
     *
     * `landmark` is the emoji for the game's building on the Games World road
     * — separate from `emoji` (the game's own icon) because a destination and
     * an icon aren't the same thing: Boom's icon is the poop, but its landmark
     * is the toilet, and the two cockroach games share an icon.
     * `distance` is the landmark's position along that road, in CSS px. It is
     * written out rather than derived from array order so a new game can be
     * dropped in mid-road without renumbering the rest. */
    private static function games(): array
    {
        return [
            'sprout-pox' => [
                'name' => __('messages.games.sprout_pox.name'),
                'emoji' => '🥬',
                'description' => __('messages.games.sprout_pox.description'),
                'landmark' => '🏥',
                'distance' => 600,
                'component' => 'SproutPox',
            ],
            'toot-foods' => [
                'name' => __('messages.games.toot_foods.name'),
                'emoji' => '🍑',
                'description' => __('messages.games.toot_foods.description'),
                'landmark' => '🍔',
                'distance' => 1500,
                'component' => 'TootFoods',
            ],
            'cockroach-fight' => [
                'name' => __('messages.games.cockroach_fight.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach_fight.description'),
                'landmark' => '🏟️',
                'distance' => 2400,
                'component' => 'CockroachFight',
            ],
            'costco-pizza-poop' => [
                'name' => __('messages.games.costco_pizza_poop.name'),
                'emoji' => '🍕',
                'description' => __('messages.games.costco_pizza_poop.description'),
                'landmark' => '🏪',
                'distance' => 3300,
                'component' => 'CostcoPizzaPoop',
            ],
            'boom' => [
                'name' => __('messages.games.boom.name'),
                'emoji' => '💩',
                'description' => __('messages.games.boom.description'),
                'landmark' => '🚽',
                'distance' => 4200,
                'component' => 'Boom',
            ],
            'cockroach' => [
                'name' => __('messages.games.cockroach.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach.description'),
                'landmark' => '🏚️',
                'distance' => 5100,
                'component' => 'Cockroach',
            ],
        ];
    }

    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index(): Response
    {
        $games = collect(self::games())
            ->map(fn ($game, $slug) => [
                'slug' => $slug,
                'name' => $game['name'],
                'emoji' => $game['emoji'],
                'description' => $game['description'],
                'landmark' => $game['landmark'],
                'distance' => $game['distance'],
            ])
            ->values()
            ->all();

        return Inertia::render('Games/Index', ['games' => $games]);
    }

    public function show(string $game): Response
    {
        $games = self::games();
        abort_if(! array_key_exists($game, $games), 404);

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);

        return Inertia::render('Games/'.$games[$game]['component'], [
            'users' => $users,
            'fartSoundUrl' => asset('fart.m4a'),
        ]);
    }

    public function shareScore(string $game, Request $request): RedirectResponse
    {
        $games = self::games();
        abort_if(! array_key_exists($game, $games), 404);

        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'score' => ['required', 'integer', 'min:0', 'max:99999999'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $gameName = $games[$game]['name'];

        $taggedUserIds = $validated['tagged_user_ids'] ?? [];
        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        $taggedUser = null;
        if (! empty($taggedUserIds)) {
            $taggedUser = User::select('id', 'name')->find($taggedUserIds[0]);
        }

        $shareMessage = __('messages.game_score_shared', [
            'game' => $gameName,
            'score' => $validated['score'],
        ]);
        $shareMessage .= "\u{E000}g:{$game}\u{E000}";
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => $shareMessage,
            'page_id' => null,
        ]);

        $message->load(['page', 'user']);

        if (! empty($taggedUserIds)) {
            $this->userTaggingService->notifyTaggedUsers(
                $taggedUserIds,
                $request->user(),
                $message,
                'message'
            );
        }
        event(new MessageCreated($message));

        return redirect()
            ->to(route('messages.index').'#message-'.$message->id)
            ->with('success', __('messages.game.score_shared'));
    }
}
