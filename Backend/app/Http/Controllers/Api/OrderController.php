<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderDetails;
use App\Models\ProductStock;
use App\Models\StockBatch;
use App\Models\StaffAssignment;
use App\Events\OrderStatusUpdated;
use App\Events\RiderLocationUpdated;
use App\Events\NewOrderCreated;
use App\Events\RiderAssigned;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private const DELIVERY_BASE_FEE = 50;
    private const DELIVERY_FREE_KM = 2;
    private const DELIVERY_RATE_PER_KM = 10;
    private const DELIVERY_MAX_FEE = 500;
    private const DELIVERY_ROAD_FACTOR = 1.2;

    public function index(Request $request)
    {
        $orders = Order::with(['items.product', 'branch', 'rider'])
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($orders);
    }

    public function show(Request $request, $id)
    {
        $order = Order::with(['items.product', 'branch', 'rider'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.price' => 'required|numeric|min:0',
            'delivery_address' => 'required|string|max:500',
            'delivery_latitude' => 'nullable|numeric|between:-90,90',
            'delivery_longitude' => 'nullable|numeric|between:-180,180',
            'payment_method' => 'required|in:cod,gcash',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            $subtotal = 0;
            $items = [];

            foreach ($validated['items'] as $item) {
                $total = $item['price'] * $item['quantity'];
                $subtotal += $total;
                $items[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $total,
                ];
            }

            $branch = Branch::find($validated['branch_id']);
            $deliveryLat = $validated['delivery_latitude'] !== null ? (float) $validated['delivery_latitude'] : null;
            $deliveryLng = $validated['delivery_longitude'] !== null ? (float) $validated['delivery_longitude'] : null;
            $deliveryFee = $this->calculateDeliveryFee(
                $branch?->latitude !== null ? (float) $branch->latitude : null,
                $branch?->longitude !== null ? (float) $branch->longitude : null,
                $deliveryLat,
                $deliveryLng,
            );
            $total = $subtotal + $deliveryFee;
            $orderNumber = 'ORD-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

            $order = Order::create([
                'order_number' => $orderNumber,
                'user_id' => $user->id,
                'branch_id' => $validated['branch_id'],
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_method'] === 'gcash' ? 'pending' : 'unpaid',
                'delivery_address' => $validated['delivery_address'],
                'delivery_latitude' => $validated['delivery_latitude'] ?? null,
                'delivery_longitude' => $validated['delivery_longitude'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'total' => $total,
            ]);

            foreach ($items as $item) {
                $order->items()->create($item);
            }

            broadcast(new NewOrderCreated($order->fresh(['items.product', 'branch'])));

            return response()->json(
                Order::with(['items.product', 'branch'])->find($order->id),
                201
            );
        });
    }

    public function quoteDeliveryFee(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'delivery_latitude' => 'nullable|numeric|between:-90,90',
            'delivery_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $branch = Branch::find($validated['branch_id']);
        $deliveryLat = isset($validated['delivery_latitude']) ? (float) $validated['delivery_latitude'] : null;
        $deliveryLng = isset($validated['delivery_longitude']) ? (float) $validated['delivery_longitude'] : null;

        $branchLat = $branch?->latitude !== null ? (float) $branch->latitude : null;
        $branchLng = $branch?->longitude !== null ? (float) $branch->longitude : null;

        $distanceKm = 0.0;
        if ($branchLat !== null && $branchLng !== null && $deliveryLat !== null && $deliveryLng !== null) {
            $distanceKm = round($this->haversineKm($branchLat, $branchLng, $deliveryLat, $deliveryLng) * self::DELIVERY_ROAD_FACTOR, 1);
        }

        return response()->json([
            'delivery_fee' => $this->calculateDeliveryFee($branchLat, $branchLng, $deliveryLat, $deliveryLng),
            'distance_km' => $distanceKm,
        ]);
    }

    private function calculateDeliveryFee(?float $branchLat, ?float $branchLng, ?float $deliveryLat, ?float $deliveryLng): float
    {
        if ($branchLat === null || $branchLng === null || $deliveryLat === null || $deliveryLng === null) {
            return self::DELIVERY_BASE_FEE;
        }

        $distanceKm = $this->haversineKm($branchLat, $branchLng, $deliveryLat, $deliveryLng);
        $billableKm = max(0, ceil($distanceKm * self::DELIVERY_ROAD_FACTOR) - self::DELIVERY_FREE_KM);
        $fee = self::DELIVERY_BASE_FEE + (self::DELIVERY_RATE_PER_KM * $billableKm);

        return min($fee, self::DELIVERY_MAX_FEE);
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * $earthRadiusKm * asin(sqrt($a));
    }

    public function cancel(Request $request, $id)
    {
        $order = Order::where('user_id', $request->user()->id)->findOrFail($id);

        if (!in_array($order->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Order cannot be cancelled'], 400);
        }

        DB::transaction(function () use ($order) {
            if ($order->status === 'confirmed') {
                foreach ($order->items as $item) {
                    $stock = ProductStock::where('product_id', $item->product_id)
                        ->where('branch_id', $order->branch_id)
                        ->first();

                    if ($stock) {
                        $stock->increment('quantity', $item->quantity);
                    }
                }
            }

            $order->update(['status' => 'cancelled']);
        });

        return response()->json($order->fresh(['items.product', 'branch']));
    }

    public function statuses()
    {
        return response()->json([
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'preparing' => 'Preparing',
            'ready' => 'Ready for Pickup',
            'out_for_delivery' => 'Out for Delivery',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
        ]);
    }

    // ─── Staff Order Management ─────────────────────────────────

    public function staffIndex(Request $request)
    {
        $assignment = StaffAssignment::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'No active branch assignment'], 403);
        }

        $orders = Order::with(['user', 'items.product', 'branch'])
            ->where('branch_id', $assignment->branch_id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 50));

        $orders->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $order->user?->full_name ?? 'Customer',
                'customer_address' => $order->delivery_address,
                'customer_latitude' => $order->delivery_latitude ? (float) $order->delivery_latitude : null,
                'customer_longitude' => $order->delivery_longitude ? (float) $order->delivery_longitude : null,
                'items' => $order->items->map(fn($i) => [
                    'name' => $i->product?->name ?? 'Product',
                    'quantity' => (int) $i->quantity,
                    'price' => (float) $i->price,
                ]),
                'total' => (float) $order->total,
                'status' => $order->status,
                'branch_name' => $order->branch?->name,
                'created_at' => $order->created_at->toIso8601String(),
            ];
        });

        return response()->json($orders);
    }

    public function staffUpdateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:confirmed,preparing,ready',
        ]);

        $order = Order::findOrFail($id);

        $allowed = [
            'pending' => ['confirmed'],
            'confirmed' => ['preparing'],
            'preparing' => ['ready'],
        ];

        $next = $allowed[$order->status] ?? [];

        if (!in_array($validated['status'], $next)) {
            return response()->json([
                'message' => "Cannot transition from '{$order->status}' to '{$validated['status']}'",
            ], 400);
        }

        DB::transaction(function () use ($order, $validated) {
            $order->update(['status' => $validated['status']]);

            if ($validated['status'] === 'confirmed') {
                foreach ($order->items as $item) {
                    $stock = ProductStock::where('product_id', $item->product_id)
                        ->where('branch_id', $order->branch_id)
                        ->first();

                    if ($stock) {
                        $remainingQty = (float) $item->quantity;
                        $batches = StockBatch::where('product_id', $item->product_id)
                            ->where('branch_id', $order->branch_id)
                            ->where('remaining', '>', 0)
                            ->orderBy('received_at')
                            ->orderBy('id')
                            ->get();

                        foreach ($batches as $batch) {
                            if ($remainingQty <= 0) break;
                            $deduct = min($batch->remaining, $remainingQty);
                            $batch->decrement('remaining', $deduct);
                            $remainingQty -= $deduct;
                        }

                        $stock->update(['quantity' => max(0, (float) $stock->quantity - (float) $item->quantity)]);
                    }
                }
            }
        });

        broadcast(new OrderStatusUpdated($order->fresh(['user', 'items.product', 'branch'])));

        return response()->json($order->fresh(['user', 'items.product', 'branch']));
    }

    // ─── Rider Order Management ─────────────────────────────────

    public function riderIndex(Request $request)
    {
        $user = $request->user();
        $branchId = $user->current_branch_id;

        $orders = Order::with(['user', 'items.product', 'branch'])
            ->where(function ($q) use ($user, $branchId) {
                $q->where('status', 'ready')
                  ->whereNull('rider_id')
                  ->when($branchId, fn($wq) => $wq->where('branch_id', $branchId));
                $q->orWhere('rider_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 50));

        $orders->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_id' => $order->user_id,
                'customer_name' => $order->user?->full_name ?? 'Customer',
                'customer_address' => $order->delivery_address,
                'customer_latitude' => $order->delivery_latitude ? (float) $order->delivery_latitude : null,
                'customer_longitude' => $order->delivery_longitude ? (float) $order->delivery_longitude : null,
                'items' => $order->items->map(fn($i) => [
                    'name' => $i->product?->name ?? 'Product',
                    'quantity' => (int) $i->quantity,
                    'price' => (float) $i->price,
                ]),
                'total' => (float) $order->total,
                'delivery_fee' => (float) $order->delivery_fee,
                'status' => $order->status,
                'branch_name' => $order->branch?->name,
                'branch_address' => $order->branch?->address,
                'branch_latitude' => $order->branch?->latitude ? (float) $order->branch->latitude : null,
                'branch_longitude' => $order->branch?->longitude ? (float) $order->branch->longitude : null,
                'created_at' => $order->created_at->toIso8601String(),
            ];
        });

        return response()->json($orders);
    }

    public function riderUpdateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $user = $request->user();
        $newStatus = $request->input('status');

        $allowed = [
            'pending' => ['accepted'],
            'ready' => ['picked_up'],
            'accepted' => ['picked_up'],
            'picked_up' => ['out_for_delivery'],
            'out_for_delivery' => ['delivered'],
        ];

        $next = $allowed[$order->status] ?? [];

        if (!in_array($newStatus, $next)) {
            return response()->json([
                'message' => "Cannot transition from '{$order->status}' to '{$newStatus}'",
            ], 400);
        }

        $update = ['status' => $newStatus];

        if (in_array($newStatus, ['accepted', 'picked_up'])) {
            $update['rider_id'] = $user->id;
        }

        if ($newStatus === 'delivered') {
            $validated = $request->validate([
                'delivery_notes' => 'nullable|string|max:1000',
                'customer_confirmed' => 'required|string|max:255',
                'delivery_photo' => 'required|image|max:10240',
            ]);

            $photoPath = $request->file('delivery_photo')->store('delivery-proof', 'public');

            $update['delivery_notes'] = $validated['delivery_notes'] ?? null;
            $update['customer_confirmed'] = $validated['customer_confirmed'];
            $update['delivery_photo'] = $photoPath;
            $update['delivered_at'] = now();
        }

        $order->update($update);

        broadcast(new OrderStatusUpdated($order->fresh(['user', 'items.product', 'branch'])));

        return response()->json($order->fresh(['user', 'items.product', 'branch']));
    }

    // ─── Rider Tracking ─────────────────────────────────────────

    public function updateLocation(Request $request, $id)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $order = Order::where('rider_id', $request->user()->id)->findOrFail($id);

        $order->update([
            'rider_latitude' => $validated['latitude'],
            'rider_longitude' => $validated['longitude'],
            'rider_location_updated_at' => now(),
        ]);

        broadcast(new RiderLocationUpdated($order->fresh()));

        return response()->json(['message' => 'Location updated']);
    }

    public function trackRider(Request $request, $id)
    {
        $order = Order::with(['rider'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        if (!$order->rider_id) {
            return response()->json(['message' => 'No rider assigned yet'], 404);
        }

        return response()->json([
            'rider' => [
                'id' => $order->rider->id,
                'name' => $order->rider->full_name ?? $order->rider->firstname ?? 'Rider',
                'phone' => $order->rider->phone,
            ],
            'latitude' => $order->rider_latitude,
            'longitude' => $order->rider_longitude,
            'updated_at' => $order->rider_location_updated_at,
        ]);
    }

    public function assignRider(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $order->update([
            'rider_id' => $request->user()->id,
            'status' => 'out_for_delivery',
        ]);

        broadcast(new RiderAssigned($order->fresh(['user', 'items.product', 'branch', 'rider'])));

        return response()->json($order->fresh(['items.product', 'branch', 'rider']));
    }

    // ─── Admin Dashboard Overview (online orders + online sales) ─

    private const OVERVIEW_STATUSES = [
        'pending', 'confirmed', 'preparing', 'ready',
        'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
    ];

    public function adminOverview(Request $request)
    {
        $period = $request->input('period', 'week');
        if (!in_array($period, ['today', 'week', 'month'], true)) {
            $period = 'week';
        }

        $activeStatuses = array_values(array_diff(self::OVERVIEW_STATUSES, ['delivered', 'cancelled']));

        $statusCounts = Order::select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (int) $total);

        $counts = [];
        foreach (self::OVERVIEW_STATUSES as $status) {
            $counts[$status] = $statusCounts->get($status, 0);
        }

        $today = now()->startOfDay();

        $stats = Order::selectRaw("
            COUNT(*) as total_orders,
            COUNT(CASE WHEN created_at >= ? THEN 1 END) as today_orders,
            COALESCE(SUM(CASE WHEN created_at >= ? THEN total ELSE 0 END), 0) as today_revenue,
            COALESCE(SUM(total), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as delivered_revenue
        ", [$today, $today])->first();

        $summary = [
            'total_orders' => (int) ($stats->total_orders ?? 0),
            'active_orders' => array_sum(array_map(fn ($s) => $counts[$s], $activeStatuses)),
            'today_orders' => (int) ($stats->today_orders ?? 0),
            'delivered_orders' => $counts['delivered'],
            'cancelled_orders' => $counts['cancelled'],
            'today_revenue' => round((float) ($stats->today_revenue ?? 0), 2),
            'total_revenue' => round((float) ($stats->total_revenue ?? 0), 2),
            'delivered_revenue' => round((float) ($stats->delivered_revenue ?? 0), 2),
        ];

        $recent = Order::with(['user', 'branch'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->user?->full_name ?? 'Customer',
                    'branch_name' => $order->branch?->name ?? 'N/A',
                    'status' => $order->status,
                    'total' => (float) $order->total,
                    'payment_method' => $order->payment_method,
                    'created_at' => $order->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'summary' => $summary,
            'status_counts' => $counts,
            'recent_orders' => $recent,
            'chart' => $this->buildOnlineChart($period),
        ]);
    }

    private function buildOnlineChart(string $period): array
    {
        $now = now();
        $keys = [];
        $labels = [];

        if ($period === 'today') {
            $from = $now->copy()->startOfDay();
            for ($h = 0; $h < 24; $h++) {
                $keys[] = $h;
                $labels[] = sprintf('%02d:00', $h);
            }
        } else {
            $days = $period === 'week' ? 7 : 30;
            $from = $now->copy()->startOfDay()->subDays($days - 1);
            for ($i = 0; $i < $days; $i++) {
                $d = $from->copy()->addDays($i);
                $keys[] = $d->format('Y-m-d');
                $labels[] = $d->format('M d');
            }
        }

        $revenue = array_fill(0, count($keys), 0.0);
        $orders = array_fill(0, count($keys), 0);

        $indexBy = $period === 'today'
            ? fn (Carbon $ts) => $ts->hour
            : fn (Carbon $ts) => $ts->format('Y-m-d');

        $map = array_flip(array_map('strval', $keys));

        Order::where('created_at', '>=', $from)
            ->whereNotNull('total')
            ->toBase()
            ->get(['created_at', 'total'])
            ->each(function ($order) use ($indexBy, $map, &$revenue, &$orders) {
                $createdAt = Carbon::parse($order->created_at);
                $key = (string) $indexBy($createdAt);
                if (!isset($map[$key])) return;
                $idx = $map[$key];
                $revenue[$idx] += (float) $order->total;
                $orders[$idx] += 1;
            });

        $series = [];
        foreach ($keys as $i => $key) {
            $series[] = [
                'label' => $labels[$i],
                'orders' => $orders[$i],
                'revenue' => round($revenue[$i], 2),
            ];
        }

        return $series;
    }
}
