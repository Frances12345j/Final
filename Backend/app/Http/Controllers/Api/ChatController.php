<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\MessageSent;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request, $orderId)
    {
        $user = $request->user();

        $order = Order::where('id', $orderId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('rider_id', $user->id);
            })
            ->firstOrFail();

        $messages = Message::with('sender')
            ->where('order_id', $orderId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    public function store(Request $request, $orderId)
    {
        $user = $request->user();

        $order = Order::where('id', $orderId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('rider_id', $user->id);
            })
            ->firstOrFail();

        if (!in_array($order->status, ['picked_up', 'out_for_delivery'])) {
            return response()->json(['message' => 'Chat is only available while the order is being delivered'], 400);
        }

        $validated = $request->validate([
            'body' => 'required|string|max:1000',
        ]);

        $message = Message::create([
            'order_id' => $order->id,
            'sender_id' => $user->id,
            'body' => $validated['body'],
        ]);

        MessageSent::dispatch($message);

        return response()->json($message->load('sender'), 201);
    }

    public function unread(Request $request, $orderId)
    {
        $user = $request->user();

        $order = Order::where('id', $orderId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('rider_id', $user->id);
            })
            ->firstOrFail();

        $count = Message::where('order_id', $orderId)
            ->where('sender_id', '!=', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    public function markRead(Request $request, $orderId)
    {
        $user = $request->user();

        Message::where('order_id', $orderId)
            ->where('sender_id', '!=', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Messages marked as read']);
    }
}
