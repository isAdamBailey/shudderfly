<x-mail::message>
# AI Provider Alert

The **{{ ucfirst($provider) }}** AI provider just returned a response that looks
like the account is out of credits or quota (HTTP {{ $status }}), while generating
a media description or weekly profile overview.

You'll need to either add funds to {{ ucfirst($provider) }}, or switch
`AI_PROVIDER` to the other provider in the environment config.

<x-mail::panel>
{{ \Illuminate\Support\Str::limit($body, 500) }}
</x-mail::panel>

This alert is sent at most once per provider per day, so further failures won't
send another email until then.
</x-mail::message>
