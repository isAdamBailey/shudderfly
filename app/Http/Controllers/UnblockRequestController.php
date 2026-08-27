<?php

namespace App\Http\Controllers;

use App\Models\UnblockRequest;
use App\Models\User;
use App\Notifications\UnblockRequested;
use App\Services\ContentBlockService;
use App\Services\PushNotificationService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

/**
 * Lets a non-privileged user ask an admin to unblock content, and lets an
 * admin act on that request straight from the alert email via a signed link.
 */
class UnblockRequestController extends Controller
{
    /**
     * How long the auto-submitted POST stays valid once the page has loaded.
     */
    private const PERFORM_LINK_MINUTES = 30;

    public function __construct(
        private ContentBlockService $contentBlockService,
        private PushNotificationService $pushNotificationService,
    ) {}

    /**
     * A user asks for the blocked content to be unblocked. Alerts every admin.
     */
    public function store(Request $request): JsonResponse
    {
        $requester = $request->user();

        // Users who can unblock have the button; they should not be asking.
        abort_if($requester->can('edit pages'), 403);

        $count = $this->contentBlockService->blockedCount();

        if ($count === 0) {
            return response()->json([
                'message' => __('messages.dashboard.blocked_none'),
                'sent' => false,
            ]);
        }

        // 429 is deliberate: the panel already treats that status as
        // "you have asked today".
        if (UnblockRequest::askedToday($requester)) {
            return response()->json([
                'message' => __('messages.dashboard.request_unblock_limit'),
                'sent' => false,
            ], 429);
        }

        // Only the newest ask stays live, so an admin can never be holding two
        // working links for the same child.
        UnblockRequest::resolveAll(UnblockRequest::where('user_id', $requester->id));

        $unblockRequest = UnblockRequest::create(['user_id' => $requester->id]);

        $title = __('messages.unblock_request.title', ['name' => $requester->name]);
        $body = __('messages.unblock_request.body', ['count' => $count]);

        $reached = 0;

        foreach (User::admins()->get() as $admin) {
            // One admin's mail server or push endpoint failing must not strand
            // the rest, and the child should not see an error for something
            // they can't fix. sendNotification() is not exception-safe end to
            // end — WebPush::flush() throws outside its own guards — so both
            // sends are covered.
            try {
                $admin->notify(new UnblockRequested($unblockRequest, $requester, $count));

                // Web push is not a notification channel in this app; it is
                // sent imperatively alongside the notification.
                $this->pushNotificationService->sendNotification(
                    $admin->id,
                    $title,
                    $body,
                    [
                        'type' => 'unblock_request',
                        'requester_id' => $requester->id,
                        'requester_name' => $requester->name,
                        'blocked_count' => $count,
                        // A push tap can only open a URL, so send it to the
                        // same signed link the email uses.
                        'url' => UnblockRequested::unblockUrl($unblockRequest, $admin),
                    ]
                );

                $reached++;
            } catch (Throwable $e) {
                Log::error('unblock_request notify failed', [
                    'admin_id' => $admin->id,
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        if ($reached === 0) {
            // Nobody heard the ask, so it must not count against the day's
            // limit — otherwise a mail outage silently locks the child out
            // behind a success message.
            $unblockRequest->delete();

            return response()->json([
                'message' => __('messages.dashboard.request_unblock_error'),
                'sent' => false,
            ], 500);
        }

        return response()->json([
            'message' => __('messages.dashboard.request_unblock_sent'),
            'sent' => true,
        ]);
    }

    /**
     * Landing page for the signed link in the alert email.
     *
     * This only renders; the page immediately POSTs to perform the unblock.
     * Mail scanners and link rewriters fetch URLs unattended but do not run
     * scripts or submit forms, so the blocklist survives an unattended GET.
     */
    public function approve(Request $request, UnblockRequest $unblockRequest, User $user): Response
    {
        $this->assertStillAdmin($user);

        if ($unblockRequest->isResolved()) {
            return $this->statusView('already-handled');
        }

        return response()->view('unblock.approving', [
            'performUrl' => URL::temporarySignedRoute(
                'unblock-requests.perform',
                now()->addMinutes(self::PERFORM_LINK_MINUTES),
                ['unblockRequest' => $unblockRequest->id, 'user' => $user->id]
            ),
        ]);
    }

    /**
     * Auto-submitted from the landing page. Performs the unblock.
     */
    public function perform(Request $request, UnblockRequest $unblockRequest, User $user): Response
    {
        $this->assertStillAdmin($user);

        // The claim is the guard against a re-opened link; unblockAll() below
        // separately retires every live ask. Both are needed — don't fold them.
        if (! $unblockRequest->claim()) {
            return $this->statusView('already-handled');
        }

        // The viewer has no other feedback channel here, so a failure must
        // render as a failure rather than a generic 500.
        try {
            $count = $this->contentBlockService->unblockAll($user);
        } catch (Throwable $e) {
            Log::error('unblock_request perform failed', [
                'admin_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            $unblockRequest->release();

            return $this->statusView('failed', 500);
        }

        return $this->statusView('done', 200, ['count' => $count]);
    }

    /**
     * One of the outcome screens in unblock/status.blade.php.
     *
     * @param  string  $status  Slug naming the screen and its strings.
     * @param  array<string, mixed>  $replacements  Placeholders for the body.
     */
    private function statusView(string $status, int $code = 200, array $replacements = []): Response
    {
        return response()->view(
            'unblock.status',
            ['status' => $status, 'replacements' => $replacements],
            $code
        );
    }

    /**
     * A link issued to someone who has since lost admin must stop working.
     *
     * Thrown as a rendered response rather than aborted, so a logged-out
     * recipient gets the standalone page instead of the Inertia error shell.
     * This is a different state from an expired link, and says so.
     */
    private function assertStillAdmin(User $user): void
    {
        if (! $user->can('admin')) {
            throw new HttpResponseException($this->statusView('no-access', 403));
        }
    }
}
