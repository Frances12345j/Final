<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Products were created without a `category`, so the inventory deliveries &
 * expenses report could only guess a product family from its name — and any
 * product whose name did not spell out its family (e.g. "Atsara") was left out
 * of the report entirely.
 *
 * Backfill the category for existing products using the same rules the report
 * applies, so the two can never disagree. Products that match neither family
 * keep a NULL category and stay out of the report until an admin sets one in
 * Products Management.
 */
return new class extends Migration
{
    public function up(): void
    {
        $updates = [];

        Product::query()
            ->select('id', 'name', 'category')
            ->where(function ($query) {
                $query->whereNull('category')->orWhere('category', '');
            })
            ->chunkById(500, function ($products) use (&$updates) {
                foreach ($products as $product) {
                    $family = Product::classifyInventoryCategory($product->name, $product->category);

                    if ($family !== null) {
                        $updates[] = ['id' => $product->id, 'category' => $family];
                    }
                }
            });

        foreach (array_chunk($updates, 200) as $chunk) {
            // UPDATE per row rather than upsert: `products` has non-nullable
            // columns without defaults, so an INSERT-based upsert would fail.
            foreach ($chunk as $update) {
                DB::table('products')
                    ->where('id', $update['id'])
                    ->update(['category' => $update['category']]);
            }
        }
    }

    public function down(): void
    {
        // Only the labels this migration could have written are cleared; anything
        // an admin picked by hand is indistinguishable, so it is left as is.
        DB::table('products')
            ->whereIn('category', [Product::INVENTORY_CATEGORY_LECHON_MANOK, Product::INVENTORY_CATEGORY_LIEMPO])
            ->update(['category' => null]);
    }
};
