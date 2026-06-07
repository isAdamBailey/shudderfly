<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Maximum clocks
    |--------------------------------------------------------------------------
    |
    | The maximum number of city clocks that may be displayed at once on the
    | World Clock page.
    |
    */

    'max_cities' => 6,

    /*
    |--------------------------------------------------------------------------
    | Default cities
    |--------------------------------------------------------------------------
    |
    | Seeds the shared world clock setting on first use, and is shown as the
    | `defaultCities` Inertia prop. Each entry is
    | ['name' => ..., 'timezone' => <IANA>, 'country' => ...].
    |
    */

    'default_cities' => [
        ['name' => 'New York', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Los Angeles', 'timezone' => 'America/Los_Angeles', 'country' => 'United States'],
        ['name' => 'London', 'timezone' => 'Europe/London', 'country' => 'United Kingdom'],
        ['name' => 'Paris', 'timezone' => 'Europe/Paris', 'country' => 'France'],
        ['name' => 'Tokyo', 'timezone' => 'Asia/Tokyo', 'country' => 'Japan'],
        ['name' => 'Sydney', 'timezone' => 'Australia/Sydney', 'country' => 'Australia'],
    ],

];
