<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class AtLeastOneField implements ValidationRule
{
    private array $fields;

    public function __construct(array $fields)
    {
        $this->fields = $fields;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $requestData = request()->all();

        foreach ($this->fields as $field) {
            if (! empty($requestData[$field])) {
                return;
            }
        }

        $fail('At least one of the fields must be present.');
    }
}
