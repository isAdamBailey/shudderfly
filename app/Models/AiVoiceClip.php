<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiVoiceClip extends Model
{
    use HasFactory;

    protected $fillable = [
        'hash',
        'locale',
        'voice',
        'model',
        'speed',
        'characters',
        'path',
        'hits',
        'last_played_at',
    ];

    protected $casts = [
        'speed' => 'decimal:2',
        'characters' => 'integer',
        'hits' => 'integer',
        'last_played_at' => 'datetime',
    ];

    public function getUrlAttribute(): string
    {
        return Sound::urlForPath($this->path);
    }

    /**
     * Characters sent to the provider for clips made since $since.
     */
    public static function charactersSince(CarbonInterface $since): int
    {
        return (int) static::where('created_at', '>=', self::inAppTimezone($since))->sum('characters');
    }

    /**
     * Query bindings are formatted as-is, without converting the timezone,
     * so a local-midnight instant must be moved to the timezone created_at
     * is stored in before it is compared.
     */
    public static function inAppTimezone(CarbonInterface $time): CarbonInterface
    {
        return $time->avoidMutation()->setTimezone(config('app.timezone'));
    }
}
