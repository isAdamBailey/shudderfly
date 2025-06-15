<?php

namespace App\Http\Controllers;

use App\Models\Collage;
use App\Models\Page;
use Illuminate\Http\Request;

class CollagePageController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'collage_id' => 'required|exists:collages,id',
            'page_id' => 'required|exists:pages,id',
        ]);

        $collage = Collage::findOrFail($data['collage_id']);

        // Check if the page already exists in the collage (safety check)
        if (! $collage->pages()->where('page_id', $data['page_id'])->exists()) {
            $collage->pages()->attach($data['page_id']);
        }

        return back();
    }

    public function destroy(Collage $collage, Page $page)
    {
        $collage->pages()->detach($page->id);

        return back();
    }

    public function update(Request $request, Collage $collage, Page $page)
    {
        $data = $request->validate([
            'new_collage_id' => 'required|exists:collages,id',
        ]);

        // Skip if the page is already in the target collage
        if ($data['new_collage_id'] == $collage->id) {
            return back();
        }

        $collage->pages()->detach($page->id);
        Collage::findOrFail($data['new_collage_id'])->pages()->syncWithoutDetaching($page->id);

        return back();
    }
}
