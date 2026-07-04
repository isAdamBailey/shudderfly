<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Mail\ContactAdmins;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService,
    ) {}

    /**
     * Display the account danger-zone page (profile info, password, delete account).
     *
     * @return Response
     */
    public function edit(Request $request)
    {
        return Inertia::render('Profile/Account', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     *
     * @return RedirectResponse
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
     * Update the user's notification preferences.
     *
     * @return RedirectResponse
     */
    public function updateNotificationPreferences(Request $request)
    {
        $validated = $request->validate([
            'email_notifications_enabled' => ['required', 'boolean'],
        ]);

        $request->user()->update($validated);

        return back()->with('success', __('messages.notifications.email.updated'));
    }

    /**
     * Update the user's locale (app display language) preference.
     *
     * @return RedirectResponse
     */
    public function updateLocalePreference(Request $request)
    {
        $validated = $request->validate([
            'locale' => ['nullable', Rule::in(['en', 'es'])],
        ]);

        $request->user()->update($validated);

        return back()->with('success', __('messages.locale.updated'));
    }

    /**
     * Update the user's avatar.
     *
     * @return RedirectResponse
     */
    public function updateAvatar(Request $request)
    {
        $validated = $request->validate([
            'avatar' => ['nullable', 'string', Rule::in($this->getAllowedAvatarIds())],
        ]);

        $request->user()->update([
            'avatar' => $validated['avatar'] ?? null,
        ]);

        return back()->with('success', __('messages.avatar.updated'));
    }

    /**
     * Get the list of allowed avatar IDs.
     *
     * Must stay in sync with the styles defined in
     * resources/js/constants/avatars.js (12 avatars per style).
     *
     * @return array<string>
     */
    protected function getAllowedAvatarIds(): array
    {
        $stylePrefixes = ['avatar', 'bigears', 'avataaars', 'adventurer'];
        $countPerStyle = 12;

        $ids = [];
        foreach ($stylePrefixes as $prefix) {
            for ($i = 1; $i <= $countPerStyle; $i++) {
                $ids[] = "{$prefix}-{$i}";
            }
        }

        return $ids;
    }

    /**
     * Delete the user's account.
     *
     * @return RedirectResponse
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
            if ($user->email_notifications_enabled) {
                Mail::to($user->email)
                    ->send(new ContactAdmins($sender, $message));
            }

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
                    'url' => route('welcome'),
                ]
            );
        }
    }

    /**
     * Get the user's notifications.
     *
     * @return JsonResponse
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
     * @return JsonResponse
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
     * @return JsonResponse
     */
    public function markAllNotificationsAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Delete a notification.
     *
     * @return JsonResponse
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
