<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplyRequest extends Model
{
    use HasFactory;

    /**
     * The Stock Request table is `supply_requests` (with an underscore), so the
     * operational Supply Request table `SupplyRequest` does not collide with it.
     */
    protected $table = 'SupplyRequest';

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Operational supplies only. Sellable stock (Lechon Manok, Liempo, ...)
     * lives in `products` and is handled by the Stock Request module.
     */
    const SUPPLIES = [
        ['name' => 'Charcoal', 'value' => 'charcoal', 'default_unit' => 'sacks'],
        ['name' => 'Foil', 'value' => 'foil', 'default_unit' => 'rolls'],
        ['name' => 'Bulsita / Plastic Bags', 'value' => 'bulsita', 'default_unit' => 'packs'],
        ['name' => 'Sauce', 'value' => 'sauce', 'default_unit' => 'bottles'],
        ['name' => 'Other', 'value' => 'other', 'default_unit' => 'pcs'],
    ];

    /**
     * @return array<int, string>
     */
    public static function supplyValues(): array
    {
        return array_column(self::SUPPLIES, 'value');
    }

    public static function supplyName(string $value): string
    {
        foreach (self::SUPPLIES as $supply) {
            if ($supply['value'] === $value) {
                return $supply['name'];
            }
        }

        return ucfirst(str_replace('_', ' ', $value));
    }

    protected $fillable = [
        'user_id',
        'branch_id',
        'supply',
        'quantity',
        'unit',
        'reason',
        'status',
        'admin_notes',
        'requested_at',
        'approved_at',
        'rejected_at',
        'approved_by',
        'rejected_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    protected $appends = ['supply_name'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejecter()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function getSupplyNameAttribute(): string
    {
        return self::supplyName((string) $this->supply);
    }

    public function scopeStatus($query, $status)
    {
        return $query->when($status, fn ($q) => $q->where('status', $status));
    }

    public function scopeSupply($query, $supply)
    {
        return $query->when($supply, fn ($q) => $q->where('supply', $supply));
    }
}
