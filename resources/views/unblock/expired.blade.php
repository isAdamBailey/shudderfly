@extends('unblock.layout')

@section('title', __('messages.unblock_request.expired_heading'))

@section('content')
    <h1 data-testid="unblock-expired-page">{{ __('messages.unblock_request.expired_heading') }}</h1>
    <p>{{ __('messages.unblock_request.expired_body') }}</p>
@endsection
