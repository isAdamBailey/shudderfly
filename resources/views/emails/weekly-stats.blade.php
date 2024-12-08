<x-mail::message>
# {{ config("app.name") }} Weekly Stats

## {{ $user->name }}, here is what was added this week:

**{{ $booksThisWeek->count() }}** new books!

@if($booksThisWeek->count() > 0)
@foreach($booksThisWeek as $book)
<p>
    <x-email-hyperlink href="{{url('/book/' . $book->slug)}}">{{ $book->title }}</x-email-hyperlink>
    by: {{ $book->author }}
</p>
@endforeach
@endif

**{{ $pagesThisWeek->count() }}** new pages!

## {{ number_format($totalBooks) }} all time total books.
## {{ number_format($totalPages) }} all time total pages.

## Most Read Book
<x-email-hyperlink href="{{url('/book/' . $mostRead->slug)}}">{{ $mostRead->title }}</x-email-hyperlink>
has been read {{ number_format($mostRead->read_count) }} times.

## Least Read Book
<x-email-hyperlink href="{{url('/book/' . $leastRead->slug)}}">{{ $leastRead->title }}</x-email-hyperlink>
has only been read {{ $leastRead->read_count }} times.

## Largest Book
<x-email-hyperlink href="{{url('/book/' . $mostPages->slug)}}">{{ $mostPages->title }}</x-email-hyperlink>
has {{ number_format($mostPages->pages_count) }} pages.

## Smallest Book
<x-email-hyperlink href="{{url('/book/' . $leastPages->slug)}}">{{ $leastPages->title }}</x-email-hyperlink>
only has {{ $leastPages->pages_count }} pages.

## Total Number of Books Per User

@foreach ($bookCounts as $userName => $count)
<p>
    {{ $userName }}: <strong>{{ $count }}</strong>
</p>
@endforeach

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>
