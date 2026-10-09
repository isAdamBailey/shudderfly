<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    public function books(): HasMany
    {
        // Newest first, then by id, so books made in the same second still
        // page in one order (books.category pages through these).
        return $this->hasMany(Book::class)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');
    }
}
