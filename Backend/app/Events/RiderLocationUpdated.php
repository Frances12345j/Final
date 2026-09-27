<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RiderLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('order.'.$this->order->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'RiderLocationUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'latitude' => $this->order->rider_latitude ? (float) $this->order->rider_latitude : null,
            'longitude' => $this->order->rider_longitude ? (float) $this->order->rider_longitude : null,
            'updated_at' => $this->order->rider_location_updated_at?->toIso8601String(),
        ];
    }
}
