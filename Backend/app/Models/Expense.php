<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'category',
        'amount',
        'description',
        'expense_date',
    ];

    /**
     * expense_date is kept as a raw string (Y-m-d) following the project's
     * convention of avoiding Laravel's UTC re-serialization for business dates.
     * amount is a money value so it is exposed with 2 decimals.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'string',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}