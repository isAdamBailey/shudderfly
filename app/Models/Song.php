<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
     * Songs whose title artist segment, description, or tags contain the book title (case-insensitive).
     * Artist segment is the substring before the first " - " in the video title, or the full title if absent.
     */
    public function scopeWhereRelatedToBookTitle(Builder $query, string $bookTitle): void
    {
        $trimmed = trim($bookTitle);
        if (mb_strlen($trimmed) < 3) {
            $query->whereRaw('1 = 0');

            return;
        }

        $needle = mb_strtolower($trimmed);
        $driver = $query->getConnection()->getDriverName();

        $titleExpr = $driver === 'sqlite'
            ? "CASE WHEN instr(title, ' - ') > 0 THEN substr(title, 1, instr(title, ' - ') - 1) ELSE title END"
            : "SUBSTRING_INDEX(title, ' - ', 1)";

        $tagsExpr = $driver === 'sqlite'
            ? 'coalesce(cast(tags as text), \'\')'
            : 'coalesce(cast(tags as char(1024)), \'\')';

        $query->where(function (Builder $q) use ($needle, $titleExpr, $tagsExpr) {
            $q->whereRaw('instr(lower('.$titleExpr.'), ?) > 0', [$needle])
                ->orWhereRaw('instr(lower(coalesce(description, \'\')), ?) > 0', [$needle])
                ->orWhereRaw('instr(lower('.$tagsExpr.'), ?) > 0', [$needle]);
        });
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
