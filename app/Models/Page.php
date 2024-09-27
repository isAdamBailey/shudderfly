<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Page extends Model
{
    use HasFactory;

    protected $fillable = [
        'content',
        'media_path',
        'media_poster',
        'video_link',
        'book_id',
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
}
