<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Book extends Model
{
    use HasFactory;
    use HasSlug;
    use Searchable;

    protected $fillable = [
        'title', 'excerpt', 'author', 'read_count', 'category_id', 'cover_page', 'latitude', 'longitude',
    ];

    public function pages(): HasMany
    {
        return $this->hasMany(Page::class)
            ->orderBy('created_at', 'desc');
    }

    public function coverImage(): BelongsTo
    {
        return $this->belongsTo(Page::class, 'cover_page')->select('id', 'media_path');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
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
            'excerpt' => $this->excerpt,
        ];
    }

    /**
     * Get the name of the index associated with the model.
     */
    public function searchableAs(): string
    {
        return 'books';
    }
}
