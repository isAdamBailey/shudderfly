<x-mail::message>
# Stale Page Cleanup

Pages created before **{{ $report['cutoffDate'] }}** with a read score below
{{ $report['readScoreThreshold'] }} were removed. Read score is weighted by page
age rather than a plain view count, so this is roughly "viewed at most once".

<x-mail::table>
| Deleted | Count |
| :------ | ----: |
| Pages | {{ number_format($report['deletedPages']) }} |
| Page assets (s3) | {{ number_format($report['deletedAssets']) }} |
| Empty books | {{ number_format($report['deletedBooks']) }} |
</x-mail::table>

The cleanup finished in {{ $report['duration'] }} seconds.

@if (! empty($report['aiVoice']))
## {{ __('messages.ai_voice.usage_heading') }}

<x-mail::table>
| {{ __('messages.ai_voice.usage_metric') }} | {{ __('messages.ai_voice.usage_value') }} |
| :------ | ----: |
| {{ __('messages.ai_voice.usage_clips') }} | {{ number_format($report['aiVoice']['clips']) }} |
| {{ __('messages.ai_voice.usage_characters') }} | {{ number_format($report['aiVoice']['characters']) }} |
| {{ __('messages.ai_voice.usage_cost') }} | ${{ number_format($report['aiVoice']['cost'], 2) }} |
| {{ __('messages.ai_voice.usage_hit_rate') }} | {{ $report['aiVoice']['hitRate'] === null ? '—' : number_format($report['aiVoice']['hitRate'] * 100, 1).'%' }} |
</x-mail::table>
@endif

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>
</x-mail::message>
