<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MovieFavorite extends Model
{
    use HasFactory;

    protected $fillable = [
        'tmdb_id',
        'title',
        'image_path',
    ];

    public function toFrontendArray(): array
    {
        return [
            'id' => $this->tmdb_id,
            'title' => $this->title,
            'image_path' => $this->image_path,
        ];
    }
}
