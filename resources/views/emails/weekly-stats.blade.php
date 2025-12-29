<x-mail::message>
# {{ config("app.name") }} Weekly Stats

## {{ $user->name }}, here is what was added this week:

**{{ $booksThisWeek->count() }}** new books!

@if($booksThisWeek->count() > 0)
@foreach($booksThisWeek as $book)
<p>
    <x-email-hyperlink href="{{url('/book/' . $book->slug)}}">{{ $book->title }}</x-email-hyperlink>
    @if($book->author)
    by: <x-email-hyperlink href="{{url('/users/' . urlencode(\App\Models\User::where('name', $book->author)->value('email') ?? $book->author))}}">{{ $book->author }}</x-email-hyperlink>
    @endif
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

@if($songsThisWeek->count() > 0)
**{{ $songsThisWeek->count() }}** new songs!
@endif

## {{ number_format($totalBooks) }} all time total books.
## {{ number_format($totalPages) }} all time total pages.
## {{ number_format($totalSongs) }} all time total songs.

## Top 5 Most Read Books
@foreach($mostRead as $book)
<p>
    <x-email-hyperlink href="{{ url('/book/' . $book->slug) }}">{{ $book->title }}</x-email-hyperlink>
    @if($book->author)
    by: <x-email-hyperlink href="{{url('/users/' . urlencode(\App\Models\User::where('name', $book->author)->value('email') ?? $book->author))}}">{{ $book->author }}</x-email-hyperlink>
    @endif
</p>
@endforeach

## Top 5 Most Popular Songs
@foreach($mostReadSongs as $song)
<p>
    <x-email-hyperlink href="{{ route('music.show', $song['id']) }}">{{ $song['title'] }}</x-email-hyperlink>
</p>
@endforeach


## Least Read Book
<x-email-hyperlink href="{{url('/book/' . $leastRead->slug)}}">{{ $leastRead->title }}</x-email-hyperlink>

## Largest Book
<x-email-hyperlink href="{{url('/book/' . $mostPages->slug)}}">{{ $mostPages->title }}</x-email-hyperlink>
has {{ number_format($mostPages->pages_count) }} pages.

## Smallest Book
<x-email-hyperlink href="{{url('/book/' . $leastPages->slug)}}">{{ $leastPages->title }}</x-email-hyperlink>
only has {{ $leastPages->pages_count }} pages.

## Total Number of Books Per User

@foreach ($bookCounts as $userName => $count)
<p>
    @php
        $userEmail = \App\Models\User::where('name', $userName)->value('email');
    @endphp
    @if($userEmail)
    <x-email-hyperlink href="{{url('/users/' . urlencode($userEmail))}}">{{ $userName }}</x-email-hyperlink>: <strong>{{ $count }}</strong>
    @else
    {{ $userName }}: <strong>{{ $count }}</strong>
    @endif
</p>
@endforeach

<x-mail::button url="{{ config('app.url') }}">
    Go To {{ config("app.name") }}
</x-mail::button>

<span style="font-size: 0.85em; color: #555;">
    <strong>NOTE:</strong> If you don't see a book you created, or the title of a book you created has changed, that's our fault. We're often reorganizing and consolidating books.<br>
    But if you want to report a bug in the platform, you can do so here:
</span>

<x-mail::button url="mailto:adamjbailey7@gmail.com?subject=Shudderfly%20Bug%20Report">
    Report a Bug
</x-mail::button>

Thanks and love you,<br>
{{ config('app.name') }}
</x-mail::message>
