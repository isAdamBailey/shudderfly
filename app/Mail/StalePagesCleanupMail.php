<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StalePagesCleanupMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $report
     */
    public function __construct(public array $report) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: config('app.name').' Stale Page Cleanup Report',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.stale-pages-cleanup',
            with: ['report' => $this->report],
        );
    }
}
