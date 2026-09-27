<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackToSale;
use App\Models\Branch;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\ProductStockDelivery;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BackToSaleController extends Controller
{
    public function index(Request $request)
    {
        $query = BackToSale::with(['user', 'product', 'branch', 'approver', 'rejecter']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('returned_at', [$request->start_date, $request->end_date]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('product', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%");
                })->orWhereHas('user', function ($sq) use ($search) {
                    $sq->where('firstname', 'like', "%{$search}%")
                      ->orWhere('lastname', 'like', "%{$search}%");
                });
            });
        }

        $backToSales = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 10);

        return response()->json($backToSales);
    }

    public function all(Request $request)
    {
        $query = BackToSale::with(['user', 'product', 'branch', 'approver', 'rejecter']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('returned_at', [$request->start_date, $request->end_date]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('product', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%");
                })->orWhereHas('user', function ($sq) use ($search) {
                    $sq->where('firstname', 'like', "%{$search}%")
                      ->orWhere('lastname', 'like', "%{$search}%");
                });
            });
        }

        // Compute stats from ALL records (unfiltered, unpaginated)
        $stats = [
            'total' => BackToSale::count(),
            'pending' => BackToSale::where('status', 'pending')->count(),
            'approved' => BackToSale::where('status', 'approved')->count(),
            'rejected' => BackToSale::where('status', 'rejected')->count(),
            'total_quantity' => BackToSale::where('status', 'approved')->sum('quantity'),
        ];

        // Return paginated data (with filters applied)
        $perPage = (int) $request->per_page ?: 10;
        $backToSales = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $backToSales->items(),
            'stats' => $stats,
            'pagination' => [
                'current_page' => $backToSales->currentPage(),
                'per_page' => $backToSales->perPage(),
                'total' => $backToSales->total(),
                'last_page' => $backToSales->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'branch_id' => 'required|exists:branches,id',
            'quantity' => 'required|numeric|min:0.5',
            'notes' => 'nullable|string|max:500',
        ]);

        $stock = ProductStock::where('product_id', $validated['product_id'])
            ->where('branch_id', $validated['branch_id'])
            ->first();

        $availableQty = round((float) ($stock->quantity ?? 0), 2);
        $requestedQty = round((float) $validated['quantity'], 2);

        if ($requestedQty > $availableQty + 0.001) {
            return response()->json([
                'message' => "Insufficient stock. Only {$availableQty} unit(s) available for return.",
            ], 422);
        }

        $backToSale = DB::transaction(function () use ($validated, $requestedQty, $stock) {
            // Deduct the returned quantity from the branch's sellable stock immediately
            if ($stock) {
                $stock->update(['quantity' => max(0, round((float) $stock->quantity - $requestedQty, 2))]);
            }

            // Deduct from oldest batches first (FIFO) so batch tracking remains in sync
            $remainingDeduct = $requestedQty;
            $batches = StockBatch::where('product_id', $validated['product_id'])
                ->where('branch_id', $validated['branch_id'])
                ->where('remaining', '>', 0)
                ->orderBy('received_at')
                ->orderBy('id')
                ->get();

            foreach ($batches as $batch) {
                if ($remainingDeduct <= 0) break;
                $deduct = min($batch->remaining, $remainingDeduct);
                $batch->decrement('remaining', $deduct);
                $remainingDeduct -= $deduct;
            }

            return BackToSale::create([
                'user_id' => Auth::id(),
                'product_id' => $validated['product_id'],
                'branch_id' => $validated['branch_id'],
                'quantity' => $validated['quantity'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
                'returned_at' => now(),
            ]);
        });

        return response()->json($backToSale->load(['user', 'product', 'branch']), 201);
    }

    public function show($id)
    {
        $backToSale = BackToSale::with(['user', 'product', 'branch', 'approver', 'rejecter'])->findOrFail($id);
        return response()->json($backToSale);
    }

    public function approve($id)
    {
        $backToSale = BackToSale::findOrFail($id);

        if ($backToSale->status !== 'pending') {
            return response()->json(['message' => 'This return has already been processed'], 400);
        }

        $returnedQty = round((float) $backToSale->quantity, 2);
        $now = \Carbon\Carbon::now('Asia/Manila');

        DB::transaction(function () use ($backToSale, $returnedQty, $now) {
            // 1. Restore the returned quantity back into the branch's sellable stock in product_stocks
            $stock = ProductStock::where('product_id', $backToSale->product_id)
                ->where('branch_id', $backToSale->branch_id)
                ->first();

            if ($stock) {
                // Add quantity back and mark as freshly restocked so POS picks it up
                $stock->update([
                    'quantity'     => round((float) $stock->quantity + $returnedQty, 2),
                    'restocked_at' => $now,
                    'received'     => true,
                ]);
            } else {
                // Edge case: no stock row existed yet — create one
                ProductStock::create([
                    'product_id'   => $backToSale->product_id,
                    'branch_id'    => $backToSale->branch_id,
                    'quantity'     => $returnedQty,
                    'restocked_at' => $now,
                    'received'     => true,
                ]);
            }

            // 2. Create a fresh StockBatch (FIFO) so POS sales can draw from this batch tomorrow
            StockBatch::create([
                'product_id'  => $backToSale->product_id,
                'branch_id'   => $backToSale->branch_id,
                'quantity'    => $returnedQty,
                'remaining'   => $returnedQty,
                'received_at' => $now,
                'source_type' => 'back_to_sale',
                'source_id'   => $backToSale->id,
            ]);

            // 3. Create a completed ProductStockDelivery record so it is permanently logged in
            // inventory tracking, ongoing restocks history, and stock movement reports
            ProductStockDelivery::create([
                'product_id'   => $backToSale->product_id,
                'branch_id'    => $backToSale->branch_id,
                'quantity'     => (int) round($returnedQty),
                'supplier'     => 'Back-to-Sale Return',
                'notes'        => 'Unsold product saved to inventory to sell again tomorrow' . ($backToSale->notes ? " ({$backToSale->notes})" : ''),
                'restocked_at' => $now,
                'received_at'  => $now,
                'received_by'  => Auth::id(),
                'created_by'   => Auth::id(),
            ]);

            // 4. Mark the return as approved
            $backToSale->update([
                'status'      => 'approved',
                'approved_at' => $now,
                'approved_by' => Auth::id(),
            ]);

            // 5. Send notification to alert branch & staff that unsold product is saved for tomorrow's sales
            $productName = Product::find($backToSale->product_id)?->name ?? "Product #{$backToSale->product_id}";
            $branchName = Branch::find($backToSale->branch_id)?->name ?? "Branch #{$backToSale->branch_id}";

            Notification::create([
                'type'    => 'stock_received',
                'message' => "{$productName} ({$returnedQty} Stock) approved from Back-to-Sales — saved to {$branchName} inventory for tomorrow's sale",
                'data'    => [
                    'product_id'      => $backToSale->product_id,
                    'branch_id'       => $backToSale->branch_id,
                    'branch_name'     => $branchName,
                    'quantity'        => $returnedQty,
                    'source'          => 'back_to_sale',
                    'back_to_sale_id' => $backToSale->id,
                ],
            ]);
        });

        return response()->json($backToSale->fresh()->load(['user', 'product', 'branch', 'approver']));
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $backToSale = BackToSale::findOrFail($id);

        if ($backToSale->status !== 'pending') {
            return response()->json(['message' => 'This return has already been processed'], 400);
        }

        $now = \Carbon\Carbon::now('Asia/Manila');

        DB::transaction(function () use ($backToSale, $validated, $now) {
            $backToSale->update([
                'status' => 'rejected',
                'admin_notes' => $validated['admin_notes'] ?? null,
                'rejected_at' => $now,
                'rejected_by' => Auth::id(),
            ]);
        });

        return response()->json($backToSale->fresh()->load(['user', 'product', 'branch', 'rejecter']));
    }

    public function approveAll(Request $request)
    {
        $branchId = $request->get('branch_id');
        $query = BackToSale::where('status', 'pending');
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $pendingList = $query->get();
        if ($pendingList->isEmpty()) {
            return response()->json(['message' => 'No pending returns to approve', 'approved_count' => 0], 200);
        }

        $now = \Carbon\Carbon::now('Asia/Manila');
        $userId = Auth::id();
        $approvedCount = 0;
        $totalQty = 0;

        DB::transaction(function () use ($pendingList, $now, $userId, &$approvedCount, &$totalQty) {
            foreach ($pendingList as $backToSale) {
                $returnedQty = round((float) $backToSale->quantity, 2);

                $stock = ProductStock::where('product_id', $backToSale->product_id)
                    ->where('branch_id', $backToSale->branch_id)
                    ->first();

                if ($stock) {
                    $stock->update([
                        'quantity'     => round((float) $stock->quantity + $returnedQty, 2),
                        'restocked_at' => $now,
                        'received'     => true,
                    ]);
                } else {
                    ProductStock::create([
                        'product_id'   => $backToSale->product_id,
                        'branch_id'    => $backToSale->branch_id,
                        'quantity'     => $returnedQty,
                        'restocked_at' => $now,
                        'received'     => true,
                    ]);
                }

                StockBatch::create([
                    'product_id'  => $backToSale->product_id,
                    'branch_id'   => $backToSale->branch_id,
                    'quantity'    => $returnedQty,
                    'remaining'   => $returnedQty,
                    'received_at' => $now,
                    'source_type' => 'back_to_sale',
                    'source_id'   => $backToSale->id,
                ]);

                ProductStockDelivery::create([
                    'product_id'   => $backToSale->product_id,
                    'branch_id'    => $backToSale->branch_id,
                    'quantity'     => (int) round($returnedQty),
                    'supplier'     => 'Back-to-Sale Return',
                    'notes'        => 'Unsold product saved to inventory to sell again tomorrow' . ($backToSale->notes ? " ({$backToSale->notes})" : ''),
                    'restocked_at' => $now,
                    'received_at'  => $now,
                    'received_by'  => $userId,
                    'created_by'   => $userId,
                ]);

                $backToSale->update([
                    'status'      => 'approved',
                    'approved_at' => $now,
                    'approved_by' => $userId,
                ]);

                $approvedCount++;
                $totalQty += $returnedQty;
            }

            Notification::create([
                'type'    => 'stock_received',
                'message' => "Batch approved {$approvedCount} Back-to-Sale request(s) ({$totalQty} units) — saved to inventory for tomorrow's sales",
                'data'    => [
                    'approved_count' => $approvedCount,
                    'total_qty'      => $totalQty,
                    'source'         => 'batch_approve',
                ],
            ]);
        });

        return response()->json([
            'message'        => "Successfully approved {$approvedCount} return(s) and saved to inventory.",
            'approved_count' => $approvedCount,
            'total_qty'      => $totalQty,
        ]);
    }
}