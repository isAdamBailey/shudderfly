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
            top: 0.25in;
            left: 0.25in;
            width: 8in;
            height: 10.5in;
        }
        .cell {
            position: absolute;
            width: 1.875in;
            height: 2.5in;
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
                $top = $row * 2.625;
                $left = $col * 2;
            @endphp
            <div class="cell" style="top: {{ $top }}in; left: {{ $left }}in;">
                <img src="{{ $image['path'] }}" alt="Collage image {{ $image['page']->id }}">
            </div>
        @endforeach
    </div>
</body>
</html> 