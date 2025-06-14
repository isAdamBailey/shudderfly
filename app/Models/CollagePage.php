<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CollagePage extends Pivot
{
    protected $fillable = ['collage_id', 'page_id'];
}
