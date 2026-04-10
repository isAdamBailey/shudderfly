<?php

namespace Tests\Unit;

use App\Models\Sound;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SoundTest extends TestCase
{
    #[DataProvider('s3KeyProvider')]
    public function test_s3_key_from_stored_path(?string $stored, ?string $expected): void
    {
        $this->assertSame($expected, Sound::s3KeyFromStoredPath($stored));
    }

    public static function s3KeyProvider(): array
    {
        return [
            'null' => [null, null],
            'empty' => ['', null],
            'relative key' => ['sounds/uuid.m4a', 'sounds/uuid.m4a'],
            'cloudfront style url' => [
                'https://d111111abcdef8.cloudfront.net/sounds/uuid.m4a',
                'sounds/uuid.m4a',
            ],
            'url with leading slash path only' => [
                'https://bucket.s3.us-east-1.amazonaws.com/sounds/uuid.m4a',
                'sounds/uuid.m4a',
            ],
        ];
    }
}
