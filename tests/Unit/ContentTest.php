<?php

namespace Tests\Unit;

use App\Support\Content;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ContentTest extends TestCase
{
    /**
     * @return array<string, array{0: string|null}>
     */
    public static function blankProvider(): array
    {
        return [
            'null' => [null],
            'empty string' => [''],
            'whitespace' => ["  \n\t "],
            'empty paragraph' => ['<p></p>'],
            'paragraph with break' => ['<p><br></p>'],
            'paragraph with nbsp entity' => ['<p>&nbsp;</p>'],
            'paragraph with raw nbsp' => ["<p>\u{00A0}</p>"],
            'paragraph with space' => ['<p> </p>'],
            'nested empty markup' => ['<p><strong><em></em></strong></p>'],
        ];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function notBlankProvider(): array
    {
        return [
            'plain text' => ['no tags'],
            'paragraph' => ['<p>hi</p>'],
            'nested markup' => ['<p><strong>a</strong></p>'],
            'entity text' => ['<p>&amp;</p>'],
            'text among empty tags' => ['<p><br></p><p>words</p>'],
        ];
    }

    #[DataProvider('blankProvider')]
    public function test_it_treats_text_free_html_as_blank(?string $html): void
    {
        $this->assertTrue(Content::isBlank($html));
    }

    #[DataProvider('notBlankProvider')]
    public function test_it_treats_html_containing_words_as_not_blank(string $html): void
    {
        $this->assertFalse(Content::isBlank($html));
    }
}
