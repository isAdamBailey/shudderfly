<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Collage extends Model
{
    use HasFactory;

    protected $fillable = ['storage_path', 'preview_path', 'is_archived'];

    /**
     * Get the full URL for the PDF.
     */
    public function getStoragePathAttribute($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        if (app()->environment('local')) {
            return Storage::disk('s3')->url($value);
        } else {
            return Storage::disk('cloudfront')->url($value);
        }
    }

    /**
     * Get the full URL for the preview image.
     */
    public function getPreviewPathAttribute($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        if (app()->environment('local')) {
            return Storage::disk('s3')->url($value);
        } else {
            return Storage::disk('cloudfront')->url($value);
        }
    }

    /**
     * A collage has many pages (images) via the pivot table.
     */
    public function pages()
    {
        return $this->belongsToMany(Page::class, 'collage_page')
            ->withTimestamps()
            ->using(CollagePage::class);
    }
}
