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

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>
</x-mail::message>
