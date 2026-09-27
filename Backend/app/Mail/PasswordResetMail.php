<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public ?string $name = null)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'NewMoon – Your OTP Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.password_reset',
            with: [
                'otp' => $this->otp,
                'name' => $this->name,
            ],
        );
    }
}