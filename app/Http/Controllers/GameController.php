<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\UserTaggingService;
use App\Support\GamesWorld;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    /** Newest games first (Games index list order). Name/description are
     * translated at call time, so this can't be a compile-time const. Where
     * each game is in the Games World (on the road or in a room) is
     * GamesWorld::definitions()'s business, not this list's. */
    public static function games(): array
    {
        return [
            'sprout-pox' => [
                'name' => __('messages.games.sprout_pox.name'),
                'emoji' => '🥬',
                'description' => __('messages.games.sprout_pox.description'),
                'component' => 'SproutPox',
            ],
            'toot-foods' => [
                'name' => __('messages.games.toot_foods.name'),
                'emoji' => '🍑',
                'description' => __('messages.games.toot_foods.description'),
                'component' => 'TootFoods',
            ],
            'cockroach-fight' => [
                'name' => __('messages.games.cockroach_fight.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach_fight.description'),
                'component' => 'CockroachFight',
            ],
            'costco-pizza-poop' => [
                'name' => __('messages.games.costco_pizza_poop.name'),
                'emoji' => '🍕',
                'description' => __('messages.games.costco_pizza_poop.description'),
                'component' => 'CostcoPizzaPoop',
            ],
            'boom' => [
                'name' => __('messages.games.boom.name'),
                'emoji' => '💩',
                'description' => __('messages.games.boom.description'),
                'component' => 'Boom',
            ],
            'cockroach' => [
                'name' => __('messages.games.cockroach.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach.description'),
                'component' => 'Cockroach',
            ],
        ];
    }

    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index(Request $request): Response
    {
        // A shared link can open the world in a given place
        // (/games?scene=house.hall), or in front of a game's or a
        // minigame's launcher wherever it stands (/games?game=boom,
        // /games?minigame=toot-catch: a shared score's link back);
        // anything that isn't one of those is ignored.
        // `visit` is new on every request but kept when the browser comes
        // back to this page from history, so the world can tell a fresh click
        // on the link (open there) from coming back from a game (stay put).
        $scene = $request->query('scene');
        $game = $request->query('game');
        $minigame = $request->query('minigame');
        $scenes = GamesWorld::scenes();
        $place = match (true) {
            is_string($scene) && array_key_exists($scene, $scenes) => ['scene' => $scene],
            is_string($game) && array_key_exists($game, self::games()) => GamesWorld::whereIs('game', $game),
            is_string($minigame) && (in_array($minigame, GamesWorld::MINIGAMES, true) || in_array($minigame, GamesWorld::HOSTED, true)) => GamesWorld::whereIs('minigame', $minigame),
            default => null,
        };
        $link = $place ? [...$place, 'visit' => Str::random(12)] : null;

        return Inertia::render('Games/Index', [
            'scenes' => $scenes,
            'link' => $link,
            'fartSoundUrl' => asset('fart.m4a'),
            // Who a minigame's score can be shared with (ShareToChatButton).
            'users' => self::users(),
        ]);
    }

    public function show(string $game): Response
    {
        $games = self::games();
        abort_if(! array_key_exists($game, $games), 404);

        return Inertia::render('Games/'.$games[$game]['component'], [
            'users' => self::users(),
            'fartSoundUrl' => asset('fart.m4a'),
        ]);
    }

    /** Everyone a score can be shared with and tagged. */
    private static function users(): Collection
    {
        return User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);
    }

    /** Shares a score to the chat: for a game (`games()`), a world
     * minigame (GamesWorld::MINIGAMES), or a hosted game played in the
     * world (`in_world`, GamesWorld::HOSTED). The message carries a marker
     * the chat turns into a link back into the world, in front of where it
     * is launched from (index()). A hosted game's page omits `in_world`,
     * so that share stays a game link. */
    public function shareScore(string $game, Request $request): RedirectResponse
    {
        $games = self::games();
        $inMinigames = in_array($game, GamesWorld::MINIGAMES, true);
        $hosted = in_array($game, GamesWorld::HOSTED, true);
        abort_if(! $inMinigames && ! array_key_exists($game, $games), 404);

        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'score' => ['required', 'integer', 'min:0', 'max:99999999'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
            'in_world' => ['sometimes', 'boolean'],
        ]);

        $inWorld = $validated['in_world'] ?? false;
        abort_if($inWorld && ! $hosted, 404);
        $minigame = $inMinigames || $inWorld;

        $gameName = $inMinigames ? GamesWorld::minigameName($game) : $games[$game]['name'];

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
        $shareMessage .= $minigame ? "\u{E000}m:{$game}\u{E000}" : "\u{E000}g:{$game}\u{E000}";
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
