<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit pages');
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:100',
            'emoji' => 'nullable|string|max:10',
            'audio' => [
                'required',
                'file',
                'max:20480',
                'mimetypes:audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/m4a,audio/wav,audio/ogg',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'audio.mimetypes' => 'The audio file must be an MP3, AAC/M4A, WAV, or OGG file. It will be converted to M4A (AAC) for playback.',
        ];
    }
}
