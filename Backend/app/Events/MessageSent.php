<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('order.'.$this->message->order_id),
        ];

        $order = $this->message->order;
        if ($order && $order->rider_id) {
            $channels[] = new PrivateChannel('rider.'.$order->rider_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    public function broadcastWith(): array
    {
        return $this->message->load('sender')->toArray();
    }
}