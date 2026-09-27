<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\StockRequest;
use App\Models\ProductStockDelivery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StockRequestController extends Controller
{
    /**
     * Column used for ordering. Falls back to created_at if requested_at
     * doesn't exist on the table (prevents SQLSTATE 42S22 → 500).
     */
    private function orderColumn(): string
    {
        return Schema::hasColumn('stock_requests', 'requested_at')
            ? 'requested_at'
            : 'created_at';
    }

    /**
     * Relationships that actually exist on the model.
     * Filters out approver/rejecter if the model doesn't define them,
     * so a missing relation never causes a 500.
     */
    private function safeWith(): array
    {
        $model = new StockRequest();
        $wanted = ['user', 'product', 'branch', 'approver', 'rejecter'];
        $available = [];

        foreach ($wanted as $rel) {
            if (method_exists($model, $rel)) {
                $available[] = $rel;
            }
        }

        return $available;
    }

    /**
     * Get stock requests for the authenticated user
     */
    public function myStockRequests(Request $request)
    {
        $user = $request->user();

        $requests = StockRequest::where('user_id', $user->id)
            ->with($this->safeWith())
            ->orderBy($this->orderColumn(), 'desc')
            ->paginate(5);

        return response()->json($requests);
    }

    /**
     * Get all stock requests (for admin)
     */
    public function allStockRequests(Request $request)
{
    try {
        $query = StockRequest::with($this->safeWith())
            ->orderBy($this->orderColumn(), 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $requests = $query->paginate(5);

        return response()->json($requests);
    } catch (\Throwable $e) {
        \Log::error('StockRequest allStockRequests failed', ['error' => $e->getMessage()]);
        return response()->json([
            'message' => 'Failed to fetch stock requests',
            'error'   => $e->getMessage(),
        ], 500);
    }
}

    /**
     * Store a new stock request
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'required|integer|min:1',
            'reason'     => 'nullable|string|max:500',
        ]);

        try {
            $user = $request->user();

            $staffAssignment = \App\Models\StaffAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();

            if (!$staffAssignment) {
                return response()->json(['message' => 'No active branch assignment found for user'], 400);
            }

            $payload = [
                'user_id'    => $user->id,
                'product_id' => $validated['product_id'],
                'branch_id'  => $staffAssignment->branch_id,
                'quantity'   => $validated['quantity'],
                'reason'     => $validated['reason'] ?? null,
                'status'     => 'pending',
            ];

            if (Schema::hasColumn('stock_requests', 'requested_at')) {
                $payload['requested_at'] = now();
            }

            $stockRequest = StockRequest::create($payload);
            $stockRequest->load($this->safeWith());

            $staffName   = $stockRequest->user?->full_name ?? "Staff #{$stockRequest->user_id}";
            $productName = $stockRequest->product?->name ?? "Product #{$stockRequest->product_id}";
            $branchName  = $stockRequest->branch?->name ?? 'Undefined Branch';

            Notification::create([
                'type'    => 'stock_request',
                'message' => "{$staffName} requested {$stockRequest->quantity} stock of {$productName} for {$branchName}",
                'data'    => [
                    'stock_request_id' => $stockRequest->id,
                    'user_id'          => $stockRequest->user_id,
                    'user_name'        => $staffName,
                    'product_id'       => $stockRequest->product_id,
                    'product_name'     => $productName,
                    'branch_id'        => $stockRequest->branch_id,
                    'branch_name'      => $branchName,
                    'quantity'         => $stockRequest->quantity,
                    'status'           => 'pending',
                ],
            ]);

            return response()->json($stockRequest->load($this->safeWith()), 201);
        } catch (\Throwable $e) {
            \Log::error('StockRequest store failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to create stock request',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific stock request
     */
    public function show($id)
    {
        try {
            $request = StockRequest::with($this->safeWith())->findOrFail($id);
            return response()->json($request);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Stock request not found'], 404);
        }
    }

    /**
     * Approve a stock request (admin only)
     */
    public function approve(Request $request, $id)
    {
        $admin = $request->user();

        try {
            $stockRequest = StockRequest::findOrFail($id);

            if ($stockRequest->status !== 'pending') {
                return response()->json(['message' => 'Stock request can only be approved if pending'], 400);
            }

            DB::beginTransaction();

            $stockRequest->update([
                'status'       => 'approved',
                'approved_at'  => now(),
                'approved_by'  => $admin->id,
                'admin_notes'  => $request->admin_notes ?? null,
            ]);

            ProductStockDelivery::create([
                'product_id'   => $stockRequest->product_id,
                'branch_id'    => $stockRequest->branch_id,
                'quantity'     => $stockRequest->quantity,
                'restocked_at' => \Carbon\Carbon::now('Asia/Manila'),
                'received_at'  => null,
                'received_by'  => null,
            ]);

            DB::commit();

            return response()->json($stockRequest->load($this->safeWith()));
        } catch (\Throwable $e) {
            DB::rollBack();
            \Log::error('StockRequest approve failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to approve stock request',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a stock request (admin only)
     */
    public function reject(Request $request, $id)
    {
        $admin = $request->user();

        try {
            $stockRequest = StockRequest::findOrFail($id);

            if ($stockRequest->status !== 'pending') {
                return response()->json(['message' => 'Stock request can only be rejected if pending'], 400);
            }

            $stockRequest->update([
                'status'      => 'rejected',
                'rejected_at' => now(),
                'rejected_by' => $admin->id,
                'admin_notes' => $request->admin_notes ?? null,
            ]);

            return response()->json($stockRequest->load($this->safeWith()));
        } catch (\Throwable $e) {
            \Log::error('StockRequest reject failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to reject stock request',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get branches where the user has an active staff assignment
     */
    public function getUserBranches(Request $request)
    {
        $user = $request->user();

        $assignedBranchIds = \App\Models\StaffAssignment::where('user_id', $user->id)
            ->where('is_active', true)
            ->pluck('branch_id');

        $branches = \App\Models\Branch::where('is_active', true)
            ->whereIn('id', $assignedBranchIds)
            ->get();

        return response()->json($branches);
    }

    /**
     * Get stock request statistics for a user
     */
    public function statistics(Request $request)
    {
        $user = $request->user();

        $stats = [
            'total_requested'        => StockRequest::where('user_id', $user->id)->count(),
            'pending'                => StockRequest::where('user_id', $user->id)->where('status', 'pending')->count(),
            'approved'               => StockRequest::where('user_id', $user->id)->where('status', 'approved')->count(),
            'rejected'               => StockRequest::where('user_id', $user->id)->where('status', 'rejected')->count(),
            'total_quantity_approved' => StockRequest::where('user_id', $user->id)
                ->where('status', 'approved')
                ->sum('quantity'),
        ];

        return response()->json($stats);
    }
}