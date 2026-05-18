<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyStatsMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;

    public string $recipientSummary;

    public array $otherUserSummaryLinks;

    /**
     * Create a new message instance.
     */
    public function __construct(
        User $user,
        string $recipientSummary,
        array $otherUserSummaryLinks
    ) {
        $this->user = $user;
        $this->recipientSummary = $recipientSummary;
        $this->otherUserSummaryLinks = $otherUserSummaryLinks;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: config('app.name').' AI Generated Summary',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.weekly-stats',
            with: [
                'user' => $this->user,
                'recipientSummary' => $this->recipientSummary,
                'otherUserSummaryLinks' => $this->otherUserSummaryLinks,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
