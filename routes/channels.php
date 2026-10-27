<?php

use App\Models\SiteSetting;
use App\Support\BroadcastChannel;
use App\Support\GamesWorld;
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

// The Games World together (issue #174). `world` is the roster of everyone
// in the world; `world.{scene}` is the scene someone is standing in. Members
// are { id, name, avatar } and nothing else, `avatar` the preset id they
// picked or null (issue #208). Scene ids are `road` or `building.room`
// (one dot at most; a deeper id needs a third pattern), and a channel
// parameter can't hold a dot, so a room's channel takes two. Off with
// `world_together_enabled`, which refuses every join. Pusher only asks when
// someone subscribes, so anyone already in stays until they leave the page.
$worldMember = fn ($user) => GamesWorld::togetherEnabled()
    ? ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar]
    : false;
// The switch first, so the scene ids aren't read for a refusal.
$sceneMember = fn ($user, string $scene) => ($member = $worldMember($user))
    && in_array($scene, GamesWorld::sceneIds(), true)
    ? $member
    : false;

Broadcast::channel(BroadcastChannel::name('world'), $worldMember);

Broadcast::channel(BroadcastChannel::name('world.{scene}'), $sceneMember);

Broadcast::channel(
    BroadcastChannel::name('world.{building}.{room}'),
    fn ($user, string $building, string $room) => $sceneMember($user, "{$building}.{$room}")
);
