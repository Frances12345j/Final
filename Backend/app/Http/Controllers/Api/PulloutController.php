<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pullouts;
use App\Models\StaffAssignment;
use Illuminate\Http\Request;

class PulloutController extends Controller
{
    /**
     * Get pull-out requests for the authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $stockOuts = Pullouts::where('user_id', $user->id)
            ->with(['user', 'product', 'branch', 'approver', 'rejecter'])
            ->orderBy('pulled_out_at', 'desc')
            ->paginate(5);

        return response()->json($stockOuts);
    }

    /**
     * Get all pull-out requests (for admin)
     */
    public function getall(Request $request)
    {
        $query = Pullouts::with(['user', 'product', 'branch', 'approver', 'rejecter'])
            ->orderBy('pulled_out_at', 'desc');

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Compute stats from ALL records (unpaginated)
        $stats = [
            'total' => Pullouts::count(),
            'pending' => Pullouts::where('status', 'pending')->count(),
            'approved' => Pullouts::where('status', 'approved')->count(),
            'rejected' => Pullouts::where('status', 'rejected')->count(),
            'total_quantity' => Pullouts::where('status', 'approved')->sum('quantity'),
        ];

        // Return paginated data
        $perPage = (int) $request->per_page ?: 10;
        $stockOuts = $query->paginate($perPage);

        return response()->json([
            'data' => $stockOuts->items(),
            'stats' => $stats,
            'pagination' => [
                'current_page' => $stockOuts->currentPage(),
                'per_page' => $stockOuts->perPage(),
                'total' => $stockOuts->total(),
                'last_page' => $stockOuts->lastPage(),
            ],
        ]);
    }

    /**
     * Store a new pull-out request (pending approval)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $user = $request->user();

            // Get the user's active staff assignment branch
            $staffAssignment = StaffAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();

            if (!$staffAssignment) {
                return response()->json(['message' => 'No active branch assignment found for user'], 400);
            }

            // Create pull-out record with pending status
            $stockOut = Pullouts::create([
                'user_id' => $user->id,
                'product_id' => $validated['product_id'],
                'branch_id' => $staffAssignment->branch_id,
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'] ?? 'Pull-out',
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
                'pulled_out_at' => now(),
            ]);

            return response()->json($stockOut->load(['user', 'product', 'branch']), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create stock-out request', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific stock-out request
     */
    public function show($id)
    {
        try {
            $stockOut = Pullouts::with(['user', 'product', 'branch', 'approver', 'rejecter'])
                ->findOrFail($id);

            return response()->json($stockOut);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Stock-out request not found'], 404);
        }
    }

    /**
     * Get stock-out statistics for a user
     */
    public function statistics(Request $request)
    {
        $user = $request->user();

        $stats = [
            'total_pulled_out' => Pullouts::where('user_id', $user->id)->count(),
            'total_quantity' => Pullouts::where('user_id', $user->id)->sum('quantity'),
        ];

        return response()->json($stats);
    }

    /**
     * Approve a stock-out request (admin only) — approves without deducting stock
     */
    public function approve(Request $request, $id)
    {
        $admin = $request->user();

        try {
            $stockOut = Pullouts::findOrFail($id);

            if ($stockOut->status !== 'pending') {
                return response()->json(['message' => 'Stock-out can only be approved if pending'], 400);
            }

            $stockOut->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $admin->id,
                'admin_notes' => $request->admin_notes ?? null,
            ]);

            return response()->json($stockOut->load(['user', 'product', 'branch', 'approver', 'rejecter']));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to approve stock-out', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Reject a stock-out request (admin only)
     */
    public function reject(Request $request, $id)
    {
        $admin = $request->user();

        try {
            $stockOut = Pullouts::findOrFail($id);

            if ($stockOut->status !== 'pending') {
                return response()->json(['message' => 'Stock-out can only be rejected if pending'], 400);
            }

            $stockOut->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by' => $admin->id,
                'admin_notes' => $request->admin_notes ?? null,
            ]);

            return response()->json($stockOut->load(['user', 'product', 'branch', 'approver', 'rejecter']));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to reject stock-out', 'error' => $e->getMessage()], 500);
        }
    }
}