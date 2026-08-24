@extends('unblock.layout')

@section('title', __('messages.unblock_request.no_access_heading'))

@section('content')
    <h1 data-testid="unblock-no-access-page">{{ __('messages.unblock_request.no_access_heading') }}</h1>
    <p>{{ __('messages.unblock_request.no_access_body') }}</p>
@endsection
