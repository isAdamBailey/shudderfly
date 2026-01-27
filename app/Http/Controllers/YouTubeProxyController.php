<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeProxyController extends Controller
{
    public function iframeApi()
    {
        $cacheKey = 'youtube_iframe_api';
        $cacheDuration = 3600;

        $script = Cache::remember($cacheKey, $cacheDuration, function () {
            try {
                $response = Http::timeout(10)->get('https://www.youtube.com/iframe_api');

                if ($response->successful()) {
                    return $response->body();
                }

                return null;
            } catch (\Exception $e) {
                Log::error('YouTube IFrame API proxy error: '.$e->getMessage());

                return null;
            }
        });

        if ($script === null) {
            abort(503, 'Unable to load YouTube IFrame API');
        }

        return response($script, 200)
            ->header('Content-Type', 'application/javascript')
            ->header('Cache-Control', 'public, max-age=3600')
            ->header('Access-Control-Allow-Origin', '*');
    }
}
