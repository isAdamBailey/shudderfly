<x-mail::message>
# {{ config("app.name") }} AI Generated Summary

## <x-email-hyperlink href="{{ url('/users/' . urlencode($user->email)) }}">{{ $user->name }}</x-email-hyperlink>

## Here is your summary of last week's activity on {{ config('app.name') }}.

{{ $recipientSummary }}

@if(count($otherUserSummaryLinks) > 0)
## Other user summaries
@foreach($otherUserSummaryLinks as $summaryLink)
- <x-email-hyperlink href="{{ $summaryLink['url'] }}">{{ $summaryLink['name'] }}</x-email-hyperlink>
@endforeach
@endif

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

<x-email-opt-out-footer />

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>
