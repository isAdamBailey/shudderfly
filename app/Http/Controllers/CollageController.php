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
        $collages = Collage::with('pages')->where('is_archived', false)->latest()->get();

        return Inertia::render('Collages/Index', [
            'collages' => $collages,
        ]);
    }

    public function archived()
    {
        $collages = Collage::with('pages')->where('is_archived', true)->latest()->get();

        return Inertia::render('Collages/Archived', [
            'collages' => $collages,
        ]);
    }

    public function store(Request $request)
    {
        Collage::create();

        return redirect()->route('collages.index');
    }

    public function archive(Collage $collage)
    {
        $collage->update([
            'is_archived' => true,
            'is_locked' => false,
        ]);

        return redirect()->route('collages.archived');
    }

    public function destroy(Collage $collage)
    {
        $collage->delete();

        return redirect()->route('collages.archived');
    }

    public function restore(Collage $collage)
    {
        $collage->update(['is_archived' => false]);

        return redirect()->route('collages.index');
    }

    public function update(Request $request, Collage $collage)
    {
        $data = $request->validate([
            'is_locked' => 'required|boolean',
        ]);

        $collage->update($data);

        $message = $data['is_locked'] ? 'Collage has been locked.' : 'Collage has been unlocked.';

        return back()->with('success', $message);
    }

    public function generatePdf(Collage $collage)
    {
        GenerateCollagePdf::dispatch($collage);

        return redirect()->route('collages.archived')->with('success', 'PDF generation has been queued. You will receive an email when it\'s ready.');
    }
}
