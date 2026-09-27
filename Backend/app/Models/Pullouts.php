<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pullouts extends Model
{
    use HasFactory;

    protected $table = 'pull_outs';

    protected $fillable = [
        'user_id',
        'product_id',
        'branch_id',
        'quantity',
        'notes',
        'reason',
        'status',
        'admin_notes',
        'pulled_out_at',
        'approved_at',
        'rejected_at',
        'approved_by',
        'rejected_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'pulled_out_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
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
}