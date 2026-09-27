<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\StaffAssignment;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    /**
     * Easy to extend: add a new category here and it becomes available
     * everywhere (POS form + admin filters + validation).
     */
    public const EXPENSE_CATEGORIES = [
        'Transportation',
        'Charcoal',
        'Packaging',
        'Supplies',
        'Cleaning',
        'Other',
    ];

    /**
     * Resolve the branch an expense may be created for.
     *
     * Staff/riders are locked to their active staff assignment — any
     * branch_id sent by the client is ignored so staff cannot record an
     * expense for a branch they do not belong to.
     */
    private function resolveBranchId(Request $request): int
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            $assignment = StaffAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();

            if (! $assignment) {
                abort(403, 'No active branch assignment for this staff member.');
            }

            return (int) $assignment->branch_id;
        }

        $branchId = $request->input('branch_id');

        if (! $branchId) {
            abort(422, 'branch_id is required when an admin records an expense.');
        }

        if (! Branch::whereKey($branchId)->exists()) {
            abort(422, 'The selected branch is invalid.');
        }

        return (int) $branchId;
    }

    private function staffBranchId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return null;
        }

        $assignment = StaffAssignment::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        return $assignment ? (int) $assignment->branch_id : null;
    }

    public function categories()
    {
        return response()->json(self::EXPENSE_CATEGORIES);
    }

    /**
     * GET /api/expenses
     * Params: start_date, end_date, branch_id, category
     * Staff only ever sees their assigned branch.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'branch_id' => 'nullable|exists:branches,id',
            'category' => 'nullable|string|max:255',
        ]);

        $query = Expense::with(['user', 'branch']);

        $staffBranchId = $this->staffBranchId($request);

        if ($staffBranchId !== null) {
            // Staff are hard-scoped to their assigned branch.
            $query->where('branch_id', $staffBranchId);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $validated['branch_id']);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('expense_date', [$validated['start_date'], $validated['end_date']]);
        } elseif ($request->filled('start_date')) {
            $query->whereDate('expense_date', '>=', $validated['start_date']);
        } elseif ($request->filled('end_date')) {
            $query->whereDate('expense_date', '<=', $validated['end_date']);
        }

        if ($request->filled('category')) {
            $query->where('category', $validated['category']);
        }

        $expenses = $query->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json($expenses);
    }

    /**
     * POST /api/expenses
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|in:' . implode(',', self::EXPENSE_CATEGORIES),
            'amount' => 'required|numeric|gt:0',
            'description' => 'nullable|string|max:1000',
            'expense_date' => 'nullable|date',
        ]);

        $branchId = $this->resolveBranchId($request);

        $expense = Expense::create([
            'branch_id' => $branchId,
            'user_id' => $request->user()->id,
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'description' => $validated['description'] ?? null,
            // Business calendar is Philippines; fall back to the PH date when not supplied.
            'expense_date' => $validated['expense_date'] ?? now()->timezone('Asia/Manila')->toDateString(),
        ]);

        return response()->json($expense->load(['branch', 'user']), 201);
    }

    /**
     * GET /api/expenses/{id}
     */
    public function show(Request $request, $id)
    {
        $expense = Expense::with(['branch', 'user'])->findOrFail($id);

        $staffBranchId = $this->staffBranchId($request);

        if ($staffBranchId !== null && (int) $expense->branch_id !== $staffBranchId) {
            abort(403, 'You can only view expenses for your assigned branch.');
        }

        return response()->json($expense);
    }

    /**
     * DELETE /api/expenses/{id}
     * Admins may delete any expense; staff may only delete expenses
     * they personally recorded for their own branch.
     */
    public function destroy(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);

        $user = $request->user();

        if ($user->role !== 'admin') {
            if ((int) $expense->user_id !== (int) $user->id) {
                abort(403, 'You can only delete expenses you recorded yourself.');
            }

            $staffBranchId = $this->staffBranchId($request);

            if ($staffBranchId !== null && (int) $expense->branch_id !== $staffBranchId) {
                abort(403, 'You can only delete expenses for your assigned branch.');
            }
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully.'], 200);
    }
}