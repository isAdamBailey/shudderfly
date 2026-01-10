<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Mail\ContactAdmins;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

    /**
     * Display the user's profile form.
     *
     * @return \Inertia\Response
     */
    public function edit(Request $request)
    {
        $adminUsers = User::permission('admin')->get(['name']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'adminUsers' => $adminUsers,
        ]);
    }

    /**
     * Update the user's profile information.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(ProfileUpdateRequest $request)
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Update the user's avatar.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function updateAvatar(Request $request)
    {
        $validated = $request->validate([
            'avatar' => ['nullable', 'string', Rule::in($this->getAllowedAvatarIds())],
        ]);

        $request->user()->update([
            'avatar' => $validated['avatar'] ?? null,
        ]);

        return Redirect::route('profile.edit')->with('success', __('messages.avatar.updated'));
    }

    /**
     * Get the list of allowed avatar IDs.
     *
     * @return array<string>
     */
    protected function getAllowedAvatarIds(): array
    {
        return [
            'avatar-1',
            'avatar-2',
            'avatar-3',
            'avatar-4',
            'avatar-5',
            'avatar-6',
            'avatar-7',
            'avatar-8',
            'avatar-9',
            'avatar-10',
            'avatar-11',
            'avatar-12',
        ];
    }

    /**
     * Delete the user's account.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current-password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function contactAdminsEmail(Request $request): void
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);
        $users = User::permission('admin')->get();
        $sender = $request->user();
        $message = $validated['message'];

        foreach ($users as $user) {
            // Send email
            Mail::to($user->email)
                ->send(new ContactAdmins($sender, $message));

            // Send push notification
            $title = __('messages.contact_admin.push_title', ['name' => $sender->name]);
            // Truncate message for push notification (max ~120 chars for body)
            $body = mb_strlen($message, 'UTF-8') > 120 ? mb_substr($message, 0, 117, 'UTF-8').'...' : $message;

            $this->pushNotificationService->sendNotification(
                $user->id,
                $title,
                $body,
                [
                    'type' => 'contact_admin',
                    'sender_id' => $sender->id,
                    'sender_name' => $sender->name,
                    'message' => $message,
                    'url' => route('profile.edit'),
                ]
            );
        }
    }

    /**
     * Get the user's notifications.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function notifications(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Mark a notification as read.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function markNotificationAsRead(Request $request, string $id)
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAllNotificationsAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Delete a notification.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteNotification(Request $request, string $id)
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if ($notification) {
            $notification->delete();
        }

        return response()->json(['success' => true]);
    }
}
