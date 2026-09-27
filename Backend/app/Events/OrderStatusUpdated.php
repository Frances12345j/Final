<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('order.'.$this->order->id),
            new PrivateChannel('staff.orders'),
        ];

        if ($this->order->rider_id) {
            $channels[] = new PrivateChannel('rider.'.$this->order->rider_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'OrderStatusUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'status' => $this->order->status,
            'branch_id' => $this->order->branch_id,
            'rider_id' => $this->order->rider_id,
            'user_id' => $this->order->user_id,
            'updated_at' => $this->order->updated_at?->toIso8601String(),
        ];
    }
}
