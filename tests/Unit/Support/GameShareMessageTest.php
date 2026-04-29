<?php

namespace Tests\Unit\Support;

use App\Support\GameShareMessage;
use PHPUnit\Framework\TestCase;

class GameShareMessageTest extends TestCase
{
    public function test_strip_slug_marker_removes_embedded_slug(): void
    {
        $raw = "I scored 155 in Cockroach Fart!\u{E000}g:cockroach\u{E000} @Felix Sauer";
        $this->assertSame(
            'I scored 155 in Cockroach Fart! @Felix Sauer',
            GameShareMessage::stripSlugMarker($raw)
        );
    }

    public function test_slug_from_content_returns_slug(): void
    {
        $raw = "x\u{E000}g:boom\u{E000}";
        $this->assertSame('boom', GameShareMessage::slugFromContent($raw));
    }

    public function test_strip_slug_marker_returns_empty_for_null(): void
    {
        $this->assertSame('', GameShareMessage::stripSlugMarker(null));
    }
}
