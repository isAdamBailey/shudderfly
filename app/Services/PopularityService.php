<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class PopularityService
{
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

        $allReadCounts = $modelClass::pluck('read_count')->sort()->values()->toArray();

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
}

