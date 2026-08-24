<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AiProviderQuotaAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $provider,
        public int $status,
        public string $body
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: config('app.name')." AI Provider Alert: {$this->provider} may be out of credits",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.ai-provider-quota-alert',
            with: [
                'provider' => $this->provider,
                'status' => $this->status,
                'body' => $this->body,
            ],
        );
    }
}
