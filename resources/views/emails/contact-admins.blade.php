<x-mail::message>
# {{ $name }} wants to say:
### {{ $message }}

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

<x-email-opt-out-footer />

</x-mail::message>
