<?php

namespace App\Console;

use App\Models\SiteSetting;
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
        $weeklyTimezone = 'America/Los_Angeles';

        $schedule->command('pages:cleanup-stale')
            ->weeklyOn(0, '2:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        // Remove abandoned FilePond temporary uploads.
        $schedule->command('filepond:clear')
            ->daily()
            ->withoutOverlapping();

        $schedule->command('users:generate-weekly-overviews')
            ->weeklyOn(0, '4:00')
            ->timezone($weeklyTimezone)
            ->withoutOverlapping();

        $schedule->command('send:weekly-stats-mail')
            ->weeklyOn(0, '8:00')
            ->timezone($weeklyTimezone)
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
