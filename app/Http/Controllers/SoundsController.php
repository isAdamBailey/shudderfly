<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSoundRequest;
use App\Http\Requests\UpdateSoundRequest;
use App\Jobs\StoreSoundAudio;
use App\Models\SiteSetting;
use App\Models\Sound;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SoundsController extends Controller
{
    public function __construct()
    {
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

        $soundsQuery = Sound::query();

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
}
