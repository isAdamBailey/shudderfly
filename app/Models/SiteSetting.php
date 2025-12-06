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
            // Explicitly handle "0" and "1" strings, as well as actual booleans
            return $value === '1' || $value === 1 || $value === true;
        }

        return is_numeric($value) ? $value * 1 : $value;
    }

    /**
     * Set the value attribute, ensuring it's stored as a string.
     *
     * @param  mixed  $value
     * @return void
     */
    public function setValueAttribute($value)
    {
        // Always store as string in database
        $this->attributes['value'] = (string) $value;
    }
}
