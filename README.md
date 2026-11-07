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

## Environment

| Variable | Purpose |
|---|---|
| `STELLAR_NETWORK` | Must be `testnet` |
| `STELLAR_HORIZON_URL` | Testnet Horizon endpoint |
| `STELLAR_SOURCE_SECRET` | Server-only signing secret |
| `STELLAR_EXPLORER_BASE_URL` | Optional Testnet explorer base |
| `BORDERFLOW_DATABASE_PATH` | Optional SQLite database location |

Never use a `NEXT_PUBLIC_*` variable for a signing secret.

## API

- `POST /api/payouts`
- `GET /api/payouts/:id`
- `POST /api/payouts/:id/reconcile`

The baseline accepts native `XLM` only. A payout request requires a recipient name, Stellar destination address, amount, asset code, and idempotency key. Reusing a key with changed payout data returns HTTP 409.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Automated Stellar network calls are mocked.

## Limitations

- Testnet only
- Native XLM only
- No live fiat on-ramp
- No production USDC support
- No queue worker
- No Soroban contract
- Manual Testnet account and funding setup

See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
