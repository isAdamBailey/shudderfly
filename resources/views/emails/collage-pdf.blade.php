<x-mail::message>
@if($errorMessage)
# Collage PDF Generation Failed

The PDF generation for Collage #{{ $collageId }} failed.

{{ $errorMessage }}

@else
# New Collage PDF Generated

A new PDF has been generated for Collage #{{ $collageId }}.

The PDF contains {{ $imageCount }} images and is ready for download.

<x-mail::button :url="$pdfUrl">
    Download PDF
</x-mail::button>
@endif

<x-mail::button :url="route('collages.index')">
    View Collages
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>