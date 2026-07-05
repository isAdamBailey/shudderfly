<?php

namespace App\Console\Commands;

use App\Models\SiteStatistic;
use App\Services\SiteStatisticsAggregator;
use Illuminate\Console\Command;

class AggregateSiteStatistics extends Command
{
    protected $signature = 'stats:aggregate-site-statistics';

    protected $description = 'Compute and store the nightly site statistics snapshot shown on the owner dashboard';

    public function __construct(
        private SiteStatisticsAggregator $aggregator
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $payload = $this->aggregator->build();

        SiteStatistic::updateOrCreate(
            ['date' => today()->toDateString()],
            ['payload' => $payload]
        );

        $this->info('Site statistics aggregated successfully.');

        return self::SUCCESS;
    }
}
