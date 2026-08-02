<x-mail::message>
# {{ config("app.name") }} AI Generated Summary

## <x-email-hyperlink href="{{ url('/users/' . urlencode($user->email)) }}">{{ $user->name }}</x-email-hyperlink>

## Here is your summary of last week's activity on {{ config('app.name') }}.

{{ $recipientSummary }}

@if(! empty($siteStats))
## Site stats

<x-mail::table>
| Stat | Total | This week |
| :--- | ----: | --------: |
@foreach($siteStats['totals'] as $total)
| {{ $total['label'] }} | {{ number_format($total['value']) }} | {{ is_null($total['change']) ? '—' : ($total['change'] > 0 ? '+' : '') . number_format($total['change']) }} |
@endforeach
</x-mail::table>

@if(count($siteStats['highlights']) > 0)
### Highlights
@foreach($siteStats['highlights'] as $highlight)
- **{{ $highlight['label'] }}:** {{ $highlight['value'] }}
@endforeach
@endif
@endif

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
