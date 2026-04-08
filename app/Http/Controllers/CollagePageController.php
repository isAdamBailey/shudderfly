<?php

namespace App\Http\Controllers;

use App\Events\CollagePageRemoved;
use App\Models\Collage;
use App\Models\Page;
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
        $max = (int) config('collage.max_pages');
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
            $detachedCollages = $this->detachPageFromOtherCollagesWithoutBroadcast(
                $pageId,
                $collage->id
            );

            $collage->refresh();
            $count = $collage->pages()->count();
            $needsReplace = $count >= $max || ($collage->is_locked && $count > 0);

            if ($needsReplace) {
                $replaceId = (int) $data['replace_page_id'];

                $collage->pages()->detach($replaceId);
                $collage->pages()->attach($pageId);

                $collage->load('pages');
                $this->scheduleCollagePageRemovedBroadcasts([
                    ...$detachedCollages,
                    $collage,
                ]);

                return back()->with('success', __('messages.page.collage_add_success'));
            }

            $collage->pages()->attach($pageId);
            $this->scheduleCollagePageRemovedBroadcasts($detachedCollages);

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

            $detachedCollages = $this->detachPageFromOtherCollagesWithoutBroadcast(
                (int) $page->id,
                $target->id
            );

            $target->pages()->syncWithoutDetaching($page->id);
            $target->load('pages');

            $this->scheduleCollagePageRemovedBroadcasts([
                ...$detachedCollages,
                $target,
            ]);

            return back();
        });
    }

    /**
     * @return array<int, Collage>
     */
    private function detachPageFromOtherCollagesWithoutBroadcast(int $pageId, int $exceptCollageId): array
    {
        $affected = [];
        $collageIds = DB::table('collage_page')
            ->where('page_id', $pageId)
            ->where('collage_id', '!=', $exceptCollageId)
            ->pluck('collage_id');

        foreach ($collageIds as $collageId) {
            $collage = Collage::query()->find($collageId);
            if ($collage === null) {
                continue;
            }

            $collage->pages()->detach($pageId);
            $collage->load('pages');
            $affected[] = $collage;
        }

        return $affected;
    }

    /**
     * @param  array<int, Collage>  $collages
     */
    private function scheduleCollagePageRemovedBroadcasts(array $collages): void
    {
        $ids = [];
        foreach ($collages as $collage) {
            if ($collage !== null) {
                $ids[$collage->id] = true;
            }
        }

        foreach (array_keys($ids) as $collageId) {
            DB::afterCommit(function () use ($collageId) {
                $fresh = Collage::query()->with('pages')->find($collageId);
                if ($fresh !== null) {
                    CollagePageRemoved::dispatch($fresh);
                }
            });
        }
    }
}
