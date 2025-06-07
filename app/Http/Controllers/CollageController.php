<?php

namespace App\Http\Controllers;

use App\Models\Collage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CollageController extends Controller
{
    public function index()
    {
        $collages = Collage::with('pages')->latest()->limit(4)->get();

        return Inertia::render('Collages/Index', [
            'collages' => $collages,
        ]);
    }

    public function store(Request $request)
    {
        Collage::create();

        return redirect()->route('collages.index');
    }

    public function destroy(Collage $collage)
    {
        $collage->delete();

        return redirect()->route('collages.index');
    }

    public function print(Collage $collage)
    {
        $collage->is_printed = true;
        $collage->save();
        // TODO: PDF export logic
    }

    public function email(Collage $collage)
    {
        // TODO: Email PDF logic
    }
}
