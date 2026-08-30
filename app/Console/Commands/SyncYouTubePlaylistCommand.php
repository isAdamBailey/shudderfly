<?php

namespace App\Console\Commands;

use App\Jobs\SyncYouTubePlaylist;
use Illuminate\Console\Command;

class SyncYouTubePlaylistCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'music:sync-youtube';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue a sync of songs from the YouTube playlist to the database';

    /**
     * Execute the console command.
     *
     * The sync runs on the queue so the scheduled run and the admin Sync button
     * share one code path; the outcome is recorded in MusicJobStatus rather than
     * in this command's exit code.
     */
    public function handle()
    {
        SyncYouTubePlaylist::enqueue();

        $this->info('YouTube playlist sync queued.');

        return Command::SUCCESS;
    }
}
