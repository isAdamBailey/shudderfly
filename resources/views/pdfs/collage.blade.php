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
        }
        table {
            width: 8.5in;
            height: 11in;
            border-collapse: collapse;
            table-layout: fixed;
        }
        tr {
            height: 25%; /* Each row takes up 1/4 of the page height */
        }
        td {
            width: 25%; /* Each cell takes up 1/4 of the page width */
            height: 100%; /* Each cell takes up full height of its row */
            padding: 0;
            margin: 0;
            vertical-align: top;
            position: relative;
            overflow: hidden;
        }
        td img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            @foreach($localImages as $index => $image)
                @if($index > 0 && $index % 4 === 0)
                    </tr><tr>
                @endif
                <td>
                    <img src="{{ $image['path'] }}" alt="Collage image {{ $image['page']->id }}">
                </td>
            @endforeach
            @for($i = count($localImages); $i < 16; $i++)
                @if($i > 0 && $i % 4 === 0)
                    </tr><tr>
                @endif
                <td></td>
            @endfor
        </tr>
    </table>
</body>
</html> 