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
    private const GAMES = [
        'boom' => [
            'name' => 'Poop Boom',
            'emoji' => '💩',
            'description' => "Drag the poop into the toilet. 5 misses and it's game over!",
            'component' => 'Boom',
        ],
        'cockroach' => [
            'name' => 'Cockroach Fart',
            'emoji' => '🪳',
            'description' => "Tap the cockroach's head to make it hiss its way to the toilet.",
            'component' => 'Cockroach',
        ],
    ];

    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index(): Response
    {
        $games = collect(self::GAMES)
            ->map(fn ($game, $slug) => [
                'slug' => $slug,
                'name' => $game['name'],
                'emoji' => $game['emoji'],
                'description' => $game['description'],
            ])
            ->values()
            ->all();

        return Inertia::render('Games/Index', ['games' => $games]);
    }

    public function show(string $game): Response
    {
        abort_if(! array_key_exists($game, self::GAMES), 404);

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);

        return Inertia::render('Games/'.self::GAMES[$game]['component'], [
            'users' => $users,
        ]);
    }

    public function shareScore(string $game, Request $request): RedirectResponse
    {
        abort_if(! array_key_exists($game, self::GAMES), 404);

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

        $gameName = self::GAMES[$game]['name'];

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
