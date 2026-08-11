<?php

namespace App\Support;

/**
 * Namespaces broadcast channel names per environment.
 *
 * Local, testing and production deployments frequently share a single Pusher
 * app. Without a prefix they all publish to (and listen on) the same channels,
 * so events raised while running tests or developing locally are delivered to
 * real users — and vice versa. Prefixing every channel with the environment
 * keeps each environment's websocket traffic isolated.
 */
class BroadcastChannel
{
    /**
     * Prefix a channel name with the current environment.
     */
    public static function name(string $channel): string
    {
        $prefix = config('broadcasting.channel_prefix');

        return $prefix ? $prefix.'.'.$channel : $channel;
    }
}
