<?php

namespace App\Console\Commands;

use App\Mail\WeeklyStatsMail;
use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;

class SendWeeklyStatsMail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send:weekly-stats-mail';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This command sends an email containing the weekly stats of the application.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $permission = Permission::findByName('edit pages');
        $users = $permission->users;

        $totalBooks = Book::count();
        $totalPages = Page::count();
        $leastPages = Book::withCount('pages')
            ->orderBy('pages_count')
            ->orderBy('created_at')
            ->first();
        $mostPages = Book::withCount('pages')
            ->orderBy('pages_count', 'desc')
            ->orderBy('created_at')
            ->first();
        $mostRead = Book::query()
            ->orderBy('read_count', 'desc')
            ->orderBy('created_at')
            ->first();
        $leastRead = Book::query()
            ->orderBy('read_count')
            ->orderBy('created_at')
            ->first();

        $bookCounts = [];
        foreach (User::all() as $user) {
            $bookCounts[$user->name] = Book::where('author', $user->name)->count();
        }

        $oneWeekAgo = Carbon::now()->subWeek();
        $booksThisWeek = Book::where('created_at', '>=', $oneWeekAgo)->get();
        $pagesThisWeek = Page::where('created_at', '>=', $oneWeekAgo)->get();

        foreach ($users as $user) {
            Mail::to($user->email)->send(new WeeklyStatsMail(
                $user,
                $totalBooks,
                $totalPages,
                $leastPages,
                $mostPages,
                $mostRead,
                $leastRead,
                $booksThisWeek,
                $pagesThisWeek,
                $bookCounts
            ));
        }
    }
}
