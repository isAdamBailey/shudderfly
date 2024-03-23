<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyStatsMail extends Mailable
{
    use Queueable, SerializesModels;

    public mixed $user;
    public mixed $leastPages;
    public mixed $mostPages;
    public mixed $mostRead;
    public mixed $leastRead;
    public mixed $booksThisWeek;
    public mixed $pagesThisWeek;

    /**
     * Create a new message instance.
     *
     * @param mixed $user
     * @param mixed $leastPages
     * @param mixed $mostPages
     * @param mixed $mostRead
     * @param mixed $leastRead
     * @param mixed $booksThisWeek
     * @param mixed $pagesThisWeek
     */
    public function __construct(mixed $user, mixed $leastPages, mixed $mostPages, mixed $mostRead, mixed $leastRead, mixed $booksThisWeek, mixed $pagesThisWeek)
    {
        $this->user = $user;
        $this->leastPages = $leastPages;
        $this->mostPages = $mostPages;
        $this->mostRead = $mostRead;
        $this->leastRead = $leastRead;
        $this->booksThisWeek = $booksThisWeek;
        $this->pagesThisWeek = $pagesThisWeek;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Weekly Stats Mail',
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
                'leastPages' => $this->leastPages,
                'mostPages' => $this->mostPages,
                'mostRead' => $this->mostRead,
                'leastRead' => $this->leastRead,
                'booksThisWeek' => $this->booksThisWeek,
                'pagesThisWeek' => $this->pagesThisWeek,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
