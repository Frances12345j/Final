<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('product_stocks')
            ->where('quantity', '>', 0)
            ->update(['received' => true]);
    }

    public function down(): void
    {
        DB::table('product_stocks')
            ->where('quantity', '>', 0)
            ->update(['received' => false]);
    }
};