<?php

namespace App\Console\Commands;

use App\Models\Message;
use App\Models\SiteSetting;
use Illuminate\Console\Command;

class CleanupOldMessages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'messages:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete messages older than the retention period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $retentionDays = (int) (SiteSetting::where('key', 'messaging_retention_days')
            ->value('value') ?? 30);
        $retentionDays = max(1, $retentionDays);

        $cutoffDate = now()->subDays($retentionDays);

        // One at a time, not a bulk delete, so Message's deleting hook runs:
        // it removes the message's notifications and its voice clip's audio.
        $deletedCount = 0;
        Message::where('created_at', '<', $cutoffDate)
            ->lazyById()
            ->each(function (Message $message) use (&$deletedCount) {
                $message->delete();
                $deletedCount++;
            });

        $this->info("Deleted {$deletedCount} message(s) older than {$retentionDays} days.");

        return Command::SUCCESS;
    }
}
