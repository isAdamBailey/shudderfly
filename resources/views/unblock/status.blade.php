{{--
    Every outcome screen an admin can land on: heading, one line, done.
    `$status` is the slug (`expired`, `no-access`, `already-handled`,
    `failed`, `done`); its strings live under the matching
    `unblock_request.<status>_heading` / `_body` keys, and it doubles as the
    test marker. `$replacements` fills placeholders in the body.

    The HTTP status code stays with the caller — it's about the request, not
    the page.
--}}
@php($key = 'messages.unblock_request.'.str_replace('-', '_', $status))

@extends('unblock.layout')

@section('title', __($key.'_heading'))

@section('content')
    <h1 data-testid="unblock-{{ $status }}-page">{{ __($key.'_heading') }}</h1>
    <p>{{ __($key.'_body', $replacements ?? []) }}</p>
@endsection
