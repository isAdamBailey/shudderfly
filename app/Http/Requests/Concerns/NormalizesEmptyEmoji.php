<?php

namespace App\Http\Requests\Concerns;

trait NormalizesEmptyEmoji
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('emoji')) {
            return;
        }

        $raw = $this->input('emoji');
        if (! is_string($raw) || trim($raw) === '') {
            $this->merge(['emoji' => null]);
        }
    }
}
