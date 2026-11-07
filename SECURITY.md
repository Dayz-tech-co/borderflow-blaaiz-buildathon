# Security Policy

BorderFlow is pre-production software and is not formally audited. Stellar integration is restricted to Testnet development. Do not use real funds, production accounts, or mainnet credentials.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub Security Advisories for this repository. Do not open a public issue containing credentials, exploit details, personal data, or transaction evidence that exposes secrets.

## Secret handling

- Stellar signing secrets must be server-only environment variables.
- Never add secrets to `NEXT_PUBLIC_*` variables, commits, screenshots, logs, or database records.
- Rotate any credential committed accidentally.
- Public Testnet addresses and transaction hashes are safe evidence only when the signing secret remains private.

## Payout administration

All payout creation, lookup, and reconciliation routes require a server-configured `BORDERFLOW_ADMIN_TOKEN` of at least 32 characters. The token must be supplied as a bearer token by an operator-controlled client and must never be embedded in browser JavaScript or a `NEXT_PUBLIC_*` variable.

Requests are size-bounded, mutation routes are rate-limited in process, payout amounts have a configurable ceiling, and only Testnet native XLM is accepted. The rate limiter is not a substitute for an edge/WAF limit in production.

An uncertain network submission is deliberately not retried: it is recorded for manual review to avoid a duplicate payment.
