<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesEmptyEmoji;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSoundRequest extends FormRequest
{
    use NormalizesEmptyEmoji;

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
