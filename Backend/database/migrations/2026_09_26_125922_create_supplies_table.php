<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Supply Requests: staff requests for operational supplies (charcoal, foil,
     * bulsita, sauce, ...) needed for daily branch operations.
     *
     * NOTE: the physical table is named `operational_supply_requests` because
     * `supply_requests` is already taken by the existing Stock Request table.
     * This module is intentionally NOT part of the Stock Request feature.
     *
     * `supply` is a value column (not a FK) so this module stays a single
     * self-contained table. The allowed list lives on the SupplyRequest model.
     */
    public function up(): void
    {
        Schema::create('SupplyRequest', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();

            $table->string('supply');                 // charcoal | foil | bulsita | sauce | other
            $table->decimal('quantity', 10, 2);
            $table->string('unit');
            $table->text('reason')->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();

            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['supply', 'status']);
        });
        }

    public function down(): void
    {
        Schema::dropIfExists('operational_supply_requests');
    }
};
