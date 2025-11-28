<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class Page extends Model
{
    use HasFactory;
    use Searchable;

    protected $fillable = [
        'content',
        'media_path',
        'media_poster',
        'video_link',
        'book_id',
        'read_count',
        'created_at',
        'latitude',
        'longitude',
    ];

    public function getMediaPathAttribute($value): string
    {
        if (empty($value)) {
            return '';
        }

        if (Str::startsWith($value, 'https://')) {
            return $value;
        }

        if (app()->environment('local')) {
            return Storage::disk('s3')->url($value);
        } else {
            return Storage::disk('cloudfront')->url($value);
        }
    }

    public function getMediaPosterAttribute($value): string
    {
        if (empty($value)) {
            return '';
        }

        if (Str::startsWith($value, 'https://')) {
            return $value;
        }

        if (app()->environment('local')) {
            return Storage::disk('s3')->url($value);
        } else {
            return Storage::disk('cloudfront')->url($value);
        }
    }

    public function scopeHasImage($query)
    {
        return $query->where('media_path', 'like', '%.jpg%')
            ->orWhere('media_path', 'like', '%.png%')
            ->orWhere('media_path', 'like', '%.webp%');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function collages()
    {
        return $this->belongsToMany(Collage::class, 'collage_page')
            ->withTimestamps();
    }

    /**
     * Get the indexable data array for the model.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        // Ensure book relationship is loaded
        if (! $this->relationLoaded('book')) {
            $this->load('book');
        }

        return [
            'id' => $this->id,
            'content' => $this->content,
            'book_title' => $this->book ? $this->book->title : null,
            'book_id' => $this->book_id,
        ];
    }

    /**
     * Get the name of the index associated with the model.
     */
    public function searchableAs(): string
    {
        return 'pages';
    }
}
