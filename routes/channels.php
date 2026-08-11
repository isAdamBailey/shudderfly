<?php

use App\Models\SiteSetting;
use App\Support\BroadcastChannel;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel(BroadcastChannel::name('App.Models.User.{id}'), function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel(BroadcastChannel::name('collages'), function ($user) {
    return true;
});

Broadcast::channel(BroadcastChannel::name('world-clock'), function ($user) {
    return true;
});

Broadcast::channel(BroadcastChannel::name('messages'), function ($user) {
    // For private channels, Laravel automatically ensures $user is authenticated
    // Check if messaging is enabled
    $setting = SiteSetting::where('key', 'messaging_enabled')->first();
    $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

    // Return user data if messaging is enabled and user is authenticated, false otherwise
    return $messagingEnabled ? ['id' => $user->id, 'name' => $user->name] : false;
});
