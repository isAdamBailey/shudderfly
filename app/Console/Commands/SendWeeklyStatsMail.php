<?php

namespace App\Console\Commands;

use App\Mail\WeeklyStatsMail;
use App\Models\SiteStatistic;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

class SendWeeklyStatsMail extends Command
{
    protected $signature = 'send:weekly-stats-mail';

    protected $description = 'Send weekly stats email to users with edit pages permission';

    public function handle()
    {
        // The email reports on both, so build them in order first: fresh
        // statistics snapshot, then the AI summaries, then send.
        $this->call('stats:aggregate-site-statistics');
        $this->call('users:generate-weekly-overviews');

        $siteStats = $this->siteStats();

        // Only users who can edit pages receive the email, but it links to
        // every user's summary.
        $permission = Permission::findByName('edit pages');
        $recipients = $permission
            ->users()
            ->select('id', 'name', 'email', 'weekly_profile_overview')
            ->orderBy('name')
            ->get();

        $summaryLinksByUserId = User::query()
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->mapWithKeys(
                fn (User $user) => [
                    $user->id => [
                        'name' => $user->name,
                        'url' => $this->profileUrl($user),
                    ],
                ]
            );

        foreach ($recipients as $user) {
            $summary = trim((string) $user->weekly_profile_overview);

            Mail::to($user->email)->send(new WeeklyStatsMail(
                $user,
                $summary !== '' ? $summary : "{$user->name} does not have a weekly summary yet.",
                $summaryLinksByUserId
                    ->except($user->id)
                    ->values()
                    ->all(),
                $siteStats
            ));
        }
    }

    /**
     * Shape the latest site-statistics snapshot for the email: headline totals
     * with their week-over-week change, plus a few narrative highlights.
     *
     * @return array<string, mixed>
     */
    private function siteStats(): array
    {
        $rows = SiteStatistic::history(8);
        $latest = $rows->last();

        if (! $latest) {
            return [];
        }

        $payload = $latest->payload;
        $previous = $rows->count() > 1 ? $rows->first()->payload : [];

        $totals = collect([
            'numberOfBooks' => 'Books',
            'numberOfPages' => 'Pages',
            'numberOfImages' => 'Images',
            'numberOfVideos' => 'Videos',
            'numberOfSongs' => 'Songs',
            'numberOfSounds' => 'Sounds',
            'numberOfMessages' => 'Messages',
            'numberOfComments' => 'Comments',
        ])->map(fn (string $label, string $key) => [
            'label' => $label,
            'value' => (int) ($payload[$key] ?? 0),
            'change' => isset($previous[$key])
                ? (int) ($payload[$key] ?? 0) - (int) $previous[$key]
                : null,
        ])->values()->all();

        return [
            'generatedAt' => $latest->date,
            'totals' => $totals,
            'highlights' => $this->highlights($payload),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array{label: string, value: string}>
     */
    private function highlights(array $payload): array
    {
        $highlights = [];

        if ($book = $payload['mostReadBooks'][0] ?? null) {
            $highlights[] = [
                'label' => 'Most read book',
                'value' => $book['title'].' ('.(int) ($book['read_count'] ?? 0).' reads)',
            ];
        }

        if ($song = $payload['mostReadSongs'][0] ?? null) {
            $highlights[] = [
                'label' => 'Most played song',
                'value' => $song['title'].' ('.(int) ($song['read_count'] ?? 0).' plays)',
            ];
        }

        if ($mostPages = $payload['mostPages'] ?? null) {
            $highlights[] = [
                'label' => 'Biggest book',
                'value' => $mostPages['title'].' ('.(int) ($mostPages['pages_count'] ?? 0).' pages)',
            ];
        }

        if ($messenger = $payload['mostActiveMessengerLast30Days'] ?? null) {
            $highlights[] = [
                'label' => 'Most active messenger (30 days)',
                'value' => $messenger['user']['name'].' ('.(int) $messenger['count'].' messages)',
            ];
        }

        if ($commenter = $payload['mostActiveCommenterLast30Days'] ?? null) {
            $highlights[] = [
                'label' => 'Most active commenter (30 days)',
                'value' => $commenter['user']['name'].' ('.(int) $commenter['count'].' comments)',
            ];
        }

        if ($reacted = $payload['mostReactedMessage'] ?? null) {
            $highlights[] = [
                'label' => 'Most reacted message',
                'value' => Str::limit((string) $reacted['text'], 80)
                    .' ('.(int) $reacted['reactions_count'].' reactions)',
            ];
        }

        if ($uploadDay = $payload['busiestUploadDayOfWeek'] ?? null) {
            $highlights[] = [
                'label' => 'Busiest upload day',
                'value' => $uploadDay['day'].' ('.(int) $uploadDay['count'].' pages)',
            ];
        }

        return $highlights;
    }

    private function profileUrl(User $user): string
    {
        return url('/users/'.urlencode($user->email));
    }
}
