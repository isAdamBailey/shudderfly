<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Collage #{{ $collage->id }}</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 8.5in;
            height: 11in;
            position: relative;
        }
        .grid {
            position: absolute;
            top: 0;
            left: 0;
            width: 8.5in;
            height: 11in;
        }
        .cell {
            position: absolute;
            width: 2.125in; /* 8.5in / 4 */
            height: 2.75in; /* 11in / 4 */
            overflow: hidden;
        }
        .cell img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    </style>
</head>
<body>
    <div class="grid">
        @foreach($localImages as $index => $image)
            @php
                $row = floor($index / 4);
                $col = $index % 4;
                $top = $row * 2.75;
                $left = $col * 2.125;
            @endphp
            <div class="cell" style="top: {{ $top }}in; left: {{ $left }}in;">
                <img src="{{ $image['path'] }}" alt="Collage image {{ $image['page']->id }}">
            </div>
        @endforeach
    </div>
</body>
</html> 