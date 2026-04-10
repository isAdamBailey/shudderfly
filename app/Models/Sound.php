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
        if (app()->environment(['local', 'testing'])) {
            return Storage::disk('s3')->url($path);
        }

        return Storage::disk('cloudfront')->url($path);
    }

    public static function s3KeyFromStoredPath(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (Str::startsWith($value, 'https://')) {
            $path = parse_url($value, PHP_URL_PATH);
            if (! is_string($path) || $path === '') {
                return null;
            }

            return ltrim($path, '/');
        }

        return $value;
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
