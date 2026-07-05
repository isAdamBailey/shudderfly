<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class SiteStatistic extends Model
{
    protected $fillable = [
        'date',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public static function history(int $days): Collection
    {
        return static::query()
            ->orderByDesc('date')
            ->limit($days)
            ->get()
            ->sortBy('date')
            ->values();
    }
}
