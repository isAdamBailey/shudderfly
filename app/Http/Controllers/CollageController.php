<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateCollagePdf;
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

    public function deleted()
    {
        $collages = Collage::onlyTrashed()->with('pages')->latest()->get();

        return Inertia::render('Collages/Deleted', [
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

    public function generatePdf(Collage $collage)
    {
        GenerateCollagePdf::dispatch($collage);

        return redirect()->route('collages.index')->with('success', 'PDF generation has been queued. You will receive an email when it\'s ready.');
    }
}
