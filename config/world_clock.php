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
    | Shown on first load so the page works with zero API calls. Each entry is
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
        ['name' => 'Dubai', 'timezone' => 'Asia/Dubai', 'country' => 'United Arab Emirates'],
        ['name' => 'Mumbai', 'timezone' => 'Asia/Kolkata', 'country' => 'India'],
        ['name' => 'São Paulo', 'timezone' => 'America/Sao_Paulo', 'country' => 'Brazil'],
        ['name' => 'UTC', 'timezone' => 'UTC', 'country' => 'Coordinated Universal Time'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Searchable cities
    |--------------------------------------------------------------------------
    |
    | Curated list backing the city search. Searched server-side by name or
    | country so the feature works fully offline with no third-party API.
    |
    */

    'cities' => [
        // North America
        ['name' => 'New York', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Los Angeles', 'timezone' => 'America/Los_Angeles', 'country' => 'United States'],
        ['name' => 'Chicago', 'timezone' => 'America/Chicago', 'country' => 'United States'],
        ['name' => 'Denver', 'timezone' => 'America/Denver', 'country' => 'United States'],
        ['name' => 'Phoenix', 'timezone' => 'America/Phoenix', 'country' => 'United States'],
        ['name' => 'Houston', 'timezone' => 'America/Chicago', 'country' => 'United States'],
        ['name' => 'Seattle', 'timezone' => 'America/Los_Angeles', 'country' => 'United States'],
        ['name' => 'San Francisco', 'timezone' => 'America/Los_Angeles', 'country' => 'United States'],
        ['name' => 'Miami', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Boston', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Washington', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Atlanta', 'timezone' => 'America/New_York', 'country' => 'United States'],
        ['name' => 'Anchorage', 'timezone' => 'America/Anchorage', 'country' => 'United States'],
        ['name' => 'Honolulu', 'timezone' => 'Pacific/Honolulu', 'country' => 'United States'],
        ['name' => 'Toronto', 'timezone' => 'America/Toronto', 'country' => 'Canada'],
        ['name' => 'Vancouver', 'timezone' => 'America/Vancouver', 'country' => 'Canada'],
        ['name' => 'Montreal', 'timezone' => 'America/Toronto', 'country' => 'Canada'],
        ['name' => 'Calgary', 'timezone' => 'America/Edmonton', 'country' => 'Canada'],
        ['name' => 'Mexico City', 'timezone' => 'America/Mexico_City', 'country' => 'Mexico'],
        ['name' => 'Guadalajara', 'timezone' => 'America/Mexico_City', 'country' => 'Mexico'],
        ['name' => 'Havana', 'timezone' => 'America/Havana', 'country' => 'Cuba'],
        ['name' => 'Panama City', 'timezone' => 'America/Panama', 'country' => 'Panama'],
        ['name' => 'Guatemala City', 'timezone' => 'America/Guatemala', 'country' => 'Guatemala'],

        // South America
        ['name' => 'São Paulo', 'timezone' => 'America/Sao_Paulo', 'country' => 'Brazil'],
        ['name' => 'Rio de Janeiro', 'timezone' => 'America/Sao_Paulo', 'country' => 'Brazil'],
        ['name' => 'Buenos Aires', 'timezone' => 'America/Argentina/Buenos_Aires', 'country' => 'Argentina'],
        ['name' => 'Santiago', 'timezone' => 'America/Santiago', 'country' => 'Chile'],
        ['name' => 'Lima', 'timezone' => 'America/Lima', 'country' => 'Peru'],
        ['name' => 'Bogotá', 'timezone' => 'America/Bogota', 'country' => 'Colombia'],
        ['name' => 'Caracas', 'timezone' => 'America/Caracas', 'country' => 'Venezuela'],
        ['name' => 'Quito', 'timezone' => 'America/Guayaquil', 'country' => 'Ecuador'],
        ['name' => 'La Paz', 'timezone' => 'America/La_Paz', 'country' => 'Bolivia'],
        ['name' => 'Montevideo', 'timezone' => 'America/Montevideo', 'country' => 'Uruguay'],

        // Europe
        ['name' => 'London', 'timezone' => 'Europe/London', 'country' => 'United Kingdom'],
        ['name' => 'Dublin', 'timezone' => 'Europe/Dublin', 'country' => 'Ireland'],
        ['name' => 'Paris', 'timezone' => 'Europe/Paris', 'country' => 'France'],
        ['name' => 'Madrid', 'timezone' => 'Europe/Madrid', 'country' => 'Spain'],
        ['name' => 'Barcelona', 'timezone' => 'Europe/Madrid', 'country' => 'Spain'],
        ['name' => 'Lisbon', 'timezone' => 'Europe/Lisbon', 'country' => 'Portugal'],
        ['name' => 'Berlin', 'timezone' => 'Europe/Berlin', 'country' => 'Germany'],
        ['name' => 'Munich', 'timezone' => 'Europe/Berlin', 'country' => 'Germany'],
        ['name' => 'Frankfurt', 'timezone' => 'Europe/Berlin', 'country' => 'Germany'],
        ['name' => 'Amsterdam', 'timezone' => 'Europe/Amsterdam', 'country' => 'Netherlands'],
        ['name' => 'Brussels', 'timezone' => 'Europe/Brussels', 'country' => 'Belgium'],
        ['name' => 'Zurich', 'timezone' => 'Europe/Zurich', 'country' => 'Switzerland'],
        ['name' => 'Geneva', 'timezone' => 'Europe/Zurich', 'country' => 'Switzerland'],
        ['name' => 'Rome', 'timezone' => 'Europe/Rome', 'country' => 'Italy'],
        ['name' => 'Milan', 'timezone' => 'Europe/Rome', 'country' => 'Italy'],
        ['name' => 'Vienna', 'timezone' => 'Europe/Vienna', 'country' => 'Austria'],
        ['name' => 'Prague', 'timezone' => 'Europe/Prague', 'country' => 'Czechia'],
        ['name' => 'Warsaw', 'timezone' => 'Europe/Warsaw', 'country' => 'Poland'],
        ['name' => 'Budapest', 'timezone' => 'Europe/Budapest', 'country' => 'Hungary'],
        ['name' => 'Stockholm', 'timezone' => 'Europe/Stockholm', 'country' => 'Sweden'],
        ['name' => 'Oslo', 'timezone' => 'Europe/Oslo', 'country' => 'Norway'],
        ['name' => 'Copenhagen', 'timezone' => 'Europe/Copenhagen', 'country' => 'Denmark'],
        ['name' => 'Helsinki', 'timezone' => 'Europe/Helsinki', 'country' => 'Finland'],
        ['name' => 'Athens', 'timezone' => 'Europe/Athens', 'country' => 'Greece'],
        ['name' => 'Istanbul', 'timezone' => 'Europe/Istanbul', 'country' => 'Turkey'],
        ['name' => 'Moscow', 'timezone' => 'Europe/Moscow', 'country' => 'Russia'],
        ['name' => 'Kyiv', 'timezone' => 'Europe/Kyiv', 'country' => 'Ukraine'],
        ['name' => 'Bucharest', 'timezone' => 'Europe/Bucharest', 'country' => 'Romania'],
        ['name' => 'Reykjavik', 'timezone' => 'Atlantic/Reykjavik', 'country' => 'Iceland'],

        // Africa
        ['name' => 'Cairo', 'timezone' => 'Africa/Cairo', 'country' => 'Egypt'],
        ['name' => 'Lagos', 'timezone' => 'Africa/Lagos', 'country' => 'Nigeria'],
        ['name' => 'Nairobi', 'timezone' => 'Africa/Nairobi', 'country' => 'Kenya'],
        ['name' => 'Johannesburg', 'timezone' => 'Africa/Johannesburg', 'country' => 'South Africa'],
        ['name' => 'Cape Town', 'timezone' => 'Africa/Johannesburg', 'country' => 'South Africa'],
        ['name' => 'Casablanca', 'timezone' => 'Africa/Casablanca', 'country' => 'Morocco'],
        ['name' => 'Accra', 'timezone' => 'Africa/Accra', 'country' => 'Ghana'],
        ['name' => 'Addis Ababa', 'timezone' => 'Africa/Addis_Ababa', 'country' => 'Ethiopia'],
        ['name' => 'Tunis', 'timezone' => 'Africa/Tunis', 'country' => 'Tunisia'],
        ['name' => 'Algiers', 'timezone' => 'Africa/Algiers', 'country' => 'Algeria'],

        // Middle East
        ['name' => 'Dubai', 'timezone' => 'Asia/Dubai', 'country' => 'United Arab Emirates'],
        ['name' => 'Abu Dhabi', 'timezone' => 'Asia/Dubai', 'country' => 'United Arab Emirates'],
        ['name' => 'Riyadh', 'timezone' => 'Asia/Riyadh', 'country' => 'Saudi Arabia'],
        ['name' => 'Doha', 'timezone' => 'Asia/Qatar', 'country' => 'Qatar'],
        ['name' => 'Tel Aviv', 'timezone' => 'Asia/Jerusalem', 'country' => 'Israel'],
        ['name' => 'Jerusalem', 'timezone' => 'Asia/Jerusalem', 'country' => 'Israel'],
        ['name' => 'Tehran', 'timezone' => 'Asia/Tehran', 'country' => 'Iran'],
        ['name' => 'Baghdad', 'timezone' => 'Asia/Baghdad', 'country' => 'Iraq'],
        ['name' => 'Beirut', 'timezone' => 'Asia/Beirut', 'country' => 'Lebanon'],
        ['name' => 'Amman', 'timezone' => 'Asia/Amman', 'country' => 'Jordan'],

        // Asia
        ['name' => 'Mumbai', 'timezone' => 'Asia/Kolkata', 'country' => 'India'],
        ['name' => 'Delhi', 'timezone' => 'Asia/Kolkata', 'country' => 'India'],
        ['name' => 'Bengaluru', 'timezone' => 'Asia/Kolkata', 'country' => 'India'],
        ['name' => 'Kolkata', 'timezone' => 'Asia/Kolkata', 'country' => 'India'],
        ['name' => 'Karachi', 'timezone' => 'Asia/Karachi', 'country' => 'Pakistan'],
        ['name' => 'Dhaka', 'timezone' => 'Asia/Dhaka', 'country' => 'Bangladesh'],
        ['name' => 'Colombo', 'timezone' => 'Asia/Colombo', 'country' => 'Sri Lanka'],
        ['name' => 'Kathmandu', 'timezone' => 'Asia/Kathmandu', 'country' => 'Nepal'],
        ['name' => 'Bangkok', 'timezone' => 'Asia/Bangkok', 'country' => 'Thailand'],
        ['name' => 'Hanoi', 'timezone' => 'Asia/Ho_Chi_Minh', 'country' => 'Vietnam'],
        ['name' => 'Ho Chi Minh City', 'timezone' => 'Asia/Ho_Chi_Minh', 'country' => 'Vietnam'],
        ['name' => 'Jakarta', 'timezone' => 'Asia/Jakarta', 'country' => 'Indonesia'],
        ['name' => 'Kuala Lumpur', 'timezone' => 'Asia/Kuala_Lumpur', 'country' => 'Malaysia'],
        ['name' => 'Singapore', 'timezone' => 'Asia/Singapore', 'country' => 'Singapore'],
        ['name' => 'Manila', 'timezone' => 'Asia/Manila', 'country' => 'Philippines'],
        ['name' => 'Hong Kong', 'timezone' => 'Asia/Hong_Kong', 'country' => 'Hong Kong'],
        ['name' => 'Beijing', 'timezone' => 'Asia/Shanghai', 'country' => 'China'],
        ['name' => 'Shanghai', 'timezone' => 'Asia/Shanghai', 'country' => 'China'],
        ['name' => 'Taipei', 'timezone' => 'Asia/Taipei', 'country' => 'Taiwan'],
        ['name' => 'Seoul', 'timezone' => 'Asia/Seoul', 'country' => 'South Korea'],
        ['name' => 'Tokyo', 'timezone' => 'Asia/Tokyo', 'country' => 'Japan'],
        ['name' => 'Osaka', 'timezone' => 'Asia/Tokyo', 'country' => 'Japan'],

        // Oceania
        ['name' => 'Sydney', 'timezone' => 'Australia/Sydney', 'country' => 'Australia'],
        ['name' => 'Melbourne', 'timezone' => 'Australia/Melbourne', 'country' => 'Australia'],
        ['name' => 'Brisbane', 'timezone' => 'Australia/Brisbane', 'country' => 'Australia'],
        ['name' => 'Perth', 'timezone' => 'Australia/Perth', 'country' => 'Australia'],
        ['name' => 'Adelaide', 'timezone' => 'Australia/Adelaide', 'country' => 'Australia'],
        ['name' => 'Auckland', 'timezone' => 'Pacific/Auckland', 'country' => 'New Zealand'],
        ['name' => 'Wellington', 'timezone' => 'Pacific/Auckland', 'country' => 'New Zealand'],
        ['name' => 'Fiji', 'timezone' => 'Pacific/Fiji', 'country' => 'Fiji'],

        // Reference
        ['name' => 'UTC', 'timezone' => 'UTC', 'country' => 'Coordinated Universal Time'],
    ],

];
