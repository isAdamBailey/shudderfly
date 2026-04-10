<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSoundRequest;
use App\Http\Requests\UpdateSoundRequest;
use App\Jobs\StoreSoundAudio;
use App\Models\SiteSetting;
use App\Models\Sound;
use Illuminate\Http\RedirectResponse;
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
                abort(404, 'Sounds feature is currently disabled.');
            }

            return $next($request);
        });
    }

    public function index(): Response
    {
        return Inertia::render('Sounds/Index', [
            'sounds' => Sound::orderBy('title')->get(),
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

        return back()->with('success', 'Sound uploaded successfully.');
    }

    public function update(UpdateSoundRequest $request, Sound $sound): RedirectResponse
    {
        $sound->update([
            'title' => $request->title,
            'emoji' => $request->emoji,
        ]);

        return back()->with('success', 'Sound updated successfully.');
    }

    public function destroy(Sound $sound): RedirectResponse
    {
        $rawPath = $sound->getAttributes()['audio_path'] ?? null;
        if ($rawPath && ! str_starts_with($rawPath, 'https://')) {
            Storage::disk('s3')->delete($rawPath);
        }

        $sound->delete();

        return back()->with('success', 'Sound deleted successfully.');
    }
}
