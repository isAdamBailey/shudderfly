<?php

namespace App\Http\Requests;

use App\Rules\AtLeastOneField;
use Illuminate\Foundation\Http\FormRequest;

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
            'content' => ['string', 'nullable', new AtLeastOneField(['content', 'image', 'video_link'])],
            'image' => [
                'nullable',
                'max:70000',
                'mimetypes:image/jpeg,image/jpg,image/png,image/bmp,image/gif,image/svg+xml,image/webp,video/mp4,video/avi,video/quicktime,video/mpeg,video/webm,video/x-matroska,application/octet-stream',
                new AtLeastOneField(['content', 'image', 'video_link']),
            ],
            'video_link' => ['string', 'nullable', new AtLeastOneField(['content', 'image', 'video_link'])],
            'category_id' => 'integer',
        ];
    }
}
