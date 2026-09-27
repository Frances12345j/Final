<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Notification;
use App\Models\StaffAssignment;
use App\Models\SupplyRequest;
use App\Models\User;
use Illuminate\Http\Request;

class SupplyRequestController extends Controller
{
    /**
     * Supply Requests are for operational supplies only (charcoal, foil,
     * bulsita, sauce, ...). This is a request/approval record only — it never
     * deducts inventory and never touches the Stock Request table.
     */

    private function isAdmin(?User $user): bool
    {
        return $user !== null && $user->role === User::ROLE_ADMIN;
    }

    /**
     * Backend authorization guard. Returns a 403 response, or null when allowed.
     */
    private function denyUnlessAdmin(Request $request)
    {
        if (!$this->isAdmin($request->user())) {
            return response()->json([
                'message' => 'Only admins can perform this action on supply requests.',
            ], 403);
        }

        return null;
    }

    /**
     * Resolve the authenticated staff member's active branch.
     */
    private function resolveBranchId(Request $request)
    {
        return StaffAssignment::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->value('branch_id');
    }

    /**
     * GET /api/supplies - operational supply catalogue.
     */
    public function supplies()
    {
        return response()->json(SupplyRequest::SUPPLIES);
    }

    /**
     * GET /api/supply-requests
     * Staff: only their own requests. Admin: all requests.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($this->isAdmin($user)) {
            $query = $this->filteredQuery($request);
        } else {
            $query = SupplyRequest::where('user_id', $user->id)
                ->with($this->relations())
                ->orderByDesc('requested_at');
        }

        $requests = $query->paginate($request->integer('per_page') ?: 10);

        return response()->json($requests);
    }

    /**
     * Shared search + filters for the admin list.
     */
    private function filteredQuery(Request $request)
    {
        $query = SupplyRequest::with($this->relations());

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('supply', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq
                        ->where('firstname', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere('middlename', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->filled('supply')) {
            $query->where('supply', $request->query('supply'));
        }

        if ($request->filled('from')) {
            $query->whereDate('requested_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('requested_at', '<=', $request->query('to'));
        }

        return $query->orderByDesc('requested_at')->orderByDesc('id');
    }

    private function relations(): array
    {
        return ['user', 'branch', 'approver', 'rejecter'];
    }

    /**
     * GET /api/supply-requests/branches - branches (admin) for filtering.
     */
    public function branches(Request $request)
    {
        if ($denied = $this->denyUnlessAdmin($request)) {
            return $denied;
        }

        return response()->json(
            Branch::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
        );
    }

    /**
     * GET /api/supply-requests/statistics
     */
    public function statistics(Request $request)
    {
        $user = $request->user();

        $base = $this->isAdmin($user)
            ? SupplyRequest::query()
            : SupplyRequest::where('user_id', $user->id);

        $stats = [
            'total_requested' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', SupplyRequest::STATUS_PENDING)->count(),
            'approved' => (clone $base)->where('status', SupplyRequest::STATUS_APPROVED)->count(),
            'rejected' => (clone $base)->where('status', SupplyRequest::STATUS_REJECTED)->count(),
            'total_quantity_approved' => (clone $base)
                ->where('status', SupplyRequest::STATUS_APPROVED)
                ->sum('quantity'),
        ];

        return response()->json($stats);
    }

    /**
     * GET /api/supply-requests/{id}
     */
    public function show(Request $request, $id)
    {
        $supplyRequest = SupplyRequest::with($this->relations())->find($id);

        if (!$supplyRequest) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        // Staff may only view their own requests.
        if (!$this->isAdmin($request->user()) && $supplyRequest->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        return response()->json($supplyRequest);
    }

    /**
     * POST /api/supply-requests
     * Branch and requester are always derived from the authenticated staff
     * member — the payload cannot override them.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'supply' => ['required', 'string', 'in:' . implode(',', SupplyRequest::supplyValues())],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'unit' => ['required', 'string', 'max:50'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $branchId = $this->resolveBranchId($request);

        if (!$branchId) {
            return response()->json([
                'message' => 'No active branch assignment found for your account.',
            ], 400);
        }

        $supplyName = SupplyRequest::supplyName($validated['supply']);

        $supplyRequest = SupplyRequest::create([
            'user_id' => $request->user()->id,
            'branch_id' => $branchId,
            'supply' => $validated['supply'],
            'quantity' => $validated['quantity'],
            'unit' => $validated['unit'],
            'reason' => $validated['reason'] ?? null,
            'status' => SupplyRequest::STATUS_PENDING,
            'requested_at' => now(),
        ]);

        $branchName = $supplyRequest->branch?->name ?? 'Undefined Branch';
        $staffName = $supplyRequest->user?->full_name ?? "Staff #{$supplyRequest->user_id}";

        Notification::create([
            'type' => 'supply_request',
            'message' => "{$staffName} requested {$supplyRequest->quantity} {$supplyRequest->unit} of {$supplyName} for {$branchName}",
            'data' => [
                'supply_request_id' => $supplyRequest->id,
                'user_id' => $supplyRequest->user_id,
                'user_name' => $staffName,
                'supply' => $supplyRequest->supply,
                'supply_name' => $supplyName,
                'branch_id' => $supplyRequest->branch_id,
                'branch_name' => $branchName,
                'quantity' => (float) $supplyRequest->quantity,
                'unit' => $supplyRequest->unit,
                'status' => SupplyRequest::STATUS_PENDING,
            ],
        ]);

        return response()->json(
            $supplyRequest->load($this->relations()),
            201
        );
    }

    /**
     * PUT /api/supply-requests/{id}
     * Staff may edit their own pending request. Branch, requester and status
     * are never editable.
     */
    public function update(Request $request, $id)
    {
        $supplyRequest = SupplyRequest::find($id);

        if (!$supplyRequest) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        $user = $request->user();

        if (!$this->isAdmin($user) && $supplyRequest->user_id !== $user->id) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        if ($supplyRequest->status !== SupplyRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending supply requests can be edited.',
            ], 400);
        }

        $validated = $request->validate([
            'supply' => ['sometimes', 'required', 'string', 'in:' . implode(',', SupplyRequest::supplyValues())],
            'quantity' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:999999'],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $supplyRequest->fill([
            'supply' => $validated['supply'] ?? $supplyRequest->supply,
            'quantity' => $validated['quantity'] ?? $supplyRequest->quantity,
            'unit' => $validated['unit'] ?? $supplyRequest->unit,
            'reason' => array_key_exists('reason', $validated) ? $validated['reason'] : $supplyRequest->reason,
        ])->save();

        return response()->json($supplyRequest->fresh($this->relations()));
    }

    /**
     * POST /api/supply-requests/{id}/approve  (admin only)
     * Record-only action: no inventory or stock movement is created.
     */
    public function approve(Request $request, $id)
    {
        if ($denied = $this->denyUnlessAdmin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $supplyRequest = SupplyRequest::find($id);

        if (!$supplyRequest) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        if ($supplyRequest->status !== SupplyRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending supply requests can be approved.',
            ], 400);
        }

        $supplyRequest->update([
            'status' => SupplyRequest::STATUS_APPROVED,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $supplyRequest->admin_notes,
        ]);

        return response()->json($supplyRequest->fresh($this->relations()));
    }

    /**
     * POST /api/supply-requests/{id}/reject  (admin only)
     */
    public function reject(Request $request, $id)
    {
        if ($denied = $this->denyUnlessAdmin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $supplyRequest = SupplyRequest::find($id);

        if (!$supplyRequest) {
            return response()->json(['message' => 'Supply request not found'], 404);
        }

        if ($supplyRequest->status !== SupplyRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending supply requests can be rejected.',
            ], 400);
        }

        $supplyRequest->update([
            'status' => SupplyRequest::STATUS_REJECTED,
            'rejected_by' => $request->user()->id,
            'rejected_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $supplyRequest->admin_notes,
        ]);

        return response()->json($supplyRequest->fresh($this->relations()));
    }
}
