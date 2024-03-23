<x-mail::message>
# {{ config("app.name") }} Weekly Stats

    {{ $user->name }}, here is what was added this week:

    @foreach($booksThisWeek as $book)
        dd($book);
        {{--        - {{ $book->title }} by {{ $book->author->name }}--}}
{{--        - {{ $book->title }} by {{ $book->author->name }}--}}
    @endforeach
{{--    {{ $booksThisWeek->count() }} new books--}}

<x-mail::button :url="{{ config("app.url") }}">
    {{ config("app.name") }}
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
