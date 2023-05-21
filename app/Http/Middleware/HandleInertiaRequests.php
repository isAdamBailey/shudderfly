<?php

namespace App\Http\Middleware;

use App\Models\Book;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     *
     * @return string|null
     */
    public function version(Request $request)
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return mixed[]
     */
    public function share(Request $request)
    {
        $canEditPages = in_array('edit pages', $request->user() ? $request->user()->permissions_list->toArray() : []);

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
            ],
            'books' => $canEditPages
                ? Book::all()->map->only(['id', 'title'])->toArray()
                : null,
            'categories' => Category::all()->map->only(['id', 'name'])->toArray(),
            'ziggy' => function () use ($request) {
                return array_merge((new Ziggy)->toArray(), [
                    'location' => $request->url(),
                ]);
            },
        ]);
    }
}
