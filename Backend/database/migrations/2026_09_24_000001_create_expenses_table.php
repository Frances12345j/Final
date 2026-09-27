<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('category');
            $table->decimal('amount', 12, 2);
            $table->text('description')->nullable();
            $table->date('expense_date');
            $table->timestamps();

            $table->index(['branch_id', 'expense_date']);
            $table->index('category');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};