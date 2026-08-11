/**
 * Namespaces Echo channel names per environment.
 *
 * Mirrors App\Support\BroadcastChannel on the server. The prefix comes from the
 * `broadcastChannelPrefix` Inertia prop (stashed on `window` during boot in
 * app.js) so a browser pointed at local dev never subscribes to the channels
 * production is publishing on, even when both share a Pusher app.
 */
export function setBroadcastChannelPrefix(prefix) {
    window.broadcastChannelPrefix = prefix ?? "";
}

export function channelName(channel) {
    const prefix = window.broadcastChannelPrefix ?? "";

    return prefix ? `${prefix}.${channel}` : channel;
}

export function userChannelName(userId) {
    return channelName(`App.Models.User.${userId}`);
}
