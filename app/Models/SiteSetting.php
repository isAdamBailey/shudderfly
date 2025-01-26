<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * List of settings that should be treated as booleans
     */
    protected static $booleanSettings = [
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
        // Cast boolean strings for designated boolean settings
        if (in_array($this->key, static::$booleanSettings) && ($value === '1' || $value === '0')) {
            return (bool) $value;
        }

        // Cast numeric strings
        if (is_numeric($value)) {
            return $value * 1; // converts to int or float automatically
        }

        return $value;
    }
}
