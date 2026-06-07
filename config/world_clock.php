<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Maximum clocks
    |--------------------------------------------------------------------------
    |
    | The maximum number of city clocks a user may display at once on the
    | World Clock page.
    |
    */

    'max_cities' => 6,

    /*
    |--------------------------------------------------------------------------
    | Default cities
    |--------------------------------------------------------------------------
    |
    | Shown on first load so the page works with zero searches. Each entry is
    | a canonical IANA timezone identifier; the controller decorates these
    | with a friendly name/region using the same logic as the search results.
    |
    */

    'default_cities' => [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
    ],

];
