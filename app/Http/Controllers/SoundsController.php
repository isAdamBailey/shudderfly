<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Http\Requests\StoreSoundRequest;
use App\Http\Requests\UpdateSoundRequest;
use App\Jobs\StoreSoundAudio;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\Sound;
use App\Models\User;
use App\Services\UserTaggingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SoundsController extends Controller
{
    public function __construct(
        private UserTaggingService $userTaggingService
    ) {
        $this->middleware(function ($request, $next) {
            $soundsEnabled = SiteSetting::where('key', 'sounds_enabled')->first()?->value ?? false;

            if (! $soundsEnabled) {
                abort(404, __('messages.sound.disabled'));
            }

            return $next($request);
        });
    }

    public function index(Request $request): Response
    {
        $sort = $request->query('sort', 'date_added');

        $soundsQuery = Sound::notBlocked();

        if ($sort === 'alphabetical') {
            $soundsQuery->orderBy('title');
        } else {
            $sort = 'date_added';
            $soundsQuery->orderByDesc('created_at');
        }

        return Inertia::render('Sounds/Index', [
            'sounds' => $soundsQuery->get(),
            'sort' => $sort,
        ]);
    }

    public function store(StoreSoundRequest $request): RedirectResponse
    {
        $file = $request->file('audio');
        $storedPath = $file->store('tmp/sounds', 'local');
        $data = $request->validated();

        StoreSoundAudio::dispatch(
            $storedPath,
            $data['title'],
            $data['emoji'] ?? null,
        );

        return back()->with('success', __('messages.sound.uploaded'));
    }

    public function update(UpdateSoundRequest $request, Sound $sound): RedirectResponse
    {
        $sound->update([
            'title' => $request->title,
            'emoji' => $request->emoji,
        ]);

        return back()->with('success', __('messages.sound.updated'));
    }

    public function block(Sound $sound): Redirector|RedirectResponse
    {
        $sound->update(['blocked' => true]);

        return redirect(route('sounds.index'))->with('success', __('messages.sound.blocked'));
    }

    public function destroy(Sound $sound): RedirectResponse
    {
        $rawPath = $sound->getAttributes()['audio_path'] ?? null;
        $key = Sound::s3KeyFromStoredPath($rawPath);
        if ($key !== null) {
            Storage::disk('s3')->delete($key);
        }

        $sound->delete();

        return back()->with('success', __('messages.sound.deleted'));
    }

    public function share(Sound $sound, Request $request): RedirectResponse
    {
        if ($sound->blocked) {
            abort(404);
        }

        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $taggedUserIds = $validated['tagged_user_ids'] ?? [];
        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        $taggedUser = null;
        if ($taggedUserIds !== []) {
            $taggedUser = User::select('id', 'name')->find($taggedUserIds[0]);
        }

        $shareMessage = __('messages.sound_shared', ['title' => $sound->title]);
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => $shareMessage,
            'sound_id' => $sound->id,
        ]);

        $message->load(['sound', 'user']);

        if ($taggedUserIds !== []) {
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
            ->with('success', __('messages.sound.shared'));
    }
}
