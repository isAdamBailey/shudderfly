<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'description', 'type'];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'value' => 'string',
    ];

    /**
     * Get the value attribute with automatic type casting.
     *
     * @param  string  $value
     * @return mixed
     */
    public function getValueAttribute($value)
    {
        if ($this->type === 'boolean') {
            return (bool) $value;
        }

        return is_numeric($value) ? $value * 1 : $value;
    }
}
