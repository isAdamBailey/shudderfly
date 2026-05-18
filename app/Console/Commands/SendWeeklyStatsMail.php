<?php

namespace App\Console\Commands;

use App\Mail\WeeklyStatsMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;

class SendWeeklyStatsMail extends Command
{
    protected $signature = 'send:weekly-stats-mail';

    protected $description = 'Send weekly stats email to users with edit pages permission';

    public function handle()
    {
        $permission = Permission::findByName('edit pages');
        $users = $permission
            ->users()
            ->select('id', 'name', 'email', 'weekly_profile_overview')
            ->orderBy('name')
            ->get();

        $summaryLinksByUserId = $users->mapWithKeys(
            fn (User $user) => [
                $user->id => [
                    'name' => $user->name,
                    'url' => $this->profileUrl($user),
                ],
            ]
        );

        foreach ($users as $user) {
            $summary = trim((string) $user->weekly_profile_overview);

            Mail::to($user->email)->send(new WeeklyStatsMail(
                $user,
                $summary !== '' ? $summary : "{$user->name} does not have a weekly summary yet.",
                $summaryLinksByUserId
                    ->except($user->id)
                    ->values()
                    ->all()
            ));
        }
    }

    private function profileUrl(User $user): string
    {
        return url('/users/'.urlencode($user->email));
    }
}
