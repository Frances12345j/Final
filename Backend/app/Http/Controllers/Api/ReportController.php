<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Pullouts;
use App\Models\Sale;
use App\Models\StaffAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Sales Report
     * GET /api/reports/sales
     * Params: start_date, end_date, group_by (daily, weekly, monthly, detail), branch_id
     */
    public function sales(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'group_by' => 'required|in:daily,weekly,monthly,detail,items,branch',
            'branch_id' => 'nullable|exists:branches,id',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = $validated['per_page'] ?? 5;
        $page = $validated['page'] ?? 1;

        $query = Sale::with(['user', 'branch', 'items.product'])
            ->whereBetween('sale_date', [$validated['start_date'], $validated['end_date']]);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $validated['branch_id']);
        }

        $groupBy = $validated['group_by'];

        if ($groupBy === 'detail') {
            $sales = $query->orderBy('sale_date', 'desc')->paginate($perPage, ['*'], 'page', $page);
            return response()->json([
                'data' => $sales->items(),
                'pagination' => [
                    'current_page' => $sales->currentPage(),
                    'last_page' => $sales->lastPage(),
                    'per_page' => $sales->perPage(),
                    'total' => $sales->total(),
                ],
                'summary' => [
                    'total_sales' => $sales->sum('total'),
                    'total_transactions' => $sales->total(),
                    'total_items_sold' => $sales->getCollection()->sum(function ($sale) {
                        return $sale->items->sum('quantity');
                    }),
                ],
            ]);
        }

        // ---------- Items breakdown ----------
        if ($groupBy === 'items') {
            $itemQuery = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->select(
                    'products.id as product_id',
                    'products.name as product_name',
                    DB::raw('SUM(sale_items.quantity) as total_qty'),
                    DB::raw('SUM(sale_items.total) as total_revenue'),
                    DB::raw('ROUND(AVG(sale_items.price), 2) as avg_price'),
                    DB::raw('COUNT(DISTINCT sales.id) as transaction_count')
                )
                ->whereBetween('sales.sale_date', [$validated['start_date'], $validated['end_date']])
                ->when($request->has('branch_id'), fn ($q) => $q->where('sales.branch_id', $validated['branch_id']))
                ->groupBy('products.id', 'products.name')
                ->orderByDesc('total_revenue');

            $perPageItems = $validated['per_page'] ?? 15;
            $pageItems = $validated['page'] ?? 1;
            $totalItems = $itemQuery->count();
            $items = $itemQuery->offset(($pageItems - 1) * $perPageItems)->limit($perPageItems)->get();

            $totalRevenue = $items->sum('total_revenue');
            $totalQty = $items->sum('total_qty');
            $lastPageItems = (int) ceil($totalItems / $perPageItems);

            return response()->json([
                'data' => $items,
                'pagination' => [
                    'current_page' => $pageItems,
                    'last_page' => $lastPageItems,
                    'per_page' => $perPageItems,
                    'total' => $totalItems,
                ],
                'summary' => [
                    'total_revenue' => (float) $items->sum('total_revenue'),
                    'total_qty_sold' => (int) $items->sum('total_qty'),
                    'total_products' => $totalItems,
                    'avg_price' => $totalQty > 0 ? round($totalRevenue / $totalQty, 2) : 0,
                ],
            ]);
        }

        // ---------- Branch breakdown ----------
        if ($groupBy === 'branch') {
            $branchQuery = DB::table('sales')
                ->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select(
                    'branches.id as branch_id',
                    'branches.name as branch_name',
                    DB::raw('COUNT(DISTINCT sales.id) as transaction_count'),
                    DB::raw('SUM(sales.total) as total_sales'),
                    DB::raw('ROUND(AVG(sales.total), 2) as avg_transaction')
                )
                ->whereBetween('sales.sale_date', [$validated['start_date'], $validated['end_date']])
                ->groupBy('branches.id', 'branches.name')
                ->orderByDesc('total_sales');

            // Items sold per branch
            $branchItems = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->select(
                    'sales.branch_id',
                    DB::raw('SUM(sale_items.quantity) as total_items')
                )
                ->whereBetween('sales.sale_date', [$validated['start_date'], $validated['end_date']])
                ->groupBy('sales.branch_id')
                ->get()
                ->keyBy('branch_id');

            $branchResult = $branchQuery->get()->map(function ($b) use ($branchItems) {
                $itemsData = $branchItems->get($b->branch_id);
                return [
                    'branch_id' => $b->branch_id,
                    'branch_name' => $b->branch_name,
                    'transaction_count' => (int) $b->transaction_count,
                    'total_sales' => (float) $b->total_sales,
                    'avg_transaction' => (float) $b->avg_transaction,
                    'total_items' => $itemsData ? (int) $itemsData->total_items : 0,
                ];
            });

            return response()->json([
                'data' => $branchResult,
                'summary' => [
                    'total_revenue' => $branchResult->sum('total_sales'),
                    'total_transactions' => $branchResult->sum('transaction_count'),
                    'total_branches' => $branchResult->count(),
                    'avg_branch_revenue' => $branchResult->count() > 0
                        ? round($branchResult->sum('total_sales') / $branchResult->count(), 2)
                        : 0,
                    'top_branch' => $branchResult->first()['branch_name'] ?? '-',
                ],
            ]);
        }

        // Grouped reports
        $dateFormat = $groupBy === 'daily' ? '%Y-%m-%d' : 
                     ($groupBy === 'weekly' ? '%Y-%u' : '%Y-%m');

        $groupedData = DB::table('sales')
            ->select(
                DB::raw("DATE_FORMAT(sale_date, '$dateFormat') as period"),
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(total) as total_sales'),
                DB::raw('SUM(subtotal) as subtotal'),
                DB::raw('SUM(discount_amount) as discount_amount'),
                DB::raw('SUM(senior_discount) as senior_discount_count')
            )
            ->whereBetween('sale_date', [$validated['start_date'], $validated['end_date']])
            ->when($request->has('branch_id'), fn ($q) => $q->where('branch_id', $validated['branch_id']))
            ->groupBy(DB::raw("DATE_FORMAT(sale_date, '$dateFormat')"))
            ->orderBy('period')
            ->get();

        // Get items sold per period
        $itemsPerPeriod = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select(
                DB::raw("DATE_FORMAT(sales.sale_date, '$dateFormat') as period"),
                DB::raw('SUM(sale_items.quantity) as total_items')
            )
            ->whereBetween('sales.sale_date', [$validated['start_date'], $validated['end_date']])
            ->when($request->has('branch_id'), fn ($q) => $q->where('sales.branch_id', $validated['branch_id']))
            ->groupBy(DB::raw("DATE_FORMAT(sales.sale_date, '$dateFormat')"))
            ->get()
            ->keyBy('period');

        $result = $groupedData->map(function ($item) use ($itemsPerPeriod) {
            $itemsData = $itemsPerPeriod->get($item->period);
            return [
                'period' => $item->period,
                'transaction_count' => (int) $item->transaction_count,
                'total_sales' => (float) $item->total_sales,
                'subtotal' => (float) $item->subtotal,
                'discount_amount' => (float) $item->discount_amount,
                'senior_discount_count' => (int) $item->senior_discount_count,
                'total_items' => $itemsData ? (float) $itemsData->total_items : 0,
            ];
        });

        return response()->json([
            'data' => $result,
            'summary' => [
                'total_sales' => $groupedData->sum('total_sales'),
                'total_transactions' => $groupedData->sum('transaction_count'),
                'total_items_sold' => $itemsPerPeriod->sum('total_items'),
            ],
        ]);
    }

    /**
     * Branch Comparison
     * GET /api/reports/sales/branches
     * Params: start_date, end_date, branch_id (optional)
     */
    public function salesBranches(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'];

        $rows = DB::table('sales')
            ->join('branches', 'sales.branch_id', '=', 'branches.id')
            ->select(
                'branches.id as branch_id',
                'branches.name as branch_name',
                DB::raw('COUNT(sales.id) as total_transactions'),
                DB::raw('COALESCE(SUM(sales.subtotal), 0) as gross_sales'),
                DB::raw('COALESCE(SUM(sales.discount_amount), 0) as discounts'),
                DB::raw('COALESCE(SUM(sales.total), 0) as net_sales')
            )
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->when($request->has('branch_id'), fn ($q) => $q->where('sales.branch_id', $validated['branch_id']))
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('net_sales')
            ->get();

        $items = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select(
                'sales.branch_id',
                DB::raw('COALESCE(SUM(sale_items.quantity), 0) as products_sold')
            )
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->when($request->has('branch_id'), fn ($q) => $q->where('sales.branch_id', $validated['branch_id']))
            ->groupBy('sales.branch_id')
            ->get()
            ->keyBy('branch_id');

        $data = $rows->map(function ($r) use ($items) {
            $itemRow = $items->get($r->branch_id);
            $transactions = (int) $r->total_transactions;
            $netSales = (float) $r->net_sales;

            return [
                'branch_id' => $r->branch_id,
                'branch_name' => $r->branch_name,
                'total_transactions' => $transactions,
                'products_sold' => (float) ($itemRow->products_sold ?? 0),
                'gross_sales' => (float) $r->gross_sales,
                'discounts' => (float) $r->discounts,
                'net_sales' => $netSales,
                'avg_transaction' => $transactions > 0 ? round($netSales / $transactions, 2) : 0,
            ];
        });

        return response()->json([
            'data' => $data,
            'summary' => [
                'branch_count' => $data->count(),
                'total_transactions' => $data->sum('total_transactions'),
                'products_sold' => (float) $data->sum('products_sold'),
                'gross_sales' => round((float) $data->sum('gross_sales'), 2),
                'discounts' => round((float) $data->sum('discounts'), 2),
                'net_sales' => round((float) $data->sum('net_sales'), 2),
                'top_branch' => $data->first()['branch_name'] ?? null,
            ],
        ]);
    }

    /**
     * Sales KPI Summary
     * GET /api/reports/sales/summary
     * Params: start_date, end_date, branch_id (optional)
     */
    public function salesSummary(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'];
        $scope = fn ($q) => $request->has('branch_id')
            ? $q->where('sales.branch_id', $validated['branch_id'])
            : $q;

        $totals = DB::table('sales')
            ->select(
                DB::raw('COUNT(*) as total_transactions'),
                DB::raw('COALESCE(SUM(subtotal), 0) as subtotal'),
                DB::raw('COALESCE(SUM(discount_amount), 0) as total_discounts'),
                DB::raw('COALESCE(SUM(total), 0) as net_sales')
            )
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->when($request->has('branch_id'), fn ($q) => $q->where('branch_id', $validated['branch_id']))
            ->first();

        $productsSold = (float) $scope(
            DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->whereBetween('sales.sale_date', [$startDate, $endDate])
        )->sum('sale_items.quantity');

        $bestSeller = $scope(
            DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->select('products.name as name', DB::raw('COALESCE(SUM(sale_items.quantity), 0) as qty'))
                ->whereBetween('sales.sale_date', [$startDate, $endDate])
        )
            ->groupBy('products.name')
            ->orderByDesc('qty')
            ->first();

        $topBranch = $scope(
            DB::table('sales')
                ->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select('branches.name as name', DB::raw('COALESCE(SUM(sales.total), 0) as net_sales'))
                ->whereBetween('sales.sale_date', [$startDate, $endDate])
        )
            ->groupBy('branches.name')
            ->orderByDesc('net_sales')
            ->first();

        $branchCount = DB::table('sales')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->when($request->has('branch_id'), fn ($q) => $q->where('branch_id', $validated['branch_id']))
            ->distinct()
            ->count('branch_id');

        // Previous equivalent period for growth
        $startDt = Carbon::parse($startDate);
        $periodDays = $startDt->diffInDays(Carbon::parse($endDate));
        $prevNetSales = (float) DB::table('sales')
            ->whereBetween('sale_date', [
                $startDt->copy()->subDays($periodDays + 1)->toDateString(),
                $startDt->copy()->subDay()->toDateString(),
            ])
            ->when($request->has('branch_id'), fn ($q) => $q->where('branch_id', $validated['branch_id']))
            ->sum('total');

        $transactions = (int) $totals->total_transactions;
        $netSales = (float) $totals->net_sales;

        return response()->json([
            'total_transactions' => $transactions,
            'products_sold' => $productsSold,
            'subtotal' => (float) $totals->subtotal,
            'total_sales' => (float) $totals->subtotal,
            'total_discounts' => (float) $totals->total_discounts,
            'net_sales' => $netSales,
            'avg_transaction' => $transactions > 0 ? round($netSales / $transactions, 2) : 0,
            'best_selling_product' => $bestSeller
                ? ['name' => $bestSeller->name, 'qty' => (float) $bestSeller->qty]
                : null,
            'top_branch' => $topBranch
                ? ['name' => $topBranch->name, 'net_sales' => (float) $topBranch->net_sales]
                : null,
            'branch_count' => (int) $branchCount,
            'growth' => $prevNetSales > 0
                ? round((($netSales - $prevNetSales) / $prevNetSales) * 100, 2)
                : null,
        ]);
    }

    /**
     * Inventory Report
     * GET /api/reports/inventory
     * Params: branch_id (optional)
     */
    public function inventory(Request $request)
{
    $validated = $request->validate([
        'branch_id' => 'nullable|exists:branches,id',
        'page'      => 'nullable|integer|min:1',
        'per_page'  => 'nullable|integer|min:1|max:100',
    ]);

    $perPage = $validated['per_page'] ?? 15;
    $page    = $validated['page'] ?? 1;

    $query = ProductStock::with(['product', 'branch'])
        ->whereHas('product', fn($q) => $q->where('is_active', true));

    if (!empty($validated['branch_id'])) {
        $query->where('branch_id', $validated['branch_id']);
    }

    // No category filter

    $stocks = $query->paginate($perPage, ['*'], 'page', $page);

    $data = [];
    $totalItems = 0;
    $totalValue = 0;
    $lowStockCount = 0;
    $outOfStockCount = 0;

    foreach ($stocks as $stock) {
        $product = $stock->product;
        $quantity = (float) $stock->quantity;
        $unitCost = (float) $product->price;
        $totalValueRow = $quantity * $unitCost;
        $minStock = max((float) $stock->minimum_stock, 15);

        if ($quantity <= 0) {
            $status = 'Out of Stock';
            $outOfStockCount++;
        } elseif ($quantity < $minStock) {
            $status = 'Low Stock';
            $lowStockCount++;
        } else {
            $status = 'In Stock';
        }

        $data[] = [
            'id'            => $stock->id,
            'product_id'    => $product->id,
            'name'          => $product->name,
            'sku'           => $product->sku ?? '',
            'category_name' => $product->category ?? 'Uncategorized',
            'branch_id'     => $stock->branch_id,
            'branch_name'   => $stock->branch->name ?? 'Unknown',
            'current_stock' => $quantity,
            'reorder_level' => $minStock,
            'unit_cost'     => $unitCost,
            'total_value'   => $totalValueRow,
            'status'        => $status,
            'is_low_stock'  => $status === 'Low Stock',
        ];

        $totalItems += $quantity;
        $totalValue += $totalValueRow;
    }

    // --- Stock Movements ---
    $movementLimit = 50;

    // IN: stock deliveries received
    $deliveryMovements = \App\Models\ProductStockDelivery::with(['product', 'branch'])
        ->whereNotNull('received_at')
        ->when(!empty($validated['branch_id']), fn($q) => $q->where('branch_id', $validated['branch_id']))
        ->orderByDesc('received_at')
        ->limit($movementLimit)
        ->get()
        ->map(fn($d) => [
            'id'            => 'del-' . $d->id,
            'created_at'    => $d->received_at,
            'item_name'     => $d->product->name ?? 'Unknown',
            'movement_type' => 'IN',
            'quantity'      => (int) $d->quantity,
            'branch_name'   => $d->branch->name ?? 'N/A',
            'reference'     => 'Delivery #' . $d->id,
            'notes'         => 'Restocked delivery',
        ]);

    // OUT: products sold via sales
    $saleMovements = DB::table('sale_items')
        ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
        ->join('products', 'sale_items.product_id', '=', 'products.id')
        ->leftJoin('branches', 'sales.branch_id', '=', 'branches.id')
        ->select(
            'sale_items.id',
            'sales.sale_date as created_at',
            'products.name as item_name',
            DB::raw("'OUT' as movement_type"),
            'sale_items.quantity',
            DB::raw('COALESCE(branches.name, "N/A") as branch_name'),
            DB::raw('CONCAT("Sale #", sales.id) as reference'),
            DB::raw('"Sold via POS" as notes')
        )
        ->when(!empty($validated['branch_id']), fn($q) => $q->where('sales.branch_id', $validated['branch_id']))
        ->orderByDesc('sales.sale_date')
        ->limit($movementLimit)
        ->get()
        ->map(fn($r) => (array) $r);

    // Merge and sort by date descending, take top N
    $allMovements = $deliveryMovements->values()
        ->concat(collect($saleMovements))
        ->sortByDesc('created_at')
        ->values()
        ->take($movementLimit)
        ->all();

    return response()->json([
        'data' => $data,
        'movements' => $allMovements,
        'pagination' => [
            'current_page' => $stocks->currentPage(),
            'last_page'    => $stocks->lastPage(),
            'per_page'     => $stocks->perPage(),
            'total'        => $stocks->total(),
        ],
        'summary' => [
            'total_items'       => $totalItems,
            'total_value'       => $totalValue,
            'low_stock_items'   => $lowStockCount,
            'out_of_stock_items'=> $outOfStockCount,
            'total_products'    => $stocks->total(),
        ],
    ]);
}

    /**
     * Attendance Report
     * GET /api/reports/attendance
     * Params: start_date, end_date, branch_id (optional)
     */
    public function attendance(Request $request)
{
    $validated = $request->validate([
        'start_date' => 'required|date',
        'end_date'   => 'required|date',
        'branch_id'  => 'nullable|exists:branches,id',
        'user_id'    => 'nullable|exists:users,id',
        'page'       => 'nullable|integer|min:1',
        'per_page'   => 'nullable|integer|min:1|max:100',
    ]);

    $perPage = $validated['per_page'] ?? 5;
    $page    = $validated['page'] ?? 1;

    // Eager load user, branch, and branchAssignments (correct relation name)
    $query = Attendance::with(['user', 'branch', 'user.branchAssignments'])
        ->whereBetween('date', [$validated['start_date'], $validated['end_date']]);

    if (!empty($validated['branch_id'])) {
        $query->where('branch_id', $validated['branch_id']);
    }
    if (!empty($validated['user_id'])) {
        $query->where('user_id', $validated['user_id']);
    }

    $attendance = $query->orderBy('date', 'desc')->paginate($perPage, ['*'], 'page', $page);

    // Transform each record
    $transformed = collect($attendance->items())->map(function ($record) {
        $user = $record->user;
        $name = $user ? ($user->firstname . ' ' . $user->lastname) : 'Unknown';
        // Get position from first active branch assignment
        $position = 'Staff';
        if ($user && $user->branchAssignments) {
            $assignment = $user->branchAssignments->first();
            if ($assignment) {
                $position = $assignment->position ?? 'Staff';
            }
        }
        return [
            'id'           => $record->id,
            'date'         => $record->date,
            'staff_name'   => $name,
            'position'     => $position,
            'time_in'      => $record->time_in,
            'time_out'     => $record->time_out,
            'duration'     => $record->hours_worked ?? 0,
            'status'       => $record->status ?? 'absent',
            'is_late'      => $record->is_late ?? false,
            'late_minutes' => $record->late_minutes ?? 0,
            'branch_name'  => $record->branch->name ?? 'N/A',
        ];
    });

    // Staff summary (group by user)
    $staffSummary = [];
    $grouped = $attendance->getCollection()->groupBy('user_id');
    foreach ($grouped as $userId => $records) {
        $first = $records->first();
        $user = $first->user;
        $name = $user ? ($user->firstname . ' ' . $user->lastname) : 'Unknown';
        $daysPresent = $records->filter(fn($r) => in_array($r->status, ['present', 'completed', 'completed_late']))->count();
        $daysLate = $records->filter(fn($r) => $r->is_late)->count();
        $daysAbsent = $records->filter(fn($r) => $r->status === 'absent')->count();
        $totalHours = $records->sum('hours_worked');
        $totalDays = $records->count();
        $rate = $totalDays > 0 ? round(($daysPresent / $totalDays) * 100, 2) : 0;
        $staffSummary[] = [
            'staff_id'        => $userId,
            'staff_name'      => $name,
            'days_present'    => $daysPresent,
            'days_late'       => $daysLate,
            'days_absent'     => $daysAbsent,
            'total_hours'     => $totalHours,
            'attendance_rate' => $rate,
        ];
    }

    // Overall summary
    $totalRecords = $attendance->total();
    $presentCount = $attendance->getCollection()->filter(fn($r) => in_array($r->status, ['present', 'completed', 'completed_late']))->count();
    $lateCount = $attendance->getCollection()->filter(fn($r) => $r->is_late)->count();
    $absentCount = $attendance->getCollection()->filter(fn($r) => $r->status === 'absent')->count();
    $totalHours = $attendance->getCollection()->sum('hours_worked');

    return response()->json([
        'data' => $transformed,
        'pagination' => [
            'current_page' => $attendance->currentPage(),
            'last_page'    => $attendance->lastPage(),
            'per_page'     => $attendance->perPage(),
            'total'        => $attendance->total(),
        ],
        'summary' => [
            'total_days'      => $totalRecords,
            'total_present'   => $presentCount,
            'total_late'      => $lateCount,
            'total_absent'    => $absentCount,
            'attendance_rate' => $totalRecords > 0 ? round(($presentCount / $totalRecords) * 100, 2) : 0,
            'staff_summary'   => $staffSummary,
        ],
    ]);
}

    /**
     * Branch Report
     * GET /api/reports/branches
     * Params: start_date, end_date (optional)
     */
    public function branches(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = $validated['per_page'] ?? 15;
        $page = $validated['page'] ?? 1;

        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;

        // Compute previous period for growth calculation
        $prevStart = null;
        $prevEnd = null;
        if ($startDate && $endDate) {
            $startDt = Carbon::parse($startDate);
            $endDt = Carbon::parse($endDate);
            $periodDays = $startDt->diffInDays($endDt);
            $prevEnd = $startDt->subDay()->toDateString();
            $prevStart = $startDt->subDays($periodDays)->toDateString();
        }

        $branches = DB::table('branches')->get();

        $branchData = [];
        foreach ($branches as $branch) {
            $salesQuery = DB::table('sales')->where('branch_id', $branch->id);
            if ($startDate && $endDate) {
                $salesQuery->whereBetween('sale_date', [$startDate, $endDate]);
            }
            $totalSales = (float) $salesQuery->sum('total');
            $transactionCount = $salesQuery->count();

            // Previous period sales for growth
            $growth = null;
            if ($prevStart && $prevEnd) {
                $prevSales = (float) DB::table('sales')
                    ->where('branch_id', $branch->id)
                    ->whereBetween('sale_date', [$prevStart, $prevEnd])
                    ->sum('total');
                $growth = $prevSales > 0 ? round((($totalSales - $prevSales) / $prevSales) * 100, 1) : ($totalSales > 0 ? 100.0 : 0.0);
            }

            $staffCount = StaffAssignment::where('branch_id', $branch->id)
                ->where('is_active', true)
                ->count();

            $inventoryCount = ProductStock::where('branch_id', $branch->id)
                ->where('quantity', '>', 0)
                ->count();

            $branchData[] = [
                'id' => $branch->id,
                'name' => $branch->name,
                'location' => $branch->location ?? 'N/A',
                'total_sales' => $totalSales,
                'transaction_count' => $transactionCount,
                'staff_count' => $staffCount,
                'inventory_count' => $inventoryCount,
                'avg_transaction' => $transactionCount > 0 ? round($totalSales / $transactionCount, 2) : 0,
                'sales_per_staff' => $staffCount > 0 ? round($totalSales / $staffCount, 2) : 0,
                'growth' => $growth,
            ];
        }

        // Sort by total sales descending
        usort($branchData, fn($a, $b) => $b['total_sales'] <=> $a['total_sales']);

        // Manual pagination
        $offset = ($page - 1) * $perPage;
        $paginatedData = array_slice($branchData, $offset, $perPage);
        $total = count($branchData);
        $lastPage = (int) ceil($total / $perPage);

        $totalSalesAll = array_sum(array_column($branchData, 'total_sales'));
        $totalTransactionsAll = array_sum(array_column($branchData, 'transaction_count'));

        return response()->json([
            'data' => $paginatedData,
            'pagination' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
            'summary' => [
                'total_branches' => $total,
                'total_revenue' => $totalSalesAll,
                'total_transactions' => $totalTransactionsAll,
                'avg_branch_revenue' => $total > 0 ? round($totalSalesAll / $total, 2) : 0,
                'top_branch' => $branchData[0]['name'] ?? '-',
                'performance_distribution' => collect($branchData)->map(fn($b) => [
                    'branch_id' => $b['id'],
                    'branch_name' => $b['name'],
                    'revenue' => $b['total_sales'],
                    'percentage' => $totalSalesAll > 0 ? round(($b['total_sales'] / $totalSalesAll) * 100, 1) : 0,
                ])->values()->all(),
            ],
        ]);
    }

    /**
     * Pull-Out Report
     * GET /api/reports/PullOut
     * Params: start_date, end_date, branch_id, status, search, page, per_page
     */
    public function PullOut(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'status' => 'nullable|in:all,pending,approved,rejected',
            'search' => 'nullable|string|max:255',
            'export' => 'nullable|boolean',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            $query = Pullouts::with([
                'user',
                'product',
                'branch',
                'approver',
                'rejecter',
            ]);

            if (!empty($validated['start_date'])) {
                $query->where('pulled_out_at', '>=', $validated['start_date'] . ' 00:00:00');
            }

            if (!empty($validated['end_date'])) {
                $query->where('pulled_out_at', '<=', $validated['end_date'] . ' 23:59:59');
            }

            if (!empty($validated['branch_id'])) {
                $query->where('branch_id', $validated['branch_id']);
            }

            if (!empty($validated['status']) && $validated['status'] !== 'all') {
                $query->where('status', $validated['status']);
            }

            $search = trim($validated['search'] ?? '');

            if ($search !== '') {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('user', function ($query) use ($search) {
                        $query->where('firstname', 'like', "%{$search}%")
                            ->orWhere('lastname', 'like', "%{$search}%")
                            ->orWhere('middlename', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%");
                    })
                    ->orWhereHas('product', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    })
                    ->orWhereHas('branch', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%");
                    })
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhere('admin_notes', 'like', "%{$search}%");
                });
            }

            $summary = [
                'total_requests' => (clone $query)->count(),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'approved' => (clone $query)->where('status', 'approved')->count(),
                'rejected' => (clone $query)->where('status', 'rejected')->count(),
                'total_quantity' => (float) (clone $query)->sum('quantity'),
            ];

            if ($request->boolean('export')) {
                $records = (clone $query)->latest('pulled_out_at')->get();
                $recordCount = $records->count();

                return response()->json([
                    'data' => $records,
                    'summary' => $summary,
                    'pagination' => [
                        'current_page' => 1,
                        'per_page' => max(1, $recordCount),
                        'total' => $recordCount,
                        'last_page' => 1,
                    ],
                ]);
            }

            $perPage = (int) ($validated['per_page'] ?? 7);
            $page = (int) ($validated['page'] ?? 1);
            $pullOuts = $query->latest('pulled_out_at')->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'data' => $pullOuts->items(),
                'summary' => $summary,
                'pagination' => [
                    'current_page' => $pullOuts->currentPage(),
                    'per_page' => $pullOuts->perPage(),
                    'total' => $pullOuts->total(),
                    'last_page' => $pullOuts->lastPage(),
                ],
            ]);
        } catch (\Throwable $exception) {
            \Log::error('Pull Out report error', [
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Failed to load Pull Out Report',
            ], 500);
        }
    }
    /**
     * Delivery Report
     * GET /api/reports/deliveries
     * Params: start_date, end_date, status (optional), branch_id (optional), rider_id (optional)
     */
    public function deliveries(Request $request)
    {
        try {
            $query = \App\Models\Order::with(['user', 'rider', 'branch', 'items.product'])
                ->whereIn('status', ['ready', 'picked_up', 'out_for_delivery', 'delivered']);

            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->whereBetween('created_at', [
                    $request->start_date . ' 00:00:00',
                    $request->end_date . ' 23:59:59'
                ]);
            }

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->filled('branch_id') && $request->branch_id !== 'all') {
                $query->where('branch_id', $request->branch_id);
            }

            if ($request->filled('rider_id') && $request->rider_id !== 'all') {
                $query->where('rider_id', $request->rider_id);
            }

            $perPage = $request->per_page ?? 10;
            $orders = $query->latest()->paginate($perPage);

            $storageUrl = $request->getSchemeAndHttpHost() . '/storage/';
            $transformed = collect($orders->items())->map(function ($order) use ($storageUrl) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->user?->full_name ?? $order->user?->firstname ?? 'Customer',
                    'customer_phone' => $order->user?->phone,
                    'delivery_address' => $order->delivery_address,
                    'branch_name' => $order->branch?->name ?? 'N/A',
                    'rider_name' => $order->rider?->full_name ?? $order->rider?->firstname ?? 'Unassigned',
                    'rider_phone' => $order->rider?->phone,
                    'status' => $order->status,
                    'total' => (float) $order->total,
                    'payment_method' => $order->payment_method,
                    'items_count' => $order->items->count(),
                    'delivery_photo' => $order->delivery_photo ? $storageUrl . $order->delivery_photo : null,
                    'delivery_notes' => $order->delivery_notes,
                    'delivered_at' => $order->delivered_at,
                    'delivery_latitude' => $order->delivery_latitude,
                    'delivery_longitude' => $order->delivery_longitude,
                    'rider_latitude' => $order->rider_latitude,
                    'rider_longitude' => $order->rider_longitude,
                    'created_at' => $order->created_at->toIso8601String(),
                ];
            });

            $summary = [
                'total_deliveries' => $orders->total(),
                'delivered' => \App\Models\Order::where('status', 'delivered')->count(),
                'out_for_delivery' => \App\Models\Order::where('status', 'out_for_delivery')->count(),
                'picked_up' => \App\Models\Order::where('status', 'picked_up')->count(),
                'ready' => \App\Models\Order::where('status', 'ready')->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $transformed,
                'summary' => $summary,
                'pagination' => [
                    'current_page' => $orders->currentPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total(),
                    'last_page' => $orders->lastPage(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Deliveries report error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch delivery records',
            ], 500);
        }
    }

    /**
     * Inventory (Delivery & Expenses) Report
     * GET /api/reports/inventory-report
     * Params: start_date, end_date, branch_id
     *
     * Quantity of Lechon Manok / Liempo received per PH day per branch comes
     * from product_stock_deliveries that were actually received; the Expenses
     * column is the delivery cost computed from cost per unit
     * (quantity x delivery cost_per_unit, falling back to the product price when
     * no cost was recorded). Products are grouped by the category set in
     * Products Management (see Product::inventoryCategory), so adding a product
     * there is enough for it to show up in the right column. Staff are scoped to
     * their assigned branch; admins see everything (or a chosen branch).
     */
    public function inventoryReport(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $user = $request->user();
        $staffBranchId = null;

        if ($user->role !== 'admin') {
            $assignment = StaffAssignment::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();
            $staffBranchId = $assignment ? (int) $assignment->branch_id : null;
        }

        $branchId = $staffBranchId ?? ($validated['branch_id'] ?? null);

        // Identify products the way Products Management does: by the category set
        // on the product, falling back to the name for products created before the
        // field existed. This keeps a product such as "Atsara" from being dropped
        // just because its name does not spell out its family.
        $categoryIds = Product::inventoryCategoryIds();

        $lechonIds = $categoryIds[Product::INVENTORY_CATEGORY_LECHON_MANOK];
        $liempoIds = $categoryIds[Product::INVENTORY_CATEGORY_LIEMPO];

        $lechonSet = $lechonIds ? implode(',', $lechonIds) : '-1';
        $liempoSet = $liempoIds ? implode(',', $liempoIds) : '-1';

        $start = $validated['start_date'] ?? null;
        $end = $validated['end_date'] ?? null;

        // ---------- Received inventory deliveries grouped by PH date + branch ----------
        // Cost per unit is the value captured on the delivery (restock); legacy rows
        // without it fall back to the product price. The cost follows the products
        // this report covers (Lechon Manok / Liempo) so the Expenses column always
        // matches the quantities shown beside it.
        $unitCostSql = 'COALESCE(d.cost_per_unit, p.price, 0)';

        $deliveries = DB::table('product_stock_deliveries as d')
            ->join('branches as b', 'd.branch_id', '=', 'b.id')
            ->join('products as p', 'd.product_id', '=', 'p.id')
            // received_at is stored/round-tripped as PH local time (Asia/Manila),
            // so the calendar date is DATE(received_at) — do NOT CONVERT_TZ it.
            ->select(
                DB::raw('DATE(d.received_at) as date'),
                'd.branch_id',
                'b.name as branch_name',
                DB::raw("SUM(CASE WHEN d.product_id IN ({$lechonSet}) THEN d.quantity ELSE 0 END) as lechon_manok"),
                DB::raw("SUM(CASE WHEN d.product_id IN ({$liempoSet}) THEN d.quantity ELSE 0 END) as liempo"),
                DB::raw("SUM(CASE WHEN d.product_id IN ({$lechonSet}) THEN d.quantity * {$unitCostSql} ELSE 0 END) as lechon_expense"),
                DB::raw("SUM(CASE WHEN d.product_id IN ({$liempoSet}) THEN d.quantity * {$unitCostSql} ELSE 0 END) as liempo_expense")
            )
            ->whereNotNull('d.received_at')
            ->when($start, fn ($q) => $q->where(DB::raw('DATE(d.received_at)'), '>=', $start))
            ->when($end, fn ($q) => $q->where(DB::raw('DATE(d.received_at)'), '<=', $end))
            ->when($branchId, fn ($q) => $q->where('d.branch_id', $branchId))
            ->groupBy(DB::raw('DATE(d.received_at)'), 'd.branch_id', 'b.name')
            ->get();

        // ---------- Rows keyed by (date, branch_id); Expenses = cost per unit x qty ----------
        $rows = [];
        foreach ($deliveries as $row) {
            $lechonExpense = round((float) $row->lechon_expense, 2);
            $liempoExpense = round((float) $row->liempo_expense, 2);

            $rows[$row->date . '|' . $row->branch_id] = [
                'date' => $row->date,
                'branch_id' => (int) $row->branch_id,
                'branch_name' => $row->branch_name,
                'lechon_manok' => (float) $row->lechon_manok,
                'liempo' => (float) $row->liempo,
                'lechon_expense' => $lechonExpense,
                'liempo_expense' => $liempoExpense,
                'expenses' => round($lechonExpense + $liempoExpense, 2),
            ];
        }

        // Stable two-pass sort: newest date first, then branch name ascending.
        $rows = collect($rows)->sortBy('branch_name')->sortByDesc('date')->values();

        $totals = [
            'total_lechon_manok' => round($rows->sum('lechon_manok'), 2),
            'total_liempo' => round($rows->sum('liempo'), 2),
            'total_lechon_expense' => round($rows->sum('lechon_expense'), 2),
            'total_liempo_expense' => round($rows->sum('liempo_expense'), 2),
            'total_expenses' => round($rows->sum('expenses'), 2),
        ];

        return response()->json([
            'data' => $rows->toArray(),
            'totals' => $totals,
        ]);
    }
}