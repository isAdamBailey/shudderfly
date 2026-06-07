<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimezoneLabel extends Model
{
    protected $fillable = [
        'timezone',
        'label',
    ];
}
