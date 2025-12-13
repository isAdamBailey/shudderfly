<?php

namespace App\Services;

class VoiceSearchService
{
    protected array $phoneticMappings = [
        'mom' => ['mommy', 'mama', 'mother', 'mum', 'mummy'],
        'dad' => ['daddy', 'dada', 'father'],
        'grandma' => ['nana', 'nanna', 'grandmom', 'grama', 'gramma'],
        'grandpa' => ['grandfather', 'gramps', 'grampa', 'granddad', 'pop', 'papa'],
        'baw' => ['ball'],
        'ball' => ['baw'],
        'wawa' => ['water'],
        'nana' => ['banana'],
        'potty' => ['bathroom', 'toilet'],
        'blankie' => ['blanket'],
        'doggy' => ['dog', 'puppy'],
        'kitty' => ['cat', 'kitten'],
        'birdy' => ['bird'],
        'fishy' => ['fish'],
        'ducky' => ['duck'],
        'piggy' => ['pig'],
        'choo choo' => ['train'],
        'vroom' => ['car', 'truck', 'vehicle'],
        'pasketti' => ['spaghetti'],
        'mazagine' => ['magazine'],
        'aminal' => ['animal'],
        'hangaber' => ['hamburger'],
        'pisghetti' => ['spaghetti'],
        'libary' => ['library'],
        'breffast' => ['breakfast'],
        'lellow' => ['yellow'],
    ];

    public function expandQuery(string $query): array
    {
        $query = $this->preprocessQuery($query);
        $variations = [$query];
        $words = preg_split('/\s+/', $query);

        foreach ($words as $word) {
            foreach ($this->getWordVariations($word) as $variation) {
                if ($variation !== $word) {
                    $newQuery = str_replace($word, $variation, $query);
                    if (! in_array($newQuery, $variations)) {
                        $variations[] = $newQuery;
                    }
                }
            }
        }

        return array_slice($variations, 0, 5);
    }

    protected function getWordVariations(string $word): array
    {
        $variations = [$word];

        if (isset($this->phoneticMappings[$word])) {
            $variations = array_merge($variations, $this->phoneticMappings[$word]);
        }

        foreach ($this->phoneticMappings as $key => $mappings) {
            if (in_array($word, $mappings) && ! in_array($key, $variations)) {
                $variations[] = $key;
            }
        }

        return array_unique($variations);
    }

    public function preprocessQuery(string $query): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($query)));
    }
}
