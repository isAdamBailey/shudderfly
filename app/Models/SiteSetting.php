<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'description'];

    /**
     * List of settings that should be treated as booleans
     */
    public static $booleanSettings = [
        'snapshot_enabled',
        // Add more boolean settings here
    ];

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
        if (in_array($this->key, static::$booleanSettings)) {
            return (bool) $value;
        }

        return is_numeric($value) ? $value * 1 : $value;
    }
}
