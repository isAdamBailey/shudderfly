<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Jobs\GenerateCollagePdf;
use App\Models\Collage;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\UserTaggingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CollageController extends Controller
{
    public function __construct(
        private UserTaggingService $userTaggingService
    ) {}

    public function index()
    {
        $collages = Collage::with('pages')->withCount('pages')->where('is_archived', false)->latest()->get();

        return Inertia::render('Collages/Index', [
            'collages' => $collages,
        ]);
    }

    public function archived()
    {
        $collages = Collage::with('pages')->withCount('pages')->where('is_archived', true)->latest()->paginate()->withQueryString();

        return Inertia::render('Collages/Archived', [
            'collages' => $collages,
        ]);
    }

    public function store(Request $request)
    {
        Collage::create();

        return redirect()->route('collages.index');
    }

    public function archive(Collage $collage)
    {
        $collage->update([
            'is_archived' => true,
            'is_locked' => false,
        ]);

        return redirect()->route('collages.archived');
    }

    public function destroy(Collage $collage)
    {
        $collage->delete();

        return redirect()->route('collages.archived');
    }

    public function restore(Collage $collage)
    {
        $collage->update(['is_archived' => false]);

        return redirect()->route('collages.index');
    }

    public function update(Request $request, Collage $collage)
    {
        $data = $request->validate([
            'is_locked' => 'required|boolean',
        ]);

        $collage->update($data);

        $message = $data['is_locked'] ? 'Collage has been locked.' : 'Collage has been unlocked.';

        return back()->with('success', $message);
    }

    public function generatePdf(Collage $collage)
    {
        GenerateCollagePdf::dispatch($collage);

        return redirect()->route('collages.archived')->with('success', 'Collage generation has been queued. You will receive an email when it\'s ready.');
    }

    public function share(Collage $collage, Request $request): RedirectResponse
    {
        if (! $collage->storage_path) {
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

        $shareMessage = __('messages.collage_shared');
        if ($taggedUser) {
            $shareMessage = $shareMessage.' @'.$taggedUser->name;
        }

        $message = Message::create([
            'user_id' => $request->user()->id,
            'message' => $shareMessage,
            'collage_id' => $collage->id,
        ]);

        $message->load(['collage', 'user']);

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
            ->with('success', __('messages.collage.shared'));
    }
}
