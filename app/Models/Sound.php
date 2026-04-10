<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Sound extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'emoji',
        'audio_path',
    ];

    public static function urlForPath(string $path): string
    {
        if (app()->environment('local')) {
            return Storage::disk('s3')->url($path);
        }

        return Storage::disk('cloudfront')->url($path);
    }

    public function getAudioPathAttribute($value): string
    {
        if (empty($value)) {
            return '';
        }

        if (Str::startsWith($value, 'https://')) {
            return $value;
        }

        return self::urlForPath($value);
    }
}
