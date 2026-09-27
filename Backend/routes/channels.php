<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('order.{orderId}', function ($user, $orderId) {
    $order = \App\Models\Order::find($orderId);
    if (!$order) return false;

    if ($user->id === $order->user_id) return true;
    if ($user->id === $order->rider_id) return true;
    if ($user->role === 'admin' || $user->role === 'staff') return true;

    return false;
});

Broadcast::channel('staff.orders', function ($user) {
    return in_array($user->role, ['admin', 'staff']);
});

Broadcast::channel('rider.{riderId}', function ($user, $riderId) {
    return $user->id === (int) $riderId || $user->role === 'admin';
});
