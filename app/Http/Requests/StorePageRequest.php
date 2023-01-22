<?php

namespace App\Http\Requests;

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
            'content' => 'string|nullable|required_without:image',
            'image' => [
                'max:70000',
                'mimes:jpg,jpeg,bmp,png,svg,webp,avi,gif,mpeg,quicktime,mp4',
                'required_without:content',
            ],
            'category_id' => 'integer',
        ];
    }
}
