<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Collage #{{ $collage->id }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        td {
            width: 25%;
            padding: 5px;
            vertical-align: top;
        }
        td img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
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
        </tr>
    </table>
</body>
</html> 