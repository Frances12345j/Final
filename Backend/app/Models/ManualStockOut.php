<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManualStockOut extends Model
{
    use HasFactory;

    protected $table = 'manual_stock_outs';

    protected $fillable = [
        'product_id',
        'branch_id',
        'quantity',
        'reason',
        'stock_out_date',
        'reference',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'float',
        'stock_out_date' => 'string',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}