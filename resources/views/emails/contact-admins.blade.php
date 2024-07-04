<x-mail::message>
# {{ $name }} wants to say:
### {{ $message }}

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

Love you,<br>
{{ $name }}
</x-mail::message>
