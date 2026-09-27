<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('sales_targets', 'target_products')) {
            Schema::table('sales_targets', function (Blueprint $table) {
                $table->unsignedInteger('target_products')->default(0)->after('user_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sales_targets', 'target_products')) {
            Schema::table('sales_targets', function (Blueprint $table) {
                $table->dropColumn('target_products');
            });
        }
    }
};