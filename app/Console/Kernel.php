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
        $schedule->command('send:weekly-stats-mail')
            ->weekly()
            ->withoutOverlapping();

        // Only schedule music sync if music is enabled
        $musicEnabled = SiteSetting::where('key', 'music_enabled')->first()?->value ?? false;

        if ($musicEnabled) {
            $schedule->command('music:sync-youtube')
                ->dailyAt('14:00')
                ->timezone('America/Los_Angeles')
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
