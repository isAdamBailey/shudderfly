<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Song extends Model
{
    protected $fillable = [
        'youtube_video_id',
        'title',
        'description',
        'thumbnail_default',
        'thumbnail_medium',
        'thumbnail_high',
        'thumbnail_standard',
        'thumbnail_maxres',
        'duration',
        'published_at',
        'view_count',
        'read_count',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
        'published_at' => 'datetime',
    ];

    /**
     * Get the YouTube video URL
     */
    protected function youtubeUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => "https://www.youtube.com/watch?v={$this->youtube_video_id}",
        );
    }

    /**
     * Get the best available thumbnail
     */
    protected function thumbnail(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->thumbnail_maxres
                ?: $this->thumbnail_standard
                ?: $this->thumbnail_high
                ?: $this->thumbnail_medium
                ?: $this->thumbnail_default,
        );
    }

    /**
     * Scope for searching songs by title
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('title', 'LIKE', '%'.$search.'%')
            ->orWhere('description', 'LIKE', '%'.$search.'%');
    }

    /**
     * Increment the read count for this song via queued job
     */
    public function incrementReadCount(): void
    {
        \App\Jobs\IncrementSongReadCount::dispatch($this);
    }
}
