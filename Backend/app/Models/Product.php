<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price',
        'description',
        'image',
        'sku',
        'category',
        'is_active',
    ];

    public function stocks()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function deliveries()
    {
        return $this->hasMany(ProductStockDelivery::class);
    }

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'product_stocks')
                    ->withPivot('quantity', 'minimum_stock');
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockBatches()
    {
        return $this->hasMany(StockBatch::class);
    }

    /**
     * The product families the inventory deliveries & expenses report covers.
     * These are the values Products Management writes to `products.category`.
     */
    public const INVENTORY_CATEGORY_LECHON_MANOK = 'Lechon Manok';
    public const INVENTORY_CATEGORY_LIEMPO = 'Liempo';

    /**
     * Which product family a product belongs to, so the inventory deliveries &
     * expenses report shows the same numbers as the products added in Products
     * Management.
     *
     * The `category` set there is authoritative; the name is only a fallback for
     * products created before the field existed. Returns one of the
     * INVENTORY_CATEGORY_* labels, or null when the product belongs to neither.
     */
    public static function classifyInventoryCategory(?string $name, ?string $category = null): ?string
    {
        $category = strtolower(trim((string) $category));
        $name = strtolower((string) $name);

        // Liempo is matched first because it is the more specific family and some
        // names (e.g. "Pork Liempo Wrap") would otherwise be caught by the lechon
        // rule. Keep these lists tight: a product that is neither (a condiment such
        // as Atsara, for example) must stay out of the report rather than be
        // guessed into one of the columns. Set the category in Products Management
        // to place a product explicitly.
        $needles = [
            self::INVENTORY_CATEGORY_LIEMPO => ['liempo', 'pork'],
            self::INVENTORY_CATEGORY_LECHON_MANOK => ['lechon', 'manok', 'chicken'],
        ];

        foreach ($needles as $label => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($category, $keyword)) {
                    return $label;
                }
            }
        }

        if ($category !== '') {
            // An explicit category that matches neither family: trust it and keep
            // the product out of the report rather than guessing from the name.
            return null;
        }

        foreach ($needles as $label => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($name, $keyword)) {
                    return $label;
                }
            }
        }

        return null;
    }

    public function inventoryCategory(): ?string
    {
        return static::classifyInventoryCategory($this->name, $this->category);
    }

    /**
     * Product ids grouped by inventory family, ready to be used as the id sets of
     * the report's Lechon Manok / Liempo columns. Every product lands in at most
     * one group, so quantities are never counted twice.
     *
     * @return array<string, array<int>> keyed by INVENTORY_CATEGORY_* label
     */
    public static function inventoryCategoryIds(): array
    {
        $groups = [
            self::INVENTORY_CATEGORY_LECHON_MANOK => [],
            self::INVENTORY_CATEGORY_LIEMPO => [],
        ];

        self::query()
            ->select('id', 'name', 'category')
            ->chunkById(500, function ($products) use (&$groups) {
                foreach ($products as $product) {
                    $bucket = $product->inventoryCategory();
                    if ($bucket !== null) {
                        $groups[$bucket][] = (int) $product->id;
                    }
                }
            });

        return $groups;
    }
}
