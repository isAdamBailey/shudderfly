<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\UserTaggingService;
use App\Support\GameShareMessage;
use App\Support\GamesWorld;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    /** Newest games first (Games index list order). Name/description are
     * translated at call time, so this can't be a compile-time const. Where
     * each game is in the Games World (on the road or in a room) is
     * GamesWorld::definitions()'s business, not this list's. A game's icon
     * is an `emoji`, or a `figure`: a cast member the cast kit draws, for
     * one with no emoji (Guster, issue #164). */
    public static function games(): array
    {
        return [
            'sprout-pox' => [
                'name' => __('messages.games.sprout_pox.name'),
                'emoji' => '🥬',
                'description' => __('messages.games.sprout_pox.description'),
            ],
            'toot-foods' => [
                'name' => __('messages.games.toot_foods.name'),
                'emoji' => '🍑',
                'description' => __('messages.games.toot_foods.description'),
            ],
            'cockroach-fight' => [
                'name' => __('messages.games.cockroach_fight.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach_fight.description'),
            ],
            'costco-pizza-poop' => [
                'name' => __('messages.games.costco_pizza_poop.name'),
                'emoji' => '🍕',
                'description' => __('messages.games.costco_pizza_poop.description'),
            ],
            'boom' => [
                'name' => __('messages.games.boom.name'),
                'figure' => 'guster',
                'description' => __('messages.games.boom.description'),
            ],
            'cockroach' => [
                'name' => __('messages.games.cockroach.name'),
                'emoji' => '🪳',
                'description' => __('messages.games.cockroach.description'),
            ],
        ];
    }

    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index(Request $request): Response
    {
        // A shared link can open the world in a given place
        // (/games?scene=house.hall, an invite's), or in front of a game's or a
        // minigame's launcher wherever it stands (/games?game=boom,
        // /games?minigame=toot-catch: a shared score's link back);
        // anything that isn't one of those is ignored.
        // A shared score says `minigame` for a game too; an older one says
        // `game`. `visit` is new on every request but kept when the browser
        // comes back to this page from history, so the world can tell a fresh
        // click on the link (open there) from coming back to it (stay put).
        $scene = $request->query('scene');
        $game = $request->query('game');
        $minigame = $request->query('minigame');
        $games = self::games();
        $place = match (true) {
            is_string($scene) && in_array($scene, GamesWorld::sceneIds(), true) => ['scene' => $scene],
            is_string($game) && array_key_exists($game, $games) => GamesWorld::whereIs('game', $game),
            is_string($minigame) && array_key_exists($minigame, $games) => GamesWorld::whereIs('game', $minigame),
            is_string($minigame) && in_array($minigame, GamesWorld::MINIGAMES, true) => GamesWorld::whereIs('minigame', $minigame),
            default => null,
        };
        $link = $place ? [...$place, 'visit' => Str::random(12)] : null;
        // An invite's link also names who sent it (`with`), for the world to
        // follow them in (issue #174); only a real user, never yourself.
        $with = filter_var($request->query('with'), FILTER_VALIDATE_INT);
        if ($link && $with && $with !== $request->user()->id && User::whereKey($with)->exists()) {
            $link['with'] = $with;
        }

        // Closures, so a request back for only the flash (an invite sent
        // from the world) builds none of it.
        return Inertia::render('Games/Index', [
            'scenes' => fn () => GamesWorld::scenes(),
            'link' => $link,
            'fartSoundUrl' => asset('fart.m4a'),
            // Recorded toots a cast member plays instead (Guster's).
            'castSounds' => fn () => GamesWorld::castSounds(),
            // Who a minigame's score can be shared with (ShareToChatButton),
            // or invited into the world.
            'users' => fn () => self::users(),
        ]);
    }

    /** Every game plays in its house now (issue #144). A game's old page
     * URL stands you at its launcher, the same place a shared score opens. */
    public function oldPage(string $game): RedirectResponse
    {
        abort_if(! array_key_exists($game, self::games()), 404);

        return redirect()->route('games.index', ['minigame' => $game]);
    }

    /** Everyone a score can be shared with and tagged. */
    private static function users(): Collection
    {
        return User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);
    }

    /** Invites people into the scene you're standing in (issue #174): one
     * chat message tagging everyone picked, whose place links to that scene
     * and to following you there. */
    public function invite(Request $request): RedirectResponse
    {
        if (! self::messagingEnabled()) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }
        if (! GamesWorld::togetherEnabled()) {
            return back()->withErrors(['message' => __('messages.games.world.invite_off')]);
        }

        $validated = $request->validate([
            'scene' => ['required', 'string', Rule::in(GamesWorld::sceneIds())],
            'tagged_user_ids' => ['required', 'array', 'min:1'],
            'tagged_user_ids.*' => ['integer', 'distinct', 'exists:users,id', Rule::notIn([$request->user()->id])],
        ]);

        // Checked against the cached ids; a room gone since is refused too.
        $place = GamesWorld::sceneSaid($validated['scene'])
            ?? throw ValidationException::withMessages(['scene' => __('validation.in', ['attribute' => 'scene'])]);

        $taggedUserIds = $validated['tagged_user_ids'];
        $names = User::whereIn('id', $taggedUserIds)->orderBy('name')->pluck('name');

        $this->postToChat(
            $request->user(),
            __('messages.games.world.invite_message', [
                'place' => GameShareMessage::invitePlace($validated['scene'], $place),
            ]).$names->map(fn ($name) => ' @'.$name)->implode(''),
            $taggedUserIds,
        );

        return back()->with('success', __('messages.games.world.invite_sent'));
    }

    /** Posts `$text` to the chat from `$from`, notifying everyone tagged. */
    private function postToChat(User $from, string $text, array $taggedUserIds): Message
    {
        $message = Message::create([
            'user_id' => $from->id,
            'message' => $text,
            'page_id' => null,
        ]);

        $message->load(['page', 'user']);

        if (! empty($taggedUserIds)) {
            $this->userTaggingService->notifyTaggedUsers($taggedUserIds, $from, $message, 'message');
        }
        event(new MessageCreated($message));

        return $message;
    }

    private static function messagingEnabled(): bool
    {
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();

        return $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';
    }

    /** Shares a score to the chat: a world minigame, or a game that plays in
     * its house. The `m:` marker is a link back to the launcher (index()).
     * Older messages still carry `g:<slug>`, which links to the same spot. */
    public function shareScore(string $game, Request $request): RedirectResponse
    {
        $games = self::games();
        $inMinigames = in_array($game, GamesWorld::MINIGAMES, true);
        abort_if(! $inMinigames && ! array_key_exists($game, $games), 404);

        if (! self::messagingEnabled()) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'score' => ['required', 'integer', 'min:0', 'max:99999999'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

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
        // Where it was played, after the score: the chat links the game's
        // name by "I scored … in …!" (MessageTimeline.vue), so that leads.
        $where = GamesWorld::whereIsSaid('minigame', $game);
        if ($where) {
            $shareMessage .= ' '.__('messages.game_score_shared_where', ['place' => $where]);
        }
        $shareMessage .= "\u{E000}m:{$game}\u{E000}";
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = $this->postToChat($request->user(), $shareMessage, $taggedUserIds);

        return redirect()
            ->to(route('messages.index').'#message-'.$message->id)
            ->with('success', __('messages.game.score_shared'));
    }
}
