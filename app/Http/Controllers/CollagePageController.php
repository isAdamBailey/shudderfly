<?php

namespace App\Http\Controllers;

use App\Events\CollagePageRemoved;
use App\Models\Collage;
use App\Models\Page;
use App\Support\Collage as CollageLimit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollagePageController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'collage_id' => 'required|exists:collages,id',
            'page_id' => 'required|exists:pages,id',
            'replace_page_id' => 'nullable|exists:pages,id',
        ]);

        $collage = Collage::query()->findOrFail($data['collage_id']);
        $max = CollageLimit::MAX_PAGES;
        $pageId = (int) $data['page_id'];

        if ($collage->pages()->where('page_id', $pageId)->exists()) {
            return back()->with('success', __('messages.page.collage_add_success'));
        }

        $count = $collage->pages()->count();
        $needsReplace = $count >= $max || ($collage->is_locked && $count > 0);

        if ($needsReplace) {
            if (empty($data['replace_page_id'])) {
                return back()->withErrors([
                    'collage' => __('messages.page.collage_full_need_replace'),
                ]);
            }

            $replaceId = (int) $data['replace_page_id'];

            if ($replaceId === $pageId) {
                return back()->withErrors([
                    'replace_page_id' => __('messages.page.collage_replace_invalid'),
                ]);
            }

            if (! $collage->pages()->where('page_id', $replaceId)->exists()) {
                return back()->withErrors([
                    'replace_page_id' => __('messages.page.collage_replace_not_in_collage'),
                ]);
            }
        }

        return DB::transaction(function () use ($collage, $data, $pageId, $max) {
            $this->detachPageFromOtherCollages($pageId, $collage->id);

            $collage->refresh();
            $count = $collage->pages()->count();
            $needsReplace = $count >= $max || ($collage->is_locked && $count > 0);

            if ($needsReplace) {
                $replaceId = (int) $data['replace_page_id'];

                $collage->pages()->detach($replaceId);
                $collage->pages()->attach($pageId);

                $collage->load('pages');
                CollagePageRemoved::dispatch($collage);

                return back()->with('success', __('messages.page.collage_add_success'));
            }

            $collage->pages()->attach($pageId);

            return back()->with('success', __('messages.page.collage_add_success'));
        });
    }

    public function destroy(Collage $collage, Page $page)
    {
        $detached = $collage->pages()->detach($page->id);

        if ($detached > 0) {
            $collage->load('pages');
            CollagePageRemoved::dispatch($collage);
        }

        return back();
    }

    public function update(Request $request, Collage $collage, Page $page)
    {
        $data = $request->validate([
            'new_collage_id' => 'required|exists:collages,id',
        ]);

        if ($data['new_collage_id'] == $collage->id) {
            return back();
        }

        return DB::transaction(function () use ($page, $data) {
            $target = Collage::query()->findOrFail($data['new_collage_id']);

            $this->detachPageFromOtherCollages((int) $page->id, $target->id);

            $target->pages()->syncWithoutDetaching($page->id);

            return back();
        });
    }

    private function detachPageFromOtherCollages(int $pageId, int $exceptCollageId): void
    {
        $collageIds = DB::table('collage_page')
            ->where('page_id', $pageId)
            ->where('collage_id', '!=', $exceptCollageId)
            ->pluck('collage_id');

        foreach ($collageIds as $collageId) {
            $c = Collage::query()->find($collageId);
            if ($c === null) {
                continue;
            }

            $c->pages()->detach($pageId);
            $c->load('pages');
            CollagePageRemoved::dispatch($c);
        }
    }
}
