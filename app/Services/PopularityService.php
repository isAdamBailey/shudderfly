<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PopularityService
{
    /** @var array<class-string<Model>, list<int|float>> */
    private array $sortedReadCountCache = [];

    public function warmReadCountCache(string $modelClass): void
    {
        $this->sortedReadCountCache[$modelClass] = $modelClass::query()
            ->pluck('read_count')
            ->sort()
            ->values()
            ->all();
    }

    public function calculatePopularity(Model $model): int
    {
        $modelClass = get_class($model);
        $readCount = (float) ($model->read_count ?? 0);
        $totalCount = $modelClass::count();

        if ($totalCount === 0) {
            return 0;
        }

        if ($totalCount === 1) {
            return 100;
        }

        $lowerCount = $modelClass::where('read_count', '<', $readCount)->count();
        $percentile = ($lowerCount / ($totalCount - 1)) * 100;

        return (int) round($percentile);
    }

    public function addPopularityToCollection(Collection $collection, string $modelClass): Collection
    {
        if ($collection->isEmpty()) {
            return $collection;
        }

        $totalCount = $modelClass::count();

        if ($totalCount === 0) {
            return $collection->map(function ($item) {
                $item->popularity_percentage = 0;

                return $item;
            });
        }

        if ($totalCount === 1) {
            return $collection->map(function ($item) {
                $item->popularity_percentage = 100;

                return $item;
            });
        }

        $allReadCounts = $this->sortedReadCountsFor($modelClass);

        return $collection->map(function ($item) use ($allReadCounts, $totalCount) {
            $readCount = (float) ($item->read_count ?? 0);

            $low = 0;
            $high = count($allReadCounts) - 1;
            $lowerCount = 0;

            while ($low <= $high) {
                $mid = intval(($low + $high) / 2);
                if ($allReadCounts[$mid] < $readCount) {
                    $lowerCount = $mid + 1;
                    $low = $mid + 1;
                } else {
                    $high = $mid - 1;
                }
            }

            $percentile = ($lowerCount / ($totalCount - 1)) * 100;
            $item->popularity_percentage = (int) round($percentile);

            return $item;
        });
    }

    /**
     * @return list<int|float>
     */
    private function sortedReadCountsFor(string $modelClass): array
    {
        if (isset($this->sortedReadCountCache[$modelClass])) {
            return $this->sortedReadCountCache[$modelClass];
        }

        return $modelClass::query()
            ->pluck('read_count')
            ->sort()
            ->values()
            ->all();
    }
}
