<x-mail::message>
# {{ config("app.name") }} Weekly Stats

    {{ $user->name }}, here is what was added this week:

    @foreach($booksThisWeek as $book)
        <div>
            <x-hyperlink url="{{url('/book/' . $book->slug)}}" title="{{$book->title}}" /> by: {{ $book->author }}
        </div>
    @endforeach

{{--<x-mail::button :url="{{ config("app.url") }}">--}}
{{--    {{ config("app.name") }}--}}
{{--</x-mail::button>--}}

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
