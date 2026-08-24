@extends('unblock.layout')

@section('title', __('messages.unblock_request.done_heading'))

@section('content')
    <h1>{{ __('messages.unblock_request.done_heading') }}</h1>
    <p>{{ __('messages.unblocked_all', ['count' => $count]) }}</p>
@endsection
