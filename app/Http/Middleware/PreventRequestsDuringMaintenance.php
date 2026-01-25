<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance as Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PreventRequestsDuringMaintenance extends Middleware
{
    /**
     * The URIs that should be reachable while maintenance mode is enabled.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];

    /**
     * Render the maintenance mode response.
     */
    protected function render(Request $request, HttpException $exception): Response
    {
        $data = json_decode(file_get_contents(storage_path('framework/maintenance.php')), true);

        return response()->view('maintenance', [
            'retry' => $data['retry'] ?? $exception->getHeaders()['Retry-After'] ?? null,
        ], 503);
    }
}
