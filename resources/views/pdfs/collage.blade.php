<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Collage #{{ $collage->id }}</title>
    @php
        use App\Support\Collage;

        $pageWidth = Collage::PAGE_WIDTH;
        $pageHeight = Collage::PAGE_HEIGHT;
        $border = Collage::BORDER;
        $placements = Collage::placements($grid, $localImages);
    @endphp
    <style>
        @page {
            size: {{ $pageWidth }}in {{ $pageHeight }}in;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: "DejaVu Sans", sans-serif;
            margin: 0;
            padding: 0;
            width: {{ $pageWidth }}in;
            height: {{ $pageHeight }}in;
            position: relative;
        }
        /* The coloured border, behind the pictures, round a white inside */
        .border {
            position: absolute;
            top: 0;
            left: 0;
            width: {{ $pageWidth - 2 * $border }}in;
            height: {{ $pageHeight - 2 * $border }}in;
            border: {{ $border }}in solid {{ $color }};
            background-color: white;
        }
        .printed-at {
            /* DomPDF doesn't centre text on a tall line-height, so it is
               placed: set solid, halfway down the strip above the pictures */
            position: absolute;
            top: {{ Collage::labelTop() }}in;
            left: 0;
            width: {{ $pageWidth }}in;
            line-height: 1;
            text-align: center;
            font-size: {{ Collage::LABEL_SIZE }}pt;
            font-weight: bold;
            color: #ffffff;
        }
        img {
            position: absolute;
            display: block;
        }
    </style>
</head>
<body>
    <div class="border"></div>
    <div class="printed-at">{{ $printedAt }}</div>
    @foreach($localImages as $index => $image)
        @php($place = $placements[$index])
        <img src="{{ $image['path'] }}" alt="Collage image {{ $image['page']->id }}" style="top: {{ $place['top'] }}in; left: {{ $place['left'] }}in; width: {{ $place['width'] }}in; height: {{ $place['height'] }}in;">
    @endforeach
</body>
</html>
