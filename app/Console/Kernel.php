<?php

namespace App\Console;

use App\Models\SiteSetting;
use App\Support\AiVoice;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        $weeklyTimezone = config('app.local_timezone');

        $schedule->command('pages:cleanup-stale')
            ->weeklyOn(0, '2:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        $schedule->command('storage:cleanup-temp')
            ->dailyAt('1:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        $schedule->command('stats:aggregate-site-statistics')
            ->dailyAt('3:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        // Runs the site-statistics aggregation and the AI weekly overviews
        // itself, in that order, before sending.
        $schedule->command('send:weekly-stats-mail')
            ->weeklyOn(0, '8:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        // Runs whether or not the AI voice is on: pruning never calls the
        // provider, and clips stored while it was on still need clearing.
        $schedule->command('ai-voice:prune')
            ->weeklyOn(0, '4:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        // Re-running is cheap: cached clips are skipped, so only new or
        // changed text (strings, books, songs) is generated, within the
        // share of the day's budget prewarming may use. After the music
        // sync so new songs are warmed the same day.
        $schedule->command('ai-voice:prewarm')
            ->dailyAt('15:00')
            ->timezone($weeklyTimezone)
            ->when(fn () => AiVoice::enabled())
            ->withoutOverlapping();

        // Only schedule music sync if music is enabled
        $musicEnabled = SiteSetting::where('key', 'music_enabled')->first()?->value ?? false;

        if ($musicEnabled) {
            $schedule->command('music:sync-youtube')
                ->dailyAt('14:00')
                ->timezone('America/Los_Angeles')
                ->withoutOverlapping();
        }

        // Cleanup old messages daily
        $messagingEnabled = SiteSetting::where('key', 'messaging_enabled')->first()?->value ?? false;
        if ($messagingEnabled) {
            $schedule->command('messages:cleanup')
                ->daily()
                ->withoutOverlapping();
        }
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
