<x-mail::message>
@if($errorMessage)
# Collage PDF Generation Failed

The PDF generation for Collage #{{ $collageId }} failed.

{{ $errorMessage }}

@else
# New Collage PDF Generated

A new PDF has been generated for Collage #{{ $collageId }}.

The PDF contains {{ $imageCount }} images and is ready for download.

@if($previewUrl)
## Preview

<div style="text-align: center; margin: 20px 0;">
    <img src="{{ $previewUrl }}" alt="Collage Preview" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
</div>
@endif

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