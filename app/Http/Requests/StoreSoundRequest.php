<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesEmptyEmoji;
use Illuminate\Foundation\Http\FormRequest;

class StoreSoundRequest extends FormRequest
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
            'audio.mimetypes' => 'The audio file must be MP3, AAC/M4A, WAV, or OGG. M4A (AAC) files are stored as uploaded; other formats are converted to M4A (AAC) for playback.',
        ];
    }
}
