<x-mail::message>
# New Collage PDF Generated

A new PDF has been generated for Collage #{{ $collageId }}.

The PDF contains {{ $imageCount }} images and is attached to this email.

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>