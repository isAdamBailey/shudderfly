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

@if($screenshotsThisWeek->count() > 0)
**{{ $screenshotsThisWeek->count() }}** new screenshots!
@endif

@if($youTubeVideosThisWeek->count() > 0)
**{{ $youTubeVideosThisWeek->count() }}** new YouTube videos!
@endif

@if($videosThisWeek->count() > 0)
**{{ $videosThisWeek->count() }}** new videos!
@endif

@if($imagesThisWeek->count() > 0)
**{{ $imagesThisWeek->count() }}** new images!
@endif

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

**NOTE:** If you don't see a book you created, or the title of a book you created has changed, that's our fault. We're often reorganizing and consolidating books.
But if you want to report a bug in the platform, you can do so here:

<x-mail::button url="mailto:adamjbailey7@gmail.com?subject=Shudderfly%20Bug%20Report">
    Report a Bug
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>
