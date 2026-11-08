# BorderFlow

BorderFlow is an open-source cross-border payout operations layer using Stellar as a settlement rail.

> **Testnet development only:** the current baseline supports native XLM payments on Stellar Testnet. It is pre-production, is not formally audited, and must not be used for real funds.

## What it does

- estimates and tracks payout records
- validates Stellar Testnet destination addresses
- submits native XLM payments from the server
- reconciles transaction status from Horizon
- displays transaction hash, ledger, fee evidence, and Explorer links
- keeps local demo payouts separate from Testnet settlement

## Architecture

```text
Browser
  |
  v
Next.js payout API
  |-- SQLite payout and idempotency records
  |-- server-only Stellar signing and submission
  `-- Horizon transaction reconciliation
                  |
                  v
           Stellar Testnet
```

BorderFlow remains responsible for payout records, recipient data, idempotency, operational state, policy, and reconciliation. Stellar is responsible for settlement evidence and ledger confirmation.

No Soroban contract is implemented. Native XLM is the baseline asset.

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Local setup

Requirements: Node.js 22+ and npm.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Configure an explicitly Testnet-only signing secret. BorderFlow does not create or fund Stellar accounts.

The public browser demo cannot call settlement routes. Those routes are administrator-only and require a server-side bearer token. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment

| Variable | Purpose |
|---|---|
| `STELLAR_NETWORK` | Must be `testnet` |
| `STELLAR_HORIZON_URL` | Testnet Horizon endpoint |
| `STELLAR_SOURCE_SECRET` | Server-only signing secret |
| `STELLAR_EXPLORER_BASE_URL` | Optional Testnet explorer base |
| `BORDERFLOW_DATABASE_PATH` | Optional SQLite database location |
| `BORDERFLOW_ADMIN_TOKEN` | Server-only administrator bearer token (minimum 32 characters) |
| `BORDERFLOW_MAX_PAYOUT_XLM` | Maximum XLM accepted per Testnet payout (defaults to `10`) |
| `BORDERFLOW_SETTLEMENT_ENABLED` | Explicit settlement gate; defaults to disabled in deployment configuration |
| `BORDERFLOW_BACKUP_DIRECTORY` | Absolute directory for verified SQLite backups |

Never use a `NEXT_PUBLIC_*` variable for a signing secret.

## API

- `POST /api/payouts`
- `GET /api/payouts/:id`
- `POST /api/payouts/:id/reconcile`

The baseline accepts native `XLM` only. A payout request requires a recipient name, Stellar destination address, amount, asset code, and idempotency key. Reusing a key with changed payout data returns HTTP 409.

Every payout management route requires `Authorization: Bearer $BORDERFLOW_ADMIN_TOKEN`. Never put this token in client-side code.

`GET /api/health` and `GET /api/ready` are intentionally public, read-only operational checks. They expose no payout or credential data.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Automated Stellar network calls are mocked.

## Testnet rehearsal evidence

On 2026-11-07, BorderFlow completed a controlled Testnet XLM payout rehearsal for 0.1 XLM using transaction
`83637b6c316c06cf09f536efd2319da95b3910ac11966aaf4af253f386fa8776` on ledger `5607997`.

- [Stellar Expert Testnet transaction](https://stellar.expert/explorer/testnet/tx/83637b6c316c06cf09f536efd2319da95b3910ac11966aaf4af253f386fa8776)
- Testnet only; no real funds were used.
- This is not production validation.

## Controlled Testnet rehearsal

On 2026-11-08, BorderFlow submitted and reconciled one controlled payment of 0.1 XLM on Stellar Testnet. BorderFlow payout `526605b8-1981-4069-bdfe-e96ad3b6a2a2` reached `confirmed` with transaction `591074a3c6a5fb45f40c5a3d91765ab885a19a9462e6610fd2876a27593b2ce2` on ledger `5619904`.

- [Stellar Expert Testnet transaction](https://stellar.expert/explorer/testnet/tx/591074a3c6a5fb45f40c5a3d91765ab885a19a9462e6610fd2876a27593b2ce2)
- Direct Horizon verification reported a successful native XLM payment for exactly 0.1 XLM to the dedicated recipient.
- BorderFlow reconciliation persisted the confirmed status, ledger, and timestamps across a backend restart.
- Replaying the identical idempotent request returned the same payout and transaction; changing the amount with the same key returned HTTP 409. No second transaction was submitted by either replay.
- Testnet only; no real funds and no Mainnet were used. This is controlled development evidence, not production validation.

## Limitations

- Testnet only
- Native XLM only
- No live fiat on-ramp
- No production USDC support
- No queue worker
- No Soroban contract
- Manual Testnet account and funding setup

See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
