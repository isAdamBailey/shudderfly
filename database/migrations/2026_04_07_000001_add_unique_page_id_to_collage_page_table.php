<?php

/**
 * Migration filename is historical: this does not add a unique on page_id.
 * It only removes duplicate (collage_id, page_id) rows from the pivot. The composite
 * unique from create_collage_page_table remains the constraint for new data.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $duplicatePairs = DB::table('collage_page')
            ->select('collage_id', 'page_id')
            ->groupBy('collage_id', 'page_id')
            ->havingRaw('count(*) > 1')
            ->get();

        foreach ($duplicatePairs as $row) {
            $keepId = DB::table('collage_page')
                ->where('collage_id', $row->collage_id)
                ->where('page_id', $row->page_id)
                ->orderBy('id')
                ->value('id');

            DB::table('collage_page')
                ->where('collage_id', $row->collage_id)
                ->where('page_id', $row->page_id)
                ->where('id', '!=', $keepId)
                ->delete();
        }
    }

    public function down(): void {}
};
