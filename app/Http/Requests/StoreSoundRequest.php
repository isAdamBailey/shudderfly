<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesEmptyEmoji;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

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
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! $value instanceof UploadedFile) {
                        return;
                    }
                    if ($this->isAllowedSoundUpload($value)) {
                        return;
                    }
                    $fail($this->soundAudioInvalidMessage());
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'audio.max' => 'The audio file may not be greater than 20 MB.',
        ];
    }

    protected function isAllowedSoundUpload(UploadedFile $file): bool
    {
        $mime = $file->getMimeType();
        if ($mime === '') {
            return $this->soundUploadAllowedByClientExtension($file);
        }

        $allowedMimes = [
            'audio/mpeg',
            'audio/mp4',
            'audio/aac',
            'audio/x-m4a',
            'audio/m4a',
            'audio/wav',
            'audio/x-wav',
            'audio/wave',
            'audio/vnd.wave',
            'audio/ogg',
            'application/ogg',
            'video/mp4',
        ];

        if (in_array($mime, $allowedMimes, true)) {
            return true;
        }

        if (in_array($mime, ['application/octet-stream', 'binary/octet-stream'], true)) {
            return $this->soundUploadAllowedByClientExtension($file);
        }

        return false;
    }

    protected function soundUploadAllowedByClientExtension(UploadedFile $file): bool
    {
        $ext = strtolower($file->getClientOriginalExtension());

        return in_array($ext, ['m4a', 'mp3', 'aac', 'wav', 'ogg'], true);
    }

    protected function soundAudioInvalidMessage(): string
    {
        return 'The audio file must be MP3, AAC/M4A, WAV, or OGG. M4A (AAC) files are stored as uploaded; other formats are converted to M4A (AAC) for playback.';
    }
}
