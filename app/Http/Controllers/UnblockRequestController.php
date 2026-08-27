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

    /**
     * honour() outcomes that aren't a count. Negative because a real count
     * never is, which keeps the callers to a plain comparison.
     */
    private const CLAIM_LOST = -1;

    private const UNBLOCK_FAILED = -2;

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
            // behind a success message. Any bell entry a part-failed send
            // already wrote goes with it, or it would outlive its row.
            UnblockRequested::forget($unblockRequest);
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
     * The same approval, taken from the in-app notification bell.
     *
     * It claims the very same row the emailed link claims, or an admin could
     * honour one ask twice: once from the device notification, then again
     * from the bell, unblocking whatever got blocked in between.
     */
    public function unblock(Request $request, UnblockRequest $unblockRequest): JsonResponse
    {
        $count = $this->honour($unblockRequest, $request->user(), 'bell');

        if ($count === self::CLAIM_LOST) {
            // Spent, but the sweep that normally clears these ran before this
            // entry existed or missed it, so retire this one on its own — any
            // other ask may still be live and must stay clickable.
            UnblockRequested::forget($unblockRequest);

            // 409 rather than an error: nothing is wrong, the ask is just
            // spent. The bell renders it as a notice, not a failure.
            return response()->json([
                'message' => __('messages.unblock_request.already_handled_body'),
            ], 409);
        }

        if ($count === self::UNBLOCK_FAILED) {
            return response()->json([
                'message' => __('messages.dashboard.request_unblock_error'),
            ], 500);
        }

        return response()->json([
            'message' => __('messages.unblocked_all', ['count' => $count]),
        ]);
    }

    /**
     * Auto-submitted from the landing page. Performs the unblock.
     */
    public function perform(Request $request, UnblockRequest $unblockRequest, User $user): Response
    {
        $this->assertStillAdmin($user);

        $count = $this->honour($unblockRequest, $user, 'link');

        if ($count === self::CLAIM_LOST) {
            return $this->statusView('already-handled');
        }

        // The viewer has no other feedback channel here, so a failure must
        // render as a failure rather than a generic 500.
        if ($count === self::UNBLOCK_FAILED) {
            return $this->statusView('failed', 500);
        }

        return $this->statusView('done', 200, ['count' => $count]);
    }

    /**
     * Honour one ask, exactly once, whichever door the admin came through.
     *
     * This is the whole single-use guarantee, so it lives in one place: the
     * emailed link and the notification bell must not drift apart. The claim
     * is what makes it single-use; unblockAll() separately retires every live
     * ask. Both are needed — don't fold them.
     *
     * @param  string  $via  Which door, for the log line.
     * @return int The number unblocked, or CLAIM_LOST / UNBLOCK_FAILED.
     */
    private function honour(UnblockRequest $unblockRequest, User $actor, string $via): int
    {
        if (! $unblockRequest->claim()) {
            return self::CLAIM_LOST;
        }

        try {
            return $this->contentBlockService->unblockAll($actor);
        } catch (Throwable $e) {
            Log::error('unblock_request honour failed', [
                'via' => $via,
                'admin_id' => $actor->id,
                'exception' => $e->getMessage(),
            ]);

            // Hand the ask back, so a failure part-way through doesn't burn it.
            $unblockRequest->release();

            return self::UNBLOCK_FAILED;
        }
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
