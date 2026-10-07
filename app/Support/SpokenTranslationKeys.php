<?php

namespace App\Support;

use Symfony\Component\Finder\Finder;

/**
 * Finds the translation keys the frontend reads aloud, by scanning its
 * source, so ai-voice:prewarm can make those clips ahead of time. It is a
 * static scan: keys built at runtime (a ternary, a template string) are
 * missed, and their clips are simply made on first play.
 */
class SpokenTranslationKeys
{
    // speak(), speakPhrase() and speakGameIntro().
    private const SPEAK = '\bspeak(?:Phrase|GameIntro)?\(\s*';

    private const KEY = '(["\'])([\w.-]+)\1';

    /**
     * @return list<string> sorted, unique keys
     */
    public static function scan(string $directory): array
    {
        $keys = [];

        $files = Finder::create()->files()->in($directory)
            ->name(['*.vue', '*.js'])
            ->notName(['*.test.js', '*.mock.js']);

        foreach ($files as $file) {
            array_push($keys, ...self::keysIn($file->getContents()));
        }

        $keys = array_values(array_unique($keys));
        sort($keys);

        return $keys;
    }

    /**
     * @return list<string>
     */
    public static function keysIn(string $source): array
    {
        $patterns = [
            // speak(t("key"))
            '/'.self::SPEAK.'t\(\s*'.self::KEY.'/',
            // { speech: t("key") }: options whose `speech` is passed to speak().
            '/\bspeech:\s*t\(\s*'.self::KEY.'/',
        ];

        // const x = t("key") or computed(() => t("key")), then speak(x) or
        // speak(x.value) in the same file.
        preg_match_all('/'.self::SPEAK.'([A-Za-z_$][\w$]*)(?:\.value)?\s*[,)]/', $source, $spoken);
        foreach (array_unique($spoken[1]) as $name) {
            $patterns[] = '/\b(?:const|let)\s+'.preg_quote($name, '/').'\s*=\s*(?:computed\(\s*\(\)\s*=>\s*)?t\(\s*'.self::KEY.'/';
        }

        $keys = [];
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $source, $matches);
            array_push($keys, ...$matches[2]);
        }

        return $keys;
    }
}
