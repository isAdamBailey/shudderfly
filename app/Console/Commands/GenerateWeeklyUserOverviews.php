<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\UserWeeklyOverviewService;
use Illuminate\Console\Command;

class GenerateWeeklyUserOverviews extends Command
{
    protected $signature = 'users:generate-weekly-overviews';

    protected $description = 'Generate weekly profile overviews for users';

    public function __construct(
        private UserWeeklyOverviewService $userWeeklyOverviewService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->userWeeklyOverviewService->prepareForBatchRun();

        User::query()
            ->select('id', 'name')
            ->orderBy('id')
            ->chunkById(100, function ($users) {
                foreach ($users as $user) {
                    $overview = $this->userWeeklyOverviewService->generateOverview($user);

                    $user->forceFill([
                        'weekly_profile_overview' => trim($overview),
                        'weekly_profile_overview_generated_at' => now(),
                    ])->save();
                    $this->line("Generated overview for {$user->name}");
                }
            });

        $this->info('Weekly profile overviews generated successfully.');

        return self::SUCCESS;
    }
}
