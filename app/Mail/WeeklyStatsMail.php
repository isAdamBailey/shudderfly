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

    public Collection $mostRead;

    public Model $leastRead;

    public Collection $booksThisWeek;

    public array $bookCounts;

    public Collection $screenshotsThisWeek;

    public Collection $youTubeVideosThisWeek;

    public Collection $videosThisWeek;

    public Collection $imagesThisWeek;

    public int $totalSongs;

    public Collection $mostReadSongs;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Model $user,
        int $totalBooks,
        int $totalPages,
        Model $leastPages,
        Model $mostPages,
        Collection $mostRead,
        Model $leastRead,
        Collection $booksThisWeek,
        array $bookCounts,
        Collection $screenshotsThisWeek,
        Collection $youTubeVideosThisWeek,
        Collection $videosThisWeek,
        Collection $imagesThisWeek,
        int $totalSongs,
        Collection $mostReadSongs
    ) {
        $this->user = $user;
        $this->totalBooks = $totalBooks;
        $this->totalPages = $totalPages;
        $this->leastPages = $leastPages;
        $this->mostPages = $mostPages;
        $this->mostRead = $mostRead;
        $this->leastRead = $leastRead;
        $this->booksThisWeek = $booksThisWeek;
        $this->bookCounts = $bookCounts;
        $this->screenshotsThisWeek = $screenshotsThisWeek;
        $this->youTubeVideosThisWeek = $youTubeVideosThisWeek;
        $this->videosThisWeek = $videosThisWeek;
        $this->imagesThisWeek = $imagesThisWeek;
        $this->totalSongs = $totalSongs;
        $this->mostReadSongs = $mostReadSongs;
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
                'bookCounts' => $this->bookCounts,
                'screenshotsThisWeek' => $this->screenshotsThisWeek,
                'youTubeVideosThisWeek' => $this->youTubeVideosThisWeek,
                'videosThisWeek' => $this->videosThisWeek,
                'imagesThisWeek' => $this->imagesThisWeek,
                'totalSongs' => $this->totalSongs,
                'mostReadSongs' => $this->mostReadSongs,
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
