<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_stock_deliveries', function (Blueprint $table) {
            $table->string('supplier')->nullable()->after('quantity');
            $table->decimal('cost_per_unit', 12, 2)->nullable()->after('supplier');
            $table->text('notes')->nullable()->after('cost_per_unit');
            $table->foreignId('created_by')->nullable()->after('received_by')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('product_stock_deliveries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['supplier', 'cost_per_unit', 'notes']);
        });
    }
};