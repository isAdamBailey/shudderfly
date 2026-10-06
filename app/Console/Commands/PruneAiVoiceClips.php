<?php

namespace App\Console\Commands;

use App\Models\AiVoiceClip;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneAiVoiceClips extends Command
{
    protected $signature = 'ai-voice:prune
        {--days=90 : Delete clips not played for this many days}
        {--dry-run : Report what would be deleted without deleting it}';

    protected $description = 'Delete AI voice clips that have not been played recently, from S3 and the index';

    public function handle(): int
    {
        $days = (int) $this->option('days');

        if ($days < 1) {
            $this->error('--days must be at least 1.');

            return Command::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subDays($days);
        $deleted = 0;
        $characters = 0;

        // Every clip gets last_played_at when it is made, so this also
        // catches clips that were generated but never played again.
        AiVoiceClip::where('last_played_at', '<', $cutoff)
            ->select(['id', 'path', 'characters'])
            ->chunkById(100, function ($clips) use ($dryRun, $cutoff, &$deleted, &$characters) {
                foreach ($clips as $clip) {
                    if (! $dryRun && ! $this->deleteClip($clip, $cutoff)) {
                        continue;
                    }

                    $deleted++;
                    $characters += $clip->characters;
                }
            });

        $verb = $dryRun ? 'Would delete' : 'Deleted';
        $this->info("{$verb} {$deleted} AI voice clip(s) not played in {$days} day(s), freeing ".number_format($characters).' character(s).');

        return Command::SUCCESS;
    }

    /**
     * Deletes the row first, and only if the clip is still unplayed since
     * $cutoff, so a clip played after this chunk was read is kept rather
     * than handed out with a deleted file. A file left behind when S3
     * refuses the delete is harmless: regenerating the clip writes the
     * same path.
     */
    private function deleteClip(AiVoiceClip $clip, CarbonInterface $cutoff): bool
    {
        $deleted = AiVoiceClip::whereKey($clip->id)->where('last_played_at', '<', $cutoff)->delete();

        if ($deleted === 0) {
            return false;
        }

        if (! Storage::disk('s3')->delete($clip->path)) {
            $this->warn("Could not delete {$clip->path} from S3; it will be overwritten if the clip is made again.");
        }

        return true;
    }
}
