<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class WeeklyStatsMail extends Mailable
{
    use Queueable, SerializesModels;

    public Model $user;

    public int $totalBooks;

    public int $totalPages;

    public Model $leastPages;

    public Model $mostPages;

    public Model $mostRead;

    public Model $leastRead;

    public Collection $booksThisWeek;

    public Collection $pagesThisWeek;

    /**
     * Create a new message instance.
     */
    public function __construct(Model $user, int $totalBooks, int $totalPages, Model $leastPages, Model $mostPages, Model $mostRead, Model $leastRead, Collection $booksThisWeek, Collection $pagesThisWeek)
    {
        $this->user = $user;
        $this->totalBooks = $totalBooks;
        $this->totalPages = $totalPages;
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
            subject: config('app.name').' Weekly Stats',
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
