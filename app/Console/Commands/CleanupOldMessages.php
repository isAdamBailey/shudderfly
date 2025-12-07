<?php

namespace App\Console\Commands;

use App\Models\Message;
use App\Models\SiteSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

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

        // Get message IDs that will be deleted
        $messageIds = Message::where('created_at', '<', $cutoffDate)
            ->pluck('id')
            ->toArray();

        // Delete notifications that reference these messages (bulk delete doesn't fire model events)
        $notificationCount = 0;
        if (! empty($messageIds)) {
            foreach ($messageIds as $messageId) {
                $count = DB::table('notifications')
                    ->where('type', 'App\\Notifications\\UserTagged')
                    ->whereRaw("JSON_EXTRACT(data, '$.message_id') = ?", [$messageId])
                    ->delete();
                $notificationCount += $count;
            }
        }

        // Delete the messages
        $deletedCount = Message::where('created_at', '<', $cutoffDate)->delete();

        $this->info("Deleted {$deletedCount} message(s) older than {$retentionDays} days.");
        if ($notificationCount > 0) {
            $this->info("Deleted {$notificationCount} notification(s) for deleted messages.");
        }

        return Command::SUCCESS;
    }
}
