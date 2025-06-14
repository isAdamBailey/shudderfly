<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Collage extends Model
{
    use SoftDeletes;

    protected $fillable = ['is_printed'];

    /**
     * A collage has many pages (images) via the pivot table.
     */
    public function pages()
    {
        return $this->belongsToMany(Page::class, 'collage_page')
            ->withTimestamps()
            ->using(CollagePage::class);
    }
}
