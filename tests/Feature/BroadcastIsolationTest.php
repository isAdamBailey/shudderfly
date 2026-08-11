<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\User;
use App\Support\BroadcastChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_test_suite_never_uses_a_real_broadcaster(): void
    {
        $this->assertSame('null', config('broadcasting.default'));
    }

    public function test_channel_names_are_namespaced_per_environment(): void
    {
        config(['broadcasting.channel_prefix' => 'production']);
        $this->assertSame('production.messages', BroadcastChannel::name('messages'));

        config(['broadcasting.channel_prefix' => 'local']);
        $this->assertSame('local.messages', BroadcastChannel::name('messages'));

        config(['broadcasting.channel_prefix' => '']);
        $this->assertSame('messages', BroadcastChannel::name('messages'));
    }

    public function test_events_broadcast_on_the_prefixed_channel(): void
    {
        $user = User::factory()->create();
        $message = Message::factory()->create(['user_id' => $user->id]);

        $channels = (new MessageCreated($message))->broadcastOn();

        $this->assertSame(
            'private-'.BroadcastChannel::name('messages'),
            $channels[0]->name
        );
    }

    public function test_notifications_broadcast_on_the_prefixed_user_channel(): void
    {
        $user = User::factory()->create();

        $this->assertSame(
            BroadcastChannel::name('App.Models.User.'.$user->id),
            $user->receivesBroadcastNotificationsOn()
        );
    }
}
