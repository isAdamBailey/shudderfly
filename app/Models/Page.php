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
        'image_path',
        'video_link',
        'book_id',
    ];

    public function getImagePathAttribute($value): string
    {
        if (Str::startsWith($value, 'https://') || empty($value)) {
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
        return $query->where('image_path', 'like', '%.jpg%')
            ->orWhere('image_path', 'like', '%.png%')
            ->orWhere('image_path', 'like', '%.webp%');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}
