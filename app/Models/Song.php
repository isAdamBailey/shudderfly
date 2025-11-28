<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Song extends Model
{
    use HasFactory;
    use Searchable;

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
        'read_count',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
        'published_at' => 'datetime',
    ];

    /**
     * Scope for filtering songs by title or description (database query)
     * Note: Use Song::search() for Meilisearch-based search via Scout
     */
    public function scopeFilterBySearch($query, $search)
    {
        return $query->where('title', 'LIKE', '%'.$search.'%')
            ->orWhere('description', 'LIKE', '%'.$search.'%');
    }

    /**
     * Get the indexable data array for the model.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
        ];
    }

    /**
     * Get the name of the index associated with the model.
     */
    public function searchableAs(): string
    {
        return 'songs';
    }
}
