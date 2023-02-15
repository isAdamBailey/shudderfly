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
        'book_id',
    ];

    public function getImagePathAttribute($value): string
    {
        if (Str::startsWith($value, 'https://') || empty($value)) {
            return $value;
        }

        return Storage::url($value);
    }

    public function scopeHasImage($query)
    {
        return $query->where('image_path', 'like', '%.jpg%')
                ->orWhere('image_path', 'like', '%.png%');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}
