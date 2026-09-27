<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('stock_outs') &&
            !Schema::hasTable('manual_stock_outs')
        ) {
            Schema::rename('stock_outs', 'manual_stock_outs');
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('manual_stock_outs') &&
            !Schema::hasTable('stock_outs')
        ) {
            Schema::rename('manual_stock_outs', 'stock_outs');
        }
    }
};