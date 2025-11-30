<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Http\Controllers\PushNotificationController;
use App\Mail\ContactAdmins;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class ProfileController extends Controller
{
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
            $title = 'Message from ' . $sender->name;
            // Truncate message for push notification (max ~120 chars for body)
            $body = strlen($message) > 120 ? substr($message, 0, 117) . '...' : $message;
            
            PushNotificationController::sendNotification(
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
}
