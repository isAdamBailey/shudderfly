<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Sent to every admin when a non-privileged user asks for blocked content to
 * be unblocked. The mail carries a per-recipient signed link to a confirm
 * screen, so an admin can unblock straight from their inbox.
 */
class UnblockRequested extends Notification implements ShouldBroadcast
{
    use Queueable;

    /**
     * How long the emailed link stays valid.
     *
     * Note this bounds but does not eliminate replay: the link is reusable
     * within the window and unblocks whatever is blocked when it is opened,
     * not the set that was blocked when the request was made. Making it
     * single-use would require persisting the request.
     */
    public const LINK_LIFETIME_DAYS = 1;

    public User $requester;

    public int $blockedCount;

    public function __construct(User $requester, int $blockedCount)
    {
        $this->requester = $requester->withoutRelations();
        $this->blockedCount = $blockedCount;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if ($notifiable->email_notifications_enabled) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $url = self::unblockUrl($notifiable);

        return (new MailMessage)
            ->subject(__('messages.unblock_request.subject', ['name' => $this->requester->name]))
            ->greeting(__('messages.unblock_request.greeting', ['name' => $notifiable->name]))
            ->line(__('messages.unblock_request.line', [
                'name' => $this->requester->name,
                'count' => $this->blockedCount,
            ]))
            ->action(__('messages.unblock_request.action'), $url)
            ->line(__('messages.notifications.email.opt_out_markdown', ['url' => route('welcome')]))
            ->line(__('messages.unblock_request.thank_you'));
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'App\Notifications\UnblockRequested',
            'title' => __('messages.unblock_request.title', ['name' => $this->requester->name]),
            'body' => __('messages.unblock_request.body', ['count' => $this->blockedCount]),
            'icon' => '/android-chrome-192x192.png',
            'data' => $this->toArray($notifiable),
            'read_at' => null,
        ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'requester_id' => $this->requester->id,
            'requester_name' => $this->requester->name,
            'requester_avatar' => $this->requester->avatar,
            'blocked_count' => $this->blockedCount,
            'created_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Signed per recipient: opening it unblocks everything straight away.
     */
    public static function unblockUrl(object $notifiable): string
    {
        return URL::temporarySignedRoute(
            'unblock-requests.approve',
            now()->addDays(self::LINK_LIFETIME_DAYS),
            ['user' => $notifiable->id]
        );
    }
}
