<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSoundRequest extends FormRequest
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

    public function authorize(): bool
    {
        return $this->user()->can('edit pages');
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:100',
            'emoji' => 'nullable|string|max:10',
        ];
    }
}
