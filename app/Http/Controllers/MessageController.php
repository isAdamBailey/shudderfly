<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Jobs\StoreVoiceClip;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\UserTaggingService;
use App\Support\GamesWorld;
use App\Support\VoiceMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    /**
     * What MediaRecorder hands over: WebM/Opus (Chrome, Firefox), MP4/AAC
     * (Safari), Ogg/Opus (older Firefox). WebM and MP4 sniff as video/*.
     */
    private const VOICE_CLIP_MIMES = [
        'audio/webm',
        'video/webm',
        'audio/mp4',
        'video/mp4',
        'audio/x-m4a',
        'audio/aac',
        'audio/ogg',
        'application/ogg',
    ];

    public function __construct(
        protected PushNotificationService $pushNotificationService,
        protected UserTaggingService $userTaggingService
    ) {}

    /**
     * Display the messages index page.
     */
    public function index(): Response
    {
        // Get raw value to avoid accessor conversion
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return Inertia::render('Messages/Index', [
                'messages' => [],
                'messagingEnabled' => false,
            ]);
        }

        $messages = Message::with(['user', 'page', 'song', 'book.coverImage', 'sound', 'collage', 'reactions.user', 'comments.user', 'comments.reactions.user'])
            ->whereDoesntHave('page', fn ($query) => $query->hidden())
            ->recent()
            ->withinRetentionPeriod()
            ->paginate(20);

        // Transform messages to include grouped reactions and comments with grouped reactions
        $messages->getCollection()->transform(function ($message) {
            $message->grouped_reactions = $message->getGroupedReactions();

            // Transform comments to include grouped reactions
            $message->comments->transform(function ($comment) {
                $comment->grouped_reactions = $comment->getGroupedReactions();

                return $comment;
            });

            return $message;
        });

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);

        return Inertia::render('Messages/Index', [
            'messages' => $messages,
            'messagingEnabled' => true,
            'users' => $users,
            'tmdbImageBaseUrl' => config('services.tmdb.base_image_url'),
            // Which places an invite (GameController::invite) can still
            // link to; one to a room since gone reads as plain text.
            'worldScenes' => GamesWorld::sceneIds(),
        ]);
    }

    /**
     * Get a specific message by ID.
     */
    public function show(Message $message): JsonResponse
    {
        $message->load(['user', 'page', 'song', 'book.coverImage', 'sound', 'collage', 'reactions.user', 'comments.user', 'comments.reactions.user']);

        if ($message->page?->isHidden()) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Transform comments to include grouped reactions
        $comments = $message->comments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'comment' => $comment->comment,
                'created_at' => $comment->created_at->toIso8601String(),
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                ],
                'grouped_reactions' => $comment->getGroupedReactions(),
            ];
        });

        return response()->json([
            'id' => $message->id,
            'user_id' => $message->user_id,
            'message' => $message->message,
            ...$message->voiceClipPayload(),
            'created_at' => $message->created_at->toIso8601String(),
            'user' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
            ],
            'grouped_reactions' => $message->getGroupedReactions(),
            'comments' => $comments,
        ]);
    }

    /**
     * Store a newly created message.
     */
    public function store(Request $request): RedirectResponse
    {
        // Get raw value to avoid accessor conversion
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        if ($request->hasFile('voice_clip') && ! VoiceMessages::enabled()) {
            return back()->withErrors(['voice_clip' => __('messages.voice.disabled')]);
        }

        $maxSeconds = (int) config('voice_messages.max_seconds');

        $validated = $request->validate([
            // A voice-only message has no text.
            'message' => ['required_without:voice_clip', 'nullable', 'string', 'max:1000'],
            'voice_clip' => [
                'nullable',
                'file',
                'max:'.(int) config('voice_messages.max_kilobytes'),
                'mimetypes:'.implode(',', self::VOICE_CLIP_MIMES),
            ],
            // The browser stops at the cap; this catches one that didn't.
            // StoreVoiceClip also trims to it, whatever this claims.
            'voice_clip_duration' => ['required_with:voice_clip', 'nullable', 'numeric', 'min:0', 'max:'.$maxSeconds],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ], [
            'voice_clip_duration.max' => __('messages.voice.too_long', ['seconds' => $maxSeconds]),
        ]);

        /** @var User $user */
        $user = $request->user();

        // Stored before the message exists, so a failed write can't leave a
        // message stuck "processing" with no job to finish it.
        $voiceClipPath = $request->file('voice_clip')?->store('tmp/voice-clips', 'local');

        $message = Message::create([
            'user_id' => $user->id,
            'message' => $validated['message'] ?? null,
            'voice_clip_status' => $voiceClipPath ? Message::VOICE_CLIP_PROCESSING : null,
            // The browser's measure until StoreVoiceClip probes the real one.
            'voice_clip_duration' => $voiceClipPath ? (int) ceil($validated['voice_clip_duration']) : null,
        ]);

        // Load user relationship for broadcasting
        $message->load('user');

        $this->userTaggingService->processAndNotifyTaggedUsers(
            $validated,
            $user,
            $message,
            'message',
            'message'
        );

        // Broadcast the new message
        event(new MessageCreated($message));

        // After the broadcast, so a sync queue's "ready" can't arrive before
        // the message it belongs to.
        if ($voiceClipPath) {
            StoreVoiceClip::dispatch($message->id, $voiceClipPath);
        }

        // Flash message is handled via Echo broadcast for all users
        return back();
    }

    /**
     * Remove the specified message.
     */
    public function destroy(Message $message): RedirectResponse
    {
        // Only admins can delete messages
        if (! Auth::user()->hasPermissionTo('admin')) {
            abort(403, __('messages.admin.only_messages'));
        }

        $message->delete();

        return back()->with('success', __('messages.message.deleted'));
    }
}
