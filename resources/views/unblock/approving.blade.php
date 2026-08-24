@extends('unblock.layout')

@section('title', __('messages.unblock_request.action'))

@section('content')
    {{-- Transient: submitted on load, so the viewer only ever sees the result
         screen. The GET that renders this deliberately changes nothing, which
         is what stops a mail scanner from unblocking anything. The button is
         the fallback for a browser with scripting disabled. --}}
    <form id="unblock-form" method="POST" action="{{ $performUrl }}">
        @csrf
        <button type="submit">{{ __('messages.unblock_request.action') }}</button>
    </form>

    <script>
        document.getElementById('unblock-form').submit();
    </script>
@endsection
