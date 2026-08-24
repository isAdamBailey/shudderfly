@extends('unblock.layout')

@section('title', __('messages.unblock_request.failed_heading'))

@section('content')
    <h1>{{ __('messages.unblock_request.failed_heading') }}</h1>
    <p>{{ __('messages.unblock_request.failed_body') }}</p>
@endsection
