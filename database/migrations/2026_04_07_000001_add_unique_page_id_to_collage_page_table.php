<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

    public function down(): void
    {
    }
};
