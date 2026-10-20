<?php

namespace App\Models;

use App\Support\GamesWorld;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    protected static function booted(): void
    {
        // Each category has a room in the Games World's Library, which the
        // together channels let people join by its id. Forgotten once the
        // change is committed, so a join meanwhile can't cache the old list.
        $forget = fn () => DB::afterCommit(fn () => GamesWorld::forgetSceneIds());
        static::saved($forget);
        static::deleted($forget);
    }

    public function books(): HasMany
    {
        // Newest first, then by id, so books made in the same second still
        // page in one order (books.category pages through these).
        return $this->hasMany(Book::class)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');
    }
}
