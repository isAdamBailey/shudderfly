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
            top: 0.5in;
            left: 0.25in;
            width: 8in;
            height: 10.25in;
        }
        .cell {
            position: absolute;
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
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 0.5in; padding: 0 0.25in; display: flex; align-items: center; justify-content: flex-end; font-size: 10pt; color: #333;">
        @isset($printedAt)
            <div>{{ $printedAt }}</div>
        @endisset
    </div>
    <div class="grid">
        @php
            $imageCount = count($localImages);
            
            // Define grid configurations for different image counts
            // Always maintaining 8.5x11 aspect ratio, images scale to fill available space
            $gridConfigs = [
                1 => ['cols' => 1, 'rows' => 1],    // 1 image = full page
                2 => ['cols' => 2, 'rows' => 1],    // 2 images = side by side
                3 => ['cols' => 3, 'rows' => 1],    // 3 images = three across
                4 => ['cols' => 2, 'rows' => 2],    // 4 images = 2x2 grid
                5 => ['cols' => 3, 'rows' => 2],    // 5 images = 3x2 grid
                6 => ['cols' => 3, 'rows' => 2],    // 6 images = 3x2 grid
                7 => ['cols' => 4, 'rows' => 2],    // 7 images = 4x2 grid
                8 => ['cols' => 4, 'rows' => 2],    // 8 images = 4x2 grid
                9 => ['cols' => 3, 'rows' => 3],    // 9 images = 3x3 grid
                10 => ['cols' => 4, 'rows' => 3],   // 10 images = 4x3 grid
                11 => ['cols' => 4, 'rows' => 3],   // 11 images = 4x3 grid
                12 => ['cols' => 4, 'rows' => 3],   // 12 images = 4x3 grid
                13 => ['cols' => 4, 'rows' => 4],   // 13 images = 4x4 grid
                14 => ['cols' => 4, 'rows' => 4],   // 14 images = 4x4 grid
                15 => ['cols' => 4, 'rows' => 4],   // 15 images = 4x4 grid
                16 => ['cols' => 4, 'rows' => 4]    // 16 images = 4x4 grid
            ];
            
            $config = $gridConfigs[$imageCount] ?? $gridConfigs[16];
            
            // Use 8in x 10.25in grid (8.5x11 page with 0.5in top header and 0.25in margins elsewhere)
            $gap = 0.05; // 0.05in gap between cells
            $cellWidth = (8 - ($config['cols'] - 1) * $gap) / $config['cols'];
            $cellHeight = (10.25 - ($config['rows'] - 1) * $gap) / $config['rows'];
        @endphp
        
        @foreach($localImages as $index => $image)
            @php
                $row = floor($index / $config['cols']);
                $col = $index % $config['cols'];
                $top = $row * ($cellHeight + $gap);
                $left = $col * ($cellWidth + $gap);
            @endphp
            <div class="cell" style="top: {{ $top }}in; left: {{ $left }}in; width: {{ $cellWidth }}in; height: {{ $cellHeight }}in;">
                <img src="{{ $image['path'] }}" alt="Collage image {{ $image['page']->id }}">
            </div>
        @endforeach
    </div>
</body>
</html> 