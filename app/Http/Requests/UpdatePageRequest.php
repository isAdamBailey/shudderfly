<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'content' => 'string|nullable',
            'book_id' => 'integer',
            'image' => [
                'nullable',
                'max:524288', // 512MB in kilobytes
                'mimetypes:image/jpeg,image/jpg,image/png,image/bmp,image/gif,image/svg+xml,image/webp,video/mp4,video/avi,video/quicktime,video/mpeg,video/webm,video/x-matroska,application/octet-stream',
            ],
            'video_link' => 'string|nullable',
            'created_at' => 'date|nullable',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];
    }
}
