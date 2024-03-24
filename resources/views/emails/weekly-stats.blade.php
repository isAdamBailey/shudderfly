<x-mail::message>
# {{ config("app.name") }} Weekly Stats

{{ $user->name }}, here is what was added this week:

{{ $booksThisWeek->count() }} new books were added this week.

@if($booksThisWeek->count() > 0)
## Books Added This Week
@foreach($booksThisWeek as $book)
<div>
    <x-email-hyperlink href="{{url('/book/' . $book->slug)}}">{{ $book->title }}</x-email-hyperlink>
    by: {{ $book->author }}
</div>
@endforeach
@endif


## Pages Added This Week
{{ $pagesThisWeek->count() }} new pages were added.

## Most Read Book
<x-email-hyperlink href="{{url('/book/' . $mostRead->slug)}}">{{ $mostRead->title }}</x-email-hyperlink>
has been read {{ $mostRead->read_count }} times.

## Least Read Book
<x-email-hyperlink href="{{url('/book/' . $leastRead->slug)}}">{{ $leastRead->title }}</x-email-hyperlink>
has only been read {{ $leastRead->read_count }} times.

## Largest Book
<x-email-hyperlink href="{{url('/book/' . $mostPages->slug)}}">{{ $mostPages->title }}</x-email-hyperlink>
has {{ $mostPages->pages_count }} pages.

## Smallest Book
<x-email-hyperlink href="{{url('/book/' . $leastPages->slug)}}">{{ $leastPages->title }}</x-email-hyperlink>
only has {{ $leastPages->pages_count }} pages.

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>
