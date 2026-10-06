<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiVoiceClip extends Model
{
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
}
