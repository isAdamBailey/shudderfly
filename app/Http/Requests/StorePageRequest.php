<?php

namespace App\Http\Requests;

use App\Rules\AtLeastOneField;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageRequest extends FormRequest
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
            'book_id' => 'integer|required',
            'content' => ['string', 'nullable', new AtLeastOneField(['content', 'images', 'video_link'])],
            // FilePond submits an array of encrypted temporary-upload ids. Each is
            // validated against its temp file using the same media rules as before.
            'images' => ['nullable', 'array', new AtLeastOneField(['content', 'images', 'video_link'])],
            'images.*' => [
                Rule::filepond([
                    'required',
                    'mimetypes:image/jpeg,image/jpg,image/png,image/bmp,image/gif,image/svg+xml,image/webp,video/mp4,video/avi,video/quicktime,video/mpeg,video/webm,video/x-matroska,application/octet-stream',
                    'max:524288', // 512MB in kilobytes
                ]),
            ],
            'video_link' => ['string', 'nullable', new AtLeastOneField(['content', 'images', 'video_link'])],
            'category_id' => 'integer',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];
    }
}
