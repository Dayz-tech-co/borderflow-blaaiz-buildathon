# Security Policy

BorderFlow is pre-production software and is not formally audited. Stellar integration is restricted to Testnet development. Do not use real funds, production accounts, or mainnet credentials.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub Security Advisories for this repository. Do not open a public issue containing credentials, exploit details, personal data, or transaction evidence that exposes secrets.

## Secret handling

- Stellar signing secrets must be server-only environment variables.
- Never add secrets to `NEXT_PUBLIC_*` variables, commits, screenshots, logs, or database records.
- Rotate any credential committed accidentally.
- Public Testnet addresses and transaction hashes are safe evidence only when the signing secret remains private.
