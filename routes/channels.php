<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('messages', function ($user) {
    // For private channels, Laravel automatically ensures $user is authenticated
    // Check if messaging is enabled
    $setting = \App\Models\SiteSetting::where('key', 'messaging_enabled')->first();
    $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

    // Return user data if messaging is enabled and user is authenticated, false otherwise
    return $messagingEnabled ? ['id' => $user->id, 'name' => $user->name] : false;
});
